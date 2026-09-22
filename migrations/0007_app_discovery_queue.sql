-- DCB Expansion Radar · Automated app discovery
-- Migration 0007
-- Adds scheduled App Store / Google Play discovery seeds and an app listing queue.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_discovery_seeds (
  seed_id TEXT PRIMARY KEY,
  store TEXT NOT NULL
    CHECK (store IN ('apple_app_store','google_play')),
  market_id TEXT NOT NULL,
  query TEXT NOT NULL,
  cadence_hours INTEGER NOT NULL DEFAULT 24
    CHECK (cadence_hours IN (12,24,72,168)),
  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0,1)),
  last_checked_at TEXT,
  last_http_status INTEGER,
  last_error TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(store, market_id, query)
);

CREATE INDEX IF NOT EXISTS app_discovery_seeds_enabled_market_idx
  ON app_discovery_seeds(enabled, market_id, store);

CREATE TABLE IF NOT EXISTS app_discovery_queue (
  listing_url TEXT PRIMARY KEY,
  store TEXT NOT NULL
    CHECK (store IN ('apple_app_store','google_play')),
  market_id TEXT NOT NULL,
  seed_id TEXT,
  app_name TEXT,
  developer_hint TEXT,
  scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending','scanned','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_error TEXT,
  entity_id TEXT,
  discovered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (seed_id) REFERENCES app_discovery_seeds(seed_id) ON DELETE SET NULL,
  FOREIGN KEY (entity_id) REFERENCES commercial_entities(entity_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS app_discovery_queue_status_market_idx
  ON app_discovery_queue(scan_status, market_id, discovered_at DESC);

CREATE INDEX IF NOT EXISTS app_discovery_queue_seed_idx
  ON app_discovery_queue(seed_id, discovered_at DESC);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '7')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
