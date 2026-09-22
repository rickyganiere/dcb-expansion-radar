-- DCB Expansion Radar · Dynamic monitored sources
-- Migration 0004
-- Adds authenticated, D1-managed sources without modifying protected core registry sources.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS monitored_sources (
  source_id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  cadence_hours INTEGER NOT NULL DEFAULT 24
    CHECK (cadence_hours IN (12,24,72,168)),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0,1)),
  origin TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual','imported')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS monitored_sources_market_enabled_idx
  ON monitored_sources(market_id, enabled, priority);

CREATE INDEX IF NOT EXISTS monitored_sources_enabled_cadence_idx
  ON monitored_sources(enabled, cadence_hours);

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '4')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
