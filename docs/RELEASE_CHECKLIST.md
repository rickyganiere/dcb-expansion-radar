# Release Checklist · radar-next

Production branch: `main`  
Staging branch: `feature/radar-next`

Do not merge the feature branch before both pending D1 migrations are applied.

## 1. Validate the feature branch

Required:
- GitHub Actions validation passes.
- JavaScript syntax checks pass.
- D1 schema validation reports version 5.
- Worker smoke tests pass.
- Required static assets are present.
- No Supabase references remain in active code.

## 2. Apply migration 0003

Open production D1 and execute the exact contents of:

```text
migrations/0003_discovery_inbox.sql
```

This creates `discovery_candidates`, resets known challenge-page baselines and advances the schema to version 3.

## 3. Apply migration 0004

Then execute the exact contents of:

```text
migrations/0004_monitored_sources.sql
```

This creates `monitored_sources` and advances the schema to version 5.

## 4. Apply migration 0005

Then execute the exact contents of:

```text
migrations/0005_source_entity_tags.sql
```

This adds operator / partner tags to managed sources and advances the schema to version 5.

## 5. Verify schema

Run:

```sql
SELECT key, value
FROM app_meta
WHERE key = 'schema_version';
```

Expected:

```text
schema_version | 4
```

Also verify the new tables exist:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN ('discovery_candidates','monitored_sources')
ORDER BY name;
```

Expected:
- `discovery_candidates`
- `monitored_sources`

## 6. Merge once

Merge `feature/radar-next` into `main` only after schema version 5 is confirmed.

This single merge is the production release trigger.

## 7. Post-deploy checks

Open the production Radar and verify:
- Cloudflare Access login still works.
- API badge shows `API + D1 v5 online`.
- Automation Health loads.
- Source Watch loads central authenticated state.
- Discovery Inbox loads without database errors.
- Manage Sources opens.
- Workspace D1 sync shows the authenticated user.
- Pipeline/shortlist changes persist after refresh.

## 8. Coverage gaps

Open **Manage sources** and verify the Coverage gaps panel and **Attention Queue**:
- all six markets are listed;
- Billing evidence / Market-regulatory / Commercial ecosystem are shown separately;
- missing pillars expose **Add source**;
- selecting a gap pre-fills market, type, cadence and priority;
- a failing source shows Degraded rather than Healthy;
- a new source with no successful check shows Unchecked;
- Attention Queue lists a reason and suggested source parameters;
- billing gaps/degraded billing appear before lower-impact ecosystem gaps;
- after adding and successfully checking a matching source, that gap closes without affecting the other pillars.

## 9. Source Manager test

Open **Manage sources**.

Verify **Test source**, **Preview import**, **Import CSV**, **Export CSV** and **CSV template** are visible.

Create one temporary public HTTPS source with:
- valid market
- valid source type
- cadence
- priority

Verify:
- it appears as custom and enabled;
- it appears in Source Watch;
- changing cadence updates immediately;
- disabling it removes it from active Source Watch;
- it remains listed in Source Manager as disabled;
- core sources do not expose destructive edit controls;
- a small CSV import reports created/skipped/errors correctly;
- Preview import reports valid/skipped/errors without writing records;
- Test source succeeds on a normal HTML page and rejects a bot/security challenge;
- duplicate URLs are skipped;
- entity tags can be created and edited;
- updating a source without the tag field preserves existing tags;
- bulk CSV imports semicolon-separated entity tags;
- export CSV contains entity tags for custom sources.

The temporary source can remain disabled after the test so history is preserved.

## 10. Manual Source Watch test

Run **Check all sources**.

Expected behavior:
- successful sources show `No change` unless fingerprint changed;
- HTTP 429 shows `Rate limited`;
- HTTP 5xx shows `Check failed`;
- bot challenge HTML shows `Bot challenge`;
- binary/PDF responses are rejected;
- responses above 2 MB are rejected;
- changed fingerprints create Discovery Inbox candidates;
- repeated checks with the same changed hash do not duplicate candidates.

## 11. Cadence verification

Automation Health should show **Due now**.

A scheduled run should:
- attempt only due sources;
- write `skippedByCadence` in the run summary;
- respect at least 24h backoff after 429;
- respect at least 72h backoff after bot challenge.

Manual **Check all sources** intentionally ignores cadence.

## 12. Database verification

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

And:

```sql
SELECT enabled, COUNT(*) AS count
FROM monitored_sources
GROUP BY enabled;
```

## 13. Release complete

Only mark the release complete when:
- branch CI is green;
- schema version is 4;
- production deployment is healthy;
- D1 workspace persistence works;
- Source Watch works;
- cadence scheduling works;
- Discovery Inbox works;
- Source Manager works;
- no unexpected 5xx errors appear in the UI.
