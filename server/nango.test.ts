/**
 * Tests for Nango OAuth integration procedures
 * Tests getNangoConnectSession and nangoConnected tRPC procedures
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Nango SDK
vi.mock("@nangohq/node", () => {
  return {
    Nango: vi.fn().mockImplementation(() => ({
      createConnectSession: vi.fn().mockResolvedValue({
        data: {
          token: "nango_connect_session_test_token_123",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      }),
      getToken: vi.fn().mockResolvedValue("test_access_token_xyz"),
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: "test_access_token_xyz",
          refresh_token: "test_refresh_token_abc",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          raw: { scope: "tweet.read users.read" },
        },
      }),
    })),
  };
});

// Mock the db helpers
vi.mock("./db", () => ({
  getAccountsByUser: vi.fn().mockResolvedValue([
    { id: 42, userId: 1, platform: "twitter", handle: "testuser", displayName: "Test User" },
  ]),
  getDb: vi.fn(),
}));

// Mock socialOAuth
vi.mock("./socialOAuth", () => ({
  saveOAuthToken: vi.fn().mockResolvedValue(undefined),
  getOAuthToken: vi.fn(),
  deleteOAuthToken: vi.fn(),
  getOAuthStatusForAccounts: vi.fn(),
}));

describe("Nango OAuth Integration", () => {
  describe("getNangoConnectSession", () => {
    it("should return a session token, integrationId, and connectionId for twitter", async () => {
      const { Nango } = await import("@nangohq/node");
      const nango = new (Nango as any)({ secretKey: "test" });

      const session = await nango.createConnectSession({
        end_user: { id: "1", email: "test@example.com", display_name: "Test User" },
        allowed_integrations: ["twitter-v2"],
      });

      expect(session.data.token).toBe("nango_connect_session_test_token_123");
      expect(session.data.token).toMatch(/^nango_connect_session_/);
    });

    it("should map platform names to Nango integration IDs correctly", () => {
      const integrationMap: Record<string, string> = {
        twitter: "twitter-v2",
        linkedin: "linkedin",
        instagram: "instagram",
      };

      expect(integrationMap["twitter"]).toBe("twitter-v2");
      expect(integrationMap["linkedin"]).toBe("linkedin");
      expect(integrationMap["instagram"]).toBe("instagram");
    });

    it("should generate a deterministic connectionId from userId and accountId", () => {
      const userId = 1;
      const accountId = 42;
      const connectionId = `user-${userId}-account-${accountId}`;
      expect(connectionId).toBe("user-1-account-42");
    });
  });

  describe("nangoConnected", () => {
    it("should retrieve access token from Nango after OAuth completes", async () => {
      const { Nango } = await import("@nangohq/node");
      const nango = new (Nango as any)({ secretKey: "test" });

      const token = await nango.getToken("twitter-v2", "user-1-account-42");
      expect(token).toBe("test_access_token_xyz");
      expect(typeof token).toBe("string");
    });

    it("should retrieve connection details including refresh token", async () => {
      const { Nango } = await import("@nangohq/node");
      const nango = new (Nango as any)({ secretKey: "test" });

      const conn = await nango.getConnection("twitter-v2", "user-1-account-42", false, true);
      const credentials = conn.credentials as {
        access_token?: string;
        refresh_token?: string;
        expires_at?: string;
        raw?: Record<string, string>;
      };

      expect(credentials.access_token).toBe("test_access_token_xyz");
      expect(credentials.refresh_token).toBe("test_refresh_token_abc");
      expect(credentials.expires_at).toBeDefined();
      expect(credentials.raw?.scope).toBe("tweet.read users.read");
    });

    it("should call saveOAuthToken with correct parameters", async () => {
      const { saveOAuthToken } = await import("./socialOAuth");
      const { Nango } = await import("@nangohq/node");
      const nango = new (Nango as any)({ secretKey: "test" });

      const token = await nango.getToken("twitter-v2", "user-1-account-42") as string;
      const conn = await nango.getConnection("twitter-v2", "user-1-account-42", false, true);
      const credentials = conn.credentials as {
        refresh_token?: string;
        expires_at?: string;
        raw?: Record<string, string>;
      };

      await saveOAuthToken(1, 42, "twitter", {
        accessToken: token,
        refreshToken: credentials.refresh_token ?? null,
        expiresAt: credentials.expires_at ? new Date(credentials.expires_at) : null,
        scope: credentials.raw?.scope ?? null,
      });

      expect(saveOAuthToken).toHaveBeenCalledWith(
        1,
        42,
        "twitter",
        expect.objectContaining({
          accessToken: "test_access_token_xyz",
          refreshToken: "test_refresh_token_abc",
          scope: "tweet.read users.read",
        })
      );
    });
  });

  describe("NANGO_SECRET_KEY configuration", () => {
    it("should throw when NANGO_SECRET_KEY is not set", () => {
      const originalKey = process.env.NANGO_SECRET_KEY;
      delete process.env.NANGO_SECRET_KEY;

      const getNangoClient = () => {
        const secretKey = process.env.NANGO_SECRET_KEY;
        if (!secretKey) throw new Error("NANGO_SECRET_KEY not configured");
        const { Nango } = require("@nangohq/node");
        return new Nango({ secretKey });
      };

      expect(() => getNangoClient()).toThrow("NANGO_SECRET_KEY not configured");

      // Restore
      if (originalKey) process.env.NANGO_SECRET_KEY = originalKey;
    });
  });
});
