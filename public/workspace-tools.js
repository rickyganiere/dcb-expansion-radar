(() => {
  const STORAGE_KEYS = ["dcb_compare", "dcb_shortlist", "dcb_pipeline", "dcb_source_watch_v1", "dcb_market_notes_v1"];

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toast(message) {
    let el = document.getElementById("workspaceToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "workspaceToast";
      el.className = "workspaceToast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__workspaceToast);
    window.__workspaceToast = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function exportWorkspace() {
    const payload = {
      product: "DCB Expansion Radar",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {}
    };
    for (const key of STORAGE_KEYS) {
      const objectKey = key === "dcb_pipeline" || key === "dcb_source_watch_v1" || key === "dcb_market_notes_v1";
      try { payload.data[key] = JSON.parse(localStorage.getItem(key) || (objectKey ? "{}" : "[]")); }
      catch { payload.data[key] = objectKey ? {} : []; }
    }
    download("dcb-expansion-radar-workspace.json", JSON.stringify(payload, null, 2));
    toast("Workspace backup exported");
  }

  function importWorkspace(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (!payload || payload.product !== "DCB Expansion Radar" || !payload.data) throw new Error("Invalid backup");
        const compare = payload.data.dcb_compare;
        const shortlist = payload.data.dcb_shortlist;
        const pipeline = payload.data.dcb_pipeline;
        if (!Array.isArray(compare) || !Array.isArray(shortlist) || !pipeline || typeof pipeline !== "object" || Array.isArray(pipeline)) {
          throw new Error("Invalid workspace structure");
        }
        localStorage.setItem("dcb_compare", JSON.stringify(compare));
        localStorage.setItem("dcb_shortlist", JSON.stringify(shortlist));
        localStorage.setItem("dcb_pipeline", JSON.stringify(pipeline));
        const sourceWatch = payload.data.dcb_source_watch_v1;
        const marketNotes = payload.data.dcb_market_notes_v1;
        if (sourceWatch && typeof sourceWatch === "object" && !Array.isArray(sourceWatch)) {
          localStorage.setItem("dcb_source_watch_v1", JSON.stringify(sourceWatch));
        }
        if (marketNotes && typeof marketNotes === "object" && !Array.isArray(marketNotes)) {
          localStorage.setItem("dcb_market_notes_v1", JSON.stringify(marketNotes));
        }
        toast("Workspace restored");
        setTimeout(() => location.reload(), 450);
      } catch (err) {
        alert("This file is not a valid DCB Expansion Radar workspace backup.");
      }
    };
    reader.readAsText(file);
  }

  function clearWorkspace() {
    if (!confirm("Clear shortlist, comparison selections and pipeline saved on this device?")) return;
    for (const key of STORAGE_KEYS) localStorage.removeItem(key);
    toast("Local workspace cleared");
    setTimeout(() => location.reload(), 350);
  }

  function installWorkspaceTools() {
    const workflow = document.getElementById("workflow");
    if (!workflow || document.getElementById("workspaceTools")) return;

    const panel = document.createElement("div");
    panel.id = "workspaceTools";
    panel.className = "card workspaceTools";
    panel.innerHTML =
      '<div><div class="eyebrow">Local workspace safety</div><h3>Local backup & restore</h3>' +
      '<p>Shortlist, compare selections, pipeline, market notes and Source Watch baselines stay available locally even when D1 sync is enabled. Export a manual backup anytime.</p></div>' +
      '<div class="workspaceActions">' +
      '<button class="btn primary" id="exportWorkspace" type="button">Export workspace</button>' +
      '<button class="btn ghost" id="importWorkspaceBtn" type="button">Restore backup</button>' +
      '<button class="btn ghost" id="clearWorkspace" type="button">Clear local data</button>' +
      '<input id="importWorkspaceFile" type="file" accept="application/json,.json" hidden>' +
      '</div>';
    workflow.appendChild(panel);

    document.getElementById("exportWorkspace").addEventListener("click", exportWorkspace);
    document.getElementById("importWorkspaceBtn").addEventListener("click", () => document.getElementById("importWorkspaceFile").click());
    document.getElementById("importWorkspaceFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (file) importWorkspace(file);
      e.target.value = "";
    });
    document.getElementById("clearWorkspace").addEventListener("click", clearWorkspace);
  }

  function marketHash(id) {
    return "#market=" + encodeURIComponent(id);
  }

  function currentMarketId() {
    const match = location.hash.match(/^#market=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function openHashTarget() {
    const id = currentMarketId();
    if (id) {
      const button = document.querySelector('[data-open="' + CSS.escape(id) + '"]');
      if (button) {
        button.click();
        return;
      }
    }
    if (location.hash === "#pipeline") {
      document.getElementById("openPipeline")?.click();
    }
  }

  function installDeepLinks() {
    document.addEventListener("click", e => {
      const open = e.target.closest("[data-open]");
      if (open && open.dataset.open) {
        history.replaceState(null, "", marketHash(open.dataset.open));
      }
    }, true);

    const modal = document.getElementById("modal");
    if (modal) {
      modal.addEventListener("close", () => {
        if (currentMarketId()) history.replaceState(null, "", location.pathname + location.search + "#markets");
      });
    }

    window.addEventListener("hashchange", openHashTarget);
    setTimeout(openHashTarget, 120);
  }

  function installShareButton() {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modalBody");
    if (!modal || !body) return;

    const observer = new MutationObserver(() => {
      if (!modal.open) return;
      const hero = body.querySelector(".modalHero");
      if (!hero || hero.querySelector(".shareMarketBtn")) return;
      const id = currentMarketId();
      if (!id) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost shareMarketBtn";
      btn.textContent = "Copy market link";
      btn.addEventListener("click", async () => {
        const url = location.origin + location.pathname + marketHash(id);
        try {
          await navigator.clipboard.writeText(url);
          toast("Market link copied");
        } catch {
          prompt("Copy this link:", url);
        }
      });
      hero.appendChild(btn);
    });
    observer.observe(body, { childList: true, subtree: true });
  }

  function installStyles() {
    if (document.getElementById("workspaceToolsStyle")) return;
    const style = document.createElement("style");
    style.id = "workspaceToolsStyle";
    style.textContent =
      ".workspaceTools{margin-top:14px;padding:16px;display:flex;justify-content:space-between;gap:18px;align-items:center}" +
      ".workspaceTools h3{margin:5px 0 4px}.workspaceTools p{margin:0;color:var(--muted);font-size:11px;line-height:1.5;max-width:680px}" +
      ".workspaceActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.shareMarketBtn{align-self:flex-start;white-space:nowrap}" +
      ".workspaceToast{position:fixed;right:20px;bottom:20px;z-index:100;background:#102f2a;color:#8cf0d6;border:1px solid #2f6b60;border-radius:10px;padding:10px 13px;font-size:12px;opacity:0;transform:translateY(10px);pointer-events:none;transition:.16s}.workspaceToast.show{opacity:1;transform:translateY(0)}" +
      "@media(max-width:700px){.workspaceTools{display:block}.workspaceActions{justify-content:flex-start;margin-top:12px}.shareMarketBtn{grid-column:1/-1}}";
    document.head.appendChild(style);
  }

  function init() {
    installStyles();
    installWorkspaceTools();
    installDeepLinks();
    installShareButton();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();