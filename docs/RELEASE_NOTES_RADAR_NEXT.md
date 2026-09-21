# Radar Next · Release Notes

Branch: `feature/radar-next`  
Target: `main`

## What changes

### 1. D1 operational status
- API badge reports the real D1 schema version.
- New v3 schema guard prevents Discovery features from running before migration.
- Workspace auto-sync continues correctly after the first cloud save.
- Optimistic conflict handling remains enabled.

### 2. Automation Health
- New dashboard panel for:
  - monitored sources
  - healthy sources
  - changed sources
  - failed checks
  - rate-limited sources
  - bot-blocked sources
  - stale sources
  - pending Discovery Inbox items
- Last and next scheduled run are shown in local browser time.
- Registry sources not yet written to D1 are counted as unchecked.

### 3. Source Watch hardening
- Source checks run with concurrency capped at 3.
- Requests to the same hostname are staggered.
- HTTP 429 and 5xx responses are retried.
- Retry-After supports seconds and HTTP-date forms.
- Transient network failures are retried.
- Retry responses are closed before another attempt.
- HTTP errors are stored as failures, never as “No change”.
- Anti-bot pages such as “Challenge Validation” and “Just a moment” are rejected even when HTTP status is 200.
- Legacy baselines captured from challenge pages are reset by migration v3.
- UI explicitly labels Rate limited and Bot challenge states.

### 4. Discovery Inbox
- Source changes create deduplicated review candidates in D1.
- A source change never becomes verified intelligence automatically.
- Candidate states:
  - Pending review
  - Accepted for research
  - Dismissed
- Candidates can be reopened.
- Each candidate links to both the source and its market.
- Pending/accepted/dismissed counts are visible.

### 5. D1 schema v3
New table:
- `discovery_candidates`

Migration also resets known anti-bot baselines and writes `schema_version=3` only after migration cleanup succeeds.

### 6. Product copy / UI cleanup
- Removed stale “prototype” and old-backend language.
- Workflow copy reflects D1 persistence and Discovery Inbox.
- Pipeline copy reflects local fallback + D1 sync.
- Product status now presents the tool as an operational intelligence workspace.

### 7. Testing
CI now validates feature branches and covers:
- intelligence data
- JavaScript syntax
- D1 schema v3
- required assets
- workspace persistence
- optimistic concurrency
- Automation Health API
- Discovery Inbox API
- accept/reopen review flow
- HTTP 429 retry → success
- persistent HTTP 429 → failed check
- HTTP 200 anti-bot challenge → failed check

## Production release order

1. Confirm branch CI is green.
2. Apply migration `0003_discovery_inbox.sql` to production D1.
3. Verify `schema_version = 3`.
4. Merge `feature/radar-next` to `main` once.
5. Wait for one Cloudflare production deployment.
6. Run post-deploy checks from `docs/RELEASE_CHECKLIST.md`.

No production merge or deploy should happen before step 2.
