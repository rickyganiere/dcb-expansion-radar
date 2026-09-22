# Radar Next · Release Notes

Branch: `feature/radar-next`  
Target: `main`

## What changes

### 1. D1 operational status
- API badge reports the real D1 schema version.
- Schema guards prevent modules from running before their required migrations exist.
- Workspace auto-sync continues correctly after the first cloud save.
- Optimistic conflict handling remains enabled.

### 2. Automation Health
- Dashboard shows monitored, healthy, changed, failed, rate-limited, bot-blocked, stale and due sources.
- Discovery Inbox pending count is visible.
- Last and next scheduled run are shown in local browser time.
- Panels refresh after Source Watch, Discovery Inbox and Source Manager changes.

### 3. Source Watch hardening
- Concurrency capped at 3.
- Same-host requests are staggered.
- HTTP 429 / 5xx and transient failures are retried.
- Retry-After seconds and HTTP-date forms are supported.
- HTTP failures never appear as “No change”.
- Anti-bot pages are rejected even with HTTP 200.
- HTML/XHTML/plain-text only, max 2 MB.
- Changed fingerprints remain reviewable until baseline acceptance.

### 4. Cadence-aware scheduled scanning
- Per-source cadence and priority.
- Commercial billing sources can run every 12h.
- Google Play billing evidence daily.
- Regulatory evidence can run every 3 or 7 days.
- Cron scans only due sources.
- Manual Check all forces a complete pass.
- 429 uses at least 24h backoff; bot challenge at least 72h.

### 5. Discovery Inbox
- Source changes create deduplicated D1 review candidates.
- States: Pending review / Accepted for research / Dismissed.
- Candidates can be reopened.
- Automated changes never become verified intelligence directly.

### 6. Source Coverage + Attention Queue
- Explicit per-market pillars:
  - Billing evidence
  - Market / regulatory
  - Commercial ecosystem
- Health states: Healthy / Review / Degraded / Unchecked / Gap.
- Gap actions prefill Source Manager.
- Explainable Attention Queue prioritizes billing, then market/regulatory, then commercial ecosystem.
- No opaque score is used.

### 7. Source Manager
- Core sources remain protected/read-only.
- D1 custom sources can be added, edited, enabled and disabled.
- CSV bulk import/export, no-write preview and downloadable template.
- Test source probes a candidate URL before saving.
- Public HTTPS only; direct IPs, internal hosts, credentials and custom ports rejected.
- Duplicate URLs are skipped.
- Custom sources feed Source Watch/Discovery Inbox but never auto-promote.

### 8. Source entity tags
- Managed sources can carry up to 12 operator / partner tags.
- Tags work in create, update, bulk import, CSV export and active-source APIs.
- Missing tags on update preserve the current tags.

### 9. Publisher / Affiliate Discovery
- Publisher Discovery is integrated into the same DCB Expansion Radar.
- Unified commercial roles:
  - Publisher
  - Advertiser
  - Network
  - Operator
  - Aggregator
  - Both
  - Unknown
- App Store / Google Play listing scan extracts:
  - app name
  - developer/company
  - developer/support/privacy links
  - primary external domain
  - linked web assets
- Same developer/domain is deduplicated into one commercial entity.
- Candidates can be classified, qualified, dismissed or added to the shared commercial pipeline.

### 10. Automated Store Discovery
- New Store Discovery Seeds by market / keyword / store.
- Apple discovery uses the App Store/iTunes Search API.
- Google Play discovery parses public store search pages.
- Discovered app URLs enter a deduplicated D1 queue.
- Queue processing scans app listings and creates publisher candidates automatically.
- VAS preset pack includes:
  - dating
  - horoscope
  - astrology
  - streaming
  - entertainment
  - quiz
  - games
  - vpn
  - utility
- Failed app listings can be retried.
- Scheduled Cron processes small seed/app batches to protect rate limits.

### 11. D1 schema v7
Migration 0003:
- `discovery_candidates`

Migration 0004:
- `monitored_sources`

Migration 0005:
- `entity_tags_json` on `monitored_sources`

Migration 0006:
- `commercial_entities`
- `commercial_assets`

Migration 0007:
- `app_discovery_seeds`
- `app_discovery_queue`

Schema advances sequentially to version 7.

### 12. Testing
CI validates:
- intelligence data
- JavaScript syntax
- D1 schema v7
- Worker API
- Source Watch / Automation Health / Discovery Inbox
- Source Manager lifecycle and bulk operations
- source preflight and content guards
- coverage health and Attention Queue
- Publisher Discovery parser for Google Play and Apple App Store
- outbound-domain extraction
- commercial-entity deduplication
- commercial-role review
- Apple search seed discovery
- Google Play search seed discovery
- app queue deduplication
- queue → publisher graph processing
- failed listing retry

## Production release order

1. Confirm branch CI is green.
2. Apply `migrations/0003_discovery_inbox.sql`.
3. Apply `migrations/0004_monitored_sources.sql`.
4. Apply `migrations/0005_source_entity_tags.sql`.
5. Apply `migrations/0006_commercial_entities.sql`.
6. Apply `migrations/0007_app_discovery_queue.sql`.
7. Verify `schema_version = 7`.
8. Merge `feature/radar-next` to `main` once.
9. Wait for one Cloudflare production deployment.
10. Run `docs/RELEASE_CHECKLIST.md`.

No production merge/deploy before all migrations are verified.
