import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUser } from "../auth/auth-hook.js";

export const requestLoggerPlugin = fp(async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request: FastifyRequest) => {
    request.log.info({
      event: "request_start",
      method: request.method,
      path: request.url,
      ip: request.ip,
      userId: getUser(request)?.id ?? null,
      requestId: request.id,
    });
  });

  server.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info({
      event: "request_end",
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTimeMs: Math.round(reply.elapsedTime),
      requestId: request.id,
      userId: getUser(request)?.id ?? null,
    });
  });
});

// Service-level logger factory
export function createServiceLogger(server: FastifyInstance, serviceName: string) {
  const logger = server.log.child({ service: serviceName });
  return {
    info: (data: Record<string, unknown>, msg?: string) => logger.info(data, msg),
    warn: (data: Record<string, unknown>, msg?: string) => logger.warn(data, msg),
    error: (data: Record<string, unknown>, msg?: string) => logger.error(data, msg),
    debug: (data: Record<string, unknown>, msg?: string) => logger.debug(data, msg),
  };
}
