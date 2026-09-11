import hostContract from "../host-contract.json";

export interface Env {
  ASSETS: Fetcher;
}

const spaRoutes = new Set<string>(["/", ...hostContract.spaRoutes]);

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(hostContract.headers)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname === "" ? "/" : url.pathname;

    if (spaRoutes.has(pathname)) {
      // Fetch "/" from ASSETS (not "/index.html"): with html_handling
      // drop-trailing-slash, "/index.html" 307s to "/" and loops via the Worker.
      const assetUrl = new URL("/", url);
      const assetResponse = await env.ASSETS.fetch(
        new Request(assetUrl, request),
      );
      return withSecurityHeaders(assetResponse);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  },
};
