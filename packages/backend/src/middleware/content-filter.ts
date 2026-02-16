import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// Patterns that should be blocked from input
const BLOCKED_INPUT_PATTERNS = [
  // Prompt injection attempts
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(?:a|an)\s+(?:unrestricted|jailbroken)/i,
  /system\s*:\s*you\s+are/i,
  /\bDAN\s+mode\b/i,
  // Script injection
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(?:load|error|click)\s*=/i,
  // SQL injection basics
  /(?:union\s+select|drop\s+table|;\s*delete\s+from)/i,
];

// Patterns blocked in output (safety net)
const BLOCKED_OUTPUT_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
];

function containsBlockedPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function getTextFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.text === "string") return b.text;
  return null;
}

export const contentFilterPlugin = fp(async (server: FastifyInstance) => {
  // Input filter
  server.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const text = getTextFromBody(request.body);
    if (text && containsBlockedPattern(text, BLOCKED_INPUT_PATTERNS)) {
      return reply.status(400).send({
        error: "Your input contains content that cannot be processed. Please revise and try again.",
      });
    }
  });

  // Output filter
  server.addHook("onSend", async (_request: FastifyRequest, reply: FastifyReply, payload: string) => {
    if (typeof payload === "string" && containsBlockedPattern(payload, BLOCKED_OUTPUT_PATTERNS)) {
      // Redact problematic content
      let cleaned = payload;
      for (const pattern of BLOCKED_OUTPUT_PATTERNS) {
        cleaned = cleaned.replace(pattern, "[redacted]");
      }
      return cleaned;
    }
    return payload;
  });
});
