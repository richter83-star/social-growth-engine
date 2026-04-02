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
import { users, referrals } from "../../drizzle/schema";
import { eq, sql, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";

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
