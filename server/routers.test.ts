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
