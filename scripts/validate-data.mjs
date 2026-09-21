import fs from "node:fs";
import vm from "node:vm";

function loadWindowScript(path, property) {
  const code = fs.readFileSync(path, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: path });
  return context.window[property];
}

const data = loadWindowScript("public/data.js", "RADAR_DATA");
const signals = loadWindowScript("public/signals.js", "RADAR_SIGNALS");

const errors = [];
const allowedConfidence = new Set(["verified", "review", "unknown"]);
const marketIds = new Set(data.markets.map(m => m.id));
const live = data.markets.filter(m => m.status === "live");

if (marketIds.size !== data.markets.length) errors.push("Duplicate market ids");

for (const market of live) {
  if (!Number.isInteger(market.score) || market.score < 0 || market.score > 100) {
    errors.push(`${market.id}: invalid expansion score`);
  }
  if (!market.operators?.length) errors.push(`${market.id}: missing operators`);
  if (!market.rails?.length) errors.push(`${market.id}: missing billing rails`);
  if (!market.ecosystem?.length) errors.push(`${market.id}: missing commercial targets`);
  if (!market.sources?.length) errors.push(`${market.id}: missing sources`);

  for (const operator of market.operators || []) {
    if (!allowedConfidence.has(operator.confidence)) {
      errors.push(`${market.id}/${operator.name}: invalid operator confidence`);
    }
    if (operator.share != null && (operator.share < 0 || operator.share > 100)) {
      errors.push(`${market.id}/${operator.name}: invalid market share`);
    }
  }

  for (const rail of market.rails || []) {
    if (!allowedConfidence.has(rail.confidence)) {
      errors.push(`${market.id}/${rail.provider}: invalid rail confidence`);
    }
  }

  for (const source of market.sources || []) {
    if (!/^https:\/\//.test(source.url || "")) {
      errors.push(`${market.id}: source must use https: ${source.url}`);
    }
  }
}

const signalIds = new Set();
for (const signal of signals) {
  if (signalIds.has(signal.id)) errors.push(`Duplicate signal id: ${signal.id}`);
  signalIds.add(signal.id);
  if (!marketIds.has(signal.marketId)) errors.push(`${signal.id}: unknown market ${signal.marketId}`);
  if (!allowedConfidence.has(signal.confidence)) errors.push(`${signal.id}: invalid confidence`);
  if (!/^https:\/\//.test(signal.sourceUrl || "")) errors.push(`${signal.id}: invalid source URL`);
}

const totals = {
  markets: data.markets.length,
  liveMarkets: live.length,
  operators: live.reduce((n,m) => n + (m.operators?.length || 0), 0),
  billingRails: live.reduce((n,m) => n + (m.rails?.length || 0), 0),
  commercialTargets: live.reduce((n,m) => n + (m.ecosystem?.length || 0), 0),
  contacts: live.reduce((n,m) => n + (m.contacts?.length || 0), 0),
  signals: signals.length
};

console.log("DCB Expansion Radar data totals:", totals);

if (errors.length) {
  console.error("\nValidation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Validation passed.");
