const tools = {
  "url-check": { slug: "url-check", name: "URL Check", description: "Validate and normalize a URL.", method: "GET" },
  "ip-info": { slug: "ip-info", name: "IP Info", description: "IP information provider integration endpoint.", method: "GET" },
  "headers": { slug: "headers", name: "HTTP Headers", description: "Return selected request headers.", method: "GET" }
};

export default function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "GET") {
    return Response.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } }, { status: 405 });
  }

  const pathname = new URL(request.url).pathname;
  const slug = pathname.split("/").filter(Boolean).pop();
  const tool = tools[slug];

  if (!tool) {
    return Response.json({ success: false, error: { code: "TOOL_NOT_FOUND", message: `Tool '${slug}' was not found.` } }, { status: 404 });
  }

  const data = { ...tool };
  if (slug === "headers") {
    data.headers = {
      userAgent: request.headers.get("user-agent"),
      contentType: request.headers.get("content-type"),
      accept: request.headers.get("accept"),
      host: request.headers.get("host")
    };
  }

  return Response.json({ success: true, data, timestamp: new Date().toISOString() });
}