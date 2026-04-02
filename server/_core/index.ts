import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSocialOAuthRoutes } from "../socialOAuthRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initScheduler } from "../scheduler";
import Stripe from "stripe";
import { upsertSubscription } from "../db";
import { notifyOwner } from "./notification";
import { ensureReferralCoupon, processReferralOnCheckout } from "../referralCredit";

const PLAN_PRICE: Record<string, number> = { free: 0, pro: 49, agency: 149 };

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Stripe Webhook ─────────────────────────────────────────────────────────
  // MUST be registered BEFORE express.json() to receive the raw body
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-03-25.dahlia" });
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      return res.status(400).send("Webhook Error");
    }

    // Test event detection — required for Stripe webhook verification flow
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Webhook] Event: ${event.type} (${event.id})`);

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.user_id ?? "0");
        const plan = (session.metadata?.plan ?? "free") as "free" | "pro" | "agency";
        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
          await upsertSubscription({
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripePriceId: sub.items.data[0]?.price?.id,
            plan,
            status: "active",
            currentPeriodEnd: new Date(periodEnd * 1000),
          });
          console.log(`[Webhook] Subscription activated for user ${userId} on plan ${plan}`);

          // Process referral credit for the buyer (if they were referred)
          try {
            await processReferralOnCheckout(stripe, userId);
          } catch (refErr) {
            console.error("[Webhook] Referral credit processing failed:", refErr);
          }

          // Notify owner of new paid subscription
          try {
            const customerName = session.metadata?.customer_name ?? session.customer_details?.name ?? "Unknown";
            const customerEmail = session.metadata?.customer_email ?? session.customer_details?.email ?? "Unknown";
            const mrr = PLAN_PRICE[plan] ?? 0;
            await notifyOwner({
              title: `New ${plan.charAt(0).toUpperCase() + plan.slice(1)} subscriber`,
              content: `${customerName} (${customerEmail}) just subscribed to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan ($${mrr}/mo). Check your Admin Dashboard for full details.`,
            });
          } catch (notifyErr) {
            console.error("[Webhook] Failed to send owner notification:", notifyErr);
          }
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[Webhook] Subscription canceled for customer ${sub.customer}`);
        // Notify owner of cancellation
        try {
          await notifyOwner({
            title: "Subscription canceled",
            content: `A subscriber (Stripe customer ${sub.customer}) has canceled their subscription. Review the Admin Dashboard → Customers tab for details.`,
          });
        } catch (notifyErr) {
          console.error("[Webhook] Failed to send cancellation notification:", notifyErr);
        }
        // Downgrade to free — would need to look up userId by customerId in a production system
      }
    } catch (err) {
      console.error("[Webhook] Error processing event:", err);
    }

    res.json({ received: true });
  });

  // ── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Social platform OAuth callbacks (Twitter, LinkedIn, Instagram)
  registerSocialOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Initialize cron scheduler after server starts
  initScheduler().catch((err) => console.error("[Scheduler] Init failed:", err));
  // Ensure the referral reward coupon exists in Stripe (idempotent)
  ensureReferralCoupon(stripe).catch((err) => console.error("[Referral] Coupon init failed:", err));
}

startServer().catch(console.error);
