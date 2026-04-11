/**
 * Social Platform OAuth 2.0 Integration
 *
 * Supports: Twitter/X (PKCE), LinkedIn (Auth Code), Instagram/Meta (Auth Code)
 *
 * Token security: access/refresh tokens are AES-256-GCM encrypted at rest
 * using SECRET_KEY from env. Never stored in plaintext.
 */

import crypto from "crypto";
import { getDb } from "./db";
import { oauthTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Encryption helpers ────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.SECRET_KEY ?? process.env.JWT_SECRET ?? "fallback-dev-key-32-chars-long!!";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// ─── Token DB helpers ──────────────────────────────────────────────────────

export type StoredToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  nangoConnectionId?: string | null;  // Nango connection ID for managed token refresh
};

export async function saveOAuthToken(
  userId: number,
  accountId: number,
  platform: "twitter" | "linkedin" | "instagram",
  token: StoredToken
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.accountId, accountId)))
    .limit(1);

  const encrypted = {
    accessToken: encryptToken(token.accessToken),
    refreshToken: token.refreshToken ? encryptToken(token.refreshToken) : null,
    expiresAt: token.expiresAt ?? null,
    scope: token.scope ?? null,
    nangoConnectionId: token.nangoConnectionId ?? null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(oauthTokens)
      .set(encrypted)
      .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.accountId, accountId)));
  } else {
    await db.insert(oauthTokens).values({
      userId,
      accountId,
      platform,
      ...encrypted,
      tokenType: "Bearer",
    });
  }
}

export async function getOAuthToken(
  userId: number,
  accountId: number
): Promise<StoredToken | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.accountId, accountId)))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    accessToken: decryptToken(row.accessToken),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
    expiresAt: row.expiresAt ?? null,
    scope: row.scope ?? null,
    nangoConnectionId: row.nangoConnectionId ?? null,
  };
}

export async function deleteOAuthToken(userId: number, accountId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.accountId, accountId)));
}

export async function getOAuthStatusForAccounts(
  userId: number,
  accountIds: number[]
): Promise<Record<number, boolean>> {
  if (accountIds.length === 0) return {};
  const db = await getDb();
  if (!db) return Object.fromEntries(accountIds.map((id) => [id, false]));

  const rows = await db
    .select({ accountId: oauthTokens.accountId })
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId));

  const connected = new Set(rows.map((r: { accountId: number }) => r.accountId));
  return Object.fromEntries(accountIds.map((id) => [id, connected.has(id)]));
}

// ─── PKCE helpers (Twitter) ────────────────────────────────────────────────

export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// ─── State store (in-memory, per-process) ─────────────────────────────────
// Maps state → { verifier, accountId, userId, platform, redirectOrigin }
// Entries expire after 10 minutes

type OAuthState = {
  verifier?: string;   // PKCE verifier (Twitter only)
  accountId: number;
  userId: number;
  platform: "twitter" | "linkedin" | "instagram";
  redirectOrigin: string;
  expiresAt: number;
};

const stateStore = new Map<string, OAuthState>();

export function createOAuthState(data: Omit<OAuthState, "expiresAt">): string {
  const state = crypto.randomBytes(16).toString("hex");
  stateStore.set(state, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Clean up expired entries
  const now = Date.now();
  stateStore.forEach((v, k) => {
    if (v.expiresAt < now) stateStore.delete(k);
  });
  return state;
}

export function consumeOAuthState(state: string): OAuthState | null {
  const entry = stateStore.get(state);
  if (!entry) return null;
  stateStore.delete(state);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

// ─── Twitter OAuth 2.0 PKCE ────────────────────────────────────────────────

export function buildTwitterAuthUrl(params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) throw new Error("TWITTER_CLIENT_ID not configured");

  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "tweet.read users.read offline.access");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeTwitterCode(params: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scope: string }> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Twitter credentials not configured");

  const body = new URLSearchParams({
    code: params.code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
  });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export async function refreshTwitterToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Twitter credentials not configured");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── LinkedIn OAuth 2.0 ────────────────────────────────────────────────────

export function buildLinkedInAuthUrl(params: {
  state: string;
  redirectUri: string;
}): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID not configured");

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeLinkedInCode(params: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn credentials not configured");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

// ─── Instagram / Meta OAuth ────────────────────────────────────────────────

export function buildInstagramAuthUrl(params: {
  state: string;
  redirectUri: string;
}): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID not configured");

  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeInstagramCode(params: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Meta credentials not configured");

  // Step 1: short-lived token
  const shortRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(params.redirectUri)}&client_secret=${appSecret}&code=${params.code}`
  );

  if (!shortRes.ok) {
    const err = await shortRes.text();
    throw new Error(`Instagram token exchange failed: ${err}`);
  }

  const shortData = await shortRes.json() as { access_token: string };

  // Step 2: exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`
  );

  if (!longRes.ok) {
    const err = await longRes.text();
    throw new Error(`Instagram long-lived token exchange failed: ${err}`);
  }

  const longData = await longRes.json() as { access_token: string; expires_in: number };
  return {
    accessToken: longData.access_token,
    expiresIn: longData.expires_in,
  };
}

// ─── Fetch private metrics using stored tokens ─────────────────────────────

export async function fetchTwitterMetricsWithToken(
  accessToken: string,
  handle: string
): Promise<{ followers: number; following: number; tweetCount: number } | null> {
  // Get authenticated user's own metrics
  const res = await fetch(
    "https://api.x.com/2/users/me?user.fields=public_metrics",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  const data = await res.json() as {
    data?: { public_metrics?: { followers_count: number; following_count: number; tweet_count: number } };
  };

  const m = data.data?.public_metrics;
  if (!m) return null;
  return {
    followers: m.followers_count,
    following: m.following_count,
    tweetCount: m.tweet_count,
  };
}

export async function fetchLinkedInProfileWithToken(
  accessToken: string
): Promise<{ displayName: string; headline?: string } | null> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  const data = await res.json() as { name?: string; given_name?: string; family_name?: string };
  const displayName = data.name ?? [data.given_name, data.family_name].filter(Boolean).join(" ");
  return { displayName };
}

export async function fetchInstagramMetricsWithToken(
  accessToken: string
): Promise<{ followers: number; mediaCount: number; profileViews?: number } | null> {
  // First get the user's Instagram Business Account ID via Facebook Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
  );

  if (!pagesRes.ok) return null;
  const pagesData = await pagesRes.json() as {
    data?: Array<{ instagram_business_account?: { id: string } }>;
  };

  const igAccountId = pagesData.data?.[0]?.instagram_business_account?.id;
  if (!igAccountId) return null;

  // Fetch metrics
  const metricsRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count,media_count&access_token=${accessToken}`
  );

  if (!metricsRes.ok) return null;
  const metricsData = await metricsRes.json() as {
    followers_count?: number;
    media_count?: number;
  };

  return {
    followers: metricsData.followers_count ?? 0,
    mediaCount: metricsData.media_count ?? 0,
  };
}
