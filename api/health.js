export default function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  return Response.json({
    success: true,
    status: "ok",
    service: "cyberind-rest-api",
    uptime: "serverless",
    timestamp: new Date().toISOString()
  });
}