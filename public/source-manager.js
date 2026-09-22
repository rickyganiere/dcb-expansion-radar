(() => {
  let cachedSources = [];
  let editingId = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function cadenceLabel(hours) {
    const value = Number(hours || 24);
    if (value === 12) return "Every 12h";
    if (value === 24) return "Daily";
    if (value === 72) return "Every 3 days";
    if (value === 168) return "Weekly";
    return "Every " + value + "h";
  }

  function typeLabel(type) {
    return String(type || "").replaceAll("_", " ");
  }

  function marketOptions(selected = "") {
    return (window.RADAR_DATA?.markets || []).map(m =>
      '<option value="' + esc(m.id) + '"' + (m.id === selected ? " selected" : "") + ">" +
      esc(m.name) + "</option>"
    ).join("");
  }

  function installStyles() {
    if (document.getElementById("sourceManagerStyles")) return;
    const style = document.createElement("style");
    style.id = "sourceManagerStyles";
    style.textContent =
      ".sourceManagerDialog{width:min(1040px,95vw);max-height:90vh}.sourceManagerBody{padding:22px}.sourceManagerTop{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.sourceManagerTop h2{margin:5px 0}.sourceManagerTop p{color:var(--muted);font-size:11px;line-height:1.55;margin:0}.sourceManagerCounts{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.sourceManagerCount{font-size:10px;padding:6px 8px;border:1px solid #29455a;border-radius:999px;color:#b9c8d5}.sourceManagerForm{display:grid;grid-template-columns:1.1fr 1.5fr 2.2fr 1.2fr 1fr 1fr;gap:8px;align-items:end;padding:13px;margin:12px 0}.sourceManagerForm label{display:grid;gap:5px;color:var(--muted);font-size:9px}.sourceManagerForm .input{width:100%;min-width:0}.sourceManagerFormActions{display:flex;gap:7px;grid-column:1/-1}.sourceManagerList{display:grid;gap:8px;margin-top:12px}.sourceManagerRow{display:grid;grid-template-columns:minmax(160px,1.6fr) minmax(120px,.8fr) minmax(110px,.7fr) minmax(90px,.6fr) auto;gap:10px;align-items:center;padding:12px}.sourceManagerRow.disabled{opacity:.58}.sourceManagerName strong{display:block;font-size:12px}.sourceManagerName small{display:block;color:var(--muted);font-size:9px;margin-top:4px;word-break:break-all}.sourceManagerMeta{font-size:10px;color:#c7d5df}.sourceOrigin{display:inline-flex;padding:4px 7px;border:1px solid #29455a;border-radius:999px;font-size:9px;text-transform:uppercase}.sourceOrigin.core{color:#8db5ff}.sourceOrigin.manual,.sourceOrigin.imported{color:#81efd3}.sourceManagerError{color:#ffb2b2;font-size:10px;margin-top:8px}.sourceManagerHint{color:var(--muted);font-size:9px;margin-top:5px}@media(max-width:900px){.sourceManagerForm{grid-template-columns:repeat(2,1fr)}.sourceManagerRow{grid-template-columns:1fr 1fr}.sourceManagerRow .rowActions{grid-column:1/-1}}@media(max-width:620px){.sourceManagerForm{grid-template-columns:1fr}.sourceManagerRow{grid-template-columns:1fr}.sourceManagerTop{display:block}.sourceManagerTop .btn{margin-top:10px}}";
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = document.getElementById("sourceManagerDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "sourceManagerDialog";
    dialog.className = "sourceManagerDialog";
    dialog.innerHTML = '<div class="sourceManagerBody" id="sourceManagerBody"></div>';
    document.body.appendChild(dialog);

    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  }

  function installButton() {
    const actions = document.querySelector(".sourceWatchActions");
    if (!actions || document.getElementById("openSourceManager")) return;

    const button = document.createElement("button");
    button.id = "openSourceManager";
    button.type = "button";
    button.className = "btn ghost";
    button.textContent = "Manage sources";
    button.addEventListener("click", open);
    actions.insertBefore(button, document.getElementById("checkAllSources") || null);
  }

  function emptyForm() {
    return {
      marketId: window.RADAR_DATA?.markets?.[0]?.id || "",
      label: "",
      url: "",
      type: "billing_route",
      cadenceHours: 24,
      priority: "medium"
    };
  }

  function formHtml(source = null) {
    const value = source || emptyForm();
    return '<div class="card sourceManagerForm">' +
      '<label>Market<select class="input" id="sourceMarket">' + marketOptions(value.marketId) + '</select></label>' +
      '<label>Label<input class="input" id="sourceLabel" maxlength="160" value="' + esc(value.label || "") + '" placeholder="Official operator / regulator source"></label>' +
      '<label>HTTPS URL<input class="input" id="sourceUrl" type="url" value="' + esc(value.url || "") + '" placeholder="https://example.com/page"></label>' +
      '<label>Type<select class="input" id="sourceType">' +
        ["billing_route","market_update","corporate_change","partner_update","operator_update"].map(type =>
          '<option value="' + esc(type) + '"' + (type === value.type ? " selected" : "") + ">" + esc(typeLabel(type)) + "</option>"
        ).join("") +
      '</select></label>' +
      '<label>Cadence<select class="input" id="sourceCadence">' +
        [12,24,72,168].map(hours =>
          '<option value="' + hours + '"' + (Number(value.cadenceHours) === hours ? " selected" : "") + ">" + esc(cadenceLabel(hours)) + "</option>"
        ).join("") +
      '</select></label>' +
      '<label>Priority<select class="input" id="sourcePriority">' +
        ["high","medium","low"].map(priority =>
          '<option value="' + priority + '"' + (priority === value.priority ? " selected" : "") + ">" + priority + "</option>"
        ).join("") +
      '</select></label>' +
      '<div class="sourceManagerFormActions">' +
        '<button class="btn primary" id="saveManagedSource" type="button">' + (source ? "Save source" : "Add source") + '</button>' +
        (source ? '<button class="btn ghost" id="cancelSourceEdit" type="button">Cancel edit</button>' : '') +
      '</div>' +
      '<div class="sourceManagerHint">Only public HTTPS pages are accepted. New sources feed Source Watch and Discovery Inbox; they never become verified intelligence automatically.</div>' +
      '<div class="sourceManagerError" id="sourceManagerError"></div>' +
    '</div>';
  }

  function sourceRow(source) {
    const origin = source.origin || "core";
    const actions = source.editable
      ? '<div class="rowActions">' +
          '<button class="btn tiny editManagedSource" data-id="' + esc(source.id) + '">Edit</button>' +
          '<button class="btn tiny toggleManagedSource" data-id="' + esc(source.id) + '" data-enabled="' + (source.enabled ? "0" : "1") + '">' +
            (source.enabled ? "Disable" : "Enable") +
          '</button>' +
        '</div>'
      : '<div class="rowActions"><span class="sourceManagerHint">Protected core source</span></div>';

    return '<div class="card sourceManagerRow ' + (!source.enabled ? "disabled" : "") + '">' +
      '<div class="sourceManagerName"><strong>' + esc(source.label) + '</strong><small>' + esc(source.url) + '</small></div>' +
      '<div class="sourceManagerMeta"><strong>' + esc(source.marketId) + '</strong><br>' + esc(typeLabel(source.type)) + '</div>' +
      '<div class="sourceManagerMeta">' + esc(cadenceLabel(source.cadenceHours)) + '<br>' + esc(source.priority || "medium") + ' priority</div>' +
      '<div><span class="sourceOrigin ' + esc(origin) + '">' + esc(origin) + '</span><div class="sourceManagerHint">' + (source.enabled ? "Enabled" : "Disabled") + '</div></div>' +
      actions +
    '</div>';
  }

  function render(payload) {
    const body = document.getElementById("sourceManagerBody");
    if (!body) return;

    cachedSources = payload.sources || [];
    const editing = editingId ? cachedSources.find(source => source.id === editingId) : null;
    if (editingId && !editing) editingId = null;

    body.innerHTML =
      '<div class="sourceManagerTop"><div><div class="eyebrow">Source Manager</div><h2>Monitored sources</h2>' +
      '<p>Core sources are protected. Add D1-managed sources without changing code or deploying the Worker.</p></div>' +
      '<button class="btn ghost" id="closeSourceManager" type="button">Close</button></div>' +
      '<div class="sourceManagerCounts">' +
        '<span class="sourceManagerCount">' + esc(payload.counts?.total || 0) + ' total</span>' +
        '<span class="sourceManagerCount">' + esc(payload.counts?.core || 0) + ' core</span>' +
        '<span class="sourceManagerCount">' + esc(payload.counts?.custom || 0) + ' custom</span>' +
        '<span class="sourceManagerCount">' + esc(payload.counts?.enabled || 0) + ' enabled</span>' +
        '<span class="sourceManagerCount">' + esc(payload.counts?.disabled || 0) + ' disabled</span>' +
      '</div>' +
      formHtml(editing) +
      '<div class="sourceManagerList">' + cachedSources.map(sourceRow).join("") + '</div>';

    document.getElementById("closeSourceManager").onclick = () => ensureDialog().close();
    document.getElementById("saveManagedSource").onclick = save;
    document.getElementById("cancelSourceEdit")?.addEventListener("click", () => {
      editingId = null;
      render(payload);
    });

    body.querySelectorAll(".editManagedSource").forEach(button => {
      button.addEventListener("click", () => {
        editingId = button.dataset.id;
        render(payload);
        document.getElementById("sourceLabel")?.focus();
      });
    });

    body.querySelectorAll(".toggleManagedSource").forEach(button => {
      button.addEventListener("click", () => toggle(button.dataset.id, button.dataset.enabled === "1", button));
    });
  }

  async function request(payload) {
    const response = await fetch("/api/source-manager", {
      method: payload ? "POST" : "GET",
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.message || result.error || "Source Manager request failed");
      error.code = result.error;
      throw error;
    }
    return result;
  }

  function formPayload() {
    return {
      marketId: document.getElementById("sourceMarket")?.value || "",
      label: document.getElementById("sourceLabel")?.value || "",
      url: document.getElementById("sourceUrl")?.value || "",
      type: document.getElementById("sourceType")?.value || "",
      cadenceHours: Number(document.getElementById("sourceCadence")?.value || 24),
      priority: document.getElementById("sourcePriority")?.value || "medium"
    };
  }

  function friendlyError(error) {
    return ({
      duplicate_source_url: "This URL is already monitored.",
      source_url_must_use_https: "Use an HTTPS URL.",
      source_url_host_not_allowed: "That hostname is not allowed.",
      source_url_custom_port_not_allowed: "Custom URL ports are not allowed.",
      invalid_source_market: "Choose a valid market.",
      invalid_source_label: "Add a source label between 3 and 160 characters.",
      invalid_source_type: "Choose a valid source type.",
      invalid_source_cadence: "Choose a supported monitoring cadence.",
      invalid_source_priority: "Choose a valid priority.",
      migration_required: "The Source Manager database migration has not been applied yet."
    })[error.code] || error.message;
  }

  async function save() {
    const button = document.getElementById("saveManagedSource");
    const errorBox = document.getElementById("sourceManagerError");
    if (button) {
      button.disabled = true;
      button.textContent = "Saving…";
    }
    if (errorBox) errorBox.textContent = "";

    try {
      const fields = formPayload();
      const payload = editingId
        ? { action: "update", id: editingId, ...fields }
        : { action: "create", ...fields };

      await request(payload);
      editingId = null;
      await load();
      window.dispatchEvent(new CustomEvent("radar:sources-updated"));
    } catch (error) {
      if (errorBox) errorBox.textContent = friendlyError(error);
      if (button) {
        button.disabled = false;
        button.textContent = editingId ? "Save source" : "Add source";
      }
    }
  }

  async function toggle(id, enabled, button) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Saving…";

    try {
      await request({ action: "toggle", id, enabled });
      await load();
      window.dispatchEvent(new CustomEvent("radar:sources-updated"));
    } catch (error) {
      alert(friendlyError(error));
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function load() {
    const body = document.getElementById("sourceManagerBody");
    if (body) body.innerHTML = '<div class="empty">Loading sources…</div>';

    try {
      const payload = await request();
      render(payload);
    } catch (error) {
      if (body) {
        body.innerHTML =
          '<div class="eyebrow">Source Manager</div><h2>Unable to load sources</h2>' +
          '<p class="sourceManagerError">' + esc(friendlyError(error)) + '</p>' +
          '<button class="btn ghost" id="closeSourceManager" type="button">Close</button>';
        document.getElementById("closeSourceManager")?.addEventListener("click", () => ensureDialog().close());
      }
    }
  }

  function open() {
    const dialog = ensureDialog();
    dialog.showModal();
    load();
  }

  function init() {
    installStyles();
    ensureDialog();
    installButton();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
