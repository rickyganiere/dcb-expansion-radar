# Release Checklist · radar-next

Production branch: `main`  
Staging branch: `feature/radar-next`

Do not merge the feature branch before the D1 migration is applied.

## 1. Validate the feature branch

Required:
- GitHub Actions validation passes.
- JavaScript syntax checks pass.
- D1 schema validation reports version 3.
- Worker smoke tests pass.
- Required static assets are present.
- No Supabase references remain in active code.

## 2. Apply the backwards-compatible D1 migration

Apply only the new migration before merging:

```sql
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
```

Verify:

```sql
SELECT key, value
FROM app_meta
WHERE key = 'schema_version';
```

Expected:

```text
schema_version | 3
```

## 3. Merge once

Merge `feature/radar-next` into `main` only after step 2 succeeds.

This single merge is the production release trigger.

## 4. Post-deploy checks

Open the production Radar and verify:
- Cloudflare Access login still works.
- API badge shows `API + D1 online`.
- Automation Health loads.
- Source Watch loads central authenticated state.
- Discovery Inbox loads without database errors.
- Workspace D1 sync shows authenticated user.
- Pipeline/shortlist changes persist after refresh.

## 5. Manual Source Watch test

Run `Check all sources`.

Expected behavior:
- successful sources show `No change` unless fingerprint changed;
- HTTP 429 shows `Rate limited`;
- HTTP 5xx shows `Check failed`;
- changed fingerprints create Discovery Inbox candidates;
- repeated checks with the same changed hash do not duplicate candidates.

## 6. Database verification

Check:

```sql
SELECT key, value
FROM app_meta
WHERE key IN (
  'schema_version',
  'last_source_watch_run',
  'last_source_watch_summary'
);
```

Then:

```sql
SELECT status, COUNT(*) AS count
FROM discovery_candidates
GROUP BY status;
```

## 7. Release complete

Only mark the release complete when:
- branch CI is green;
- schema version is 3;
- production deployment is healthy;
- D1 workspace persistence works;
- Source Watch works;
- Discovery Inbox works;
- no unexpected 5xx errors appear in the UI.
