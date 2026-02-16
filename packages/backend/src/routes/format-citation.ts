import { FastifyInstance } from "fastify";
import { FormatCitationRequestSchema } from "@verities/shared";
import { formatCitationFromUrl } from "../services/citations.js";

export async function formatCitationRoute(server: FastifyInstance) {
  server.post("/format-citation", async (request, reply) => {
    const parsed = FormatCitationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    const { source_url, style, format } = parsed.data;
    return formatCitationFromUrl(source_url, style, format);
  });
}
