/**
 * Stripe Webhook Handler Tests
 *
 * Covers:
 *  1. Signature verification — invalid/missing signature returns 400
 *  2. Test event bypass — evt_test_* events return { verified: true } immediately
 *  3. checkout.session.completed — subscription is upserted for valid session
 *  4. checkout.session.completed — no upsert when user_id metadata is missing
 *  5. customer.subscription.deleted — handled gracefully, returns { received: true }
 *  6. Unknown event types — handled gracefully, returns { received: true }
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import express, { type Request, type Response } from "express";
import request from "supertest";
import Stripe from "stripe";

// ── Webhook app factory ───────────────────────────────────────────────────────

function buildWebhookApp(
  stripeInstance: Stripe,
  webhookSecret: string,
  upsertFn: (...args: unknown[]) => Promise<void>
) {
  const app = express();

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "*/*" }), // accept any content-type so tests can send octet-stream
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;

      try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        return res.status(400).send("Webhook Error");
      }

      // Test event bypass — required for Stripe verification flow
      if (event.id.startsWith("evt_test_")) {
        return res.json({ verified: true });
      }

      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.metadata?.user_id ?? "0");
          const plan = (session.metadata?.plan ?? "free") as "free" | "pro" | "agency";
          if (userId && session.subscription) {
            const sub = await stripeInstance.subscriptions.retrieve(
              session.subscription as string
            );
            const periodEnd = (sub as unknown as { current_period_end: number })
              .current_period_end;
            await upsertFn({
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: sub.items.data[0]?.price?.id,
              plan,
              status: "active",
              currentPeriodEnd: new Date(periodEnd * 1000),
            });
          }
        }
        // customer.subscription.deleted — log only, no upsert needed in test
      } catch {
        // swallow in test
      }

      res.json({ received: true });
    }
  );

  return app;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test_secret_key_for_unit_tests";

/** Use Stripe's official test header generator to avoid manual HMAC issues. */
function makeHeader(stripeInstance: Stripe, payload: string): string {
  return stripeInstance.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
}

function makeCheckoutSessionEvent(overrides: Partial<Stripe.Checkout.Session> = {}): string {
  const session: Partial<Stripe.Checkout.Session> = {
    id: "cs_test_abc123",
    object: "checkout.session",
    customer: "cus_test_customer",
    subscription: "sub_test_subscription",
    metadata: { user_id: "42", plan: "pro" },
    payment_status: "paid",
    ...overrides,
  };
  const event = {
    id: "evt_live_checkout_completed",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    api_version: "2026-03-25.dahlia",
    pending_webhooks: 1,
    request: null,
  };
  return JSON.stringify(event);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Stripe Webhook Handler", () => {
  let stripe: Stripe;
  let upsertMock: ReturnType<typeof vi.fn>;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    stripe = new Stripe("sk_test_placeholder_key", { apiVersion: "2026-03-25.dahlia" });
    upsertMock = vi.fn().mockResolvedValue(undefined);
    app = buildWebhookApp(stripe, WEBHOOK_SECRET, upsertMock);
  });

  // ── 1. Signature verification ──────────────────────────────────────────────
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from(JSON.stringify({ id: "evt_no_sig", type: "ping" })));

    expect(res.status).toBe(400);
    expect(res.text).toContain("Webhook Error");
  });

  it("returns 400 when stripe-signature header is invalid", async () => {
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", "t=1,v1=badhash")
      .send(Buffer.from(JSON.stringify({ id: "evt_bad_sig", type: "ping" })));

    expect(res.status).toBe(400);
  });

  // ── 2. Test event bypass ───────────────────────────────────────────────────
  it("returns { verified: true } for test events (evt_test_* prefix)", async () => {
    const payload = JSON.stringify({
      id: "evt_test_verification_check",
      object: "event",
      type: "ping",
      data: { object: {} },
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      api_version: "2026-03-25.dahlia",
      pending_webhooks: 0,
      request: null,
    });
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true });
  });

  // ── 3. checkout.session.completed — upsert called ─────────────────────────
  it("calls upsertSubscription when checkout.session.completed fires with valid metadata", async () => {
    const mockSub = {
      id: "sub_test_subscription",
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      items: { data: [{ price: { id: "price_pro_monthly" } }] },
    };
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
      mockSub as unknown as Stripe.Subscription
    );

    const payload = makeCheckoutSessionEvent();
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        plan: "pro",
        status: "active",
        stripeCustomerId: "cus_test_customer",
        stripeSubscriptionId: "sub_test_subscription",
        stripePriceId: "price_pro_monthly",
      })
    );
  });

  // ── 4. checkout.session.completed — missing user_id ───────────────────────
  it("does NOT call upsertSubscription when user_id metadata is missing", async () => {
    const payload = makeCheckoutSessionEvent({ metadata: {} });
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  // ── 5. customer.subscription.deleted ──────────────────────────────────────
  it("returns { received: true } for customer.subscription.deleted without error", async () => {
    const event = {
      id: "evt_live_sub_deleted",
      object: "event",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_deleted_123",
          object: "subscription",
          customer: "cus_test_customer",
          status: "canceled",
        },
      },
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      api_version: "2026-03-25.dahlia",
      pending_webhooks: 1,
      request: null,
    };
    const payload = JSON.stringify(event);
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  // ── 6. Unknown event type ──────────────────────────────────────────────────
  it("returns { received: true } for unhandled event types", async () => {
    const event = {
      id: "evt_live_unknown_type",
      object: "event",
      type: "payment_method.attached",
      data: { object: { id: "pm_test_123" } },
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      api_version: "2026-03-25.dahlia",
      pending_webhooks: 1,
      request: null,
    };
    const payload = JSON.stringify(event);
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
