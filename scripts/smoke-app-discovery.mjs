import assert from "node:assert/strict";
import {
  createDiscoverySeed,
  toggleDiscoverySeed,
  runDiscoverySeedById,
  runDueDiscoverySeeds,
  processDiscoveryQueue,
  retryDiscoveryListing,
  listDiscoveryState
} from "../src/app-discovery.js";

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM app_discovery_queue WHERE listing_url = ?1")) {
      return this.db.queue.find(row => row.listing_url === this.args[0]) || null;
    }

    if (this.sql.includes("FROM app_discovery_seeds WHERE seed_id = ?1")) {
      return this.db.seeds.find(row => row.seed_id === this.args[0]) || null;
    }

    if (this.sql.includes("FROM commercial_entities WHERE normalized_key = ?1")) {
      return this.db.entities.find(row => row.normalized_key === this.args[0]) || null;
    }

    if (this.sql.includes("FROM commercial_entities WHERE entity_id = ?1")) {
      return this.db.entities.find(row => row.entity_id === this.args[0]) || null;
    }

    throw new Error("Unhandled first(): " + this.sql);
  }

  async all() {
    if (this.sql.includes("FROM app_discovery_seeds") && this.sql.includes("WHERE enabled = 1")) {
      return {
        success: true,
        results: this.db.seeds.filter(row => Number(row.enabled) === 1)
      };
    }

    if (this.sql.includes("FROM app_discovery_seeds ORDER BY market_id")) {
      return { success: true, results: [...this.db.seeds] };
    }

    if (this.sql.includes("FROM app_discovery_queue") && this.sql.includes("WHERE scan_status = 'pending'")) {
      const limit = Number(this.args[0] || 5);
      return {
        success: true,
        results: this.db.queue.filter(row => row.scan_status === "pending").slice(0, limit)
      };
    }

    if (this.sql.includes("FROM app_discovery_queue ORDER BY discovered_at DESC")) {
      return { success: true, results: [...this.db.queue].reverse() };
    }

    if (this.sql.includes("FROM commercial_entities ORDER BY updated_at DESC")) {
      return { success: true, results: [...this.db.entities] };
    }

    if (this.sql.includes("FROM commercial_assets ORDER BY updated_at DESC")) {
      return { success: true, results: [...this.db.assets] };
    }

    throw new Error("Unhandled all(): " + this.sql);
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO app_discovery_seeds")) {
      const [seed_id, store, market_id, query, cadence_hours, created_by, created_at] = this.args;
      if (this.db.seeds.some(row =>
        row.store === store && row.market_id === market_id && row.query === query
      )) {
        throw new Error("UNIQUE constraint failed: app_discovery_seeds.store, app_discovery_seeds.market_id, app_discovery_seeds.query");
      }

      this.db.seeds.push({
        seed_id,
        store,
        market_id,
        query,
        cadence_hours,
        enabled: 1,
        last_checked_at: null,
        last_http_status: null,
        last_error: null,
        created_by,
        created_at,
        updated_at: created_at
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE app_discovery_seeds SET enabled = ?1")) {
      const [enabled, updated_at, seed_id] = this.args;
      const row = this.db.seeds.find(seed => seed.seed_id === seed_id);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.enabled = enabled;
      row.updated_at = updated_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE app_discovery_seeds SET last_checked_at = ?1")) {
      const seed_id = this.args[this.args.length - 1];
      const row = this.db.seeds.find(seed => seed.seed_id === seed_id);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.last_checked_at = this.args[0];
      row.last_http_status = this.args[1];
      if (this.sql.includes("last_error = NULL")) {
        row.last_error = null;
      } else {
        row.last_error = this.args[2];
      }
      row.updated_at = this.args[0];
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("INSERT INTO app_discovery_queue")) {
      const [
        listing_url,
        store,
        market_id,
        seed_id,
        app_name,
        developer_hint,
        discovered_at
      ] = this.args;

      const existing = this.db.queue.find(row => row.listing_url === listing_url);
      if (existing) {
        if (app_name) existing.app_name = app_name;
        if (developer_hint) existing.developer_hint = developer_hint;
        existing.updated_at = discovered_at;
      } else {
        this.db.queue.push({
          listing_url,
          store,
          market_id,
          seed_id,
          app_name,
          developer_hint,
          scan_status: "pending",
          attempts: 0,
          last_attempt_at: null,
          last_error: null,
          entity_id: null,
          discovered_at,
          updated_at: discovered_at
        });
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE app_discovery_queue SET scan_status = 'scanned'")) {
      const [last_attempt_at, entity_id, listing_url] = this.args;
      const row = this.db.queue.find(item => item.listing_url === listing_url);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.scan_status = "scanned";
      row.attempts += 1;
      row.last_attempt_at = last_attempt_at;
      row.last_error = null;
      row.entity_id = entity_id;
      row.updated_at = last_attempt_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE app_discovery_queue SET scan_status = 'failed'")) {
      const [last_attempt_at, last_error, listing_url] = this.args;
      const row = this.db.queue.find(item => item.listing_url === listing_url);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.scan_status = "failed";
      row.attempts += 1;
      row.last_attempt_at = last_attempt_at;
      row.last_error = last_error;
      row.updated_at = last_attempt_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE app_discovery_queue SET scan_status = 'pending'")) {
      const [updated_at, listing_url] = this.args;
      const row = this.db.queue.find(item => item.listing_url === listing_url);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.scan_status = "pending";
      row.last_error = null;
      row.updated_at = updated_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("INSERT INTO commercial_entities")) {
      const [
        entity_id,
        normalized_key,
        name,
        market_id,
        domain,
        website_url,
        confidence,
        discovery_reason,
        first_source_kind,
        created_by,
        created_at
      ] = this.args;

      this.db.entities.push({
        entity_id,
        normalized_key,
        name,
        primary_role: "publisher",
        market_id,
        domain,
        website_url,
        status: "candidate",
        confidence,
        discovery_reason,
        first_source_kind,
        created_by,
        created_at,
        updated_at: created_at
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("UPDATE commercial_entities SET name = ?1")) {
      const [name, market_id, domain, website_url, confidence, updated_at, entity_id] = this.args;
      const row = this.db.entities.find(entity => entity.entity_id === entity_id);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.name = name;
      if (market_id) row.market_id = market_id;
      if (domain) row.domain = domain;
      if (website_url) row.website_url = website_url;
      if (row.confidence !== "high" && confidence === "high") row.confidence = "high";
      row.updated_at = updated_at;
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("INSERT INTO commercial_assets")) {
      const [
        entity_id,
        asset_type,
        title,
        url,
        market_id,
        metadata_json,
        updated_at
      ] = this.args;

      const existing = this.db.assets.find(asset =>
        asset.entity_id === entity_id &&
        asset.asset_type === asset_type &&
        asset.url === url
      );

      if (existing) {
        existing.title = title;
        existing.metadata_json = metadata_json;
        existing.updated_at = updated_at;
      } else {
        this.db.assets.push({
          id: this.db.assets.length + 1,
          entity_id,
          asset_type,
          title,
          url,
          external_id: null,
          market_id,
          metadata_json,
          created_at: updated_at,
          updated_at
        });
      }
      return { success: true, meta: { changes: 1 } };
    }

    throw new Error("Unhandled run(): " + this.sql);
  }
}

class FakeD1 {
  constructor() {
    this.seeds = [];
    this.queue = [];
    this.entities = [];
    this.assets = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const appleSearchPayload = {
  resultCount: 2,
  results: [
    {
      trackName: "Love Match",
      sellerName: "Match Media Ltd",
      trackViewUrl: "https://apps.apple.com/mx/app/love-match/id111111111"
    },
    {
      trackName: "Date Tonight",
      sellerName: "Match Media Ltd",
      trackViewUrl: "https://apps.apple.com/mx/app/date-tonight/id222222222"
    }
  ]
};

const googleSearchHtml = `
<html><body>
  <a href="/store/apps/details?id=com.example.streamone"><span>Stream One</span></a>
  <a href="/store/apps/details?id=com.example.streamtwo&amp;hl=en"><span>Stream Two</span></a>
  <a href="/store/apps/details?id=com.example.streamone"><span>Duplicate</span></a>
</body></html>`;

const appleAppHtml = `
<html>
<head>
  <title>App on the App Store</title>
  <script type="application/ld+json">
    {"@type":"SoftwareApplication","name":"Love Match","author":{"@type":"Organization","name":"Match Media Ltd"}}
  </script>
</head>
<body>
  <a href="https://matchmedia.example/">Developer Website</a>
  <a href="https://matchmedia.example/privacy">Privacy Policy</a>
</body>
</html>`;

const googleAppHtml = `
<html>
<head>
  <title>Stream App - Apps on Google Play</title>
  <script type="application/ld+json">
    {"@type":"SoftwareApplication","name":"Stream One","author":{"@type":"Organization","name":"Stream Publisher Inc"}}
  </script>
</head>
<body>
  <a href="https://streampublisher.example/">Developer website</a>
  <a href="https://streampublisher.example/privacy">Privacy Policy</a>
</body>
</html>`;

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = String(input);

  if (url.startsWith("https://itunes.apple.com/search?")) {
    return new Response(JSON.stringify(appleSearchPayload), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  if (url.startsWith("https://play.google.com/store/search?")) {
    return new Response(googleSearchHtml, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  if (url.startsWith("https://apps.apple.com/")) {
    return new Response(appleAppHtml, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  if (url.startsWith("https://play.google.com/store/apps/details")) {
    return new Response(googleAppHtml, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  throw new Error("Unexpected fetch URL: " + url);
};

try {
  const db = new FakeD1();

  const appleSeed = await createDiscoverySeed(db, {
    store: "apple_app_store",
    marketId: "mexico",
    query: "dating",
    cadenceHours: 24
  }, "test@example.com");

  const googleSeed = await createDiscoverySeed(db, {
    store: "google_play",
    marketId: "brazil",
    query: "streaming",
    cadenceHours: 24
  }, "test@example.com");

  assert.equal(db.seeds.length, 2);
  assert.equal(appleSeed.query, "dating");
  assert.equal(googleSeed.query, "streaming");

  await assert.rejects(
    () => createDiscoverySeed(db, {
      store: "apple_app_store",
      marketId: "mexico",
      query: "dating",
      cadenceHours: 24
    }),
    /duplicate_app_seed/
  );

  const appleRun = await runDiscoverySeedById(db, appleSeed.id, "test@example.com");
  assert.equal(appleRun.ok, true);
  assert.equal(appleRun.found, 2);
  assert.equal(appleRun.inserted, 2);
  assert.equal(db.queue.length, 2);

  const appleAgain = await runDiscoverySeedById(db, appleSeed.id, "test@example.com");
  assert.equal(appleAgain.inserted, 0);
  assert.equal(appleAgain.existing, 2);
  assert.equal(db.queue.length, 2);

  const googleRun = await runDiscoverySeedById(db, googleSeed.id, "test@example.com");
  assert.equal(googleRun.ok, true);
  assert.equal(googleRun.found, 2);
  assert.equal(googleRun.inserted, 2);
  assert.equal(db.queue.length, 4);

  let state = await listDiscoveryState(db);
  assert.equal(state.counts.seeds, 2);
  assert.equal(state.counts.pending, 4);

  const process = await processDiscoveryQueue(db, "test@example.com", { limit: 2 });
  assert.equal(process.attempted, 2);
  assert.equal(process.scanned, 2);
  assert.equal(process.failed, 0);
  assert.equal(db.entities.length, 1);
  assert.ok(db.assets.filter(asset => asset.asset_type === "app_store_app").length >= 2);

  state = await listDiscoveryState(db);
  assert.equal(state.counts.scanned, 2);
  assert.equal(state.counts.pending, 2);

  await toggleDiscoverySeed(db, googleSeed.id, false);
  assert.equal(db.seeds.find(seed => seed.seed_id === googleSeed.id).enabled, 0);

  const due = await runDueDiscoverySeeds(db, "cron", { maxSeeds: 6 });
  assert.equal(due.registered, 1);
  assert.equal(due.attempted, 0);

  const failedRow = db.queue.find(row => row.scan_status === "pending");
  failedRow.scan_status = "failed";
  failedRow.last_error = "temporary failure";

  await retryDiscoveryListing(db, failedRow.listing_url);
  assert.equal(failedRow.scan_status, "pending");
  assert.equal(failedRow.last_error, null);

  const googleProcess = await processDiscoveryQueue(db, "cron", { limit: 10 });
  assert.ok(googleProcess.scanned >= 1);
  assert.ok(db.entities.some(entity => entity.name === "Stream Publisher Inc"));

  console.log("Automated App Discovery smoke tests passed:", {
    seedManagement: true,
    appleSearchDiscovery: true,
    googlePlaySearchDiscovery: true,
    queueDeduplication: true,
    publisherGraphProcessing: true,
    retryFlow: true
  });
} finally {
  globalThis.fetch = originalFetch;
}
