import { z } from "zod";
import { randomBytes } from "crypto";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database (Supabase Postgres in prod, SQLite for local dev)
  DATABASE_URL: z.string().default("file:./dev.db"),

  // Cache
  REDIS_URL: z.string().optional(),

  // LLM — Groq (free, no credit card: console.groq.com)
  GROQ_API_KEY: z.string().min(1),

  // Search — Brave Search API (optional; falls back to DuckDuckGo)
  // Free tier: 2,000 queries/month — get a key at api.search.brave.com
  BRAVE_API_KEY: z.string().optional(),

  // Billing — Stripe (optional; required when enabling paid tiers)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),

  // Email — Resend (optional; enables transactional emails)
  // Free tier: 100 emails/day — get a key at resend.com
  RESEND_API_KEY: z.string().optional(),

  // Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:3001/auth/google/callback"),
  JWT_SECRET: z.string().default(randomBytes(32).toString("hex")),
  JWT_EXPIRY: z.string().default("7d"),

  // Monitoring — Sentry (optional; enables error tracking)
  // Free tier at sentry.io
  SENTRY_DSN: z.string().optional(),

  // Features
  CONTENT_FILTER_ENABLED: z.coerce.boolean().default(true),

  // Frontend URL (for OAuth redirect)
  FRONTEND_URL: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  // Require JWT_SECRET in production — auto-generated secrets invalidate all sessions on restart
  if (result.data.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET must be explicitly set in production. Exiting.");
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
