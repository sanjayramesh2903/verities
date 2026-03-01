import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUser } from "../auth/auth-hook.js";
import { env } from "../config/env.js";

// Free tier limits
const FREE_CHECKS_PER_MONTH = 5;
const FREE_REVIEWS_PER_MONTH = 3;

function isSameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Quota enforcement for authenticated users on the free tier.
 * Anonymous users are only subject to rate limiting (not monthly quotas).
 */
export async function enforceQuota(
  type: "check" | "review",
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const user = getUser(request);
  if (!user) return true; // Anonymous — let rate limiter handle them

  const repo = (request.server as FastifyInstance & { repo: unknown }).repo as
    | import("../db/repository.js").Repository
    | null;
  if (!repo) return true; // No DB — degrade gracefully

  const plan = await repo.getUserPlan(user.id).catch(() => null);
  if (!plan) return true; // Can't fetch plan — degrade gracefully

  // Pro users have no monthly quota (100 checks, unlimited reviews effectively)
  if (plan.planTier !== "free") return true;

  // Reset usage counters if we've rolled into a new calendar month
  const now = new Date();
  if (!isSameCalendarMonth(new Date(plan.usageResetAt), now)) {
    await repo.resetMonthlyUsage(user.id).catch(() => {});
    return true; // Just reset — allow this request
  }

  // Enforce free tier limits
  if (type === "check" && plan.usageChecksThisMonth >= FREE_CHECKS_PER_MONTH) {
    reply.status(402).send({
      error: "Free tier limit reached",
      message: `You've used all ${FREE_CHECKS_PER_MONTH} free fact-checks this month.`,
      upgrade_url: `${env.FRONTEND_URL}/pricing`,
      reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    });
    return false;
  }

  if (type === "review" && plan.usageReviewsThisMonth >= FREE_REVIEWS_PER_MONTH) {
    reply.status(402).send({
      error: "Free tier limit reached",
      message: `You've used all ${FREE_REVIEWS_PER_MONTH} free document reviews this month.`,
      upgrade_url: `${env.FRONTEND_URL}/pricing`,
      reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    });
    return false;
  }

  return true;
}

export const quotaPlugin = fp(async (_server: FastifyInstance) => {
  // Plugin registration placeholder — quota is enforced per-route via enforceQuota()
});
