-- DCB Expansion Radar · D1 workspace schema
-- Migration 0001
-- Personal workspace is stored as one versioned JSON snapshot per authenticated user.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_state (
  user_id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS workspace_state_updated_at_idx
  ON workspace_state(updated_at);

CREATE TABLE IF NOT EXISTS source_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  market_id TEXT,
  content_hash TEXT NOT NULL,
  changed INTEGER NOT NULL DEFAULT 0 CHECK (changed IN (0,1)),
  http_status INTEGER,
  duration_ms INTEGER,
  checked_at TEXT NOT NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS source_observations_user_source_idx
  ON source_observations(user_id, source_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '1')
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
