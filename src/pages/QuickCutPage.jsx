import { useMemo, useState } from "react";
import { mockItems } from "../mockItems";
import "../styles/quick-cut.css";

export default function QuickCutPage({ session, onBack, onContinue }) {
  const items =
    session?.candidateItems?.length > 0
      ? session.candidateItems
      : session?.importedItems?.length > 0
      ? session.importedItems
      : mockItems;

  const [selectedIds, setSelectedIds] = useState(items.map((item) => item.id));

  function toggleItem(id) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  }

  const selectedCount = selectedIds.length;
  const importedCount = items.length;

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const buttonLabel = useMemo(() => {
    if (selectedCount === 0) return "Narrow 0 items";
    if (selectedCount === 1) return "Narrow 1 item";
    return `Narrow ${selectedCount} items`;
  }, [selectedCount]);

  function handleContinue() {
    if (!onContinue || selectedItems.length === 0) return;
    onContinue(selectedItems);
  }

  return (
    <div className="page-shell">
      <div className="app-shell">
        <header className="app-header">
          <div className="header-top">
            <div className="wordmark">
              <span className="wordmark-cart">Cart</span>
              <span className="wordmark-cleanse">Cleanse</span>
            </div>

            <div className="header-meta">
              <span className="meta-item">03 — Quick Cut</span>
              <span className="meta-slash" />
              <span className="meta-item">Imported {importedCount}</span>
              <span className="meta-slash" />
              <span className="meta-item meta-strong">
                Selected {selectedCount}
              </span>
            </div>
          </div>

          <div className="header-main">
            <div className="header-copy">
              <h1 className="screen-title">Edit your contenders.</h1>
              <p className="screen-subtitle">
                Keep only what deserves to stay in play. For the clearest
                shortlist, try narrowing to around 10–15 serious contenders.
              </p>
            </div>

            <div className="header-actions">
              {onBack && (
                <button className="secondary-cta desktop-cta" type="button" onClick={onBack}>
                  Back
                </button>
              )}
              <button
                className="primary-cta desktop-cta"
                type="button"
                onClick={handleContinue}
                disabled={selectedCount === 0}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </header>

        <main className="grid-section">
          <div className="card-grid">
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`item-card ${selected ? "is-selected" : ""}`}
                  onClick={() => toggleItem(item.id)}
                >
                  <div className="image-wrap">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="item-image"
                    />

                    {selected && (
                      <div className="corner-tab" aria-hidden="true">
                        <span className="corner-check">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="card-content">
                    <p className="item-brand">{item.brand}</p>
                    <p className="item-title">{item.title}</p>
                    <p className="item-price">
                      {item.price || "Price unavailable"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>

      <div className="bottom-bar">
        <div className="bottom-bar-inner">
          {onBack && (
            <button className="secondary-cta mobile-cta" type="button" onClick={onBack}>
              Back
            </button>
          )}
          <button
            className="primary-cta mobile-cta"
            type="button"
            onClick={handleContinue}
            disabled={selectedCount === 0}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}