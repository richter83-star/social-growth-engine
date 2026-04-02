/**
 * Tests for referral credit automation
 *
 * Uses a plain mock Stripe object (not the real SDK) to avoid HTTP calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DB mock (hoisted so vi.mock factories can reference them) ──────────────────
const { mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({ select: mockSelect, update: mockUpdate }),
  DEFAULT_PERMISSIONS: { canDiscover: true, canEngage: true, maxAccounts: 5, maxCampaigns: 5 },
}));

vi.mock("../drizzle/schema", () => ({
  referrals: { id: "id", referrerId: "referrerId", referredUserId: "referredUserId", status: "status", creditedAt: "creditedAt" },
  subscriptions: { userId: "userId", stripeSubscriptionId: "stripeSubscriptionId" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  isNull: vi.fn((a) => ({ isNull: a })),
}));

import { REFERRAL_COUPON_ID, ensureReferralCoupon, processReferralOnCheckout, applyReferralCredit, getPendingCredits } from "./referralCredit";
import type Stripe from "stripe";

// ── Mock Stripe object (bypasses real HTTP calls) ──────────────────────────────
function makeMockStripe(overrides: Partial<{
  couponRetrieve: () => Promise<unknown>;
  couponCreate: () => Promise<unknown>;
  subscriptionUpdate: () => Promise<unknown>;
}> = {}): Stripe {
  return {
    coupons: {
      retrieve: overrides.couponRetrieve ?? vi.fn().mockResolvedValue({ id: REFERRAL_COUPON_ID }),
      create: overrides.couponCreate ?? vi.fn().mockResolvedValue({ id: REFERRAL_COUPON_ID }),
    },
    subscriptions: {
      update: overrides.subscriptionUpdate ?? vi.fn().mockResolvedValue({ id: "sub_mock" }),
    },
  } as unknown as Stripe;
}

// Helper: build a chainable DB select mock that resolves to `rows`
function buildSelectChain(rows: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(rows);
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  return { fromMock };
}

// Helper: build a chainable DB update mock
function buildUpdateChain() {
  const whereMock = vi.fn().mockResolvedValue({});
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  return { setMock };
}

describe("REFERRAL_COUPON_ID constant", () => {
  it("equals REFERRAL_1MONTH", () => {
    expect(REFERRAL_COUPON_ID).toBe("REFERRAL_1MONTH");
  });
});

describe("ensureReferralCoupon", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the coupon when it does not exist in Stripe", async () => {
    const couponCreate = vi.fn().mockResolvedValue({ id: "REFERRAL_1MONTH" });
    const couponRetrieve = vi.fn().mockRejectedValue(new Error("No such coupon"));
    const stripe = makeMockStripe({ couponRetrieve, couponCreate });

    await ensureReferralCoupon(stripe);

    expect(couponCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "REFERRAL_1MONTH", percent_off: 100, duration: "once" })
    );
  });

  it("skips creation when coupon already exists", async () => {
    const couponCreate = vi.fn();
    const couponRetrieve = vi.fn().mockResolvedValue({ id: "REFERRAL_1MONTH" });
    const stripe = makeMockStripe({ couponRetrieve, couponCreate });

    await ensureReferralCoupon(stripe);

    expect(couponCreate).not.toHaveBeenCalled();
  });
});

describe("processReferralOnCheckout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when user was not referred (no pending referral)", async () => {
    const { fromMock } = buildSelectChain([]);
    mockSelect.mockReturnValue({ from: fromMock });

    const subscriptionUpdate = vi.fn();
    const stripe = makeMockStripe({ subscriptionUpdate });

    await expect(processReferralOnCheckout(stripe, 42)).resolves.toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("marks referral converted and applies Stripe discount when referrer has a subscription", async () => {
    // First select: find pending referral for buyer
    const { fromMock: fromMock1 } = buildSelectChain([
      { id: 1, referrerId: 10, referredUserId: 42, status: "pending", creditedAt: null },
    ]);
    // Second select: find referrer's subscription
    const { fromMock: fromMock2 } = buildSelectChain([{ stripeSubscriptionId: "sub_abc123" }]);

    mockSelect
      .mockReturnValueOnce({ from: fromMock1 })
      .mockReturnValueOnce({ from: fromMock2 });

    const { setMock } = buildUpdateChain();
    mockUpdate.mockReturnValue({ set: setMock });

    const subscriptionUpdate = vi.fn().mockResolvedValue({ id: "sub_abc123" });
    const stripe = makeMockStripe({ subscriptionUpdate });

    await processReferralOnCheckout(stripe, 42);

    expect(subscriptionUpdate).toHaveBeenCalledWith(
      "sub_abc123",
      expect.objectContaining({
        discounts: expect.arrayContaining([
          expect.objectContaining({ coupon: "REFERRAL_1MONTH" }),
        ]),
      })
    );
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("applyReferralCredit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success=false when referrer has no active subscription", async () => {
    const { fromMock } = buildSelectChain([]);
    mockSelect.mockReturnValue({ from: fromMock });

    const subscriptionUpdate = vi.fn();
    const result = await applyReferralCredit(makeMockStripe({ subscriptionUpdate }), 10, 1);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("no active subscription");
    expect(subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("applies Stripe coupon and returns success=true when subscription exists", async () => {
    const { fromMock } = buildSelectChain([{ stripeSubscriptionId: "sub_xyz" }]);
    mockSelect.mockReturnValue({ from: fromMock });

    const { setMock } = buildUpdateChain();
    mockUpdate.mockReturnValue({ set: setMock });

    const subscriptionUpdate = vi.fn().mockResolvedValue({ id: "sub_xyz" });
    const result = await applyReferralCredit(makeMockStripe({ subscriptionUpdate }), 10, 1);

    expect(result.success).toBe(true);
    expect(subscriptionUpdate).toHaveBeenCalledWith(
      "sub_xyz",
      expect.objectContaining({ discounts: [{ coupon: "REFERRAL_1MONTH" }] })
    );
  });
});

describe("getPendingCredits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no pending credits exist", async () => {
    const whereMock = vi.fn().mockResolvedValue([]);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockSelect.mockReturnValue({ from: fromMock });

    const result = await getPendingCredits(99);
    expect(result).toEqual([]);
  });

  it("returns pending referrals for the given user", async () => {
    const fakeReferrals = [
      { id: 5, referrerId: 99, referredUserId: 100, status: "converted", creditedAt: null },
    ];
    const whereMock = vi.fn().mockResolvedValue(fakeReferrals);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockSelect.mockReturnValue({ from: fromMock });

    const result = await getPendingCredits(99);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });
});
