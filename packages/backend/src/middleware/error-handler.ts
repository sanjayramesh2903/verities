import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export const errorHandlerPlugin = fp(async (server: FastifyInstance) => {
  server.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    // Log full error internally
    server.log.error({
      err: error,
      requestId,
      method: request.method,
      url: request.url,
    }, "Request error");

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        details: error.issues,
        request_id: requestId,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: "Invalid request",
        request_id: requestId,
      });
    }

    const statusCode = error.statusCode ?? 500;

    // Auth errors
    if (statusCode === 401) {
      return reply.status(401).send({
        error: "Authentication required",
        request_id: requestId,
      });
    }

    // Rate limit
    if (statusCode === 429) {
      return reply.status(429).send({
        error: "Too many requests. Please try again later.",
        request_id: requestId,
      });
    }

    // Service errors (LLM, Search API failures)
    if (statusCode >= 502 && statusCode <= 504) {
      return reply.status(502).send({
        error: "Service temporarily unavailable. Please try again.",
        request_id: requestId,
      });
    }

    // Generic internal error — never leak details
    return reply.status(500).send({
      error: "An internal error occurred",
      request_id: requestId,
    });
  });
});
