import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import worker from "../src/index.js";
import { SOURCE_REGISTRY } from "../src/source-registry.js";

function loadRadarData() {
  const code = fs.readFileSync("public/data.js", "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: "public/data.js" });
  return context.window.RADAR_DATA;
}

const data = loadRadarData();
const marketIds = new Set(data.markets.map(m => m.id));

for (const [id, source] of Object.entries(SOURCE_REGISTRY)) {
  assert.ok(id, "source id is required");
  assert.ok(marketIds.has(source.marketId), id + " references an unknown market");
  assert.match(source.url, /^https:\/\//, id + " source URL must use https");
  assert.ok(source.label, id + " source label is required");
}

const env = {
  ASSETS: {
    fetch: async request => new Response("asset:" + new URL(request.url).pathname, {
      status: 200,
      headers: { "content-type": "text/plain" }
    })
  }
};

async function call(path) {
  return worker.fetch(new Request("https://radar.test" + path), env);
}

{
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.backend.api, "online");
  assert.equal(payload.backend.persistence, "local-browser");
}

{
  const response = await call("/api/status");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.capabilities.includes("source-watch"));
}

{
  const response = await call("/api/sources");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.sources.length, Object.keys(SOURCE_REGISTRY).length);
  assert.ok(payload.sources.every(source => marketIds.has(source.marketId)));
}

{
  const response = await call("/api/check-source?id=missing-source");
  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.equal(payload.error, "unknown_source");
}

{
  const response = await call("/api/not-real");
  assert.equal(response.status, 404);
}

{
  const response = await call("/");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset:/");
}

console.log("Worker smoke tests passed:", {
  markets: marketIds.size,
  monitoredSources: Object.keys(SOURCE_REGISTRY).length
});
