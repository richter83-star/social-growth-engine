/**
 * Referral Credit Automation
 *
 * When a referred user completes a paid checkout, this module:
 *  1. Finds the pending referral record for the buyer
 *  2. Marks it as "converted"
 *  3. Applies a 100%-off one-time Stripe coupon to the referrer's active subscription
 *  4. Stamps creditedAt on the referral row
 *
 * The coupon REFERRAL_1MONTH is created on server startup if it doesn't exist.
 */

import Stripe from "stripe";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { subscriptions, referrals } from "../drizzle/schema";

export const REFERRAL_COUPON_ID = "REFERRAL_1MONTH";

// ── Coupon bootstrap ─────────────────────────────────────────────────────────

/**
 * Ensure the REFERRAL_1MONTH coupon exists in Stripe.
 * Called once at server startup — idempotent.
 */
export async function ensureReferralCoupon(stripe: Stripe): Promise<void> {
  try {
    await stripe.coupons.retrieve(REFERRAL_COUPON_ID);
    console.log("[Referral] Coupon REFERRAL_1MONTH already exists");
  } catch {
    // Coupon doesn't exist — create it
    await stripe.coupons.create({
      id: REFERRAL_COUPON_ID,
      name: "1 Month Free (Referral Reward)",
      percent_off: 100,
      duration: "once",
      metadata: { purpose: "referral_reward" },
    });
    console.log("[Referral] Created coupon REFERRAL_1MONTH");
  }
}

// ── Credit application ────────────────────────────────────────────────────────

/**
 * Apply the referral coupon to the referrer's active Stripe subscription.
 * Returns { success, reason } so callers can log the outcome.
 */
export async function applyReferralCredit(
  stripe: Stripe,
  referrerId: number,
  referralId: number
): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "DB unavailable" };

  // Find the referrer's active subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, referrerId))
    .limit(1);

  if (!sub?.stripeSubscriptionId) {
    return {
      success: false,
      reason: "Referrer has no active subscription — credit will be applied when they subscribe",
    };
  }

  // Apply the coupon via Stripe
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    discounts: [{ coupon: REFERRAL_COUPON_ID }],
  });

  // Stamp creditedAt on the referral row
  await db
    .update(referrals)
    .set({ creditedAt: new Date() })
    .where(eq(referrals.id, referralId));

  console.log(
    `[Referral] ✓ Applied 1-month free coupon to subscription ${sub.stripeSubscriptionId} for referrer userId=${referrerId}`
  );
  return { success: true };
}

// ── Webhook handler ───────────────────────────────────────────────────────────

/**
 * Called from the Stripe webhook handler when checkout.session.completed fires.
 * Looks up any pending referral for the buyer and processes the credit.
 */
export async function processReferralOnCheckout(
  stripe: Stripe,
  buyerUserId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find a pending referral where this user was the referred party
  const [referral] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredUserId, buyerUserId),
        eq(referrals.status, "pending")
      )
    )
    .limit(1);

  if (!referral) return; // No referral — nothing to do

  console.log(
    `[Referral] Found pending referral id=${referral.id}, referrerId=${referral.referrerId}`
  );

  // Mark referral as converted
  await db
    .update(referrals)
    .set({ status: "converted" })
    .where(eq(referrals.id, referral.id));

  // Apply credit to referrer
  const result = await applyReferralCredit(stripe, referral.referrerId, referral.id);
  if (!result.success) {
    console.warn(`[Referral] Credit deferred for referral id=${referral.id}: ${result.reason}`);
  }
}

// ── Pending credits query ─────────────────────────────────────────────────────

/**
 * Returns converted referrals that have not yet been credited.
 * Used by the claimCredit tRPC procedure as a manual fallback.
 */
export async function getPendingCredits(referrerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.status, "converted"),
        isNull(referrals.creditedAt)
      )
    );
}
