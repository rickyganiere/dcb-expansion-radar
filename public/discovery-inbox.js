(() => {
  let activeStatus = "pending";

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
    return (window.RADAR_DATA?.markets || []).find(m => m.id === id)?.name || id;
  }

  function fmt(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function statusLabel(status) {
    return ({
      pending: "Pending review",
      accepted: "Accepted for research",
      dismissed: "Dismissed"
    })[status] || status;
  }

  function installStyles() {
    if (document.getElementById("discoveryInboxStyles")) return;
    const style = document.createElement("style");
    style.id = "discoveryInboxStyles";
    style.textContent =
      ".discoveryInbox{margin-top:28px}.discoveryToolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px}.discoveryFilters{display:flex;gap:7px;flex-wrap:wrap}.discoveryFilter.active{background:var(--accent);color:#062018;border-color:transparent;font-weight:800}.discoveryGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.discoveryCard{padding:15px}.discoveryCardTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.discoveryCardTop h3{margin:6px 0 4px;line-height:1.35}.discoveryMeta{color:var(--muted);font-size:10px}.discoveryCard p{color:var(--muted);font-size:11px;line-height:1.55}.discoveryStatus{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;border:1px solid #28485e}.discoveryStatus.pending{color:var(--warn);border-color:#65532b;background:#342b14}.discoveryStatus.accepted{color:#81efd3;border-color:#2f6b60;background:#113b35}.discoveryStatus.dismissed{color:#adc0d0;background:#152330}.discoveryCounts{color:var(--muted);font-size:10px}.discoveryReview{margin-top:8px;color:var(--muted);font-size:9px}@media(max-width:800px){.discoveryGrid{grid-template-columns:1fr}.discoveryToolbar{align-items:flex-start;flex-direction:column}}";
    document.head.appendChild(style);
  }

  function ensureSection() {
    let section = document.getElementById("discovery-inbox");
    if (section) return section;

    const sourceWatch = document.getElementById("source-watch");
    const workflow = document.getElementById("workflow");
    const anchor = sourceWatch || workflow;
    if (!anchor) return null;

    section = document.createElement("section");
    section.id = "discovery-inbox";
    section.className = "discoveryInbox";
    section.innerHTML =
      '<div class="sectionHeader"><div><h2>Discovery Inbox <span class="count" id="discoveryPendingCount">0</span></h2>' +
      '<p>Automated source changes become research candidates here. Nothing is promoted to verified intelligence automatically.</p></div></div>' +
      '<div class="discoveryToolbar">' +
        '<div class="discoveryFilters">' +
          '<button class="btn discoveryFilter active" data-discovery-status="pending">Pending</button>' +
          '<button class="btn discoveryFilter" data-discovery-status="accepted">Accepted</button>' +
          '<button class="btn discoveryFilter" data-discovery-status="dismissed">Dismissed</button>' +
        '</div>' +
        '<div class="discoveryCounts" id="discoveryCounts">Loading…</div>' +
      '</div>' +
      '<div class="discoveryGrid" id="discoveryGrid"><div class="empty card">Loading discovery candidates…</div></div>';

    if (sourceWatch) {
      sourceWatch.insertAdjacentElement("afterend", section);
    } else {
      workflow.insertAdjacentElement("beforebegin", section);
    }

    const nav = document.querySelector(".sidebar .nav");
    if (nav && ![...nav.querySelectorAll("a")].some(a => a.getAttribute("href") === "#discovery-inbox")) {
      const link = document.createElement("a");
      link.href = "#discovery-inbox";
      link.textContent = "Discovery Inbox";
      const workflowLink = [...nav.children].find(el => el.getAttribute && el.getAttribute("href") === "#workflow");
      nav.insertBefore(link, workflowLink || null);
    }

    section.querySelectorAll(".discoveryFilter").forEach(btn => {
      btn.addEventListener("click", () => {
        activeStatus = btn.dataset.discoveryStatus;
        section.querySelectorAll(".discoveryFilter").forEach(x => x.classList.toggle("active", x === btn));
        load();
      });
    });

    return section;
  }

  function actionButtons(candidate) {
    if (candidate.status === "pending") {
      return '<button class="btn tiny primary discoveryAction" data-action="accept" data-id="' + esc(candidate.id) + '">Accept for research</button>' +
        '<button class="btn tiny discoveryAction" data-action="dismiss" data-id="' + esc(candidate.id) + '">Dismiss</button>';
    }

    return '<button class="btn tiny discoveryAction" data-action="reopen" data-id="' + esc(candidate.id) + '">Reopen</button>';
  }

  function render(payload) {
    const root = document.getElementById("discoveryGrid");
    const count = document.getElementById("discoveryPendingCount");
    const counts = document.getElementById("discoveryCounts");
    if (!root) return;

    if (count) {
      count.textContent = payload.counts?.pending || 0;
      count.style.display = payload.counts?.pending ? "inline-grid" : "none";
    }

    if (counts) {
      counts.textContent =
        (payload.counts?.pending || 0) + " pending · " +
        (payload.counts?.accepted || 0) + " accepted · " +
        (payload.counts?.dismissed || 0) + " dismissed";
    }

    root.innerHTML = (payload.candidates || []).map(candidate => {
      const reviewed = candidate.reviewed_at
        ? '<div class="discoveryReview">Reviewed ' + esc(fmt(candidate.reviewed_at)) +
          (candidate.reviewed_by ? ' · ' + esc(candidate.reviewed_by) : '') + '</div>'
        : '';

      return '<article class="card discoveryCard">' +
        '<div class="discoveryCardTop"><div>' +
          '<div class="eyebrow">' + esc(marketName(candidate.market_id)) + ' · source change</div>' +
          '<h3>' + esc(candidate.title || candidate.source_id) + '</h3>' +
          '<div class="discoveryMeta">Detected ' + esc(fmt(candidate.detected_at)) + '</div>' +
        '</div><span class="discoveryStatus ' + esc(candidate.status) + '">' + esc(statusLabel(candidate.status)) + '</span></div>' +
        '<p>' + esc(candidate.summary || "Source content changed compared with the reviewed baseline.") + '</p>' +
        '<div class="rowActions">' +
          actionButtons(candidate) +
          '<button class="btn tiny" data-open="' + esc(candidate.market_id) + '">Open market</button>' +
          '<a class="btn tiny profileLink" href="' + esc(candidate.source_url) + '" target="_blank" rel="noreferrer">Open source ↗</a>' +
        '</div>' +
        reviewed +
      '</article>';
    }).join("") || '<div class="empty card">No ' + esc(activeStatus) + ' discovery candidates.</div>';

    root.querySelectorAll(".discoveryAction").forEach(btn => {
      btn.addEventListener("click", () => review(Number(btn.dataset.id), btn.dataset.action, btn));
    });
  }

  async function review(id, action, button) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Saving…";

    try {
      const response = await fetch("/api/discovery/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "Review failed");
      await load();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function load() {
    const root = document.getElementById("discoveryGrid");
    if (root) root.innerHTML = '<div class="empty card">Loading…</div>';

    try {
      const response = await fetch("/api/discovery/inbox?status=" + encodeURIComponent(activeStatus), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "Discovery Inbox unavailable");
      render(payload);
    } catch (error) {
      if (root) root.innerHTML = '<div class="empty card">' + esc(error.message) + '</div>';
    }
  }

  function init() {
    installStyles();
    ensureSection();
    load();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();