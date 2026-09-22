import { scanAppListing, persistAppScan } from "./publisher-discovery.js";

const MARKET_CODES = {
  mexico: "MX",
  colombia: "CO",
  brazil: "BR",
  peru: "PE",
  chile: "CL",
  argentina: "AR"
};

const STORES = new Set(["apple_app_store", "google_play"]);
const CADENCES = new Set([12,24,72,168]);

function normalizeSeedInput(input = {}, existing = {}) {
  const store = String(input.store ?? existing.store ?? "").trim();
  const marketId = String(input.marketId ?? existing.marketId ?? "").trim();
  const query = String(input.query ?? existing.query ?? "").trim().replace(/\s+/g, " ");
  const cadenceHours = Number(input.cadenceHours ?? existing.cadenceHours ?? 24);

  if (!STORES.has(store)) throw new Error("invalid_app_seed_store");
  if (!MARKET_CODES[marketId]) throw new Error("invalid_app_seed_market");
  if (query.length < 2 || query.length > 100) throw new Error("invalid_app_seed_query");
  if (!CADENCES.has(cadenceHours)) throw new Error("invalid_app_seed_cadence");

  return { store, marketId, query, cadenceHours };
}

function seedDue(seed, now = Date.now()) {
  if (!seed?.last_checked_at) return true;
  const last = Date.parse(seed.last_checked_at);
  if (!Number.isFinite(last)) return true;
  return last + Number(seed.cadence_hours || 24) * 60 * 60 * 1000 <= now;
}

function buildAppleSearchUrl(seed) {
  const country = MARKET_CODES[seed.market_id].toLowerCase();
  const params = new URLSearchParams({
    term: seed.query,
    country,
    entity: "software",
    limit: "25"
  });
  return "https://itunes.apple.com/search?" + params.toString();
}

function buildGoogleSearchUrl(seed) {
  const params = new URLSearchParams({
    q: seed.query,
    c: "apps",
    hl: "en",
    gl: MARKET_CODES[seed.market_id]
  });
  return "https://play.google.com/store/search?" + params.toString();
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDiscovery(url, accept) {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "DCB-Expansion-Radar/0.7 app-discovery",
          accept
        }
      });

      lastResponse = response;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 2) return response;

      try { await response.body?.cancel(); } catch {}
      await wait(700 * (attempt + 1));
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await wait(700 * (attempt + 1));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("app_seed_fetch_failed");
}

function normalizeListingUrl(store, value) {
  try {
    const url = new URL(String(value || ""));
    if (store === "apple_app_store") {
      if (url.hostname !== "apps.apple.com" || !/\/app\//i.test(url.pathname)) return null;
      url.hash = "";
      return url.toString();
    }

    if (url.hostname !== "play.google.com" || !/\/store\/apps\/details/i.test(url.pathname)) return null;
    const id = url.searchParams.get("id");
    if (!id) return null;
    return "https://play.google.com/store/apps/details?id=" + encodeURIComponent(id);
  } catch {
    return null;
  }
}

function parseApplePayload(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const seen = new Set();
  const apps = [];

  for (const item of results) {
    const listingUrl = normalizeListingUrl("apple_app_store", item?.trackViewUrl);
    if (!listingUrl || seen.has(listingUrl)) continue;
    seen.add(listingUrl);

    apps.push({
      listingUrl,
      store: "apple_app_store",
      appName: String(item?.trackName || "").slice(0, 180) || null,
      developerHint: String(item?.sellerName || item?.artistName || "").slice(0, 180) || null
    });
  }

  return apps;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGooglePayload(html) {
  const seen = new Set();
  const apps = [];
  const re = /<a\b[^>]*href=["']([^"']*\/store\/apps\/details\?[^"']*id=[^"'&]+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = re.exec(String(html || "")))) {
    let href = match[1].replace(/&amp;/gi, "&");
    let resolved;
    try {
      resolved = new URL(href, "https://play.google.com").toString();
    } catch {
      continue;
    }

    const listingUrl = normalizeListingUrl("google_play", resolved);
    if (!listingUrl || seen.has(listingUrl)) continue;
    seen.add(listingUrl);

    const appName = stripHtml(match[2]).slice(0, 180) || null;
    apps.push({
      listingUrl,
      store: "google_play",
      appName,
      developerHint: null
    });

    if (apps.length >= 50) break;
  }

  return apps;
}

async function discoverSeedListings(seed) {
  const apple = seed.store === "apple_app_store";
  const url = apple ? buildAppleSearchUrl(seed) : buildGoogleSearchUrl(seed);
  const response = await fetchDiscovery(
    url,
    apple ? "application/json,text/plain;q=0.9" : "text/html,application/xhtml+xml"
  );

  if (!response.ok) {
    const error = new Error("HTTP " + response.status + " from app discovery source");
    error.httpStatus = response.status;
    throw error;
  }

  const raw = await response.text();
  let apps;

  if (apple) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("invalid_apple_search_response");
    }
    apps = parseApplePayload(payload);
  } else {
    apps = parseGooglePayload(raw);
  }

  return {
    url,
    status: response.status,
    apps
  };
}

async function upsertQueueRows(db, seed, apps) {
  const now = new Date().toISOString();
  let inserted = 0;
  let existing = 0;

  for (const app of apps) {
    const before = await db.prepare(
      "SELECT listing_url FROM app_discovery_queue WHERE listing_url = ?1 LIMIT 1"
    ).bind(app.listingUrl).first();

    if (before) existing += 1;
    else inserted += 1;

    await db.prepare(
      "INSERT INTO app_discovery_queue (" +
      "listing_url, store, market_id, seed_id, app_name, developer_hint, scan_status, discovered_at, updated_at" +
      ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?7) " +
      "ON CONFLICT(listing_url) DO UPDATE SET " +
      "app_name = COALESCE(NULLIF(excluded.app_name,''), app_discovery_queue.app_name), " +
      "developer_hint = COALESCE(NULLIF(excluded.developer_hint,''), app_discovery_queue.developer_hint), " +
      "updated_at = excluded.updated_at"
    ).bind(
      app.listingUrl,
      app.store,
      seed.market_id,
      seed.seed_id,
      app.appName || null,
      app.developerHint || null,
      now
    ).run();
  }

  return { inserted, existing };
}

export async function runDiscoverySeed(db, seed, actor = "manual") {
  const now = new Date().toISOString();

  try {
    const discovered = await discoverSeedListings(seed);
    const counts = await upsertQueueRows(db, seed, discovered.apps);

    await db.prepare(
      "UPDATE app_discovery_seeds SET last_checked_at = ?1, last_http_status = ?2, last_error = NULL, updated_at = ?1 WHERE seed_id = ?3"
    ).bind(now, discovered.status, seed.seed_id).run();

    return {
      ok: true,
      seedId: seed.seed_id,
      store: seed.store,
      marketId: seed.market_id,
      query: seed.query,
      found: discovered.apps.length,
      inserted: counts.inserted,
      existing: counts.existing,
      sourceUrl: discovered.url,
      actor,
      checkedAt: now
    };
  } catch (error) {
    await db.prepare(
      "UPDATE app_discovery_seeds SET last_checked_at = ?1, last_http_status = ?2, last_error = ?3, updated_at = ?1 WHERE seed_id = ?4"
    ).bind(
      now,
      Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
      String(error?.message || error).slice(0, 500),
      seed.seed_id
    ).run();

    return {
      ok: false,
      seedId: seed.seed_id,
      error: String(error?.message || error),
      httpStatus: error?.httpStatus ?? null,
      checkedAt: now
    };
  }
}

export async function listDiscoveryState(db) {
  const [seedsResult, queueResult] = await Promise.all([
    db.prepare(
      "SELECT seed_id, store, market_id, query, cadence_hours, enabled, last_checked_at, last_http_status, last_error, created_by, created_at, updated_at " +
      "FROM app_discovery_seeds ORDER BY market_id ASC, store ASC, query ASC"
    ).all(),
    db.prepare(
      "SELECT listing_url, store, market_id, seed_id, app_name, developer_hint, scan_status, attempts, last_attempt_at, last_error, entity_id, discovered_at, updated_at " +
      "FROM app_discovery_queue ORDER BY discovered_at DESC LIMIT 500"
    ).all()
  ]);

  const seeds = seedsResult?.results || [];
  const queue = queueResult?.results || [];

  return {
    seeds: seeds.map(row => ({
      id: row.seed_id,
      store: row.store,
      marketId: row.market_id,
      query: row.query,
      cadenceHours: Number(row.cadence_hours || 24),
      enabled: Number(row.enabled) === 1,
      lastCheckedAt: row.last_checked_at,
      lastHttpStatus: row.last_http_status,
      lastError: row.last_error,
      createdAt: row.created_at
    })),
    queue: queue.map(row => ({
      listingUrl: row.listing_url,
      store: row.store,
      marketId: row.market_id,
      seedId: row.seed_id,
      appName: row.app_name,
      developerHint: row.developer_hint,
      status: row.scan_status,
      attempts: Number(row.attempts || 0),
      lastAttemptAt: row.last_attempt_at,
      lastError: row.last_error,
      entityId: row.entity_id,
      discoveredAt: row.discovered_at
    })),
    counts: {
      seeds: seeds.length,
      enabledSeeds: seeds.filter(row => Number(row.enabled) === 1).length,
      pending: queue.filter(row => row.scan_status === "pending").length,
      scanned: queue.filter(row => row.scan_status === "scanned").length,
      failed: queue.filter(row => row.scan_status === "failed").length
    }
  };
}

export async function createDiscoverySeed(db, input, actor = null) {
  const seed = normalizeSeedInput(input);
  const id = "seed-" + crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.prepare(
      "INSERT INTO app_discovery_seeds (" +
      "seed_id, store, market_id, query, cadence_hours, enabled, created_by, created_at, updated_at" +
      ") VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?7)"
    ).bind(
      id,
      seed.store,
      seed.marketId,
      seed.query,
      seed.cadenceHours,
      actor,
      now
    ).run();
  } catch (error) {
    if (/unique constraint/i.test(String(error?.message || error))) {
      throw new Error("duplicate_app_seed");
    }
    throw error;
  }

  return { id, ...seed, enabled: true, createdAt: now };
}

export async function toggleDiscoverySeed(db, id, enabled) {
  const now = new Date().toISOString();
  const result = await db.prepare(
    "UPDATE app_discovery_seeds SET enabled = ?1, updated_at = ?2 WHERE seed_id = ?3"
  ).bind(enabled ? 1 : 0, now, id).run();

  if (Number(result?.meta?.changes || 0) !== 1) throw new Error("app_seed_not_found");
  return { id, enabled, updatedAt: now };
}

export async function runDiscoverySeedById(db, id, actor = "manual") {
  const seedId = String(id || "").trim();
  if (!seedId) throw new Error("app_seed_not_found");

  const seed = await db.prepare(
    "SELECT seed_id, store, market_id, query, cadence_hours, enabled, last_checked_at, last_http_status, last_error " +
    "FROM app_discovery_seeds WHERE seed_id = ?1 LIMIT 1"
  ).bind(seedId).first();

  if (!seed) throw new Error("app_seed_not_found");
  return runDiscoverySeed(db, seed, actor);
}

export async function createPresetPack(db, marketId, actor = null) {
  const market = String(marketId || "").trim();
  if (!MARKET_CODES[market]) throw new Error("invalid_app_seed_market");

  const created = [];
  const skipped = [];

  for (const store of ["apple_app_store", "google_play"]) {
    for (const query of APP_DISCOVERY_PRESETS) {
      try {
        created.push(await createDiscoverySeed(db, {
          store,
          marketId: market,
          query,
          cadenceHours: query === "dating" || query === "streaming" ? 24 : 72
        }, actor));
      } catch (error) {
        if (String(error?.message || error) === "duplicate_app_seed") {
          skipped.push({ store, marketId: market, query, reason: "duplicate_app_seed" });
          continue;
        }
        throw error;
      }
    }
  }

  return {
    marketId: market,
    created: created.length,
    skipped: skipped.length,
    seeds: created,
    skippedSeeds: skipped
  };
}

export async function runDueDiscoverySeeds(db, actor = "cron", options = {}) {
  const result = await db.prepare(
    "SELECT seed_id, store, market_id, query, cadence_hours, enabled, last_checked_at, last_http_status, last_error " +
    "FROM app_discovery_seeds WHERE enabled = 1 ORDER BY last_checked_at ASC, created_at ASC"
  ).all();

  const all = result?.results || [];
  const due = options.forceAll ? all : all.filter(seed => seedDue(seed));
  const maxSeeds = Math.max(1, Math.min(Number(options.maxSeeds || 6), 20));
  const selected = due.slice(0, maxSeeds);
  const results = [];

  for (const seed of selected) {
    results.push(await runDiscoverySeed(db, seed, actor));
  }

  return {
    ok: results.every(item => item.ok),
    registered: all.length,
    due: due.length,
    attempted: selected.length,
    discovered: results.reduce((sum, item) => sum + Number(item.inserted || 0), 0),
    failed: results.filter(item => !item.ok).length,
    results
  };
}

export async function processDiscoveryQueue(db, actor = "cron", options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 5), 20));
  const result = await db.prepare(
    "SELECT listing_url, store, market_id, seed_id, app_name, developer_hint, scan_status, attempts " +
    "FROM app_discovery_queue WHERE scan_status = 'pending' ORDER BY discovered_at ASC LIMIT ?1"
  ).bind(limit).all();

  const rows = result?.results || [];
  const output = [];

  for (const row of rows) {
    const attemptedAt = new Date().toISOString();

    try {
      const scan = await scanAppListing(
        row.listing_url,
        row.market_id,
        new Set(Object.keys(MARKET_CODES))
      );
      const entity = await persistAppScan(db, scan, actor);

      await db.prepare(
        "UPDATE app_discovery_queue SET scan_status = 'scanned', attempts = attempts + 1, last_attempt_at = ?1, last_error = NULL, entity_id = ?2, updated_at = ?1 WHERE listing_url = ?3"
      ).bind(attemptedAt, entity.entity_id, row.listing_url).run();

      output.push({
        ok: true,
        listingUrl: row.listing_url,
        entityId: entity.entity_id,
        entityName: entity.name
      });
    } catch (error) {
      await db.prepare(
        "UPDATE app_discovery_queue SET scan_status = 'failed', attempts = attempts + 1, last_attempt_at = ?1, last_error = ?2, updated_at = ?1 WHERE listing_url = ?3"
      ).bind(
        attemptedAt,
        String(error?.message || error).slice(0, 500),
        row.listing_url
      ).run();

      output.push({
        ok: false,
        listingUrl: row.listing_url,
        error: String(error?.message || error)
      });
    }
  }

  return {
    ok: output.every(item => item.ok),
    attempted: rows.length,
    scanned: output.filter(item => item.ok).length,
    failed: output.filter(item => !item.ok).length,
    actor,
    results: output
  };
}

export async function retryDiscoveryListing(db, listingUrl) {
  const url = String(listingUrl || "").trim();
  if (!url) throw new Error("listing_url_required");
  const now = new Date().toISOString();

  const result = await db.prepare(
    "UPDATE app_discovery_queue SET scan_status = 'pending', last_error = NULL, updated_at = ?1 WHERE listing_url = ?2"
  ).bind(now, url).run();

  if (Number(result?.meta?.changes || 0) !== 1) throw new Error("app_listing_not_found");
  return { listingUrl: url, status: "pending", updatedAt: now };
}

export const APP_DISCOVERY_ERRORS = new Set([
  "invalid_app_seed_store",
  "invalid_app_seed_market",
  "invalid_app_seed_query",
  "invalid_app_seed_cadence",
  "duplicate_app_seed",
  "app_seed_not_found",
  "listing_url_required",
  "app_listing_not_found"
]);

export const APP_DISCOVERY_PRESETS = [
  "dating",
  "horoscope",
  "astrology",
  "streaming",
  "entertainment",
  "quiz",
  "games",
  "vpn",
  "utility"
];
