(() => {
  const STORE_KEY = "dcb_source_watch_v1";
  let sources = [];
  let localState = loadLocalState();
  let centralMode = false;
  let centralState = {};
  let centralAuthenticated = false;

  function loadLocalState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveLocalState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(localState));
  }

  function notifySourceWatchUpdated(detail = {}) {
    window.dispatchEvent(new CustomEvent("radar:source-watch-updated", { detail }));
  }

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

  function cadenceLabel(hours) {
    const value = Number(hours || 24);
    if (value < 24) return "Every " + value + "h";
    if (value === 24) return "Daily";
    if (value % 24 === 0) return "Every " + (value / 24) + " days";
    return "Every " + value + "h";
  }

  function installStyles() {
    if (document.getElementById("sourceWatchStyles")) return;
    const style = document.createElement("style");
    style.id = "sourceWatchStyles";
    style.textContent =
      ".sourceWatchCard{padding:0;overflow:hidden}.sourceWatchToolbar{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin:0 0 12px}.sourceWatchToolbar p{margin:0;color:var(--muted);font-size:11px;line-height:1.5;max-width:720px}.sourceWatchActions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.watchProgress{font-size:10px;color:var(--muted)}" +
      ".watchMode{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;border:1px solid #28485e;background:#132b3d}.watchMode.central{color:#81efd3;border-color:#2f6b60;background:#113b35}.watchMode.local{color:#8db5ff;border-color:#35517e;background:#13233f}" +
      ".watchStatus{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;border:1px solid #28485e;background:#132b3d;white-space:nowrap}.watchStatus.same{color:#81efd3;border-color:#2f6b60;background:#113b35}.watchStatus.changed{color:#ffb2b2;border-color:#673d3d;background:#361d1d}.watchStatus.baseline{color:#8db5ff;border-color:#35517e;background:#13233f}.watchStatus.error{color:var(--warn);border-color:#65532b;background:#342b14}" +
      ".sourceWatchMeta{display:block;color:var(--muted);font-size:9px;margin-top:4px;max-width:420px}.sourceWatchRow.changedRow{background:rgba(92,26,26,.16)}" +
      ".sourceHistoryDialog{width:min(760px,94vw);background:#071019;color:var(--text);border:1px solid #28485e;border-radius:14px;padding:0}.sourceHistoryDialog::backdrop{background:rgba(0,0,0,.72)}.sourceHistoryBody{padding:20px}.sourceHistoryList{display:grid;gap:8px;margin-top:14px}.sourceHistoryItem{padding:11px;border:1px solid #20394d;border-radius:9px;background:#0b1822}.sourceHistoryItem small{display:block;color:var(--muted);margin-top:4px}.hash{font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#94a9b9}" +
      "@media(max-width:700px){.sourceWatchToolbar{align-items:flex-start}.sourceWatchActions{min-width:160px}}";
    document.head.appendChild(style);
  }

  function ensureHistoryDialog() {
    let dialog = document.getElementById("sourceHistoryDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "sourceHistoryDialog";
    dialog.className = "sourceHistoryDialog";
    dialog.innerHTML = '<div class="sourceHistoryBody" id="sourceHistoryBody"></div>';
    document.body.appendChild(dialog);
    return dialog;
  }

  function installSection() {
    const signals = document.getElementById("signals");
    if (!signals || document.getElementById("source-watch")) return;

    const section = document.createElement("section");
    section.id = "source-watch";
    section.innerHTML =
      '<div class="sectionHeader"><div><h2>Source Watch <span class="count" id="sourceWatchChangeCount">0</span></h2><p>Monitor billing, operator and regulator sources for meaningful page changes.</p></div><span class="watchMode local" id="watchMode">Local fallback</span></div>' +
      '<div class="sourceWatchToolbar">' +
        '<p id="sourceWatchDescription">A detected change only means the source page fingerprint changed. It must still be reviewed before becoming market intelligence.</p>' +
        '<div class="sourceWatchActions"><span class="watchProgress" id="watchProgress"></span><button class="btn ghost" id="resetWatch" type="button">Reset local baselines</button><button class="btn primary" id="checkAllSources" type="button">Check all sources</button></div>' +
      '</div>' +
      '<div class="card tableWrap sourceWatchCard"><table><thead><tr><th>Market</th><th>Source</th><th>Type</th><th>Last check</th><th>Status</th><th></th></tr></thead><tbody id="sourceWatchRows"><tr><td colspan="6">Loading sources…</td></tr></tbody></table></div>';

    signals.insertAdjacentElement("afterend", section);

    const nav = document.querySelector(".sidebar .nav");
    if (nav && ![...nav.querySelectorAll("a")].some(a => a.getAttribute("href") === "#source-watch")) {
      const link = document.createElement("a");
      link.href = "#source-watch";
      link.textContent = "Source Watch";
      const workflow = [...nav.children].find(el => el.getAttribute && el.getAttribute("href") === "#workflow");
      nav.insertBefore(link, workflow || null);
    }

    document.getElementById("checkAllSources").addEventListener("click", checkAll);
    document.getElementById("resetWatch").addEventListener("click", () => {
      if (centralMode) {
        alert("Central D1 baselines are reviewed individually. Local reset is disabled while D1 Source Watch is active.");
        return;
      }
      if (!confirm("Reset all local Source Watch baselines on this device?")) return;
      localState = {};
      saveLocalState();
      render();
    });

    ensureHistoryDialog();
  }

  function centralRow(id) {
    return centralState[id] || null;
  }

  function rowStatus(source) {
    if (centralMode) {
      const row = centralRow(source.id);
      if (!row) return { cls: "", label: "Unchecked" };
      if (Number(row.changed) === 1) return { cls: "changed", label: "Change pending" };
      if (/bot challenge/i.test(String(row.last_error || ""))) return { cls: "error", label: "Bot challenge" };
      if (Number(row.last_http_status) === 429) return { cls: "error", label: "Rate limited" };
      if (row.last_error) return { cls: "error", label: "Check failed" };
      if (row.last_hash && row.baseline_hash) return { cls: "same", label: "No change" };
      return { cls: "baseline", label: "Baseline pending" };
    }

    const saved = localState[source.id];
    if (!saved) return { cls: "", label: "Unchecked" };
    if (saved.changed) return { cls: "changed", label: "Change pending" };
    if (saved.error) return { cls: "error", label: "Check failed" };
    if (saved.baselineOnly) return { cls: "baseline", label: "Baseline saved" };
    return { cls: "same", label: "No change" };
  }

  function rowMeta(source) {
    if (centralMode) {
      const row = centralRow(source.id);
      if (!row) return { when: "—", detail: "" };
      const when = row.checked_at ? new Date(row.checked_at).toLocaleString() : "—";
      const bits = [];
      if (row.last_http_status) bits.push("HTTP " + row.last_http_status);
      if (row.last_duration_ms) bits.push(row.last_duration_ms + "ms");
      if (row.last_title) bits.push(row.last_title);
      if (row.last_error) bits.push(row.last_error);
      return { when, detail: bits.join(" · ") };
    }

    const saved = localState[source.id];
    const when = saved?.checkedAt ? new Date(saved.checkedAt).toLocaleString() : "—";
    const detail = saved?.httpStatus
      ? "HTTP " + saved.httpStatus + (saved.durationMs ? " · " + saved.durationMs + "ms" : "")
      : (saved?.error || "");
    return { when, detail };
  }

  function renderMode() {
    const mode = document.getElementById("watchMode");
    const reset = document.getElementById("resetWatch");
    const description = document.getElementById("sourceWatchDescription");
    if (!mode) return;

    if (centralMode) {
      mode.className = "watchMode central";
      mode.textContent = centralAuthenticated ? "D1 central · authenticated" : "D1 central";
      if (reset) reset.style.display = "none";
      if (description) {
        description.textContent = "D1 keeps one central baseline and history for each source. Changes remain pending until an authenticated review accepts the new baseline.";
      }
    } else {
      mode.className = "watchMode local";
      mode.textContent = "Local fallback";
      if (reset) reset.style.display = "";
    }
  }

  function render() {
    renderMode();
    const root = document.getElementById("sourceWatchRows");
    if (!root) return;

    root.innerHTML = sources.map(source => {
      const status = rowStatus(source);
      const meta = rowMeta(source);
      const central = centralRow(source.id);
      const local = localState[source.id];
      const changed = centralMode ? Number(central?.changed || 0) === 1 : Boolean(local?.changed);

      const accept = changed
        ? '<button class="btn tiny primary acceptBaselineBtn" data-source-id="' + esc(source.id) + '">Accept baseline</button>'
        : '';

      const history = centralMode && central
        ? '<button class="btn tiny historyBtn" data-source-id="' + esc(source.id) + '">History</button>'
        : '';

      return '<tr class="sourceWatchRow ' + (changed ? "changedRow" : "") + '">' +
        '<td><strong>' + esc(marketName(source.marketId)) + '</strong></td>' +
        '<td><strong>' + esc(source.label) + '</strong><span class="sourceWatchMeta">' + esc(meta.detail) + '</span></td>' +
        '<td>' + esc(source.type.replaceAll("_"," ")) + '<span class="sourceWatchMeta">' + esc(cadenceLabel(source.cadenceHours)) + ' · ' + esc(source.priority || "medium") + ' priority</span></td>' +
        '<td>' + esc(meta.when) + '</td>' +
        '<td><span class="watchStatus ' + esc(status.cls) + '">' + esc(status.label) + '</span></td>' +
        '<td><div class="rowActions"><button class="btn tiny checkSourceBtn" data-source-id="' + esc(source.id) + '">Check</button>' + accept + history + '<a class="btn tiny profileLink" href="' + esc(source.url) + '" target="_blank" rel="noreferrer">Open ↗</a></div></td>' +
      '</tr>';
    }).join("") || '<tr><td colspan="6">No monitored sources.</td></tr>';

    const changedCount = sources.filter(source => {
      if (centralMode) return Number(centralRow(source.id)?.changed || 0) === 1;
      return Boolean(localState[source.id]?.changed);
    }).length;

    const count = document.getElementById("sourceWatchChangeCount");
    if (count) {
      count.textContent = changedCount;
      count.style.display = changedCount ? "inline-grid" : "none";
    }

    document.querySelectorAll(".checkSourceBtn").forEach(btn =>
      btn.addEventListener("click", () => checkOne(btn.dataset.sourceId, btn))
    );
    document.querySelectorAll(".acceptBaselineBtn").forEach(btn =>
      btn.addEventListener("click", () => acceptBaseline(btn.dataset.sourceId))
    );
    document.querySelectorAll(".historyBtn").forEach(btn =>
      btn.addEventListener("click", () => showHistory(btn.dataset.sourceId))
    );
  }

  async function refreshCentralState() {
    try {
      const response = await fetch("/api/source-watch/state", { cache: "no-store" });
      if (!response.ok) {
        centralMode = false;
        centralState = {};
        return false;
      }
      const payload = await response.json();
      centralMode = true;
      centralState = Object.fromEntries((payload.state || []).map(row => [row.source_id, row]));
      return true;
    } catch {
      centralMode = false;
      centralState = {};
      return false;
    }
  }

  async function refreshAuthState() {
    try {
      const response = await fetch("/api/workspace/status", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      centralAuthenticated = Boolean(payload.authenticated);
    } catch {
      centralAuthenticated = false;
    }
  }

  async function checkOne(id, button) {
    const source = sources.find(s => s.id === id);
    if (!source) return false;

    const previous = localState[id];
    if (button) {
      button.disabled = true;
      button.textContent = "Checking…";
    }

    try {
      const response = await fetch("/api/check-source?id=" + encodeURIComponent(id), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 401) throw new Error("Cloudflare Access authentication is required.");
        throw new Error(result.detail || result.message || result.error || "Check failed");
      }

      if (result.persisted) {
        await refreshCentralState();
        notifySourceWatchUpdated({ sourceId: id, mode: "single-check" });
      } else {
        const baselineHash = previous?.baselineHash || previous?.hash || null;
        const hadBaseline = Boolean(baselineHash);
        const changed = hadBaseline && baselineHash !== result.hash;
        localState[id] = {
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
        saveLocalState();
      }

      render();
      return true;
    } catch (error) {
      if (!centralMode) {
        localState[id] = {
          ...(previous || {}),
          checkedAt: new Date().toISOString(),
          error: String(error?.message || error),
          changed: previous?.changed || false,
          baselineOnly: previous?.baselineOnly || false
        };
        saveLocalState();
      } else {
        await refreshCentralState();
        render();
      }
      render();
      return false;
    } finally {
      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.textContent = "Check";
      }
    }
  }

  async function acceptBaseline(id) {
    if (centralMode) {
      try {
        const response = await fetch("/api/source-watch/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, action: "accept" })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || "Review failed");
        await refreshCentralState();
        render();
        notifySourceWatchUpdated({ sourceId: id, mode: "baseline-review" });
      } catch (error) {
        alert(String(error?.message || error));
      }
      return;
    }

    const item = localState[id];
    if (!item?.lastHash) return;
    localState[id] = {
      ...item,
      baselineHash: item.lastHash,
      hash: item.lastHash,
      changed: false,
      baselineOnly: false,
      error: null,
      reviewedAt: new Date().toISOString()
    };
    saveLocalState();
    render();
  }

  async function checkAll() {
    const button = document.getElementById("checkAllSources");
    const progress = document.getElementById("watchProgress");
    button.disabled = true;

    try {
      if (centralMode) {
        progress.textContent = "Running central check…";
        const response = await fetch("/api/source-watch/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || "Central check failed");
        progress.textContent = "Done · " + payload.checked + " checked · " + payload.changed + " changed · " + payload.failed + " failed";
        await refreshCentralState();
        render();
        notifySourceWatchUpdated({ mode: "full-check", summary: payload });
        return;
      }

      let done = 0;
      progress.textContent = "0/" + sources.length;
      for (const source of sources) {
        await checkOne(source.id);
        done += 1;
        progress.textContent = done + "/" + sources.length;
      }
      progress.textContent = "Done · " + done + " checked";
    } catch (error) {
      progress.textContent = "Check failed";
      alert(String(error?.message || error));
    } finally {
      button.disabled = false;
    }
  }

  async function showHistory(id) {
    const dialog = ensureHistoryDialog();
    const body = document.getElementById("sourceHistoryBody");
    const source = sources.find(s => s.id === id);
    body.innerHTML = '<div class="eyebrow">Source history</div><h3>' + esc(source?.label || id) + '</h3><p class="lede">Loading…</p>';
    dialog.showModal();

    try {
      const response = await fetch("/api/source-watch/history?id=" + encodeURIComponent(id), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "History unavailable");

      const historyItems = (payload.history || []).map(item => {
        const state = item.error ? "Check failed" : Number(item.changed) ? "Changed vs baseline" : "No change";
        return '<div class="sourceHistoryItem"><strong>' + esc(state) + '</strong><small>' +
          esc(new Date(item.checked_at).toLocaleString()) +
          (item.http_status ? ' · HTTP ' + esc(item.http_status) : '') +
          (item.actor ? ' · ' + esc(item.actor) : '') +
          '</small>' +
          (item.title ? '<small>' + esc(item.title) + '</small>' : '') +
          (item.error ? '<small>' + esc(item.error) + '</small>' : '') +
          (item.content_hash ? '<div class="hash">' + esc(String(item.content_hash).slice(0,20)) + '…</div>' : '') +
        '</div>';
      }).join("");

      body.innerHTML =
        '<div class="row between"><div><div class="eyebrow">Source history</div><h3>' + esc(source?.label || id) + '</h3></div><button class="btn tiny" id="closeSourceHistory">Close</button></div>' +
        '<div class="sourceHistoryList">' +
        (historyItems || '<div class="empty">No history yet.</div>') +
        '</div>';
      document.getElementById("closeSourceHistory").onclick = () => dialog.close();
    } catch (error) {
      body.innerHTML = '<div class="eyebrow">Source history</div><h3>' + esc(source?.label || id) + '</h3><p class="lede">' + esc(error.message) + '</p><button class="btn" onclick="this.closest(\'dialog\').close()">Close</button>';
    }
  }

  async function loadSources() {
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.sources)) throw new Error("Sources API unavailable");
      sources = payload.sources;
      await Promise.all([refreshCentralState(), refreshAuthState()]);
      render();
    } catch {
      const root = document.getElementById("sourceWatchRows");
      if (root) {
        root.innerHTML = '<tr><td colspan="6">Source Watch API is not available yet. The latest Cloudflare deployment may still be in progress.</td></tr>';
      }
    }
  }

  function init() {
    installStyles();
    installSection();
    loadSources();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();