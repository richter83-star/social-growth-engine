import { invokeLLM } from "./_core/llm";

export interface ThreadContext {
  title: string;
  content: string;
  platform: string;
  author: string;
  keywords: string[];
}

export interface EngagementResult {
  comment: string;
  tone: string;
  confidenceScore: number;
  reasoning: string;
  intentScore: number;
  engagementPotential: number;
}

export interface DiscoveredThread {
  id: string;
  platform: string;
  url: string;
  title: string;
  content: string;
  author: string;
  intentScore: number;
  engagementPotential: number;
}

const PLATFORM_PERSONAS: Record<string, string> = {
  twitter: "conversational, punchy, max 280 chars, uses relevant hashtags sparingly",
  reddit: "detailed, adds genuine value, references the specific post, no self-promotion",
  linkedin: "professional, insightful, thought-leadership tone, 2-3 sentences",
  instagram: "friendly, visual-oriented, uses 2-3 relevant emojis naturally, short and engaging, 1-2 sentences",
  tiktok: "casual, energetic, trend-aware, uses popular phrases, short punchy comment under 150 chars",
};

// Simulate SocialMonitorService thread discovery with LLM-generated realistic data
export async function discoverThreads(
  keywords: string[],
  platforms: string[],
  niche: string,
  count = 8
): Promise<DiscoveredThread[]> {
  const keywordStr = keywords.join(", ");
  const platformStr = platforms.join(", ");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a social media intelligence system that discovers high-intent conversations. Generate realistic thread data that would be found when monitoring for specific keywords across social platforms. Return valid JSON only.`,
      },
      {
        role: "user",
        content: `Discover ${count} high-intent social media threads for a campaign targeting the "${niche}" niche.
Keywords to monitor: ${keywordStr}
Platforms: ${platformStr}

Generate realistic threads that show genuine purchase intent, pain points, or questions that our persona could add value to.
Return a JSON array with exactly ${count} objects, each having:
- id: unique string like "thread_1"
- platform: one of ${platformStr}
- url: realistic URL for that platform
- title: engaging thread title (for Reddit/LinkedIn) or tweet preview (for Twitter)
- content: 2-4 sentences of thread content showing the user's intent or question
- author: realistic username
- intentScore: float 0.6-0.99 (how likely this person needs our help)
- engagementPotential: float 0.5-0.99 (how much engagement our reply could get)`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "discovered_threads",
        strict: true,
        schema: {
          type: "object",
          properties: {
            threads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  platform: { type: "string" },
                  url: { type: "string" },
                  title: { type: "string" },
                  content: { type: "string" },
                  author: { type: "string" },
                  intentScore: { type: "number" },
                  engagementPotential: { type: "number" },
                },
                required: ["id", "platform", "url", "title", "content", "author", "intentScore", "engagementPotential"],
                additionalProperties: false,
              },
            },
          },
          required: ["threads"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    return parsed.threads || [];
  } catch {
    return [];
  }
}

// Generate context-aware, value-adding engagement comment
export async function generateEngagement(
  thread: ThreadContext,
  persona: string,
  learningContext?: string
): Promise<EngagementResult> {
  const platformStyle = PLATFORM_PERSONAS[thread.platform] || "professional and helpful";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert social media engagement specialist operating as a swarm agent. Your goal is to craft genuine, value-adding comments that grow social presence organically. You never spam or self-promote directly. You add real value to conversations.
        
Platform style guide for ${thread.platform}: ${platformStyle}
${learningContext ? `\nLearning insights from previous engagements: ${learningContext}` : ""}`,
      },
      {
        role: "user",
        content: `Generate an engagement comment for this thread:

Platform: ${thread.platform}
Thread Title: ${thread.title}
Thread Content: ${thread.content}
Original Author: ${thread.author}
Campaign Keywords: ${thread.keywords.join(", ")}

Our Engagement Persona: ${persona}

Requirements:
1. The comment must add GENUINE value to the conversation
2. Match the platform's communication style
3. Be contextually relevant to the specific thread
4. Subtly position our expertise without hard-selling
5. Encourage further conversation

Return JSON with:
- comment: the actual comment text
- tone: one of "helpful", "insightful", "empathetic", "educational", "conversational"
- confidenceScore: 0-10 (how confident you are this will perform well)
- reasoning: 1-2 sentences explaining why this comment will work`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "engagement_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            comment: { type: "string" },
            tone: { type: "string" },
            confidenceScore: { type: "number" },
            reasoning: { type: "string" },
          },
          required: ["comment", "tone", "confidenceScore", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    return {
      ...parsed,
      intentScore: 0.85,
      engagementPotential: parsed.confidenceScore / 10,
    };
  } catch {
    return {
      comment: "Great point! This is something many people overlook. Happy to share more insights if helpful.",
      tone: "helpful",
      confidenceScore: 7.0,
      reasoning: "Generic fallback comment",
      intentScore: 0.5,
      engagementPotential: 0.5,
    };
  }
}

// Compute learning insights from past outcomes
export async function computeLearningInsights(
  outcomes: Array<{ platform: string; commentTone: string; successScore: number; keywordMatch: string }>
): Promise<string> {
  if (outcomes.length === 0) return "";

  // Aggregate by tone
  const toneScores: Record<string, { total: number; count: number }> = {};
  const platformScores: Record<string, { total: number; count: number }> = {};

  for (const o of outcomes) {
    if (!toneScores[o.commentTone]) toneScores[o.commentTone] = { total: 0, count: 0 };
    toneScores[o.commentTone].total += o.successScore;
    toneScores[o.commentTone].count += 1;

    if (!platformScores[o.platform]) platformScores[o.platform] = { total: 0, count: 0 };
    platformScores[o.platform].total += o.successScore;
    platformScores[o.platform].count += 1;
  }

  const bestTone = Object.entries(toneScores)
    .map(([tone, s]) => ({ tone, avg: s.total / s.count }))
    .sort((a, b) => b.avg - a.avg)[0];

  const bestPlatform = Object.entries(platformScores)
    .map(([platform, s]) => ({ platform, avg: s.total / s.count }))
    .sort((a, b) => b.avg - a.avg)[0];

  return `Best performing tone: ${bestTone?.tone ?? "helpful"} (avg score: ${bestTone?.avg.toFixed(1) ?? "N/A"}). Best platform: ${bestPlatform?.platform ?? "reddit"}. Use these patterns to maximize engagement.`;
}

// Generate seed performance metrics for demo purposes
export function generateSeedMetrics(days: number) {
  const metrics = [];
  const today = new Date();
  let followers = 1200 + Math.floor(Math.random() * 500);

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const delta = Math.floor(Math.random() * 25) - 3;
    followers += delta;
    metrics.push({
      date: dateStr,
      followers: Math.max(followers, 0),
      followerDelta: delta,
      engagementRate: parseFloat((Math.random() * 4 + 1.5).toFixed(2)),
      impressions: Math.floor(Math.random() * 5000 + 500),
      engagementsCount: Math.floor(Math.random() * 120 + 10),
      threadsDiscovered: Math.floor(Math.random() * 15),
      commentsPosted: Math.floor(Math.random() * 8),
    });
  }
  return metrics;
}
