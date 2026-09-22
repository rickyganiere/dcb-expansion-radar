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

-- Reset legacy baselines that were accidentally captured from anti-bot challenge pages.
-- The next successful source check will establish a clean baseline.
UPDATE source_watch_state
SET baseline_hash = NULL,
    last_hash = NULL,
    changed = 0,
    last_error = 'Baseline reset: previously captured bot challenge',
    reviewed_at = NULL,
    reviewed_by = NULL,
    review_note = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE lower(COALESCE(last_title, '')) LIKE '%challenge validation%'
   OR lower(COALESCE(last_title, '')) LIKE '%just a moment%'
   OR lower(COALESCE(last_title, '')) LIKE '%verify you are human%'
   OR lower(COALESCE(last_title, '')) LIKE '%checking your browser%'
   OR lower(COALESCE(last_title, '')) LIKE '%attention required%'
   OR lower(COALESCE(last_title, '')) LIKE '%security check%'
   OR lower(COALESCE(last_title, '')) LIKE '%robot check%'
   OR lower(COALESCE(last_title, '')) LIKE '%access denied%';

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '3')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
