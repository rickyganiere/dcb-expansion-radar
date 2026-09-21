function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "dcb-expansion-radar",
        runtime: "cloudflare-workers",
        backend: {
          api: "online",
          database: env.SUPABASE_URL ? "configured" : "not-configured",
          persistence: env.SUPABASE_URL ? "supabase" : "local-browser"
        },
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/status") {
      return json({
        product: "DCB Expansion Radar",
        phase: "interactive-mvp",
        markets: 6,
        capabilities: [
          "market-search",
          "market-filters",
          "market-compare",
          "shortlist",
          "billing-rail-intelligence",
          "decision-maker-map",
          "outreach-drafts",
          "local-pipeline",
          "signals",
          "recheck-queue"
        ],
        nextBackendStep: env.SUPABASE_URL
          ? "connect-persistence"
          : "configure-supabase-when-approved"
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};