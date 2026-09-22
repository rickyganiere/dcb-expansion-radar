import assert from "node:assert/strict";
import fs from "node:fs";

const workspaceSql = fs.readFileSync("migrations/0001_workspace.sql", "utf8");
const sourceSql = fs.readFileSync("migrations/0002_source_watch.sql", "utf8");
const discoverySql = fs.readFileSync("migrations/0003_discovery_inbox.sql", "utf8");
const managedSourcesSql = fs.readFileSync("migrations/0004_monitored_sources.sql", "utf8");
const entityTagsSql = fs.readFileSync("migrations/0005_source_entity_tags.sql", "utf8");
const combined = workspaceSql + "\n" + sourceSql + "\n" + discoverySql + "\n" + managedSourcesSql + "\n" + entityTagsSql;

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
assert.match(discoverySql, /previously captured bot challenge/i);
assert.match(discoverySql, /baseline_hash = NULL/i);
assert.match(discoverySql, /schema_version', '3/i);

assert.match(managedSourcesSql, /CREATE TABLE IF NOT EXISTS monitored_sources/i);
assert.match(managedSourcesSql, /cadence_hours INTEGER NOT NULL DEFAULT 24/i);
assert.match(managedSourcesSql, /priority TEXT NOT NULL DEFAULT 'medium'/i);
assert.match(managedSourcesSql, /enabled INTEGER NOT NULL DEFAULT 1/i);
assert.match(managedSourcesSql, /UNIQUE/i);
assert.match(managedSourcesSql, /schema_version', '4/i);

assert.match(entityTagsSql, /ALTER TABLE monitored_sources/i);
assert.match(entityTagsSql, /entity_tags_json TEXT NOT NULL DEFAULT '\[\]'/i);
assert.match(entityTagsSql, /json_valid\(entity_tags_json\)/i);
assert.match(entityTagsSql, /schema_version', '5/i);

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
  schemaVersion: 5,
  tables: [
    "workspace_state",
    "app_meta",
    "source_watch_state",
    "source_watch_history",
    "discovery_candidates",
    "monitored_sources"
  ],
  migrations: 5,
  binding: "RADAR_DB",
  cron: "0 6,18 * * *"
});
