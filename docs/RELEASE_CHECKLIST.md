# Release Checklist · radar-next

Production branch: `main`  
Staging branch: `feature/radar-next`

Do not merge before all pending D1 migrations are applied.

## 1. Validate branch
Required:
- GitHub Actions green.
- JavaScript syntax green.
- D1 schema validation = version 7.
- Worker smoke tests green.
- Publisher Discovery smoke tests green.
- App Discovery smoke tests green.
- Required static assets present.

## 2. Apply migration 0003
```text
migrations/0003_discovery_inbox.sql
```

## 3. Apply migration 0004
```text
migrations/0004_monitored_sources.sql
```

## 4. Apply migration 0005
```text
migrations/0005_source_entity_tags.sql
```

## 5. Apply migration 0006
```text
migrations/0006_commercial_entities.sql
```

## 6. Apply migration 0007
```text
migrations/0007_app_discovery_queue.sql
```

## 7. Verify schema
Run:

```sql
SELECT key, value
FROM app_meta
WHERE key = 'schema_version';
```

Expected:

```text
schema_version | 7
```

Verify tables:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'discovery_candidates',
    'monitored_sources',
    'commercial_entities',
    'commercial_assets',
    'app_discovery_seeds',
    'app_discovery_queue'
  )
ORDER BY name;
```

Expected all six tables.

## 8. Merge once
Merge `feature/radar-next` into `main` only after schema version 7 is confirmed.

This single merge is the production deployment trigger.

## 9. Post-deploy checks
Open production Radar and verify:
- Cloudflare Access works.
- API badge shows `API + D1 v7 online`.
- Workspace sync works.
- Automation Health loads.
- Source Watch loads central authenticated state.
- Discovery Inbox loads.
- Manage Sources opens.
- Publisher Discovery loads.
- Store Discovery Seeds panel loads.
- Pipeline/shortlist persist after refresh.

## 10. Coverage / Source Manager checks
Verify:
- all six markets appear in Coverage gaps;
- Healthy / Review / Degraded / Unchecked / Gap behave correctly;
- Attention Queue explains each priority;
- Test source works;
- Preview import does not write;
- CSV import/export works;
- entity tags persist;
- disabled sources stop scanning without losing history.

## 11. Publisher Discovery test
Paste one real Google Play or Apple App Store listing.

Verify:
- app name extracted;
- developer/company extracted when available;
- developer/support/privacy domains mapped;
- social links do not become primary publisher domain;
- candidate appears in Publisher Discovery;
- role can change Publisher → Advertiser / Network / Both;
- Qualify / Dismiss / Reopen work;
- Add to pipeline creates the same target in the commercial pipeline.

## 12. Store Discovery test
Create one seed or install a VAS preset pack for one market.

Run **Run discovery now**.

Verify:
- seed reports found/new/existing apps;
- app URLs appear in queue;
- Process queue creates publisher candidates;
- duplicate app URLs do not duplicate queue rows;
- failed app listing can be retried;
- scheduled summary does not overload store endpoints.

## 13. Source Watch test
Run **Check all sources**.

Expected:
- successful source → No change or changed fingerprint;
- HTTP 429 → Rate limited;
- HTTP 5xx → Check failed;
- bot challenge → Bot challenge;
- binary/PDF and >2 MB responses rejected;
- changed hash creates one review candidate.

## 14. Database verification
```sql
SELECT status, COUNT(*) AS count
FROM discovery_candidates
GROUP BY status;
```

```sql
SELECT enabled, COUNT(*) AS count
FROM monitored_sources
GROUP BY enabled;
```

```sql
SELECT primary_role, status, COUNT(*) AS count
FROM commercial_entities
GROUP BY primary_role, status
ORDER BY primary_role, status;
```

```sql
SELECT scan_status, COUNT(*) AS count
FROM app_discovery_queue
GROUP BY scan_status;
```

## 15. Release complete
Only mark complete when:
- schema version = 7;
- production deploy healthy;
- D1 workspace persistence works;
- Source Watch works;
- Publisher Discovery works;
- automated Store Discovery works;
- no unexpected 5xx errors appear.
