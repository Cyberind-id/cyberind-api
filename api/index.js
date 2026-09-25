export default function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  return Response.json({
    success: true,
    name: "Cyberind REST API",
    version: "1.0.0",
    status: "online",
    message: "Cyberind.id API is running.",
    endpoints: {
      health: "/api/health",
      version: "/api/v1",
      tools: "/api/v1/tools"
    },
    timestamp: new Date().toISOString()
  });
}