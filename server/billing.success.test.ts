/**
 * Billing Success URL Tests
 *
 * Verifies that the createCheckout procedure generates a success_url
 * pointing to /billing/success with the Stripe session ID placeholder
 * and the plan query param, so users land on the post-checkout page.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Stripe ───────────────────────────────────────────────────────────────
vi.mock("stripe", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    url: "https://checkout.stripe.com/pay/cs_test_abc123",
    id: "cs_test_abc123",
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: { sessions: { create: mockCreate } },
      billingPortal: { sessions: { create: vi.fn() } },
    })),
  };
});

// ── Mock DB helpers ───────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSubscriptionByUserId: vi.fn().mockResolvedValue(null),
    upsertSubscription: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Mock products ─────────────────────────────────────────────────────────────
vi.mock("./products", () => ({
  STRIPE_PRICES: { pro: "price_pro_test", agency: "price_agency_test" },
  PLAN_LIMITS: {
    free: { campaigns: 1, accounts: 1, queueItems: 10 },
    pro: { campaigns: 5, accounts: 5, queueItems: 100 },
    agency: { campaigns: -1, accounts: -1, queueItems: -1 },
  },
}));

import Stripe from "stripe";
import { appRouter } from "./routers";

function makeCaller(user = { id: 1, name: "Alice", email: "alice@test.com", role: "user" as const }) {
  return appRouter.createCaller({
    user,
    req: { headers: { origin: "https://myapp.manus.space" } } as never,
    res: {} as never,
  });
}

describe("billing.createCheckout — success_url", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes /billing/success in the success_url for pro plan", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "pro", origin: "https://myapp.manus.space" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { success_url: string };
    expect(createCall.success_url).toContain("/billing/success");
  });

  it("includes {CHECKOUT_SESSION_ID} placeholder in success_url", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "pro", origin: "https://myapp.manus.space" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { success_url: string };
    expect(createCall.success_url).toContain("{CHECKOUT_SESSION_ID}");
  });

  it("includes plan=pro query param in success_url", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "pro", origin: "https://myapp.manus.space" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { success_url: string };
    expect(createCall.success_url).toContain("plan=pro");
  });

  it("includes plan=agency query param for agency plan", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "agency", origin: "https://myapp.manus.space" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { success_url: string };
    expect(createCall.success_url).toContain("plan=agency");
  });

  it("uses the origin from input to build the success_url", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "pro", origin: "https://custom-origin.example.com" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { success_url: string };
    expect(createCall.success_url).toContain("https://custom-origin.example.com");
  });

  it("cancel_url still points to /billing", async () => {
    const caller = makeCaller();
    await caller.billing.createCheckout({ plan: "pro", origin: "https://myapp.manus.space" });

    const stripe = new (Stripe as unknown as new (k: string) => { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } })("");
    const createCall = stripe.checkout.sessions.create.mock.calls[0][0] as { cancel_url: string };
    expect(createCall.cancel_url).toContain("/billing");
    expect(createCall.cancel_url).not.toContain("/billing/success");
  });
});
