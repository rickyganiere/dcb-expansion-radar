(() => {
  const scores = window.RADAR_SCORES;
  const radar = window.RADAR_DATA;
  if (!scores || !radar) return;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function getMarketFromModal() {
    const title = document.querySelector("#modalBody .modalHero h2");
    if (!title) return null;
    const name = title.textContent.trim();
    return radar.markets.find(m => m.name === name) || null;
  }

  function renderBreakdown(market) {
    const componentScores = scores.markets && scores.markets[market.id];
    if (!componentScores) return "";
    const rows = scores.components.map(c => {
      const value = Number(componentScores[c.key] || 0);
      return '<div class="scoreMetric">' +
        '<div class="scoreMetricHead">' +
          '<div><strong>' + esc(c.label) + '</strong><small>' + esc(c.description) + '</small></div>' +
          '<b>' + value + '</b>' +
        '</div>' +
        '<div class="scoreMetricBar"><span style="width:' + Math.max(0, Math.min(value,100)) + '%"></span></div>' +
      '</div>';
    }).join("");

    return '<section class="scoreBreakdownCard card" data-score-breakdown="' + esc(market.id) + '">' +
      '<div class="scoreBreakdownHead">' +
        '<div><div class="eyebrow">Why this score</div><h3>Opportunity score breakdown</h3></div>' +
        '<span class="scoreVersion">Model ' + esc(scores.version) + '</span>' +
      '</div>' +
      '<div class="scoreMetrics">' + rows + '</div>' +
      '<p class="scoreMethod">' + esc(scores.methodology) + '</p>' +
    '</section>';
  }

  function inject() {
    const body = document.querySelector("#modalBody");
    if (!body) return;
    const market = getMarketFromModal();
    if (!market) return;
    if (body.querySelector("[data-score-breakdown]")) return;
    const hero = body.querySelector(".modalHero");
    if (!hero) return;
    hero.insertAdjacentHTML("afterend", renderBreakdown(market));
  }

  const modal = document.querySelector("#modal");
  if (!modal) return;

  const observer = new MutationObserver(() => {
    if (modal.open) requestAnimationFrame(inject);
  });
  observer.observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });

  modal.addEventListener("click", () => requestAnimationFrame(inject));
})();