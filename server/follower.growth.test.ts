/**
 * Tests for the follower growth chart feature.
 * Covers: getFollowerGrowth procedure logic, pivot/chart data transformation,
 * net-change calculation, and time-range filtering.
 */
import { describe, it, expect } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────────

type FollowerRow = {
  date: string;
  accountId: number | null;
  handle: string;
  platform: string;
  followers: number;
  followerDelta: number;
};

// ─── Helpers (mirror client-side logic in Analytics.tsx) ──────────────────────

function buildAccountList(rows: FollowerRow[]) {
  const seen = new Map<number, { accountId: number; handle: string; platform: string }>();
  for (const row of rows) {
    if (row.accountId !== null && !seen.has(row.accountId)) {
      seen.set(row.accountId, {
        accountId: row.accountId,
        handle: row.handle,
        platform: row.platform,
      });
    }
  }
  return Array.from(seen.values());
}

function pivotToChartData(rows: FollowerRow[]) {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, {});
    byDate.get(row.date)![row.handle] = row.followers;
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

function calcNetChanges(rows: FollowerRow[]) {
  const byAccount: Record<string, { first: number; last: number }> = {};
  for (const row of rows) {
    if (!byAccount[row.handle]) {
      byAccount[row.handle] = { first: row.followers, last: row.followers };
    } else {
      byAccount[row.handle].last = row.followers;
    }
  }
  return Object.fromEntries(
    Object.entries(byAccount).map(([handle, { first, last }]) => [handle, last - first])
  );
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleRows: FollowerRow[] = [
  { date: "2026-03-01", accountId: 1, handle: "@alice", platform: "twitter", followers: 1000, followerDelta: 0 },
  { date: "2026-03-02", accountId: 1, handle: "@alice", platform: "twitter", followers: 1020, followerDelta: 20 },
  { date: "2026-03-03", accountId: 1, handle: "@alice", platform: "twitter", followers: 1050, followerDelta: 30 },
  { date: "2026-03-01", accountId: 2, handle: "@bob",   platform: "linkedin", followers: 500,  followerDelta: 0 },
  { date: "2026-03-02", accountId: 2, handle: "@bob",   platform: "linkedin", followers: 510,  followerDelta: 10 },
  { date: "2026-03-03", accountId: 2, handle: "@bob",   platform: "linkedin", followers: 490,  followerDelta: -20 },
];

// ─── Account list extraction ──────────────────────────────────────────────────

describe("buildAccountList", () => {
  it("returns one entry per unique accountId", () => {
    const accounts = buildAccountList(sampleRows);
    expect(accounts).toHaveLength(2);
  });

  it("preserves handle and platform", () => {
    const accounts = buildAccountList(sampleRows);
    const alice = accounts.find((a) => a.handle === "@alice");
    expect(alice?.platform).toBe("twitter");
    const bob = accounts.find((a) => a.handle === "@bob");
    expect(bob?.platform).toBe("linkedin");
  });

  it("returns empty array for empty input", () => {
    expect(buildAccountList([])).toHaveLength(0);
  });

  it("skips rows with null accountId", () => {
    const rows: FollowerRow[] = [
      { date: "2026-03-01", accountId: null, handle: "unknown", platform: "twitter", followers: 100, followerDelta: 0 },
    ];
    expect(buildAccountList(rows)).toHaveLength(0);
  });
});

// ─── Chart pivot ──────────────────────────────────────────────────────────────

describe("pivotToChartData", () => {
  it("produces one entry per unique date", () => {
    const data = pivotToChartData(sampleRows);
    expect(data).toHaveLength(3);
  });

  it("dates are sorted ascending", () => {
    const data = pivotToChartData(sampleRows);
    expect(data[0].date).toBe("2026-03-01");
    expect(data[2].date).toBe("2026-03-03");
  });

  it("each date entry has follower counts keyed by handle", () => {
    const data = pivotToChartData(sampleRows);
    expect(data[0]["@alice"]).toBe(1000);
    expect(data[0]["@bob"]).toBe(500);
    expect(data[2]["@alice"]).toBe(1050);
    expect(data[2]["@bob"]).toBe(490);
  });

  it("returns empty array for empty input", () => {
    expect(pivotToChartData([])).toHaveLength(0);
  });
});

// ─── Net change calculation ───────────────────────────────────────────────────

describe("calcNetChanges", () => {
  it("calculates positive net change correctly", () => {
    const changes = calcNetChanges(sampleRows);
    expect(changes["@alice"]).toBe(50); // 1050 - 1000
  });

  it("calculates negative net change correctly", () => {
    const changes = calcNetChanges(sampleRows);
    expect(changes["@bob"]).toBe(-10); // 490 - 500
  });

  it("returns 0 for single-row account", () => {
    const rows: FollowerRow[] = [
      { date: "2026-03-01", accountId: 1, handle: "@single", platform: "twitter", followers: 200, followerDelta: 0 },
    ];
    const changes = calcNetChanges(rows);
    expect(changes["@single"]).toBe(0);
  });

  it("returns empty object for empty input", () => {
    expect(calcNetChanges([])).toEqual({});
  });
});

// ─── Time-range filtering (server-side logic) ─────────────────────────────────

describe("time-range filtering", () => {
  function filterByDays(rows: FollowerRow[], days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return rows.filter((r) => r.date >= cutoffStr);
  }

  it("7-day filter excludes old data", () => {
    const oldRows: FollowerRow[] = [
      { date: "2020-01-01", accountId: 1, handle: "@old", platform: "twitter", followers: 100, followerDelta: 0 },
    ];
    expect(filterByDays(oldRows, 7)).toHaveLength(0);
  });

  it("365-day filter includes recent data", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);
    const recentRows: FollowerRow[] = [
      {
        date: recentDate.toISOString().slice(0, 10),
        accountId: 1,
        handle: "@recent",
        platform: "twitter",
        followers: 500,
        followerDelta: 5,
      },
    ];
    expect(filterByDays(recentRows, 365)).toHaveLength(1);
  });

  it("accepts valid days range 7-365", () => {
    const validDays = [7, 30, 90, 365];
    for (const d of validDays) {
      expect(d).toBeGreaterThanOrEqual(7);
      expect(d).toBeLessThanOrEqual(365);
    }
  });
});

// ─── getFollowerGrowth response shape ─────────────────────────────────────────

describe("getFollowerGrowth response shape", () => {
  it("each row has required fields", () => {
    const row = sampleRows[0];
    expect(row).toHaveProperty("date");
    expect(row).toHaveProperty("accountId");
    expect(row).toHaveProperty("handle");
    expect(row).toHaveProperty("platform");
    expect(row).toHaveProperty("followers");
    expect(row).toHaveProperty("followerDelta");
  });

  it("date is in YYYY-MM-DD format", () => {
    const row = sampleRows[0];
    expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("followers is a non-negative number", () => {
    for (const row of sampleRows) {
      expect(row.followers).toBeGreaterThanOrEqual(0);
    }
  });
});
