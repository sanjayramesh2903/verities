import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { signToken } from "./jwt.js";

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export const googleOAuthPlugin = fp(async (server: FastifyInstance) => {
  // Redirect to Google consent screen
  server.get("/auth/google", async (_request: FastifyRequest, reply: FastifyReply) => {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // Handle OAuth callback
  server.get("/auth/google/callback", async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.status(400).send({ error: "Missing authorization code" });
    }

    try {
      // Exchange code for token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        server.log.error("Google token exchange failed: %d", tokenResponse.status);
        return reply.status(502).send({ error: "Authentication failed" });
      }

      const tokens: GoogleTokenResponse = await tokenResponse.json();

      // Fetch user profile
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return reply.status(502).send({ error: "Failed to fetch user profile" });
      }

      const profile: GoogleUserInfo = await userResponse.json();

      // Create or update user in database
      if (server.repo) {
        const user = await server.repo.findOrCreateUser({
          googleId: profile.sub,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.picture,
        });

        await server.repo.logAudit(user.id, "login", undefined, request.ip);

        const token = signToken(server, { sub: user.id, email: user.email });

        reply.setCookie("verities_token", token, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: env.NODE_ENV === "production" ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return reply.redirect(`${env.FRONTEND_URL}?login=success`);
      }

      return reply.status(503).send({ error: "Database unavailable" });
    } catch (err) {
      server.log.error(err, "OAuth callback error");
      return reply.redirect(`${env.FRONTEND_URL}?login=error`);
    }
  });
});
