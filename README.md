# DCB Expansion Radar

DCB Expansion Radar is a market-expansion intelligence workspace for DCB, VAS and OTT teams.

## Current phase

Interactive MVP deployed on Cloudflare Workers Static Assets, with the backend standardized on Cloudflare D1.

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
- Source Watch with per-source content fingerprints and reviewable changes
- Per-market commercial notes
- Workspace backup/restore
- Shareable market deep links
- Printable market report export
- D1 workspace sync client with conflict protection
- Cloudflare API health/status/source-monitor/workspace endpoints
- Responsive desktop/tablet/mobile UI

## Architecture

```text
GitHub (source of truth)
        |
        v
Cloudflare Worker
  |- Static Assets (public/)
  |- API routes (src/index.js)
  |- Source Watch
  |- Workspace API
        |
        +----> Cloudflare D1
        |       |- versioned workspace snapshot
        |       |- source observations
        |       |- app metadata
        |
        +----> Cloudflare Access
                |- authenticated user identity
```

The site and API share a single Worker. No Supabase dependency is required.

The current market-intelligence dataset remains versioned in GitHub/static assets. D1 initially stores the personal workspace only: shortlist, compare state, pipeline, notes and Source Watch state. This keeps D1 usage extremely small and avoids duplicating data until automatic intelligence ingestion is introduced.

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
  market-notes.js
  followup-alerts.js
  market-report.js
src/
  index.js
  source-registry.js
migrations/
  0001_workspace.sql
scripts/
  validate-data.mjs
  validate-d1.mjs
  smoke-worker.mjs
.github/workflows/
  validate.yml
wrangler.jsonc
README.md
```

## Cloudflare deployment

Cloudflare is connected to the GitHub `main` branch.

Deploy command:

```bash
npx wrangler deploy
```

The Worker serves assets from `./public/` and exposes:
- `GET /api/health`
- `GET /api/status`
- `GET /api/sources`
- `GET /api/check-source?id=<source-id>`
- `GET /api/workspace/status`
- `GET /api/workspace`
- `PUT /api/workspace`

Workspace reads/writes are disabled unless:
1. A D1 database is bound as `RADAR_DB`.
2. Cloudflare Access authenticates the request.

## D1 schema

Migration `migrations/0001_workspace.sql` creates:
- `workspace_state` — one versioned JSON workspace per authenticated user
- `source_observations` — future persistent Source Watch history
- `app_meta` — schema/application metadata

Workspace writes use optimistic versioning. If two devices edit independently, a stale client receives `409 version_conflict` instead of silently overwriting the newer cloud workspace.

## Cloudflare Access

Workspace ownership comes from Cloudflare Access identity inside the Worker. The browser does not send or control the user ID used by D1.

The public intelligence UI can continue to operate without D1. Workspace cloud persistence activates only once Access and the D1 binding are configured.

## Important product rule

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

## Next backend steps

1. Create the D1 database `dcb-expansion-radar`.
2. Add the `RADAR_DB` binding to `wrangler.jsonc`.
3. Apply `migrations/0001_workspace.sql` to the remote D1 database.
4. Enable Cloudflare Access for the Worker/application.
5. Verify workspace sync from two browser sessions.
6. Persist Source Watch history in D1.
7. Add scheduled source checks and automatic signal ingestion.
8. Move dynamic market intelligence into D1 only when scanner-generated updates require it.
