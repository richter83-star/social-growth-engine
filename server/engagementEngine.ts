import { invokeLLM } from "./_core/llm";
import { getOAuthTokenByPlatform } from "./socialOAuth";

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

// Score a thread's intent and engagement potential using keyword matching + heuristics
function scoreThread(title: string, content: string, keywords: string[]): { intentScore: number; engagementPotential: number } {
  const text = `${title} ${content}`.toLowerCase();
  const keywordMatches = keywords.filter(k => text.includes(k.toLowerCase())).length;
  const keywordRatio = Math.min(keywordMatches / Math.max(keywords.length, 1), 1);

  // Intent signals: questions, pain points, requests for help
  const intentSignals = ["how do i", "how to", "help", "struggling", "need advice", "recommend", "best way", "tips", "strategy", "grow", "increase", "improve", "?"];
  const intentMatches = intentSignals.filter(s => text.includes(s)).length;

  const intentScore = Math.min(0.55 + keywordRatio * 0.25 + Math.min(intentMatches * 0.04, 0.2), 0.99);
  const engagementPotential = Math.min(0.5 + keywordRatio * 0.3 + Math.min(intentMatches * 0.03, 0.2), 0.99);

  return { intentScore, engagementPotential };
}

// Fetch real Reddit threads via the public JSON API (no auth required)
async function discoverRedditThreads(keywords: string[], count: number): Promise<DiscoveredThread[]> {
  const query = keywords.slice(0, 3).join(" ");
  const subreddits = "socialmedia+marketing+entrepreneur+smallbusiness+startups+growthhacking";

  try {
    const url = `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${Math.min(count * 2, 25)}&restrict_sr=true&t=month`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SocialGrowthEngine/1.0 (by /u/socialgrowthbot)" },
    });

    if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);

    const data = await res.json() as { data: { children: Array<{ data: Record<string, unknown> }> } };
    const posts = data?.data?.children ?? [];

    const threads: DiscoveredThread[] = posts
      .filter((p) => {
        const d = p.data;
        return d.title && d.author && !String(d.author).includes("[deleted]");
      })
      .slice(0, count)
      .map((p) => {
        const d = p.data;
        const title = String(d.title ?? "");
        const selftext = String(d.selftext ?? "").slice(0, 300);
        const content = selftext || `Posted in r/${String(d.subreddit ?? "reddit")} — ${String(d.num_comments ?? 0)} comments, score: ${String(d.score ?? 0)}`;
        const { intentScore, engagementPotential } = scoreThread(title, content, keywords);

        return {
          id: `reddit_${String(d.id ?? Math.random().toString(36).slice(2))}`,
          platform: "reddit",
          url: `https://reddit.com${String(d.permalink ?? "")}`,
          title,
          content,
          author: String(d.author ?? "unknown"),
          intentScore,
          engagementPotential,
        };
      });

    return threads;
  } catch (err) {
    console.error("[Discovery] Reddit API error:", err);
    return [];
  }
}

// Fetch real Twitter threads via Twitter API v2 using the user's stored OAuth token
async function discoverTwitterThreads(keywords: string[], count: number, userId: number): Promise<DiscoveredThread[]> {
  // Look up stored Twitter OAuth token for this user
  const tokenData = await getOAuthTokenByPlatform(userId, "twitter");
  if (!tokenData?.accessToken) {
    console.log("[Discovery] No Twitter token found for user, skipping real Twitter search");
    return [];
  }

  const query = keywords.slice(0, 3).map(k => `"${k}"`).join(" OR ") + " -is:retweet lang:en";

  try {
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(count, 10)}&tweet.fields=author_id,text,created_at,public_metrics&expansions=author_id&user.fields=username,name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Discovery] Twitter API error:", res.status, errText);
      return [];
    }

    const data = await res.json() as {
      data?: Array<{ id: string; text: string; author_id: string; public_metrics?: { like_count: number; reply_count: number } }>;
      includes?: { users?: Array<{ id: string; username: string; name: string }> };
    };

    const tweets = data?.data ?? [];
    const users = data?.includes?.users ?? [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return tweets.map((t) => {
      const user = userMap.get(t.author_id);
      const { intentScore, engagementPotential } = scoreThread(t.text, "", keywords);
      return {
        id: `twitter_${t.id}`,
        platform: "twitter",
        url: `https://twitter.com/${user?.username ?? "user"}/status/${t.id}`,
        title: t.text.slice(0, 100),
        content: t.text,
        author: user?.username ?? t.author_id,
        intentScore,
        engagementPotential,
      };
    });
  } catch (err) {
    console.error("[Discovery] Twitter API error:", err);
    return [];
  }
}

// Generate LLM-based threads for platforms without free public search APIs (LinkedIn, Instagram, TikTok)
async function discoverLLMThreads(
  keywords: string[],
  platforms: string[],
  niche: string,
  count: number
): Promise<DiscoveredThread[]> {
  if (platforms.length === 0 || count <= 0) return [];

  const keywordStr = keywords.join(", ");
  const platformStr = platforms.join(", ");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a social media intelligence system. Generate realistic, high-intent social media thread data for platforms that don't have public search APIs. Return valid JSON only.`,
      },
      {
        role: "user",
        content: `Generate ${count} high-intent social media threads for a campaign targeting the "${niche}" niche.
Keywords to monitor: ${keywordStr}
Platforms (only these): ${platformStr}

Generate realistic threads showing genuine purchase intent, pain points, or questions.
Return a JSON array with exactly ${count} objects, each having:
- id: unique string like "thread_1"
- platform: one of ${platformStr}
- url: realistic URL for that platform
- title: engaging thread title or post preview
- content: 2-4 sentences of thread content showing the user's intent or question
- author: realistic username
- intentScore: float 0.6-0.99
- engagementPotential: float 0.5-0.99`,
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
    return (parsed.threads || []).map((t: DiscoveredThread) => ({ ...t, id: `llm_${t.id}` }));
  } catch {
    return [];
  }
}

// Main discovery function — routes to real APIs where available, LLM for others
export async function discoverThreads(
  keywords: string[],
  platforms: string[],
  niche: string,
  count = 8,
  userId?: number
): Promise<DiscoveredThread[]> {
  const results: DiscoveredThread[] = [];
  const perPlatform = Math.ceil(count / Math.max(platforms.length, 1));

  // Platforms with real API support
  const realApiPlatforms = new Set(["reddit", "twitter"]);
  const llmPlatforms = platforms.filter(p => !realApiPlatforms.has(p));

  // Parallel fetch: real APIs
  const fetchPromises: Promise<DiscoveredThread[]>[] = [];

  if (platforms.includes("reddit")) {
    fetchPromises.push(discoverRedditThreads(keywords, perPlatform));
  }

  if (platforms.includes("twitter") && userId) {
    fetchPromises.push(discoverTwitterThreads(keywords, perPlatform, userId));
  } else if (platforms.includes("twitter") && !userId) {
    // No userId provided — fall back to LLM for Twitter
    llmPlatforms.push("twitter");
  }

  // LLM-based platforms
  if (llmPlatforms.length > 0) {
    const llmCount = perPlatform * llmPlatforms.length;
    fetchPromises.push(discoverLLMThreads(keywords, llmPlatforms, niche, llmCount));
  }

  const settled = await Promise.allSettled(fetchPromises);
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(...r.value);
  }

  // Sort by intentScore descending, return top `count`
  return results
    .sort((a, b) => b.intentScore - a.intentScore)
    .slice(0, count);
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
