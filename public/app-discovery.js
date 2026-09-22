(() => {
  const markets = window.RADAR_DATA?.markets || [];
  let payload = { counts: {}, seeds: [], queue: [] };
  let busy = false;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function marketName(id) {
    return markets.find(m => m.id === id)?.name || id || "—";
  }

  function storeLabel(store) {
    return store === "apple_app_store" ? "Apple App Store" :
      store === "google_play" ? "Google Play" : store;
  }

  function timeLabel(value) {
    if (!value) return "Never";
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function installStyles() {
    if (document.getElementById("appDiscoveryStyles")) return;
    const style = document.createElement("style");
    style.id = "appDiscoveryStyles";
    style.textContent =
      ".appDiscoveryPanel{margin:12px 0;padding:14px}.appDiscoveryTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}" +
      ".appDiscoveryForm{display:grid;grid-template-columns:.9fr .9fr 1.3fr .7fr auto;gap:8px;margin-top:12px}" +
      ".appDiscoveryActions{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.appDiscoveryStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}" +
      ".appDiscoveryStat{padding:9px}.appDiscoveryStat span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase}.appDiscoveryStat strong{font-size:16px}" +
      ".appSeedList,.appQueueList{display:grid;gap:7px;margin-top:9px}.appSeedRow,.appQueueRow{display:grid;grid-template-columns:1.2fr .8fr .8fr .8fr auto;gap:8px;align-items:center;padding:10px}" +
      ".appSeedMeta,.appQueueMeta{font-size:9px;color:var(--muted);line-height:1.5}.appDiscoveryStatus{font-size:10px;color:var(--muted);min-height:16px}" +
      ".queueStatus.pending{color:#ffd27d}.queueStatus.scanned{color:#81efd3}.queueStatus.failed{color:#ff9e9e}" +
      "@media(max-width:900px){.appDiscoveryForm{grid-template-columns:1fr 1fr}.appSeedRow,.appQueueRow{grid-template-columns:1fr 1fr}.appSeedRow .rowActions,.appQueueRow .rowActions{grid-column:1/-1}.appDiscoveryStats{grid-template-columns:repeat(2,1fr)}}" +
      "@media(max-width:620px){.appDiscoveryForm{grid-template-columns:1fr}.appSeedRow,.appQueueRow{grid-template-columns:1fr}}";
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const section = document.getElementById("publishers");
    if (!section) return null;

    let panel = document.getElementById("appDiscoveryPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "appDiscoveryPanel";
    panel.className = "card appDiscoveryPanel";
    panel.innerHTML =
      '<div class="appDiscoveryTop"><div>' +
        '<div class="eyebrow">Automated store discovery</div>' +
        '<h3>Store Discovery Seeds</h3>' +
        '<p class="publisherMeta">Continuously discover app listings by keyword and market, then scan developers/domains into Publisher Discovery.</p>' +
      '</div></div>' +
      '<div class="appDiscoveryForm">' +
        '<select class="input" id="appSeedMarket">' +
          markets.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join("") +
        '</select>' +
        '<select class="input" id="appSeedStore">' +
          '<option value="google_play">Google Play</option>' +
          '<option value="apple_app_store">Apple App Store</option>' +
        '</select>' +
        '<input class="input" id="appSeedQuery" placeholder="Keyword: dating, streaming, horoscope…">' +
        '<select class="input" id="appSeedCadence">' +
          '<option value="24">Daily</option><option value="72">Every 3 days</option><option value="168">Weekly</option><option value="12">Every 12h</option>' +
        '</select>' +
        '<button class="btn primary" id="addAppSeed" type="button">Add seed</button>' +
      '</div>' +
      '<div class="appDiscoveryActions">' +
        '<button class="btn ghost" id="addVasPresets" type="button">Add VAS presets for market</button>' +
        '<button class="btn primary" id="runAppDiscovery" type="button">Run discovery now</button>' +
        '<button class="btn ghost" id="processAppQueue" type="button">Process queue</button>' +
      '</div>' +
      '<div class="appDiscoveryStatus" id="appDiscoveryStatus"></div>' +
      '<div class="appDiscoveryStats" id="appDiscoveryStats"></div>' +
      '<details style="margin-top:10px"><summary>Discovery seeds <span class="count" id="appSeedCount">0</span></summary><div class="appSeedList" id="appSeedList"></div></details>' +
      '<details style="margin-top:10px"><summary>App queue <span class="count" id="appQueueCount">0</span></summary><div class="appQueueList" id="appQueueList"></div></details>';

    const scanStatus = document.getElementById("publisherScanStatus");
    if (scanStatus?.parentNode) {
      scanStatus.parentNode.insertBefore(panel, scanStatus.nextSibling);
    } else {
      section.appendChild(panel);
    }

    wirePanel();
    return panel;
  }

  async function api(body = null) {
    const response = await fetch("/api/app-discovery", {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.detail || result.message || result.error || "App Discovery request failed");
      error.code = result.error;
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function statsHtml(counts) {
    return [
      ["Seeds", counts.seeds || 0],
      ["Enabled", counts.enabledSeeds || 0],
      ["Pending apps", counts.pending || 0],
      ["Scanned", counts.scanned || 0],
      ["Failed", counts.failed || 0]
    ].map(([label, value]) =>
      '<div class="card appDiscoveryStat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>'
    ).join("");
  }

  function seedRow(seed) {
    return '<div class="card appSeedRow">' +
      '<div><strong>' + esc(seed.query) + '</strong><div class="appSeedMeta">' + esc(storeLabel(seed.store)) + '</div></div>' +
      '<div><strong>' + esc(marketName(seed.marketId)) + '</strong><div class="appSeedMeta">Every ' + esc(seed.cadenceHours) + 'h</div></div>' +
      '<div><span class="status">' + (seed.enabled ? "Enabled" : "Disabled") + '</span><div class="appSeedMeta">HTTP ' + esc(seed.lastHttpStatus ?? "—") + '</div></div>' +
      '<div class="appSeedMeta">Last: ' + esc(timeLabel(seed.lastCheckedAt)) + (seed.lastError ? '<br>' + esc(seed.lastError) : '') + '</div>' +
      '<div class="rowActions">' +
        '<button class="btn tiny runAppSeed" data-id="' + esc(seed.id) + '">Run</button>' +
        '<button class="btn tiny toggleAppSeed" data-id="' + esc(seed.id) + '" data-enabled="' + (seed.enabled ? "0" : "1") + '">' + (seed.enabled ? "Disable" : "Enable") + '</button>' +
      '</div>' +
    '</div>';
  }

  function queueRow(item) {
    const retry = item.status === "failed"
      ? '<button class="btn tiny retryAppListing" data-url="' + esc(item.listingUrl) + '">Retry</button>'
      : '';

    return '<div class="card appQueueRow">' +
      '<div><strong>' + esc(item.appName || "App listing") + '</strong><div class="appQueueMeta">' + esc(item.developerHint || item.listingUrl) + '</div></div>' +
      '<div><strong>' + esc(marketName(item.marketId)) + '</strong><div class="appQueueMeta">' + esc(storeLabel(item.store)) + '</div></div>' +
      '<div><span class="queueStatus ' + esc(item.status) + '">' + esc(item.status) + '</span><div class="appQueueMeta">Attempts ' + esc(item.attempts) + '</div></div>' +
      '<div class="appQueueMeta">' + esc(item.lastError || timeLabel(item.discoveredAt)) + '</div>' +
      '<div class="rowActions">' + retry + '<a class="btn tiny profileLink" href="' + esc(item.listingUrl) + '" target="_blank" rel="noreferrer">Store ↗</a></div>' +
    '</div>';
  }

  function render() {
    const counts = payload.counts || {};
    document.getElementById("appDiscoveryStats").innerHTML = statsHtml(counts);
    document.getElementById("appSeedCount").textContent = counts.seeds || 0;
    document.getElementById("appQueueCount").textContent = (payload.queue || []).length;

    document.getElementById("appSeedList").innerHTML =
      (payload.seeds || []).map(seedRow).join("") ||
      '<div class="empty">No seeds yet. Add one or install the VAS preset pack.</div>';

    document.getElementById("appQueueList").innerHTML =
      (payload.queue || []).slice(0, 80).map(queueRow).join("") ||
      '<div class="empty">No apps discovered yet.</div>';

    wireRows();
  }

  async function load() {
    if (!ensurePanel()) return;

    try {
      payload = await api();
      render();
    } catch (error) {
      const status = document.getElementById("appDiscoveryStatus");
      if (status) {
        status.textContent = error.code === "migration_required"
          ? "Automated Store Discovery requires the pending D1 migration."
          : error.message;
      }
    }
  }

  async function withBusy(button, label, fn) {
    if (busy) return;
    busy = true;
    const original = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = label;
    }

    try {
      return await fn();
    } finally {
      busy = false;
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function setStatus(text) {
    const el = document.getElementById("appDiscoveryStatus");
    if (el) el.textContent = text;
  }

  function wirePanel() {
    document.getElementById("addAppSeed")?.addEventListener("click", async event => {
      const button = event.currentTarget;
      const query = document.getElementById("appSeedQuery")?.value.trim();
      if (!query) {
        setStatus("Add a keyword first.");
        return;
      }

      await withBusy(button, "Adding…", async () => {
        try {
          await api({
            action: "create_seed",
            marketId: document.getElementById("appSeedMarket").value,
            store: document.getElementById("appSeedStore").value,
            query,
            cadenceHours: Number(document.getElementById("appSeedCadence").value)
          });
          document.getElementById("appSeedQuery").value = "";
          setStatus("Discovery seed added.");
          await load();
        } catch (error) {
          setStatus(error.code === "duplicate_app_seed" ? "That seed already exists." : error.message);
        }
      });
    });

    document.getElementById("addVasPresets")?.addEventListener("click", async event => {
      await withBusy(event.currentTarget, "Adding presets…", async () => {
        try {
          const result = await api({
            action: "preset_pack",
            marketId: document.getElementById("appSeedMarket").value
          });
          setStatus(
            "Preset pack: " + (result.result?.created || 0) + " created · " +
            (result.result?.skipped || 0) + " already existed."
          );
          await load();
        } catch (error) {
          setStatus(error.message);
        }
      });
    });

    document.getElementById("runAppDiscovery")?.addEventListener("click", async event => {
      await withBusy(event.currentTarget, "Discovering…", async () => {
        try {
          const seeds = await api({ action: "run_due", forceAll: true, maxSeeds: 8 });
          const queue = await api({ action: "process_queue", limit: 8 });
          setStatus(
            "Discovery: " + (seeds.result?.discovered || 0) + " new app listings · " +
            (queue.result?.scanned || 0) + " publisher scans · " +
            (queue.result?.failed || 0) + " failed."
          );
          await load();
          window.dispatchEvent(new CustomEvent("radar:publisher-discovery-updated"));
        } catch (error) {
          setStatus(error.message);
        }
      });
    });

    document.getElementById("processAppQueue")?.addEventListener("click", async event => {
      await withBusy(event.currentTarget, "Processing…", async () => {
        try {
          const result = await api({ action: "process_queue", limit: 10 });
          setStatus(
            "Queue: " + (result.result?.scanned || 0) + " scanned · " +
            (result.result?.failed || 0) + " failed."
          );
          await load();
          window.dispatchEvent(new CustomEvent("radar:publisher-discovery-updated"));
        } catch (error) {
          setStatus(error.message);
        }
      });
    });
  }

  function wireRows() {
    document.querySelectorAll(".runAppSeed").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await api({ action: "run_seed", id: button.dataset.id });
          setStatus(
            "Seed: " + (result.result?.inserted || 0) + " new · " +
            (result.result?.existing || 0) + " existing."
          );
          await load();
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll(".toggleAppSeed").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await api({
            action: "toggle_seed",
            id: button.dataset.id,
            enabled: button.dataset.enabled === "1"
          });
          await load();
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll(".retryAppListing").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await api({ action: "retry_listing", listingUrl: button.dataset.url });
          setStatus("App listing returned to the pending queue.");
          await load();
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function initWhenReady(attempt = 0) {
    installStyles();
    const panel = ensurePanel();
    if (panel) {
      load();
      return;
    }
    if (attempt < 20) setTimeout(() => initWhenReady(attempt + 1), 100);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", () => initWhenReady())
    : initWhenReady();
})();
