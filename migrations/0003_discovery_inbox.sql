-- DCB Expansion Radar · Discovery Inbox
-- Migration 0003
-- Source changes become reviewable research candidates, never verified intelligence automatically.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discovery_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  candidate_type TEXT NOT NULL DEFAULT 'source_change',
  content_hash TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','dismissed')),
  detected_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(source_id, content_hash),
  FOREIGN KEY (source_id) REFERENCES source_watch_state(source_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS discovery_candidates_status_detected_idx
  ON discovery_candidates(status, detected_at DESC);

CREATE INDEX IF NOT EXISTS discovery_candidates_market_status_idx
  ON discovery_candidates(market_id, status, detected_at DESC);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '3')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
