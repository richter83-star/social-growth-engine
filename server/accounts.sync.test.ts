/**
 * Tests for accounts.syncStats tRPC mutation
 *
 * Covers:
 * - Twitter path: successful sync updates followers/following in DB
 * - Twitter path: quota-exceeded response returns quota_exceeded status
 * - LinkedIn path: successful sync updates displayName in DB
 * - LinkedIn path: inaccessible profile returns error status
 * - Unsupported platform (instagram/tiktok/reddit) returns not_supported status
 * - Unknown account id throws NOT_FOUND
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ---- Mock dataApi -------------------------------------------------------
vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

// ---- Mock DB helpers ----------------------------------------------------
vi.mock("./db", () => ({
  getAccountsByUser: vi.fn(),
  updateAccount: vi.fn(),
  // Stubs for other imports used by routers.ts
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
  getMetricsByUser: vi.fn(),
  upsertMetric: vi.fn(),
  getDashboardSummary: vi.fn(),
  getNotificationsByUser: vi.fn(),
  createNotification: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getLearningInsights: vi.fn(),
  createLearningOutcome: vi.fn(),
  getSchedulesByUser: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  upsertSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getSupportHistory: vi.fn(),
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
}));

// ---- Mock other heavy deps ----------------------------------------------
vi.mock("./engagementEngine", () => ({
  discoverThreads: vi.fn(),
  generateEngagement: vi.fn(),
  computeLearningInsights: vi.fn(),
}));
vi.mock("./scheduler", () => ({
  registerSchedule: vi.fn(),
  stopSchedule: vi.fn(),
  triggerScheduleNow: vi.fn(),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./routers/team", () => ({ teamRouter: { _def: { procedures: {} } } }));

import { callDataApi } from "./_core/dataApi";
import { getAccountsByUser, updateAccount } from "./db";

const mockCallDataApi = callDataApi as ReturnType<typeof vi.fn>;
const mockGetAccounts = getAccountsByUser as ReturnType<typeof vi.fn>;
const mockUpdateAccount = updateAccount as ReturnType<typeof vi.fn>;

function makeCaller(userId = 1) {
  return appRouter.createCaller({
    user: { id: userId, email: "test@example.com", name: "Test", role: "user" as const },
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {} as any,
  });
}

const TWITTER_ACCOUNT = {
  id: 10,
  userId: 1,
  platform: "twitter" as const,
  handle: "testuser",
  displayName: "Test User",
  followers: 100,
  following: 50,
  engagementRate: 0,
  isActive: true,
  lastSynced: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  avatarUrl: null,
  encryptedCredentials: null,
};

const LINKEDIN_ACCOUNT = {
  ...TWITTER_ACCOUNT,
  id: 11,
  platform: "linkedin" as const,
  handle: "testlinkedin",
};

const INSTAGRAM_ACCOUNT = {
  ...TWITTER_ACCOUNT,
  id: 12,
  platform: "instagram" as const,
  handle: "testinsta",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateAccount.mockResolvedValue(undefined);
});

describe("accounts.syncStats", () => {
  it("Twitter: successful sync returns success status with follower counts and updates DB", async () => {
    mockGetAccounts.mockResolvedValue([TWITTER_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      result: {
        data: {
          user: {
            result: {
              core: { name: "Test User Live" },
              legacy: {
                followers_count: 1234,
                friends_count: 567,
              },
            },
          },
        },
      },
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 10 });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("success");
    expect(results[0].followers).toBe(1234);
    expect(results[0].following).toBe(567);
    expect(mockUpdateAccount).toHaveBeenCalledWith(
      10,
      1,
      expect.objectContaining({ followers: 1234, following: 567 })
    );
  });

  it("Twitter: quota exceeded response returns quota_exceeded status without DB update", async () => {
    mockGetAccounts.mockResolvedValue([TWITTER_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      message: "You have exceeded the MONTHLY quota for Requests",
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 10 });

    expect(results[0].status).toBe("quota_exceeded");
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("Twitter: failed_precondition code also returns quota_exceeded", async () => {
    mockGetAccounts.mockResolvedValue([TWITTER_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      code: "failed_precondition",
      message: "api call failed: internal: api call failed, status code: 429",
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 10 });

    expect(results[0].status).toBe("quota_exceeded");
  });

  it("LinkedIn: successful sync updates displayName and returns success", async () => {
    mockGetAccounts.mockResolvedValue([LINKEDIN_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      headline: "CEO at Acme",
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 11 });

    expect(results[0].status).toBe("success");
    expect(results[0].displayName).toBe("Jane Doe");
    expect(mockUpdateAccount).toHaveBeenCalledWith(
      11,
      1,
      expect.objectContaining({ displayName: "Jane Doe" })
    );
  });

  it("LinkedIn: inaccessible profile returns error status", async () => {
    mockGetAccounts.mockResolvedValue([LINKEDIN_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      success: false,
      message: "This profile can't be accessed",
      data: null,
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 11 });

    expect(results[0].status).toBe("error");
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("Instagram: returns not_supported status and still updates lastSynced", async () => {
    mockGetAccounts.mockResolvedValue([INSTAGRAM_ACCOUNT]);

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 12 });

    expect(results[0].status).toBe("not_supported");
    expect(mockUpdateAccount).toHaveBeenCalledWith(
      12,
      1,
      expect.objectContaining({ lastSynced: expect.any(Date) })
    );
    // callDataApi should NOT have been called for unsupported platforms
    expect(mockCallDataApi).not.toHaveBeenCalled();
  });

  it("id=0 syncs all accounts for the user", async () => {
    mockGetAccounts.mockResolvedValue([TWITTER_ACCOUNT, INSTAGRAM_ACCOUNT]);
    mockCallDataApi.mockResolvedValue({
      result: {
        data: {
          user: {
            result: {
              core: { name: "Test" },
              legacy: { followers_count: 999, friends_count: 111 },
            },
          },
        },
      },
    });

    const caller = makeCaller();
    const results = await caller.accounts.syncStats({ id: 0 });

    expect(results).toHaveLength(2);
    const twitterResult = results.find(r => r.platform === "twitter");
    const instaResult = results.find(r => r.platform === "instagram");
    expect(twitterResult?.status).toBe("success");
    expect(instaResult?.status).toBe("not_supported");
  });

  it("throws NOT_FOUND when account id does not belong to user", async () => {
    mockGetAccounts.mockResolvedValue([TWITTER_ACCOUNT]); // only id=10 exists

    const caller = makeCaller();
    await expect(caller.accounts.syncStats({ id: 999 })).rejects.toThrow("Account not found");
  });
});
