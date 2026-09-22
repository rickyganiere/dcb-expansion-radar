-- DCB Expansion Radar · Commercial entity graph
-- Migration 0006
-- Adds publisher / advertiser discovery entities and assets.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commercial_entities (
  entity_id TEXT PRIMARY KEY,
  normalized_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  primary_role TEXT NOT NULL DEFAULT 'publisher'
    CHECK (primary_role IN ('publisher','advertiser','network','operator','aggregator','both','unknown')),
  market_id TEXT,
  domain TEXT,
  website_url TEXT,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','qualified','dismissed','pipeline')),
  confidence TEXT NOT NULL DEFAULT 'unknown'
    CHECK (confidence IN ('unknown','low','medium','high')),
  discovery_reason TEXT,
  first_source_kind TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS commercial_entities_market_status_idx
  ON commercial_entities(market_id, status, primary_role);

CREATE INDEX IF NOT EXISTS commercial_entities_domain_idx
  ON commercial_entities(domain);

CREATE TABLE IF NOT EXISTS commercial_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('app_store_app','google_play_app','website','domain','event_profile','forum_profile','other')),
  title TEXT,
  url TEXT NOT NULL,
  external_id TEXT,
  market_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (entity_id) REFERENCES commercial_entities(entity_id) ON DELETE CASCADE,
  UNIQUE(entity_id, asset_type, url)
);

CREATE INDEX IF NOT EXISTS commercial_assets_entity_type_idx
  ON commercial_assets(entity_id, asset_type);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '6')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
