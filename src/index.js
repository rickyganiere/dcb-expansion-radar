import { SOURCE_REGISTRY } from "./source-registry.js";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function normalizeSourceText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
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
      "user-agent": "DCB-Expansion-Radar/0.3 source-monitor",
      "accept": "text/html,application/xhtml+xml"
    }
  });

  const raw = await response.text();
  const normalized = normalizeSourceText(raw);
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
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

async function getAccessIdentity(ctx) {
  if (!ctx?.access) return null;
  try {
    const identity = await ctx.access.getIdentity();
    const email = String(identity?.email || "").trim().toLowerCase();
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}

function cleanStringArray(value, maxItems = 100) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v || "").trim()).filter(Boolean))].slice(0, maxItems);
}

function cleanRecord(value, maxItems = 500) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, maxItems));
}

function normalizeWorkspace(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    schemaVersion: 1,
    shortlist: cleanStringArray(source.shortlist, 100),
    compare: cleanStringArray(source.compare, 3),
    pipeline: cleanRecord(source.pipeline, 500),
    notes: cleanRecord(source.notes, 100),
    sourceWatch: cleanRecord(source.sourceWatch, 200)
  };
}

function workspaceIsEmpty(workspace) {
  return !workspace.shortlist.length &&
    !workspace.compare.length &&
    !Object.keys(workspace.pipeline).length &&
    !Object.keys(workspace.notes).length &&
    !Object.keys(workspace.sourceWatch).length;
}

async function requireWorkspaceContext(env, ctx) {
  if (!env.RADAR_DB) {
    return {
      response: json({
        ok: false,
        error: "d1_not_configured",
        message: "Cloudflare D1 is not bound yet."
      }, { status: 503 })
    };
  }

  const identity = await getAccessIdentity(ctx);
  if (!identity) {
    return {
      response: json({
        ok: false,
        error: "access_required",
        message: "Cloudflare Access authentication is required for workspace persistence."
      }, { status: 401 })
    };
  }

  return { db: env.RADAR_DB, identity };
}

async function getWorkspace(env, ctx) {
  const gate = await requireWorkspaceContext(env, ctx);
  if (gate.response) return gate.response;

  const row = await gate.db
    .prepare("SELECT payload_json, version, updated_at FROM workspace_state WHERE user_id = ?1 LIMIT 1")
    .bind(gate.identity.email)
    .first();

  if (!row) {
    return json({
      ok: true,
      configured: true,
      user: gate.identity.email,
      exists: false,
      version: 0,
      updatedAt: null,
      workspace: normalizeWorkspace({})
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(row.payload_json);
  } catch {
    return json({ ok: false, error: "workspace_corrupt" }, { status: 500 });
  }

  return json({
    ok: true,
    configured: true,
    user: gate.identity.email,
    exists: true,
    version: Number(row.version || 1),
    updatedAt: row.updated_at,
    workspace: normalizeWorkspace(parsed)
  });
}

async function putWorkspace(request, env, ctx) {
  const gate = await requireWorkspaceContext(env, ctx);
  if (gate.response) return gate.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const workspace = normalizeWorkspace(body?.workspace);
  const payloadJson = JSON.stringify(workspace);
  if (payloadJson.length > 350000) {
    return json({ ok: false, error: "workspace_too_large" }, { status: 413 });
  }

  const expectedVersion = body?.expectedVersion == null ? null : Number(body.expectedVersion);
  if (expectedVersion != null && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    return json({ ok: false, error: "invalid_version" }, { status: 400 });
  }

  const existing = await gate.db
    .prepare("SELECT version FROM workspace_state WHERE user_id = ?1 LIMIT 1")
    .bind(gate.identity.email)
    .first();

  const now = new Date().toISOString();

  if (!existing) {
    if (expectedVersion != null && expectedVersion !== 0) {
      return json({ ok: false, error: "version_conflict", currentVersion: 0 }, { status: 409 });
    }

    await gate.db
      .prepare(`INSERT INTO workspace_state
        (user_id, payload_json, version, created_at, updated_at)
        VALUES (?1, ?2, 1, ?3, ?3)`)
      .bind(gate.identity.email, payloadJson, now)
      .run();

    return json({
      ok: true,
      user: gate.identity.email,
      version: 1,
      updatedAt: now,
      empty: workspaceIsEmpty(workspace)
    });
  }

  const currentVersion = Number(existing.version || 1);
  if (expectedVersion != null && expectedVersion !== currentVersion) {
    return json({ ok: false, error: "version_conflict", currentVersion }, { status: 409 });
  }

  const nextVersion = currentVersion + 1;
  const result = await gate.db
    .prepare(`UPDATE workspace_state
      SET payload_json = ?1, version = ?2, updated_at = ?3
      WHERE user_id = ?4 AND version = ?5`)
    .bind(payloadJson, nextVersion, now, gate.identity.email, currentVersion)
    .run();

  if ((result?.meta?.changes || 0) !== 1) {
    const current = await gate.db
      .prepare("SELECT version FROM workspace_state WHERE user_id = ?1 LIMIT 1")
      .bind(gate.identity.email)
      .first();

    return json({
      ok: false,
      error: "version_conflict",
      currentVersion: Number(current?.version || currentVersion)
    }, { status: 409 });
  }

  return json({
    ok: true,
    user: gate.identity.email,
    version: nextVersion,
    updatedAt: now,
    empty: workspaceIsEmpty(workspace)
  });
}

async function workspaceStatus(env, ctx) {
  const identity = await getAccessIdentity(ctx);
  return json({
    ok: true,
    database: env.RADAR_DB ? "d1" : "not-configured",
    authenticated: Boolean(identity),
    user: identity?.email || null
  });
}

async function getSourceState(db) {
  const result = await db.prepare(`SELECT
      source_id, market_id, label, source_type, url,
      baseline_hash, last_hash, changed,
      last_http_status, last_duration_ms, last_title, last_error,
      checked_at, reviewed_at, reviewed_by, review_note
    FROM source_watch_state
    ORDER BY changed DESC, market_id ASC, label ASC`).all();

  return result?.results || [];
}

async function persistSourceSuccess(db, result, actor = "system") {
  const previous = await db
    .prepare("SELECT baseline_hash FROM source_watch_state WHERE source_id = ?1 LIMIT 1")
    .bind(result.id)
    .first();

  const baselineHash = previous?.baseline_hash || result.hash;
  const changed = baselineHash !== result.hash ? 1 : 0;
  const now = result.checkedAt || new Date().toISOString();

  const stateStatement = db.prepare(`INSERT INTO source_watch_state (
      source_id, market_id, label, source_type, url,
      baseline_hash, last_hash, changed,
      last_http_status, last_duration_ms, last_title, last_error,
      checked_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL, ?12, ?12)
    ON CONFLICT(source_id) DO UPDATE SET
      market_id = excluded.market_id,
      label = excluded.label,
      source_type = excluded.source_type,
      url = excluded.url,
      baseline_hash = excluded.baseline_hash,
      last_hash = excluded.last_hash,
      changed = excluded.changed,
      last_http_status = excluded.last_http_status,
      last_duration_ms = excluded.last_duration_ms,
      last_title = excluded.last_title,
      last_error = NULL,
      checked_at = excluded.checked_at,
      updated_at = excluded.updated_at`)
    .bind(
      result.id,
      result.marketId,
      result.label,
      result.type,
      result.url,
      baselineHash,
      result.hash,
      changed,
      result.status,
      result.durationMs,
      result.title,
      now
    );

  const historyStatement = db.prepare(`INSERT INTO source_watch_history (
      source_id, content_hash, changed, http_status, duration_ms,
      title, error, actor, checked_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8)`)
    .bind(
      result.id,
      result.hash,
      changed,
      result.status,
      result.durationMs,
      result.title,
      actor,
      now
    );

  if (typeof db.batch === "function") {
    await db.batch([stateStatement, historyStatement]);
  } else {
    await stateStatement.run();
    await historyStatement.run();
  }

  await db.prepare(`DELETE FROM source_watch_history
    WHERE source_id = ?1
      AND id NOT IN (
        SELECT id FROM source_watch_history
        WHERE source_id = ?1
        ORDER BY checked_at DESC, id DESC
        LIMIT 50
      )`)
    .bind(result.id)
    .run();

  return { baselineHash, changed: Boolean(changed) };
}

async function persistSourceFailure(db, id, entry, error, actor = "system") {
  const now = new Date().toISOString();
  const message = String(error?.message || error || "source_check_failed").slice(0, 500);

  await db.prepare(`INSERT INTO source_watch_state (
      source_id, market_id, label, source_type, url,
      changed, last_error, checked_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?7)
    ON CONFLICT(source_id) DO UPDATE SET
      market_id = excluded.market_id,
      label = excluded.label,
      source_type = excluded.source_type,
      url = excluded.url,
      last_error = excluded.last_error,
      checked_at = excluded.checked_at,
      updated_at = excluded.updated_at`)
    .bind(id, entry.marketId, entry.label, entry.type, entry.url, message, now)
    .run();

  const current = await db
    .prepare("SELECT changed FROM source_watch_state WHERE source_id = ?1 LIMIT 1")
    .bind(id)
    .first();

  await db.prepare(`INSERT INTO source_watch_history (
      source_id, content_hash, changed, http_status, duration_ms,
      title, error, actor, checked_at
    ) VALUES (?1, NULL, ?2, NULL, NULL, NULL, ?3, ?4, ?5)`)
    .bind(id, Number(current?.changed || 0), message, actor, now)
    .run();

  return { error: message };
}

async function checkSourceById(id, env, actor = "manual") {
  const entry = SOURCE_REGISTRY[id];
  if (!entry) throw new Error("unknown_source");

  try {
    const result = await inspectSource(id, entry);
    if (env.RADAR_DB) {
      const persisted = await persistSourceSuccess(env.RADAR_DB, result, actor);
      return { ...result, persisted: true, centralChanged: persisted.changed };
    }
    return { ...result, persisted: false };
  } catch (error) {
    if (env.RADAR_DB) {
      await persistSourceFailure(env.RADAR_DB, id, entry, error, actor);
    }
    throw error;
  }
}

async function runAllSourceChecks(env, actor = "system") {
  if (!env.RADAR_DB) {
    return { ok: false, error: "d1_not_configured", checked: 0, changed: 0, failed: 0 };
  }

  const ids = Object.keys(SOURCE_REGISTRY);
  const settled = await Promise.allSettled(ids.map(id => checkSourceById(id, env, actor)));

  let checked = 0;
  let changed = 0;
  let failed = 0;

  for (const item of settled) {
    if (item.status === "fulfilled") {
      checked += 1;
      if (item.value.centralChanged) changed += 1;
    } else {
      failed += 1;
    }
  }

  return {
    ok: failed === 0,
    checked,
    changed,
    failed,
    completedAt: new Date().toISOString()
  };
}

async function reviewSourceChange(request, env, ctx) {
  const gate = await requireWorkspaceContext(env, ctx);
  if (gate.response) return gate.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = String(body?.id || "");
  const action = String(body?.action || "");
  const note = String(body?.note || "").slice(0, 500);

  if (!SOURCE_REGISTRY[id]) {
    return json({ ok: false, error: "unknown_source" }, { status: 404 });
  }
  if (action !== "accept") {
    return json({ ok: false, error: "unsupported_review_action" }, { status: 400 });
  }

  const row = await gate.db
    .prepare("SELECT last_hash FROM source_watch_state WHERE source_id = ?1 LIMIT 1")
    .bind(id)
    .first();

  if (!row?.last_hash) {
    return json({ ok: false, error: "source_not_checked" }, { status: 409 });
  }

  const now = new Date().toISOString();
  await gate.db.prepare(`UPDATE source_watch_state
    SET baseline_hash = last_hash,
        changed = 0,
        reviewed_at = ?1,
        reviewed_by = ?2,
        review_note = ?3,
        updated_at = ?1
    WHERE source_id = ?4`)
    .bind(now, gate.identity.email, note, id)
    .run();

  return json({
    ok: true,
    id,
    changed: false,
    reviewedAt: now,
    reviewedBy: gate.identity.email
  });
}

async function sourceWatchHistory(url, env) {
  if (!env.RADAR_DB) {
    return json({ ok: false, error: "d1_not_configured" }, { status: 503 });
  }

  const id = String(url.searchParams.get("id") || "");
  if (!SOURCE_REGISTRY[id]) {
    return json({ ok: false, error: "unknown_source" }, { status: 404 });
  }

  const result = await env.RADAR_DB.prepare(`SELECT
      id, source_id, content_hash, changed, http_status,
      duration_ms, title, error, actor, checked_at
    FROM source_watch_history
    WHERE source_id = ?1
    ORDER BY checked_at DESC, id DESC
    LIMIT 20`)
    .bind(id)
    .all();

  return json({ ok: true, id, history: result?.results || [] });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const identity = await getAccessIdentity(ctx);
      return json({
        ok: true,
        service: "dcb-expansion-radar",
        runtime: "cloudflare-workers",
        backend: {
          api: "online",
          database: env.RADAR_DB ? "d1" : "not-configured",
          persistence: env.RADAR_DB ? "d1" : "local-browser",
          sourceWatchPersistence: env.RADAR_DB ? "d1" : "local-browser",
          accessAuthenticated: Boolean(identity)
        },
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/workspace/status" && request.method === "GET") {
      return workspaceStatus(env, ctx);
    }

    if (url.pathname === "/api/workspace" && request.method === "GET") {
      return getWorkspace(env, ctx);
    }

    if (url.pathname === "/api/workspace" && request.method === "PUT") {
      return putWorkspace(request, env, ctx);
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

    if (url.pathname === "/api/source-watch/state" && request.method === "GET") {
      if (!env.RADAR_DB) {
        return json({ ok: false, error: "d1_not_configured" }, { status: 503 });
      }
      return json({ ok: true, state: await getSourceState(env.RADAR_DB) });
    }

    if (url.pathname === "/api/source-watch/history" && request.method === "GET") {
      return sourceWatchHistory(url, env);
    }

    if (url.pathname === "/api/source-watch/review" && request.method === "POST") {
      return reviewSourceChange(request, env, ctx);
    }

    if (url.pathname === "/api/source-watch/run" && request.method === "POST") {
      const gate = await requireWorkspaceContext(env, ctx);
      if (gate.response) return gate.response;
      return json(await runAllSourceChecks(env, gate.identity.email));
    }

    if (url.pathname === "/api/check-source" && request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id || !SOURCE_REGISTRY[id]) {
        return json({ ok: false, error: "unknown_source" }, { status: 404 });
      }

      const identity = await getAccessIdentity(ctx);
      if (env.RADAR_DB && !identity) {
        return json({
          ok: false,
          error: "access_required",
          message: "Cloudflare Access authentication is required for persistent source checks."
        }, { status: 401 });
      }

      try {
        return json(await checkSourceById(id, env, identity?.email || "manual"));
      } catch (error) {
        const entry = SOURCE_REGISTRY[id];
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
      const identity = await getAccessIdentity(ctx);
      return json({
        product: "DCB Expansion Radar",
        phase: env.RADAR_DB ? "d1-workspace" : "interactive-mvp",
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
          "source-watch",
          "source-watch-history",
          "d1-workspace-sync",
          "scheduled-source-checks-ready"
        ],
        nextBackendStep: !env.RADAR_DB
          ? "bind-d1-database"
          : !identity
            ? "enable-cloudflare-access"
            : "workspace-sync-ready"
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx) {
    if (!env.RADAR_DB) return;
    ctx.waitUntil(runAllSourceChecks(env, "cron"));
  }
};
