(() => {
  const data = window.RADAR_DATA || { markets: [] };
  const liveMarkets = data.markets.filter(m => m.status === "live");
  const state = {
    query: "",
    filter: "all",
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
            <div class="operatorHead"><div><h3>${esc(o.name)}</h3><span>${esc(o.group)}</span></div><b>${o.share}%</b></div>
            <div class="progress"><span style="width:${Math.min(o.share,100)}%"></span></div>
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
          <td><div class="rowActions"><button class="btn tiny" data-pipeline-contact="${esc(p.name)}" data-company="${esc(p.company)}" data-title="${esc(p.title)}" data-market-id="${esc(m.id)}">+ Pipeline</button><a class="btn tiny profileLink" href="${esc(p.url)}" target="_blank" rel="noreferrer">Profile ↗</a></div></td>
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
    return `
      <div class="outreachForm">
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
      $$(".outreach-target", root).forEach(btn => btn.addEventListener("click", () => {
        const body = $("#modalBody");
        const outreachTab = $('.tab[data-tab="outreach"]', body);
        outreachTab.click();
        setTimeout(() => {
          const company = $("#outreachCompany", body);
          if (company) company.value = btn.dataset.company;
        }, 0);
      }));
    }
    if (tab === "outreach") {
      $("#generateOutreach", root)?.addEventListener("click", () => generateOutreach(m, root));
      $("#copyEmail", root)?.addEventListener("click", async () => {
        const text = `Subject: ${$("#emailSubject", root).textContent}\n\n${$("#emailBody", root).textContent}`;
        await navigator.clipboard.writeText(text);
        $("#copyEmail", root).textContent = "Copied ✓";
      });
    }
  }

  function generateOutreach(m, root) {
    const company = $("#outreachCompany", root).value;
    const role = $("#outreachRole", root).value;
    const offer = $("#outreachOffer", root).value;
    const subject = `${m.name} partnership opportunity — ${offer}`;
    const body = `Hi,\n\nI'm reaching out because we're exploring ${offer.toLowerCase()} opportunities in ${m.name}. We are currently mapping operator billing, distribution and content partnerships in the market, and ${company} looks relevant to the expansion path.\n\nI'd like to understand whether your ${role} team is currently open to new OTT/VAS partnerships and what the best commercial route would be.\n\nIf relevant, I can send a short overview and we can see if there is a fit.\n\nBest,\nRicky`;
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
    const body = $("#modalBody");
    body.innerHTML = `
      <div class="eyebrow">Commercial workspace</div>
      <h2>Pipeline</h2>
      <p class="lede">Targets saved from market intelligence. This version is stored locally on this device.</p>
      <div class="targetTools">
        <button class="btn ghost" id="exportPipeline">Export CSV</button>
      </div>
      <div class="card tableWrap pipelineTable">
        <table>
          <thead><tr><th>Target</th><th>Market</th><th>Company</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${entries.map(e => `<tr>
              <td><strong>${esc(e.name)}</strong><br><small>${esc(e.title || e.role || e.type || "")}</small></td>
              <td>${esc(data.markets.find(m=>m.id===e.marketId)?.name || e.marketId)}</td>
              <td>${esc(e.company || e.name)}</td>
              <td>
                <select class="input pipeStatus" data-pipe-key="${esc(e.key)}">
                  ${["New","Researching","Contacted","Follow-up","Partnering","Closed"].map(s => `<option ${s===e.status?"selected":""}>${s}</option>`).join("")}
                </select>
              </td>
              <td><button class="btn tiny pipeRemove" data-pipe-key="${esc(e.key)}">Remove</button></td>
            </tr>`).join("") || `<tr><td colspan="5">Nothing in pipeline yet. Add a company or decision-maker from a market.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    $("#modal").showModal();
    $$(".pipeStatus", body).forEach(sel => sel.addEventListener("change", () => {
      const key = sel.dataset.pipeKey;
      if (state.pipeline[key]) {
        state.pipeline[key].status = sel.value;
        state.pipeline[key].updatedAt = new Date().toISOString();
        persist();
      }
    }));
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
    const rows = [["Target","Market","Company","Title/Role","Status"], ...entries.map(e => [
      e.name,
      data.markets.find(m=>m.id===e.marketId)?.name || e.marketId,
      e.company || e.name,
      e.title || e.role || "",
      e.status
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

  function wireGlobal() {
    $("#marketSearch")?.addEventListener("input", e => { state.query = e.target.value; renderMarkets(); });
    $$(".filterBtn").forEach(btn => btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      $$(".filterBtn").forEach(b => b.classList.toggle("active", b === btn));
      renderMarkets();
    }));
    $("#modalClose")?.addEventListener("click", () => $("#modal").close());
    $("#modal")?.addEventListener("click", e => { if (e.target.id === "modal") $("#modal").close(); });
    document.addEventListener("click", e => {
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
  renderMarkets();
})();