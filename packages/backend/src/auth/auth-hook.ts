import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

interface AuthUser {
  id: string;
  email: string;
}

export const authHookPlugin = fp(async (server: FastifyInstance) => {
  // Global preHandler: optionally decode JWT, never blocks
  server.addHook("onRequest", async (request: FastifyRequest) => {
    // Default: anonymous
    (request as unknown as Record<string, unknown>).verities_user = null;

    try {
      // Try cookie first, then Authorization header
      const token =
        (request as unknown as { cookies?: Record<string, string> }).cookies?.verities_token ??
        request.headers.authorization?.replace("Bearer ", "");

      if (!token) return;

      const decoded = server.jwt.verify<{ sub: string; email: string }>(token);
      (request as unknown as Record<string, unknown>).verities_user = { id: decoded.sub, email: decoded.email };
    } catch {
      // Invalid token — treat as anonymous
    }
  });
});

// Get user from request (returns null if anonymous)
export function getUser(request: FastifyRequest): AuthUser | null {
  return (request as unknown as Record<string, unknown>).verities_user as AuthUser | null;
}

// Helper to require authentication in routes — throws 401 if not logged in
export function requireAuth(request: FastifyRequest): AuthUser {
  const user = getUser(request);
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }
  return user;
}
