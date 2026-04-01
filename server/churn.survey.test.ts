import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock DB helpers
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSubscriptionByUserId: vi.fn(),
    updateSubscription: vi.fn(),
    saveChurnReason: vi.fn(),
    getChurnReasonBreakdown: vi.fn(),
    adminGetRevenueMetrics: vi.fn().mockResolvedValue({
      dailyRevenue: [],
      planDistribution: { free: 0, pro: 0, agency: 0 },
      topCustomers: [],
    }),
  };
});

vi.mock("stripe", () => {
  const mockStripe = {
    subscriptions: {
      update: vi.fn().mockResolvedValue({ id: "sub_test", cancel_at_period_end: true }),
    },
  };
  return { default: vi.fn(() => mockStripe) };
});

const mockUser = { id: 1, name: "Test User", email: "test@example.com", role: "user" as const, openId: "test-open-id" };
const mockAdminUser = { id: 99, name: "Admin", email: "admin@example.com", role: "admin" as const, openId: process.env.OWNER_OPEN_ID ?? "owner-open-id" };

function makeCtx(user: typeof mockUser | null = mockUser) {
  return { user, req: { headers: {} } as any, res: {} as any };
}

describe("Churn Survey — cancelSubscription with reason", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves churn reason when provided", async () => {
    const { getSubscriptionByUserId, updateSubscription, saveChurnReason } = await import("./db");
    vi.mocked(getSubscriptionByUserId).mockResolvedValue({
      id: 1, userId: 1, stripeSubscriptionId: "sub_abc", stripeCustomerId: "cus_abc",
      plan: "pro", status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(),
    } as any);
    vi.mocked(updateSubscription).mockResolvedValue(undefined as any);
    vi.mocked(saveChurnReason).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.billing.cancelSubscription({ reason: "too_expensive" });

    expect(result.success).toBe(true);
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(saveChurnReason).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, plan: "pro", reason: "too_expensive" })
    );
  });

  it("does not save churn reason when not provided", async () => {
    const { getSubscriptionByUserId, updateSubscription, saveChurnReason } = await import("./db");
    vi.mocked(getSubscriptionByUserId).mockResolvedValue({
      id: 1, userId: 1, stripeSubscriptionId: "sub_abc", stripeCustomerId: "cus_abc",
      plan: "pro", status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(),
    } as any);
    vi.mocked(updateSubscription).mockResolvedValue(undefined as any);
    vi.mocked(saveChurnReason).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(makeCtx());
    await caller.billing.cancelSubscription();

    expect(saveChurnReason).not.toHaveBeenCalled();
  });

  it("accepts all valid reason values", async () => {
    const { getSubscriptionByUserId, updateSubscription, saveChurnReason } = await import("./db");
    vi.mocked(updateSubscription).mockResolvedValue(undefined as any);
    vi.mocked(saveChurnReason).mockResolvedValue(undefined as any);

    const reasons = ["too_expensive", "not_using", "missing_features", "other"] as const;
    for (const reason of reasons) {
      vi.mocked(getSubscriptionByUserId).mockResolvedValue({
        id: 1, userId: 1, stripeSubscriptionId: `sub_${reason}`, stripeCustomerId: "cus_abc",
        plan: "pro", status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(),
      } as any);
      const caller = appRouter.createCaller(makeCtx());
      const result = await caller.billing.cancelSubscription({ reason });
      expect(result.success).toBe(true);
    }
    expect(saveChurnReason).toHaveBeenCalledTimes(reasons.length);
  });

  it("still cancels successfully even if saveChurnReason throws", async () => {
    const { getSubscriptionByUserId, updateSubscription, saveChurnReason } = await import("./db");
    vi.mocked(getSubscriptionByUserId).mockResolvedValue({
      id: 1, userId: 1, stripeSubscriptionId: "sub_abc", stripeCustomerId: "cus_abc",
      plan: "pro", status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(),
    } as any);
    vi.mocked(updateSubscription).mockResolvedValue(undefined as any);
    vi.mocked(saveChurnReason).mockRejectedValue(new Error("DB error"));

    const caller = appRouter.createCaller(makeCtx());
    // Should not throw — saveChurnReason is non-fatal
    const result = await caller.billing.cancelSubscription({ reason: "other" });
    expect(result.success).toBe(true);
  });
});

describe("Admin — getChurnReasons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns churn reason breakdown for admin", async () => {
    const { getChurnReasonBreakdown } = await import("./db");
    vi.mocked(getChurnReasonBreakdown).mockResolvedValue([
      { reason: "too_expensive", count: 5 },
      { reason: "not_using", count: 3 },
    ]);

    process.env.OWNER_OPEN_ID = mockAdminUser.openId;
    const caller = appRouter.createCaller(makeCtx(mockAdminUser));
    const result = await caller.admin.getChurnReasons();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ reason: "too_expensive", count: 5 });
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.admin.getChurnReasons()).rejects.toThrow();
  });
});
