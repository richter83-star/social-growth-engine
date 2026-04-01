import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Social media accounts
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "reddit", "linkedin"]).notNull(),
  handle: varchar("handle", { length: 128 }).notNull(),
  displayName: varchar("displayName", { length: 256 }),
  avatarUrl: text("avatarUrl"),
  encryptedCredentials: text("encryptedCredentials"), // JSON encrypted blob
  followers: int("followers").default(0),
  following: int("following").default(0),
  engagementRate: float("engagementRate").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  lastSynced: timestamp("lastSynced"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

// Campaigns
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  keywords: json("keywords").$type<string[]>().notNull(),
  platforms: json("platforms").$type<string[]>().notNull(),
  persona: text("persona").notNull(), // AI persona/tone description
  playbook: mysqlEnum("playbook", ["3_day_warmup", "direct_negotiator"]).default("direct_negotiator").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  targetEngagements: int("targetEngagements").default(50),
  totalDiscovered: int("totalDiscovered").default(0),
  totalEngaged: int("totalEngaged").default(0),
  totalApproved: int("totalApproved").default(0),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Discovered threads
export const discoveredThreads = mysqlTable("discovered_threads", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "reddit", "linkedin"]).notNull(),
  threadUrl: text("threadUrl").notNull(),
  threadTitle: text("threadTitle").notNull(),
  threadContent: text("threadContent"),
  author: varchar("author", { length: 256 }),
  intentScore: float("intentScore").default(0), // 0-1 intent score
  engagementPotential: float("engagementPotential").default(0),
  status: mysqlEnum("status", ["new", "queued", "engaged", "skipped"]).default("new").notNull(),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiscoveredThread = typeof discoveredThreads.$inferSelect;
export type InsertDiscoveredThread = typeof discoveredThreads.$inferInsert;

// Engagement queue
export const engagementQueue = mysqlTable("engagement_queue", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  accountId: int("accountId"),
  generatedComment: text("generatedComment").notNull(),
  commentTone: varchar("commentTone", { length: 64 }),
  confidenceScore: float("confidenceScore").default(0), // 0-10
  status: mysqlEnum("status", ["pending", "approved", "rejected", "posted", "failed"]).default("pending").notNull(),
  aiReasoning: text("aiReasoning"),
  postedAt: timestamp("postedAt"),
  engagementResult: json("engagementResult").$type<{likes?: number; replies?: number; impressions?: number}>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EngagementQueue = typeof engagementQueue.$inferSelect;
export type InsertEngagementQueue = typeof engagementQueue.$inferInsert;

// Daily performance snapshots
export const performanceMetrics = mysqlTable("performance_metrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId"),
  campaignId: int("campaignId"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  followers: int("followers").default(0),
  followerDelta: int("followerDelta").default(0),
  engagementRate: float("engagementRate").default(0),
  impressions: int("impressions").default(0),
  engagementsCount: int("engagementsCount").default(0),
  threadsDiscovered: int("threadsDiscovered").default(0),
  commentsPosted: int("commentsPosted").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = typeof performanceMetrics.$inferInsert;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["high_value_thread", "campaign_complete", "engagement_posted", "system"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Learning outcomes (for online learning loop)
export const learningOutcomes = mysqlTable("learning_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  engagementId: int("engagementId").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  commentTone: varchar("commentTone", { length: 64 }),
  keywordMatch: varchar("keywordMatch", { length: 256 }),
  likes: int("likes").default(0),
  replies: int("replies").default(0),
  followersGained: int("followersGained").default(0),
  successScore: float("successScore").default(0), // computed 0-10
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LearningOutcome = typeof learningOutcomes.$inferSelect;
export type InsertLearningOutcome = typeof learningOutcomes.$inferInsert;

// Campaign schedules
export const campaignSchedules = mysqlTable("campaign_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  cronExpression: varchar("cronExpression", { length: 128 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  runCount: int("runCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignSchedule = typeof campaignSchedules.$inferSelect;
export type InsertCampaignSchedule = typeof campaignSchedules.$inferInsert;

// User subscriptions (Stripe)
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  plan: mysqlEnum("plan", ["free", "pro", "agency"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("active").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
