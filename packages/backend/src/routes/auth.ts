import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth/auth-hook.js";
import { signToken } from "../auth/jwt.js";
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
      sameSite: "lax",
    });
    return { ok: true };
  });

  // Dev-only login — disabled in production, allows testing without Google OAuth
  if (env.NODE_ENV !== "production") {
    server.post<{ Body: { email: string } }>(
      "/auth/dev-login",
      {
        schema: {
          body: {
            type: "object",
            required: ["email"],
            properties: { email: { type: "string" } },
          },
        },
      },
      async (request, reply) => {
        if (!server.repo) {
          return reply.status(503).send({ error: "Database not available" });
        }
        const { email } = request.body;
        const user = await server.repo.findOrCreateUser({
          googleId: `dev:${email}`,
          email,
          displayName: email.split("@")[0],
        });
        const token = signToken(server, { sub: user.id, email: user.email });
        reply.setCookie("verities_token", token, {
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
        return { ok: true };
      }
    );
  }
}
