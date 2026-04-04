/**
 * Validates that Stripe price IDs are set correctly in the environment.
 * These tests run at build/test time to catch misconfigured secrets early.
 */
import { describe, it, expect } from "vitest";

// Mirror the logic from products.ts
const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro_placeholder",
  agency: process.env.STRIPE_PRICE_AGENCY ?? "price_agency_placeholder",
};

describe("Stripe price ID configuration", () => {
  it("STRIPE_PRICE_PRO is set and not a placeholder", () => {
    expect(STRIPE_PRICES.pro).toBeTruthy();
    expect(STRIPE_PRICES.pro).not.toContain("placeholder");
    expect(STRIPE_PRICES.pro).toMatch(/^price_/);
  });

  it("STRIPE_PRICE_AGENCY is set and not a placeholder", () => {
    expect(STRIPE_PRICES.agency).toBeTruthy();
    expect(STRIPE_PRICES.agency).not.toContain("placeholder");
    expect(STRIPE_PRICES.agency).toMatch(/^price_/);
  });

  it("Pro and Agency price IDs are different", () => {
    expect(STRIPE_PRICES.pro).not.toBe(STRIPE_PRICES.agency);
  });
});
