/**
 * Subscription Cancellation & Reactivation Tests
 *
 * Covers:
 *  1. cancelSubscription — calls Stripe and updates DB for active subscription
 *  2. cancelSubscription — throws NOT_FOUND when no subscription exists
 *  3. cancelSubscription — throws BAD_REQUEST when already set to cancel
 *  4. reactivateSubscription — calls Stripe and updates DB for canceling subscription
 *  5. reactivateSubscription — throws NOT_FOUND when no subscription exists
 *  6. reactivateSubscription — throws BAD_REQUEST when not scheduled for cancellation
 *  7. Unauthenticated access — throws UNAUTHORIZED for both procedures
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// ── Mock Stripe ───────────────────────────────────────────────────────────────
vi.mock("stripe", () => {
  const mockStripe = {
    subscriptions: {
      update: vi.fn().mockResolvedValue({ id: "sub_test", cancel_at_period_end: true }),
      retrieve: vi.fn(),
    },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  };
  return { default: vi.fn(() => mockStripe) };
});

// ── Mock DB helpers ───────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSubscriptionByUserId: vi.fn(),
    updateSubscription: vi.fn().mockResolvedValue(undefined),
    upsertSubscription: vi.fn().mockResolvedValue(undefined),
  };
});

import { getSubscriptionByUserId, updateSubscription } from "./db";
import Stripe from "stripe";

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockStripeInstance = new (Stripe as unknown as new (key: string, opts: object) => typeof Stripe.prototype)("sk_test", { apiVersion: "2026-03-25.dahlia" });

function makeCtx(userId: number): Context {
  return {
    user: { id: userId, name: "Test User", email: "test@example.com", role: "user", openId: "open_test" },
    req: {} as Context["req"],
    res: {} as Context["res"],
  };
}

const anonCtx: Context = { user: null, req: {} as Context["req"], res: {} as Context["res"] };

const activeSub = {
  id: 1,
  userId: 1,
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test_active",
  stripePriceId: "price_pro",
  plan: "pro" as const,
  status: "active" as const,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date(Date.now() + 86400 * 30 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cancelingSub = { ...activeSub, cancelAtPeriodEnd: true };

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("billing.cancelSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Stripe update and DB updateSubscription for an active subscription", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(activeSub);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.billing.cancelSubscription();

    expect(result.success).toBe(true);
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
      "sub_test_active",
      { cancel_at_period_end: true }
    );
    expect(updateSubscription).toHaveBeenCalledWith(1, { cancelAtPeriodEnd: true });
  });

  it("throws NOT_FOUND when user has no subscription", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.billing.cancelSubscription()).rejects.toThrow("No active subscription found");
  });

  it("throws BAD_REQUEST when subscription is already set to cancel", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(cancelingSub);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.billing.cancelSubscription()).rejects.toThrow("already set to cancel");
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = appRouter.createCaller(anonCtx);
    await expect(caller.billing.cancelSubscription()).rejects.toThrow();
  });
});

describe("billing.reactivateSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Stripe update and DB updateSubscription for a canceling subscription", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(cancelingSub);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.billing.reactivateSubscription();

    expect(result.success).toBe(true);
    expect(result.cancelAtPeriodEnd).toBe(false);
    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
      "sub_test_active",
      { cancel_at_period_end: false }
    );
    expect(updateSubscription).toHaveBeenCalledWith(1, { cancelAtPeriodEnd: false });
  });

  it("throws NOT_FOUND when user has no subscription", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.billing.reactivateSubscription()).rejects.toThrow("No active subscription found");
  });

  it("throws BAD_REQUEST when subscription is not scheduled for cancellation", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValue(activeSub);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(caller.billing.reactivateSubscription()).rejects.toThrow("not scheduled for cancellation");
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = appRouter.createCaller(anonCtx);
    await expect(caller.billing.reactivateSubscription()).rejects.toThrow();
  });
});
