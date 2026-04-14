(function () {
  const APP_URL = "https://cartcleanse-import-test.vercel.app";
  if (window.__cartcleanseCleanup) {
    window.__cartcleanseCleanup();
  }

  const doc = window.ddDoc || document;
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
        value: Number(p.replace(/[$,]/g, "")),
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

      const brand = details?.querySelector("h4")?.innerText.trim() || "";

      const textBits = [...(detailsLink?.querySelectorAll("p") || [])]
        .map((p) => p.innerText.trim())
        .filter(Boolean);

      const title = textBits[0] || "";
      const price = extractPrice(card, details, detailsLink);

      const href = detailsLink?.getAttribute("href") || "";
      const url = href ? new URL(href, location.origin).href : "";

      const key =
        url || `${brand}__${title}__${imageEl?.currentSrc || imageEl?.src || ""}`;

      if (!seen.has(key)) {
        seen.set(key, {
          id: url || String(seen.size + 1),
          brand,
          title,
          price,
          image: imageEl?.currentSrc || imageEl?.src || "",
          url,
        });
      }
    }

    countText.textContent = `${seen.size} items collected`;
  }

  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = "16px";
  panel.style.right = "16px";
  panel.style.zIndex = "999999";
  panel.style.width = "260px";
  panel.style.background = "white";
  panel.style.border = "1px solid rgba(0,0,0,0.12)";
  panel.style.borderRadius = "18px";
  panel.style.boxShadow = "0 18px 40px rgba(0,0,0,0.16)";
  panel.style.padding = "14px";
  panel.style.fontFamily = "Inter, system-ui, sans-serif";
  panel.style.color = "#171717";

  const title = document.createElement("div");
  title.textContent = "CartCleanse";
  title.style.fontSize = "16px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "4px";

  const subtitle = document.createElement("div");
  subtitle.textContent = "Scroll your saved list, then press Import when you reach More like this.";
  subtitle.style.fontSize = "12px";
  subtitle.style.lineHeight = "1.4";
  subtitle.style.color = "#5f5f5f";
  subtitle.style.marginBottom = "10px";

  const countText = document.createElement("div");
  countText.textContent = "Collecting… 0 items";
  countText.style.fontSize = "13px";
  countText.style.fontWeight = "600";
  countText.style.marginBottom = "12px";

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "8px";

  const importBtn = document.createElement("button");
  importBtn.textContent = "Import now";
  importBtn.style.flex = "1";
  importBtn.style.border = "none";
  importBtn.style.borderRadius = "999px";
  importBtn.style.padding = "10px 12px";
  importBtn.style.background = "#171717";
  importBtn.style.color = "white";
  importBtn.style.cursor = "pointer";
  importBtn.style.fontWeight = "600";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.flex = "1";
  cancelBtn.style.border = "1px solid rgba(0,0,0,0.12)";
  cancelBtn.style.borderRadius = "999px";
  cancelBtn.style.padding = "10px 12px";
  cancelBtn.style.background = "white";
  cancelBtn.style.color = "#171717";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.style.fontWeight = "600";

  buttonRow.appendChild(importBtn);
  buttonRow.appendChild(cancelBtn);

  panel.appendChild(title);
  panel.appendChild(subtitle);
  panel.appendChild(countText);
  panel.appendChild(buttonRow);
  document.body.appendChild(panel);

  const timer = setInterval(scrapeCurrentCards, 1000);
  scrapeCurrentCards();

  function cleanup() {
    clearInterval(timer);
    panel.remove();
    delete window.__cartcleanseCleanup;
  }

  cancelBtn.onclick = () => {
    cleanup();
  };

  importBtn.onclick = () => {
    clearInterval(timer);
    const items = [...seen.values()];

    if (!items.length) {
      alert("No items collected yet.");
      return;
    }

    const payload = encodeURIComponent(JSON.stringify(items.slice(0, 24)));
    window.open(`${APP_URL}/#import=${payload}`, "_blank");
    cleanup();
  };

  window.__cartcleanseCleanup = cleanup;
})();

//bookmarklet
javascript:(function(){const APP_URL="https://cartcleanse-import-test.vercel.app";if(window.__cartcleanseCleanup){window.__cartcleanseCleanup();}const doc=window.ddDoc||document;const seen=new Map();function extractPrice(card,details,detailsLink){const priceScope=details||detailsLink||card;const text=priceScope.innerText||"";if(/sold out/i.test(text))return"Sold Out";const matches=[...text.matchAll(/\$\s?\d[\d,]*(?:\.\d{2})?/g)].map((m)=>m[0].replace(/\s+/g,""));if(matches.length===0)return"";if(matches.length===1)return matches[0];const numericPrices=matches.map((p)=>({raw:p,value:Number(p.replace(/[$,]/g,""))})).filter((p)=>!Number.isNaN(p.value));if(numericPrices.length===0)return matches[matches.length-1];return numericPrices.reduce((min,p)=>p.value<min.value?p:min).raw;}function scrapeCurrentCards(){const cards=[...doc.querySelectorAll('article[data-testid="product-card"]')];for(const card of cards){const details=card.querySelector('[data-testid="product-card-details"]');const detailsLink=details?.querySelector('a[href*="/product/"]')||card.querySelector('[data-testid="product-card-images"] a[href*="/product/"]');const imageEl=card.querySelector('[data-testid="product-card-images"] img[data-testid="fotomancer-image"]');const brand=details?.querySelector("h4")?.innerText.trim()||"";const textBits=[...(detailsLink?.querySelectorAll("p")||[])].map((p)=>p.innerText.trim()).filter(Boolean);const title=textBits[0]||"";const price=extractPrice(card,details,detailsLink);const href=detailsLink?.getAttribute("href")||"";const url=href?new URL(href,location.origin).href:"";const key=url||`${brand}__${title}__${imageEl?.currentSrc||imageEl?.src||""}`;if(!seen.has(key)){seen.set(key,{id:url||String(seen.size+1),brand,title,price,image:imageEl?.currentSrc||imageEl?.src||"",url});}}countText.textContent=`${seen.size} items collected`;}const panel=document.createElement("div");panel.style.position="fixed";panel.style.top="16px";panel.style.right="16px";panel.style.zIndex="999999";panel.style.width="260px";panel.style.background="white";panel.style.border="1px solid rgba(0,0,0,0.12)";panel.style.borderRadius="18px";panel.style.boxShadow="0 18px 40px rgba(0,0,0,0.16)";panel.style.padding="14px";panel.style.fontFamily="Inter, system-ui, sans-serif";panel.style.color="#171717";const title=document.createElement("div");title.textContent="CartCleanse";title.style.fontSize="16px";title.style.fontWeight="700";title.style.marginBottom="4px";const subtitle=document.createElement("div");subtitle.textContent="Scroll your saved list, then press Import when you reach More like this.";subtitle.style.fontSize="12px";subtitle.style.lineHeight="1.4";subtitle.style.color="#5f5f5f";subtitle.style.marginBottom="10px";const countText=document.createElement("div");countText.textContent="Collecting… 0 items";countText.style.fontSize="13px";countText.style.fontWeight="600";countText.style.marginBottom="12px";const buttonRow=document.createElement("div");buttonRow.style.display="flex";buttonRow.style.gap="8px";const importBtn=document.createElement("button");importBtn.textContent="Import now";importBtn.style.flex="1";importBtn.style.border="none";importBtn.style.borderRadius="999px";importBtn.style.padding="10px 12px";importBtn.style.background="#171717";importBtn.style.color="white";importBtn.style.cursor="pointer";importBtn.style.fontWeight="600";const cancelBtn=document.createElement("button");cancelBtn.textContent="Cancel";cancelBtn.style.flex="1";cancelBtn.style.border="1px solid rgba(0,0,0,0.12)";cancelBtn.style.borderRadius="999px";cancelBtn.style.padding="10px 12px";cancelBtn.style.background="white";cancelBtn.style.color="#171717";cancelBtn.style.cursor="pointer";cancelBtn.style.fontWeight="600";buttonRow.appendChild(importBtn);buttonRow.appendChild(cancelBtn);panel.appendChild(title);panel.appendChild(subtitle);panel.appendChild(countText);panel.appendChild(buttonRow);document.body.appendChild(panel);const timer=setInterval(scrapeCurrentCards,1000);scrapeCurrentCards();function cleanup(){clearInterval(timer);panel.remove();delete window.__cartcleanseCleanup;}cancelBtn.onclick=()=>{cleanup();};importBtn.onclick=()=>{clearInterval(timer);const items=[...seen.values()];if(!items.length){alert("No items collected yet.");return;}const payload=encodeURIComponent(JSON.stringify(items.slice(0,24)));window.open(`${APP_URL}/#import=${payload}`,"_blank");cleanup();};window.__cartcleanseCleanup=cleanup;})();