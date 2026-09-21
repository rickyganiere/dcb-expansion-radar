import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("migrations/0001_workspace.sql", "utf8");

assert.match(sql, /CREATE TABLE IF NOT EXISTS workspace_state/i);
assert.match(sql, /payload_json TEXT NOT NULL CHECK \(json_valid\(payload_json\)\)/i);
assert.match(sql, /version INTEGER NOT NULL DEFAULT 1/i);
assert.match(sql, /user_id TEXT PRIMARY KEY/i);
assert.match(sql, /CREATE TABLE IF NOT EXISTS source_observations/i);
assert.match(sql, /CREATE INDEX IF NOT EXISTS workspace_state_updated_at_idx/i);
assert.match(sql, /CREATE INDEX IF NOT EXISTS source_observations_user_source_idx/i);
assert.match(sql, /CREATE TABLE IF NOT EXISTS app_meta/i);
assert.match(sql, /schema_version/i);

assert.doesNotMatch(sql, /auth\.users/i);
assert.doesNotMatch(sql, /jsonb/i);
assert.doesNotMatch(sql, /timestamptz/i);
assert.doesNotMatch(sql, /security definer/i);
assert.doesNotMatch(sql, /row level security/i);

const wrangler = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
assert.equal(wrangler.name, "dcb-expansion-radar");
assert.equal(wrangler.main, "./src/index.js");
assert.equal(wrangler.assets?.binding, "ASSETS");

console.log("D1 migration validation passed:", {
  schemaVersion: 1,
  tables: ["workspace_state", "source_observations", "app_meta"],
  bindingExpected: "RADAR_DB"
});
