export default function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  return Response.json({
    success: true,
    api: "Cyberind REST API",
    version: "v1",
    base_url: "https://api.cyberind.my.id/api/v1",
    endpoints: [
      "GET /api/v1",
      "GET /api/v1/tools",
      "GET /api/v1/tools/:slug"
    ],
    timestamp: new Date().toISOString()
  });
}