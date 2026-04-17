/**
 * Tests for analytics.getInstagramInsights and analytics.getInstagramPostPerformance
 *
 * Covers:
 * - Returns empty result when no Instagram accounts exist
 * - Filters snapshots to Instagram accounts only
 * - Correctly computes summary (totalFollowers, followerDelta, avgEngagementRate)
 * - getInstagramPostPerformance returns empty array when no accounts
 * - getInstagramPostPerformance returns posted items filtered to Instagram threads
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ---- Mock DB helpers -------------------------------------------------------
vi.mock("./db", () => ({
  getAccountsByUser: vi.fn(),
  updateAccount: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getCampaignsByUser: vi.fn(),
  getCampaignById: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  getThreadsByCampaign: vi.fn(),
  getRecentThreadsByUser: vi.fn(),
  createThread: vi.fn(),
  updateThread: vi.fn(),
  getQueueByUser: vi.fn(),
  createEngagement: vi.fn(),
  updateEngagementStatus: vi.fn(),
  getMetricsByUser: vi.fn().mockResolvedValue([]),
  upsertMetric: vi.fn(),
  getDashboardSummary: vi.fn(),
  getNotificationsByUser: vi.fn(),
  createNotification: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getLearningInsights: vi.fn().mockResolvedValue([]),
  createLearningOutcome: vi.fn(),
  getSchedulesByUser: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  getSubscriptionByUserId: vi.fn().mockResolvedValue(null),
  upsertSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getSupportHistory: vi.fn().mockResolvedValue([]),
  saveSupportMessage: vi.fn(),
  adminGetOverview: vi.fn(),
  adminGetUsers: vi.fn(),
  adminGetUserDetail: vi.fn(),
  adminGetRevenueMetrics: vi.fn(),
  adminGetSupportActivity: vi.fn(),
  adminGetSystemHealth: vi.fn(),
  adminUpdateUserPlan: vi.fn(),
  saveChurnReason: vi.fn(),
  getChurnReasonBreakdown: vi.fn(),
  resolvePermissions: vi.fn(),
  saveInstagramCredentials: vi.fn(),
  getInstagramCredentials: vi.fn().mockResolvedValue(null),
  deleteInstagramCredentials: vi.fn(),
  updateInstagramCredentialStatus: vi.fn(),
  decryptValue: vi.fn((s: string) => s),
  getInstagramCredentialsByUserId: vi.fn().mockResolvedValue([]),
  getDb: vi.fn(),
}));

// ---- Mock other heavy deps -------------------------------------------------
vi.mock("./engagementEngine", () => ({
  discoverThreads: vi.fn(),
  generateEngagement: vi.fn(),
  computeLearningInsights: vi.fn().mockResolvedValue("No data yet."),
}));
vi.mock("./scheduler", () => ({
  registerSchedule: vi.fn(),
  stopSchedule: vi.fn(),
  triggerScheduleNow: vi.fn(),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./routers/team", () => ({ teamRouter: { _def: { procedures: {} } } }));
vi.mock("./routers/onboarding", () => ({ onboardingRouter: { _def: { procedures: {} } } }));
vi.mock("./routers/campaignTemplates", () => ({ campaignTemplatesRouter: { _def: { procedures: {} } } }));
vi.mock("./routers/referrals", () => ({ referralsRouter: { _def: { procedures: {} } } }));
vi.mock("./socialOAuth", () => ({
  getOAuthToken: vi.fn().mockResolvedValue(null),
  deleteOAuthToken: vi.fn(),
  getOAuthStatusForAccounts: vi.fn().mockResolvedValue({}),
  saveOAuthToken: vi.fn(),
  buildTwitterAuthUrl: vi.fn().mockReturnValue("https://x.com/oauth"),
  buildLinkedInAuthUrl: vi.fn().mockReturnValue("https://linkedin.com/oauth"),
  buildInstagramAuthUrl: vi.fn().mockReturnValue("https://facebook.com/oauth"),
  createOAuthState: vi.fn().mockReturnValue("mock-state"),
  generatePKCE: vi.fn().mockReturnValue({ verifier: "v", challenge: "c" }),
  fetchTwitterMetricsWithToken: vi.fn().mockResolvedValue(null),
  fetchLinkedInProfileWithToken: vi.fn().mockResolvedValue(null),
  fetchInstagramMetricsWithToken: vi.fn().mockResolvedValue(null),
  refreshTwitterToken: vi.fn().mockResolvedValue({ accessToken: "new", refreshToken: "new", expiresIn: 7200 }),
  encryptToken: vi.fn((s: string) => s),
  decryptToken: vi.fn((s: string) => s),
  getOAuthTokenByPlatform: vi.fn().mockResolvedValue(null),
}));
vi.mock("./instagramMcp", () => ({
  getInstagramAccountInfo: vi.fn().mockResolvedValue(null),
  getInstagramPosts: vi.fn().mockResolvedValue([]),
  getInstagramPostInsights: vi.fn().mockResolvedValue(null),
}));
vi.mock("./instagrapiClient", () => ({
  isInstagrapiAvailable: vi.fn().mockResolvedValue(false),
  instaLogin: vi.fn(),
  instaLogout: vi.fn(),
  instaGetUserInfo: vi.fn(),
  instaGetUserPosts: vi.fn(),
  instaGetMediaInsights: vi.fn(),
}));

import { getAccountsByUser, getDb } from "./db";

const mockGetAccounts = getAccountsByUser as ReturnType<typeof vi.fn>;
const mockGetDb = getDb as ReturnType<typeof vi.fn>;

// Helper: build a caller with a fake authenticated user
function makeCaller(userId = 42) {
  return appRouter.createCaller({
    user: { id: userId, openId: "test-open-id", name: "Test User", email: "test@example.com", role: "user" as const },
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {} as any,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("analytics.getInstagramInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result when user has no Instagram accounts", async () => {
    mockGetAccounts.mockResolvedValue([
      { id: 1, platform: "twitter", handle: "twitteruser", followers: 500, following: 100, engagementRate: 2.5, lastSynced: null },
    ]);
    // getDb returns null → early return
    mockGetDb.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramInsights({ days: 30 });

    expect(result.snapshots).toHaveLength(0);
    expect(result.accounts).toHaveLength(0);
    expect(result.summary.totalFollowers).toBe(0);
  });

  it("returns empty result when getDb returns null", async () => {
    mockGetAccounts.mockResolvedValue([]);
    mockGetDb.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramInsights({ days: 30 });

    expect(result.snapshots).toHaveLength(0);
    expect(result.summary.followerDelta).toBe(0);
  });

  it("filters snapshots to Instagram accounts only and computes summary", async () => {
    const igAccount = {
      id: 10,
      platform: "instagram" as const,
      handle: "myinsta",
      displayName: "My Insta",
      followers: 1200,
      following: 300,
      engagementRate: 3.5,
      lastSynced: new Date("2026-04-01"),
    };
    const twitterAccount = {
      id: 11,
      platform: "twitter" as const,
      handle: "mytwitter",
      displayName: "My Twitter",
      followers: 800,
      following: 200,
      engagementRate: 1.2,
      lastSynced: null,
    };
    mockGetAccounts.mockResolvedValue([igAccount, twitterAccount]);

    // Mock DB: return rows for both accounts, procedure should filter to IG only
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { date: "2026-03-15", accountId: 10, followers: 1100, followerDelta: 20, engagementRate: 3.2 },
        { date: "2026-03-16", accountId: 10, followers: 1120, followerDelta: 20, engagementRate: 3.5 },
        { date: "2026-03-15", accountId: 11, followers: 780, followerDelta: 5, engagementRate: 1.1 },
      ]),
    };
    mockGetDb.mockResolvedValue(mockDb);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramInsights({ days: 30 });

    // Only IG rows should appear in snapshots
    expect(result.snapshots.every((s) => s.accountId === 10)).toBe(true);
    expect(result.snapshots).toHaveLength(2);
    expect(result.snapshots[0].handle).toBe("myinsta");

    // Summary uses current account state (followers from account object)
    expect(result.summary.totalFollowers).toBe(1200);
    // followerDelta = sum of IG rows' deltas = 20 + 20 = 40
    expect(result.summary.followerDelta).toBe(40);
    // avgEngagementRate = (3.2 + 3.5) / 2 = 3.35
    expect(result.summary.avgEngagementRate).toBeCloseTo(3.35, 1);

    // Accounts list should only contain IG account
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].handle).toBe("myinsta");
  });
});

describe("analytics.getInstagramPostPerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no Instagram accounts exist", async () => {
    mockGetAccounts.mockResolvedValue([
      { id: 1, platform: "twitter", handle: "twitteruser", followers: 500, following: 100, engagementRate: 2.5, lastSynced: null },
    ]);
    mockGetDb.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramPostPerformance({ days: 30, limit: 5 });
    expect(result).toHaveLength(0);
  });

  it("returns empty array when getDb returns null", async () => {
    mockGetAccounts.mockResolvedValue([
      { id: 10, platform: "instagram", handle: "myinsta", followers: 1200, following: 300, engagementRate: 3.5, lastSynced: null },
    ]);
    mockGetDb.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramPostPerformance({ days: 30, limit: 5 });
    expect(result).toHaveLength(0);
  });

  it("returns posted items filtered to Instagram threads", async () => {
    mockGetAccounts.mockResolvedValue([
      { id: 10, platform: "instagram", handle: "myinsta", followers: 1200, following: 300, engagementRate: 3.5, lastSynced: null },
    ]);

    // First call: engagementQueue query (uses .limit)
    const engagementItems = [
      {
        id: 1, threadId: 100, userId: 42, accountId: 10,
        generatedComment: "Great post!", editedContent: null,
        status: "posted", updatedAt: new Date("2026-04-10"),
      },
      {
        id: 2, threadId: 101, userId: 42, accountId: null,
        generatedComment: "Nice!", editedContent: "Nice post!",
        status: "posted", updatedAt: new Date("2026-04-09"),
      },
    ];
    // Second call: discoveredThreads query (no .limit, resolves from .where)
    const threadRows = [
      { id: 100, platform: "instagram", threadTitle: "IG Thread", threadUrl: "https://instagram.com/p/abc", intentScore: 85 },
      { id: 101, platform: "twitter",   threadTitle: "TW Thread", threadUrl: "https://twitter.com/x",       intentScore: 70 },
    ];
    let callCount = 0;
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        callCount++;
        // Second select().from().where() is for discoveredThreads (no .limit)
        if (callCount >= 2) return Promise.resolve(threadRows);
        return mockDb; // first call continues to .orderBy().limit()
      }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(engagementItems),
    };
    mockGetDb.mockResolvedValue(mockDb);

    const caller = makeCaller();
    const result = await caller.analytics.getInstagramPostPerformance({ days: 30, limit: 5 });

    // Only the item with an Instagram thread should be returned
    expect(result).toHaveLength(1);
    expect(result[0].threadTitle).toBe("IG Thread");
    expect(result[0].content).toBe("Great post!");
    expect(result[0].intentScore).toBe(85);
  });
});
