import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth/auth-hook.js";

export async function authRoutes(server: FastifyInstance) {
  // Get current user
  server.get("/auth/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    // Return the JWT-derived identity
    // Full profile would require DB, but basic info is in the token
    return {
      id: user.id,
      email: user.email,
      displayName: null,
      avatarUrl: null,
    };
  });

  // Logout
  server.post("/auth/logout", async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("verities_token", { path: "/" });
    return { ok: true };
  });
}
