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
  uniqueIndex,
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
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  onboardingData: json("onboardingData").$type<{
    industry?: string;
    platforms?: string[];
    goal?: string;
    businessName?: string;
    completedAt?: string;
  } | null>().default(null),
  referralCode: varchar("referralCode", { length: 16 }).unique(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Social media accounts
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "reddit", "linkedin", "instagram", "tiktok"]).notNull(),
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
  platform: mysqlEnum("platform", ["twitter", "reddit", "linkedin", "instagram", "tiktok"]).notNull(),
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
  editedContent: text("editedContent"),
  isEdited: boolean("isEdited").default(false).notNull(),
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
}, (table) => ({
  // Unique per user+account+date so daily sync can upsert safely
  uniqUserAccountDate: uniqueIndex("uniq_user_account_date").on(table.userId, table.accountId, table.date),
}));

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

// Team members (role & permission system)
export type TeamPermissions = {
  canEdit: boolean;       // can edit AI-generated comments
  canApprove: boolean;    // can approve comments
  canReject: boolean;     // can reject comments
  canDiscover: boolean;   // can trigger discovery runs
  canManageCampaigns: boolean; // can create/edit/delete campaigns
};

export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),           // the account owner who invited this member
  memberId: int("memberId").notNull(),          // the invited user's id
  memberEmail: varchar("memberEmail", { length: 320 }).notNull(),
  memberName: varchar("memberName", { length: 256 }),
  teamRole: mysqlEnum("teamRole", ["owner", "editor", "reviewer", "viewer"]).default("viewer").notNull(),
  permissions: json("permissions").$type<TeamPermissions>().notNull(),
  inviteToken: varchar("inviteToken", { length: 128 }),
  inviteAccepted: boolean("inviteAccepted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Support chat messages
export const supportMessages = mysqlTable("support_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),           // null for unauthenticated visitors
  sessionId: varchar("sessionId", { length: 128 }).notNull(), // client-generated UUID
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

// OAuth tokens for connected social accounts
export const oauthTokens = mysqlTable("oauth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "reddit", "linkedin", "instagram", "tiktok"]).notNull(),
  accessToken: text("accessToken").notNull(),       // encrypted
  refreshToken: text("refreshToken"),               // encrypted, nullable
  tokenType: varchar("tokenType", { length: 32 }).default("Bearer").notNull(),
  scope: text("scope"),
  expiresAt: timestamp("expiresAt"),                // null = non-expiring
  nangoConnectionId: varchar("nangoConnectionId", { length: 256 }),  // Nango connection ID for managed token refresh
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;

// Cancellation churn reasons
export const churnReasons = mysqlTable("churn_reasons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "agency"]).notNull(),
  reason: mysqlEnum("reason", ["too_expensive", "not_using", "missing_features", "other"]).notNull(),
  canceledAt: timestamp("canceledAt").defaultNow().notNull(),
});
export type ChurnReason = typeof churnReasons.$inferSelect;
export type InsertChurnReason = typeof churnReasons.$inferInsert;

// Referral program
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),          // user who shared the code
  referredUserId: int("referredUserId").notNull(),  // user who signed up via the code
  code: varchar("code", { length: 16 }).notNull(),  // the referral code used
  status: mysqlEnum("status", ["pending", "converted"]).default("pending").notNull(),
  creditedAt: timestamp("creditedAt"),              // when the referrer received credit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// Sync job logs — records each nightly account sync run
export const syncJobLogs = mysqlTable("sync_job_logs", {
  id: int("id").autoincrement().primaryKey(),
  jobType: varchar("jobType", { length: 64 }).notNull().default("daily_account_sync"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  totalAccounts: int("totalAccounts").notNull().default(0),
  succeeded: int("succeeded").notNull().default(0),
  failed: int("failed").notNull().default(0),
  skipped: int("skipped").notNull().default(0),
  durationMs: int("durationMs"),
  summary: json("summary").$type<Array<{id: number; handle: string; platform: string; status: string; error?: string}>>(),
  error: text("error"),
});
export type SyncJobLog = typeof syncJobLogs.$inferSelect;
export type InsertSyncJobLog = typeof syncJobLogs.$inferInsert;

// Instagram private API credentials (for instagrapi microservice)
// Stored encrypted; separate from OAuth tokens which are for the Graph API
export const instagramCredentials = mysqlTable("instagram_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull().unique(), // one credential set per account
  username: varchar("username", { length: 128 }).notNull(),
  encryptedPassword: text("encryptedPassword").notNull(), // AES-encrypted
  sessionData: text("sessionData"),               // cached instagrapi session JSON (encrypted)
  lastLoginAt: timestamp("lastLoginAt"),
  loginStatus: mysqlEnum("loginStatus", ["pending", "active", "failed", "requires_2fa"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstagramCredential = typeof instagramCredentials.$inferSelect;
export type InsertInstagramCredential = typeof instagramCredentials.$inferInsert;
