import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { requireAuth } from "../auth/auth-hook.js";
import { env } from "../config/env.js";

const FREE_CHECKS_LIMIT = 5;
const FREE_REVIEWS_LIMIT = 3;
const PRO_CHECKS_LIMIT = 100;

// Lazily initialize Stripe so the server starts even without a key configured
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export async function billingRoutes(server: FastifyInstance) {
  // ── GET /usage ─────────────────────────────────────────────────────────────
  server.get("/usage", async (request, reply) => {
    const user = requireAuth(request);
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    const plan = await server.repo.getUserPlan(user.id);
    if (!plan) return reply.status(404).send({ error: "User not found" });

    const isPro = plan.planTier !== "free";
    return {
      planTier: plan.planTier,
      subscriptionStatus: plan.subscriptionStatus,
      checksUsed: plan.usageChecksThisMonth,
      checksLimit: isPro ? PRO_CHECKS_LIMIT : FREE_CHECKS_LIMIT,
      reviewsUsed: plan.usageReviewsThisMonth,
      reviewsLimit: isPro ? null : FREE_REVIEWS_LIMIT, // null = unlimited for Pro
      resetAt: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString(),
    };
  });

  // ── POST /auth/delete-account ──────────────────────────────────────────────
  server.post("/auth/delete-account", async (request, reply) => {
    const user = requireAuth(request);
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    await server.repo.softDeleteUser(user.id);

    reply.clearCookie("verities_token", {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    });

    server.repo.logAudit(user.id, "delete_account", undefined, request.ip).catch(() => {});

    return { ok: true };
  });

  // ── POST /billing/create-checkout ──────────────────────────────────────────
  server.post("/billing/create-checkout", async (request, reply) => {
    const user = requireAuth(request);
    const stripe = getStripe();

    if (!stripe) return reply.status(503).send({ error: "Billing is not configured" });
    if (!env.STRIPE_PRO_PRICE_ID) return reply.status(503).send({ error: "Pro price not configured" });
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    const dbUser = await server.repo.findUserById(user.id);
    const stripeCustomerId = dbUser?.stripeCustomerId ?? undefined;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      customer_creation: stripeCustomerId ? undefined : "always",
      customer_email: stripeCustomerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/pricing`,
      metadata: { userId: user.id },
    });

    return { url: session.url };
  });

  // ── POST /billing/portal ───────────────────────────────────────────────────
  server.post("/billing/portal", async (request, reply) => {
    const user = requireAuth(request);
    const stripe = getStripe();

    if (!stripe) return reply.status(503).send({ error: "Billing is not configured" });
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    const dbUser = await server.repo.findUserById(user.id);
    if (!dbUser?.stripeCustomerId) {
      return reply.status(400).send({ error: "No billing account found. Please subscribe first." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/profile`,
    });

    return { url: session.url };
  });

  // ── POST /billing/webhooks ────────────────────────────────────────────────
  // Stripe requires the raw (unparsed) request body for signature verification.
  // We scope this route inside its own plugin so the content-type parser override
  // only affects this one endpoint and leaves the rest as normal JSON.
  server.register(async function webhookPlugin(app) {
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
      done(null, body);
    });

    app.post("/billing/webhooks", async (request, reply) => {
      const stripe = getStripe();
      if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
        return reply.status(503).send({ error: "Webhook not configured" });
      }

      const sig = request.headers["stripe-signature"];
      if (!sig) return reply.status(400).send({ error: "Missing stripe-signature header" });

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          sig as string,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        server.log.warn(`Stripe webhook signature failed: ${(err as Error).message}`);
        return reply.status(400).send({ error: "Invalid signature" });
      }

      // Acknowledge receipt immediately — process in the same request (small events)
      if (!server.repo) {
        server.log.error("Stripe webhook received but no DB — acknowledging without processing");
        return { received: true };
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            if (userId && session.customer && session.subscription) {
              await server.repo.upsertStripeCustomer(
                userId,
                session.customer as string,
                session.subscription as string,
                "pro",
                "active"
              );
              await server.repo.resetMonthlyUsage(userId);
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            await server.repo.updateSubscriptionStatus(sub.customer as string, {
              subscriptionStatus: sub.status,
              stripeSubscriptionId: sub.id,
            });
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            await server.repo.updateSubscriptionStatus(sub.customer as string, {
              planTier: "free",
              subscriptionStatus: "cancelled",
            });
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            if (invoice.customer) {
              await server.repo.updateSubscriptionStatus(invoice.customer as string, {
                subscriptionStatus: "past_due",
              });
            }
            break;
          }
        }
      } catch (err) {
        server.log.error(err, `Stripe webhook handler error for ${event.type}`);
        // Return 200 anyway — Stripe would retry and we don't want duplicate processing
      }

      return { received: true };
    });
  });

  // ── GET /reports/share/:checkId ────────────────────────────────────────────
  server.get<{ Params: { checkId: string } }>("/reports/share/:checkId", async (request, reply) => {
    const user = requireAuth(request);
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    const { checkId } = request.params;
    const check = await server.repo.getCheckById(user.id, checkId);
    if (!check) return reply.status(404).send({ error: "Check not found" });

    const report = await server.repo.createSharedReport(user.id, checkId);
    const shareUrl = `${env.FRONTEND_URL}/report/${report.shareToken}`;

    return {
      shareUrl,
      shareToken: report.shareToken,
      expiresAt: report.expiresAt,
    };
  });

  // ── GET /reports/public/:shareToken ───────────────────────────────────────
  server.get<{ Params: { shareToken: string } }>("/reports/public/:shareToken", async (request, reply) => {
    if (!server.repo) return reply.status(503).send({ error: "Database unavailable" });

    const { shareToken } = request.params;
    const report = await server.repo.getSharedReport(shareToken);

    if (!report) return reply.status(404).send({ error: "Report not found" });
    if (new Date() > new Date(report.expiresAt)) {
      return reply.status(410).send({ error: "This shared report has expired" });
    }

    return {
      checkId: report.check.id,
      type: report.check.type,
      createdAt: report.check.createdAt.toISOString(),
      inputSnippet: report.check.inputSnippet,
      result: JSON.parse(report.check.resultJson),
      expiresAt: report.expiresAt,
    };
  });
}
