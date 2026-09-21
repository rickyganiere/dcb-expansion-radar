(() => {
  const STORE_KEY = "dcb_source_watch_v1";
  let sources = [];
  let state = loadState();

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function marketName(id) {
    return (window.RADAR_DATA?.markets || []).find(m => m.id === id)?.name || id;
  }

  function installStyles() {
    if (document.getElementById("sourceWatchStyles")) return;
    const style = document.createElement("style");
    style.id = "sourceWatchStyles";
    style.textContent =
      ".sourceWatchCard{padding:0;overflow:hidden}.sourceWatchToolbar{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-bottom:10px}" +
      ".sourceWatchToolbar p{margin:0;color:var(--muted);font-size:11px;line-height:1.5;max-width:720px}.watchStatus{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;border:1px solid #28485e;background:#132b3d;white-space:nowrap}" +
      ".watchStatus.same{color:#81efd3;border-color:#2f6b60;background:#113b35}.watchStatus.changed{color:#ffb2b2;border-color:#673d3d;background:#361d1d}.watchStatus.baseline{color:#8db5ff;border-color:#35517e;background:#13233f}.watchStatus.error{color:var(--warn);border-color:#65532b;background:#342b14}" +
      ".sourceWatchMeta{display:block;color:var(--muted);font-size:9px;margin-top:4px}.sourceWatchRow.changedRow{background:rgba(92,26,26,.16)}.sourceWatchActions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}" +
      ".watchProgress{font-size:10px;color:var(--muted)}@media(max-width:700px){.sourceWatchToolbar{align-items:flex-start}.sourceWatchActions{min-width:160px}}";
    document.head.appendChild(style);
  }

  function installSection() {
    const signals = document.getElementById("signals");
    if (!signals || document.getElementById("source-watch")) return;
    const section = document.createElement("section");
    section.id = "source-watch";
    section.innerHTML =
      '<div class="sectionHeader"><div><h2>Source Watch <span class="count" id="sourceWatchChangeCount">0</span></h2><p>Check monitored public sources and detect page changes since your last accepted baseline.</p></div></div>' +
      '<div class="sourceWatchToolbar">' +
        '<p>A detected change means the source page fingerprint changed — it still needs human review before we treat it as a commercial or billing change.</p>' +
        '<div class="sourceWatchActions"><span class="watchProgress" id="watchProgress"></span><button class="btn ghost" id="resetWatch">Reset baselines</button><button class="btn primary" id="checkAllSources">Check all sources</button></div>' +
      '</div>' +
      '<div class="card tableWrap sourceWatchCard"><table><thead><tr><th>Market</th><th>Source</th><th>Type</th><th>Last check</th><th>Status</th><th></th></tr></thead><tbody id="sourceWatchRows"><tr><td colspan="6">Loading sources…</td></tr></tbody></table></div>';
    signals.insertAdjacentElement("afterend", section);

    const nav = document.querySelector(".sidebar .nav");
    if (nav) {
      const link = document.createElement("a");
      link.href = "#source-watch";
      link.textContent = "Source Watch";
      const workflow = [...nav.children].find(el => el.getAttribute && el.getAttribute("href") === "#workflow");
      nav.insertBefore(link, workflow || null);
    }

    document.getElementById("checkAllSources").addEventListener("click", checkAll);
    document.getElementById("resetWatch").addEventListener("click", () => {
      if (!confirm("Reset all Source Watch baselines on this device?")) return;
      state = {};
      saveState();
      render();
    });
  }

  function rowStatus(source) {
    const saved = state[source.id];
    if (!saved) return { cls: "", label: "Unchecked" };
    if (saved.error) return { cls: "error", label: "Check failed" };
    if (saved.changed) return { cls: "changed", label: "Page changed" };
    if (saved.baselineOnly) return { cls: "baseline", label: "Baseline saved" };
    return { cls: "same", label: "No change" };
  }

  function render() {
    const root = document.getElementById("sourceWatchRows");
    if (!root) return;
    root.innerHTML = sources.map(source => {
      const saved = state[source.id];
      const status = rowStatus(source);
      const when = saved?.checkedAt ? new Date(saved.checkedAt).toLocaleString() : "—";
      const detail = saved?.httpStatus ? "HTTP " + saved.httpStatus + (saved.durationMs ? " · " + saved.durationMs + "ms" : "") : "";
      const accept = saved?.changed && saved?.lastHash
        ? '<button class="btn tiny primary acceptBaselineBtn" data-source-id="' + esc(source.id) + '">Accept baseline</button>'
        : '';
      return '<tr class="sourceWatchRow ' + (status.cls === "changed" ? "changedRow" : "") + '">' +
        '<td><strong>' + esc(marketName(source.marketId)) + '</strong></td>' +
        '<td><strong>' + esc(source.label) + '</strong><span class="sourceWatchMeta">' + esc(detail) + '</span></td>' +
        '<td>' + esc(source.type.replaceAll("_"," ")) + '</td>' +
        '<td>' + esc(when) + '</td>' +
        '<td><span class="watchStatus ' + esc(status.cls) + '">' + esc(status.label) + '</span></td>' +
        '<td><div class="rowActions"><button class="btn tiny checkSourceBtn" data-source-id="' + esc(source.id) + '">Check</button>' + accept + '<a class="btn tiny profileLink" href="' + esc(source.url) + '" target="_blank" rel="noreferrer">Open ↗</a></div></td>' +
      '</tr>';
    }).join("") || '<tr><td colspan="6">No monitored sources.</td></tr>';

    const changedCount = Object.values(state).filter(item => item?.changed).length;
    const count = document.getElementById("sourceWatchChangeCount");
    if (count) {
      count.textContent = changedCount;
      count.style.display = changedCount ? "inline-grid" : "none";
    }

    document.querySelectorAll(".checkSourceBtn").forEach(btn => btn.addEventListener("click", () => checkOne(btn.dataset.sourceId, btn)));
    document.querySelectorAll(".acceptBaselineBtn").forEach(btn => btn.addEventListener("click", () => acceptBaseline(btn.dataset.sourceId)));
  }

  function acceptBaseline(id) {
    const item = state[id];
    if (!item?.lastHash) return;
    state[id] = {
      ...item,
      baselineHash: item.lastHash,
      hash: item.lastHash,
      changed: false,
      baselineOnly: false,
      error: null,
      reviewedAt: new Date().toISOString()
    };
    saveState();
    render();
  }

  async function checkOne(id, button) {
    const source = sources.find(s => s.id === id);
    if (!source) return false;
    const previous = state[id];
    if (button) { button.disabled = true; button.textContent = "Checking…"; }
    try {
      const response = await fetch("/api/check-source?id=" + encodeURIComponent(id), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.detail || result.error || "Check failed");
      const baselineHash = previous?.baselineHash || previous?.hash || null;
      const hadBaseline = Boolean(baselineHash);
      const changed = hadBaseline && baselineHash !== result.hash;
      state[id] = {
        baselineHash: baselineHash || result.hash,
        hash: baselineHash || result.hash,
        lastHash: result.hash,
        checkedAt: result.checkedAt,
        httpStatus: result.status,
        durationMs: result.durationMs,
        changed,
        baselineOnly: !hadBaseline,
        error: null,
        reviewedAt: previous?.reviewedAt || null
      };
      saveState();
      render();
      return true;
    } catch (error) {
      state[id] = {
        ...(previous || {}),
        checkedAt: new Date().toISOString(),
        error: String(error?.message || error),
        changed: previous?.changed || false,
        baselineOnly: previous?.baselineOnly || false
      };
      saveState();
      render();
      return false;
    } finally {
      if (button && document.body.contains(button)) { button.disabled = false; button.textContent = "Check"; }
    }
  }

  async function checkAll() {
    const button = document.getElementById("checkAllSources");
    const progress = document.getElementById("watchProgress");
    button.disabled = true;
    let done = 0;
    progress.textContent = "0/" + sources.length;
    for (const source of sources) {
      await checkOne(source.id);
      done += 1;
      progress.textContent = done + "/" + sources.length;
    }
    button.disabled = false;
    progress.textContent = "Done · " + done + " checked";
  }

  async function loadSources() {
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.sources)) throw new Error("Sources API unavailable");
      sources = payload.sources;
      render();
    } catch {
      const root = document.getElementById("sourceWatchRows");
      if (root) root.innerHTML = '<tr><td colspan="6">Source Watch API is not available yet. The next Cloudflare deployment may still be in progress.</td></tr>';
    }
  }

  function init() {
    installStyles();
    installSection();
    loadSources();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();