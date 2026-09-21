import { SOURCE_REGISTRY } from "./source-registry.js";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function normalizeSourceText(html) {
  return String(html || "")
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<!--([\\s\\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .slice(0, 750000);
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function inspectSource(id, entry) {
  const started = Date.now();
  const response = await fetch(entry.url, {
    redirect: "follow",
    headers: {
      "user-agent": "DCB-Expansion-Radar/0.1 source-monitor",
      "accept": "text/html,application/xhtml+xml"
    }
  });

  const raw = await response.text();
  const normalized = normalizeSourceText(raw);
  const titleMatch = raw.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
  const title = titleMatch ? normalizeSourceText(titleMatch[1]).slice(0, 180) : null;

  return {
    id,
    marketId: entry.marketId,
    label: entry.label,
    type: entry.type,
    url: entry.url,
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
    hash: await sha256(normalized),
    textLength: normalized.length,
    title,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started
  };
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

    if (url.pathname === "/api/sources" && request.method === "GET") {
      return json({
        sources: Object.entries(SOURCE_REGISTRY).map(([id, entry]) => ({
          id,
          marketId: entry.marketId,
          label: entry.label,
          type: entry.type,
          url: entry.url
        }))
      });
    }

    if (url.pathname === "/api/check-source" && request.method === "GET") {
      const id = url.searchParams.get("id");
      const entry = id ? SOURCE_REGISTRY[id] : null;
      if (!entry) return json({ ok: false, error: "unknown_source" }, { status: 404 });
      try {
        return json(await inspectSource(id, entry));
      } catch (error) {
        return json({
          ok: false,
          id,
          marketId: entry.marketId,
          label: entry.label,
          error: "source_check_failed",
          detail: String(error && error.message ? error.message : error),
          checkedAt: new Date().toISOString()
        }, { status: 502 });
      }
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
          "recheck-queue",
          "source-watch"
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