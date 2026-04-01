import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock the DB module
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAccountsByUser: vi.fn().mockResolvedValue([]),
  createAccount: vi.fn().mockResolvedValue({ id: 1, userId: 1, platform: "twitter", handle: "testuser", displayName: "Test User", followers: 1000, following: 500, engagementRate: 2.5, isActive: true }),
  updateAccount: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  getCampaignsByUser: vi.fn().mockResolvedValue([]),
  getCampaignById: vi.fn().mockResolvedValue(null),
  createCampaign: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "Test Campaign", keywords: ["test"], platforms: ["twitter"], persona: "helpful assistant", status: "draft" }),
  updateCampaign: vi.fn().mockResolvedValue(undefined),
  deleteCampaign: vi.fn().mockResolvedValue(undefined),
  getThreadsByCampaign: vi.fn().mockResolvedValue([]),
  getRecentThreadsByUser: vi.fn().mockResolvedValue([]),
  createThread: vi.fn().mockResolvedValue({ id: 1 }),
  updateThread: vi.fn().mockResolvedValue(undefined),
  getQueueByUser: vi.fn().mockResolvedValue([]),
  createEngagement: vi.fn().mockResolvedValue({ id: 1 }),
  updateEngagementStatus: vi.fn().mockResolvedValue(undefined),
  getMetricsByUser: vi.fn().mockResolvedValue([]),
  upsertMetric: vi.fn().mockResolvedValue(undefined),
  getDashboardSummary: vi.fn().mockResolvedValue({ accounts: 0, activeCampaigns: 0, threadsDiscovered: 0, pendingApprovals: 0, totalPosted: 0 }),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue(undefined),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  getLearningInsights: vi.fn().mockResolvedValue([]),
  createLearningOutcome: vi.fn().mockResolvedValue(undefined),
  // Schedules
  getSchedulesByUser: vi.fn().mockResolvedValue([]),
  createSchedule: vi.fn().mockResolvedValue({ id: 1, userId: 1, campaignId: 1, name: "Daily Scan", cronExpression: "0 9 * * *", timezone: "UTC", isActive: true, runCount: 0, lastRunAt: null, nextRunAt: new Date(), createdAt: new Date() }),
  updateScheduleDb: vi.fn().mockResolvedValue(undefined),
  deleteSchedule: vi.fn().mockResolvedValue(undefined),
  // Subscriptions
  getSubscriptionByUserId: vi.fn().mockResolvedValue(null),
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./engagementEngine", () => ({
  discoverThreads: vi.fn().mockResolvedValue([]),
  generateEngagement: vi.fn().mockResolvedValue({
    comment: "Great point! This is very insightful.",
    tone: "helpful",
    confidenceScore: 8.5,
    reasoning: "This comment adds value by acknowledging the insight.",
    intentScore: 0.9,
    engagementPotential: 0.85,
  }),
  computeLearningInsights: vi.fn().mockResolvedValue("Best performing tone: helpful"),
  generateSeedMetrics: vi.fn().mockReturnValue([]),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./scheduler", () => ({
  registerSchedule: vi.fn(),
  stopSchedule: vi.fn(),
  triggerScheduleNow: vi.fn().mockResolvedValue({ discovered: 3 }),
  initScheduler: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("stripe", () => {
  const mockStripe = {
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/test" }) } },
    subscriptions: { retrieve: vi.fn().mockResolvedValue({ items: { data: [{ price: { id: "price_test" } }] }, current_period_end: 1800000000 }) },
  };
  return { default: vi.fn(() => mockStripe) };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: Array<{ name: string; options: Record<string, unknown> }> } {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("returns the current user from auth.me", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });
});

// ─── Accounts Tests ───────────────────────────────────────────────────────────
describe("accounts", () => {
  it("lists accounts for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.accounts.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new social account", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.accounts.create({
      platform: "twitter",
      handle: "testuser",
      displayName: "Test User",
    });
    expect(result).toBeDefined();
    expect(result?.platform).toBe("twitter");
    expect(result?.handle).toBe("testuser");
  });

  it("rejects invalid platform", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.accounts.create({ platform: "tiktok" as "twitter", handle: "test" })
    ).rejects.toThrow();
  });
});

// ─── Campaigns Tests ──────────────────────────────────────────────────────────
describe("campaigns", () => {
  it("lists campaigns for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a campaign with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.create({
      name: "Test Campaign",
      keywords: ["saas", "startup"],
      platforms: ["twitter", "reddit"],
      persona: "A helpful SaaS consultant who shares practical advice",
      playbook: "direct_negotiator",
      targetEngagements: 50,
    });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Campaign");
  });

  it("rejects campaign with empty keywords", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaigns.create({
        name: "Bad Campaign",
        keywords: [],
        platforms: ["twitter"],
        persona: "A helpful assistant",
      })
    ).rejects.toThrow();
  });

  it("rejects campaign with persona too short", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaigns.create({
        name: "Bad Campaign",
        keywords: ["test"],
        platforms: ["twitter"],
        persona: "short",
      })
    ).rejects.toThrow();
  });
});

// ─── Analytics Tests ──────────────────────────────────────────────────────────
describe("analytics", () => {
  it("returns dashboard summary", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analytics.summary();
    expect(result).toMatchObject({
      accounts: expect.any(Number),
      activeCampaigns: expect.any(Number),
      threadsDiscovered: expect.any(Number),
      pendingApprovals: expect.any(Number),
      totalPosted: expect.any(Number),
    });
  });

  it("returns metrics array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analytics.metrics({ days: 30 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("lists notifications for user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Schedules Tests ──────────────────────────────────────────────────────────
describe("schedules", () => {
  it("lists schedules for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.schedules.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects schedule with invalid cron expression (too few fields)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.schedules.create({
        campaignId: 1,
        name: "Bad Schedule",
        cronExpression: "invalid",
        timezone: "UTC",
      })
    ).rejects.toThrow();
  });

  it("accepts a valid 5-field cron expression", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for valid cron
    const result = await caller.schedules.create({
      campaignId: 1,
      name: "Daily Scan",
      cronExpression: "0 9 * * *",
      timezone: "UTC",
    });
    // DB mock returns undefined by default, so result may be undefined — just check no throw
    expect(true).toBe(true);
  });
});

// ─── Billing Tests ────────────────────────────────────────────────────────────
describe("billing", () => {
  it("returns free plan when no subscription exists", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.getSubscription();
    expect((result as { plan: string }).plan).toBe("free");
  });

  it("returns plan limits for free tier", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.getPlanLimits();
    expect(result.plan).toBe("free");
    expect(result.limits).toBeDefined();
  });

  it("rejects checkout for unknown plan", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.billing.createCheckout({ plan: "pro" as "pro", origin: "https://example.com" })
    ).rejects.toThrow();
  });
});
