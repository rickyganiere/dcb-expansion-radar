import assert from "node:assert/strict";
import fs from "node:fs";

const workspaceSql = fs.readFileSync("migrations/0001_workspace.sql", "utf8");
const sourceSql = fs.readFileSync("migrations/0002_source_watch.sql", "utf8");
const discoverySql = fs.readFileSync("migrations/0003_discovery_inbox.sql", "utf8");
const combined = workspaceSql + "\n" + sourceSql + "\n" + discoverySql;

assert.match(workspaceSql, /CREATE TABLE IF NOT EXISTS workspace_state/i);
assert.match(workspaceSql, /payload_json TEXT NOT NULL CHECK \(json_valid\(payload_json\)\)/i);
assert.match(workspaceSql, /version INTEGER NOT NULL DEFAULT 1/i);
assert.match(workspaceSql, /user_id TEXT PRIMARY KEY/i);
assert.match(workspaceSql, /CREATE INDEX IF NOT EXISTS workspace_state_updated_at_idx/i);
assert.match(workspaceSql, /CREATE TABLE IF NOT EXISTS app_meta/i);

assert.match(sourceSql, /CREATE TABLE IF NOT EXISTS source_watch_state/i);
assert.match(sourceSql, /baseline_hash TEXT/i);
assert.match(sourceSql, /last_hash TEXT/i);
assert.match(sourceSql, /changed INTEGER NOT NULL DEFAULT 0/i);
assert.match(sourceSql, /CREATE TABLE IF NOT EXISTS source_watch_history/i);
assert.match(sourceSql, /CREATE INDEX IF NOT EXISTS source_watch_state_market_changed_idx/i);
assert.match(sourceSql, /CREATE INDEX IF NOT EXISTS source_watch_history_source_checked_idx/i);
assert.match(sourceSql, /schema_version', '2/i);

assert.match(discoverySql, /CREATE TABLE IF NOT EXISTS discovery_candidates/i);
assert.match(discoverySql, /UNIQUE\(source_id, content_hash\)/i);
assert.match(discoverySql, /status TEXT NOT NULL DEFAULT 'pending'/i);
assert.match(discoverySql, /accepted/i);
assert.match(discoverySql, /dismissed/i);
assert.match(discoverySql, /CREATE INDEX IF NOT EXISTS discovery_candidates_status_detected_idx/i);
assert.match(discoverySql, /schema_version', '3/i);

assert.doesNotMatch(combined, /auth\.users/i);
assert.doesNotMatch(combined, /jsonb/i);
assert.doesNotMatch(combined, /timestamptz/i);
assert.doesNotMatch(combined, /security definer/i);
assert.doesNotMatch(combined, /row level security/i);

const wrangler = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
assert.equal(wrangler.name, "dcb-expansion-radar");
assert.equal(wrangler.main, "./src/index.js");
assert.equal(wrangler.assets?.binding, "ASSETS");
assert.equal(wrangler.d1_databases?.[0]?.binding, "RADAR_DB");
assert.deepEqual(wrangler.triggers?.crons, ["0 6,18 * * *"]);

console.log("D1 migration validation passed:", {
  schemaVersion: 3,
  tables: [
    "workspace_state",
    "app_meta",
    "source_watch_state",
    "source_watch_history",
    "discovery_candidates"
  ],
  binding: "RADAR_DB",
  cron: "0 6,18 * * *"
});
