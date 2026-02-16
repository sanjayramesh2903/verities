import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth/auth-hook.js";

export async function historyRoutes(server: FastifyInstance) {
  // Get check history (paginated)
  server.get("/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (!server.repo) {
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(Math.max(parseInt(query.limit ?? "20", 10) || 20, 1), 50);
    const offset = Math.max(parseInt(query.offset ?? "0", 10) || 0, 0);

    const result = await server.repo.getCheckHistory(user.id, limit, offset);

    return {
      checks: result.checks,
      total: result.total,
      offset,
      limit,
    };
  });

  // Get single check by ID
  server.get("/history/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (!server.repo) {
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const { id } = request.params as { id: string };
    const check = await server.repo.getCheckById(user.id, id);

    if (!check) {
      return reply.status(404).send({ error: "Check not found" });
    }

    return {
      id: check.id,
      type: check.type,
      inputSnippet: check.inputSnippet,
      claimCount: check.claimCount,
      createdAt: check.createdAt,
      result: JSON.parse(check.resultJson),
    };
  });
}
