-- DCB Expansion Radar · Publisher web enrichment
-- Migration 0008
-- Adds explainable commercial signals found while expanding publisher websites.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commercial_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN (
      'affiliate_program',
      'advertise',
      'partner',
      'publisher',
      'app_portfolio',
      'outbound_commercial_domain',
      'contact',
      'other'
    )),
  label TEXT,
  url TEXT NOT NULL,
  evidence_text TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json)),
  detected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (entity_id) REFERENCES commercial_entities(entity_id) ON DELETE CASCADE,
  UNIQUE(entity_id, signal_type, url)
);

CREATE INDEX IF NOT EXISTS commercial_signals_entity_type_idx
  ON commercial_signals(entity_id, signal_type, detected_at DESC);

CREATE TABLE IF NOT EXISTS publisher_enrichment_state (
  entity_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed')),
  last_checked_at TEXT,
  last_http_status INTEGER,
  last_error TEXT,
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  signals_found INTEGER NOT NULL DEFAULT 0,
  linked_domains_found INTEGER NOT NULL DEFAULT 0,
  apps_found INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (entity_id) REFERENCES commercial_entities(entity_id) ON DELETE CASCADE
);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '8')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
