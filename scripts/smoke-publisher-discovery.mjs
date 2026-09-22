import assert from "node:assert/strict";
import {
  scanAppListing,
  persistAppScan,
  listCommercialEntities,
  reviewCommercialEntity
} from "../src/publisher-discovery.js";

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
    if (this.sql.includes("FROM commercial_entities WHERE normalized_key = ?1")) {
      return this.db.entities.find(row => row.normalized_key === this.args[0]) || null;
    }

    if (this.sql.includes("FROM commercial_entities WHERE entity_id = ?1")) {
      return this.db.entities.find(row => row.entity_id === this.args[0]) || null;
    }

    throw new Error("Unhandled first(): " + this.sql);
  }

  async all() {
    if (this.sql.includes("FROM commercial_entities ORDER BY updated_at DESC")) {
      return { success: true, results: [...this.db.entities] };
    }

    if (this.sql.includes("FROM commercial_assets ORDER BY updated_at DESC")) {
      return { success: true, results: [...this.db.assets] };
    }

    throw new Error("Unhandled all(): " + this.sql);
  }

  async run() {
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
      if (row.confidence !== "high") {
        if (confidence === "high") row.confidence = "high";
        else if (row.confidence !== "medium") row.confidence = confidence;
      }
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
        if (market_id) existing.market_id = market_id;
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

    if (this.sql.startsWith("UPDATE commercial_entities SET primary_role = ?1")) {
      const [primary_role, status, updated_at, entity_id] = this.args;
      const row = this.db.entities.find(entity => entity.entity_id === entity_id);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.primary_role = primary_role;
      row.status = status;
      row.updated_at = updated_at;
      return { success: true, meta: { changes: 1 } };
    }

    throw new Error("Unhandled run(): " + this.sql);
  }
}

class FakeD1 {
  constructor() {
    this.entities = [];
    this.assets = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const markets = new Set(["mexico","colombia","brazil","peru","chile","argentina"]);

const googleFixture = `
<!doctype html>
<html>
<head>
  <title>Publisher App - Apps on Google Play</title>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"SoftwareApplication",
    "name":"Publisher App",
    "author":{"@type":"Organization","name":"Acme Media"}
  }
  </script>
</head>
<body>
  <a href="https://play.google.com/store/apps/developer?id=AcmeMedia">Acme Media</a>
  <a href="https://www.google.com/url?q=https%3A%2F%2Facme.example%2F">Developer website</a>
  <a href="https://acme.example/privacy">Privacy Policy</a>
  <a href="https://www.instagram.com/acmemedia">Instagram</a>
</body>
</html>`;

const appleFixture = `
<!doctype html>
<html>
<head>
  <title>Great Utility on the App Store</title>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"SoftwareApplication",
    "name":"Great Utility",
    "author":{"@type":"Organization","name":"Blue Apps Ltd"}
  }
  </script>
</head>
<body>
  <a href="https://apps.apple.com/developer/blue-apps/id123">Blue Apps Ltd</a>
  <a href="https://blueapps.example/support">App Support</a>
  <a href="https://blueapps.example/privacy">Privacy Policy</a>
</body>
</html>`;

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(googleFixture, {
    status: 200,
    headers: { "content-type": "text/html" }
  });

  try {
    const scan = await scanAppListing(
      "https://play.google.com/store/apps/details?id=com.example.publisher",
      "mexico",
      markets
    );

    assert.equal(scan.store, "google_play");
    assert.equal(scan.appName, "Publisher App");
    assert.equal(scan.developerName, "Acme Media");
    assert.equal(scan.primaryDomain, "acme.example");
    assert.equal(scan.confidence, "high");
    assert.ok(scan.externalLinks.some(link => link.kind === "privacy"));
    assert.ok(scan.externalLinks.some(link => link.domain === "acme.example"));
    assert.ok(scan.externalLinks.some(link => link.domain === "instagram.com" && link.primaryEligible === false));

    const db = new FakeD1();
    const entity = await persistAppScan(db, scan, "test@example.com");

    assert.equal(db.entities.length, 1);
    assert.equal(entity.name, "Acme Media");
    assert.equal(entity.primary_role, "publisher");
    assert.equal(entity.status, "candidate");
    assert.equal(entity.domain, "acme.example");
    assert.ok(db.assets.some(asset => asset.asset_type === "google_play_app"));
    assert.ok(db.assets.some(asset => asset.url.includes("acme.example")));

    await persistAppScan(db, scan, "test@example.com");
    assert.equal(db.entities.length, 1);

    let listed = await listCommercialEntities(db);
    assert.equal(listed.counts.total, 1);
    assert.equal(listed.counts.candidate, 1);
    assert.equal(listed.entities[0].assets.length, db.assets.length);

    await reviewCommercialEntity(db, {
      id: entity.entity_id,
      action: "classify",
      role: "both"
    });

    await reviewCommercialEntity(db, {
      id: entity.entity_id,
      action: "qualify"
    });

    listed = await listCommercialEntities(db, {
      status: "qualified",
      role: "both",
      query: "acme"
    });
    assert.equal(listed.entities.length, 1);
    assert.equal(listed.entities[0].role, "both");
    assert.equal(listed.entities[0].status, "qualified");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(appleFixture, {
    status: 200,
    headers: { "content-type": "text/html" }
  });

  try {
    const scan = await scanAppListing(
      "https://apps.apple.com/us/app/great-utility/id123456789",
      "brazil",
      markets
    );

    assert.equal(scan.store, "apple_app_store");
    assert.equal(scan.appName, "Great Utility");
    assert.equal(scan.developerName, "Blue Apps Ltd");
    assert.equal(scan.primaryDomain, "blueapps.example");
    assert.equal(scan.confidence, "high");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await assert.rejects(
  () => scanAppListing("https://example.com/app/test", "mexico", markets),
  /unsupported_app_store_url/
);

await assert.rejects(
  () => scanAppListing("http://play.google.com/store/apps/details?id=test", "mexico", markets),
  /app_listing_must_use_https/
);

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    "<html><title>Just a moment</title><body>Verify you are human</body></html>",
    { status: 200, headers: { "content-type": "text/html" } }
  );

  try {
    await assert.rejects(
      () => scanAppListing(
        "https://play.google.com/store/apps/details?id=com.blocked.app",
        "mexico",
        markets
      ),
      /app_store_challenge/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("Publisher Discovery smoke tests passed:", {
  googlePlayParser: true,
  appStoreParser: true,
  outboundDomainExtraction: true,
  entityDeduplication: true,
  assetGraph: true,
  commercialClassification: true
});
