/**
 * Referrals Router
 *
 * Handles the referral program:
 * - getMyCode: returns the user's personal referral code + stats
 * - applyCode: links a referred user to a referrer (called on signup)
 * - getLeaderboard: top 5 referrers for social proof
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, referrals, subscriptions } from "../../drizzle/schema";
import { eq, sql, desc, count, isNull, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { applyReferralCredit, getPendingCredits, REFERRAL_COUPON_ID } from "../referralCredit";

// Lazy Stripe instance (only used when claimCredit is called)
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export const referralsRouter = router({
  /** Get the current user's referral code and stats */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Ensure user has a referral code
    const [user] = await db
      .select({ referralCode: users.referralCode, name: users.name })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    let code = user?.referralCode;
    if (!code) {
      code = nanoid(8).toUpperCase();
      await db.update(users).set({ referralCode: code }).where(eq(users.id, ctx.user.id));
    }

    // Count referrals
    const [stats] = await db
      .select({
        total: count(),
        converted: sql<number>`SUM(CASE WHEN ${referrals.status} = 'converted' THEN 1 ELSE 0 END)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, ctx.user.id));

    return {
      code,
      referralUrl: `${ctx.req.headers.origin ?? "https://socialgrowth.live"}/?ref=${code}`,
      totalReferrals: Number(stats?.total ?? 0),
      convertedReferrals: Number(stats?.converted ?? 0),
      creditsEarned: Number(stats?.converted ?? 0), // 1 credit = 1 free month
    };
  }),

  /** Get referral list for the current user */
  getReferralList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const list = await db
      .select({
        id: referrals.id,
        status: referrals.status,
        createdAt: referrals.createdAt,
        creditedAt: referrals.creditedAt,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, ctx.user.id))
      .orderBy(desc(referrals.createdAt))
      .limit(50);

    return list;
  }),

  /** Apply a referral code (called when a new user signs up via ?ref=CODE) */
  applyCode: publicProcedure
    .input(z.object({
      code: z.string().min(1).max(16),
      referredUserId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Find the referrer by code
      const [referrer] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.referralCode, input.code.toUpperCase()));

      if (!referrer) return { success: false, reason: "Invalid referral code" };
      if (referrer.id === input.referredUserId) return { success: false, reason: "Cannot refer yourself" };

      // Check if already referred
      const existing = await db
        .select({ id: referrals.id })
        .from(referrals)
        .where(eq(referrals.referredUserId, input.referredUserId));

      if (existing.length > 0) return { success: false, reason: "User already referred" };

      await db.insert(referrals).values({
        referrerId: referrer.id,
        referredUserId: input.referredUserId,
        code: input.code.toUpperCase(),
        status: "pending",
      });

      return { success: true };
    }),

  /** Get credit status: how many credits have been applied vs pending */
  getCreditStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { creditedCount: 0, pendingCount: 0 };

    const [credited] = await db
      .select({ count: count() })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, ctx.user.id),
          eq(referrals.status, "converted"),
          // creditedAt IS NOT NULL means credit was applied
          sql`${referrals.creditedAt} IS NOT NULL`
        )
      );

    const pending = await getPendingCredits(ctx.user.id);

    return {
      creditedCount: Number(credited?.count ?? 0),
      pendingCount: pending.length,
      pendingReferralIds: pending.map(r => r.id),
    };
  }),

  /** Manual claim: apply credit for a converted referral that wasn't auto-credited */
  claimCredit: protectedProcedure
    .input(z.object({ referralId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Verify the referral belongs to this user and is converted but not credited
      const [referral] = await db
        .select()
        .from(referrals)
        .where(
          and(
            eq(referrals.id, input.referralId),
            eq(referrals.referrerId, ctx.user.id),
            eq(referrals.status, "converted"),
            isNull(referrals.creditedAt)
          )
        )
        .limit(1);

      if (!referral) {
        throw new Error("Referral not found, already credited, or not eligible");
      }

      const stripe = getStripe();
      const result = await applyReferralCredit(stripe, ctx.user.id, referral.id);

      if (!result.success) {
        throw new Error(result.reason ?? "Failed to apply credit");
      }

      return { success: true, message: "1 month free credit applied to your subscription!" };
    }),

  /** Get top referrers leaderboard (public — for social proof) */
  getLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const leaderboard = await db
      .select({
        name: users.name,
        converted: sql<number>`SUM(CASE WHEN ${referrals.status} = 'converted' THEN 1 ELSE 0 END)`,
        total: count(referrals.id),
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referrerId, users.id))
      .groupBy(referrals.referrerId, users.name)
      .orderBy(desc(sql`SUM(CASE WHEN ${referrals.status} = 'converted' THEN 1 ELSE 0 END)`))
      .limit(5);

    return leaderboard.map(row => ({
      name: row.name ?? "Anonymous",
      converted: Number(row.converted ?? 0),
      total: Number(row.total ?? 0),
    }));
  }),
});
