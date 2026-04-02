/**
 * Daily Account Sync Job
 * Runs every night at 2 AM UTC.
 * Fetches all active social accounts across all users and calls the platform
 * sync logic for each, recording results in sync_job_logs.
 */
import { callDataApi } from "../_core/dataApi";
import { getDb } from "../db";
import { socialAccounts, syncJobLogs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getOAuthToken } from "../socialOAuth";
import { fetchLinkedInProfileWithToken, fetchInstagramMetricsWithToken } from "../socialOAuth";
import { notifyOwner } from "../_core/notification";

type SyncResult = {
  id: number;
  handle: string;
  platform: string;
  status: "success" | "error" | "skipped" | "not_supported";
  followers?: number;
  error?: string;
};

/**
 * Sync a single account — mirrors the logic in routers.ts syncStats mutation
 * but operates without a user context (uses userId from the account row).
 */
async function syncAccount(account: {
  id: number;
  userId: number;
  handle: string;
  platform: string;
  followers: number | null;
  following: number | null;
  displayName: string | null;
}): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const handle = account.handle.replace(/^@/, "");

  if (!handle) {
    return { id: account.id, handle: account.handle, platform: account.platform, status: "skipped", error: "No handle configured" };
  }

  try {
    if (account.platform === "twitter") {
      // Try OAuth token first
      const oauthToken = await getOAuthToken(account.userId, account.id);
      if (oauthToken) {
        // OAuth token exists — use it for richer data (same as routers.ts)
        // For now fall through to public API (Twitter OAuth v2 user lookup)
      }
      const raw = await callDataApi("Twitter/get_user_profile_by_username", {
        query: { username: handle },
      }) as Record<string, unknown>;

      if (raw?.success === false) {
        return { id: account.id, handle: account.handle, platform: account.platform, status: "error", error: (raw.message as string) ?? "API error" };
      }

      const userData = (raw?.data as Record<string, unknown>) ?? {};
      const legacy = (userData?.legacy as Record<string, unknown>) ?? {};
      const core = (userData?.core as Record<string, unknown>) ?? {};
      const followers = typeof legacy.followers_count === "number" ? legacy.followers_count : undefined;
      const following = typeof legacy.friends_count === "number" ? legacy.friends_count : undefined;
      const displayName = (core.name as string) ?? (legacy.name as string) ?? undefined;

      if (followers !== undefined) {
        await db.update(socialAccounts).set({
          followers,
          following: following ?? account.following ?? 0,
          displayName: displayName ?? account.displayName ?? account.handle,
          lastSynced: new Date(),
          updatedAt: new Date(),
        }).where(eq(socialAccounts.id, account.id));
        return { id: account.id, handle: account.handle, platform: account.platform, status: "success", followers };
      } else {
        await db.update(socialAccounts).set({ lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
        return { id: account.id, handle: account.handle, platform: account.platform, status: "error", error: "Profile not found or private" };
      }

    } else if (account.platform === "linkedin") {
      const oauthToken = await getOAuthToken(account.userId, account.id);
      if (oauthToken) {
        const profile = await fetchLinkedInProfileWithToken(oauthToken.accessToken);
        if (profile) {
          await db.update(socialAccounts).set({ displayName: profile.displayName, lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
          return { id: account.id, handle: account.handle, platform: account.platform, status: "success" };
        }
      }
      // Fallback: public API
      const raw = await callDataApi("LinkedIn/get_user_profile_by_username", {
        query: { username: handle },
      }) as Record<string, unknown>;
      if (raw?.success === false) {
        return { id: account.id, handle: account.handle, platform: account.platform, status: "error", error: (raw.message as string) ?? "Profile not accessible" };
      }
      const firstName = (raw.firstName as string) ?? "";
      const lastName = (raw.lastName as string) ?? "";
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || undefined;
      await db.update(socialAccounts).set({ displayName: displayName ?? account.displayName ?? account.handle, lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
      return { id: account.id, handle: account.handle, platform: account.platform, status: "success" };

    } else if (account.platform === "instagram") {
      const oauthToken = await getOAuthToken(account.userId, account.id);
      if (!oauthToken) {
        await db.update(socialAccounts).set({ lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
        return { id: account.id, handle: account.handle, platform: account.platform, status: "not_supported", error: "Connect Instagram OAuth to enable sync" };
      }
      const igMetrics = await fetchInstagramMetricsWithToken(oauthToken.accessToken);
      if (!igMetrics) {
        return { id: account.id, handle: account.handle, platform: account.platform, status: "error", error: "Could not fetch Instagram metrics" };
      }
      await db.update(socialAccounts).set({ followers: igMetrics.followers, lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
      return { id: account.id, handle: account.handle, platform: account.platform, status: "success", followers: igMetrics.followers };

    } else {
      // TikTok, Reddit — no API available
      await db.update(socialAccounts).set({ lastSynced: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, account.id));
      return { id: account.id, handle: account.handle, platform: account.platform, status: "not_supported", error: `${account.platform} sync not yet supported` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { id: account.id, handle: account.handle, platform: account.platform, status: "error", error: message };
  }
}

/**
 * Run the full daily sync job across all active accounts.
 * Called by the cron scheduler at 2 AM UTC.
 */
export async function runDailyAccountSync(): Promise<void> {
  const startedAt = new Date();
  console.log(`[DailySync] Starting daily account sync at ${startedAt.toISOString()}`);

  const db = await getDb();
  if (!db) {
    console.error("[DailySync] DB unavailable — aborting");
    return;
  }

  // Create a log entry for this run
  const [logInsert] = await db.insert(syncJobLogs).values({
    jobType: "daily_account_sync",
    startedAt,
    totalAccounts: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  });
  const logId = (logInsert as unknown as { insertId: number }).insertId;

  try {
    // Fetch all active accounts across all users
    const accounts = await db.select().from(socialAccounts).where(eq(socialAccounts.isActive, true));
    const total = accounts.length;
    console.log(`[DailySync] Found ${total} active accounts to sync`);

    const results: SyncResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Process each account with per-account error isolation
    for (const account of accounts) {
      try {
        const result = await syncAccount({
          id: account.id,
          userId: account.userId,
          handle: account.handle,
          platform: account.platform,
          followers: account.followers,
          following: account.following,
          displayName: account.displayName,
        });
        results.push(result);
        if (result.status === "success") succeeded++;
        else if (result.status === "skipped" || result.status === "not_supported") skipped++;
        else failed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ id: account.id, handle: account.handle, platform: account.platform, status: "error", error: message });
        failed++;
      }

      // Small delay between accounts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update the log entry with results
    await db.update(syncJobLogs).set({
      completedAt,
      totalAccounts: total,
      succeeded,
      failed,
      skipped,
      durationMs,
      summary: results,
    }).where(eq(syncJobLogs.id, logId));

    console.log(`[DailySync] Completed in ${durationMs}ms — ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (total: ${total})`);

    // Notify owner with summary
    await notifyOwner({
      title: `[Growth Engine] Nightly sync complete`,
      content: `Daily account sync finished: ${succeeded}/${total} accounts updated successfully. ${failed} failed, ${skipped} skipped. Duration: ${Math.round(durationMs / 1000)}s.`,
    }).catch(() => {}); // Non-fatal

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[DailySync] Job aborted with error: ${message}`);
    const completedAt = new Date();
    await db.update(syncJobLogs).set({
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      error: message,
    }).where(eq(syncJobLogs.id, logId)).catch(() => {});
  }
}
