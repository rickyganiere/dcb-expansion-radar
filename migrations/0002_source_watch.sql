-- DCB Expansion Radar · Source Watch persistence
-- Migration 0002

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_watch_state (
  source_id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  label TEXT NOT NULL,
  source_type TEXT NOT NULL,
  url TEXT NOT NULL,
  baseline_hash TEXT,
  last_hash TEXT,
  changed INTEGER NOT NULL DEFAULT 0 CHECK (changed IN (0,1)),
  last_http_status INTEGER,
  last_duration_ms INTEGER,
  last_title TEXT,
  last_error TEXT,
  checked_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS source_watch_state_market_changed_idx
  ON source_watch_state(market_id, changed, checked_at DESC);

CREATE TABLE IF NOT EXISTS source_watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  content_hash TEXT,
  changed INTEGER NOT NULL DEFAULT 0 CHECK (changed IN (0,1)),
  http_status INTEGER,
  duration_ms INTEGER,
  title TEXT,
  error TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (source_id) REFERENCES source_watch_state(source_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS source_watch_history_source_checked_idx
  ON source_watch_history(source_id, checked_at DESC);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '2')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
