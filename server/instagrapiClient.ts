/**
 * Instagrapi Service Client
 *
 * Calls the Python instagrapi microservice running on port 8001.
 * Provides typed wrappers for all instagrapi endpoints.
 */

const INSTAGRAPI_URL = process.env.INSTAGRAPI_URL || "http://localhost:8001";
const INSTAGRAPI_API_KEY = process.env.INSTAGRAPI_API_KEY || "instagrapi-internal-key";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": INSTAGRAPI_API_KEY,
};

async function callService<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: object
): Promise<T> {
  const url = `${INSTAGRAPI_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`Instagrapi service error ${res.status}: ${(err as { detail?: string }).detail || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export interface InstaUserInfo {
  username: string;
  full_name: string;
  biography: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  profile_pic_url: string;
  is_private: boolean;
  is_verified: boolean;
  external_url: string;
}

export interface InstaMediaItem {
  id: string;
  media_type: number;
  thumbnail_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  taken_at: string;
  play_count?: number;
}

export interface InstaMediaInsights {
  media_id: string;
  like_count: number;
  comment_count: number;
  play_count?: number;
  reach?: number;
  impressions?: number;
  saved?: number;
}

export interface LoginResult {
  success: boolean;
  username: string;
  requires_2fa: boolean;
  message: string;
}

/**
 * Check if the instagrapi service is reachable.
 */
export async function isInstagrapiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${INSTAGRAPI_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Login to Instagram with username and password.
 * Returns login result including whether 2FA is required.
 */
export async function instaLogin(
  username: string,
  password: string,
  verificationCode?: string
): Promise<LoginResult> {
  return callService<LoginResult>("POST", "/login", {
    username,
    password,
    verification_code: verificationCode,
  });
}

/**
 * Logout from Instagram and clear the session.
 */
export async function instaLogout(username: string): Promise<{ success: boolean }> {
  return callService<{ success: boolean }>("DELETE", `/logout/${username}`);
}

/**
 * Get profile info for any Instagram user.
 * @param username - The Instagram username to look up
 * @param loggedInAs - The authenticated account to use for the request
 */
export async function instaGetUserInfo(
  username: string,
  loggedInAs: string
): Promise<InstaUserInfo> {
  return callService<InstaUserInfo>(
    "GET",
    `/user/${encodeURIComponent(username)}?logged_in_as=${encodeURIComponent(loggedInAs)}`
  );
}

/**
 * Get recent posts for an Instagram user.
 */
export async function instaGetUserPosts(
  username: string,
  loggedInAs: string,
  limit = 12
): Promise<InstaMediaItem[]> {
  return callService<InstaMediaItem[]>(
    "GET",
    `/user/${encodeURIComponent(username)}/posts?logged_in_as=${encodeURIComponent(loggedInAs)}&limit=${limit}`
  );
}

/**
 * Get insights for a specific media post (only works for your own posts).
 */
export async function instaGetMediaInsights(
  mediaId: string,
  loggedInAs: string
): Promise<InstaMediaInsights> {
  return callService<InstaMediaInsights>(
    "GET",
    `/media/${encodeURIComponent(mediaId)}/insights?logged_in_as=${encodeURIComponent(loggedInAs)}`
  );
}
