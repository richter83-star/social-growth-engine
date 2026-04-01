import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  socialAccounts, InsertSocialAccount,
  campaigns, InsertCampaign,
  discoveredThreads, InsertDiscoveredThread,
  engagementQueue, InsertEngagementQueue,
  performanceMetrics, InsertPerformanceMetric,
  notifications, InsertNotification,
  learningOutcomes, InsertLearningOutcome,
  campaignSchedules, InsertCampaignSchedule,
  subscriptions, InsertSubscription,
  supportMessages, InsertSupportMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Social Accounts ──────────────────────────────────────────────────────────

export async function getAccountsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId)).orderBy(desc(socialAccounts.createdAt));
}

export async function createAccount(data: InsertSocialAccount) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(socialAccounts).values(data);
  const result = await db.select().from(socialAccounts)
    .where(and(eq(socialAccounts.userId, data.userId), eq(socialAccounts.handle, data.handle)))
    .limit(1);
  return result[0];
}

export async function updateAccount(id: number, userId: number, data: Partial<InsertSocialAccount>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(socialAccounts).set(data).where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
}

export async function deleteAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(socialAccounts).where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaignsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).limit(1);
  return result[0];
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(campaigns).values(data);
  const result = await db.select().from(campaigns)
    .where(and(eq(campaigns.userId, data.userId), eq(campaigns.name, data.name)))
    .orderBy(desc(campaigns.createdAt)).limit(1);
  return result[0];
}

export async function updateCampaign(id: number, userId: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function deleteCampaign(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

// ─── Discovered Threads ───────────────────────────────────────────────────────

export async function getThreadsByCampaign(campaignId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discoveredThreads)
    .where(and(eq(discoveredThreads.campaignId, campaignId), eq(discoveredThreads.userId, userId)))
    .orderBy(desc(discoveredThreads.intentScore));
}

export async function getRecentThreadsByUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discoveredThreads)
    .where(eq(discoveredThreads.userId, userId))
    .orderBy(desc(discoveredThreads.discoveredAt))
    .limit(limit);
}

export async function createThread(data: InsertDiscoveredThread) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(discoveredThreads).values(data);
  const result = await db.select().from(discoveredThreads)
    .where(and(eq(discoveredThreads.campaignId, data.campaignId), eq(discoveredThreads.threadUrl, data.threadUrl)))
    .limit(1);
  return result[0];
}

export async function updateThread(id: number, data: Partial<InsertDiscoveredThread>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(discoveredThreads).set(data).where(eq(discoveredThreads.id, id));
}

// ─── Engagement Queue ─────────────────────────────────────────────────────────

export async function getQueueByUser(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(engagementQueue.userId, userId)];
  if (status) conditions.push(eq(engagementQueue.status, status as "pending" | "approved" | "rejected" | "posted" | "failed"));
  return db.select().from(engagementQueue).where(and(...conditions)).orderBy(desc(engagementQueue.createdAt));
}

export async function createEngagement(data: InsertEngagementQueue) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(engagementQueue).values(data);
  const result = await db.select().from(engagementQueue)
    .where(and(eq(engagementQueue.threadId, data.threadId), eq(engagementQueue.userId, data.userId)))
    .orderBy(desc(engagementQueue.createdAt)).limit(1);
  return result[0];
}

export async function updateEngagementStatus(id: number, userId: number, status: "pending" | "approved" | "rejected" | "posted" | "failed", extra?: Partial<InsertEngagementQueue>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(engagementQueue).set({ status, ...extra }).where(and(eq(engagementQueue.id, id), eq(engagementQueue.userId, userId)));
}

// ─── Performance Metrics ──────────────────────────────────────────────────────

export async function getMetricsByUser(userId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(performanceMetrics)
    .where(eq(performanceMetrics.userId, userId))
    .orderBy(desc(performanceMetrics.date))
    .limit(days);
}

export async function upsertMetric(data: InsertPerformanceMetric) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(performanceMetrics).values(data).onDuplicateKeyUpdate({ set: data });
}

export async function getDashboardSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [accountCount] = await db.select({ count: sql<number>`count(*)` }).from(socialAccounts).where(eq(socialAccounts.userId, userId));
  const [campaignCount] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));
  const [threadCount] = await db.select({ count: sql<number>`count(*)` }).from(discoveredThreads).where(eq(discoveredThreads.userId, userId));
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(engagementQueue).where(and(eq(engagementQueue.userId, userId), eq(engagementQueue.status, "pending")));
  const [postedCount] = await db.select({ count: sql<number>`count(*)` }).from(engagementQueue).where(and(eq(engagementQueue.userId, userId), eq(engagementQueue.status, "posted")));
  return {
    accounts: Number(accountCount?.count ?? 0),
    activeCampaigns: Number(campaignCount?.count ?? 0),
    threadsDiscovered: Number(threadCount?.count ?? 0),
    pendingApprovals: Number(pendingCount?.count ?? 0),
    totalPosted: Number(postedCount?.count ?? 0),
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotificationsByUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ─── Learning Outcomes ────────────────────────────────────────────────────────

export async function getLearningInsights(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learningOutcomes).where(eq(learningOutcomes.userId, userId)).orderBy(desc(learningOutcomes.createdAt)).limit(100);
}

export async function createLearningOutcome(data: InsertLearningOutcome) {
  const db = await getDb();
  if (!db) return;
  await db.insert(learningOutcomes).values(data);
}

// ─── Campaign Schedules ───────────────────────────────────────────────────────

export async function getSchedulesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignSchedules).where(eq(campaignSchedules.userId, userId)).orderBy(desc(campaignSchedules.createdAt));
}

export async function getScheduleById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaignSchedules).where(and(eq(campaignSchedules.id, id), eq(campaignSchedules.userId, userId))).limit(1);
  return result[0];
}

export async function getActiveSchedules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignSchedules).where(eq(campaignSchedules.isActive, true));
}

export async function createSchedule(data: InsertCampaignSchedule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(campaignSchedules).values(data);
  const result = await db.select().from(campaignSchedules)
    .where(and(eq(campaignSchedules.userId, data.userId), eq(campaignSchedules.campaignId, data.campaignId)))
    .orderBy(desc(campaignSchedules.createdAt)).limit(1);
  return result[0];
}

export async function updateSchedule(id: number, userId: number, data: Partial<InsertCampaignSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(campaignSchedules).set(data).where(and(eq(campaignSchedules.id, id), eq(campaignSchedules.userId, userId)));
}

export async function deleteSchedule(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(campaignSchedules).where(and(eq(campaignSchedules.id, id), eq(campaignSchedules.userId, userId)));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0];
}

export async function upsertSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(subscriptions).values(data).onDuplicateKeyUpdate({ set: data });
}

export async function updateSubscription(userId: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(subscriptions).set(data).where(eq(subscriptions.userId, userId));
}

// ─── Team Members ─────────────────────────────────────────────────────────────
import { teamMembers, InsertTeamMember, TeamPermissions } from "../drizzle/schema";

export const DEFAULT_PERMISSIONS: Record<string, TeamPermissions> = {
  owner:    { canEdit: true,  canApprove: true,  canReject: true,  canDiscover: true,  canManageCampaigns: true },
  editor:   { canEdit: true,  canApprove: false, canReject: false, canDiscover: true,  canManageCampaigns: false },
  reviewer: { canEdit: false, canApprove: true,  canReject: true,  canDiscover: false, canManageCampaigns: false },
  viewer:   { canEdit: false, canApprove: false, canReject: false, canDiscover: false, canManageCampaigns: false },
};

export async function getTeamMembersByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMembers).where(eq(teamMembers.ownerId, ownerId));
}

export async function getTeamMemberRecord(ownerId: number, memberId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.memberId, memberId)))
    .limit(1);
  return result[0];
}

/** Returns the team member record where this user is a member of someone else's team */
export async function getMyTeamMembership(memberId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.memberId, memberId), eq(teamMembers.inviteAccepted, true)))
    .limit(1);
  return result[0];
}

export async function upsertTeamMember(data: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(teamMembers).values(data).onDuplicateKeyUpdate({ set: { teamRole: data.teamRole, permissions: data.permissions, updatedAt: new Date() } });
}

export async function updateTeamMember(id: number, ownerId: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(teamMembers).set({ ...data, updatedAt: new Date() })
    .where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, ownerId)));
}

export async function deleteTeamMember(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(teamMembers).where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, ownerId)));
}

export async function acceptTeamInvite(token: string, memberId: number, memberName: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(teamMembers).set({ inviteAccepted: true, memberId, memberName, updatedAt: new Date() })
    .where(eq(teamMembers.inviteToken, token));
}

// ─── Support Chat ────────────────────────────────────────────────────────────

export async function getSupportHistory(sessionId: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(supportMessages)
    .where((await import("drizzle-orm")).eq(supportMessages.sessionId, sessionId))
    .orderBy(desc(supportMessages.createdAt))
    .limit(limit);
  return rows.reverse(); // oldest first
}

export async function saveSupportMessage(data: InsertSupportMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(supportMessages).values(data);
}

/** Resolve effective permissions for a user.
 *  - If the user is the owner of their own data, they get full owner permissions.
 *  - If the user is a team member of another owner, return their assigned permissions.
 *  - Otherwise return owner-level permissions (solo user). */
export async function resolvePermissions(userId: number): Promise<TeamPermissions & { teamRole: string; ownerId: number }> {
  // Check if this user is a member of someone else's team
  const membership = await getMyTeamMembership(userId);
  if (membership) {
    return { ...membership.permissions, teamRole: membership.teamRole, ownerId: membership.ownerId };
  }
  // Solo user or owner — full permissions
  return { ...DEFAULT_PERMISSIONS.owner, teamRole: "owner", ownerId: userId };
}
