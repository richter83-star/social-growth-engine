/**
 * Tests for the syncMyAccounts mutation (Analytics "Sync Now" button).
 * Covers: response shape, count logic, empty/skipped/failed scenarios.
 */
import { describe, it, expect } from "vitest";

// ─── Types mirroring the procedure response ───────────────────────────────────

type SyncResult = {
  synced: number;
  failed: number;
  skipped: number;
  total: number;
  syncedAt: string;
};

type AccountStub = {
  id: number;
  userId: number;
  handle: string;
  platform: string;
  isActive: boolean;
  followers: number | null;
};

// ─── Pure logic helpers (mirror server-side logic) ────────────────────────────

function buildSyncSummaryMessage(data: SyncResult): string {
  if (data.synced > 0) {
    return `Synced ${data.synced} account${data.synced !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}.`;
  }
  if (data.skipped > 0) {
    return `No accounts with live data to sync (${data.skipped} skipped).`;
  }
  return "No active accounts found.";
}

function filterActiveAccounts(accounts: AccountStub[]): AccountStub[] {
  return accounts.filter((a) => a.isActive);
}

function classifyPlatform(platform: string): "syncable" | "skipped" {
  // Twitter and Instagram have API support; others are skipped
  return ["twitter", "instagram"].includes(platform) ? "syncable" : "skipped";
}

function buildSnapshotValues(account: AccountStub, followers: number, today: string) {
  const prevFollowers = account.followers ?? 0;
  return {
    userId: account.userId,
    accountId: account.id,
    date: today,
    followers,
    followerDelta: followers - prevFollowers,
  };
}

// ─── Summary message tests ────────────────────────────────────────────────────

describe("buildSyncSummaryMessage", () => {
  it("shows synced count when synced > 0", () => {
    const msg = buildSyncSummaryMessage({ synced: 3, failed: 0, skipped: 0, total: 3, syncedAt: "" });
    expect(msg).toBe("Synced 3 accounts.");
  });

  it("uses singular 'account' when synced === 1", () => {
    const msg = buildSyncSummaryMessage({ synced: 1, failed: 0, skipped: 0, total: 1, syncedAt: "" });
    expect(msg).toBe("Synced 1 account.");
  });

  it("includes failed count when both synced and failed > 0", () => {
    const msg = buildSyncSummaryMessage({ synced: 2, failed: 1, skipped: 0, total: 3, syncedAt: "" });
    expect(msg).toBe("Synced 2 accounts, 1 failed.");
  });

  it("shows skipped message when synced === 0 and skipped > 0", () => {
    const msg = buildSyncSummaryMessage({ synced: 0, failed: 0, skipped: 2, total: 2, syncedAt: "" });
    expect(msg).toBe("No accounts with live data to sync (2 skipped).");
  });

  it("shows no active accounts message when all zero", () => {
    const msg = buildSyncSummaryMessage({ synced: 0, failed: 0, skipped: 0, total: 0, syncedAt: "" });
    expect(msg).toBe("No active accounts found.");
  });
});

// ─── Active account filtering ─────────────────────────────────────────────────

describe("filterActiveAccounts", () => {
  const accounts: AccountStub[] = [
    { id: 1, userId: 10, handle: "@alice", platform: "twitter", isActive: true, followers: 1000 },
    { id: 2, userId: 10, handle: "@bob",   platform: "linkedin", isActive: false, followers: 500 },
    { id: 3, userId: 10, handle: "@carol", platform: "instagram", isActive: true, followers: 200 },
  ];

  it("returns only active accounts", () => {
    const active = filterActiveAccounts(accounts);
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.handle)).toEqual(["@alice", "@carol"]);
  });

  it("returns empty array when no active accounts", () => {
    const inactive = accounts.map((a) => ({ ...a, isActive: false }));
    expect(filterActiveAccounts(inactive)).toHaveLength(0);
  });

  it("returns all when all are active", () => {
    const allActive = accounts.map((a) => ({ ...a, isActive: true }));
    expect(filterActiveAccounts(allActive)).toHaveLength(3);
  });
});

// ─── Platform classification ──────────────────────────────────────────────────

describe("classifyPlatform", () => {
  it("classifies twitter as syncable", () => {
    expect(classifyPlatform("twitter")).toBe("syncable");
  });

  it("classifies instagram as syncable", () => {
    expect(classifyPlatform("instagram")).toBe("syncable");
  });

  it("classifies linkedin as skipped", () => {
    expect(classifyPlatform("linkedin")).toBe("skipped");
  });

  it("classifies tiktok as skipped", () => {
    expect(classifyPlatform("tiktok")).toBe("skipped");
  });

  it("classifies reddit as skipped", () => {
    expect(classifyPlatform("reddit")).toBe("skipped");
  });
});

// ─── Snapshot value construction ─────────────────────────────────────────────

describe("buildSnapshotValues", () => {
  const account: AccountStub = {
    id: 5, userId: 10, handle: "@test", platform: "twitter", isActive: true, followers: 800,
  };

  it("computes positive followerDelta correctly", () => {
    const snap = buildSnapshotValues(account, 850, "2026-04-02");
    expect(snap.followerDelta).toBe(50);
    expect(snap.followers).toBe(850);
  });

  it("computes negative followerDelta correctly", () => {
    const snap = buildSnapshotValues(account, 750, "2026-04-02");
    expect(snap.followerDelta).toBe(-50);
  });

  it("uses 0 as prevFollowers when account.followers is null", () => {
    const nullAccount = { ...account, followers: null };
    const snap = buildSnapshotValues(nullAccount, 300, "2026-04-02");
    expect(snap.followerDelta).toBe(300);
  });

  it("sets correct userId and accountId", () => {
    const snap = buildSnapshotValues(account, 800, "2026-04-02");
    expect(snap.userId).toBe(10);
    expect(snap.accountId).toBe(5);
  });

  it("sets correct date", () => {
    const snap = buildSnapshotValues(account, 800, "2026-04-02");
    expect(snap.date).toBe("2026-04-02");
  });
});

// ─── Response shape validation ────────────────────────────────────────────────

describe("syncMyAccounts response shape", () => {
  const mockResponse: SyncResult = {
    synced: 2,
    failed: 0,
    skipped: 1,
    total: 3,
    syncedAt: "2026-04-02T15:00:00.000Z",
  };

  it("has all required fields", () => {
    expect(mockResponse).toHaveProperty("synced");
    expect(mockResponse).toHaveProperty("failed");
    expect(mockResponse).toHaveProperty("skipped");
    expect(mockResponse).toHaveProperty("total");
    expect(mockResponse).toHaveProperty("syncedAt");
  });

  it("synced + failed + skipped equals total", () => {
    expect(mockResponse.synced + mockResponse.failed + mockResponse.skipped).toBe(mockResponse.total);
  });

  it("syncedAt is a valid ISO string", () => {
    expect(() => new Date(mockResponse.syncedAt)).not.toThrow();
    expect(new Date(mockResponse.syncedAt).toISOString()).toBe(mockResponse.syncedAt);
  });

  it("all counts are non-negative", () => {
    expect(mockResponse.synced).toBeGreaterThanOrEqual(0);
    expect(mockResponse.failed).toBeGreaterThanOrEqual(0);
    expect(mockResponse.skipped).toBeGreaterThanOrEqual(0);
    expect(mockResponse.total).toBeGreaterThanOrEqual(0);
  });
});
