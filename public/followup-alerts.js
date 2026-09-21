(() => {
  const PIPELINE_KEY = "dcb_pipeline";

  function loadPipeline() {
    try { return JSON.parse(localStorage.getItem(PIPELINE_KEY) || "{}"); }
    catch { return {}; }
  }

  function dayKey(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function dueItems() {
    const today = todayKey();
    return Object.values(loadPipeline()).filter(item => {
      if (!item?.nextFollowUp || item.status === "Closed") return false;
      const key = dayKey(item.nextFollowUp);
      return key && key <= today;
    }).sort((a,b) => String(a.nextFollowUp).localeCompare(String(b.nextFollowUp)));
  }

  function installStyles() {
    if (document.getElementById("followupStyles")) return;
    const style = document.createElement("style");
    style.id = "followupStyles";
    style.textContent =
      ".followupAlert{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:14px 0 4px;padding:13px 15px;border-color:#6a4f2b;background:linear-gradient(180deg,rgba(61,43,20,.95),rgba(34,28,18,.95))}" +
      ".followupAlert strong{display:block;color:#ffd58b}.followupAlert p{margin:3px 0 0;color:#d7c7aa;font-size:11px}.followupDueBadge{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#6a2d2d;color:#ffd2d2;font-size:10px;margin-left:6px}" +
      "@media(max-width:700px){.followupAlert{align-items:flex-start}.followupAlert .btn{white-space:nowrap}}";
    document.head.appendChild(style);
  }

  function render() {
    const items = dueItems();
    let alert = document.getElementById("followupAlert");
    const pipelineBtn = document.getElementById("openPipeline");

    let badge = document.getElementById("followupDueBadge");
    if (items.length && pipelineBtn) {
      if (!badge) {
        badge = document.createElement("span");
        badge.id = "followupDueBadge";
        badge.className = "followupDueBadge";
        pipelineBtn.appendChild(badge);
      }
      badge.textContent = items.length;
      badge.title = items.length + " follow-up(s) due";
    } else if (badge) badge.remove();

    if (!items.length) {
      if (alert) alert.remove();
      return;
    }

    if (!alert) {
      alert = document.createElement("div");
      alert.id = "followupAlert";
      alert.className = "card followupAlert";
      const kpis = document.querySelector(".kpis");
      if (kpis) kpis.insertAdjacentElement("afterend", alert);
    }

    const overdue = items.filter(item => dayKey(item.nextFollowUp) < todayKey()).length;
    const today = items.length - overdue;
    const summary = [
      overdue ? overdue + " overdue" : "",
      today ? today + " due today" : ""
    ].filter(Boolean).join(" · ");

    alert.innerHTML =
      '<div><strong>' + items.length + ' follow-up' + (items.length===1?'':'s') + ' need attention</strong>' +
      '<p>' + summary + '. Open the pipeline to update status, notes or next follow-up date.</p></div>' +
      '<button class="btn primary" id="openDuePipeline" type="button">Open pipeline</button>';

    document.getElementById("openDuePipeline")?.addEventListener("click", () => {
      document.getElementById("openPipeline")?.click();
    });
  }

  function init() {
    installStyles();
    render();
    document.addEventListener("change", e => {
      if (e.target.closest(".pipelineTable")) setTimeout(render, 50);
    });
    document.addEventListener("click", e => {
      if (e.target.closest(".pipelineTable") || e.target.closest("[data-pipeline-contact]") || e.target.closest("[data-pipeline-company]")) {
        setTimeout(render, 80);
      }
    });
    window.addEventListener("storage", render);
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();