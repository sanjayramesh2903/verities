import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { env } from "../config/env.js";

export const jwtPlugin = fp(async (server: FastifyInstance) => {
  await server.register(cookie);

  await server.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: "verities_token",
      signed: false,
    },
    sign: {
      expiresIn: env.JWT_EXPIRY,
    },
  });
});

export function signToken(server: FastifyInstance, payload: { sub: string; email: string }): string {
  return server.jwt.sign(payload);
}
