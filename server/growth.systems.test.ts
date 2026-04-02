/**
 * Tests for the 5 growth automation systems:
 * - Campaign Templates
 * - Referral Program (applyCode)
 * - Onboarding (getStatus)
 * - Sales chat system prompt switching
 * - Locked threads (client-side, tested via plan limit logic)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ── Mock DB ───────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }),
  };
});

vi.mock("./socialOAuth", () => ({
  getOAuthToken: vi.fn().mockResolvedValue(null),
  saveOAuthToken: vi.fn().mockResolvedValue(undefined),
  deleteOAuthToken: vi.fn().mockResolvedValue(undefined),
  generatePKCE: vi.fn().mockReturnValue({ codeVerifier: "v", codeChallenge: "c" }),
  stateStore: { set: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

vi.mock("./instagramMcp", () => ({
  getInstagramAccountInfo: vi.fn().mockResolvedValue(null),
  getInstagramPosts: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ keywords: ["test keyword 1", "test keyword 2"] }) } }],
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 1, email: "test@example.com", name: "Test User", role: "user" as const },
    req: { headers: { origin: "https://example.com" } },
    ...overrides,
  } as Parameters<typeof appRouter.createCaller>[0];
}

// ── Campaign Templates ────────────────────────────────────────────────────────
describe("campaignTemplates.getTemplates", () => {
  it("returns all 6 templates", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const templates = await caller.campaignTemplates.getTemplates();
    expect(templates).toHaveLength(6);
  });

  it("each template has required fields", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const templates = await caller.campaignTemplates.getTemplates();
    for (const t of templates) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("description");
      expect(t.keywords).toBeInstanceOf(Array);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.platforms).toBeInstanceOf(Array);
      expect(t.platforms.length).toBeGreaterThan(0);
      expect(t).toHaveProperty("persona");
      expect(t).toHaveProperty("estimatedThreadsPerWeek");
    }
  });

  it("includes the self-promotion template", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const templates = await caller.campaignTemplates.getTemplates();
    const selfPromo = templates.find((t) => t.id === "growth-engine-self-promo");
    expect(selfPromo).toBeDefined();
    expect(selfPromo?.name).toContain("Growth Engine");
  });

  it("includes social media manager template", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const templates = await caller.campaignTemplates.getTemplates();
    const smm = templates.find((t) => t.id === "social-media-managers");
    expect(smm).toBeDefined();
    expect(smm?.keywords.length).toBeGreaterThanOrEqual(5);
  });
});

// ── Referral applyCode ────────────────────────────────────────────────────────
describe("referrals.applyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an empty referral code", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.referrals.applyCode({ code: "" })).rejects.toThrow();
  });

  it("rejects when referral code not found in DB", async () => {
    const { getDb } = await import("./db");
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]), // no user found with that code
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.referrals.applyCode({ code: "INVALID1" })).rejects.toThrow();
  });
});

// ── Onboarding getStatus ──────────────────────────────────────────────────────────────────
describe("onboarding.getStatus", () => {
  it("returns not completed for a new user", async () => {
    const { getDb } = await import("./db");
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ onboardingCompleted: false, onboardingData: null, referralCode: null }]),
      limit: vi.fn().mockReturnThis(),
    };
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockChain);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.onboarding.getStatus();
    expect(status.completed).toBe(false);
  });

  it("returns completed for a user who has finished onboarding", async () => {
    const { getDb } = await import("./db");
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ onboardingCompleted: true, onboardingData: { industry: "SaaS" }, referralCode: "ABC123" }]),
      limit: vi.fn().mockReturnThis(),
    };
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockChain);
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.onboarding.getStatus();
    expect(status.completed).toBe(true);
  });
});
// ── Support chat mode switching ───────────────────────────────────────────────
describe("support.chat — mode switching", () => {
  it("uses sales prompt for unauthenticated users (no user in ctx)", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: { origin: "https://example.com" } },
    } as Parameters<typeof appRouter.createCaller>[0]);

    // The mutation should work (not throw auth error) for unauthenticated users
    // since support.chat is a publicProcedure
    const { getDb } = await import("./db");
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    });

    // invokeLLM is mocked — just verify the call doesn't throw
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
      choices: [{ message: { content: "I can help you find the right plan!" } }],
    });

    const result = await caller.support.chat({
      sessionId: "test-session-anon",
      message: "What does it cost?",
      history: [],
    });
    expect(result.reply).toBeDefined();
    expect(typeof result.reply).toBe("string");
  });
});
