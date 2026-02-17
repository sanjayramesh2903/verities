import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth/auth-hook.js";

export async function graphRoute(server: FastifyInstance) {
  // GET /graph — returns the authenticated user's concept graph across all checks
  server.get("/graph", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (!server.repo) {
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const graph = await server.repo.getUserGraph(user.id);
    return graph;
  });
}
