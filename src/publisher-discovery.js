function normalizeText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;|&#47;/gi, "/");
}

function validateListingUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("invalid_app_listing_url");
  }

  if (url.protocol !== "https:") throw new Error("app_listing_must_use_https");

  const host = url.hostname.toLowerCase();
  const apple = host === "apps.apple.com" && /\/app\//i.test(url.pathname);
  const google = host === "play.google.com" && /\/store\/apps\/details/i.test(url.pathname);

  if (!apple && !google) throw new Error("unsupported_app_store_url");

  url.hash = "";
  return {
    store: apple ? "apple_app_store" : "google_play",
    url: url.toString()
  };
}

function parseAnchors(html, baseUrl) {
  const out = [];
  const re = /<a\b([^>]*?)href\s*=\s*(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = re.exec(String(html || "")))) {
    const raw = decodeEntities(match[3]).trim();
    if (!raw || /^(?:javascript:|mailto:|tel:|#)/i.test(raw)) continue;

    try {
      const url = new URL(raw, baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      out.push({ url: url.toString(), text: normalizeText(match[5]).slice(0, 180) });
    } catch {}
  }

  return out;
}

function parseJsonLd(html) {
  const objects = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = re.exec(String(html || "")))) {
    try {
      const parsed = JSON.parse(decodeEntities(match[1]).trim());
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;
        objects.push(item);
        if (Array.isArray(item["@graph"])) queue.push(...item["@graph"]);
      }
    } catch {}
  }

  return objects;
}

function extractMeta(html, key) {
  const safe = key.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    '<meta[^>]+(?:property|name)=["\\\']' + safe + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>|' +
    '<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+(?:property|name)=["\\\']' + safe + '["\\\'][^>]*>',
    "i"
  );
  const match = String(html || "").match(re);
  return decodeEntities(match?.[1] || match?.[2] || "").trim() || null;
}

function unwrapGoogleOutbound(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (["google.com", "www.google.com", "play.google.com"].includes(url.hostname.toLowerCase())) {
      for (const key of ["q", "url", "u"]) {
        const candidate = url.searchParams.get(key);
        if (!candidate) continue;
        try {
          const parsed = new URL(candidate);
          if (["http:", "https:"].includes(parsed.protocol)) return parsed.toString();
        } catch {}
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const SYSTEM_HOSTS = new Set([
  "apps.apple.com", "apple.com", "www.apple.com", "itunes.apple.com",
  "play.google.com", "google.com", "www.google.com", "support.google.com",
  "accounts.google.com", "policies.google.com"
]);

const SOCIAL_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "facebook.com", "www.facebook.com",
  "instagram.com", "www.instagram.com", "x.com", "twitter.com", "www.twitter.com",
  "linkedin.com", "www.linkedin.com", "tiktok.com", "www.tiktok.com"
]);

function hostDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function classifyExternalLinks(listingUrl, anchors) {
  const listingHost = new URL(listingUrl).hostname.toLowerCase();
  const seen = new Set();
  const out = [];

  for (const link of anchors) {
    const unwrapped = unwrapGoogleOutbound(link.url);
    let url;
    try {
      url = new URL(unwrapped);
    } catch {
      continue;
    }

    if (url.protocol !== "https:") continue;
    const host = url.hostname.toLowerCase();
    if (host === listingHost || SYSTEM_HOSTS.has(host)) continue;

    const text = String(link.text || "");
    const haystack = (text + " " + url.pathname).toLowerCase();
    let kind = "external";
    if (/privacy|privacidad|privacidade/.test(haystack)) kind = "privacy";
    else if (/support|help|ayuda|suporte/.test(haystack)) kind = "support";
    else if (/developer|website|sitio web|site/.test(haystack)) kind = "website";

    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      url: key,
      text: text.slice(0, 180),
      kind,
      domain: hostDomain(key),
      primaryEligible: !SOCIAL_HOSTS.has(host)
    });
  }

  return out.slice(0, 40);
}

function developerFromAnchors(store, anchors) {
  const match = anchors.find(link => {
    try {
      const url = new URL(link.url);
      if (store === "google_play") {
        return url.hostname === "play.google.com" && /\/store\/apps\/developer/i.test(url.pathname);
      }
      return url.hostname === "apps.apple.com" && /\/developer\//i.test(url.pathname);
    } catch {
      return false;
    }
  });

  return match?.text || null;
}

function structuredApp(html) {
  const objects = parseJsonLd(html);
  return objects.find(item => {
    const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : item["@type"];
    return /softwareapplication|mobileapplication/i.test(String(type || ""));
  }) || objects.find(item => item?.name) || null;
}

function looksBlocked(title, text) {
  const haystack = (String(title || "") + " " + String(text || "").slice(0, 4000)).toLowerCase();
  return [
    "just a moment", "verify you are human", "checking your browser",
    "challenge validation", "security check", "access denied"
  ].some(marker => haystack.includes(marker));
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchListing(url) {
  let lastResponse = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "DCB-Expansion-Radar/0.6 publisher-discovery",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    lastResponse = response;

    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === 2) return response;

    try { await response.body?.cancel(); } catch {}
    await wait(700 * (attempt + 1));
  }

  return lastResponse;
}

async function readLimitedText(response, maxBytes = 2000000) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    try { await response.body?.cancel(); } catch {}
    throw new Error("app_listing_too_large");
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error("app_listing_too_large");
  }
  return text;
}

export async function scanAppListing(value, marketId = null, validMarkets = new Set()) {
  const listing = validateListingUrl(value);
  if (marketId && validMarkets.size && !validMarkets.has(marketId)) {
    throw new Error("invalid_source_market");
  }

  const started = Date.now();
  const response = await fetchListing(listing.url);

  if (!response.ok) {
    const error = new Error("HTTP " + response.status + " from app store");
    error.httpStatus = response.status;
    error.durationMs = Date.now() - started;
    try { await response.body?.cancel(); } catch {}
    throw error;
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    try { await response.body?.cancel(); } catch {}
    throw new Error("unsupported_app_listing_content_type");
  }

  const html = await readLimitedText(response);
  const text = normalizeText(html);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizeText(titleMatch[1]).slice(0, 180) : null;

  if (looksBlocked(title, text)) throw new Error("app_store_challenge");

  const anchors = parseAnchors(html, response.url || listing.url);
  const structured = structuredApp(html);
  const appName =
    String(structured?.name || "").trim() ||
    extractMeta(html, "og:title") ||
    title ||
    "Unknown app";

  const author = structured?.author;
  const developerName =
    (typeof author === "string" ? author : String(author?.name || structured?.publisher?.name || "").trim()) ||
    developerFromAnchors(listing.store, anchors) ||
    null;

  const externalLinks = classifyExternalLinks(listing.url, anchors);
  const primary =
    externalLinks.find(link => link.kind === "website" && link.primaryEligible) ||
    externalLinks.find(link => link.kind === "support" && link.primaryEligible) ||
    externalLinks.find(link => link.kind === "privacy" && link.primaryEligible) ||
    externalLinks.find(link => link.primaryEligible) ||
    null;

  return {
    store: listing.store,
    listingUrl: listing.url,
    finalUrl: response.url || listing.url,
    marketId: marketId || null,
    appName: appName.slice(0, 180),
    developerName: developerName ? developerName.slice(0, 180) : null,
    primaryDomain: primary?.domain || "",
    websiteUrl: primary?.url || null,
    externalLinks,
    confidence: developerName && primary?.domain ? "high" : developerName || primary?.domain ? "medium" : "low",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started
  };
}

function normalizedEntityKey(name, domain) {
  if (domain) return "domain:" + String(domain).toLowerCase();
  const slug = String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return "name:" + (slug || crypto.randomUUID());
}

export async function persistAppScan(db, scan, actor = null) {
  const name = String(scan.developerName || scan.appName || "Unknown publisher").trim();
  const key = normalizedEntityKey(name, scan.primaryDomain);
  const now = new Date().toISOString();

  let row = await db.prepare(
    "SELECT entity_id, name, primary_role, market_id, domain, website_url, status, confidence, discovery_reason, first_source_kind, created_at, updated_at " +
    "FROM commercial_entities WHERE normalized_key = ?1 LIMIT 1"
  ).bind(key).first();

  let entityId = row?.entity_id || null;

  if (!entityId) {
    entityId = "entity-" + crypto.randomUUID();
    const reason = "Discovered from " + (scan.store === "google_play" ? "Google Play" : "Apple App Store") + " app listing";

    await db.prepare(
      "INSERT INTO commercial_entities (" +
      "entity_id, normalized_key, name, primary_role, market_id, domain, website_url, status, confidence, discovery_reason, first_source_kind, created_by, created_at, updated_at" +
      ") VALUES (?1, ?2, ?3, 'publisher', ?4, ?5, ?6, 'candidate', ?7, ?8, ?9, ?10, ?11, ?11)"
    ).bind(
      entityId,
      key,
      name,
      scan.marketId || null,
      scan.primaryDomain || null,
      scan.websiteUrl || null,
      scan.confidence,
      reason,
      scan.store,
      actor,
      now
    ).run();
  } else {
    await db.prepare(
      "UPDATE commercial_entities SET " +
      "name = ?1, market_id = COALESCE(?2, market_id), domain = COALESCE(NULLIF(?3,''), domain), " +
      "website_url = COALESCE(NULLIF(?4,''), website_url), " +
      "confidence = CASE WHEN confidence = 'high' THEN confidence WHEN ?5 = 'high' THEN 'high' WHEN confidence = 'medium' THEN confidence ELSE ?5 END, " +
      "updated_at = ?6 WHERE entity_id = ?7"
    ).bind(
      name,
      scan.marketId || null,
      scan.primaryDomain || "",
      scan.websiteUrl || "",
      scan.confidence,
      now,
      entityId
    ).run();
  }

  const appType = scan.store === "google_play" ? "google_play_app" : "app_store_app";
  await db.prepare(
    "INSERT INTO commercial_assets (" +
    "entity_id, asset_type, title, url, external_id, market_id, metadata_json, created_at, updated_at" +
    ") VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?7) " +
    "ON CONFLICT(entity_id, asset_type, url) DO UPDATE SET title = excluded.title, market_id = COALESCE(excluded.market_id, commercial_assets.market_id), metadata_json = excluded.metadata_json, updated_at = excluded.updated_at"
  ).bind(
    entityId,
    appType,
    scan.appName,
    scan.listingUrl,
    scan.marketId || null,
    JSON.stringify({
      developerName: scan.developerName,
      confidence: scan.confidence,
      externalLinks: scan.externalLinks
    }),
    now
  ).run();

  for (const link of scan.externalLinks.slice(0, 20)) {
    await db.prepare(
      "INSERT INTO commercial_assets (" +
      "entity_id, asset_type, title, url, external_id, market_id, metadata_json, created_at, updated_at" +
      ") VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?7) " +
      "ON CONFLICT(entity_id, asset_type, url) DO UPDATE SET title = excluded.title, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at"
    ).bind(
      entityId,
      link.kind === "website" ? "website" : "domain",
      link.text || link.kind,
      link.url,
      scan.marketId || null,
      JSON.stringify({ kind: link.kind, domain: link.domain, primaryEligible: link.primaryEligible }),
      now
    ).run();
  }

  return db.prepare(
    "SELECT entity_id, name, primary_role, market_id, domain, website_url, status, confidence, discovery_reason, first_source_kind, created_at, updated_at " +
    "FROM commercial_entities WHERE entity_id = ?1 LIMIT 1"
  ).bind(entityId).first();
}

export async function listCommercialEntities(db, filters = {}) {
  const entityRows = await db.prepare(
    "SELECT entity_id, name, primary_role, market_id, domain, website_url, status, confidence, discovery_reason, first_source_kind, created_at, updated_at " +
    "FROM commercial_entities ORDER BY updated_at DESC LIMIT 300"
  ).all();

  let entities = entityRows?.results || [];
  if (filters.status) entities = entities.filter(row => row.status === filters.status);
  if (filters.marketId) entities = entities.filter(row => row.market_id === filters.marketId);
  if (filters.role) entities = entities.filter(row => row.primary_role === filters.role);
  if (filters.query) {
    const q = filters.query.toLowerCase();
    entities = entities.filter(row =>
      [row.name, row.domain, row.website_url, row.discovery_reason]
        .some(value => String(value || "").toLowerCase().includes(q))
    );
  }

  const assetRows = await db.prepare(
    "SELECT id, entity_id, asset_type, title, url, external_id, market_id, metadata_json, created_at, updated_at " +
    "FROM commercial_assets ORDER BY updated_at DESC LIMIT 1200"
  ).all();

  const byEntity = {};
  for (const asset of assetRows?.results || []) {
    (byEntity[asset.entity_id] ||= []).push(asset);
  }

  const all = entityRows?.results || [];
  return {
    counts: {
      total: all.length,
      candidate: all.filter(row => row.status === "candidate").length,
      qualified: all.filter(row => row.status === "qualified").length,
      pipeline: all.filter(row => row.status === "pipeline").length,
      dismissed: all.filter(row => row.status === "dismissed").length
    },
    entities: entities.map(row => ({
      id: row.entity_id,
      name: row.name,
      role: row.primary_role,
      marketId: row.market_id,
      domain: row.domain,
      websiteUrl: row.website_url,
      status: row.status,
      confidence: row.confidence,
      reason: row.discovery_reason,
      firstSourceKind: row.first_source_kind,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assets: byEntity[row.entity_id] || []
    }))
  };
}

export async function reviewCommercialEntity(db, input = {}) {
  const id = String(input.id || "").trim();
  const action = String(input.action || "").trim();
  const role = String(input.role || "").trim();
  const roles = new Set(["publisher","advertiser","network","operator","aggregator","both","unknown"]);

  if (!id) throw new Error("entity_id_required");
  if (role && !roles.has(role)) throw new Error("invalid_entity_role");

  const row = await db.prepare(
    "SELECT entity_id, primary_role, status FROM commercial_entities WHERE entity_id = ?1 LIMIT 1"
  ).bind(id).first();
  if (!row) throw new Error("entity_not_found");

  const statusByAction = {
    qualify: "qualified",
    dismiss: "dismissed",
    pipeline: "pipeline",
    reopen: "candidate"
  };

  const nextStatus = statusByAction[action] || row.status;
  if (!statusByAction[action] && action !== "classify") {
    throw new Error("unsupported_entity_action");
  }

  const nextRole = role || row.primary_role;
  const now = new Date().toISOString();

  await db.prepare(
    "UPDATE commercial_entities SET primary_role = ?1, status = ?2, updated_at = ?3 WHERE entity_id = ?4"
  ).bind(nextRole, nextStatus, now, id).run();

  return { id, role: nextRole, status: nextStatus, updatedAt: now };
}

export const PUBLISHER_DISCOVERY_ERRORS = new Set([
  "invalid_app_listing_url",
  "app_listing_must_use_https",
  "unsupported_app_store_url",
  "invalid_source_market",
  "entity_id_required",
  "invalid_entity_role",
  "entity_not_found",
  "unsupported_entity_action"
]);
