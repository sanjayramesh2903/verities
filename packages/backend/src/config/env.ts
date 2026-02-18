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

  // Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:3001/auth/google/callback"),
  JWT_SECRET: z.string().default(randomBytes(32).toString("hex")),
  JWT_EXPIRY: z.string().default("7d"),

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
  // Warn if JWT_SECRET is auto-generated in non-dev environments
  if (result.data.NODE_ENV !== "development" && !process.env.JWT_SECRET) {
    console.warn(
      "[SECURITY] JWT_SECRET not set — using auto-generated secret. " +
      "All sessions will be invalidated on restart. Set JWT_SECRET in your environment."
    );
  }
  return result.data;
}

export const env = loadEnv();
