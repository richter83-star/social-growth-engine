import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { teamRouter } from "./routers/team";
import { onboardingRouter } from "./routers/onboarding";
import { campaignTemplatesRouter } from "./routers/campaignTemplates";
import { referralsRouter } from "./routers/referrals";
import { resolvePermissions } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  getAccountsByUser, createAccount, updateAccount, deleteAccount,
  getCampaignsByUser, getCampaignById, createCampaign, updateCampaign, deleteCampaign,
  getThreadsByCampaign, getRecentThreadsByUser, createThread, updateThread,
  getQueueByUser, createEngagement, updateEngagementStatus,
  getMetricsByUser, upsertMetric, getDashboardSummary,
  getNotificationsByUser, createNotification, markNotificationRead, markAllNotificationsRead,
  getLearningInsights, createLearningOutcome,
} from "./db";
import {
  discoverThreads, generateEngagement, computeLearningInsights,
} from "./engagementEngine";
import { callDataApi } from "./_core/dataApi";
import { notifyOwner } from "./_core/notification";
import {
  buildTwitterAuthUrl, buildLinkedInAuthUrl, buildInstagramAuthUrl,
  createOAuthState, generatePKCE,
  getOAuthToken, deleteOAuthToken, getOAuthStatusForAccounts,
  fetchTwitterMetricsWithToken, fetchLinkedInProfileWithToken, fetchInstagramMetricsWithToken,
  refreshTwitterToken,
} from "./socialOAuth";
import { registerSchedule, stopSchedule, triggerScheduleNow } from "./scheduler";
import { getInstagramAccountInfo, getInstagramPosts, getInstagramPostInsights } from "./instagramMcp";
import {
  getSchedulesByUser, createSchedule, updateSchedule as updateScheduleDb, deleteSchedule as deleteScheduleDb,
} from "./db";
import {
  getSubscriptionByUserId, upsertSubscription, updateSubscription,
  getSupportHistory, saveSupportMessage,
  adminGetOverview, adminGetUsers, adminGetUserDetail,
  adminGetRevenueMetrics, adminGetSupportActivity,
  adminGetSystemHealth, adminUpdateUserPlan,
  saveChurnReason, getChurnReasonBreakdown,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import Stripe from "stripe";
import { PLAN_LIMITS, STRIPE_PRICES } from "./products";

// --- Accounts Router ----------------------------------------------------------
const accountsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getAccountsByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      platform: z.enum(["twitter", "reddit", "linkedin", "instagram", "tiktok"]),
      handle: z.string().min(1).max(128),
      displayName: z.string().optional(),
      avatarUrl: z.string().optional(),
      followers: z.number().optional(),
      following: z.number().optional(),
    }))
    .mutation(({ ctx, input }) =>
      createAccount({
        userId: ctx.user.id,
        platform: input.platform,
        handle: input.handle,
        displayName: input.displayName ?? input.handle,
        avatarUrl: input.avatarUrl ?? null,
        followers: input.followers ?? 0,
        following: input.following ?? 0,
        engagementRate: 0,
        isActive: true,
        lastSynced: new Date(),
      })
    ),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      displayName: z.string().optional(),
      isActive: z.boolean().optional(),
      followers: z.number().optional(),
      engagementRate: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return updateAccount(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteAccount(input.id, ctx.user.id)),

  getOAuthStatus: protectedProcedure
    .input(z.object({ accountIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      return getOAuthStatusForAccounts(ctx.user.id, input.accountIds);
    }),

  getOAuthConnectUrl: protectedProcedure
    .input(z.object({
      accountId: z.number(),
      platform: z.enum(["twitter", "linkedin", "instagram"]),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await getAccountsByUser(ctx.user.id);
      const account = accounts.find(a => a.id === input.accountId);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });

      if (input.platform === "twitter") {
        const { verifier, challenge } = generatePKCE();
        const state = createOAuthState({
          verifier,
          accountId: input.accountId,
          userId: ctx.user.id,
          platform: "twitter",
          redirectOrigin: input.origin,
        });
        const redirectUri = `${input.origin}/api/oauth/twitter/callback`;
        const url = buildTwitterAuthUrl({ state, codeChallenge: challenge, redirectUri });
        return { url };
      } else if (input.platform === "linkedin") {
        const state = createOAuthState({
          accountId: input.accountId,
          userId: ctx.user.id,
          platform: "linkedin",
          redirectOrigin: input.origin,
        });
        const redirectUri = `${input.origin}/api/oauth/linkedin/callback`;
        const url = buildLinkedInAuthUrl({ state, redirectUri });
        return { url };
      } else if (input.platform === "instagram") {
        const state = createOAuthState({
          accountId: input.accountId,
          userId: ctx.user.id,
          platform: "instagram",
          redirectOrigin: input.origin,
        });
        const redirectUri = `${input.origin}/api/oauth/instagram/callback`;
        const url = buildInstagramAuthUrl({ state, redirectUri });
        return { url };
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported platform" });
    }),

  disconnectOAuth: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await getAccountsByUser(ctx.user.id);
      const account = accounts.find(a => a.id === input.accountId);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      await deleteOAuthToken(ctx.user.id, input.accountId);
      return { success: true };
    }),

  syncStats: protectedProcedure
    .input(z.object({
      id: z.number(),        // account id to sync; 0 = sync all accounts for this user
    }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await getAccountsByUser(ctx.user.id);
      const targets = input.id === 0
        ? accounts
        : accounts.filter(a => a.id === input.id);

      if (targets.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      const results: Array<{
        id: number;
        platform: string;
        handle: string;
        status: "success" | "quota_exceeded" | "not_supported" | "error";
        followers?: number;
        following?: number;
        displayName?: string;
        error?: string;
      }> = [];

      for (const account of targets) {
        try {
          if (account.platform === "twitter") {
            // Try OAuth token first for authenticated metrics
            const oauthToken = await getOAuthToken(ctx.user.id, account.id);
            if (oauthToken) {
              // Check if token needs refresh
              let accessToken = oauthToken.accessToken;
              if (oauthToken.expiresAt && oauthToken.expiresAt < new Date() && oauthToken.refreshToken) {
                try {
                  const refreshed = await refreshTwitterToken(oauthToken.refreshToken);
                  accessToken = refreshed.accessToken;
                  // Save refreshed token
                  await (await import("./socialOAuth")).saveOAuthToken(ctx.user.id, account.id, "twitter", {
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken,
                    expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
                    scope: oauthToken.scope,
                  });
                } catch { /* fall through to public API */ }
              }
              const twitterMetrics = await fetchTwitterMetricsWithToken(accessToken, account.handle);
              if (twitterMetrics) {
                await updateAccount(account.id, ctx.user.id, { followers: twitterMetrics.followers, following: twitterMetrics.following, lastSynced: new Date() });
                results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "success", followers: twitterMetrics.followers, following: twitterMetrics.following });
                continue;
              }
            }
            // Fallback: public API via Manus hub
            const raw = await callDataApi("Twitter/get_user_profile_by_username", {
              query: { username: account.handle.replace(/^@/, "") },
            }) as Record<string, unknown>;

            // Detect quota / rate-limit errors
            const msg = (raw?.message as string) ?? "";
            const code = (raw?.code as string) ?? "";
            if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded") || code === "failed_precondition") {
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "quota_exceeded", error: "Twitter API monthly quota exceeded" });
              continue;
            }

            // Navigate the nested response: result.data.user.result.legacy
            const userData = (raw as any)?.result?.data?.user?.result;
            const legacy = userData?.legacy ?? {};
            const core = userData?.core ?? {};
            const followers = typeof legacy.followers_count === "number" ? legacy.followers_count : undefined;
            const following = typeof legacy.friends_count === "number" ? legacy.friends_count : undefined;
            const displayName = core.name ?? legacy.name ?? undefined;

            if (followers !== undefined) {
              await updateAccount(account.id, ctx.user.id, {
                followers,
                following: following ?? account.following ?? 0,
                displayName: displayName ?? account.displayName ?? account.handle,
                lastSynced: new Date(),
              });
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "success", followers, following, displayName });
            } else {
              // Response came back but no follower data — possibly private or not found
              await updateAccount(account.id, ctx.user.id, { lastSynced: new Date() });
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "error", error: "Profile not found or private" });
            }

          } else if (account.platform === "linkedin") {
            // Try OAuth token first for verified display name
            const oauthToken = await getOAuthToken(ctx.user.id, account.id);
            if (oauthToken) {
              const profile = await fetchLinkedInProfileWithToken(oauthToken.accessToken);
              if (profile) {
                await updateAccount(account.id, ctx.user.id, {
                  displayName: profile.displayName,
                  lastSynced: new Date(),
                });
                results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "success", displayName: profile.displayName, error: "Follower count not available via LinkedIn API" });
                continue;
              }
            }
            // Fallback: public API
            const raw = await callDataApi("LinkedIn/get_user_profile_by_username", {
              query: { username: account.handle.replace(/^@/, "") },
            }) as Record<string, unknown>;

            if (raw?.success === false) {
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "error", error: (raw.message as string) ?? "Profile not accessible" });
              continue;
            }

            const firstName = (raw.firstName as string) ?? "";
            const lastName = (raw.lastName as string) ?? "";
            const displayName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

            await updateAccount(account.id, ctx.user.id, {
              displayName: displayName ?? account.displayName ?? account.handle,
              lastSynced: new Date(),
            });
            results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "success", displayName, error: "Follower count not available via LinkedIn API" });

          } else if (account.platform === "instagram") {
            // Instagram requires OAuth — no public API available
            const oauthToken = await getOAuthToken(ctx.user.id, account.id);
            if (!oauthToken) {
              await updateAccount(account.id, ctx.user.id, { lastSynced: new Date() });
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "not_supported", error: "Connect your Instagram account to sync metrics" });
              continue;
            }
            const igMetrics = await fetchInstagramMetricsWithToken(oauthToken.accessToken);
            if (!igMetrics) {
              results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "error", error: "Could not fetch Instagram metrics. Ensure account is a Professional (Business/Creator) account." });
              continue;
            }
            await updateAccount(account.id, ctx.user.id, { followers: igMetrics.followers, lastSynced: new Date() });
            results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "success", followers: igMetrics.followers });

          } else {
            // TikTok, Reddit — no API available
            await updateAccount(account.id, ctx.user.id, { lastSynced: new Date() });
            results.push({
              id: account.id,
              platform: account.platform,
              handle: account.handle,
              status: "not_supported",
              error: `${account.platform} sync not yet supported`,
            });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ id: account.id, platform: account.platform, handle: account.handle, status: "error", error: message });
        }
      }

      return results;
    }),
});

// --- Campaigns Router ---------------------------------------------------------
const campaignsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCampaignsByUser(ctx.user.id)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => getCampaignById(input.id, ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      description: z.string().optional(),
      keywords: z.array(z.string()).min(1),
      platforms: z.array(z.enum(["twitter", "reddit", "linkedin", "instagram", "tiktok"])).min(1),
      persona: z.string().min(10),
      playbook: z.enum(["3_day_warmup", "direct_negotiator"]).default("direct_negotiator"),
      targetEngagements: z.number().default(50),
    }))
    .mutation(async ({ ctx, input }) => {
      // Enforce plan limits on campaign count
      const sub = await getSubscriptionByUserId(ctx.user.id);
      const plan = (sub?.plan ?? "free") as keyof typeof PLAN_LIMITS;
      const limit = PLAN_LIMITS[plan].campaigns;
      if (limit !== -1) {
        const existing = await getCampaignsByUser(ctx.user.id);
        if (existing.length >= limit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `PLAN_LIMIT:campaigns:${plan}:${limit}`,
          });
        }
      }
      return createCampaign({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        keywords: input.keywords,
        platforms: input.platforms,
        persona: input.persona,
        playbook: input.playbook,
        targetEngagements: input.targetEngagements,
        status: "draft",
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      persona: z.string().optional(),
      status: z.enum(["draft", "active", "paused", "completed"]).optional(),
      targetEngagements: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (data.status === "active") updateData.startedAt = new Date();
      if (data.status === "completed") updateData.completedAt = new Date();
      await updateCampaign(id, ctx.user.id, updateData as Parameters<typeof updateCampaign>[2]);
      if (data.status === "completed") {
        const campaign = await getCampaignById(id, ctx.user.id);
        await createNotification({
          userId: ctx.user.id,
          type: "campaign_complete",
          title: `Campaign "${campaign?.name}" completed`,
          message: `Your campaign has finished running. Check analytics for results.`,
          isRead: false,
          metadata: { campaignId: id },
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteCampaign(input.id, ctx.user.id)),
});

// --- Discovery Router ---------------------------------------------------------
const discoveryRouter = router({
  getThreads: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(({ ctx, input }) => getThreadsByCampaign(input.campaignId, ctx.user.id)),

  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(({ ctx, input }) => getRecentThreadsByUser(ctx.user.id, input.limit)),

  runDiscovery: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new Error("Campaign not found");

      const threads = await discoverThreads(
        campaign.keywords as string[],
        campaign.platforms as string[],
        campaign.name,
        8
      );

      const saved = [];
      for (const t of threads) {
        const saved_thread = await createThread({
          campaignId: input.campaignId,
          userId: ctx.user.id,
          platform: t.platform as "twitter" | "reddit" | "linkedin" | "instagram" | "tiktok",
          threadUrl: t.url,
          threadTitle: t.title,
          threadContent: t.content,
          author: t.author,
          intentScore: t.intentScore,
          engagementPotential: t.engagementPotential,
          status: "new",
        });
        saved.push(saved_thread);

        // Notify on high-value threads
        if (t.intentScore > 0.85) {
          await createNotification({
            userId: ctx.user.id,
            type: "high_value_thread",
            title: `High-intent thread discovered on ${t.platform}`,
            message: `"${t.title}" — Intent score: ${(t.intentScore * 100).toFixed(0)}%`,
            isRead: false,
            metadata: { threadId: saved_thread?.id, campaignId: input.campaignId, platform: t.platform },
          });
        }
      }

      // Update campaign discovery count
      await updateCampaign(input.campaignId, ctx.user.id, {
        totalDiscovered: (campaign.totalDiscovered ?? 0) + threads.length,
      });

      return { discovered: threads.length, threads: saved };
    }),
});

// --- Engagement Router --------------------------------------------------------
const engagementRouter = router({
  getQueue: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(({ ctx, input }) => getQueueByUser(ctx.user.id, input.status)),

  generate: protectedProcedure
    .input(z.object({
      threadId: z.number(),
      campaignId: z.number(),
      accountId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const threads = await getRecentThreadsByUser(ctx.user.id, 100);
      const thread = threads.find((t) => t.id === input.threadId);
      if (!thread) throw new Error("Thread not found");

      const campaign = await getCampaignById(input.campaignId, ctx.user.id);
      if (!campaign) throw new Error("Campaign not found");

      // Get learning context
      const outcomes = await getLearningInsights(ctx.user.id);
      const learningContext = await computeLearningInsights(
        outcomes.map((o) => ({
          platform: o.platform,
          commentTone: o.commentTone ?? "helpful",
          successScore: o.successScore ?? 0,
          keywordMatch: o.keywordMatch ?? "",
        }))
      );

      const result = await generateEngagement(
        {
          title: thread.threadTitle,
          content: thread.threadContent ?? "",
          platform: thread.platform,
          author: thread.author ?? "unknown",
          keywords: campaign.keywords as string[],
        },
        campaign.persona,
        learningContext
      );

      const engagement = await createEngagement({
        threadId: input.threadId,
        campaignId: input.campaignId,
        userId: ctx.user.id,
        accountId: input.accountId ?? null,
        generatedComment: result.comment,
        commentTone: result.tone,
        confidenceScore: result.confidenceScore,
        aiReasoning: result.reasoning,
        status: "pending",
      });

      await updateThread(input.threadId, { status: "queued" });

      return engagement;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "posted"]),
      editedContent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // -- Permission guard --------------------------------------------------
      const perms = await resolvePermissions(ctx.user.id);
      if (input.editedContent !== undefined && !perms.canEdit) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to edit comments." });
      }
      if (input.status === "approved" && !perms.canApprove) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to approve comments." });
      }
      if (input.status === "rejected" && !perms.canReject) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to reject comments." });
      }
      // ---------------------------------------------------------------------
      const extra: Record<string, unknown> = {};
      // Persist edited content if provided
      if (input.editedContent !== undefined) {
        extra.editedContent = input.editedContent;
        extra.isEdited = true;
      }
      if (input.status === "posted") {
        extra.postedAt = new Date();
        extra.engagementResult = { likes: 0, replies: 0, impressions: 0 };

        // Create learning outcome
        const queue = await getQueueByUser(ctx.user.id);
        const item = queue.find((q) => q.id === input.id);
        if (item) {
          await createLearningOutcome({
            userId: ctx.user.id,
            engagementId: input.id,
            platform: "twitter",
            commentTone: item.commentTone ?? "helpful",
            keywordMatch: "",
            likes: 0,
            replies: 0,
            followersGained: 0,
            successScore: item.confidenceScore ?? 7,
          });
        }

        await createNotification({
          userId: ctx.user.id,
          type: "engagement_posted",
          title: "Engagement posted successfully",
          message: "Your AI-generated comment has been posted to the thread.",
          isRead: false,
          metadata: { engagementId: input.id },
        });
      }
      return updateEngagementStatus(input.id, ctx.user.id, input.status, extra as Parameters<typeof updateEngagementStatus>[3]);
    }),

  bulkApprove: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const perms = await resolvePermissions(ctx.user.id);
      if (!perms.canApprove) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to approve comments." });
      }
      for (const id of input.ids) {
        await updateEngagementStatus(id, ctx.user.id, "approved");
      }
      return { approved: input.ids.length };
    }),

  regenerate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Permission guard — regenerating is an edit-class action
      const perms = await resolvePermissions(ctx.user.id);
      if (!perms.canEdit) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to regenerate comments." });
      }
      // Load the existing queue item to get thread + campaign context
      const queue = await getQueueByUser(ctx.user.id);
      const item = queue.find((q) => q.id === input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Queue item not found." });
      const threads = await getRecentThreadsByUser(ctx.user.id, 200);
      const thread = threads.find((t) => t.id === item.threadId);
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      const campaign = await getCampaignById(item.campaignId, ctx.user.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      // Get learning context for better regeneration
      const outcomes = await getLearningInsights(ctx.user.id);
      const learningContext = await computeLearningInsights(
        outcomes.map((o) => ({
          platform: o.platform,
          commentTone: o.commentTone ?? "helpful",
          successScore: o.successScore ?? 0,
          keywordMatch: o.keywordMatch ?? "",
        }))
      );
      const result = await generateEngagement(
        {
          title: thread.threadTitle,
          content: thread.threadContent ?? "",
          platform: thread.platform,
          author: thread.author ?? "unknown",
          keywords: campaign.keywords as string[],
        },
        campaign.persona,
        learningContext
      );
      // Overwrite the existing queue item with the new draft, reset to pending
      await updateEngagementStatus(input.id, ctx.user.id, "pending", {
        generatedComment: result.comment,
        commentTone: result.tone,
        confidenceScore: result.confidenceScore,
        aiReasoning: result.reasoning,
        editedContent: null,
        isEdited: false,
      } as Parameters<typeof updateEngagementStatus>[3]);
      return { id: input.id, newComment: result.comment, tone: result.tone, confidenceScore: result.confidenceScore };
    }),
});

// --- Analytics Router ---------------------------------------------------------
const analyticsRouter = router({
  summary: protectedProcedure.query(({ ctx }) => getDashboardSummary(ctx.user.id)),

  metrics: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(({ ctx, input }) => getMetricsByUser(ctx.user.id, input.days)),

  roi: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const metrics = await getMetricsByUser(ctx.user.id, input.days);
      const totalFollowerGrowth = metrics.reduce((s, m) => s + (m.followerDelta ?? 0), 0);
      const totalComments = metrics.reduce((s, m) => s + (m.commentsPosted ?? 0), 0);
      const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
      // ROI = (follower growth * estimated value per follower) / estimated cost per comment
      const estimatedValuePerFollower = 2.5; // USD
      const estimatedCostPerComment = 0.05; // USD (AI generation cost)
      const revenue = totalFollowerGrowth * estimatedValuePerFollower;
      const cost = totalComments * estimatedCostPerComment;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
      return {
        totalFollowerGrowth,
        totalComments,
        totalImpressions,
        estimatedRevenue: parseFloat(revenue.toFixed(2)),
        estimatedCost: parseFloat(cost.toFixed(2)),
        roiPercent: parseFloat(roi.toFixed(1)),
      };
    }),

  learningInsights: protectedProcedure.query(async ({ ctx }) => {
    const outcomes = await getLearningInsights(ctx.user.id);
    const insight = await computeLearningInsights(
      outcomes.map((o) => ({
        platform: o.platform,
        commentTone: o.commentTone ?? "helpful",
        successScore: o.successScore ?? 0,
        keywordMatch: o.keywordMatch ?? "",
      }))
    );
    return { insight, totalOutcomes: outcomes.length, outcomes: outcomes.slice(0, 10) };
  }),
});

// --- Notifications Router -----------------------------------------------------
const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }))
    .query(({ ctx, input }) => getNotificationsByUser(ctx.user.id, input.limit)),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),

  markAllRead: protectedProcedure
    .mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
});

// --- Schedules Router --------------------------------------------------------
const schedulesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getSchedulesByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      name: z.string().min(1).max(256),
      cronExpression: z.string().min(1),
      timezone: z.string().default("UTC"),
    }))
    .mutation(async ({ ctx, input }) => {
      const parts = input.cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) throw new Error("Invalid cron expression: must have 5 fields (min hour dom mon dow)");
      const nextRunAt = new Date(Date.now() + 60 * 1000);
      const schedule = await createSchedule({
        userId: ctx.user.id,
        campaignId: input.campaignId,
        name: input.name,
        cronExpression: input.cronExpression,
        timezone: input.timezone,
        isActive: true,
        nextRunAt,
      });
      if (schedule) {
        registerSchedule({ id: schedule.id, campaignId: schedule.campaignId, userId: schedule.userId, cronExpression: schedule.cronExpression, isActive: schedule.isActive });
      }
      return schedule;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean().optional(),
      cronExpression: z.string().optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateScheduleDb(id, ctx.user.id, data);
      const schedules = await getSchedulesByUser(ctx.user.id);
      const updated = schedules.find((s) => s.id === id);
      if (updated) {
        if (updated.isActive) {
          registerSchedule({ id: updated.id, campaignId: updated.campaignId, userId: updated.userId, cronExpression: updated.cronExpression, isActive: updated.isActive });
        } else {
          stopSchedule(id);
        }
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      stopSchedule(input.id);
      await deleteScheduleDb(input.id, ctx.user.id);
      return { success: true };
    }),

  runNow: protectedProcedure
    .input(z.object({ id: z.number(), campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return triggerScheduleNow(input.id, input.campaignId, ctx.user.id);
    }),
});

// --- Billing Router -----------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-03-25.dahlia" });

const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getSubscriptionByUserId(ctx.user.id);
    return sub ?? { plan: "free" as const, status: "active" as const };
  }),

  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(["pro", "agency"]),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const priceId = STRIPE_PRICES[input.plan];
      if (!priceId || priceId.includes("placeholder")) throw new Error("Stripe price IDs not configured. Please set STRIPE_PRICE_PRO and STRIPE_PRICE_AGENCY in Settings.");
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email ?? undefined,
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${input.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=${input.plan}`,
        cancel_url: `${input.origin}/billing?canceled=1`,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          plan: input.plan,
        },
      });
      return { url: session.url };
    }),

  createPortal: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await getSubscriptionByUserId(ctx.user.id);
      if (!sub?.stripeCustomerId) throw new Error("No active subscription found");
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${input.origin}/billing`,
      });
      return { url: session.url };
    }),

  getPlanLimits: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getSubscriptionByUserId(ctx.user.id);
    const plan = (sub?.plan ?? "free") as keyof typeof PLAN_LIMITS;
    return { plan, limits: PLAN_LIMITS[plan] };
  }),

  cancelSubscription: protectedProcedure
    .input(z.object({
      reason: z.enum(["too_expensive", "not_using", "missing_features", "other"]).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const sub = await getSubscriptionByUserId(ctx.user.id);
      if (!sub?.stripeSubscriptionId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });
      }
      if (sub.cancelAtPeriodEnd) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription is already set to cancel" });
      }
      // Tell Stripe to cancel at end of current billing period (not immediately)
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      // Reflect in DB
      await updateSubscription(ctx.user.id, { cancelAtPeriodEnd: true });
      // Save churn reason if provided
      if (input?.reason) {
        await saveChurnReason({
          userId: ctx.user.id,
          plan: (sub.plan ?? "free") as "free" | "pro" | "agency",
          reason: input.reason,
        }).catch(() => {}); // non-fatal
      }
      return { success: true, cancelAtPeriodEnd: true, currentPeriodEnd: sub.currentPeriodEnd };
    }),

  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await getSubscriptionByUserId(ctx.user.id);
    if (!sub?.stripeSubscriptionId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });
    }
    if (!sub.cancelAtPeriodEnd) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription is not scheduled for cancellation" });
    }
    // Undo the cancel_at_period_end flag in Stripe
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await updateSubscription(ctx.user.id, { cancelAtPeriodEnd: false });
    return { success: true, cancelAtPeriodEnd: false };
  }),
});

// --- Support Chat Router -----------------------------------------------------------

/**
 * SALES MODE — for unauthenticated visitors
 * Acts as a consultative sales rep: qualifies leads, handles objections, drives trial signups.
 */
const SALES_SYSTEM_PROMPT = `You are a sharp, consultative sales advisor for Growth Engine — an AI-powered social media growth platform. Your job is to understand what the visitor is trying to achieve, recommend the right plan, handle objections, and guide them to start a free trial.

## Your Sales Approach
1. **Qualify first** — ask 1-2 questions to understand their situation before pitching. Key qualifiers: How many social accounts? Managing for themselves or clients? Which platforms? What's their growth goal?
2. **Recommend specifically** — based on their answers, recommend Free, Pro ($49/mo), or Agency ($149/mo) with a concrete reason why.
3. **Handle objections** — see objection playbook below.
4. **Close with a CTA** — always end with: "Want to start your free trial? It takes 2 minutes and no credit card required."

## Product (what it does)
Growth Engine finds high-intent conversations on Twitter/X, Reddit, LinkedIn, Instagram, and TikTok — people publicly expressing the exact pain your business solves. The AI drafts a contextually relevant reply for each thread. You review, edit if needed, and approve. That's it. No manual searching, no generic blasts.

## Pricing
- **Free** — 1 campaign, 50 threads/month, 1 account. No credit card. Great for testing.
- **Pro** ($49/mo) — 5 campaigns, unlimited threads, 5 accounts, priority support. Best for solo operators.
- **Agency** ($149/mo) — Unlimited everything, team collaboration, multi-client management. Best for agencies.

## Objection Playbook
- **"I already use Hootsuite/Buffer"** → Those are scheduling tools. Growth Engine finds NEW audiences who are already talking about your problem — it's demand capture, not content distribution. They're complementary.
- **"It's too expensive"** → Start free. Most users see ROI in week 1 from a single converted engagement. Pro pays for itself with one client or sale.
- **"I don't have time"** → That's exactly why this exists. Setup takes 5 minutes. The AI does the monitoring and drafting — you just approve or skip.
- **"Does it actually work?"** → It finds real conversations happening right now. The AI drafts replies that match your brand voice. You stay in control — nothing posts without your approval.
- **"I manage multiple clients"** → Agency plan is built for that. Unlimited accounts, team roles, and each client's campaigns are fully isolated.

## Tone
- Conversational, confident, never pushy. Ask questions. Listen. Recommend, don't pitch.
- Keep responses under 120 words. Be direct.
- Never make up features or prices not listed above.`;

/**
 * SUPPORT MODE — for authenticated users who need help
 */
const SUPPORT_SYSTEM_PROMPT = `You are a friendly, knowledgeable support agent for Growth Engine — an AI-powered social media growth platform. Your job is to help users understand the product, troubleshoot issues, and make the most of their subscription.

## Product Overview
Growth Engine automates social media growth by:
1. **Discovery** — AI scans Twitter/X, Reddit, LinkedIn, Instagram, and TikTok for high-intent conversations relevant to your keywords.
2. **Engagement Queue** — AI drafts context-aware comments for each discovered thread. Users review, edit, approve, or reject drafts before they go live.
3. **Campaigns** — Group keywords, platforms, and a persona (tone/style) into a campaign. Choose from playbooks: "3-Day Warmup" (gradual) or "Direct Negotiator" (assertive).
4. **Schedules** — Automate discovery runs on a cron schedule (e.g., every 6 hours).
5. **Analytics** — Track follower growth, engagement rate, impressions, and ROI over time.
6. **Team** — Invite team members with granular permissions (edit, approve, reject, discover, manage campaigns).

## Pricing Plans
- **Free**: 1 campaign, 50 threads/month, 1 social account. No credit card required.
- **Pro** ($49/month): 5 campaigns, unlimited threads, 5 social accounts, priority support.
- **Agency** ($149/month): Unlimited campaigns, unlimited threads, unlimited accounts, team collaboration, white-label ready.

## Common Questions
- **How do I connect a social account?** Go to Accounts → Add Account. Enter your handle and credentials.
- **How does Discovery work?** Start a campaign, click "Run Discovery". The AI scans platforms for threads matching your keywords and scores them by intent (0–1).
- **Can I edit AI comments before posting?** Yes — in the Engagement Queue, click Edit on any pending item to modify the draft before approving.
- **What is a persona?** A persona describes your brand voice (e.g., "Friendly SaaS founder who gives actionable advice"). The AI uses it to match your tone.
- **How do I cancel my subscription?** Go to Billing → Manage Subscription. You can cancel anytime; access continues until the period ends.
- **Is my data secure?** Yes — credentials are encrypted at rest, and we never post without your explicit approval.
- **What platforms are supported?** Twitter/X, Reddit, LinkedIn, Instagram, TikTok.
- **How do I upgrade?** Go to Billing and click Upgrade, or click the "Upgrade for more" button in the sidebar.

## Tone Guidelines
- Be concise, warm, and helpful. Use plain language.
- If you don't know the answer, say so honestly and suggest contacting support at support@growthengine.io.
- Never make up features or pricing that aren't listed above.
- Keep responses under 150 words unless the user asks for a detailed explanation.`;

const supportRouter = router({
  getHistory: publicProcedure
    .input(z.object({ sessionId: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      return getSupportHistory(input.sessionId);
    }),

  chat: publicProcedure
    .input(z.object({
      sessionId: z.string().min(1).max(128),
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(20).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? null;

      // Persist user message
      await saveSupportMessage({
        sessionId: input.sessionId,
        userId: userId ?? undefined,
        role: "user",
        content: input.message,
      });

      // Choose prompt based on auth status: sales for visitors, support for users
      const isAuthenticated = Boolean(userId);
      const systemPrompt = isAuthenticated ? SUPPORT_SYSTEM_PROMPT : SALES_SYSTEM_PROMPT;

      // Build message history for LLM
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...input.history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: input.message },
      ];

      const response = await invokeLLM({ messages });
      const rawContent = response.choices?.[0]?.message?.content;
      const reply = (typeof rawContent === "string" ? rawContent : null) ?? "I'm sorry, I couldn't process your request. Please try again.";

      // Persist assistant reply
      await saveSupportMessage({
        sessionId: input.sessionId,
        userId: userId ?? undefined,
        role: "assistant",
        content: reply,
      });

      return { reply };
    }),
});

// --- Admin Router -----------------------------------------------------------
const adminRouter = router({
  getOverview: adminProcedure.query(async () => adminGetOverview()),

  getUsers: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().min(1).max(100).default(25), search: z.string().default("") }))
    .query(async ({ input }) => adminGetUsers(input.page, input.limit, input.search)),

  getUserDetail: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => adminGetUserDetail(input.userId)),

  getRevenueMetrics: adminProcedure.query(async () => adminGetRevenueMetrics()),

  getSupportActivity: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => adminGetSupportActivity(input.limit)),

  getSystemHealth: adminProcedure.query(async () => adminGetSystemHealth()),

  updateUserPlan: adminProcedure
    .input(z.object({ userId: z.number(), plan: z.enum(["free", "pro", "agency"]) }))
    .mutation(async ({ input }) => {
      await adminUpdateUserPlan(input.userId, input.plan);
      return { success: true };
    }),

  getChurnReasons: adminProcedure.query(async () => getChurnReasonBreakdown()),

  getSyncJobLogs: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { syncJobLogs } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      return db.select().from(syncJobLogs).orderBy(desc(syncJobLogs.startedAt)).limit(input.limit);
    }),

  triggerSyncNow: adminProcedure.mutation(async () => {
    const { runDailyAccountSync } = await import("./jobs/dailyAccountSync");
    // Fire-and-forget so HTTP response returns immediately
    runDailyAccountSync().catch((err: unknown) => console.error("[Admin] Manual sync error:", err));
    return { triggered: true, message: "Sync job started — check logs in a few minutes" };
  }),
});

// --- Instagram MCP Router (owner's connected account) ----------------------
const instagramMcpRouter = router({
  accountInfo: protectedProcedure.query(async () => {
    return getInstagramAccountInfo();
  }),

  posts: protectedProcedure
    .input(z.object({ limit: z.number().min(5).max(20).default(10) }))
    .query(async ({ input }) => {
      return getInstagramPosts(input.limit);
    }),

  postInsights: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input }) => {
      return getInstagramPostInsights(input.postId);
    }),
});

// --- App Router -------------------------------------------------------------
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  accounts: accountsRouter,
  campaigns: campaignsRouter,
  discovery: discoveryRouter,
  engagement: engagementRouter,
  analytics: analyticsRouter,
  notifications: notificationsRouter,
  schedules: schedulesRouter,
  billing: billingRouter,
  team: teamRouter,
  support: supportRouter,
  admin: adminRouter,
  instagramMcp: instagramMcpRouter,
  onboarding: onboardingRouter,
  campaignTemplates: campaignTemplatesRouter,
  referrals: referralsRouter,
});

export type AppRouter = typeof appRouter;
