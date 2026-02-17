import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { LIMITS } from "@verities/shared";
import { env } from "./config/env.js";
import { createCacheService } from "./cache/cache.js";
import { connectDb } from "./db/client.js";
import { createRepository } from "./db/repository.js";
import { jwtPlugin } from "./auth/jwt.js";
import { googleOAuthPlugin } from "./auth/google-oauth.js";
import { authHookPlugin, getUser } from "./auth/auth-hook.js";
import { contentFilterPlugin } from "./middleware/content-filter.js";
import { errorHandlerPlugin } from "./middleware/error-handler.js";
import { requestLoggerPlugin } from "./middleware/request-logger.js";
import { analyzeClaimsRoute } from "./routes/analyze-claims.js";
import { reviewDocumentRoute } from "./routes/review-document.js";
import { formatCitationRoute } from "./routes/format-citation.js";
import { authRoutes } from "./routes/auth.js";
import { historyRoutes } from "./routes/history.js";
import { preferencesRoutes } from "./routes/preferences.js";
import { graphRoute } from "./routes/graph.js";

const server = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
  },
  requestIdHeader: "x-request-id",
  genReqId: () => crypto.randomUUID(),
});

async function start() {
  // 1. Infrastructure: cache + database
  const cache = await createCacheService(env.REDIS_URL);
  server.decorate("cache", cache);

  const db = await connectDb();
  server.decorate("repo", db ? createRepository(db) : null);

  // 2. Core plugins
  await server.register(cors, { origin: true, credentials: true });

  // 3. Auth (registered before rate limiting so user identity is known)
  await server.register(jwtPlugin);
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    await server.register(googleOAuthPlugin);
  }
  await server.register(authHookPlugin);

  // 4. Rate limiting (uses user ID if authenticated, IP if anonymous)
  await server.register(rateLimit, {
    max: (req, _key) => {
      const user = getUser(req);
      return user ? LIMITS.RATE_LIMIT_AUTHENTICATED : LIMITS.RATE_LIMIT_ANONYMOUS;
    },
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      const user = getUser(req);
      return user?.id ?? req.ip;
    },
  });

  // 5. Middleware
  await server.register(requestLoggerPlugin);
  if (env.CONTENT_FILTER_ENABLED) {
    await server.register(contentFilterPlugin);
  }
  await server.register(errorHandlerPlugin);

  // 6. Health check
  server.get("/health", async () => ({
    status: "ok",
    database: db ? "connected" : "unavailable",
    cache: env.REDIS_URL ? "redis" : "in-memory",
  }));

  // 7. Routes
  await server.register(analyzeClaimsRoute, { prefix: "/" });
  await server.register(reviewDocumentRoute, { prefix: "/" });
  await server.register(formatCitationRoute, { prefix: "/" });
  await server.register(authRoutes, { prefix: "/" });
  await server.register(historyRoutes, { prefix: "/" });
  await server.register(preferencesRoutes, { prefix: "/" });
  await server.register(graphRoute, { prefix: "/" });

  // 8. Periodic cleanup of expired checks (every 6 hours)
  if (server.repo) {
    setInterval(() => {
      server.repo?.cleanExpiredChecks().catch((err: unknown) => server.log.error(err, "Cleanup failed"));
    }, 6 * 60 * 60 * 1000);
  }

  // 9. Graceful shutdown
  const shutdown = async () => {
    server.log.info("Shutting down...");
    await server.close();
    if (db) await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // 10. Start
  await server.listen({ port: env.PORT, host: "0.0.0.0" });
  server.log.info(`Verities API running on http://localhost:${env.PORT}`);
}

start().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
