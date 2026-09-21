(() => {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function currentMarket() {
    const title = document.querySelector("#modalBody .modalHero h2");
    if (!title) return null;
    return (window.RADAR_DATA?.markets || []).find(m => m.name === title.textContent.trim()) || null;
  }

  function noteFor(marketId) {
    try {
      const notes = JSON.parse(localStorage.getItem("dcb_market_notes_v1") || "{}");
      return notes[marketId]?.text || "";
    } catch { return ""; }
  }

  function scoreRows(market) {
    const model = window.RADAR_SCORES;
    const values = model?.markets?.[market.id] || {};
    return (model?.components || []).map(c =>
      '<tr><td>' + esc(c.label) + '</td><td>' + esc(c.description) + '</td><td><strong>' + esc(values[c.key] ?? "—") + '</strong></td></tr>'
    ).join("");
  }

  function reportHtml(m) {
    const note = noteFor(m.id);
    const partnerCoverage = (window.RADAR_PARTNERS || []).filter(p => (p.countries || []).includes(m.id));
    const reviewed = window.RADAR_DATA?.lastReviewed || "";
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(m.name) + ' · DCB Expansion Radar</title>' +
      '<style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#15202b;margin:36px;line-height:1.45}h1{font-size:32px;margin:4px 0}h2{margin-top:28px;font-size:18px;border-bottom:1px solid #d9e0e5;padding-bottom:7px}p{font-size:13px}.muted{color:#667784}.eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#167b68;font-weight:700}.score{font-size:42px;font-weight:800}.score small{font-size:15px;color:#667784}.pill{display:inline-block;padding:4px 7px;border:1px solid #c9d4dc;border-radius:999px;font-size:10px;margin:2px}.verified{background:#e7f7f2;color:#126452}.review{background:#fff7dd;color:#7a5a00}.unknown{background:#edf1f4;color:#566773}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e2e7eb;padding:8px;font-size:11px}th{background:#f5f7f8;color:#5c6d78}.grid{display:grid;grid-template-columns:1fr 220px;gap:24px}.box{border:1px solid #d9e0e5;border-radius:10px;padding:14px}.source{font-size:10px;word-break:break-all}.footer{margin-top:36px;border-top:1px solid #d9e0e5;padding-top:10px;font-size:9px;color:#71808a}@media print{body{margin:18mm}.noPrint{display:none}a{color:inherit;text-decoration:none}}@media(max-width:650px){.grid{grid-template-columns:1fr}}' +
      '</style></head><body>' +
      '<div class="noPrint" style="text-align:right"><button onclick="window.print()">Print / Save PDF</button></div>' +
      '<div class="grid"><div><div class="eyebrow">DCB Expansion Radar · ' + esc(m.code) + '</div><h1>' + esc(m.name) + '</h1><p>' + esc(m.summary) + '</p></div><div class="box"><div class="muted">Expansion score</div><div class="score">' + esc(m.score) + '<small>/100</small></div><div class="muted">Evidence reviewed ' + esc(reviewed) + '</div></div></div>' +
      '<h2>Score model</h2><table><thead><tr><th>Component</th><th>What it measures</th><th>Score</th></tr></thead><tbody>' + scoreRows(m) + '</tbody></table>' +
      '<h2>Operator landscape</h2><table><thead><tr><th>Operator</th><th>Group</th><th>Share</th><th>Rail</th><th>Confidence</th><th>Evidence note</th></tr></thead><tbody>' +
      (m.operators || []).map(o => '<tr><td><strong>' + esc(o.name) + '</strong></td><td>' + esc(o.group) + '</td><td>' + esc(o.share == null ? "—" : o.share + "%") + '</td><td>' + esc(o.rail) + '</td><td><span class="pill ' + esc(o.confidence) + '">' + esc(o.confidence) + '</span></td><td>' + esc(o.note) + '</td></tr>').join("") +
      '</tbody></table>' +
      '<h2>Billing rails</h2><table><thead><tr><th>Type</th><th>Provider</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>' +
      (m.rails || []).map(r => '<tr><td>' + esc(r.type) + '</td><td><strong>' + esc(r.provider) + '</strong></td><td><span class="pill ' + esc(r.confidence) + '">' + esc(r.confidence) + '</span></td><td>' + esc(r.evidence) + '</td></tr>').join("") +
      '</tbody></table>' +
      '<h2>Commercial targets</h2><table><thead><tr><th>Company</th><th>Role</th><th>Status</th></tr></thead><tbody>' +
      (m.ecosystem || []).map(e => '<tr><td><strong>' + esc(e.company) + '</strong></td><td>' + esc(e.role) + '</td><td>' + esc(e.status) + '</td></tr>').join("") +
      '</tbody></table>' +
      '<h2>Decision-makers</h2><table><thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Location</th><th>Profile</th></tr></thead><tbody>' +
      (m.contacts || []).map(c => '<tr><td><strong>' + esc(c.name) + '</strong></td><td>' + esc(c.company) + '</td><td>' + esc(c.title) + '</td><td>' + esc(c.location) + '</td><td class="source">' + (c.url ? '<a href="' + esc(c.url) + '">' + esc(c.url) + '</a>' : "—") + '</td></tr>').join("") +
      '</tbody></table>' +
      '<h2>Payment / DCB partners with market coverage</h2>' +
      (partnerCoverage.length ? partnerCoverage.map(p => '<div class="box" style="margin-top:8px"><strong>' + esc(p.name) + '</strong><p>' + esc(p.summary) + '</p><div>' + (p.capabilities || []).map(x => '<span class="pill">' + esc(x) + '</span>').join("") + '</div></div>').join("") : '<p class="muted">No mapped payment partner coverage.</p>') +
      (note ? '<h2>Workspace note</h2><div class="box"><p style="white-space:pre-wrap">' + esc(note) + '</p></div>' : '') +
      '<h2>Sources</h2>' + (m.sources || []).map(s => '<p class="source"><strong>' + esc(s.label) + ':</strong> <a href="' + esc(s.url) + '">' + esc(s.url) + '</a></p>').join("") +
      '<div class="footer">DCB Expansion Radar · Internal market intelligence report · Public evidence should be revalidated before commercial decisions or outreach.</div>' +
      '</body></html>';
  }

  function exportReport(market) {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to open the market report.");
      return;
    }
    win.document.open();
    win.document.write(reportHtml(market));
    win.document.close();
  }

  function inject() {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modalBody");
    if (!modal?.open || !body) return;
    const hero = body.querySelector(".modalHero");
    if (!hero || hero.querySelector(".marketReportBtn")) return;
    const market = currentMarket();
    if (!market) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn ghost marketReportBtn";
    button.textContent = "Export report";
    button.addEventListener("click", () => exportReport(market));
    hero.appendChild(button);
  }

  function init() {
    const body = document.getElementById("modalBody");
    const modal = document.getElementById("modal");
    if (!body || !modal) return;
    new MutationObserver(() => requestAnimationFrame(inject)).observe(body, { childList: true, subtree: true });
    modal.addEventListener("click", () => requestAnimationFrame(inject));
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();