import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync("supabase/schema.sql", "utf8");

const tableMatches = [...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)];
const tables = [...new Set(tableMatches.map(m => m[1]))];

assert.ok(tables.length >= 10, "Expected the prepared radar schema to contain all core tables");

for (const table of tables) {
  const rls = new RegExp("alter table public\\." + table + " enable row level security;", "i");
  assert.match(sql, rls, table + " must have RLS enabled");

  const anonRevoke = new RegExp("revoke all on public\\." + table + " from anon;", "i");
  assert.match(sql, anonRevoke, table + " must explicitly revoke anon access");
}

for (const table of [
  "markets",
  "operators",
  "billing_rails",
  "commercial_targets",
  "contacts",
  "market_signals",
  "market_sources",
  "source_checks",
  "market_score_components",
  "payment_partners",
  "payment_partner_routes"
]) {
  const serviceGrant = new RegExp(
    "grant select, insert, update, delete on public\\." + table + " to service_role;",
    "i"
  );
  assert.match(sql, serviceGrant, table + " must allow the trusted backend role");
}

assert.doesNotMatch(sql, /security\s+definer/i, "Prepared schema must not introduce SECURITY DEFINER functions");
assert.match(sql, /security\s+invoker/i, "Timestamp trigger function should use SECURITY INVOKER");
assert.match(sql, /using\s*\(\(select auth\.uid\(\)\) = user_id\)/i, "User-owned tables must include ownership-based RLS");
assert.match(sql, /with check\s*\(\(select auth\.uid\(\)\) = user_id\)/i, "User-owned writes must include WITH CHECK ownership protection");

console.log("Supabase schema validation passed:", {
  tables: tables.length,
  rlsProtected: tables.length,
  anonClosed: tables.length
});
