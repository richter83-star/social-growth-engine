/**
 * OAuth Credentials Validation Tests
 * Verifies that required OAuth credentials are present in the environment.
 */
import { describe, it, expect } from "vitest";

describe("OAuth Credentials", () => {
  describe("Twitter/X", () => {
    it("TWITTER_CLIENT_ID is set and non-empty", () => {
      const val = process.env.TWITTER_CLIENT_ID;
      expect(val).toBeDefined();
      expect(val!.length).toBeGreaterThan(0);
    });

    it("TWITTER_CLIENT_SECRET is set and non-empty", () => {
      const val = process.env.TWITTER_CLIENT_SECRET;
      expect(val).toBeDefined();
      expect(val!.length).toBeGreaterThan(0);
    });

    it("TWITTER_CLIENT_ID does not contain placeholder text", () => {
      const val = process.env.TWITTER_CLIENT_ID ?? "";
      expect(val).not.toMatch(/placeholder|your_|REPLACE|xxx/i);
    });
  });

  describe("LinkedIn", () => {
    it("LINKEDIN_CLIENT_ID is set and non-empty", () => {
      const val = process.env.LINKEDIN_CLIENT_ID;
      expect(val).toBeDefined();
      expect(val!.length).toBeGreaterThan(0);
    });

    it("LINKEDIN_CLIENT_SECRET is set and non-empty", () => {
      const val = process.env.LINKEDIN_CLIENT_SECRET;
      expect(val).toBeDefined();
      expect(val!.length).toBeGreaterThan(0);
    });

    it("LINKEDIN_CLIENT_ID does not contain placeholder text", () => {
      const val = process.env.LINKEDIN_CLIENT_ID ?? "";
      expect(val).not.toMatch(/placeholder|your_|REPLACE|xxx/i);
    });
  });

  describe("Meta/Instagram (optional)", () => {
    it("META_APP_ID and META_APP_SECRET are either both set or both unset", () => {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      const bothSet = !!appId && !!appSecret;
      const neitherSet = !appId && !appSecret;
      expect(bothSet || neitherSet).toBe(true);
    });
  });
});
