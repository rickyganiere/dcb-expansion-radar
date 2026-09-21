(() => {
  const data = window.RADAR_DATA || { markets: [] };
  const signals = window.RADAR_SIGNALS || [];
  const partners = window.RADAR_PARTNERS || [];
  const scoreModel = window.RADAR_SCORES || { components: [], markets: {} };
  const liveMarkets = data.markets.filter(m => m.status === "live");
  const state = {
    query: "",
    filter: "all",
    signalFilter: "all",
    compare: new Set(JSON.parse(localStorage.getItem("dcb_compare") || "[]")),
    shortlist: new Set(JSON.parse(localStorage.getItem("dcb_shortlist") || "[]")),
    pipeline: JSON.parse(localStorage.getItem("dcb_pipeline") || "{}")
  };

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function persist() {
    localStorage.setItem("dcb_compare", JSON.stringify([...state.compare]));
    localStorage.setItem("dcb_shortlist", JSON.stringify([...state.shortlist]));
    localStorage.setItem("dcb_pipeline", JSON.stringify(state.pipeline));
  }

  function renderKPIs() {
    const contacts = liveMarkets.reduce((sum,m)=>sum+(m.contacts||[]).length,0);
    const targets = liveMarkets.reduce((sum,m)=>sum+(m.ecosystem||[]).length,0);
    if ($("#kpiMarkets")) $("#kpiMarkets").textContent = data.markets.length;
    if ($("#kpiLive")) $("#kpiLive").textContent = liveMarkets.length;
    if ($("#kpiContacts")) $("#kpiContacts").textContent = contacts;
    if ($("#kpiTargets")) $("#kpiTargets").textContent = targets;
    if ($("#kpiLiveNames")) $("#kpiLiveNames").textContent = liveMarkets.map(m=>m.name).join(" · ");
    if ($("#liveBadge")) $("#liveBadge").textContent = "Operational · "+liveMarkets.length+" evidence-backed markets";
  }

  async function checkApiStatus() {
    const el = $("#apiStatus");
    if (!el) return;
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("API unavailable");
      const health = await response.json();
      const dbOnline = health.backend?.database === "d1";
      el.textContent = dbOnline ? "API + D1 online" : "API online · DB pending";
      el.classList.add("apiOnline");
    } catch {
      el.textContent = "API pending";
      el.classList.add("apiPending");
    }
  }

  function confidenceLabel(c) {
    return c === "verified" ? "Verified" : c === "review" ? "Review" : "Unknown";
  }

  function marketMatches(m) {
    const q = state.query.trim().toLowerCase();
    const hay = [
      m.name, m.code, m.summary, ...(m.tags || []),
      ...(m.operators || []).flatMap(o => [o.name,o.group,o.rail,o.note]),
      ...(m.ecosystem || []).flatMap(e => [e.company,e.role,e.status]),
      ...(m.contacts || []).flatMap(p => [p.name,p.company,p.title,p.location])
    ].join(" ").toLowerCase();
    const qOk = !q || hay.includes(q);
    if (!qOk) return false;
    if (state.filter === "all") return true;
    if (state.filter === "shortlist") return state.shortlist.has(m.id);
    if (state.filter === "verified") return (m.rails || []).some(r => r.confidence === "verified");
    if (state.filter === "app-dcb") return (m.rails || []).some(r => r.type.toLowerCase().includes("app-store"));
    if (state.filter === "operator-billing") return (m.rails || []).some(r => /co-billing|invoice|prepaid|digital-service/i.test(r.type));
    if (state.filter === "ott") return (m.tags || []).some(t => /ott/i.test(t)) || (m.rails || []).some(r => /ott/i.test(r.type));
    return true;
  }

  function renderMarkets() {
    const root = $("#marketGrid");
    if (!root) return;
    const markets = data.markets.filter(marketMatches);
    root.innerHTML = markets.map(m => {
      const live = m.status === "live";
      const score = live ? `${m.score}<small>/100</small>` : "—";
      const scoreWidth = live ? m.score : 0;
      const ops = (m.operators || []).length;
      const rails = (m.rails || []).length;
      const saved = state.shortlist.has(m.id);
      const checked = state.compare.has(m.id);
      return `
      <article class="card market ${live ? "" : "pending"}" data-market="${esc(m.id)}">
        <div class="marketTop">
          <button class="country market-open" data-open="${esc(m.id)}" aria-label="Open ${esc(m.name)} intelligence">
            <div class="flag">${esc(m.code)}</div>
            <div><div class="countryName">${esc(m.name)}</div><div class="region">${live ? "Evidence-backed" : "Queued"}</div></div>
          </button>
          <div class="score">${score}</div>
        </div>
        <div class="progress"><span style="width:${scoreWidth}%"></span></div>
        <div class="meta">
          <div class="metaBox"><strong>${ops || "—"}</strong><span>operators</span></div>
          <div class="metaBox"><strong>${rails || "—"}</strong><span>billing rails</span></div>
          <div class="metaBox"><strong>${live ? (m.ecosystem || []).length : "—"}</strong><span>targets</span></div>
        </div>
        <div class="tags">${(m.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <div class="marketActions">
          <button class="btn ghost shortlist-btn" data-shortlist="${esc(m.id)}">${saved ? "★ Shortlisted" : "☆ Shortlist"}</button>
          <button class="btn ghost compare-btn" data-compare="${esc(m.id)}" ${!live ? "disabled" : ""}>${checked ? "✓ Compare" : "+ Compare"}</button>
          <button class="btn primary market-open" data-open="${esc(m.id)}" ${!live ? "disabled" : ""}>Open intelligence</button>
        </div>
      </article>`;
    }).join("") || `<div class="empty card">No markets match this search/filter.</div>`;
    renderCompareTray();
    renderShortlistCount();
    renderPipelineCount();
  }

  function renderShortlistCount() {
    const el = $("#shortlistCount");
    if (el) el.textContent = state.shortlist.size;
  }

  function renderPipelineCount() {
    const el = $("#pipelineCount");
    if (el) el.textContent = Object.keys(state.pipeline).length;
  }


  function renderCompareTray() {
    const tray = $("#compareTray");
    if (!tray) return;
    const ids = [...state.compare].filter(id => liveMarkets.some(m => m.id === id));
    if (!ids.length) {
      tray.classList.add("hidden");
      tray.innerHTML = "";
      return;
    }
    tray.classList.remove("hidden");
    tray.innerHTML = `
      <div><strong>Compare:</strong> ${ids.map(id => esc(data.markets.find(m=>m.id===id)?.name || id)).join(" · ")}</div>
      <div class="trayActions">
        <button class="btn ghost" id="clearCompare">Clear</button>
        <button class="btn primary" id="openCompare">Compare ${ids.length}</button>
      </div>`;
    $("#clearCompare")?.addEventListener("click", () => { state.compare.clear(); persist(); renderMarkets(); });
    $("#openCompare")?.addEventListener("click", openCompare);
  }

  function openMarket(id) {
    const m = data.markets.find(x => x.id === id);
    if (!m || m.status !== "live") return;
    const modal = $("#modal");
    const body = $("#modalBody");
    body.innerHTML = `
      <div class="modalHero">
        <div><div class="eyebrow">Market intelligence · ${esc(m.code)}</div><h2>${esc(m.name)}</h2><p>${esc(m.summary)}</p></div>
        <div class="scorePanel mini"><span>Expansion score</span><strong>${m.score}<small>/100</small></strong></div>
      </div>
      <div class="modalTabs">
        <button class="tab active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="rails">Billing rails</button>
        <button class="tab" data-tab="score">Score model</button>
        <button class="tab" data-tab="targets">Targets</button>
        <button class="tab" data-tab="outreach">Outreach</button>
      </div>
      <div id="tabContent"></div>`;
    modal.showModal();
    const show = tab => {
      $$(".tab", body).forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      const target = $("#tabContent", body);
      if (tab === "overview") target.innerHTML = renderOverview(m);
      if (tab === "rails") target.innerHTML = renderRails(m);
      if (tab === "score") target.innerHTML = renderScore(m);
      if (tab === "targets") target.innerHTML = renderTargets(m);
      if (tab === "outreach") target.innerHTML = renderOutreach(m);
      bindTabActions(m, tab, target);
    };
    $$(".tab", body).forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
    show("overview");
  }

  function renderOverview(m) {
    return `
      <div class="operatorGrid modalGrid">
        ${m.operators.map(o => `
          <article class="card operatorCard">
            <div class="operatorHead"><div><h3>${esc(o.name)}</h3><span>${esc(o.group)}</span></div><b>${Number.isFinite(o.share) ? o.share+"%" : "—"}</b></div>
            <div class="progress"><span style="width:${Number.isFinite(o.share) ? Math.min(o.share,100) : 0}%"></span></div>
            <span class="confidence ${esc(o.confidence)}">${confidenceLabel(o.confidence)}</span>
            <p><strong>${esc(o.rail)}</strong><br>${esc(o.note)}</p>
          </article>`).join("")}
      </div>
      <div class="sourceStack modalSources">${m.sources.map(s => `<a class="sourceLink" href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)} ↗</a>`).join("")}</div>`;
  }

  function renderRails(m) {
    return `
      <div class="railList">
        ${m.rails.map(r => `
          <article class="card railRow">
            <div><span class="confidence ${esc(r.confidence)}">${confidenceLabel(r.confidence)}</span><h3>${esc(r.type)}</h3><p>${esc(r.provider)}</p></div>
            <div class="railEvidence"><span>Evidence</span><strong>${esc(r.evidence)}</strong></div>
          </article>`).join("")}
      </div>`;
  }

  function renderScore(m) {
    const values = scoreModel.markets?.[m.id] || {};
    const components = scoreModel.components || [];
    const computed = components.length
      ? Math.round(components.reduce((sum, component) => sum + (values[component.key] || 0), 0) / components.length)
      : m.score;
    return `
      <div class="scoreExplain card">
        <strong>Internal opportunity score: ${m.score}/100</strong>
        <p>${esc(scoreModel.methodology || "Internal research score.")}</p>
        <div class="scoreCheck">${computed === m.score ? "✓ Component average matches market score" : "⚠ Score model needs review"}</div>
      </div>
      <div class="scoreComponents">
        ${components.map(component => {
          const value = values[component.key] ?? 0;
          return `<article class="card scoreComponent">
            <div class="scoreComponentTop"><div><h3>${esc(component.label)}</h3><p>${esc(component.description)}</p></div><strong>${value}</strong></div>
            <div class="progress"><span style="width:${value}%"></span></div>
          </article>`;
        }).join("")}
      </div>`;
  }

  function renderTargets(m) {
    return `
      <div class="targetTools">
        <input id="targetSearch" class="input" placeholder="Filter companies, contacts or roles">
        <button class="btn ghost" id="exportTargets">Export CSV</button>
      </div>
      <div class="card tableWrap"><table><thead><tr><th>Company</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody id="targetRows">
        ${m.ecosystem.map(e => targetRow(m,e)).join("")}
      </tbody></table></div>
      <div class="sectionHeader compact"><div><h3>Decision-makers</h3><p>Public professional profiles found for relevant commercial and digital roles.</p></div></div>
      <div class="card tableWrap"><table><thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Location</th><th></th></tr></thead><tbody>
        ${(m.contacts || []).map(p => `<tr data-target-row data-search="${esc((p.name+" "+p.company+" "+p.title+" "+p.location).toLowerCase())}">
          <td><strong>${esc(p.name)}</strong></td>
          <td>${esc(p.company)}</td>
          <td>${esc(p.title)}</td>
          <td>${esc(p.location)}</td>
          <td><div class="rowActions"><button class="btn tiny" data-pipeline-contact="${esc(p.name)}" data-company="${esc(p.company)}" data-title="${esc(p.title)}" data-market-id="${esc(m.id)}">+ Pipeline</button><button class="btn tiny outreach-person" data-person="${esc(p.name)}">Write outreach</button><a class="btn tiny profileLink" href="${esc(p.url)}" target="_blank" rel="noreferrer">Profile ↗</a></div></td>
        </tr>`).join("") || `<tr><td colspan="5">No named decision-makers mapped yet.</td></tr>`}
      </tbody></table></div>`;
  }

  function targetRow(m,e) {
    return `<tr data-target-row data-search="${esc((e.company+" "+e.role+" "+e.status).toLowerCase())}">
      <td><strong>${esc(e.company)}</strong></td><td>${esc(e.role)}</td><td><span class="status">${esc(e.status)}</span></td>
      <td><div class="rowActions"><button class="btn tiny" data-pipeline-company="${esc(e.company)}" data-market-id="${esc(m.id)}" data-role="${esc(e.role)}">+ Pipeline</button><button class="btn tiny outreach-target" data-company="${esc(e.company)}" data-role="${esc(e.role)}">Write outreach</button></div></td>
    </tr>`;
  }

  function renderOutreach(m, company="", role="") {
    const companies = m.ecosystem.map(e => e.company);
    const roles = m.contactRoles || [];
    const people = m.contacts || [];
    return `
      <div class="outreachForm">
        <label>Named contact<select id="outreachPerson" class="input">
          <option value="">Generic / role-based</option>
          ${people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)} — ${esc(p.title)}</option>`).join("")}
        </select></label>
        <label>Target company<select id="outreachCompany" class="input">${companies.map(c=>`<option ${c===company?"selected":""}>${esc(c)}</option>`).join("")}</select></label>
        <label>Target role<select id="outreachRole" class="input">${roles.map(r=>`<option ${r===role?"selected":""}>${esc(r)}</option>`).join("")}</select></label>
        <label>Our offer<select id="outreachOffer" class="input"><option>OTT service expansion</option><option>VAS content partnership</option><option>DCB monetization partnership</option><option>Operator distribution partnership</option></select></label>
        <button class="btn primary" id="generateOutreach">Generate email</button>
      </div>
      <div class="copyBox hidden" id="copyBox"><div class="copyHead"><strong id="emailSubject"></strong><button class="btn ghost" id="copyEmail">Copy</button></div><pre id="emailBody"></pre></div>`;
  }

  function bindTabActions(m, tab, root) {
    if (tab === "targets") {
      $("#targetSearch", root)?.addEventListener("input", e => {
        const q = e.target.value.toLowerCase();
        $$("[data-target-row]", root).forEach(row => row.hidden = !row.dataset.search.includes(q));
      });
      $("#exportTargets", root)?.addEventListener("click", () => exportTargets(m));
      $(".outreach-target", root).forEach(btn => btn.addEventListener("click", () => {
        const body = $("#modalBody");
        const outreachTab = $('.tab[data-tab="outreach"]', body);
        outreachTab.click();
        setTimeout(() => {
          const company = $("#outreachCompany", body);
          if (company) company.value = btn.dataset.company;
        }, 0);
      }));
      $(".outreach-person", root).forEach(btn => btn.addEventListener("click", () => {
        const body = $("#modalBody");
        const outreachTab = $('.tab[data-tab="outreach"]', body);
        outreachTab.click();
        setTimeout(() => {
          const person = $("#outreachPerson", body);
          if (person) {
            person.value = btn.dataset.person;
            person.dispatchEvent(new Event("change"));
          }
        }, 0);
      }));
    }
    if (tab === "outreach") {
      $("#outreachPerson", root)?.addEventListener("change", e => {
        const person = (m.contacts || []).find(p => p.name === e.target.value);
        if (!person) return;
        const company = $("#outreachCompany", root);
        if (company && [...company.options].some(o => o.value === person.company)) company.value = person.company;
      });
      $("#generateOutreach", root)?.addEventListener("click", () => generateOutreach(m, root));
      $("#copyEmail", root)?.addEventListener("click", async () => {
        const text = `Subject: ${$("#emailSubject", root).textContent}\n\n${$("#emailBody", root).textContent}`;
        await navigator.clipboard.writeText(text);
        $("#copyEmail", root).textContent = "Copied ✓";
      });
    }
  }

  function generateOutreach(m, root) {
    const selectedName = $("#outreachPerson", root)?.value || "";
    const person = (m.contacts || []).find(p => p.name === selectedName);
    const company = person?.company || $("#outreachCompany", root).value;
    const role = person?.title || $("#outreachRole", root).value;
    const offer = $("#outreachOffer", root).value;
    const firstName = person ? person.name.split(" ")[0] : "";
    const greeting = firstName ? "Hi "+firstName+"," : "Hi,";
    const subject = `${m.name} partnership opportunity — ${offer}`;
    const body = `${greeting}

I'm reaching out because we're exploring ${offer.toLowerCase()} opportunities in ${m.name}. We are currently mapping operator billing, distribution and content partnerships in the market, and ${company} looks relevant to the expansion path.

Given your role in ${role}, I'd like to understand whether your team is currently open to new OTT/VAS partnerships and what the best commercial route would be.

If relevant, I can send a short overview and we can see if there is a fit.

Best,
Ricky`;
    $("#emailSubject", root).textContent = subject;
    $("#emailBody", root).textContent = body;
    $("#copyBox", root).classList.remove("hidden");
  }

  function exportTargets(m) {
    const rows = [["Company","Role","Status"], ...m.ecosystem.map(e => [e.company,e.role,e.status])];
    const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dcb-radar-${m.id}-targets.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }


  function addPipeline(entry) {
    const key = entry.key;
    state.pipeline[key] = {
      ...entry,
      status: state.pipeline[key]?.status || "New",
      updatedAt: new Date().toISOString()
    };
    persist();
    renderPipelineCount();
  }

  function openPipeline() {
    const entries = Object.values(state.pipeline);
    const stages = ["New","Researching","Contacted","Follow-up","Partnering","Closed"];
    const stageCounts = Object.fromEntries(stages.map(stage => [stage, entries.filter(e => e.status === stage).length]));
    const body = $("#modalBody");
    body.innerHTML = `
      <div class="eyebrow">Commercial workspace</div>
      <h2>Pipeline</h2>
      <p class="lede">Targets saved from market intelligence. Changes stay available locally and sync to your authenticated D1 workspace.</p>
      <div class="pipelineStats">
        ${stages.map(stage => `<div class="pipelineStat"><span>${esc(stage)}</span><strong>${stageCounts[stage]}</strong></div>`).join("")}
      </div>
      <div class="targetTools">
        <button class="btn ghost" id="exportPipeline">Export CSV</button>
      </div>
      <div class="card tableWrap pipelineTable">
        <table>
          <thead><tr><th>Target</th><th>Market</th><th>Status</th><th>Next follow-up</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            ${entries.map(e => `<tr>
              <td><strong>${esc(e.name)}</strong><br><small>${esc(e.company || "")} · ${esc(e.title || e.role || e.type || "")}</small></td>
              <td><button class="btn tiny" data-open="${esc(e.marketId)}">${esc(data.markets.find(m=>m.id===e.marketId)?.name || e.marketId)}</button></td>
              <td>
                <select class="input pipeStatus" data-pipe-key="${esc(e.key)}">
                  ${stages.map(stage => `<option ${stage===e.status?"selected":""}>${stage}</option>`).join("")}
                </select>
              </td>
              <td><input class="input pipeFollowup" data-pipe-key="${esc(e.key)}" type="date" value="${esc(e.nextFollowUp || "")}"></td>
              <td><input class="input pipeNote" data-pipe-key="${esc(e.key)}" placeholder="Add note…" value="${esc(e.notes || "")}"></td>
              <td><button class="btn tiny pipeRemove" data-pipe-key="${esc(e.key)}">Remove</button></td>
            </tr>`).join("") || `<tr><td colspan="6">Nothing in pipeline yet. Add a company or decision-maker from a market.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    $("#modal").showModal();

    const updateField = (el, field) => {
      const key = el.dataset.pipeKey;
      if (!state.pipeline[key]) return;
      state.pipeline[key][field] = el.value;
      state.pipeline[key].updatedAt = new Date().toISOString();
      persist();
    };

    $$(".pipeStatus", body).forEach(el => el.addEventListener("change", () => {
      updateField(el, "status");
      openPipeline();
    }));
    $$(".pipeFollowup", body).forEach(el => el.addEventListener("change", () => updateField(el, "nextFollowUp")));
    $$(".pipeNote", body).forEach(el => el.addEventListener("change", () => updateField(el, "notes")));
    $$(".pipeRemove", body).forEach(btn => btn.addEventListener("click", () => {
      delete state.pipeline[btn.dataset.pipeKey];
      persist();
      renderPipelineCount();
      openPipeline();
    }));
    $("#exportPipeline", body)?.addEventListener("click", exportPipeline);
  }

  function exportPipeline() {
    const entries = Object.values(state.pipeline);
    const rows = [["Target","Market","Company","Title/Role","Status","Next follow-up","Notes"], ...entries.map(e => [
      e.name,
      data.markets.find(m=>m.id===e.marketId)?.name || e.marketId,
      e.company || e.name,
      e.title || e.role || "",
      e.status,
      e.nextFollowUp || "",
      e.notes || ""
    ])];
    const csv = rows.map(r => r.map(v => '"'+String(v ?? "").replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dcb-expansion-radar-pipeline.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openCompare() {
    const ms = [...state.compare].map(id => data.markets.find(m=>m.id===id)).filter(Boolean).slice(0,3);
    if (!ms.length) return;
    const allRailTypes = [...new Set(ms.flatMap(m => (m.rails||[]).map(r=>r.type)))];
    $("#modalBody").innerHTML = `
      <div class="eyebrow">Market comparison</div><h2>${ms.map(m=>esc(m.name)).join(" vs ")}</h2>
      <div class="card tableWrap compareTable"><table><thead><tr><th>Metric</th>${ms.map(m=>`<th>${esc(m.name)}</th>`).join("")}</tr></thead><tbody>
        <tr><td>Expansion score</td>${ms.map(m=>`<td><strong>${m.score}/100</strong></td>`).join("")}</tr>
        <tr><td>Operators mapped</td>${ms.map(m=>`<td>${m.operators.length}</td>`).join("")}</tr>
        <tr><td>Billing rails mapped</td>${ms.map(m=>`<td>${m.rails.length}</td>`).join("")}</tr>
        <tr><td>Verified rails</td>${ms.map(m=>`<td>${m.rails.filter(r=>r.confidence==="verified").length}</td>`).join("")}</tr>
        <tr><td>Targets mapped</td>${ms.map(m=>`<td>${m.ecosystem.length}</td>`).join("")}</tr>
        ${allRailTypes.map(type => `<tr><td>${esc(type)}</td>${ms.map(m=>`<td>${m.rails.some(r=>r.type===type) ? "✓" : "—"}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;
    $("#modal").showModal();
  }


  function renderPartners() {
    const root = $("#partnersGrid");
    if (!root) return;
    root.innerHTML = partners.map(p => {
      const countryNames = (p.countries || []).map(id => data.markets.find(m => m.id === id)?.name || id);
      return `
        <article class="card partnerCard">
          <div class="partnerTop">
            <div>
              <span class="confidence ${esc(p.confidence)}">${confidenceLabel(p.confidence)}</span>
              <h3>${esc(p.name)}</h3>
              <div class="partnerType">${esc(p.type)}</div>
            </div>
            <strong>${countryNames.length}</strong>
          </div>
          <p>${esc(p.summary)}</p>
          <div class="tags">${countryNames.map(name => `<span class="tag">${esc(name)}</span>`).join("")}</div>
          <div class="partnerCapabilities">${(p.capabilities || []).slice(0,4).map(x=>`<span>${esc(x)}</span>`).join("")}</div>
          <div class="rowActions partnerActions">
            <button class="btn primary" data-partner="${esc(p.id)}">Open coverage</button>
            <a class="btn ghost profileLink" href="${esc(p.currentEvidence.url)}" target="_blank" rel="noreferrer">Source ↗</a>
          </div>
        </article>`;
    }).join("");
  }

  function openPartner(id) {
    const p = partners.find(x => x.id === id);
    if (!p) return;
    const body = $("#modalBody");
    body.innerHTML = `
      <div class="eyebrow">Payment partner intelligence</div>
      <h2>${esc(p.name)}</h2>
      <p class="lede">${esc(p.summary)}</p>
      <div class="tags partnerModalTags">${(p.capabilities || []).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
      <div class="sectionHeader compact"><div><h3>Country / operator evidence</h3><p>Coverage does not imply a current merchant-ready DCB route unless explicitly verified.</p></div></div>
      <div class="card tableWrap"><table>
        <thead><tr><th>Market</th><th>Operator / scope</th><th>Status</th><th>Evidence note</th><th></th></tr></thead>
        <tbody>
          ${(p.routes || []).map(r => {
            const market = data.markets.find(m => m.id === r.marketId);
            return `<tr>
              <td><button class="btn tiny" data-open="${esc(r.marketId)}">${esc(market?.name || r.marketId)}</button></td>
              <td><strong>${esc(r.operator)}</strong></td>
              <td><span class="status ${r.status === "route-discovery" ? "priorityHigh" : "priorityMedium"}">${esc(r.status.replaceAll("-"," "))}</span></td>
              <td>${esc(r.note)}</td>
              <td><a class="btn tiny profileLink" href="${esc(r.evidence)}" target="_blank" rel="noreferrer">Evidence ↗</a></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>`;
    $("#modal").showModal();
  }

  function signalTypeLabel(type) {
    return ({
      billing_route: "Billing route",
      market_update: "Market update",
      corporate_change: "Corporate change",
      partnership: "Partnership"
    })[type] || type;
  }

  function renderSignals() {
    const root = $("#signalsList");
    if (!root) return;
    const filtered = signals
      .filter(s => state.signalFilter === "all" || s.type === state.signalFilter)
      .sort((a,b) => String(b.observedAt).localeCompare(String(a.observedAt)));
    root.innerHTML = filtered.map(s => {
      const market = data.markets.find(m => m.id === s.marketId);
      return `
        <article class="card signalCard">
          <div class="signalTop">
            <div>
              <span class="signalType">${esc(signalTypeLabel(s.type))}</span>
              <span class="confidence ${esc(s.confidence)}">${confidenceLabel(s.confidence)}</span>
            </div>
            <span class="signalDate">${esc(s.observedAt)}</span>
          </div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.summary)}</p>
          <div class="signalMeta"><strong>${esc(market?.name || s.marketId)}</strong> · ${esc(s.company || "")}</div>
          <div class="rowActions">
            <button class="btn tiny" data-open="${esc(s.marketId)}">Open market</button>
            <a class="btn tiny profileLink" href="${esc(s.sourceUrl)}" target="_blank" rel="noreferrer">Evidence ↗</a>
          </div>
        </article>`;
    }).join("") || `<div class="empty card">No signals in this filter.</div>`;
  }

  function buildRecheckQueue() {
    const rows = [];
    liveMarkets.forEach(m => {
      (m.rails || []).forEach(r => {
        if (r.confidence !== "verified") {
          rows.push({
            marketId: m.id,
            market: m.name,
            target: r.provider,
            detail: r.type + " · " + r.evidence,
            confidence: r.confidence,
            priority: r.confidence === "unknown" ? "High" : "Medium"
          });
        }
      });
      (m.operators || []).forEach(o => {
        if (o.confidence !== "verified" && !(m.rails || []).some(r => r.provider === o.name && r.confidence !== "verified")) {
          rows.push({
            marketId: m.id,
            market: m.name,
            target: o.name,
            detail: o.rail + " · " + o.note,
            confidence: o.confidence,
            priority: o.confidence === "unknown" ? "High" : "Medium"
          });
        }
      });
    });
    partners.forEach(p => {
      (p.routes || []).forEach(r => {
        if (r.status === "verified") return;
        const market = data.markets.find(m => m.id === r.marketId);
        rows.push({
          marketId: r.marketId,
          market: market?.name || r.marketId,
          target: p.name + " · " + r.operator,
          detail: r.note,
          confidence: r.status === "route-discovery" ? "unknown" : "review",
          priority: r.status === "route-discovery" ? "High" : "Medium"
        });
      });
    });
    return rows.sort((a,b) => (a.priority === "High" ? -1 : 1) - (b.priority === "High" ? -1 : 1));
  }

  function renderRecheckQueue() {
    const root = $("#recheckRows");
    if (!root) return;
    const rows = buildRecheckQueue();
    const count = $("#recheckCount");
    if (count) count.textContent = rows.length;
    root.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${esc(r.market)}</strong></td>
        <td>${esc(r.target)}</td>
        <td>${esc(r.detail)}</td>
        <td><span class="status ${r.priority === "High" ? "priorityHigh" : "priorityMedium"}">${esc(r.priority)}</span></td>
        <td><button class="btn tiny" data-open="${esc(r.marketId)}">Review</button></td>
      </tr>`).join("") || `<tr><td colspan="5">No rechecks pending.</td></tr>`;
  }

  function wireGlobal() {
    $("#marketSearch")?.addEventListener("input", e => { state.query = e.target.value; renderMarkets(); });
    $(".signalFilter").forEach(btn => btn.addEventListener("click", () => {
      state.signalFilter = btn.dataset.signalFilter;
      $(".signalFilter").forEach(b => b.classList.toggle("active", b === btn));
      renderSignals();
    }));
    $(".filterBtn").forEach(btn => btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      $$(".filterBtn").forEach(b => b.classList.toggle("active", b === btn));
      renderMarkets();
    }));
    $("#modalClose")?.addEventListener("click", () => $("#modal").close());
    $("#modal")?.addEventListener("click", e => { if (e.target.id === "modal") $("#modal").close(); });
    document.addEventListener("click", e => {
      const partner = e.target.closest("[data-partner]");
      if (partner) openPartner(partner.dataset.partner);
      const open = e.target.closest("[data-open]");
      if (open) openMarket(open.dataset.open);
      const short = e.target.closest("[data-shortlist]");
      if (short) {
        const id = short.dataset.shortlist;
        state.shortlist.has(id) ? state.shortlist.delete(id) : state.shortlist.add(id);
        persist(); renderMarkets();
      }
      const pipeContact = e.target.closest("[data-pipeline-contact]");
      if (pipeContact) {
        const marketId = pipeContact.dataset.marketId;
        const name = pipeContact.dataset.pipelineContact;
        addPipeline({
          key: "contact::"+marketId+"::"+name,
          type: "Contact",
          marketId,
          name,
          company: pipeContact.dataset.company,
          title: pipeContact.dataset.title
        });
        pipeContact.textContent = "✓ Added";
      }
      const pipeCompany = e.target.closest("[data-pipeline-company]");
      if (pipeCompany) {
        const marketId = pipeCompany.dataset.marketId;
        const company = pipeCompany.dataset.pipelineCompany;
        addPipeline({
          key: "company::"+marketId+"::"+company,
          type: "Company",
          marketId,
          name: company,
          company,
          role: pipeCompany.dataset.role
        });
        pipeCompany.textContent = "✓ Added";
      }
      const comp = e.target.closest("[data-compare]");
      if (comp) {
        const id = comp.dataset.compare;
        if (!state.compare.has(id) && state.compare.size >= 3) {
          alert("Compare up to 3 markets at a time.");
          return;
        }
        state.compare.has(id) ? state.compare.delete(id) : state.compare.add(id);
        persist(); renderMarkets();
      }
    });
    $("#openPipeline")?.addEventListener("click", openPipeline);
    $("#openShortlist")?.addEventListener("click", () => {
      state.filter = "shortlist";
      $$(".filterBtn").forEach(b => b.classList.toggle("active", b.dataset.filter === "shortlist"));
      renderMarkets();
      $("#markets")?.scrollIntoView({behavior:"smooth"});
    });
  }

  wireGlobal();
  renderKPIs();
  renderMarkets();
  renderPartners();
  renderSignals();
  renderRecheckQueue();
  checkApiStatus();
})();