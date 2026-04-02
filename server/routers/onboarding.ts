/**
 * Onboarding Router
 *
 * Handles the 3-step onboarding wizard:
 * 1. Business profile (industry, platforms, goal, business name)
 * 2. LLM-generated campaign keywords + persona preview
 * 3. Auto-create campaign + trigger first discovery run + mark complete
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { users, campaigns, discoveredThreads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { discoverThreads } from "../engagementEngine";

const INDUSTRIES = [
  "Social Media Marketing", "Digital Marketing Agency", "E-commerce / Retail",
  "B2B SaaS / Software", "Consulting / Coaching", "Real Estate",
  "Finance / Fintech", "Health & Wellness", "Food & Beverage",
  "Travel & Hospitality", "Education / EdTech", "Legal Services",
  "Recruiting / HR", "Non-profit", "Creator / Influencer",
  "Fashion / Beauty", "Gaming / Entertainment", "Crypto / Web3",
  "Manufacturing / B2B", "Other",
] as const;

const GOALS = ["followers", "leads", "brand_awareness", "client_acquisition"] as const;
const PLATFORMS = ["twitter", "reddit", "linkedin", "instagram", "tiktok"] as const;

export const onboardingRouter = router({
  /** Check if the current user has completed onboarding */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const [user] = await db
      .select({
        onboardingCompleted: users.onboardingCompleted,
        onboardingData: users.onboardingData,
        referralCode: users.referralCode,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    return {
      completed: user?.onboardingCompleted ?? false,
      data: user?.onboardingData ?? null,
      referralCode: user?.referralCode ?? null,
    };
  }),

  /** Generate campaign keywords + persona from business profile using LLM */
  generateCampaignConfig: protectedProcedure
    .input(z.object({
      industry: z.string(),
      platforms: z.array(z.enum(PLATFORMS)).min(1),
      goal: z.enum(GOALS),
      businessName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const goalLabel = {
        followers: "grow followers and build an audience",
        leads: "generate qualified leads and drive inbound inquiries",
        brand_awareness: "increase brand visibility and thought leadership",
        client_acquisition: "find and convert potential clients",
      }[input.goal];

      const platformLabel = input.platforms.join(", ");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a social media growth strategist. Generate a campaign configuration for a business that wants to ${goalLabel} on ${platformLabel}. Return JSON only.`,
          },
          {
            role: "user",
            content: `Industry: ${input.industry}
Business name: ${input.businessName || "not provided"}
Goal: ${goalLabel}
Platforms: ${platformLabel}

Generate a campaign config with:
- campaignName: a specific, compelling campaign name (not generic)
- keywords: exactly 10 search keywords/phrases their ideal customers use when they have the pain this business solves (mix of short-tail and long-tail, platform-appropriate)
- persona: a 2-sentence AI engagement persona describing the tone and approach (professional, helpful, not salesy)
- description: one sentence describing what this campaign targets

Return valid JSON only, no markdown.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "campaign_config",
            strict: true,
            schema: {
              type: "object",
              properties: {
                campaignName: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                persona: { type: "string" },
                description: { type: "string" },
              },
              required: ["campaignName", "keywords", "persona", "description"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned empty response");

      const config = typeof content === "string" ? JSON.parse(content) : content;
      return config as {
        campaignName: string;
        keywords: string[];
        persona: string;
        description: string;
      };
    }),

  /** Complete onboarding: save profile, create campaign, trigger discovery, assign referral code */
  complete: protectedProcedure
    .input(z.object({
      industry: z.string(),
      platforms: z.array(z.enum(PLATFORMS)).min(1),
      goal: z.enum(GOALS),
      businessName: z.string().optional(),
      campaignName: z.string(),
      keywords: z.array(z.string()).min(1),
      persona: z.string(),
      description: z.string().optional(),
      runDiscovery: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');

      // Generate unique referral code for this user
      const referralCode = nanoid(8).toUpperCase();

      // Save onboarding data + mark complete + assign referral code
      await db
        .update(users)
        .set({
          onboardingCompleted: true,
          onboardingData: {
            industry: input.industry,
            platforms: input.platforms,
            goal: input.goal,
            businessName: input.businessName,
            completedAt: new Date().toISOString(),
          },
          referralCode,
        })
        .where(eq(users.id, ctx.user.id));

      // Create the first campaign
      const [result] = await (db as any)
        .insert(campaigns)
        .values({
          userId: ctx.user.id,
          name: input.campaignName,
          description: input.description ?? `Auto-created during onboarding for ${input.industry}`,
          keywords: input.keywords,
          platforms: input.platforms,
          persona: input.persona,
          playbook: "direct_negotiator",
          status: "active",
          targetEngagements: 50,
        });

      const campaignId = (result as { insertId: number }).insertId;

      // Trigger first discovery run (non-blocking, best-effort)
      let discoveredCount = 0;
      if (input.runDiscovery && campaignId) {
        try {
          const threads = await discoverThreads(
            input.keywords,
            input.platforms,
            input.industry,
            10,
          );
          discoveredCount = threads.length;
        } catch (err) {
          console.error("[Onboarding] Discovery run failed:", err);
          // Non-fatal — user can run discovery manually
        }
      }

      return {
        success: true,
        campaignId,
        referralCode,
        discoveredCount,
      };
    }),

  /** Skip onboarding without completing it */
  skip: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const referralCode = nanoid(8).toUpperCase();
    await db
      .update(users)
      .set({ onboardingCompleted: true, referralCode })
      .where(eq(users.id, ctx.user.id));
    return { success: true, referralCode };
  }),
});
