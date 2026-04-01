/**
 * Stripe Webhook Handler Tests
 *
 * Covers:
 *  1. Signature verification — invalid/missing signature returns 400
 *  2. Test event bypass — evt_test_* events return { verified: true } immediately
 *  3. checkout.session.completed — subscription upserted + notifyOwner called
 *  4. checkout.session.completed — no upsert/notify when user_id metadata missing
 *  5. customer.subscription.deleted — notifyOwner called with churn alert
 *  6. Unknown event types — handled gracefully, returns { received: true }
 *  7. notifyOwner failure — webhook still returns { received: true } (non-fatal)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import express, { type Request, type Response } from "express";
import request from "supertest";
import Stripe from "stripe";

// ── Webhook app factory ───────────────────────────────────────────────────────

const PLAN_PRICE: Record<string, number> = { free: 0, pro: 49, agency: 149 };

function buildWebhookApp(
  stripeInstance: Stripe,
  webhookSecret: string,
  upsertFn: (...args: unknown[]) => Promise<void>,
  notifyFn: (payload: { title: string; content: string }) => Promise<boolean>
) {
  const app = express();

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "*/*" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;

      try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        return res.status(400).send("Webhook Error");
      }

      // Test event bypass
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

            // Notify owner
            try {
              const customerName =
                session.metadata?.customer_name ??
                (session as unknown as { customer_details?: { name?: string } }).customer_details?.name ??
                "Unknown";
              const customerEmail =
                session.metadata?.customer_email ??
                (session as unknown as { customer_details?: { email?: string } }).customer_details?.email ??
                "Unknown";
              const mrr = PLAN_PRICE[plan] ?? 0;
              const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
              await notifyFn({
                title: `New ${planLabel} subscriber`,
                content: `${customerName} (${customerEmail}) just subscribed to the ${planLabel} plan ($${mrr}/mo). Check your Admin Dashboard for full details.`,
              });
            } catch {
              // non-fatal
            }
          }
        } else if (event.type === "customer.subscription.deleted") {
          const sub = event.data.object as Stripe.Subscription;
          try {
            await notifyFn({
              title: "Subscription canceled",
              content: `A subscriber (Stripe customer ${sub.customer}) has canceled their subscription. Review the Admin Dashboard → Customers tab for details.`,
            });
          } catch {
            // non-fatal
          }
        }
      } catch {
        // swallow in test
      }

      res.json({ received: true });
    }
  );

  return app;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test_secret_key_for_unit_tests";

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
    metadata: { user_id: "42", plan: "pro", customer_name: "Alice Smith", customer_email: "alice@example.com" },
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
  let notifyMock: ReturnType<typeof vi.fn>;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    stripe = new Stripe("sk_test_placeholder_key", { apiVersion: "2026-03-25.dahlia" });
    upsertMock = vi.fn().mockResolvedValue(undefined);
    notifyMock = vi.fn().mockResolvedValue(true);
    app = buildWebhookApp(stripe, WEBHOOK_SECRET, upsertMock, notifyMock);
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
    // notifyOwner must NOT be called for test events
    expect(notifyMock).not.toHaveBeenCalled();
  });

  // ── 3. checkout.session.completed — upsert + notify ───────────────────────
  it("calls upsertSubscription AND notifyOwner when checkout.session.completed fires with valid metadata", async () => {
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

    // Subscription upserted
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, plan: "pro", status: "active" })
    );

    // Owner notified with correct plan and customer info
    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Pro subscriber",
        content: expect.stringContaining("Alice Smith"),
      })
    );
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("$49/mo"),
      })
    );
  });

  // ── 4. checkout.session.completed — missing user_id ───────────────────────
  it("does NOT call upsert or notify when user_id metadata is missing", async () => {
    const payload = makeCheckoutSessionEvent({ metadata: {} });
    const sig = makeHeader(stripe, payload);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", sig)
      .send(Buffer.from(payload));

    expect(res.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  // ── 5. customer.subscription.deleted — notify owner ───────────────────────
  it("calls notifyOwner with churn alert when customer.subscription.deleted fires", async () => {
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
    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Subscription canceled",
        content: expect.stringContaining("cus_test_customer"),
      })
    );
  });

  // ── 6. Unknown event type ──────────────────────────────────────────────────
  it("returns { received: true } for unhandled event types without calling notify", async () => {
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
    expect(notifyMock).not.toHaveBeenCalled();
  });

  // ── 7. notifyOwner failure is non-fatal ────────────────────────────────────
  it("still returns { received: true } even when notifyOwner throws", async () => {
    notifyMock.mockRejectedValueOnce(new Error("Notification service unavailable"));

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

    // Webhook must succeed even if notification fails
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(upsertMock).toHaveBeenCalledOnce();
  });
});
