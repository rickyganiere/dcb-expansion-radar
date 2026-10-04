-- DCB Expansion Radar · evidence quality metadata
-- Migration 0003
PRAGMA foreign_keys = ON;

ALTER TABLE source_watch_state ADD COLUMN provenance_class TEXT;
ALTER TABLE source_watch_state ADD COLUMN authority_score INTEGER NOT NULL DEFAULT 50 CHECK (authority_score BETWEEN 0 AND 100);
ALTER TABLE source_watch_state ADD COLUMN freshness_hours INTEGER NOT NULL DEFAULT 168 CHECK (freshness_hours BETWEEN 1 AND 8760);
ALTER TABLE source_watch_state ADD COLUMN evidence_scope TEXT;
ALTER TABLE source_watch_state ADD COLUMN confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS source_watch_state_confidence_idx
  ON source_watch_state(confidence_score DESC, checked_at DESC);

CREATE TABLE IF NOT EXISTS commercial_confirmations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('operator','aggregator','billing_partner','ott_partner','other')),
  entity_name TEXT NOT NULL,
  route_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('reported','confirmed','rejected','expired')),
  source_ref TEXT,
  note TEXT,
  confirmed_at TEXT,
  expires_at TEXT,
  entered_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS commercial_confirmations_market_status_idx
  ON commercial_confirmations(market_id,status,confirmed_at DESC);

INSERT INTO app_meta (key,value)
VALUES ('schema_version','3')
ON CONFLICT(key) DO UPDATE SET
  value=excluded.value,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
