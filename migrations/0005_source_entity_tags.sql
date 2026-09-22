-- DCB Expansion Radar · Source entity tags
-- Migration 0005
-- Adds operator / partner tags to D1-managed monitored sources.

PRAGMA foreign_keys = ON;

ALTER TABLE monitored_sources
ADD COLUMN entity_tags_json TEXT NOT NULL DEFAULT '[]'
CHECK (json_valid(entity_tags_json));

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '5')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
