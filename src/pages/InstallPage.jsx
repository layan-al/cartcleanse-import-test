import "../styles/install.css";

function buildBookmarkletHref(appBaseUrl) {
  const script = `(function(){var APP_URL=${JSON.stringify(appBaseUrl)};if(window.__cartcleanseCleanup){window.__cartcleanseCleanup();}var doc=window.ddDoc||document;var seen=new Map();function extractPrice(card,details,detailsLink){var priceScope=details||detailsLink||card;var text=priceScope.innerText||"";if(/sold out/i.test(text))return"Sold Out";var matches=[...text.matchAll(/\\$\\s?\\d[\\d,]*(?:\\.\\d{2})?/g)].map(function(m){return m[0].replace(/\\s+/g,"");});if(matches.length===0)return"";if(matches.length===1)return matches[0];var numericPrices=matches.map(function(p){return{raw:p,value:Number(p.replace(/[$,]/g,""))};}).filter(function(p){return!Number.isNaN(p.value);});if(numericPrices.length===0)return matches[matches.length-1];return numericPrices.reduce(function(min,p){return p.value<min.value?p:min;}).raw;}var panel=document.createElement("div");panel.style.position="fixed";panel.style.top="16px";panel.style.right="16px";panel.style.zIndex="999999";panel.style.width="260px";panel.style.background="white";panel.style.border="1px solid rgba(0,0,0,0.12)";panel.style.borderRadius="18px";panel.style.boxShadow="0 18px 40px rgba(0,0,0,0.16)";panel.style.padding="14px";panel.style.fontFamily="Inter, system-ui, sans-serif";panel.style.color="#171717";var title=document.createElement("div");title.textContent="CartCleanse";title.style.fontSize="16px";title.style.fontWeight="700";title.style.marginBottom="4px";var subtitle=document.createElement("div");subtitle.textContent="Scroll your saved list, then press Import when you reach More like this.";subtitle.style.fontSize="12px";subtitle.style.lineHeight="1.4";subtitle.style.color="#5f5f5f";subtitle.style.marginBottom="10px";var countText=document.createElement("div");countText.textContent="Collecting… 0 items";countText.style.fontSize="13px";countText.style.fontWeight="600";countText.style.marginBottom="12px";var buttonRow=document.createElement("div");buttonRow.style.display="flex";buttonRow.style.gap="8px";var importBtn=document.createElement("button");importBtn.textContent="Import now";importBtn.style.flex="1";importBtn.style.border="none";importBtn.style.borderRadius="999px";importBtn.style.padding="10px 12px";importBtn.style.background="#171717";importBtn.style.color="white";importBtn.style.cursor="pointer";importBtn.style.fontWeight="600";var cancelBtn=document.createElement("button");cancelBtn.textContent="Cancel";cancelBtn.style.flex="1";cancelBtn.style.border="1px solid rgba(0,0,0,0.12)";cancelBtn.style.borderRadius="999px";cancelBtn.style.padding="10px 12px";cancelBtn.style.background="white";cancelBtn.style.color="#171717";cancelBtn.style.cursor="pointer";cancelBtn.style.fontWeight="600";buttonRow.appendChild(importBtn);buttonRow.appendChild(cancelBtn);panel.appendChild(title);panel.appendChild(subtitle);panel.appendChild(countText);panel.appendChild(buttonRow);document.body.appendChild(panel);function scrapeCurrentCards(){var cards=[...doc.querySelectorAll('article[data-testid="product-card"]')];for(var i=0;i<cards.length;i+=1){var card=cards[i];var details=card.querySelector('[data-testid="product-card-details"]');var detailsLink=(details&&details.querySelector('a[href*="/product/"]'))||card.querySelector('[data-testid="product-card-images"] a[href*="/product/"]');var imageEl=card.querySelector('[data-testid="product-card-images"] img[data-testid="fotomancer-image"]');var brand=(details&&details.querySelector('h4')&&details.querySelector('h4').innerText.trim())||"";var textBits=[...(detailsLink&&detailsLink.querySelectorAll("p")||[])].map(function(p){return p.innerText.trim();}).filter(Boolean);var titleText=textBits[0]||"";var price=extractPrice(card,details,detailsLink);var href=(detailsLink&&detailsLink.getAttribute("href"))||"";var url=href?new URL(href,location.origin).href:"";var key=url||brand+"__"+titleText+"__"+((imageEl&&(imageEl.currentSrc||imageEl.src))||"");if(!seen.has(key)){seen.set(key,{id:url||String(seen.size+1),brand:brand,title:titleText,price:price,image:(imageEl&&((imageEl.currentSrc)||imageEl.src))||"",url:url});}}countText.textContent=seen.size+" items collected";}var timer=setInterval(scrapeCurrentCards,1000);scrapeCurrentCards();function cleanup(){clearInterval(timer);panel.remove();delete window.__cartcleanseCleanup;}cancelBtn.onclick=function(){cleanup();};importBtn.onclick=function(){clearInterval(timer);var items=[...seen.values()];if(!items.length){alert("No items collected yet.");return;}var payload=encodeURIComponent(JSON.stringify(items.slice(0,24)));window.open(APP_URL+"/#import="+payload,"_blank");cleanup();};window.__cartcleanseCleanup=cleanup;})();`;

  return `javascript:${script}`;
}

export default function InstallPage({ onBack, onInstalled }) {
  const appBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:5173";

  const bookmarkletHref = buildBookmarkletHref(appBaseUrl);

  return (
    <div className="page-shell">
      <div className="install-shell">
        <div className="install-step-label">02 — Install</div>

        <section className="install-card">
          <div className="install-content">
            <h1 className="install-title">Install once.</h1>

            <p className="install-subtitle">
              Add CartCleanse to your bookmarks bar, then use it on your
              Daydream All Saves page.
            </p>

            <div className="install-visual">
              <div className="install-browser-top">
                <span />
                <span />
                <span />
              </div>

              <div className="install-browser-bar">
                <a
                  className="install-bookmark-pill"
                  href={bookmarkletHref}
                  title="Drag this pill to your bookmarks bar"
                >
                  CartCleanse
                </a>
              </div>

              <p className="install-drag-hint">Drag this pill to your bookmarks bar</p>

              <div className="install-steps">
                <div className="install-step">
                  <span className="install-step-number">1</span>
                  <span>Drag CartCleanse to your bookmarks bar</span>
                </div>

                <div className="install-step">
                  <span className="install-step-number">2</span>
                  <span>Open your Daydream All Saves page</span>
                </div>

                <div className="install-step">
                  <span className="install-step-number">3</span>
                  <span>Click CartCleanse to import your saved items</span>
                </div>
              </div>
            </div>

            <div className="install-actions">
              <button
                type="button"
                className="install-secondary-button"
                onClick={onBack}
              >
                Back
              </button>

              <button
                type="button"
                className="install-primary-button"
                onClick={onInstalled}
              >
                I installed it
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}