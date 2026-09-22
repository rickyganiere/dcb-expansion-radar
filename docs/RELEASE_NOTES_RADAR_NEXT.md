# Radar Next · Release Notes

Branch: `feature/radar-next`  
Target: `main`

## What changes

### 1. D1 operational status
- API badge reports the real D1 schema version.
- Schema guards prevent Discovery Inbox and Source Manager from running before their migrations exist.
- Workspace auto-sync continues correctly after the first cloud save.
- Optimistic conflict handling remains enabled.

### 2. Automation Health
- Dashboard panel shows:
  - monitored sources
  - healthy sources
  - changed sources
  - failed checks
  - rate-limited sources
  - bot-blocked sources
  - stale sources
  - sources due now
  - pending Discovery Inbox items
- Last and next scheduled run are shown in local browser time.
- Metrics refresh immediately after Source Watch, Discovery Inbox or Source Manager changes.

### 3. Source Watch hardening
- Checks run with concurrency capped at 3.
- Same-host requests are staggered.
- HTTP 429 and 5xx responses are retried.
- Retry-After supports seconds and HTTP-date forms.
- Transient network failures are retried.
- Retry responses are closed before another attempt.
- HTTP errors are stored as failures, never as “No change”.
- Anti-bot pages such as “Challenge Validation” and “Just a moment” are rejected even when HTTP status is 200.
- Legacy challenge-page baselines are reset by migration 0003.
- UI explicitly labels Rate limited and Bot challenge states.

### 4. Cadence-aware scheduled scanning
- Every source has an explicit cadence and priority.
- Commercial billing-route sources can run every 12h.
- Google Play billing evidence runs daily.
- slower regulatory evidence can run every 3 or 7 days.
- Scheduled Cron checks only sources that are actually due.
- Manual “Check all sources” still forces a full check.
- 429 responses use at least a 24h backoff.
- bot challenges use at least a 72h backoff.
- Source Watch displays cadence and priority per source.
- monitored responses are limited to HTML/XHTML/plain text and 2 MB.
- binary/PDF or oversized responses fail safely instead of entering fingerprint history.

### 5. Discovery Inbox
- Source changes create deduplicated review candidates in D1.
- A source change never becomes verified intelligence automatically.
- Candidate states:
  - Pending review
  - Accepted for research
  - Dismissed
- Candidates can be reopened.
- Each candidate links to both the source and its market.
- Pending/accepted/dismissed counts are visible.

### 6. Source Manager
- New authenticated Source Manager backed by D1.
- The 14 core sources remain protected and read-only.
- Custom sources can be:
  - added
  - edited
  - enabled
  - disabled
  - bulk imported from CSV
  - exported to CSV
- Disabling a custom source stops future scans without deleting its history.
- Only public HTTPS URLs are accepted.
- Direct IPs, localhost/internal hosts, embedded credentials and custom ports are rejected.
- Supported cadence values: 12h, 24h, 72h and 168h.
- Bulk import accepts up to 100 rows per request and reports created/skipped/errors.
- **Preview import** validates CSV rows without writing anything to D1.
- **Test source** probes a single candidate URL before saving it, including bot-challenge/content checks.
- Duplicate URLs are skipped instead of duplicated.
- Custom sources feed Source Watch and Discovery Inbox but never auto-promote to verified intelligence.

### 7. D1 schema v4
Migration 0003 adds:
- `discovery_candidates`

Migration 0004 adds:
- `monitored_sources`

Migration 0003 also clears known anti-bot baselines before writing schema version 3.
Migration 0004 advances the schema to version 4.

### 8. Product copy / UI cleanup
- Removed stale “prototype” and old-backend language.
- Workflow copy reflects D1 persistence, Discovery Inbox and automation.
- Pipeline copy reflects local fallback + D1 sync.
- Product status presents the tool as an operational intelligence workspace.
- Operational panels refresh together after checks/reviews/source changes.

### 9. Testing
CI validates feature branches and covers:
- intelligence data
- JavaScript syntax
- D1 schema v4
- required assets
- workspace persistence
- optimistic concurrency
- Automation Health API
- Discovery Inbox API
- accept/reopen review flow
- HTTP 429 retry → success
- persistent HTTP 429 → failed check
- HTTP 200 anti-bot challenge → failed check
- cadence-aware Cron skipping fresh sources
- rate-limit backoff
- core-source cadence metadata
- Source Manager create/update/disable lifecycle
- bulk CSV source import with duplicate/error reporting
- protected core source mutation rejection
- unsafe custom URL rejection
- unsupported content-type rejection
- oversized response rejection

## Production release order

1. Confirm branch CI is green.
2. Apply migration `0003_discovery_inbox.sql` to production D1.
3. Apply migration `0004_monitored_sources.sql` to production D1.
4. Verify `schema_version = 4`.
5. Merge `feature/radar-next` to `main` once.
6. Wait for one Cloudflare production deployment.
7. Run post-deploy checks from `docs/RELEASE_CHECKLIST.md`.

No production merge or deploy should happen before migrations 0003 and 0004 are applied successfully.
