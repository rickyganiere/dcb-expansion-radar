(() => {
  let loading = false;
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function fmt(value) {
    if (!value) return "Not yet";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function installStyles() {
    if (document.getElementById("automationHealthStyles")) return;
    const style = document.createElement("style");
    style.id = "automationHealthStyles";
    style.textContent =
      ".automationHealth{margin-top:14px;padding:16px}.automationHealthTop{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.automationHealthTop h3{margin:5px 0 4px}.automationHealthTop p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.automationMetrics{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-top:14px}.automationMetric{border:1px solid #203b50;background:#0c1b27;border-radius:10px;padding:10px}.automationMetric span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.06em}.automationMetric strong{display:block;font-size:20px;margin-top:4px}.automationMetric.good strong{color:#81efd3}.automationMetric.warn strong{color:var(--warn)}.automationMetric.bad strong{color:#ffb2b2}.automationTimeline{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;color:var(--muted);font-size:10px}.automationTimeline b{color:#dce6ed}.automationSummary{margin-top:8px;color:var(--muted);font-size:10px}.automationHealthError{color:var(--warn);font-size:11px;margin-top:10px}@media(max-width:1100px){.automationMetrics{grid-template-columns:repeat(4,1fr)}}@media(max-width:700px){.automationMetrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.automationHealthTop{display:block}.automationHealthTop .btn{margin-top:10px}.automationMetrics{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById("automationHealth");
    if (panel) return panel;

    const kpis = document.querySelector(".main > .kpis");
    if (!kpis) return null;

    panel = document.createElement("section");
    panel.id = "automationHealth";
    panel.className = "card automationHealth";
    panel.innerHTML =
      '<div class="automationHealthTop">' +
        '<div><div class="eyebrow">Automation health</div><h3>Source Watch operations</h3><p>Central D1 status for monitored sources and scheduled checks.</p></div>' +
        '<button class="btn ghost" id="refreshAutomationHealth" type="button">Refresh</button>' +
      '</div>' +
      '<div id="automationHealthBody"><div class="automationSummary">Loading automation status…</div></div>';

    kpis.insertAdjacentElement("afterend", panel);
    document.getElementById("refreshAutomationHealth").addEventListener("click", load);
    return panel;
  }

  function render(payload) {
    const root = document.getElementById("automationHealthBody");
    if (!root) return;

    const s = payload.sources || {};
    const summary = payload.lastSummary || null;
    const attempted = summary?.attempted ?? summary?.checked ?? 0;

    root.innerHTML =
      '<div class="automationMetrics">' +
        '<div class="automationMetric"><span>Monitored</span><strong>' + esc(s.total ?? 0) + '</strong></div>' +
        '<div class="automationMetric good"><span>Healthy</span><strong>' + esc(s.healthy ?? 0) + '</strong></div>' +
        '<div class="automationMetric warn"><span>Changed</span><strong>' + esc(s.changed ?? 0) + '</strong></div>' +
        '<div class="automationMetric bad"><span>Failed</span><strong>' + esc(s.failed ?? 0) + '</strong></div>' +
        '<div class="automationMetric warn"><span>Rate limited</span><strong>' + esc(s.rateLimited ?? 0) + '</strong></div>' +
        '<div class="automationMetric bad"><span>Bot blocked</span><strong>' + esc(s.blocked ?? 0) + '</strong></div>' +
        '<div class="automationMetric"><span>Stale</span><strong>' + esc(s.stale ?? 0) + '</strong></div>' +
        '<div class="automationMetric"><span>Due now</span><strong>' + esc(s.dueNow ?? 0) + '</strong></div>' +
      '</div>' +
      '<div class="automationTimeline">' +
        '<span><b>Last run:</b> ' + esc(fmt(payload.lastRunAt)) + '</span>' +
        '<span><b>Next run:</b> ' + esc(fmt(payload.nextRunAt)) + '</span>' +
        '<span><b>Schedule:</b> 06:00 / 18:00 UTC</span>' +
      '</div>' +
      '<div class="automationSummary">' +
        (summary
          ? 'Last run: ' + esc(attempted) + ' attempted · ' + esc(summary.checked ?? 0) + ' successful · ' + esc(summary.changed ?? 0) + ' changed · ' + esc(summary.failed ?? 0) + ' failed' + (summary.skippedByCadence != null ? ' · ' + esc(summary.skippedByCadence) + ' cadence-skipped' : '')
          : 'No scheduled run summary saved yet.') +
        ' · Discovery Inbox: ' + esc(payload.discovery?.pending ?? 0) + ' pending' +
      '</div>';
  }

  async function load() {
    if (loading) return;
    loading = true;
    const panel = ensurePanel();
    if (!panel) { loading = false; return; }

    const button = document.getElementById("refreshAutomationHealth");
    if (button) {
      button.disabled = true;
      button.textContent = "Refreshing…";
    }

    try {
      const response = await fetch("/api/automation/health", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || "Automation health unavailable");
      render(payload);
    } catch (error) {
      const root = document.getElementById("automationHealthBody");
      if (root) root.innerHTML = '<div class="automationHealthError">' + esc(error.message) + '</div>';
    } finally {
      loading = false;
      if (button) {
        button.disabled = false;
        button.textContent = "Refresh";
      }
    }
  }

  function init() {
    installStyles();
    ensurePanel();
    load();
    window.addEventListener("radar:source-watch-updated", load);
    window.addEventListener("radar:discovery-updated", load);
    setInterval(load, 60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();