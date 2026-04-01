/**
 * Campaign Scheduler Engine
 * Uses node-cron to run discovery jobs on user-defined schedules.
 * Bootstrapped once at server startup via initScheduler().
 */
import * as cron from "node-cron";
import {
  getActiveSchedules,
  updateSchedule,
  getCampaignById,
  createNotification,
} from "./db";
import { discoverThreads, generateEngagement } from "./engagementEngine";
import { createThread, updateCampaign, createEngagement, getThreadsByCampaign } from "./db";
import { notifyOwner } from "./_core/notification";

// Map of scheduleId → cron task, so we can start/stop individual schedules
const activeTasks = new Map<number, ReturnType<typeof cron.schedule>>();

/**
 * Compute the next run time for a cron expression (approximate, next minute boundary)
 */
function computeNextRun(cronExpr: string): Date | null {
  try {
    // node-cron doesn't expose next-run natively; approximate with +1 min scan
    const now = new Date();
    for (let i = 1; i <= 1440; i++) {
      const candidate = new Date(now.getTime() + i * 60 * 1000);
      // Use cron.validate to check expression validity only
      if (cron.validate(cronExpr)) {
        // Return approximate next run (1 min from now for simplicity)
        return new Date(now.getTime() + 60 * 1000);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Run a single scheduled discovery job for a given schedule record.
 * This is the core autonomous loop: discover → optionally auto-generate comments.
 */
async function runScheduledDiscovery(scheduleId: number, campaignId: number, userId: number) {
  console.log(`[Scheduler] Running scheduled discovery for schedule=${scheduleId} campaign=${campaignId}`);
  try {
    // Fetch campaign (we need keywords, platforms, persona)
    const campaign = await getCampaignById(campaignId, userId);
    if (!campaign || campaign.status !== "active") {
      console.log(`[Scheduler] Campaign ${campaignId} is not active, skipping.`);
      return { discovered: 0, skipped: true };
    }

    // Run discovery
    const threads = await discoverThreads(
      campaign.keywords as string[],
      campaign.platforms as string[],
      campaign.name,
      8
    );

    // Persist threads
    let savedCount = 0;
    for (const t of threads) {
      try {
        await createThread({
          campaignId,
          userId,
          platform: t.platform as "twitter" | "reddit" | "linkedin",
          threadUrl: t.url,
          threadTitle: t.title,
          threadContent: t.content,
          author: t.author,
          intentScore: t.intentScore,
          engagementPotential: t.engagementPotential,
          status: "new",
        });
        savedCount++;
      } catch {
        // Duplicate thread — skip
      }
    }

    // Update campaign stats
    await updateCampaign(campaignId, userId, {
      totalDiscovered: (campaign.totalDiscovered ?? 0) + savedCount,
    });

    // Update schedule metadata
    const nextRun = computeNextRun("* * * * *"); // placeholder
    await updateSchedule(scheduleId, userId, {
      lastRunAt: new Date(),
      nextRunAt: nextRun ?? undefined,
    });

    // Create in-app notification
    if (savedCount > 0) {
      await createNotification({
        userId,
        type: "high_value_thread",
        title: `Scheduled run found ${savedCount} new threads`,
        message: `Campaign "${campaign.name}" discovered ${savedCount} high-intent conversations in the latest scheduled scan.`,
        metadata: { campaignId, scheduleId, discovered: savedCount },
      });

      // Notify owner via platform notification
      await notifyOwner({
        title: `[Growth Engine] ${savedCount} new threads discovered`,
        content: `Scheduled discovery for campaign "${campaign.name}" found ${savedCount} new threads.`,
      });
    }

    console.log(`[Scheduler] Schedule ${scheduleId} completed: ${savedCount} threads saved.`);
    return { discovered: savedCount };
  } catch (err) {
    console.error(`[Scheduler] Error running schedule ${scheduleId}:`, err);
    return { discovered: 0, error: String(err) };
  }
}

/**
 * Register a single schedule with node-cron.
 */
export function registerSchedule(schedule: {
  id: number;
  campaignId: number;
  userId: number;
  cronExpression: string;
  isActive: boolean;
}) {
  // Remove existing task if any
  stopSchedule(schedule.id);

  if (!schedule.isActive) return;

  if (!cron.validate(schedule.cronExpression)) {
    console.warn(`[Scheduler] Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExpression}`);
    return;
  }

  const task = cron.schedule(schedule.cronExpression, async () => {
    await runScheduledDiscovery(schedule.id, schedule.campaignId, schedule.userId);
  });

  activeTasks.set(schedule.id, task);
  console.log(`[Scheduler] Registered schedule ${schedule.id} with cron: ${schedule.cronExpression}`);
}

/**
 * Stop and remove a schedule from the cron runner.
 */
export function stopSchedule(scheduleId: number) {
  const existing = activeTasks.get(scheduleId);
  if (existing) {
    existing.stop();
    activeTasks.delete(scheduleId);
    console.log(`[Scheduler] Stopped schedule ${scheduleId}`);
  }
}

/**
 * Bootstrap: load all active schedules from DB and register them.
 * Called once at server startup.
 */
export async function initScheduler() {
  console.log("[Scheduler] Initializing...");
  try {
    const schedules = await getActiveSchedules();
    for (const s of schedules) {
      registerSchedule({
        id: s.id,
        campaignId: s.campaignId,
        userId: s.userId,
        cronExpression: s.cronExpression,
        isActive: s.isActive,
      });
    }
    console.log(`[Scheduler] Initialized with ${schedules.length} active schedules.`);
  } catch (err) {
    console.error("[Scheduler] Failed to initialize:", err);
  }
}

/**
 * Manually trigger a schedule run (used by the tRPC router for "Run Now" button).
 */
export async function triggerScheduleNow(scheduleId: number, campaignId: number, userId: number) {
  return runScheduledDiscovery(scheduleId, campaignId, userId);
}
