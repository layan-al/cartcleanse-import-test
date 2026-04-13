import { useState } from "react";
import "../styles/setup.css";

export default function SetupPage({ onOpenInstall }) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  return (
    <div className="page-shell">
      <div className="setup-shell">
        <div className="setup-step-label">01 — Intro</div>

        <section className="setup-card">
          <button
            type="button"
            className="setup-info-button"
            aria-label="What is CartCleanse?"
            title="What is CartCleanse?"
            onClick={() => setIsInfoOpen(true)}
          >
            ⓘ
          </button>

          <div className="setup-layout">
            <div className="setup-copy-column">
              <div className="setup-wordmark wordmark">
                <span className="wordmark-cart">Cart</span>
                <span className="wordmark-cleanse">Cleanse</span>
              </div>

              <h1 className="setup-title">
                <span>When your saves get messy,</span>
                <span>get decisive.</span>
              </h1>

              <p className="setup-subtitle">
                Pull in your Daydream saves and narrow them fast.
              </p>

              <div className="setup-actions">
                <button
                  type="button"
                  className="setup-primary-button"
                  onClick={onOpenInstall}
                >
                  Install in 30 seconds
                </button>
              </div>

              <p className="setup-footnote">
                Built for Daydream saves in this prototype.
              </p>
            </div>

            <div className="setup-visual-column" aria-hidden="true">
              <div className="setup-visual-frame">
                <div className="setup-browser-top">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="setup-browser-bar">
                  <div className="setup-bookmark-pill">CartCleanse</div>
                </div>

                <div className="setup-visual-copy">
                  A quiet decision layer for when your saves become the problem.
                </div>
              </div>
            </div>
          </div>
        </section>
        {isInfoOpen && (
          <div
            className="setup-modal-backdrop"
            onClick={() => setIsInfoOpen(false)}
          >
            <div
              className="setup-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="setup-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="setup-modal-close"
                aria-label="Close"
                onClick={() => setIsInfoOpen(false)}
              >
                ×
              </button>

              <div className="setup-modal-step">Why CartCleanse</div>
              <h2 className="setup-modal-title" id="setup-modal-title">
                A smarter way to narrow what you already like.
              </h2>

              <div className="setup-modal-section">
                <h3 className="setup-modal-heading">Why it exists</h3>
                <p className="setup-modal-copy">
                  Discovery is easy. Choosing is harder. CartCleanse helps turn
                  messy saves into a sharper shortlist, so shoppers can decide
                  what’s actually worth buying.
                </p>
              </div>

              <div className="setup-modal-section">
                <h3 className="setup-modal-heading">What makes it smarter</h3>
                <p className="setup-modal-copy">
                  Instead of manually comparing everything in a vacuum,
                  CartCleanse narrows options through quick cuts, goals,
                  budgets, and structured comparisons — so decisions happen
                  within real constraints.
                </p>
              </div>

              <div className="setup-modal-section">
                <h3 className="setup-modal-heading">How it works</h3>
                <ol className="setup-modal-list setup-modal-list-numbered">
                  <li>Import your Daydream saves</li>
                  <li>Remove obvious no’s fast</li>
                  <li>Set your goal or budget</li>
                  <li>Compare the strongest contenders</li>
                  <li>Leave with a final shortlist</li>
                </ol>
              </div>

              <div className="setup-modal-actions">
                <button
                  type="button"
                  className="setup-modal-button"
                  onClick={() => setIsInfoOpen(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}