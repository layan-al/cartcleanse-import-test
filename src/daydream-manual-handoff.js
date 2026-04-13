// DAYDREAM MANUAL-STOP HANDOFF WORKFLOW
//
// 1. On Daydream, inspect one real saved-item card so it becomes $0
// 2. Run the setup snippet
// 3. Run the reset snippet
// 4. Run the collector snippet
// 5. Scroll manually from the top of Saved List
// 6. Stop as soon as you visually reach the real "More like this" section
// 7. Wait 2–3 seconds
// 8. Run the stop/store snippet
// 9. Run the handoff snippet

//setup script
window.ddDoc = $0.ownerDocument;
"doc locked"

//reset script
clearInterval(window.ddTimer);
window.ddSeen = new Map();
window.scrapedItems = [];
"reset done"

//collector script
(function () {
  const doc = window.ddDoc;
  const seen = new Map();

  function extractPrice(card, details, detailsLink) {
    const priceScope = details || detailsLink || card;
    const text = priceScope.innerText || "";

    if (/sold out/i.test(text)) return "Sold Out";

    const matches = [...text.matchAll(/\$\s?\d[\d,]*(?:\.\d{2})?/g)].map((m) =>
  m[0].replace(/\s+/g, "")
);

    if (matches.length === 0) return "";

    if (matches.length === 1) return matches[0];

    const numericPrices = matches
      .map((p) => ({
        raw: p,
        value: Number(p.replace(/[$,]/g, ""))
      }))
      .filter((p) => !Number.isNaN(p.value));

    if (numericPrices.length === 0) return matches[matches.length - 1];

    return numericPrices.reduce((min, p) => (p.value < min.value ? p : min)).raw;
  }

  function scrapeCurrentCards() {
    const cards = [...doc.querySelectorAll('article[data-testid="product-card"]')];

    for (const card of cards) {
      const details = card.querySelector('[data-testid="product-card-details"]');
      const detailsLink =
        details?.querySelector('a[href*="/product/"]') ||
        card.querySelector('[data-testid="product-card-images"] a[href*="/product/"]');

      const imageEl = card.querySelector(
        '[data-testid="product-card-images"] img[data-testid="fotomancer-image"]'
      );

      const brand = details?.querySelector('h4')?.innerText.trim() || '';

      const textBits = [...(detailsLink?.querySelectorAll('p') || [])]
        .map(p => p.innerText.trim())
        .filter(Boolean);

      const title = textBits[0] || '';
      const price = extractPrice(card, details, detailsLink);

      const href = detailsLink?.getAttribute('href') || '';
      const url = href ? new URL(href, location.origin).href : '';

      const key = url || `${brand}__${title}__${imageEl?.currentSrc || imageEl?.src || ''}`;

      if (!seen.has(key)) {
        seen.set(key, {
          id: url || String(seen.size + 1),
          brand,
          title,
          price,
          image: imageEl?.currentSrc || imageEl?.src || '',
          url
        });
      }
    }

    console.log('DOM now:', cards.length, '| unique collected:', seen.size);
  }

  clearInterval(window.ddTimer);
  window.ddSeen = seen;
  window.ddScrape = scrapeCurrentCards;
  window.ddTimer = setInterval(scrapeCurrentCards, 1000);

  scrapeCurrentCards();
  'collector started'
})();

//store/stop script

clearInterval(window.ddTimer);
window.ddSeen.size

window.scrapedItems = [...window.ddSeen.values()];
console.log(window.scrapedItems.slice(0, 10));

//handoff script
const newTab = window.open("about:blank", "_blank");

if (!newTab) {
  alert("Popup blocked. Allow popups for this site and try again.");
} else {
  newTab.name = JSON.stringify(window.scrapedItems);
  newTab.location.href = "http://localhost:5173";
}