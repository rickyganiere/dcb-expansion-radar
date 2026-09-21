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

    throw new Error("Unhandled fake D1 first(): " + this.sql);
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

    throw new Error("Unhandled fake D1 run(): " + this.sql);
  }
}

class FakeD1 {
  constructor() {
    this.row = null;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const data = loadRadarData();
const marketIds = new Set(data.markets.map(m => m.id));

for (const [id, source] of Object.entries(SOURCE_REGISTRY)) {
  assert.ok(id, "source id is required");
  assert.ok(marketIds.has(source.marketId), id + " references an unknown market");
  assert.match(source.url, /^https:\/\//, id + " source URL must use https");
  assert.ok(source.label, id + " source label is required");
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
}

{
  const response = await call("/api/sources");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.sources.length, Object.keys(SOURCE_REGISTRY).length);
  assert.ok(payload.sources.every(source => marketIds.has(source.marketId)));
}

{
  const response = await call("/api/check-source?id=missing-source");
  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.equal(payload.error, "unknown_source");
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
  optimisticConcurrency: true
});
