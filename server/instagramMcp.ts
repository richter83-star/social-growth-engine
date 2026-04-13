/**
 * Instagram Graph API Integration
 *
 * Fetches Instagram Business account data via the Graph API using
 * the OAuth token stored by the Nango integration (instagram-business).
 *
 * This replaces the previous manus-mcp-cli approach which only worked
 * in the local sandbox environment.
 */

export type InstagramAccountInfo = {
  username: string;
  name: string;
  followers: number;
  following: number;
  posts: number;
  profilePicture?: string;
};

export type InstagramPost = {
  id: string;
  type: string;
  timestamp?: string;
  caption?: string;
  permalink?: string;
  thumbnailUrl?: string;
};

export type InstagramPostInsights = {
  postId: string;
  likes?: number;
  comments?: number;
  reach?: number;
  impressions?: number;
  saved?: number;
  shares?: number;
};

const GRAPH_API = "https://graph.facebook.com/v22.0";

/**
 * Fetch the Instagram Business account info for a given access token.
 * Uses the Facebook Graph API: /me/accounts → instagram_business_account
 */
export async function getInstagramAccountInfo(accessToken?: string): Promise<InstagramAccountInfo | null> {
  if (!accessToken) return null;

  try {
    // Step 1: Get the Facebook Page linked to this token
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    );
    if (!pagesRes.ok) return null;
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; name: string; instagram_business_account?: { id: string } }> };

    const page = pagesData.data?.find(p => p.instagram_business_account);
    if (!page?.instagram_business_account) return null;

    const igId = page.instagram_business_account.id;

    // Step 2: Get Instagram Business account details
    const igRes = await fetch(
      `${GRAPH_API}/${igId}?fields=username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
    );
    if (!igRes.ok) return null;
    const ig = await igRes.json() as {
      username?: string;
      name?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      profile_picture_url?: string;
    };

    return {
      username: ig.username ?? "",
      name: ig.name ?? ig.username ?? "",
      followers: ig.followers_count ?? 0,
      following: ig.follows_count ?? 0,
      posts: ig.media_count ?? 0,
      profilePicture: ig.profile_picture_url,
    };
  } catch (err) {
    console.error("[InstagramGraph] getAccountInfo error:", err);
    return null;
  }
}

/**
 * Fetch recent posts from the connected Instagram Business account.
 */
export async function getInstagramPosts(limit = 10, accessToken?: string): Promise<InstagramPost[]> {
  if (!accessToken) return [];

  try {
    // Get the Instagram Business account ID first
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,instagram_business_account&access_token=${accessToken}`
    );
    if (!pagesRes.ok) return [];
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; instagram_business_account?: { id: string } }> };

    const page = pagesData.data?.find(p => p.instagram_business_account);
    if (!page?.instagram_business_account) return [];

    const igId = page.instagram_business_account.id;

    // Fetch media
    const mediaRes = await fetch(
      `${GRAPH_API}/${igId}/media?fields=id,media_type,timestamp,caption,permalink,thumbnail_url&limit=${Math.min(limit, 20)}&access_token=${accessToken}`
    );
    if (!mediaRes.ok) return [];
    const mediaData = await mediaRes.json() as { data?: Array<{ id: string; media_type?: string; timestamp?: string; caption?: string; permalink?: string; thumbnail_url?: string }> };

    return (mediaData.data ?? []).map(m => ({
      id: m.id,
      type: m.media_type ?? "IMAGE",
      timestamp: m.timestamp,
      caption: m.caption,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url,
    }));
  } catch (err) {
    console.error("[InstagramGraph] getPosts error:", err);
    return [];
  }
}

/**
 * Fetch insights for a specific Instagram post.
 */
export async function getInstagramPostInsights(postId: string, accessToken?: string): Promise<InstagramPostInsights | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch(
      `${GRAPH_API}/${postId}/insights?metric=likes,comments,reach,impressions,saved,shares&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: number }> }> };

    const getMetric = (name: string): number | undefined => {
      const metric = data.data?.find(m => m.name === name);
      return metric?.values?.[0]?.value;
    };

    return {
      postId,
      likes: getMetric("likes"),
      comments: getMetric("comments"),
      reach: getMetric("reach"),
      impressions: getMetric("impressions"),
      saved: getMetric("saved"),
      shares: getMetric("shares"),
    };
  } catch (err) {
    console.error("[InstagramGraph] getPostInsights error:", err);
    return null;
  }
}
