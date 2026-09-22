# DCB Expansion Radar

DCB Expansion Radar is a market-expansion intelligence workspace for DCB, VAS and OTT teams.

## Current phase

Operational private workspace on Cloudflare Workers + D1 + Cloudflare Access.

Production remains on `main`. New development is prepared on `feature/radar-next` and is not merged until the complete block is validated.

### Live market intelligence
- Mexico
- Colombia
- Brazil
- Peru
- Chile
- Argentina

### Working product features
- Search across markets, operators, rails, companies and decision-makers
- Evidence/confidence model: verified / review / unknown
- Billing-rail taxonomy instead of a simple DCB yes/no field
- Market shortlist
- Compare up to three markets
- Market drill-down
- Transparent opportunity score model
- Billing-route intelligence
- Commercial target mapping
- Named public professional decision-makers
- First-touch outreach generator with copy action
- Commercial pipeline with stages, notes, follow-up dates and CSV export
- Due/overdue follow-up alerts
- Market signals feed
- Recheck queue for incomplete or stale intelligence
- Source Watch with central D1 baselines, history and reviewable changes
- Twice-daily Source Watch Cron
- Same-host throttling and retry/backoff for 429/5xx source responses
- Per-source cadence and priority with cadence-aware scheduled scans
- Automation Health dashboard
- Discovery Inbox for reviewable source-change candidates
- D1 Source Manager for adding/editing/disabling custom monitored sources
- bulk CSV import/export for source operations
- Per-market commercial notes
- Workspace backup/restore
- Shareable market deep links
- Printable market report export
- D1 workspace sync with optimistic conflict protection
- Cloudflare Access identity verification with signed JWT fallback
- Responsive desktop/tablet/mobile UI

## Reliability model

Automation never promotes a changed page directly into verified intelligence.

```text
Monitored source
      |
      v
Source Watch fingerprint
      |
      +--> no change -> history only
      |
      +--> changed -> Discovery Inbox candidate
                         |
                         +--> accepted for research
                         +--> dismissed
```

A source change is a research signal, not proof of a commercial route.

## Architecture

```text
GitHub
  |- main                    production
  |- feature/radar-next      staged development
        |
        v
Cloudflare Worker
  |- Static Assets
  |- Workspace API
  |- Source Watch
  |- Automation Health
  |- Discovery Inbox
  |- scheduled() Cron
        |
        +----> Cloudflare D1
        |       |- workspace_state
        |       |- source_watch_state
        |       |- source_watch_history
        |       |- discovery_candidates
        |       |- monitored_sources
        |       |- app_meta
        |
        +----> Cloudflare Access
                |- authenticated account identity
                |- signed JWT verification
```

The site and API share a single Worker. No Supabase dependency is required.

Static market intelligence remains versioned in GitHub until automatic discovery produces reviewed data that justifies a dynamic intelligence store.

## D1 schema

Current prepared schema version: **4**.

### Migration 0001
- `workspace_state`
- `app_meta`

### Migration 0002
- `source_watch_state`
- `source_watch_history`

### Migration 0003
- `discovery_candidates`

### Migration 0004
- `monitored_sources`

Workspace writes use optimistic versioning. A stale client receives `409 version_conflict` instead of silently overwriting newer cloud state.

## Source Watch automation

Cron:

```text
0 6,18 * * *
```

Source checks:
- run with concurrency capped at 3
- stagger requests to the same hostname
- retry HTTP 429 and 5xx responses
- accept only HTML/XHTML/plain-text monitored content up to 2 MB
- retain a reviewed baseline
- store check history
- keep changed state pending until baseline review
- create one Discovery Inbox candidate per unique source hash
- skip non-due sources during scheduled Cron runs
- preserve full manual checks on demand

## API

Core endpoints:
- `GET /api/health`
- `GET /api/status`
- `GET /api/workspace/status`
- `GET /api/workspace`
- `PUT /api/workspace`
- `GET /api/sources`
- `GET /api/check-source?id=<source-id>`
- `GET /api/source-watch/state`
- `GET /api/source-watch/history?id=<source-id>`
- `POST /api/source-watch/review`
- `POST /api/source-watch/run`
- `GET /api/automation/health`
- `GET /api/discovery/inbox?status=pending`
- `POST /api/discovery/review`
- `GET /api/source-manager`
- `POST /api/source-manager`

D1 workspace and review actions require a verified Cloudflare Access identity.

## Repository structure

```text
public/
  index.html
  styles.css
  data.js
  signals.js
  partners.js
  scores.js
  app.js
  workspace-tools.js
  d1-sync.js
  source-watch.js
  automation-health.js
  discovery-inbox.js
  source-manager.js
  market-notes.js
  followup-alerts.js
  market-report.js
src/
  index.js
  access-auth.js
  source-registry.js
migrations/
  0001_workspace.sql
  0002_source_watch.sql
  0003_discovery_inbox.sql
  0004_monitored_sources.sql
scripts/
  validate-data.mjs
  validate-d1.mjs
  smoke-worker.mjs
docs/
  D1_SETUP.md
  RELEASE_CHECKLIST.md
.github/workflows/
  validate.yml
wrangler.jsonc
README.md
```

## Product rule

A market is never marked simply "DCB = yes/no".

The radar distinguishes:
- App-store DCB
- Operator co-billing
- Postpaid invoice
- Prepaid balance
- OTT bundle/distribution
- Digital-service billing
- Unverified / route recheck

A public billing example does not automatically prove a merchant-ready integration API.

## Release discipline

Development stays on `feature/radar-next`. Production deployment happens only after the full branch passes validation and the D1 migration is applied in the order documented in `docs/RELEASE_CHECKLIST.md`.
