import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import worker from "../src/index.js";
import { SOURCE_REGISTRY } from "../src/source-registry.js";

function loadRadarData() {
  const code = fs.readFileSync("public/data.js", "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: "public/data.js" });
  return context.window.RADAR_DATA;
}

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (this.sql.startsWith("SELECT payload_json, version, updated_at FROM workspace_state")) {
      if (!this.db.row || this.db.row.user_id !== this.args[0]) return null;
      return {
        payload_json: this.db.row.payload_json,
        version: this.db.row.version,
        updated_at: this.db.row.updated_at
      };
    }

    if (this.sql.startsWith("SELECT version FROM workspace_state")) {
      if (!this.db.row || this.db.row.user_id !== this.args[0]) return null;
      return { version: this.db.row.version };
    }

    if (this.sql.includes("FROM source_watch_state") && this.sql.includes("COUNT(*) AS tracked")) {
      return {
        tracked: 14,
        healthy: 13,
        changed: 0,
        failed: 1,
        unchecked: 0,
        rate_limited: 1,
        blocked: 1,
        stale: 0
      };
    }

    if (this.sql.includes("FROM app_meta WHERE key = 'schema_version'")) {
      return { value: this.db.appMeta.schema_version || null };
    }

    if (this.sql.includes("FROM app_meta WHERE key = 'last_source_watch_run'")) {
      return { value: this.db.appMeta.last_source_watch_run || null };
    }

    if (this.sql.includes("FROM app_meta WHERE key = 'last_source_watch_summary'")) {
      return { value: this.db.appMeta.last_source_watch_summary || null };
    }

    if (this.sql.includes("COUNT(*) AS pending FROM discovery_candidates")) {
      return { pending: this.db.candidates.filter(x => x.status === "pending").length };
    }

    if (this.sql.includes("SUM(CASE WHEN status = 'pending'")) {
      return {
        pending: this.db.candidates.filter(x => x.status === "pending").length,
        accepted: this.db.candidates.filter(x => x.status === "accepted").length,
        dismissed: this.db.candidates.filter(x => x.status === "dismissed").length
      };
    }

    throw new Error("Unhandled fake D1 first(): " + this.sql);
  }

  async all() {
    if (this.sql.includes("SELECT source_id, checked_at, last_http_status, last_error") &&
        this.sql.includes("FROM source_watch_state")) {
      return { success: true, results: [...this.db.sourceStates] };
    }

    if (this.sql.includes("FROM source_watch_state") && this.sql.includes("ORDER BY changed DESC")) {
      return { success: true, results: [] };
    }

    if (this.sql.includes("FROM source_watch_history")) {
      return { success: true, results: [] };
    }

    if (this.sql.includes("FROM discovery_candidates")) {
      let rows = [...this.db.candidates];
      if (this.sql.includes("WHERE status = ?1")) {
        rows = rows.filter(x => x.status === this.args[0]);
      }
      rows.sort((a, b) => String(b.detected_at).localeCompare(String(a.detected_at)) || b.id - a.id);
      return { success: true, results: rows.slice(0, 100) };
    }

    throw new Error("Unhandled fake D1 all(): " + this.sql);
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO workspace_state")) {
      const [user_id, payload_json, created_at] = this.args;
      this.db.row = {
        user_id,
        payload_json,
        version: 1,
        created_at,
        updated_at: created_at
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE workspace_state")) {
      const [payload_json, nextVersion, updated_at, user_id, currentVersion] = this.args;
      if (!this.db.row || this.db.row.user_id !== user_id || this.db.row.version !== currentVersion) {
        return { success: true, meta: { changes: 0 } };
      }
      this.db.row.payload_json = payload_json;
      this.db.row.version = nextVersion;
      this.db.row.updated_at = updated_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("INSERT INTO app_meta")) {
      if (this.sql.includes("'last_source_watch_run'")) {
        this.db.appMeta.last_source_watch_run = this.args[0];
        return { success: true, meta: { changes: 1 } };
      }
      if (this.sql.includes("'last_source_watch_summary'")) {
        this.db.appMeta.last_source_watch_summary = this.args[0];
        return { success: true, meta: { changes: 1 } };
      }
    }

    if (this.sql.startsWith("UPDATE discovery_candidates")) {
      const [status, reviewedAt, reviewedBy, reviewNote, id] = this.args;
      const candidate = this.db.candidates.find(x => x.id === id);
      if (!candidate) return { success: true, meta: { changes: 0 } };
      candidate.status = status;
      candidate.reviewed_at = reviewedAt;
      candidate.reviewed_by = reviewedBy;
      candidate.review_note = reviewNote;
      candidate.updated_at = reviewedAt;
      return { success: true, meta: { changes: 1 } };
    }

    throw new Error("Unhandled fake D1 run(): " + this.sql);
  }
}

class FakeD1 {
  constructor() {
    this.row = null;
    this.appMeta = {
      schema_version: "3",
      last_source_watch_run: "2026-09-21T23:04:18.973Z",
      last_source_watch_summary: JSON.stringify({
        ok: true,
        attempted: 14,
        checked: 14,
        changed: 0,
        failed: 0,
        completedAt: "2026-09-21T23:04:18.973Z",
        actor: "test.user@example.com"
      })
    };
    this.sourceStates = Object.keys(SOURCE_REGISTRY).map(source_id => ({
      source_id,
      checked_at: new Date().toISOString(),
      last_http_status: 200,
      last_error: null
    }));
    this.candidates = [{
      id: 1,
      source_id: "mx-google-play",
      market_id: "mexico",
      candidate_type: "source_change",
      content_hash: "abc123",
      title: "Google Play Mexico billing methods changed",
      summary: "Review source before updating market intelligence.",
      source_url: "https://example.test/source",
      status: "pending",
      detected_at: "2026-09-21T23:10:00.000Z",
      reviewed_at: null,
      reviewed_by: null,
      review_note: null
    }];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map(statement => statement.run()));
  }
}

const data = loadRadarData();
const marketIds = new Set(data.markets.map(m => m.id));

for (const [id, source] of Object.entries(SOURCE_REGISTRY)) {
  assert.ok(id, "source id is required");
  assert.ok(marketIds.has(source.marketId), id + " references an unknown market");
  assert.match(source.url, /^https:\/\//, id + " source URL must use https");
  assert.ok(source.label, id + " source label is required");
  assert.ok(Number.isInteger(source.cadenceHours) && source.cadenceHours > 0, id + " cadenceHours must be a positive integer");
  assert.ok(["high", "medium", "low"].includes(source.priority), id + " priority must be high, medium or low");
}

const assets = {
  fetch: async request => new Response("asset:" + new URL(request.url).pathname, {
    status: 200,
    headers: { "content-type": "text/plain" }
  })
};

const unauthenticatedCtx = {};
const authenticatedCtx = {
  access: {
    getIdentity: async () => ({ email: "Test.User@example.com" })
  }
};

async function call(path, { env = { ASSETS: assets }, ctx = unauthenticatedCtx, method = "GET", body } = {}) {
  return worker.fetch(
    new Request("https://radar.test" + path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }),
    env,
    ctx
  );
}

{
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.backend.api, "online");
  assert.equal(payload.backend.persistence, "local-browser");
  assert.equal(payload.backend.database, "not-configured");
}

{
  const response = await call("/api/workspace/status");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.database, "not-configured");
  assert.equal(payload.authenticated, false);
}

{
  const response = await call("/api/workspace");
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error, "d1_not_configured");
}

{
  const db = new FakeD1();
  const env = { ASSETS: assets, RADAR_DB: db };

  const noAccess = await call("/api/workspace", { env });
  assert.equal(noAccess.status, 401);

  const status = await call("/api/workspace/status", { env, ctx: authenticatedCtx });
  assert.equal(status.status, 200);
  const statusPayload = await status.json();
  assert.equal(statusPayload.database, "d1");
  assert.equal(statusPayload.authenticated, true);
  assert.equal(statusPayload.user, "test.user@example.com");

  const initial = await call("/api/workspace", { env, ctx: authenticatedCtx });
  assert.equal(initial.status, 200);
  const initialPayload = await initial.json();
  assert.equal(initialPayload.exists, false);
  assert.equal(initialPayload.version, 0);

  const workspace = {
    shortlist: ["mexico", "brazil"],
    compare: ["mexico", "brazil"],
    pipeline: {
      "company:example": {
        key: "company:example",
        marketId: "mexico",
        name: "Example",
        status: "New"
      }
    },
    notes: {
      mexico: { text: "Test note" }
    },
    sourceWatch: {}
  };

  const create = await call("/api/workspace", {
    env,
    ctx: authenticatedCtx,
    method: "PUT",
    body: { workspace, expectedVersion: 0 }
  });
  assert.equal(create.status, 200);
  const createPayload = await create.json();
  assert.equal(createPayload.version, 1);

  const read = await call("/api/workspace", { env, ctx: authenticatedCtx });
  const readPayload = await read.json();
  assert.equal(readPayload.exists, true);
  assert.equal(readPayload.version, 1);
  assert.deepEqual(readPayload.workspace.shortlist, ["mexico", "brazil"]);
  assert.equal(readPayload.workspace.pipeline["company:example"].status, "New");

  workspace.pipeline["company:example"].status = "Contacted";
  const update = await call("/api/workspace", {
    env,
    ctx: authenticatedCtx,
    method: "PUT",
    body: { workspace, expectedVersion: 1 }
  });
  assert.equal(update.status, 200);
  const updatePayload = await update.json();
  assert.equal(updatePayload.version, 2);

  const conflict = await call("/api/workspace", {
    env,
    ctx: authenticatedCtx,
    method: "PUT",
    body: { workspace, expectedVersion: 1 }
  });
  assert.equal(conflict.status, 409);
  const conflictPayload = await conflict.json();
  assert.equal(conflictPayload.error, "version_conflict");
  assert.equal(conflictPayload.currentVersion, 2);
}

{
  const response = await call("/api/status");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.capabilities.includes("source-watch"));
  assert.ok(payload.capabilities.includes("d1-workspace-sync"));
  assert.ok(payload.capabilities.includes("automation-health"));
  assert.ok(payload.capabilities.includes("discovery-inbox"));
}

{
  const db = new FakeD1();
  const env = { ASSETS: assets, RADAR_DB: db };

  const stateDenied = await call("/api/source-watch/state", { env });
  assert.equal(stateDenied.status, 401);

  const historyDenied = await call("/api/source-watch/history?id=mx-google-play", { env });
  assert.equal(historyDenied.status, 401);

  const stateAllowed = await call("/api/source-watch/state", { env, ctx: authenticatedCtx });
  assert.equal(stateAllowed.status, 200);
  const statePayload = await stateAllowed.json();
  assert.deepEqual(statePayload.state, []);

  const historyAllowed = await call("/api/source-watch/history?id=mx-google-play", { env, ctx: authenticatedCtx });
  assert.equal(historyAllowed.status, 200);
  const historyPayload = await historyAllowed.json();
  assert.deepEqual(historyPayload.history, []);
}

{
  const db = new FakeD1();
  const env = { ASSETS: assets, RADAR_DB: db };

  const mexicoGoogle = db.sourceStates.find(row => row.source_id === "mx-google-play");
  mexicoGoogle.checked_at = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const timBrazil = db.sourceStates.find(row => row.source_id === "br-tim-prime");
  timBrazil.checked_at = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
  timBrazil.last_http_status = 429;
  timBrazil.last_error = "HTTP 429 from monitored source";

  const health = await call("/api/automation/health", { env, ctx: authenticatedCtx });
  assert.equal(health.status, 200);
  const healthPayload = await health.json();
  assert.equal(healthPayload.schemaVersion, 3);
  assert.equal(healthPayload.sources.total, 14);
  assert.equal(healthPayload.sources.rateLimited, 1);
  assert.equal(healthPayload.sources.blocked, 1);
  assert.equal(healthPayload.discovery.pending, 1);
  assert.equal(healthPayload.lastSummary.checked, 14);
  assert.equal(healthPayload.sources.dueNow, 1);
  assert.ok(healthPayload.sources.nextDueAt);

  const inbox = await call("/api/discovery/inbox?status=pending", { env, ctx: authenticatedCtx });
  assert.equal(inbox.status, 200);
  const inboxPayload = await inbox.json();
  assert.equal(inboxPayload.counts.pending, 1);
  assert.equal(inboxPayload.candidates.length, 1);
  assert.equal(inboxPayload.candidates[0].market_id, "mexico");

  const accept = await call("/api/discovery/review", {
    env,
    ctx: authenticatedCtx,
    method: "POST",
    body: { id: 1, action: "accept" }
  });
  assert.equal(accept.status, 200);
  const acceptPayload = await accept.json();
  assert.equal(acceptPayload.status, "accepted");

  const pendingAfter = await call("/api/discovery/inbox?status=pending", { env, ctx: authenticatedCtx });
  const pendingAfterPayload = await pendingAfter.json();
  assert.equal(pendingAfterPayload.candidates.length, 0);
  assert.equal(pendingAfterPayload.counts.pending, 0);
  assert.equal(pendingAfterPayload.counts.accepted, 1);

  const reopen = await call("/api/discovery/review", {
    env,
    ctx: authenticatedCtx,
    method: "POST",
    body: { id: 1, action: "reopen" }
  });
  assert.equal(reopen.status, 200);
  const reopenPayload = await reopen.json();
  assert.equal(reopenPayload.status, "pending");
}

{
  const response = await call("/api/sources");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.sources.length, Object.keys(SOURCE_REGISTRY).length);
  assert.ok(payload.sources.every(source => marketIds.has(source.marketId)));
  assert.ok(payload.sources.every(source => Number.isInteger(source.cadenceHours) && source.cadenceHours > 0));
  assert.ok(payload.sources.every(source => ["high", "medium", "low"].includes(source.priority)));
}

{
  const response = await call("/api/check-source?id=missing-source");
  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.equal(payload.error, "unknown_source");
}

{
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 3) {
      return new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "0" }
      });
    }
    return new Response("<html><title>Recovered source</title><body>Stable content</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  };

  try {
    const response = await call("/api/check-source?id=mx-google-play");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.status, 200);
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("still rate limited", {
      status: 429,
      headers: { "retry-after": "0" }
    });
  };

  try {
    const response = await call("/api/check-source?id=mx-google-play");
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.error, "source_check_failed");
    assert.match(payload.detail, /HTTP 429/);
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("<html><title>Challenge Validation</title><body>Please verify you are human</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });

  try {
    const response = await call("/api/check-source?id=mx-crt-mobile");
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.error, "source_check_failed");
    assert.match(payload.detail, /Bot challenge/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}


{
  const db = new FakeD1();
  const env = { ASSETS: assets, RADAR_DB: db };
  const pending = [];
  const scheduledCtx = {
    waitUntil(promise) {
      pending.push(promise);
    }
  };

  await worker.scheduled({}, env, scheduledCtx);
  await Promise.all(pending);

  const summary = JSON.parse(db.appMeta.last_source_watch_summary);
  assert.equal(summary.cadenceAware, true);
  assert.equal(summary.registered, Object.keys(SOURCE_REGISTRY).length);
  assert.equal(summary.attempted, 0);
  assert.equal(summary.skippedByCadence, Object.keys(SOURCE_REGISTRY).length);
  assert.equal(summary.failed, 0);
}

{
  const response = await call("/api/not-real");
  assert.equal(response.status, 404);
}

{
  const response = await call("/");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset:/");
}

console.log("Worker smoke tests passed:", {
  markets: marketIds.size,
  monitoredSources: Object.keys(SOURCE_REGISTRY).length,
  d1Workspace: true,
  optimisticConcurrency: true,
  automationHealth: true,
  discoveryInbox: true,
  rateLimitRetry: true,
  botChallengeDetection: true,
  protectedSourceWatchReads: true,
  cadenceScheduling: true
});
