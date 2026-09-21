(() => {
  const STORE_KEY = "dcb_market_notes_v1";

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveNotes(notes) {
    localStorage.setItem(STORE_KEY, JSON.stringify(notes));
  }

  function currentMarket() {
    const title = document.querySelector("#modalBody .modalHero h2");
    if (!title) return null;
    return (window.RADAR_DATA?.markets || []).find(m => m.name === title.textContent.trim()) || null;
  }

  function installStyles() {
    if (document.getElementById("marketNotesStyles")) return;
    const style = document.createElement("style");
    style.id = "marketNotesStyles";
    style.textContent =
      ".marketNotes{margin-top:16px;padding:15px}.marketNotesHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}" +
      ".marketNotesHead h3{margin:5px 0 0}.marketNotesMeta{font-size:10px;color:var(--muted)}.marketNotes textarea{width:100%;min-height:110px;resize:vertical;background:#091722;color:var(--text);border:1px solid #244158;border-radius:10px;padding:11px 12px;outline:none;line-height:1.5}" +
      ".marketNotes textarea:focus{border-color:#3b7397}.marketNotesActions{display:flex;gap:7px;justify-content:flex-end;margin-top:9px;align-items:center}.marketNotesSaved{font-size:10px;color:var(--accent);margin-right:auto}" +
      "@media(max-width:700px){.marketNotesHead{display:block}.marketNotesActions{justify-content:flex-start;flex-wrap:wrap}}";
    document.head.appendChild(style);
  }

  function inject() {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modalBody");
    if (!modal?.open || !body || body.querySelector(".marketNotes")) return;
    const market = currentMarket();
    if (!market) return;

    const notes = loadNotes();
    const saved = notes[market.id] || {};
    const card = document.createElement("section");
    card.className = "card marketNotes";
    card.dataset.marketNotes = market.id;
    card.innerHTML =
      '<div class="marketNotesHead"><div><div class="eyebrow">Workspace note</div><h3>' + market.name + ' notes</h3></div><span class="marketNotesMeta">' +
      (saved.updatedAt ? "Updated " + new Date(saved.updatedAt).toLocaleString() : "Local to this device") +
      '</span></div>' +
      '<textarea id="marketNoteText" placeholder="Commercial notes, questions to verify, meeting context, next steps…"></textarea>' +
      '<div class="marketNotesActions"><span class="marketNotesSaved" id="marketNoteSaved"></span><button class="btn ghost" id="copyMarketNote" type="button">Copy note</button><button class="btn ghost" id="clearMarketNote" type="button">Clear</button></div>';

    body.appendChild(card);
    const textarea = card.querySelector("#marketNoteText");
    const savedLabel = card.querySelector("#marketNoteSaved");
    textarea.value = saved.text || "";

    let timer;
    textarea.addEventListener("input", () => {
      clearTimeout(timer);
      savedLabel.textContent = "Saving…";
      timer = setTimeout(() => {
        const all = loadNotes();
        all[market.id] = { text: textarea.value, updatedAt: new Date().toISOString() };
        saveNotes(all);
        savedLabel.textContent = "Saved locally ✓";
        card.querySelector(".marketNotesMeta").textContent = "Updated " + new Date().toLocaleString();
      }, 300);
    });

    card.querySelector("#copyMarketNote").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        savedLabel.textContent = "Copied ✓";
      } catch {
        textarea.select();
      }
    });

    card.querySelector("#clearMarketNote").addEventListener("click", () => {
      if (!textarea.value || confirm("Clear the saved note for " + market.name + "?")) {
        textarea.value = "";
        const all = loadNotes();
        delete all[market.id];
        saveNotes(all);
        savedLabel.textContent = "Cleared";
        card.querySelector(".marketNotesMeta").textContent = "Local to this device";
      }
    });
  }

  function init() {
    installStyles();
    const body = document.getElementById("modalBody");
    const modal = document.getElementById("modal");
    if (!body || !modal) return;
    new MutationObserver(() => requestAnimationFrame(inject)).observe(body, { childList: true, subtree: true });
    modal.addEventListener("click", () => requestAnimationFrame(inject));
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();