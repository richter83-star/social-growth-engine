/**
 * Instagram MCP Integration
 *
 * Uses the manus-mcp-cli to call the connected Instagram MCP server.
 * This gives direct access to the owner's Instagram Business account
 * without requiring a Meta developer app.
 *
 * For multi-user service: each user would need their own Meta OAuth flow
 * (META_APP_ID / META_APP_SECRET). This module handles the owner's account.
 */

import { execSync } from "child_process";
import fs from "fs";

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

/**
 * Fetch the connected Instagram account's profile info via MCP.
 */
export async function getInstagramAccountInfo(): Promise<InstagramAccountInfo | null> {
  try {
    const result = execSync(
      `manus-mcp-cli tool call get_account_info --server instagram --input '{}'`,
      { encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }
    );

    // The result is saved to a file; find the path
    const match = result.match(/MCP tool invocation result saved to:\s*(\S+)/);
    if (!match) return null;

    const filePath = match[1];
    if (!fs.existsSync(filePath)) return null;

    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Parse the MCP response — it returns structured data
    if (raw?.content) {
      // Content is an array of text blocks
      const textBlock = Array.isArray(raw.content)
        ? raw.content.find((c: { type: string }) => c.type === "text")
        : null;

      if (textBlock?.text) {
        return parseAccountInfoText(textBlock.text);
      }
    }

    return null;
  } catch (err) {
    console.error("[InstagramMCP] getAccountInfo error:", err);
    return null;
  }
}

/**
 * Fetch recent posts from the connected Instagram account.
 */
export async function getInstagramPosts(limit = 10): Promise<InstagramPost[]> {
  try {
    const result = execSync(
      `manus-mcp-cli tool call get_post_list --server instagram --input '{"limit":${Math.min(limit, 20)}}'`,
      { encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }
    );

    const match = result.match(/MCP tool invocation result saved to:\s*(\S+)/);
    if (!match) return [];

    const filePath = match[1];
    if (!fs.existsSync(filePath)) return [];

    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (raw?.content) {
      const textBlock = Array.isArray(raw.content)
        ? raw.content.find((c: { type: string }) => c.type === "text")
        : null;

      if (textBlock?.text) {
        return parsePostListText(textBlock.text);
      }
    }

    return [];
  } catch (err) {
    console.error("[InstagramMCP] getPostList error:", err);
    return [];
  }
}

/**
 * Fetch insights for a specific post.
 */
export async function getInstagramPostInsights(postId: string): Promise<InstagramPostInsights | null> {
  try {
    const result = execSync(
      `manus-mcp-cli tool call get_post_insights --server instagram --input '{"post_id":"${postId}"}'`,
      { encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }
    );

    const match = result.match(/MCP tool invocation result saved to:\s*(\S+)/);
    if (!match) return null;

    const filePath = match[1];
    if (!fs.existsSync(filePath)) return null;

    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (raw?.content) {
      const textBlock = Array.isArray(raw.content)
        ? raw.content.find((c: { type: string }) => c.type === "text")
        : null;

      if (textBlock?.text) {
        return parsePostInsightsText(textBlock.text, postId);
      }
    }

    return null;
  } catch (err) {
    console.error("[InstagramMCP] getPostInsights error:", err);
    return null;
  }
}

// ─── Text parsers ──────────────────────────────────────────────────────────

function parseAccountInfoText(text: string): InstagramAccountInfo | null {
  // Expected format:
  // Instagram Account Info
  // Username: @friedfeeds1
  // Name: FriedFeeds
  // Followers: 0
  // Following: 0
  // Posts: 0
  // Profile Picture: https://...

  const lines = text.split("\n").map((l) => l.trim());
  const get = (key: string): string => {
    const line = lines.find((l) => l.toLowerCase().startsWith(key.toLowerCase() + ":"));
    return line ? line.slice(key.length + 1).trim() : "";
  };

  const username = get("Username").replace(/^@/, "");
  const name = get("Name");
  const followers = parseInt(get("Followers"), 10) || 0;
  const following = parseInt(get("Following"), 10) || 0;
  const posts = parseInt(get("Posts"), 10) || 0;
  const profilePicture = get("Profile Picture") || undefined;

  if (!username) return null;

  return { username, name, followers, following, posts, profilePicture };
}

function parsePostListText(text: string): InstagramPost[] {
  if (text.toLowerCase().includes("no posts found")) return [];

  // Try to parse structured post entries
  const posts: InstagramPost[] = [];
  const blocks = text.split(/\n\s*\n/).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    const get = (key: string): string => {
      const line = lines.find((l) => l.toLowerCase().startsWith(key.toLowerCase() + ":"));
      return line ? line.slice(key.length + 1).trim() : "";
    };

    const id = get("ID") || get("Post ID") || get("Id");
    const type = get("Type") || "post";
    const timestamp = get("Timestamp") || get("Date") || undefined;
    const caption = get("Caption") || undefined;
    const permalink = get("Permalink") || get("URL") || undefined;

    if (id) {
      posts.push({ id, type, timestamp, caption, permalink });
    }
  }

  return posts;
}

function parsePostInsightsText(text: string, postId: string): InstagramPostInsights | null {
  const lines = text.split("\n").map((l) => l.trim());
  const get = (key: string): number | undefined => {
    const line = lines.find((l) => l.toLowerCase().startsWith(key.toLowerCase() + ":"));
    if (!line) return undefined;
    const val = parseInt(line.slice(key.length + 1).trim(), 10);
    return isNaN(val) ? undefined : val;
  };

  return {
    postId,
    likes: get("Likes"),
    comments: get("Comments"),
    reach: get("Reach"),
    impressions: get("Impressions"),
    saved: get("Saved"),
    shares: get("Shares"),
  };
}
