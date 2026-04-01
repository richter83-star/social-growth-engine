import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock db helpers used by admin procedures
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    adminGetOverview: vi.fn().mockResolvedValue({
      totalUsers: 42, newUsers7d: 5, newUsers30d: 18,
      activePaidSubs: 10, canceledPaidSubs: 2,
      planCounts: { free: 30, pro: 8, agency: 4 },
      mrr: 980, arr: 11760,
      totalCampaigns: 55, totalAccounts: 88,
      totalEngagements: 320, approvedEngagements: 210,
    }),
    adminGetUsers: vi.fn().mockResolvedValue({
      users: [
        { id: 1, name: "Alice", email: "alice@test.com", openId: "oid1", role: "user",
          createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null,
          subscription: { plan: "pro", status: "active" }, accountCount: 2, campaignCount: 3 },
      ],
      total: 1, page: 1, pages: 1,
    }),
    adminGetUserDetail: vi.fn().mockResolvedValue({
      user: { id: 1, name: "Alice", email: "alice@test.com", openId: "oid1", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      subscription: { plan: "pro", status: "active", currentPeriodEnd: null, stripeCustomerId: null, stripeSubscriptionId: null, stripePriceId: null, cancelAtPeriodEnd: false, createdAt: new Date(), updatedAt: new Date(), id: 1, userId: 1 },
      accounts: [], campaigns: [],
      queueStats: { total: 5, pending: 2, approved: 3, rejected: 0 },
      supportSessions: [],
    }),
    adminGetRevenueMetrics: vi.fn().mockResolvedValue({
      dailyRevenue: [{ date: "2026-03-01", amount: 49 }],
      planDistribution: { free: 30, pro: 8, agency: 4 },
      topCustomers: [],
    }),
    adminGetSupportActivity: vi.fn().mockResolvedValue([]),
    adminGetSystemHealth: vi.fn().mockResolvedValue({
      dbStatus: "healthy",
      tables: { users: 42, subscriptions: 12, campaigns: 55, threads: 100, queueTotal: 320, queuePending: 5, accounts: 88, supportMessages: 30 },
      timestamp: new Date(),
    }),
    adminUpdateUserPlan: vi.fn().mockResolvedValue(undefined),
    resolvePermissions: vi.fn().mockResolvedValue({ canEdit: true, canApprove: true, canReject: true, canDiscover: true, canManageCampaigns: true, teamRole: "owner", ownerId: 1 }),
  };
});

const adminUser = { id: 1, openId: "admin-oid", name: "Admin", email: "admin@test.com", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null };
const regularUser = { ...adminUser, id: 2, role: "user" as const };

function makeAdminCaller() {
  return appRouter.createCaller({ user: adminUser, req: {} as any, res: {} as any });
}
function makeUserCaller() {
  return appRouter.createCaller({ user: regularUser, req: {} as any, res: {} as any });
}

describe("Admin procedures — access control", () => {
  it("rejects non-admin users from getOverview", async () => {
    const caller = makeUserCaller();
    await expect(caller.admin.getOverview()).rejects.toThrow();
  });

  it("rejects non-admin users from getUsers", async () => {
    const caller = makeUserCaller();
    await expect(caller.admin.getUsers({ page: 1, limit: 25, search: "" })).rejects.toThrow();
  });

  it("rejects unauthenticated callers from getSystemHealth", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    await expect(caller.admin.getSystemHealth()).rejects.toThrow();
  });
});

describe("Admin procedures — data", () => {
  it("getOverview returns business metrics for admin", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.getOverview();
    expect(result.totalUsers).toBe(42);
    expect(result.mrr).toBe(980);
    expect(result.planCounts.pro).toBe(8);
  });

  it("getUsers returns paginated user list with subscription info", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.getUsers({ page: 1, limit: 25, search: "" });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].subscription?.plan).toBe("pro");
    expect(result.total).toBe(1);
  });

  it("getUserDetail returns full user profile", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.getUserDetail({ userId: 1 });
    expect(result?.user.name).toBe("Alice");
    expect(result?.queueStats.approved).toBe(3);
  });

  it("getRevenueMetrics returns daily revenue and plan distribution", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.getRevenueMetrics();
    expect(result.dailyRevenue).toHaveLength(1);
    expect(result.planDistribution.agency).toBe(4);
  });

  it("getSystemHealth returns db status and table counts", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.getSystemHealth();
    expect(result.dbStatus).toBe("healthy");
    expect(result.tables.users).toBe(42);
  });

  it("updateUserPlan succeeds for admin", async () => {
    const caller = makeAdminCaller();
    const result = await caller.admin.updateUserPlan({ userId: 2, plan: "agency" });
    expect(result.success).toBe(true);
  });

  it("updateUserPlan rejects non-admin", async () => {
    const caller = makeUserCaller();
    await expect(caller.admin.updateUserPlan({ userId: 2, plan: "agency" })).rejects.toThrow();
  });
});
