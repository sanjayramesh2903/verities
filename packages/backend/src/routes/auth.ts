import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth/auth-hook.js";
import { env } from "../config/env.js";

export async function authRoutes(server: FastifyInstance) {
  // Get current user — reads real profile from DB if available
  server.get("/auth/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request);

    if (server.repo) {
      const dbUser = await server.repo.findUserById(user.id).catch(() => null);
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName ?? null,
          avatarUrl: dbUser.avatarUrl ?? null,
          createdAt: dbUser.createdAt.toISOString(),
        };
      }
    }

    // Fallback to JWT-derived identity
    return {
      id: user.id,
      email: user.email,
      displayName: null,
      avatarUrl: null,
      createdAt: null,
    };
  });

  // Logout
  server.post("/auth/logout", async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("verities_token", {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    });
    return { ok: true };
  });
}
