function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeItem(raw, index) {
  if (!raw || typeof raw !== "object") return null;

  const id = asString(raw.id) || `imported-${index + 1}`;
  const brand = asString(raw.brand);
  const title = asString(raw.title);
  const price = asString(raw.price);
  const image = asString(raw.image);
  const url = asString(raw.url);

  if (!brand || !title || !image) return null;

  return {
    id,
    brand,
    title,
    price,
    image,
    url,
  };
}

export function receiveImportedItems() {
  try {
    if (Array.isArray(window.__cartcleanseImportedItems)) {
      return window.__cartcleanseImportedItems;
    }

    const payload = window.name?.trim();

    if (!payload) return null;

    const parsed = JSON.parse(payload);

    if (!Array.isArray(parsed)) return null;

    const items = parsed
      .map((item, index) => normalizeItem(item, index))
      .filter(Boolean);

    if (items.length === 0) return null;

    window.__cartcleanseImportedItems = items;
    window.name = "";

    return items;
  } catch (error) {
    console.error("Failed to receive imported items:", error);
    return null;
  }
}