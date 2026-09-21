(() => {
  const KEYS = {
    shortlist: "dcb_shortlist",
    compare: "dcb_compare",
    pipeline: "dcb_pipeline",
    notes: "dcb_market_notes_v1",
    sourceWatch: "dcb_source_watch_v1"
  };

  let currentVersion = null;
  let autoSync = false;
  let syncing = false;
  let lastSyncedSnapshot = null;
  let intervalId = null;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function localWorkspace() {
    return {
      schemaVersion: 1,
      shortlist: Array.isArray(readJson(KEYS.shortlist, [])) ? readJson(KEYS.shortlist, []) : [],
      compare: Array.isArray(readJson(KEYS.compare, [])) ? readJson(KEYS.compare, []) : [],
      pipeline: readJson(KEYS.pipeline, {}) || {},
      notes: readJson(KEYS.notes, {}) || {},
      sourceWatch: readJson(KEYS.sourceWatch, {}) || {}
    };
  }

  function normalize(workspace) {
    const w = workspace && typeof workspace === "object" ? workspace : {};
    return {
      schemaVersion: 1,
      shortlist: Array.isArray(w.shortlist) ? w.shortlist : [],
      compare: Array.isArray(w.compare) ? w.compare : [],
      pipeline: w.pipeline && typeof w.pipeline === "object" && !Array.isArray(w.pipeline) ? w.pipeline : {},
      notes: w.notes && typeof w.notes === "object" && !Array.isArray(w.notes) ? w.notes : {},
      sourceWatch: w.sourceWatch && typeof w.sourceWatch === "object" && !Array.isArray(w.sourceWatch) ? w.sourceWatch : {}
    };
  }

  function applyWorkspace(workspace) {
    const w = normalize(workspace);
    localStorage.setItem(KEYS.shortlist, JSON.stringify(w.shortlist));
    localStorage.setItem(KEYS.compare, JSON.stringify(w.compare));
    localStorage.setItem(KEYS.pipeline, JSON.stringify(w.pipeline));
    localStorage.setItem(KEYS.notes, JSON.stringify(w.notes));
    localStorage.setItem(KEYS.sourceWatch, JSON.stringify(w.sourceWatch));
  }

  function stableString(workspace) {
    return JSON.stringify(normalize(workspace));
  }

  function isEmpty(workspace) {
    const w = normalize(workspace);
    return !w.shortlist.length &&
      !w.compare.length &&
      !Object.keys(w.pipeline).length &&
      !Object.keys(w.notes).length &&
      !Object.keys(w.sourceWatch).length;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || "Workspace request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function toast(message) {
    let el = document.getElementById("d1SyncToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "d1SyncToast";
      el.className = "d1SyncToast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__d1SyncToast);
    window.__d1SyncToast = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function installStyles() {
    if (document.getElementById("d1SyncStyles")) return;
    const style = document.createElement("style");
    style.id = "d1SyncStyles";
    style.textContent =
      ".d1SyncPanel{margin-top:14px;padding:16px}.d1SyncPanel h3{margin:5px 0 4px}.d1SyncPanel p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.d1SyncActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.d1SyncState{margin-top:9px;color:var(--muted);font-size:10px}.d1SyncState.ok{color:#81efd3}.d1SyncState.warn{color:var(--warn)}.d1SyncToast{position:fixed;right:20px;bottom:20px;z-index:130;background:#102f2a;color:#8cf0d6;border:1px solid #2f6b60;border-radius:10px;padding:10px 13px;font-size:12px;opacity:0;transform:translateY(10px);pointer-events:none;transition:.16s}.d1SyncToast.show{opacity:1;transform:translateY(0)}";
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const workflow = document.getElementById("workflow");
    if (!workflow) return null;
    let panel = document.getElementById("d1SyncPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "d1SyncPanel";
      panel.className = "card d1SyncPanel";
      workflow.appendChild(panel);
    }
    return panel;
  }

  function renderPending(panel) {
    panel.innerHTML =
      '<div class="eyebrow">Cloud workspace · D1</div>' +
      '<h3>Local mode active</h3>' +
      '<p>The app is ready for Cloudflare D1. Your current workspace still stays safely on this device until the database binding is added.</p>' +
      '<div class="d1SyncState">D1 binding pending</div>';
  }

  function renderAccessRequired(panel) {
    panel.innerHTML =
      '<div class="eyebrow">Cloud workspace · D1</div>' +
      '<h3>Database connected</h3>' +
      '<p>D1 is available. Cloudflare Access must authenticate this browser before personal workspace data can be stored.</p>' +
      '<div class="d1SyncState warn">Access authentication required</div>';
  }

  function renderReady(panel, user, updatedAt) {
    panel.innerHTML =
      '<div class="eyebrow">Cloud workspace · D1</div>' +
      '<h3>Synced workspace</h3>' +
      '<p>' + escapeHtml(user || "Authenticated user") + '</p>' +
      '<div class="d1SyncActions">' +
        '<button class="btn primary" id="d1SaveNow" type="button">Save local to cloud</button>' +
        '<button class="btn ghost" id="d1Restore" type="button">Restore cloud to this device</button>' +
      '</div>' +
      '<div class="d1SyncState ok" id="d1SyncState">' +
        (updatedAt ? 'Last cloud update ' + escapeHtml(new Date(updatedAt).toLocaleString()) : 'Cloud workspace ready') +
      '</div>';

    document.getElementById("d1SaveNow").onclick = () => saveLocal(true);
    document.getElementById("d1Restore").onclick = () => restoreCloud(true);
  }

  function renderConflict(panel, user, cloudUpdatedAt) {
    autoSync = false;
    panel.innerHTML =
      '<div class="eyebrow">Cloud workspace · D1</div>' +
      '<h3>Choose which workspace to keep</h3>' +
      '<p>There is data both on this device and in D1, and they are different. Nothing will be overwritten automatically.</p>' +
      '<div class="d1SyncActions">' +
        '<button class="btn primary" id="d1KeepLocal" type="button">Keep this device</button>' +
        '<button class="btn ghost" id="d1KeepCloud" type="button">Use cloud workspace</button>' +
      '</div>' +
      '<div class="d1SyncState warn">' +
        escapeHtml(user || "") +
        (cloudUpdatedAt ? ' · cloud updated ' + escapeHtml(new Date(cloudUpdatedAt).toLocaleString()) : '') +
      '</div>';

    document.getElementById("d1KeepLocal").onclick = () => saveLocal(true);
    document.getElementById("d1KeepCloud").onclick = () => restoreCloud(true);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  async function fetchCloud() {
    return api("/api/workspace", { method: "GET" });
  }

  async function saveLocal(force = false) {
    if (syncing) return;
    syncing = true;
    const stateEl = document.getElementById("d1SyncState");
    if (stateEl) stateEl.textContent = "Saving…";

    try {
      if (force && currentVersion == null) {
        const latest = await fetchCloud();
        currentVersion = latest.version;
      }

      const workspace = localWorkspace();
      const result = await api("/api/workspace", {
        method: "PUT",
        body: JSON.stringify({
          workspace,
          expectedVersion: currentVersion == null ? 0 : currentVersion
        })
      });

      currentVersion = result.version;
      lastSyncedSnapshot = stableString(workspace);
      autoSync = true;
      const panel = ensurePanel();
      renderReady(panel, result.user, result.updatedAt);
      toast("Workspace saved to D1");
    } catch (error) {
      if (error.status === 409) {
        currentVersion = Number(error.payload?.currentVersion || 0);
        autoSync = false;
        const latest = await fetchCloud().catch(() => null);
        renderConflict(ensurePanel(), latest?.user, latest?.updatedAt);
        toast("Cloud workspace changed on another device");
      } else {
        if (stateEl) stateEl.textContent = "Cloud save failed";
        console.error(error);
      }
    } finally {
      syncing = false;
    }
  }

  async function restoreCloud(reload = false) {
    if (syncing) return;
    syncing = true;
    try {
      const cloud = await fetchCloud();
      currentVersion = cloud.version;
      applyWorkspace(cloud.workspace);
      lastSyncedSnapshot = stableString(cloud.workspace);
      autoSync = true;
      renderReady(ensurePanel(), cloud.user, cloud.updatedAt);
      toast("Cloud workspace restored");
      if (reload) setTimeout(() => location.reload(), 300);
    } catch (error) {
      console.error(error);
    } finally {
      syncing = false;
    }
  }

  async function bootstrap() {
    installStyles();
    const panel = ensurePanel();
    if (!panel) return;

    let status;
    try {
      status = await api("/api/workspace/status", { method: "GET" });
    } catch {
      renderPending(panel);
      return;
    }

    if (status.database !== "d1") {
      renderPending(panel);
      return;
    }

    if (!status.authenticated) {
      renderAccessRequired(panel);
      return;
    }

    let cloud;
    try {
      cloud = await fetchCloud();
    } catch (error) {
      if (error.status === 401) renderAccessRequired(panel);
      else renderPending(panel);
      return;
    }

    currentVersion = cloud.version;
    const local = localWorkspace();
    const cloudWorkspace = normalize(cloud.workspace);

    if (!cloud.exists) {
      lastSyncedSnapshot = null;
      await saveLocal(false);
      return;
    }

    if (isEmpty(local) && !isEmpty(cloudWorkspace)) {
      applyWorkspace(cloudWorkspace);
      lastSyncedSnapshot = stableString(cloudWorkspace);
      autoSync = true;
      renderReady(panel, cloud.user, cloud.updatedAt);
      setTimeout(() => location.reload(), 300);
      return;
    }

    if (stableString(local) === stableString(cloudWorkspace)) {
      lastSyncedSnapshot = stableString(local);
      autoSync = true;
      renderReady(panel, cloud.user, cloud.updatedAt);
    } else {
      renderConflict(panel, cloud.user, cloud.updatedAt);
    }

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(async () => {
      if (!autoSync || syncing) return;
      const current = stableString(localWorkspace());
      if (current !== lastSyncedSnapshot) await saveLocal(false);
    }, 15000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", bootstrap)
    : bootstrap();
})();