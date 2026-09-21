# DCB Expansion Radar

DCB Expansion Radar is a market-expansion intelligence workspace for DCB, VAS and OTT teams.

## Current phase

Interactive MVP deployed on Cloudflare Workers Static Assets.

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
- Market shortlist stored locally
- Compare up to three markets
- Market drill-down
- Billing-route intelligence
- Commercial target mapping
- Named public professional decision-makers
- First-touch outreach generator with copy action
- Commercial pipeline with stages and CSV export
- Market signals feed
- Recheck queue for incomplete or stale intelligence
- Cloudflare API health/status endpoints
- Responsive desktop/tablet/mobile UI

## Architecture

```text
GitHub (source of truth)
        |
        v
Cloudflare Worker
  |- Static Assets (public/)
  |- API routes (src/index.js)
        |
        v
Supabase (planned, schema ready)
  |- Market intelligence
  |- Signals
  |- Contacts
  |- User shortlist
  |- Commercial pipeline
```

Only one Cloudflare Worker is used for both the site and the API layer.

## Repository structure

```text
public/
  index.html
  styles.css
  data.js
  signals.js
  app.js
src/
  index.js
supabase/
  schema.sql
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

## Data model

The backend schema is prepared in `supabase/schema.sql` for:
- markets
- operators
- billing_rails
- commercial_targets
- contacts
- market_signals
- market_sources
- shortlisted_markets
- pipeline_items

RLS is enabled in the prepared schema. Intelligence tables are authenticated-read only; shortlist and pipeline rows are user-owned.

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

## Next backend phase

1. Create a dedicated Supabase project (requires explicit account/cost confirmation).
2. Apply and verify the schema.
3. Seed the six current markets.
4. Move shortlist and pipeline from localStorage to authenticated persistence.
5. Move market intelligence from static JS to API-backed data.
6. Add automated signal ingestion and stale-evidence checks.
7. Add scheduled research/scanner jobs without adding a second Cloudflare Worker.
