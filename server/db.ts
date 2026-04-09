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

// --- Users --------------------------------------------------------------------

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

// --- Social Accounts ----------------------------------------------------------

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

// --- Campaigns ----------------------------------------------------------------

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

// --- Discovered Threads -------------------------------------------------------

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

// --- Engagement Queue ---------------------------------------------------------

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

// --- Performance Metrics ------------------------------------------------------

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

// --- Notifications ------------------------------------------------------------

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

// --- Learning Outcomes --------------------------------------------------------

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

// --- Campaign Schedules -------------------------------------------------------

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

// --- Subscriptions ------------------------------------------------------------

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

// --- Team Members -------------------------------------------------------------
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

// --- Support Chat ------------------------------------------------------------

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

// --- Admin Queries -----------------------------------------------------------

export async function adminGetOverview() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { count, eq, gte } = await import("drizzle-orm");

  const now = new Date();
  const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers] = await db.select({ c: count() }).from(users);
  const [newUsers7d] = await db.select({ c: count() }).from(users).where(gte(users.createdAt, ago7));
  const [newUsers30d] = await db.select({ c: count() }).from(users).where(gte(users.createdAt, ago30));

  const allSubs = await db.select().from(subscriptions);
  const planCounts = { free: 0, pro: 0, agency: 0 };
  let activePaid = 0, canceledPaid = 0;
  for (const s of allSubs) {
    planCounts[s.plan as keyof typeof planCounts] = (planCounts[s.plan as keyof typeof planCounts] ?? 0) + 1;
    if (s.plan !== "free" && s.status === "active") activePaid++;
    if (s.plan !== "free" && s.status === "canceled") canceledPaid++;
  }
  const PLAN_PRICE = { free: 0, pro: 49, agency: 149 };
  const mrr = allSubs.filter(s => s.status === "active" && s.plan !== "free")
    .reduce((sum, s) => sum + (PLAN_PRICE[s.plan as keyof typeof PLAN_PRICE] ?? 0), 0);

  const [totalCampaigns] = await db.select({ c: count() }).from(campaigns);
  const [totalAccounts] = await db.select({ c: count() }).from(socialAccounts);
  const [totalEngagements] = await db.select({ c: count() }).from(engagementQueue);
  const [approvedEngagements] = await db.select({ c: count() }).from(engagementQueue).where(eq(engagementQueue.status, "approved"));

  return {
    totalUsers: totalUsers.c, newUsers7d: newUsers7d.c, newUsers30d: newUsers30d.c,
    activePaidSubs: activePaid, canceledPaidSubs: canceledPaid, planCounts,
    mrr, arr: mrr * 12,
    totalCampaigns: totalCampaigns.c, totalAccounts: totalAccounts.c,
    totalEngagements: totalEngagements.c, approvedEngagements: approvedEngagements.c,
  };
}

export async function adminGetUsers(page = 1, limit = 25, search = "") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { count, like, desc, or, inArray } = await import("drizzle-orm");

  const offset = (page - 1) * limit;
  const where = search ? or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)) : undefined;

  const rows = await db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const [total] = await db.select({ c: count() }).from(users).where(where);

  const userIds = rows.map(u => u.id);
  const subs = userIds.length ? await db.select().from(subscriptions).where(inArray(subscriptions.userId, userIds)) : [];
  const subMap = Object.fromEntries(subs.map(s => [s.userId, s]));

  const acctCounts = userIds.length
    ? await db.select({ userId: socialAccounts.userId, c: count() }).from(socialAccounts).where(inArray(socialAccounts.userId, userIds)).groupBy(socialAccounts.userId)
    : [];
  const acctMap = Object.fromEntries(acctCounts.map(a => [a.userId, a.c]));

  const campCounts = userIds.length
    ? await db.select({ userId: campaigns.userId, c: count() }).from(campaigns).where(inArray(campaigns.userId, userIds)).groupBy(campaigns.userId)
    : [];
  const campMap = Object.fromEntries(campCounts.map(c => [c.userId, c.c]));

  return {
    users: rows.map(u => ({ ...u, subscription: subMap[u.id] ?? null, accountCount: acctMap[u.id] ?? 0, campaignCount: campMap[u.id] ?? 0 })),
    total: total.c, page, pages: Math.ceil(total.c / limit),
  };
}

export async function adminGetUserDetail(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { eq, desc } = await import("drizzle-orm");

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  const accounts = await db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId));
  const userCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId));
  const queueItems = await db.select().from(engagementQueue).where(eq(engagementQueue.userId, userId));
  const supportSessions = await db.select().from(supportMessages).where(eq(supportMessages.userId, userId)).orderBy(desc(supportMessages.createdAt)).limit(20);

  return {
    user, subscription: sub ?? null, accounts, campaigns: userCampaigns,
    queueStats: {
      total: queueItems.length,
      pending: queueItems.filter(q => q.status === "pending").length,
      approved: queueItems.filter(q => q.status === "approved").length,
      rejected: queueItems.filter(q => q.status === "rejected").length,
    },
    supportSessions,
  };
}

export async function adminGetRevenueMetrics() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { gte, eq } = await import("drizzle-orm");
  const PLAN_PRICE = { free: 0, pro: 49, agency: 149 };

  const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSubs = await db.select().from(subscriptions).where(gte(subscriptions.createdAt, ago30));
  const dailyMap: Record<string, number> = {};
  for (const s of recentSubs) {
    if (s.plan === "free") continue;
    const day = s.createdAt.toISOString().slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (PLAN_PRICE[s.plan as keyof typeof PLAN_PRICE] ?? 0);
  }
  const dailyRevenue = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }));

  const allActive = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  const planDist = { free: 0, pro: 0, agency: 0 };
  for (const s of allActive) planDist[s.plan as keyof typeof planDist]++;

  const allSubs = await db.select().from(subscriptions);
  const topCustomers = await Promise.all(
    allSubs.filter(s => s.plan !== "free").map(async s => {
      const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, s.userId));
      const monthsActive = Math.max(1, Math.round((Date.now() - s.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      return { userId: s.userId, name: u?.name ?? "Unknown", email: u?.email ?? "", plan: s.plan, ltv: monthsActive * (PLAN_PRICE[s.plan as keyof typeof PLAN_PRICE] ?? 0), monthsActive };
    })
  );
  topCustomers.sort((a, b) => b.ltv - a.ltv);
  return { dailyRevenue, planDistribution: planDist, topCustomers: topCustomers.slice(0, 10) };
}

export async function adminGetSupportActivity(limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { desc, count, eq } = await import("drizzle-orm");

  const sessions = await db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt)).limit(limit * 5);
  const seen = new Set<string>();
  const unique: typeof sessions = [];
  for (const s of sessions) { if (!seen.has(s.sessionId)) { seen.add(s.sessionId); unique.push(s); } }

  return Promise.all(unique.slice(0, limit).map(async s => {
    const [msgCount] = await db.select({ c: count() }).from(supportMessages).where(eq(supportMessages.sessionId, s.sessionId));
    let userName: string | null = null, userEmail: string | null = null;
    if (s.userId) {
      const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, s.userId));
      userName = u?.name ?? null; userEmail = u?.email ?? null;
    }
    return { ...s, messageCount: msgCount.c, userName, userEmail };
  }));
}

export async function adminGetSystemHealth() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { count, eq } = await import("drizzle-orm");

  const [userCount] = await db.select({ c: count() }).from(users);
  const [subCount] = await db.select({ c: count() }).from(subscriptions);
  const [campaignCount] = await db.select({ c: count() }).from(campaigns);
  const [threadCount] = await db.select({ c: count() }).from(discoveredThreads);
  const [queueCount] = await db.select({ c: count() }).from(engagementQueue);
  const [pendingQueue] = await db.select({ c: count() }).from(engagementQueue).where(eq(engagementQueue.status, "pending"));
  const [accountCount] = await db.select({ c: count() }).from(socialAccounts);
  const [supportCount] = await db.select({ c: count() }).from(supportMessages);

  return {
    dbStatus: "healthy" as const,
    tables: {
      users: userCount.c, subscriptions: subCount.c, campaigns: campaignCount.c,
      threads: threadCount.c, queueTotal: queueCount.c, queuePending: pendingQueue.c,
      accounts: accountCount.c, supportMessages: supportCount.c,
    },
    timestamp: new Date(),
  };
}

export async function adminUpdateUserPlan(userId: number, plan: "free" | "pro" | "agency") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { eq } = await import("drizzle-orm");
  await db.update(subscriptions).set({ plan, status: "active", updatedAt: new Date() }).where(eq(subscriptions.userId, userId));
}

export async function getSubscriptionByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, stripeCustomerId)).limit(1);
  return result[0];
}

export async function downgradeToFree(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(subscriptions).set({
    plan: "free",
    status: "canceled",
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodEnd: null,
    updatedAt: new Date(),
  }).where(eq(subscriptions.userId, userId));
}

// --- Churn Reasons -----------------------------------------------------------
import { churnReasons, InsertChurnReason } from "../drizzle/schema";

export async function saveChurnReason(data: InsertChurnReason) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(churnReasons).values(data);
}

export async function getChurnReasonBreakdown() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ reason: churnReasons.reason, plan: churnReasons.plan })
    .from(churnReasons);
  // Aggregate counts by reason
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.reason] = (counts[row.reason] ?? 0) + 1;
  }
  return Object.entries(counts).map(([reason, count]) => ({ reason, count }));
}

export async function getChurnReasonsByPlan() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ reason: churnReasons.reason, plan: churnReasons.plan })
    .from(churnReasons);
  // Aggregate counts by plan + reason
  const map: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!map[row.plan]) map[row.plan] = {};
    map[row.plan][row.reason] = (map[row.plan][row.reason] ?? 0) + 1;
  }
  return map;
}
