const tools = [
  { slug: "url-check", name: "URL Check", description: "Basic URL validation and normalization.", method: "GET", status: "active" },
  { slug: "ip-info", name: "IP Info", description: "IP information endpoint placeholder for future provider integration.", method: "GET", status: "active" },
  { slug: "headers", name: "HTTP Headers", description: "Inspect request headers.", method: "GET", status: "active" }
];

export default function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "GET") {
    return Response.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } }, { status: 405 });
  }
  return Response.json({ success: true, count: tools.length, data: tools, timestamp: new Date().toISOString() });
}