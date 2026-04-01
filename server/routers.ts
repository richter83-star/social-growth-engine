import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
  discoverThreads, generateEngagement, computeLearningInsights, generateSeedMetrics,
} from "./engagementEngine";
import { notifyOwner } from "./_core/notification";
import { registerSchedule, stopSchedule, triggerScheduleNow } from "./scheduler";
import {
  getSchedulesByUser, createSchedule, updateSchedule as updateScheduleDb, deleteSchedule,
  getSubscriptionByUserId, upsertSubscription, updateSubscription,
} from "./db";
import Stripe from "stripe";
import { PLAN_LIMITS, STRIPE_PRICES } from "./products";

// ─── Accounts Router ──────────────────────────────────────────────────────────
const accountsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getAccountsByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      platform: z.enum(["twitter", "reddit", "linkedin"]),
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
        followers: input.followers ?? Math.floor(Math.random() * 5000 + 100),
        following: input.following ?? Math.floor(Math.random() * 1000 + 50),
        engagementRate: parseFloat((Math.random() * 4 + 1).toFixed(2)),
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
});

// ─── Campaigns Router ─────────────────────────────────────────────────────────
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
      platforms: z.array(z.enum(["twitter", "reddit", "linkedin"])).min(1),
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

// ─── Discovery Router ─────────────────────────────────────────────────────────
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
          platform: t.platform as "twitter" | "reddit" | "linkedin",
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

// ─── Engagement Router ────────────────────────────────────────────────────────
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
    }))
    .mutation(async ({ ctx, input }) => {
      const extra: Record<string, unknown> = {};
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
      for (const id of input.ids) {
        await updateEngagementStatus(id, ctx.user.id, "approved");
      }
      return { approved: input.ids.length };
    }),
});

// ─── Analytics Router ─────────────────────────────────────────────────────────
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

  seedMetrics: protectedProcedure
    .mutation(async ({ ctx }) => {
      const existing = await getMetricsByUser(ctx.user.id, 1);
      if (existing.length > 0) return { seeded: false };
      const metrics = generateSeedMetrics(30);
      for (const m of metrics) {
        await upsertMetric({
          userId: ctx.user.id,
          date: m.date,
          followers: m.followers,
          followerDelta: m.followerDelta,
          engagementRate: m.engagementRate,
          impressions: m.impressions,
          engagementsCount: m.engagementsCount,
          threadsDiscovered: m.threadsDiscovered,
          commentsPosted: m.commentsPosted,
        });
      }
      return { seeded: true, days: metrics.length };
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

// ─── Notifications Router ─────────────────────────────────────────────────────
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

// ─── Schedules Router ────────────────────────────────────────────────────────
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
      await deleteSchedule(input.id, ctx.user.id);
      return { success: true };
    }),

  runNow: protectedProcedure
    .input(z.object({ id: z.number(), campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return triggerScheduleNow(input.id, input.campaignId, ctx.user.id);
    }),
});

// ─── Billing Router ───────────────────────────────────────────────────────────
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
        success_url: `${input.origin}/billing?success=1`,
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
});

// ─── App Router ───────────────────────────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;
