import "../styles/set-goal.css";

const keepOptions = [1, 3, 5, "No target", "You pick", "Custom"];

const budgetOptions = [
  { label: "No budget", mode: "none", value: null },
  { label: "Up to $200 total", mode: "preset", value: 200 },
  { label: "Up to $500 total", mode: "preset", value: 500 },
  { label: "Custom", mode: "custom", value: null },
];

export default function SetGoalPage({
  keepTarget,
  customKeepValue,
  budgetMode,
  budgetValue,
  customBudgetValue,
  onKeepTargetChange,
  onCustomKeepChange,
  onBudgetPresetSelect,
  onNoBudgetSelect,
  onCustomBudgetSelect,
  onCustomBudgetChange,
  onBack,
  onStartNarrowing,
}) {
  function isBudgetSelected(option) {
    if (option.mode === "none") return budgetMode === "none";
    if (option.mode === "custom") return budgetMode === "custom";
    return budgetMode === "preset" && budgetValue === option.value;
  }

  function handleBudgetClick(option) {
    if (option.mode === "none") {
      onNoBudgetSelect();
      return;
    }

    if (option.mode === "custom") {
      onCustomBudgetSelect();
      return;
    }

    onBudgetPresetSelect(option.value);
  }

  const isMissingRequiredConstraint =
    (keepTarget === "No target" || keepTarget === "You pick") &&
    budgetMode === "none";

  return (
    <div className="page-shell">
      <div className="goal-shell">
        <header className="goal-header">
          <div className="goal-topbar">
            <div className="wordmark">
              <span className="wordmark-cart">Cart</span>
              <span className="wordmark-cleanse">Cleanse</span>
            </div>

            <div className="goal-meta">
              <span className="meta-item">03 — Set Goal</span>
            </div>
          </div>

          <div className="goal-hero">
            <div className="goal-copy">
              <h1 className="goal-title">Set your goal.</h1>
              <p className="goal-subtitle">
                Tell CartCleanse what you want to walk away with.
              </p>
            </div>
          </div>
        </header>

        <main className="goal-main">
          <section className="goal-section">
            <div className="section-header">
              <p className="section-label">Keep target</p>
            </div>

            <div className="goal-block">
              <p className="goal-question">How many do you want to keep?</p>

              <div className="choice-row">
                {keepOptions.map((option) => {
                  const isSelected = keepTarget === option;
                  const isYouPick = option === "You pick";

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`choice-pill ${isSelected ? "is-selected" : ""} ${
                        isYouPick ? "choice-pill-you-pick" : ""
                      }`}
                      onClick={() => onKeepTargetChange(option)}
                      title={
                        isYouPick
                          ? "We’ll choose the strongest reasonable shortlist based on your taste and budget. This may not use every remaining dollar."
                          : undefined
                      }
                      aria-label={
                        isYouPick
                          ? "You pick. We’ll choose the strongest reasonable shortlist based on your taste and budget. This may not use every remaining dollar."
                          : undefined
                      }
                    >
                      <span>{option}</span>
                      {isYouPick && <span className="choice-pill-info">ⓘ</span>}
                    </button>
                  );
                })}
              </div>

              {keepTarget === "Custom" && (
                <div className="inline-input-wrap">
                  <label className="inline-input-label" htmlFor="custom-keep">
                    Custom keep target
                  </label>
                  <input
                    id="custom-keep"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className="inline-input"
                    placeholder="Enter a number"
                    value={customKeepValue}
                    onChange={(e) => onCustomKeepChange(e.target.value)}
                  />
                </div>
              )}

              {keepTarget === "You pick" ? (
                <p className="goal-note">
                  You pick means CartCleanse will choose the strongest
                  reasonable shortlist based on your taste and budget. This may
                  not use every remaining dollar.
                </p>
              ) : (
                <p className="goal-note">
                  Pick the number you’d ideally want to leave with. No target is
                  more budget-led. You pick is more curated.
                </p>
              )}
            </div>
          </section>

          <section className="goal-section">
            <div className="section-header">
              <p className="section-label">Budget</p>
            </div>

            <div className="goal-block">
              <p className="goal-question">
                What budget matters for this round?
              </p>

              <div className="choice-row choice-row-wide">
                {budgetOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`choice-pill ${
                      isBudgetSelected(option) ? "is-selected" : ""
                    }`}
                    onClick={() => handleBudgetClick(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {budgetMode === "custom" && (
                <div className="inline-input-wrap">
                  <label className="inline-input-label" htmlFor="custom-budget">
                    Custom max budget
                  </label>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">$</span>
                    <input
                      id="custom-budget"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className="inline-input currency-input"
                      placeholder="Enter amount"
                      value={customBudgetValue}
                      onChange={(e) => onCustomBudgetChange(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <div className="goal-footer">
          {isMissingRequiredConstraint && (
            <p className="goal-note">
              Pick at least a numbered keep target or a budget so we know what
              to optimize for.
            </p>
          )}

          <div className="goal-footer-actions">
            {onBack && (
              <button
                type="button"
                className="goal-cta goal-cta-secondary"
                onClick={onBack}
              >
                Back to Quick Cut
              </button>
            )}

            <button
              type="button"
              className="goal-cta"
              onClick={onStartNarrowing}
              disabled={isMissingRequiredConstraint}
            >
              Start narrowing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}