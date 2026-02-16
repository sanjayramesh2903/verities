import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UserPreferencesSchema } from "@verities/shared";
import { requireAuth } from "../auth/auth-hook.js";

export async function preferencesRoutes(server: FastifyInstance) {
  // Get user preferences
  server.get("/preferences", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (!server.repo) {
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const prefs = await server.repo.getUserPreferences(user.id);
    return prefs;
  });

  // Update user preferences
  server.put("/preferences", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (!server.repo) {
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const parsed = UserPreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid preferences", details: parsed.error.issues });
    }

    await server.repo.upsertUserPreferences(user.id, {
      citationStyle: parsed.data.citationStyle,
      maxClaims: parsed.data.maxClaims,
    });

    return parsed.data;
  });
}
