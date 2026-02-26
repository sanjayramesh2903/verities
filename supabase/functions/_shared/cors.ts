export function getCorsHeaders(): Record<string, string> {
  const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": frontendUrl,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, PUT, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }
  return null;
}
