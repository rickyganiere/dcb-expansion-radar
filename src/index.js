import { SOURCE_REGISTRY } from "./source-registry.js";
import { getVerifiedAccessIdentity, enforcePinnedAudience } from "./access-auth.js";

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

function looksLikeChallengePage(title, normalizedText) {
  const haystack = (String(title || "") + " " + String(normalizedText || "").slice(0, 3000)).toLowerCase();
  const markers = [
    "challenge validation",
    "just a moment",
    "verify you are human",
    "checking your browser",
    "attention required",
    "security check",
    "robot check",
    "access denied"
  ];
  return markers.some(marker => haystack.includes(marker));
}

const hostReadyAt = new Map();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHostSlot(url) {
  const host = new URL(url).hostname;
  const now = Date.now();
  const readyAt = hostReadyAt.get(host) || 0;
  const startAt = Math.max(now, readyAt);
  hostReadyAt.set(host, startAt + 900);

  const delay = startAt - now;
  if (delay > 0) await wait(delay);
}

function retryDelayMs(response, attempt) {
  const raw = response?.headers?.get("retry-after");

  if (raw && /^\d+$/.test(raw)) {
    return Math.min(Number(raw) * 1000, 5000);
  }

  if (raw) {
    const retryAt = Date.parse(raw);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, Math.min(retryAt - Date.now(), 5000));
    }
  }

  return Math.min(750 * (attempt + 1), 2500);
}

async function fetchMonitoredSource(url) {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForHostSlot(url);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "DCB-Expansion-Radar/0.4 source-monitor",
          "accept": "text/html,application/xhtml+xml"
        }
      });

      lastResponse = response;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 2) return response;

      const delay = retryDelayMs(response, attempt);
      try {
        await response.body?.cancel();
      } catch {
        // Best-effort connection cleanup before retry.
      }
      await wait(delay);
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await wait(Math.min(750 * (attempt + 1), 2500));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("source_fetch_failed");
}

async function readResponseTextLimited(response, maxBytes = 2_000_000) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    try { await response.body?.cancel(); } catch {}
    throw new Error("Source content exceeds 2 MB limit");
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("Source content exceeds 2 MB limit");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Source content exceeds 2 MB limit");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

function attachInspectionMetadata(error, response, started) {
  error.httpStatus = response?.status ?? null;
  error.durationMs = Date.now() - started;
  return error;
}

async function inspectSource(id, entry) {
  const started = Date.now();
  const response = await fetchMonitoredSource(entry.url);

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const allowedContentType =
    !contentType ||
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml+xml") ||
    contentType.includes("text/plain");

  if (response.ok && !allowedContentType) {
    try { await response.body?.cancel(); } catch {}
    throw attachInspectionMetadata(
      new Error("Unsupported source content type"),
      response,
      started
    );
  }

  let raw;
  try {
    raw = await readResponseTextLimited(response);
  } catch (error) {
    throw attachInspectionMetadata(error, response, started);
  }
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
    blocked: looksLikeChallengePage(title, normalized),
    status: response.status,
    finalUrl: response.url,
    hash: await sha256(normalized),
    textLength: normalized.length,
    title,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started
  };
}

async function getSchemaVersion(db) {
  if (!db) return 0;
  try {
    const row = await db
      .prepare("SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1")
      .first();
    const version = Number(row?.value || 0);
    return Number.isFinite(version) ? version : 0;
  } catch {
    return 0;
  }
}

function migrationRequired(version, required = 3) {
  return json({
    ok: false,
    error: "migration_required",
    currentSchemaVersion: version,
    requiredSchemaVersion: required,
    message: "D1 schema migration is required before this feature can be used."
  }, { status: 503 });
}

const ALLOWED_SOURCE_MARKETS = new Set(
  Object.values(SOURCE_REGISTRY).map(entry => entry.marketId)
);
const ALLOWED_SOURCE_TYPES = new Set([
  "billing_route",
  "market_update",
  "corporate_change",
  "partner_update",
  "operator_update"
]);
const ALLOWED_SOURCE_CADENCES = new Set([12, 24, 72, 168]);
const ALLOWED_SOURCE_PRIORITIES = new Set(["high", "medium", "low"]);

function coreSourceCatalog() {
  return Object.fromEntries(
    Object.entries(SOURCE_REGISTRY).map(([id, entry]) => [id, {
      ...entry,
      id,
      enabled: true,
      origin: "core",
      editable: false,
      createdBy: null,
      createdAt: null,
      updatedAt: null
    }])
  );
}

function managedSourceRowToEntry(row) {
  return {
    id: row.source_id,
    marketId: row.market_id,
    label: row.label,
    url: row.url,
    type: row.source_type,
    cadenceHours: Number(row.cadence_hours || 24),
    priority: row.priority || "medium",
    enabled: Number(row.enabled) === 1,
    origin: row.origin || "manual",
    editable: true,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

async function loadSourceCatalog(db, { includeDisabled = false } = {}) {
  const catalog = coreSourceCatalog();
  if (!db || await getSchemaVersion(db) < 4) return catalog;

  const sql = `SELECT
      source_id, market_id, label, url, source_type,
      cadence_hours, priority, enabled, origin,
      created_by, created_at, updated_at
    FROM monitored_sources
    ${includeDisabled ? "" : "WHERE enabled = 1"}
    ORDER BY created_at ASC, source_id ASC`;

  const result = await db.prepare(sql).all();
  for (const row of result?.results || []) {
    if (catalog[row.source_id]) continue;
    catalog[row.source_id] = managedSourceRowToEntry(row);
  }

  return catalog;
}

async function findSourceEntry(id, db, options = {}) {
  const catalog = await loadSourceCatalog(db, options);
  return catalog[id] || null;
}

function normalizeManagedSourceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2048) throw new Error("invalid_source_url");

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_source_url");
  }

  if (parsed.protocol !== "https:") throw new Error("source_url_must_use_https");
  if (parsed.username || parsed.password) throw new Error("source_url_credentials_not_allowed");
  if (parsed.port && parsed.port !== "443") throw new Error("source_url_custom_port_not_allowed");

  const host = parsed.hostname.toLowerCase();
  const blockedSuffixes = [".local", ".internal", ".lan", ".localhost"];
  const looksLikeIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const looksLikeIpv6 = host.includes(":");

  if (
    !host.includes(".") ||
    host === "localhost" ||
    looksLikeIpv4 ||
    looksLikeIpv6 ||
    blockedSuffixes.some(suffix => host.endsWith(suffix))
  ) {
    throw new Error("source_url_host_not_allowed");
  }

  parsed.hash = "";
  return parsed.toString();
}

function normalizeManagedSourceInput(input, existing = {}) {
  const marketId = String(input?.marketId ?? existing.marketId ?? "").trim();
  const label = String(input?.label ?? existing.label ?? "").trim();
  const type = String(input?.type ?? existing.type ?? "").trim();
  const cadenceHours = Number(input?.cadenceHours ?? existing.cadenceHours ?? 24);
  const priority = String(input?.priority ?? existing.priority ?? "medium").trim().toLowerCase();
  const url = normalizeManagedSourceUrl(input?.url ?? existing.url ?? "");

  if (!ALLOWED_SOURCE_MARKETS.has(marketId)) throw new Error("invalid_source_market");
  if (label.length < 3 || label.length > 160) throw new Error("invalid_source_label");
  if (!ALLOWED_SOURCE_TYPES.has(type)) throw new Error("invalid_source_type");
  if (!ALLOWED_SOURCE_CADENCES.has(cadenceHours)) throw new Error("invalid_source_cadence");
  if (!ALLOWED_SOURCE_PRIORITIES.has(priority)) throw new Error("invalid_source_priority");

  return { marketId, label, url, type, cadenceHours, priority };
}

function sourceErrorResponse(error, fallbackStatus = 400) {
  const code = String(error?.message || error || "invalid_source");
  const conflict = /unique constraint/i.test(code) || code === "duplicate_source_url";
  return json({
    ok: false,
    error: conflict ? "duplicate_source_url" : code
  }, { status: conflict ? 409 : fallbackStatus });
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

async function requireWorkspaceContext(request, env, ctx) {
  if (!env.RADAR_DB) {
    return {
      response: json({
        ok: false,
        error: "d1_not_configured",
        message: "Cloudflare D1 is not bound yet."
      }, { status: 503 })
    };
  }

  const identity = await getVerifiedAccessIdentity(request, env, ctx);
  if (!identity) {
    return {
      response: json({
        ok: false,
        error: "access_required",
        message: "Cloudflare Access authentication is required for workspace persistence."
      }, { status: 401 })
    };
  }

  const audienceOk = await enforcePinnedAudience(env.RADAR_DB, identity);
  if (!audienceOk) {
    return {
      response: json({
        ok: false,
        error: "access_audience_mismatch",
        message: "Cloudflare Access audience validation failed."
      }, { status: 403 })
    };
  }

  return { db: env.RADAR_DB, identity };
}

async function getWorkspace(request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
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
  const gate = await requireWorkspaceContext(request, env, ctx);
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

async function workspaceStatus(request, env, ctx) {
  const identity = await getVerifiedAccessIdentity(request, env, ctx);
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

  if (changed && await getSchemaVersion(db) >= 3) {
    await db.prepare(`INSERT INTO discovery_candidates (
        source_id, market_id, candidate_type, content_hash,
        title, summary, source_url, status, detected_at, updated_at
      ) VALUES (?1, ?2, 'source_change', ?3, ?4, ?5, ?6, 'pending', ?7, ?7)
      ON CONFLICT(source_id, content_hash) DO NOTHING`)
      .bind(
        result.id,
        result.marketId,
        result.hash,
        result.title || result.label,
        result.label + " changed compared with the reviewed baseline. Review the source before updating market intelligence.",
        result.url,
        now
      )
      .run();
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
  const httpStatus = Number.isInteger(error?.httpStatus) ? error.httpStatus : null;
  const durationMs = Number.isFinite(error?.durationMs) ? Math.max(0, Math.round(error.durationMs)) : null;
  const title = error?.title ? String(error.title).slice(0, 180) : null;

  await db.prepare(`INSERT INTO source_watch_state (
      source_id, market_id, label, source_type, url,
      changed, last_http_status, last_duration_ms, last_title,
      last_error, checked_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?10)
    ON CONFLICT(source_id) DO UPDATE SET
      market_id = excluded.market_id,
      label = excluded.label,
      source_type = excluded.source_type,
      url = excluded.url,
      last_http_status = excluded.last_http_status,
      last_duration_ms = excluded.last_duration_ms,
      last_title = COALESCE(excluded.last_title, source_watch_state.last_title),
      last_error = excluded.last_error,
      checked_at = excluded.checked_at,
      updated_at = excluded.updated_at`)
    .bind(
      id,
      entry.marketId,
      entry.label,
      entry.type,
      entry.url,
      httpStatus,
      durationMs,
      title,
      message,
      now
    )
    .run();

  const current = await db
    .prepare("SELECT changed FROM source_watch_state WHERE source_id = ?1 LIMIT 1")
    .bind(id)
    .first();

  await db.prepare(`INSERT INTO source_watch_history (
      source_id, content_hash, changed, http_status, duration_ms,
      title, error, actor, checked_at
    ) VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
    .bind(
      id,
      Number(current?.changed || 0),
      httpStatus,
      durationMs,
      title,
      message,
      actor,
      now
    )
    .run();

  return { error: message, httpStatus };
}

async function checkSourceById(id, env, actor = "manual", entryOverride = null) {
  const entry = entryOverride || await findSourceEntry(id, env.RADAR_DB);
  if (!entry || entry.enabled === false) throw new Error("unknown_source");

  try {
    const result = await inspectSource(id, entry);

    if (!result.ok) {
      const error = new Error("HTTP " + result.status + " from monitored source");
      error.httpStatus = result.status;
      error.durationMs = result.durationMs;
      error.title = result.title;
      throw error;
    }

    if (result.blocked) {
      const error = new Error("Bot challenge page returned by monitored source");
      error.httpStatus = result.status;
      error.durationMs = result.durationMs;
      error.title = result.title;
      throw error;
    }

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

function effectiveCadenceHours(entry, state) {
  let hours = Number(entry?.cadenceHours || 24);
  if (!Number.isFinite(hours) || hours <= 0) hours = 24;

  const status = Number(state?.last_http_status || 0);
  const error = String(state?.last_error || "").toLowerCase();

  if (status === 429) hours = Math.max(hours, 24);
  if (error.includes("bot challenge")) hours = Math.max(hours, 72);

  return hours;
}

function sourceDueTimestamp(entry, state) {
  if (!state?.checked_at) return 0;
  const checkedAt = Date.parse(state.checked_at);
  if (!Number.isFinite(checkedAt)) return 0;
  return checkedAt + effectiveCadenceHours(entry, state) * 60 * 60 * 1000;
}

function sourceIsDue(entry, state, nowMs = Date.now()) {
  return sourceDueTimestamp(entry, state) <= nowMs;
}

async function loadSourceScheduleStates(db) {
  const result = await db.prepare(`SELECT
      source_id, baseline_hash, last_hash, changed,
      last_http_status, last_duration_ms, last_title, last_error,
      checked_at
    FROM source_watch_state`).all();

  return Object.fromEntries(
    (result?.results || []).map(row => [row.source_id, row])
  );
}

async function runAllSourceChecks(env, actor = "system", options = {}) {
  if (!env.RADAR_DB) {
    return { ok: false, error: "d1_not_configured", checked: 0, changed: 0, failed: 0 };
  }

  const catalog = await loadSourceCatalog(env.RADAR_DB);
  const allIds = Object.keys(catalog);
  const respectCadence = options.respectCadence ?? actor === "cron";
  let ids = allIds;

  if (respectCadence) {
    const states = await loadSourceScheduleStates(env.RADAR_DB);
    const nowMs = Date.now();
    ids = allIds.filter(id => sourceIsDue(catalog[id], states[id], nowMs));
  }

  const concurrency = 3;
  let cursor = 0;
  const results = [];

  async function runner() {
    while (cursor < ids.length) {
      const index = cursor;
      cursor += 1;
      const id = ids[index];

      try {
        const value = await checkSourceById(id, env, actor, catalog[id]);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ids.length) }, () => runner())
  );

  let checked = 0;
  let changed = 0;
  let failed = 0;

  for (const item of results) {
    if (item?.status === "fulfilled") {
      checked += 1;
      if (item.value.centralChanged) changed += 1;
    } else {
      failed += 1;
    }
  }

  const summary = {
    ok: failed === 0,
    registered: allIds.length,
    attempted: ids.length,
    skippedByCadence: Math.max(0, allIds.length - ids.length),
    checked,
    changed,
    failed,
    concurrency,
    cadenceAware: respectCadence,
    completedAt: new Date().toISOString(),
    actor
  };

  await env.RADAR_DB.batch([
    env.RADAR_DB.prepare(`INSERT INTO app_meta (key, value, updated_at)
      VALUES ('last_source_watch_run', ?1, ?1)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(summary.completedAt),
    env.RADAR_DB.prepare(`INSERT INTO app_meta (key, value, updated_at)
      VALUES ('last_source_watch_summary', ?1, ?2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(JSON.stringify(summary), summary.completedAt)
  ]);

  return summary;
}

function nextSourceWatchRun(now = new Date()) {
  const current = new Date(now);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  for (const hour of [6, 18]) {
    const candidate = new Date(Date.UTC(year, month, day, hour, 0, 0));
    if (candidate > current) return candidate.toISOString();
  }

  return new Date(Date.UTC(year, month, day + 1, 6, 0, 0)).toISOString();
}

async function automationHealth(request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
  if (gate.response) return gate.response;

  const schemaVersion = await getSchemaVersion(gate.db);
  const discoveryCount = schemaVersion >= 3
    ? gate.db.prepare("SELECT COUNT(*) AS pending FROM discovery_candidates WHERE status = 'pending'").first()
    : Promise.resolve({ pending: 0 });

  const [sourceCatalog, runRow, summaryRow, discoveryRow, scheduleStates] = await Promise.all([
    loadSourceCatalog(gate.db),
    gate.db.prepare("SELECT value FROM app_meta WHERE key = 'last_source_watch_run' LIMIT 1").first(),
    gate.db.prepare("SELECT value FROM app_meta WHERE key = 'last_source_watch_summary' LIMIT 1").first(),
    discoveryCount,
    loadSourceScheduleStates(gate.db)
  ]);

  let lastSummary = null;
  try {
    lastSummary = summaryRow?.value ? JSON.parse(summaryRow.value) : null;
  } catch {
    lastSummary = null;
  }

  const registryEntries = Object.entries(sourceCatalog);
  const registryTotal = registryEntries.length;
  const nowMs = Date.now();

  const statesForActiveSources = registryEntries.map(([id]) => scheduleStates[id]).filter(Boolean);
  const tracked = statesForActiveSources.length;
  const healthy = registryEntries.filter(([id]) => {
    const state = scheduleStates[id];
    return Boolean(state?.last_hash) && !state?.last_error && Number(state?.changed || 0) === 0;
  }).length;
  const changed = registryEntries.filter(([id]) => Number(scheduleStates[id]?.changed || 0) === 1).length;
  const failed = registryEntries.filter(([id]) => Boolean(scheduleStates[id]?.last_error)).length;
  const rateLimited = registryEntries.filter(([id]) => Number(scheduleStates[id]?.last_http_status || 0) === 429).length;
  const blocked = registryEntries.filter(([id]) =>
    /bot challenge/i.test(String(scheduleStates[id]?.last_error || ""))
  ).length;
  const stale = registryEntries.filter(([id]) => {
    const raw = scheduleStates[id]?.checked_at;
    const checkedAt = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(checkedAt) && checkedAt < nowMs - 36 * 60 * 60 * 1000;
  }).length;
  const unchecked = registryEntries.filter(([id]) => !scheduleStates[id]?.checked_at).length;
  const dueNow = registryEntries.filter(([id, entry]) =>
    sourceIsDue(entry, scheduleStates[id], nowMs)
  ).length;
  const dueTimestamps = registryEntries.map(([id, entry]) =>
    sourceDueTimestamp(entry, scheduleStates[id])
  );
  const nextDueMs = dueTimestamps.length ? Math.min(...dueTimestamps) : 0;

  return json({
    ok: true,
    schemaVersion,
    schedule: "0 6,18 * * *",
    nextRunAt: nextSourceWatchRun(),
    lastRunAt: runRow?.value || null,
    lastSummary,
    sources: {
      total: registryTotal,
      tracked,
      healthy,
      changed,
      failed,
      unchecked,
      rateLimited,
      blocked,
      stale,
      dueNow,
      nextDueAt: nextDueMs ? new Date(Math.max(nextDueMs, nowMs)).toISOString() : null
    },
    discovery: {
      pending: Number(discoveryRow?.pending || 0)
    }
  });
}

async function sourceManager(request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
  if (gate.response) return gate.response;

  const schemaVersion = await getSchemaVersion(gate.db);
  if (schemaVersion < 4) return migrationRequired(schemaVersion, 4);

  if (request.method === "GET") {
    const catalog = await loadSourceCatalog(gate.db, { includeDisabled: true });
    const sources = Object.values(catalog).sort((a, b) => {
      if (a.origin !== b.origin) return a.origin === "core" ? -1 : 1;
      return String(a.label).localeCompare(String(b.label));
    });

    return json({
      ok: true,
      counts: {
        total: sources.length,
        core: sources.filter(source => source.origin === "core").length,
        custom: sources.filter(source => source.origin !== "core").length,
        enabled: sources.filter(source => source.enabled).length,
        disabled: sources.filter(source => !source.enabled).length
      },
      sources
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action || "");

  if (action === "probe") {
    let source;
    try {
      source = normalizeManagedSourceInput(body);
    } catch (error) {
      return sourceErrorResponse(error);
    }

    try {
      const result = await inspectSource("probe", source);

      if (!result.ok) {
        return json({
          ok: false,
          error: "source_probe_failed",
          status: result.status,
          title: result.title,
          durationMs: result.durationMs,
          finalUrl: result.finalUrl
        }, { status: 422 });
      }

      if (result.blocked) {
        return json({
          ok: false,
          error: "source_probe_blocked",
          status: result.status,
          title: result.title,
          durationMs: result.durationMs,
          finalUrl: result.finalUrl
        }, { status: 422 });
      }

      return json({
        ok: true,
        action,
        source,
        probe: {
          status: result.status,
          title: result.title,
          textLength: result.textLength,
          durationMs: result.durationMs,
          finalUrl: result.finalUrl
        }
      });
    } catch (error) {
      return json({
        ok: false,
        error: "source_probe_failed",
        detail: String(error?.message || error),
        status: error?.httpStatus ?? null,
        durationMs: error?.durationMs ?? null
      }, { status: 422 });
    }
  }

  if (action === "bulk_preview") {
    const items = Array.isArray(body?.sources) ? body.sources.slice(0, 100) : [];
    if (!items.length) {
      return json({ ok: false, error: "bulk_sources_required" }, { status: 400 });
    }
    if ((body?.sources || []).length > 100) {
      return json({ ok: false, error: "bulk_source_limit", limit: 100 }, { status: 413 });
    }

    const existingCatalog = await loadSourceCatalog(gate.db, { includeDisabled: true });
    const knownUrls = new Set();
    for (const entry of Object.values(existingCatalog)) {
      try {
        knownUrls.add(normalizeManagedSourceUrl(entry.url));
      } catch {
        knownUrls.add(String(entry.url || ""));
      }
    }

    const valid = [];
    const skipped = [];
    const errors = [];
    const batchUrls = new Set();

    for (let index = 0; index < items.length; index += 1) {
      const raw = items[index];
      let source;

      try {
        source = normalizeManagedSourceInput(raw);
      } catch (error) {
        errors.push({
          index,
          label: String(raw?.label || ""),
          url: String(raw?.url || ""),
          error: String(error?.message || error)
        });
        continue;
      }

      if (knownUrls.has(source.url) || batchUrls.has(source.url)) {
        skipped.push({
          index,
          label: source.label,
          url: source.url,
          reason: "duplicate_source_url"
        });
        continue;
      }

      batchUrls.add(source.url);
      valid.push({ index, ...source });
    }

    return json({
      ok: errors.length === 0,
      action,
      requested: items.length,
      valid: valid.length,
      skipped: skipped.length,
      errors: errors.length,
      validSources: valid,
      skippedSources: skipped,
      errorSources: errors
    }, { status: errors.length ? 207 : 200 });
  }

  if (action === "create") {
    let source;
    try {
      source = normalizeManagedSourceInput(body);
    } catch (error) {
      return sourceErrorResponse(error);
    }

    const coreDuplicate = Object.values(SOURCE_REGISTRY).some(entry => {
      try {
        return normalizeManagedSourceUrl(entry.url) === source.url;
      } catch {
        return entry.url === source.url;
      }
    });
    if (coreDuplicate) return sourceErrorResponse(new Error("duplicate_source_url"), 409);

    const id = "custom-" + crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await gate.db.prepare(`INSERT INTO monitored_sources (
          source_id, market_id, label, url, source_type,
          cadence_hours, priority, enabled, origin,
          created_by, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'manual', ?8, ?9, ?9)`)
        .bind(
          id,
          source.marketId,
          source.label,
          source.url,
          source.type,
          source.cadenceHours,
          source.priority,
          gate.identity.email,
          now
        )
        .run();
    } catch (error) {
      return sourceErrorResponse(error, 409);
    }

    return json({
      ok: true,
      action,
      source: {
        id,
        ...source,
        enabled: true,
        origin: "manual",
        editable: true,
        createdBy: gate.identity.email,
        createdAt: now,
        updatedAt: now
      }
    }, { status: 201 });
  }

  if (action === "bulk_create") {
    const items = Array.isArray(body?.sources) ? body.sources.slice(0, 100) : [];
    if (!items.length) {
      return json({ ok: false, error: "bulk_sources_required" }, { status: 400 });
    }
    if ((body?.sources || []).length > 100) {
      return json({ ok: false, error: "bulk_source_limit", limit: 100 }, { status: 413 });
    }

    const existingCatalog = await loadSourceCatalog(gate.db, { includeDisabled: true });
    const knownUrls = new Set();
    for (const entry of Object.values(existingCatalog)) {
      try {
        knownUrls.add(normalizeManagedSourceUrl(entry.url));
      } catch {
        knownUrls.add(String(entry.url || ""));
      }
    }

    const created = [];
    const skipped = [];
    const errors = [];
    const batchUrls = new Set();

    for (let index = 0; index < items.length; index += 1) {
      const raw = items[index];
      let source;

      try {
        source = normalizeManagedSourceInput(raw);
      } catch (error) {
        errors.push({
          index,
          label: String(raw?.label || ""),
          url: String(raw?.url || ""),
          error: String(error?.message || error)
        });
        continue;
      }

      if (knownUrls.has(source.url) || batchUrls.has(source.url)) {
        skipped.push({
          index,
          label: source.label,
          url: source.url,
          reason: "duplicate_source_url"
        });
        continue;
      }

      const id = "custom-" + crypto.randomUUID();
      const now = new Date().toISOString();

      try {
        await gate.db.prepare(`INSERT INTO monitored_sources (
            source_id, market_id, label, url, source_type,
            cadence_hours, priority, enabled, origin,
            created_by, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'imported', ?8, ?9, ?9)`)
          .bind(
            id,
            source.marketId,
            source.label,
            source.url,
            source.type,
            source.cadenceHours,
            source.priority,
            gate.identity.email,
            now
          )
          .run();

        batchUrls.add(source.url);
        knownUrls.add(source.url);
        created.push({
          index,
          id,
          ...source,
          enabled: true,
          origin: "imported"
        });
      } catch (error) {
        const message = String(error?.message || error);
        if (/unique constraint/i.test(message)) {
          skipped.push({
            index,
            label: source.label,
            url: source.url,
            reason: "duplicate_source_url"
          });
        } else {
          errors.push({
            index,
            label: source.label,
            url: source.url,
            error: message.slice(0, 300)
          });
        }
      }
    }

    return json({
      ok: errors.length === 0,
      action,
      requested: items.length,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      createdSources: created,
      skippedSources: skipped,
      errorSources: errors
    }, { status: errors.length ? 207 : 200 });
  }

  const id = String(body?.id || "");
  if (!id || SOURCE_REGISTRY[id]) {
    return json({ ok: false, error: "core_source_not_editable" }, { status: 400 });
  }

  const row = await gate.db.prepare(`SELECT
      source_id, market_id, label, url, source_type,
      cadence_hours, priority, enabled, origin,
      created_by, created_at, updated_at
    FROM monitored_sources
    WHERE source_id = ?1
    LIMIT 1`)
    .bind(id)
    .first();

  if (!row) return json({ ok: false, error: "source_not_found" }, { status: 404 });

  if (action === "toggle") {
    if (typeof body.enabled !== "boolean") {
      return json({ ok: false, error: "invalid_enabled_value" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await gate.db.prepare(`UPDATE monitored_sources
      SET enabled = ?1, updated_at = ?2
      WHERE source_id = ?3`)
      .bind(body.enabled ? 1 : 0, now, id)
      .run();

    return json({ ok: true, action, id, enabled: body.enabled, updatedAt: now });
  }

  if (action === "update") {
    const existing = managedSourceRowToEntry(row);
    let source;
    try {
      source = normalizeManagedSourceInput(body, existing);
    } catch (error) {
      return sourceErrorResponse(error);
    }

    const coreDuplicate = Object.values(SOURCE_REGISTRY).some(entry => {
      try {
        return normalizeManagedSourceUrl(entry.url) === source.url;
      } catch {
        return entry.url === source.url;
      }
    });
    if (coreDuplicate) return sourceErrorResponse(new Error("duplicate_source_url"), 409);

    const now = new Date().toISOString();
    try {
      await gate.db.prepare(`UPDATE monitored_sources
        SET market_id = ?1,
            label = ?2,
            url = ?3,
            source_type = ?4,
            cadence_hours = ?5,
            priority = ?6,
            updated_at = ?7
        WHERE source_id = ?8`)
        .bind(
          source.marketId,
          source.label,
          source.url,
          source.type,
          source.cadenceHours,
          source.priority,
          now,
          id
        )
        .run();
    } catch (error) {
      return sourceErrorResponse(error, 409);
    }

    return json({
      ok: true,
      action,
      source: {
        id,
        ...source,
        enabled: Number(row.enabled) === 1,
        origin: row.origin || "manual",
        editable: true,
        createdBy: row.created_by || null,
        createdAt: row.created_at || null,
        updatedAt: now
      }
    });
  }

  return json({ ok: false, error: "unsupported_source_action" }, { status: 400 });
}

async function discoveryInbox(request, env, ctx, url) {
  const gate = await requireWorkspaceContext(request, env, ctx);
  if (gate.response) return gate.response;

  const schemaVersion = await getSchemaVersion(gate.db);
  if (schemaVersion < 3) return migrationRequired(schemaVersion, 3);

  const requestedStatus = String(url.searchParams.get("status") || "pending");
  const status = ["pending", "accepted", "dismissed", "all"].includes(requestedStatus)
    ? requestedStatus
    : "pending";

  const sql = status === "all"
    ? `SELECT id, source_id, market_id, candidate_type, content_hash,
        title, summary, source_url, status, detected_at,
        reviewed_at, reviewed_by, review_note
       FROM discovery_candidates
       ORDER BY detected_at DESC, id DESC
       LIMIT 100`
    : `SELECT id, source_id, market_id, candidate_type, content_hash,
        title, summary, source_url, status, detected_at,
        reviewed_at, reviewed_by, review_note
       FROM discovery_candidates
       WHERE status = ?1
       ORDER BY detected_at DESC, id DESC
       LIMIT 100`;

  const statement = gate.db.prepare(sql);
  const result = status === "all"
    ? await statement.all()
    : await statement.bind(status).all();

  const counts = await gate.db.prepare(`SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed
    FROM discovery_candidates`).first();

  return json({
    ok: true,
    status,
    counts: {
      pending: Number(counts?.pending || 0),
      accepted: Number(counts?.accepted || 0),
      dismissed: Number(counts?.dismissed || 0)
    },
    candidates: result?.results || []
  });
}

async function reviewDiscoveryCandidate(request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
  if (gate.response) return gate.response;

  const schemaVersion = await getSchemaVersion(gate.db);
  if (schemaVersion < 3) return migrationRequired(schemaVersion, 3);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = Number(body?.id);
  const action = String(body?.action || "");
  const note = String(body?.note || "").slice(0, 800);

  if (!Number.isInteger(id) || id <= 0) {
    return json({ ok: false, error: "invalid_candidate_id" }, { status: 400 });
  }

  if (!["accept", "dismiss", "reopen"].includes(action)) {
    return json({ ok: false, error: "unsupported_review_action" }, { status: 400 });
  }

  const nextStatus = action === "accept"
    ? "accepted"
    : action === "dismiss"
      ? "dismissed"
      : "pending";

  const now = new Date().toISOString();
  const result = await gate.db.prepare(`UPDATE discovery_candidates
    SET status = ?1,
        reviewed_at = ?2,
        reviewed_by = ?3,
        review_note = ?4,
        updated_at = ?2
    WHERE id = ?5`)
    .bind(nextStatus, now, gate.identity.email, note, id)
    .run();

  if ((result?.meta?.changes || 0) !== 1) {
    return json({ ok: false, error: "candidate_not_found" }, { status: 404 });
  }

  return json({
    ok: true,
    id,
    status: nextStatus,
    reviewedAt: now,
    reviewedBy: gate.identity.email
  });
}

async function reviewSourceChange(request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
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

  const source = await findSourceEntry(id, gate.db, { includeDisabled: true });
  if (!source) {
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

async function sourceWatchHistory(url, request, env, ctx) {
  const gate = await requireWorkspaceContext(request, env, ctx);
  if (gate.response) return gate.response;

  const id = String(url.searchParams.get("id") || "");
  const source = await findSourceEntry(id, gate.db, { includeDisabled: true });
  if (!source) {
    return json({ ok: false, error: "unknown_source" }, { status: 404 });
  }

  const result = await gate.db.prepare(`SELECT
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
      const identity = await getVerifiedAccessIdentity(request, env, ctx);
      const schemaVersion = env.RADAR_DB ? await getSchemaVersion(env.RADAR_DB) : 0;
      return json({
        ok: true,
        service: "dcb-expansion-radar",
        runtime: "cloudflare-workers",
        backend: {
          api: "online",
          database: env.RADAR_DB ? "d1" : "not-configured",
          persistence: env.RADAR_DB ? "d1" : "local-browser",
          sourceWatchPersistence: env.RADAR_DB ? "d1" : "local-browser",
          accessAuthenticated: Boolean(identity),
          schemaVersion
        },
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/workspace/status" && request.method === "GET") {
      return workspaceStatus(request, env, ctx);
    }

    if (url.pathname === "/api/workspace" && request.method === "GET") {
      return getWorkspace(request, env, ctx);
    }

    if (url.pathname === "/api/workspace" && request.method === "PUT") {
      return putWorkspace(request, env, ctx);
    }

    if (url.pathname === "/api/sources" && request.method === "GET") {
      const catalog = await loadSourceCatalog(env.RADAR_DB);
      return json({
        sources: Object.entries(catalog).map(([id, entry]) => ({
          id,
          marketId: entry.marketId,
          label: entry.label,
          type: entry.type,
          url: entry.url,
          cadenceHours: entry.cadenceHours || 24,
          priority: entry.priority || "medium",
          origin: entry.origin || "core"
        }))
      });
    }

    if (url.pathname === "/api/source-manager" && (request.method === "GET" || request.method === "POST")) {
      return sourceManager(request, env, ctx);
    }

    if (url.pathname === "/api/automation/health" && request.method === "GET") {
      return automationHealth(request, env, ctx);
    }

    if (url.pathname === "/api/discovery/inbox" && request.method === "GET") {
      return discoveryInbox(request, env, ctx, url);
    }

    if (url.pathname === "/api/discovery/review" && request.method === "POST") {
      return reviewDiscoveryCandidate(request, env, ctx);
    }

    if (url.pathname === "/api/source-watch/state" && request.method === "GET") {
      const gate = await requireWorkspaceContext(request, env, ctx);
      if (gate.response) return gate.response;
      return json({ ok: true, state: await getSourceState(gate.db) });
    }

    if (url.pathname === "/api/source-watch/history" && request.method === "GET") {
      return sourceWatchHistory(url, request, env, ctx);
    }

    if (url.pathname === "/api/source-watch/review" && request.method === "POST") {
      return reviewSourceChange(request, env, ctx);
    }

    if (url.pathname === "/api/source-watch/run" && request.method === "POST") {
      const gate = await requireWorkspaceContext(request, env, ctx);
      if (gate.response) return gate.response;
      return json(await runAllSourceChecks(env, gate.identity.email));
    }

    if (url.pathname === "/api/check-source" && request.method === "GET") {
      const id = String(url.searchParams.get("id") || "");
      const entry = id ? await findSourceEntry(id, env.RADAR_DB) : null;
      if (!entry) {
        return json({ ok: false, error: "unknown_source" }, { status: 404 });
      }

      const identity = await getVerifiedAccessIdentity(request, env, ctx);
      if (env.RADAR_DB && !identity) {
        return json({
          ok: false,
          error: "access_required",
          message: "Cloudflare Access authentication is required for persistent source checks."
        }, { status: 401 });
      }

      try {
        return json(await checkSourceById(id, env, identity?.email || "manual", entry));
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
      const identity = await getVerifiedAccessIdentity(request, env, ctx);
      let lastSourceWatchRun = null;
      let lastSourceWatchSummary = null;

      if (env.RADAR_DB && identity) {
        const [runRow, summaryRow] = await Promise.all([
          env.RADAR_DB.prepare("SELECT value FROM app_meta WHERE key = 'last_source_watch_run' LIMIT 1").first(),
          env.RADAR_DB.prepare("SELECT value FROM app_meta WHERE key = 'last_source_watch_summary' LIMIT 1").first()
        ]);
        lastSourceWatchRun = runRow?.value || null;
        try {
          lastSourceWatchSummary = summaryRow?.value ? JSON.parse(summaryRow.value) : null;
        } catch {
          lastSourceWatchSummary = null;
        }
      }

      return json({
        product: "DCB Expansion Radar",
        phase: env.RADAR_DB ? "d1-workspace" : "interactive-mvp",
        markets: 6,
        automation: {
          sourceWatchCron: "0 6,18 * * *",
          lastSourceWatchRun,
          lastSourceWatchSummary
        },
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
          "scheduled-source-checks-ready",
          "automation-health",
          "discovery-inbox"
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
    ctx.waitUntil(runAllSourceChecks(env, "cron", { respectCadence: true }));
  }
};
