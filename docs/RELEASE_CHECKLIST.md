# Release Checklist · radar-next

Production branch: `main`  
Staging branch: `feature/radar-next`

Do not merge the feature branch before both pending D1 migrations are applied.

## 1. Validate the feature branch

Required:
- GitHub Actions validation passes.
- JavaScript syntax checks pass.
- D1 schema validation reports version 4.
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

This creates `monitored_sources` and advances the schema to version 4.

## 4. Verify schema

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

## 5. Merge once

Merge `feature/radar-next` into `main` only after schema version 4 is confirmed.

This single merge is the production release trigger.

## 6. Post-deploy checks

Open the production Radar and verify:
- Cloudflare Access login still works.
- API badge shows `API + D1 v4 online`.
- Automation Health loads.
- Source Watch loads central authenticated state.
- Discovery Inbox loads without database errors.
- Manage Sources opens.
- Workspace D1 sync shows the authenticated user.
- Pipeline/shortlist changes persist after refresh.

## 7. Source Manager test

Open **Manage sources**.

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
- core sources do not expose destructive edit controls.

The temporary source can remain disabled after the test so history is preserved.

## 8. Manual Source Watch test

Run **Check all sources**.

Expected behavior:
- successful sources show `No change` unless fingerprint changed;
- HTTP 429 shows `Rate limited`;
- HTTP 5xx shows `Check failed`;
- bot challenge HTML shows `Bot challenge`;
- changed fingerprints create Discovery Inbox candidates;
- repeated checks with the same changed hash do not duplicate candidates.

## 9. Cadence verification

Automation Health should show **Due now**.

A scheduled run should:
- attempt only due sources;
- write `skippedByCadence` in the run summary;
- respect at least 24h backoff after 429;
- respect at least 72h backoff after bot challenge.

Manual **Check all sources** intentionally ignores cadence.

## 10. Database verification

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

## 11. Release complete

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
