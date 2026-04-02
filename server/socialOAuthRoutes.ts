/**
 * Social Platform OAuth 2.0 Callback Routes
 *
 * Registers Express routes for Twitter, LinkedIn, and Instagram OAuth flows.
 * These routes are called by the platform after the user authorizes the app.
 *
 * Flow:
 * 1. Frontend calls trpc.accounts.getOAuthConnectUrl({ accountId, platform })
 * 2. Backend generates state + PKCE, returns auth URL
 * 3. Frontend opens auth URL in a popup
 * 4. Platform redirects to /api/oauth/{platform}/callback
 * 5. Backend exchanges code for token, saves encrypted token, closes popup
 */

import type { Express, Request, Response } from "express";
import {
  consumeOAuthState,
  exchangeTwitterCode,
  exchangeLinkedInCode,
  exchangeInstagramCode,
  saveOAuthToken,
} from "./socialOAuth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** HTML page that closes the popup and signals success to the opener */
function successPage(platform: string, origin: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_success', platform: '${platform}' }, '${origin}');
    window.close();
  } else {
    window.location.href = '${origin}/accounts?connected=${platform}';
  }
</script>
<p>Connected! You can close this window.</p>
</body>
</html>`;
}

function errorPage(message: string, origin: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Connection Failed</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', error: '${message.replace(/'/g, "\\'")}' }, '${origin}');
    window.close();
  } else {
    window.location.href = '${origin}/accounts?error=${encodeURIComponent(message)}';
  }
</script>
<p>Connection failed: ${message}. You can close this window.</p>
</body>
</html>`;
}

export function registerSocialOAuthRoutes(app: Express) {
  // ── Twitter/X callback ───────────────────────────────────────────────────
  app.get("/api/oauth/twitter/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const errorParam = getQueryParam(req, "error");

    if (errorParam) {
      const stateData = state ? consumeOAuthState(state) : null;
      const origin = stateData?.redirectOrigin ?? "https://socialgrowth.live";
      res.send(errorPage(`Twitter denied access: ${errorParam}`, origin));
      return;
    }

    if (!code || !state) {
      res.status(400).send(errorPage("Missing code or state", "https://socialgrowth.live"));
      return;
    }

    const stateData = consumeOAuthState(state);
    if (!stateData) {
      res.status(400).send(errorPage("Invalid or expired state", "https://socialgrowth.live"));
      return;
    }

    const { accountId, userId, verifier, redirectOrigin } = stateData;
    if (!verifier) {
      res.status(400).send(errorPage("Missing PKCE verifier", redirectOrigin));
      return;
    }

    try {
      const redirectUri = `${redirectOrigin}/api/oauth/twitter/callback`;
      const tokens = await exchangeTwitterCode({ code, verifier, redirectUri });

      await saveOAuthToken(userId, accountId, "twitter", {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      });

      console.log(`[SocialOAuth] Twitter connected for user ${userId}, account ${accountId}`);
      res.send(successPage("twitter", redirectOrigin));
    } catch (err) {
      console.error("[SocialOAuth] Twitter callback error:", err);
      res.send(errorPage("Token exchange failed", redirectOrigin));
    }
  });

  // ── LinkedIn callback ────────────────────────────────────────────────────
  app.get("/api/oauth/linkedin/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const errorParam = getQueryParam(req, "error");

    if (errorParam) {
      const stateData = state ? consumeOAuthState(state) : null;
      const origin = stateData?.redirectOrigin ?? "https://socialgrowth.live";
      res.send(errorPage(`LinkedIn denied access: ${errorParam}`, origin));
      return;
    }

    if (!code || !state) {
      res.status(400).send(errorPage("Missing code or state", "https://socialgrowth.live"));
      return;
    }

    const stateData = consumeOAuthState(state);
    if (!stateData) {
      res.status(400).send(errorPage("Invalid or expired state", "https://socialgrowth.live"));
      return;
    }

    const { accountId, userId, redirectOrigin } = stateData;

    try {
      const redirectUri = `${redirectOrigin}/api/oauth/linkedin/callback`;
      const tokens = await exchangeLinkedInCode({ code, redirectUri });

      await saveOAuthToken(userId, accountId, "linkedin", {
        accessToken: tokens.accessToken,
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      });

      console.log(`[SocialOAuth] LinkedIn connected for user ${userId}, account ${accountId}`);
      res.send(successPage("linkedin", redirectOrigin));
    } catch (err) {
      console.error("[SocialOAuth] LinkedIn callback error:", err);
      res.send(errorPage("Token exchange failed", redirectOrigin));
    }
  });

  // ── Instagram / Meta callback ────────────────────────────────────────────
  app.get("/api/oauth/instagram/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const errorParam = getQueryParam(req, "error");

    if (errorParam) {
      const stateData = state ? consumeOAuthState(state) : null;
      const origin = stateData?.redirectOrigin ?? "https://socialgrowth.live";
      res.send(errorPage(`Meta denied access: ${errorParam}`, origin));
      return;
    }

    if (!code || !state) {
      res.status(400).send(errorPage("Missing code or state", "https://socialgrowth.live"));
      return;
    }

    const stateData = consumeOAuthState(state);
    if (!stateData) {
      res.status(400).send(errorPage("Invalid or expired state", "https://socialgrowth.live"));
      return;
    }

    const { accountId, userId, redirectOrigin } = stateData;

    try {
      const redirectUri = `${redirectOrigin}/api/oauth/instagram/callback`;
      const tokens = await exchangeInstagramCode({ code, redirectUri });

      await saveOAuthToken(userId, accountId, "instagram", {
        accessToken: tokens.accessToken,
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: "instagram_basic,instagram_manage_insights",
      });

      console.log(`[SocialOAuth] Instagram connected for user ${userId}, account ${accountId}`);
      res.send(successPage("instagram", redirectOrigin));
    } catch (err) {
      console.error("[SocialOAuth] Instagram callback error:", err);
      res.send(errorPage("Token exchange failed", redirectOrigin));
    }
  });
}


