(() => {
  const markets = window.RADAR_DATA?.markets || [];
  let state = {
    status: "",
    role: "",
    query: "",
    payload: { counts: {}, entities: [] }
  };

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
    return markets.find(m => m.id === id)?.name || id || "Global";
  }

  function storeLabel(kind) {
    return kind === "google_play" ? "Google Play" :
      kind === "apple_app_store" ? "Apple App Store" :
      String(kind || "").replaceAll("_", " ");
  }

  function installStyles() {
    if (document.getElementById("publisherDiscoveryStyles")) return;
    const style = document.createElement("style");
    style.id = "publisherDiscoveryStyles";
    style.textContent =
      ".publisherToolbar{display:grid;grid-template-columns:1.4fr .8fr auto;gap:8px;margin:12px 0}" +
      ".publisherFilters{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}" +
      ".publisherStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:12px 0}" +
      ".publisherStat{padding:11px}.publisherStat span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase}.publisherStat strong{font-size:20px}" +
      ".publisherGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}" +
      ".publisherCard{padding:15px}.publisherCardTop{display:flex;justify-content:space-between;gap:10px}.publisherCard h3{margin:4px 0}" +
      ".publisherMeta{color:var(--muted);font-size:10px;line-height:1.6}.publisherDomain{font-family:monospace;font-size:10px;word-break:break-all}" +
      ".publisherEvidence{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.publisherEvidence span{font-size:9px;border:1px solid #29455a;border-radius:999px;padding:4px 7px}" +
      ".publisherRole{max-width:160px}.publisherScanStatus{font-size:10px;color:var(--muted);margin-top:6px;min-height:16px}" +
      ".publisherConfidence.high{color:#81efd3}.publisherConfidence.medium{color:#ffd27d}.publisherConfidence.low,.publisherConfidence.unknown{color:#b9c8d5}" +
      "@media(max-width:850px){.publisherToolbar{grid-template-columns:1fr}.publisherGrid{grid-template-columns:1fr}.publisherStats{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(style);
  }

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || document.getElementById("publisherNavLink")) return;
    const anchor = document.createElement("a");
    anchor.id = "publisherNavLink";
    anchor.href = "#publishers";
    anchor.innerHTML = 'Publishers <span class="count" id="publisherCount">0</span>';
    const pipeline = document.getElementById("openPipeline");
    nav.insertBefore(anchor, pipeline || null);
  }

  function ensureSection() {
    let section = document.getElementById("publishers");
    if (section) return section;

    section = document.createElement("section");
    section.id = "publishers";
    section.innerHTML =
      '<div class="sectionHeader"><div>' +
        '<h2>Publisher Discovery</h2>' +
        '<p>Find commercial publishers from App Store / Google Play developers and their linked domains. Candidates stay reviewable before entering the sales pipeline.</p>' +
      '</div></div>' +
      '<div class="card note">' +
        '<strong>App intelligence:</strong> App listing → developer/company → developer/support/privacy domains → publisher candidate → commercial classification → pipeline.' +
      '</div>' +
      '<div class="publisherToolbar">' +
        '<input class="input" id="publisherAppUrl" type="url" placeholder="Paste apps.apple.com or play.google.com app URL">' +
        '<select class="input" id="publisherMarket"><option value="">Market unknown / global</option>' +
          markets.map(m => '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>').join("") +
        '</select>' +
        '<button class="btn primary" id="scanPublisherApp" type="button">Scan app</button>' +
      '</div>' +
      '<div class="publisherScanStatus" id="publisherScanStatus"></div>' +
      '<div class="publisherStats" id="publisherStats"></div>' +
      '<div class="publisherFilters">' +
        '<input class="input" id="publisherSearch" type="search" placeholder="Search publisher, domain…">' +
        '<select class="input" id="publisherStatusFilter">' +
          '<option value="">All statuses</option><option value="candidate">Candidates</option><option value="qualified">Qualified</option><option value="pipeline">Pipeline</option><option value="dismissed">Dismissed</option>' +
        '</select>' +
        '<select class="input" id="publisherRoleFilter">' +
          '<option value="">All roles</option><option value="publisher">Publisher</option><option value="advertiser">Advertiser</option><option value="network">Network</option><option value="both">Both</option><option value="operator">Operator</option><option value="aggregator">Aggregator</option><option value="unknown">Unknown</option>' +
        '</select>' +
      '</div>' +
      '<div class="publisherGrid" id="publisherGrid"></div>';

    const marketsSection = document.getElementById("markets");
    if (marketsSection?.parentNode) {
      marketsSection.parentNode.insertBefore(section, marketsSection.nextSibling);
    } else {
      document.querySelector("main")?.appendChild(section);
    }

    return section;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.detail || payload.error || "Publisher Discovery request failed");
      error.code = payload.error;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function statsHtml(counts) {
    const items = [
      ["All", counts.total || 0],
      ["Candidates", counts.candidate || 0],
      ["Qualified", counts.qualified || 0],
      ["Pipeline", counts.pipeline || 0],
      ["Dismissed", counts.dismissed || 0]
    ];
    return items.map(([label, value]) =>
      '<div class="card publisherStat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>'
    ).join("");
  }

  function assetsSummary(entity) {
    const assets = entity.assets || [];
    const appCount = assets.filter(a => ["google_play_app","app_store_app"].includes(a.asset_type)).length;
    const webCount = assets.filter(a => ["website","domain"].includes(a.asset_type)).length;
    return [
      appCount ? appCount + " app" + (appCount === 1 ? "" : "s") : null,
      webCount ? webCount + " linked web source" + (webCount === 1 ? "" : "s") : null
    ].filter(Boolean);
  }

  function entityCard(entity) {
    const summary = assetsSummary(entity);
    const website = entity.websiteUrl || (entity.domain ? "https://" + entity.domain : "");
    const actions = entity.status === "dismissed"
      ? '<button class="btn tiny publisherReview" data-id="' + esc(entity.id) + '" data-action="reopen">Reopen</button>'
      : (
          '<button class="btn tiny publisherReview" data-id="' + esc(entity.id) + '" data-action="qualify">Qualify</button>' +
          '<button class="btn tiny primary publisherPipeline" data-id="' + esc(entity.id) + '">Add to pipeline</button>' +
          '<button class="btn tiny publisherReview" data-id="' + esc(entity.id) + '" data-action="dismiss">Dismiss</button>'
        );

    return '<article class="card publisherCard" data-entity-id="' + esc(entity.id) + '">' +
      '<div class="publisherCardTop"><div>' +
        '<div class="eyebrow">' + esc(marketName(entity.marketId)) + '</div>' +
        '<h3>' + esc(entity.name) + '</h3>' +
        '<div class="publisherMeta">' + esc(entity.reason || "") + '</div>' +
      '</div><span class="publisherConfidence ' + esc(entity.confidence || "unknown") + '">' + esc(entity.confidence || "unknown") + '</span></div>' +
      (entity.domain ? '<div class="publisherDomain">' + esc(entity.domain) + '</div>' : '') +
      '<div class="publisherEvidence">' +
        '<span>' + esc(storeLabel(entity.firstSourceKind)) + '</span>' +
        '<span>' + esc(entity.status) + '</span>' +
        summary.map(item => '<span>' + esc(item) + '</span>').join("") +
      '</div>' +
      '<div class="rowActions" style="margin-top:10px">' +
        '<select class="input publisherRole" data-id="' + esc(entity.id) + '">' +
          ["publisher","advertiser","network","both","operator","aggregator","unknown"].map(role =>
            '<option value="' + role + '"' + (role === entity.role ? " selected" : "") + '>' + role + '</option>'
          ).join("") +
        '</select>' +
        actions +
        (website ? '<a class="btn tiny profileLink" href="' + esc(website) + '" target="_blank" rel="noreferrer">Website ↗</a>' : '') +
      '</div>' +
    '</article>';
  }

  function render() {
    const counts = state.payload.counts || {};
    const entities = state.payload.entities || [];
    const stats = document.getElementById("publisherStats");
    const grid = document.getElementById("publisherGrid");
    const count = document.getElementById("publisherCount");

    if (stats) stats.innerHTML = statsHtml(counts);
    if (count) count.textContent = counts.candidate || 0;
    if (grid) {
      grid.innerHTML = entities.map(entityCard).join("") ||
        '<div class="empty card">No publisher candidates in this filter yet.</div>';
    }

    wireCards();
  }

  async function load() {
    const params = new URLSearchParams();
    if (state.status) params.set("status", state.status);
    if (state.role) params.set("role", state.role);
    if (state.query) params.set("q", state.query);

    const grid = document.getElementById("publisherGrid");
    if (grid) grid.innerHTML = '<div class="empty card">Loading publisher candidates…</div>';

    try {
      state.payload = await api("/api/publisher-discovery" + (params.toString() ? "?" + params : ""));
      render();
    } catch (error) {
      if (grid) {
        grid.innerHTML = '<div class="empty card">' + esc(
          error.code === "migration_required"
            ? "Publisher Discovery database migration is not applied yet."
            : error.message
        ) + '</div>';
      }
    }
  }

  async function scanApp() {
    const url = document.getElementById("publisherAppUrl")?.value.trim();
    const marketId = document.getElementById("publisherMarket")?.value || "";
    const status = document.getElementById("publisherScanStatus");
    const button = document.getElementById("scanPublisherApp");

    if (!url) {
      if (status) status.textContent = "Paste an App Store or Google Play app URL.";
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Scanning…";
    }
    if (status) status.textContent = "Reading app listing and linked developer domains…";

    try {
      const result = await api("/api/publisher-discovery/scan-app", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, marketId: marketId || null })
      });

      const scan = result.scan || {};
      if (status) {
        status.textContent =
          "Found: " + (result.entity?.name || scan.developerName || scan.appName || "publisher") +
          (scan.primaryDomain ? " · " + scan.primaryDomain : "") +
          " · " + (scan.externalLinks?.length || 0) + " external links";
      }
      document.getElementById("publisherAppUrl").value = "";
      await load();
    } catch (error) {
      if (status) {
        const labels = {
          unsupported_app_store_url: "Use a real apps.apple.com or play.google.com app listing.",
          invalid_app_listing_url: "The app URL is invalid.",
          app_listing_must_use_https: "Use an HTTPS app listing.",
          publisher_scan_failed: "The store page could not be parsed right now."
        };
        status.textContent = labels[error.code] || error.message;
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Scan app";
      }
    }
  }

  async function review(id, action, role = "") {
    return api("/api/publisher-discovery/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, role: role || undefined })
    });
  }

  function findEntity(id) {
    return (state.payload.entities || []).find(entity => entity.id === id);
  }

  async function addToPipeline(id) {
    const entity = findEntity(id);
    if (!entity) return;

    await review(id, "pipeline", entity.role);

    window.RADAR_ADD_PIPELINE?.({
      key: "publisher::" + entity.id,
      type: "Publisher Discovery",
      marketId: entity.marketId || "",
      name: entity.name,
      company: entity.name,
      role: entity.role,
      domain: entity.domain || "",
      websiteUrl: entity.websiteUrl || "",
      notes: entity.reason || "Discovered from app intelligence"
    });

    await load();
  }

  function wireCards() {
    document.querySelectorAll(".publisherRole").forEach(select => {
      select.addEventListener("change", async () => {
        select.disabled = true;
        try {
          await review(select.dataset.id, "classify", select.value);
          await load();
        } finally {
          select.disabled = false;
        }
      });
    });

    document.querySelectorAll(".publisherReview").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const entity = findEntity(button.dataset.id);
          await review(button.dataset.id, button.dataset.action, entity?.role || "");
          await load();
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll(".publisherPipeline").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await addToPipeline(button.dataset.id);
          button.textContent = "✓ Pipeline";
        } catch {
          button.disabled = false;
        }
      });
    });
  }

  function wireFilters() {
    document.getElementById("scanPublisherApp")?.addEventListener("click", scanApp);
    document.getElementById("publisherSearch")?.addEventListener("input", event => {
      state.query = event.target.value.trim();
      clearTimeout(wireFilters.searchTimer);
      wireFilters.searchTimer = setTimeout(load, 250);
    });
    document.getElementById("publisherStatusFilter")?.addEventListener("change", event => {
      state.status = event.target.value;
      load();
    });
    document.getElementById("publisherRoleFilter")?.addEventListener("change", event => {
      state.role = event.target.value;
      load();
    });
    window.addEventListener("radar:publisher-discovery-updated", load);
  }

  function init() {
    installStyles();
    ensureNav();
    ensureSection();
    wireFilters();
    load();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
