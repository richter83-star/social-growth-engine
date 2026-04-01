/**
 * Support Chat Router Tests
 *
 * Tests the support.chat mutation and support.getHistory query via the
 * tRPC caller API (no HTTP layer needed).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock DB helpers ───────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSupportHistory: vi.fn().mockResolvedValue([]),
    saveSupportMessage: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Mock LLM ──────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Hello! How can I help you today?" } }],
  }),
}));

import { getSupportHistory, saveSupportMessage } from "./db";
import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";

function makeCaller(user?: { id: number; name: string; email: string; role: "user" | "admin" }) {
  return appRouter.createCaller({
    user: user ?? null,
    req: { headers: { origin: "http://localhost:3000" } } as never,
    res: {} as never,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("support.getHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no history exists", async () => {
    vi.mocked(getSupportHistory).mockResolvedValueOnce([]);
    const caller = makeCaller();
    const result = await caller.support.getHistory({ sessionId: "session-abc" });
    expect(result).toEqual([]);
    expect(getSupportHistory).toHaveBeenCalledWith("session-abc");
  });

  it("returns messages from the DB helper", async () => {
    const fakeMessages = [
      { id: 1, sessionId: "session-abc", userId: null, role: "user" as const, content: "Hi", createdAt: new Date() },
      { id: 2, sessionId: "session-abc", userId: null, role: "assistant" as const, content: "Hello!", createdAt: new Date() },
    ];
    vi.mocked(getSupportHistory).mockResolvedValueOnce(fakeMessages);
    const caller = makeCaller();
    const result = await caller.support.getHistory({ sessionId: "session-abc" });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });
});

describe("support.chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves user message and assistant reply, returns reply", async () => {
    const caller = makeCaller();
    const result = await caller.support.chat({
      sessionId: "session-xyz",
      message: "How does Discovery work?",
      history: [],
    });

    expect(result.reply).toBe("Hello! How can I help you today?");

    // User message saved
    expect(saveSupportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "How does Discovery work?", sessionId: "session-xyz" })
    );
    // Assistant reply saved
    expect(saveSupportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", content: "Hello! How can I help you today?", sessionId: "session-xyz" })
    );
    expect(saveSupportMessage).toHaveBeenCalledTimes(2);
  });

  it("passes conversation history to LLM", async () => {
    const caller = makeCaller();
    await caller.support.chat({
      sessionId: "session-xyz",
      message: "What about pricing?",
      history: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
      ],
    });

    const llmCall = vi.mocked(invokeLLM).mock.calls[0][0];
    const messages = llmCall.messages as Array<{ role: string; content: string }>;

    // System prompt is first
    expect(messages[0].role).toBe("system");
    // History is included
    expect(messages[1]).toEqual({ role: "user", content: "Hi" });
    expect(messages[2]).toEqual({ role: "assistant", content: "Hello!" });
    // Current message is last
    expect(messages[messages.length - 1]).toEqual({ role: "user", content: "What about pricing?" });
  });

  it("attaches userId when user is authenticated", async () => {
    const caller = makeCaller({ id: 42, name: "Alice", email: "alice@test.com", role: "user" });
    await caller.support.chat({
      sessionId: "session-auth",
      message: "Hello",
      history: [],
    });

    expect(saveSupportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, sessionId: "session-auth" })
    );
  });

  it("falls back to default reply when LLM returns null content", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({ choices: [{ message: { content: null } }] } as never);
    const caller = makeCaller();
    const result = await caller.support.chat({
      sessionId: "session-fallback",
      message: "Test",
      history: [],
    });
    expect(result.reply).toContain("couldn't process");
  });

  it("rejects messages longer than 2000 characters", async () => {
    const caller = makeCaller();
    await expect(
      caller.support.chat({
        sessionId: "session-xyz",
        message: "x".repeat(2001),
        history: [],
      })
    ).rejects.toThrow();
  });

  it("rejects empty messages", async () => {
    const caller = makeCaller();
    await expect(
      caller.support.chat({
        sessionId: "session-xyz",
        message: "",
        history: [],
      })
    ).rejects.toThrow();
  });
});
