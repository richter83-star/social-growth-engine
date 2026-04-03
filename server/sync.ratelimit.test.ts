/**
 * Tests for the Sync Now rate-limiting logic.
 * Covers: server-side cooldown guard message format, client-side hook helpers,
 * localStorage key namespacing, countdown math, and edge cases.
 */
import { describe, it, expect } from "vitest";

// ─── Server-side rate limit helpers (mirrored from routers.ts) ───────────────

const SYNC_COOLDOWN_MS = 60_000;

function buildRateLimitMessage(elapsedMs: number): string | null {
  const remaining = SYNC_COOLDOWN_MS - elapsedMs;
  if (remaining <= 0) return null; // not rate-limited
  const cooldownSeconds = Math.ceil(remaining / 1000);
  return `Please wait ${cooldownSeconds} second${cooldownSeconds !== 1 ? "s" : ""} before syncing again.`;
}

function isRateLimited(lastRunMs: number, nowMs: number): boolean {
  return nowMs - lastRunMs < SYNC_COOLDOWN_MS;
}

// ─── Client-side cooldown helpers (mirrored from useSyncCooldown.ts) ─────────

function getStorageKey(userId: number): string {
  return `sync_cooldown_${userId}`;
}

function computeSecondsLeft(expiresAt: number, now: number): number {
  const remaining = Math.ceil((expiresAt - now) / 1000);
  return remaining > 0 ? remaining : 0;
}

function buildExpiresAt(now: number): number {
  return now + SYNC_COOLDOWN_MS;
}

// ─── Server-side rate limit message tests ────────────────────────────────────

describe("buildRateLimitMessage", () => {
  it("returns null when cooldown has expired", () => {
    expect(buildRateLimitMessage(SYNC_COOLDOWN_MS)).toBeNull();
    expect(buildRateLimitMessage(SYNC_COOLDOWN_MS + 1000)).toBeNull();
  });

  it("returns correct message at start of cooldown (0ms elapsed)", () => {
    const msg = buildRateLimitMessage(0);
    expect(msg).toBe("Please wait 60 seconds before syncing again.");
  });

  it("returns correct message at 30s elapsed", () => {
    const msg = buildRateLimitMessage(30_000);
    expect(msg).toBe("Please wait 30 seconds before syncing again.");
  });

  it("returns singular 'second' when exactly 1 second remains", () => {
    const msg = buildRateLimitMessage(59_001); // 999ms remaining → ceil = 1
    expect(msg).toBe("Please wait 1 second before syncing again.");
  });

  it("returns 1 second when 59.5s elapsed (500ms remaining)", () => {
    const msg = buildRateLimitMessage(59_500);
    expect(msg).toBe("Please wait 1 second before syncing again.");
  });

  it("returns null at exactly COOLDOWN_MS elapsed", () => {
    expect(buildRateLimitMessage(SYNC_COOLDOWN_MS)).toBeNull();
  });
});

// ─── isRateLimited tests ──────────────────────────────────────────────────────

describe("isRateLimited", () => {
  const base = 1_000_000;

  it("returns true immediately after a sync", () => {
    expect(isRateLimited(base, base)).toBe(true);
  });

  it("returns true at 59 seconds elapsed", () => {
    expect(isRateLimited(base, base + 59_000)).toBe(true);
  });

  it("returns false at exactly 60 seconds elapsed", () => {
    expect(isRateLimited(base, base + 60_000)).toBe(false);
  });

  it("returns false when no prior sync (lastRunMs = 0)", () => {
    expect(isRateLimited(0, base)).toBe(false);
  });

  it("returns false well after cooldown window", () => {
    expect(isRateLimited(base, base + 120_000)).toBe(false);
  });
});

// ─── Client-side localStorage key tests ──────────────────────────────────────

describe("getStorageKey", () => {
  it("namespaces key by userId", () => {
    expect(getStorageKey(1)).toBe("sync_cooldown_1");
    expect(getStorageKey(42)).toBe("sync_cooldown_42");
    expect(getStorageKey(999)).toBe("sync_cooldown_999");
  });

  it("different users produce different keys", () => {
    expect(getStorageKey(1)).not.toBe(getStorageKey(2));
  });
});

// ─── computeSecondsLeft tests ─────────────────────────────────────────────────

describe("computeSecondsLeft", () => {
  const now = 1_000_000;

  it("returns full 60s at start of cooldown", () => {
    const expiresAt = buildExpiresAt(now);
    expect(computeSecondsLeft(expiresAt, now)).toBe(60);
  });

  it("returns 30 when half the cooldown has elapsed", () => {
    const expiresAt = now + 30_000;
    expect(computeSecondsLeft(expiresAt, now)).toBe(30);
  });

  it("returns 1 when 500ms remain (ceil rounds up)", () => {
    const expiresAt = now + 500;
    expect(computeSecondsLeft(expiresAt, now)).toBe(1);
  });

  it("returns 0 when cooldown has expired", () => {
    const expiresAt = now - 1;
    expect(computeSecondsLeft(expiresAt, now)).toBe(0);
  });

  it("returns 0 when expiresAt equals now", () => {
    expect(computeSecondsLeft(now, now)).toBe(0);
  });
});

// ─── buildExpiresAt tests ─────────────────────────────────────────────────────

describe("buildExpiresAt", () => {
  it("sets expiry exactly COOLDOWN_MS in the future", () => {
    const now = Date.now();
    const expiresAt = buildExpiresAt(now);
    expect(expiresAt - now).toBe(SYNC_COOLDOWN_MS);
  });

  it("produces a value greater than now", () => {
    const now = 5_000_000;
    expect(buildExpiresAt(now)).toBeGreaterThan(now);
  });
});

// ─── Integration: full cooldown lifecycle ────────────────────────────────────

describe("cooldown lifecycle", () => {
  it("correctly tracks from sync to expiry", () => {
    const syncTime = 1_000_000;
    const expiresAt = buildExpiresAt(syncTime);

    // Immediately after sync
    expect(isRateLimited(syncTime, syncTime)).toBe(true);
    expect(computeSecondsLeft(expiresAt, syncTime)).toBe(60);

    // 30 seconds later
    const t30 = syncTime + 30_000;
    expect(isRateLimited(syncTime, t30)).toBe(true);
    expect(computeSecondsLeft(expiresAt, t30)).toBe(30);

    // 59 seconds later
    const t59 = syncTime + 59_000;
    expect(isRateLimited(syncTime, t59)).toBe(true);
    expect(computeSecondsLeft(expiresAt, t59)).toBe(1);

    // 60 seconds later — cooldown expired
    const t60 = syncTime + 60_000;
    expect(isRateLimited(syncTime, t60)).toBe(false);
    expect(computeSecondsLeft(expiresAt, t60)).toBe(0);
  });
});
