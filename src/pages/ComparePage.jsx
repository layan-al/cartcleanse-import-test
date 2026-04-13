import { useEffect, useMemo, useState } from "react";
import "../styles/compare.css";

function resolveKeepTarget(session) {
  if (session.keepTarget === "Custom") {
    const parsed = Number(session.customKeepValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }

  if (session.keepTarget === "No target" || session.keepTarget === "You pick") {
    return null;
  }

  const parsed = Number(session.keepTarget);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function getComparisonBudget(itemCount) {
  return Math.ceil((3 * itemCount) / 2);
}

function buildStandardPairSchedule(ids) {
  const comparisonBudget = getComparisonBudget(ids.length);
  const appearanceCounts = Object.fromEntries(ids.map((id) => [id, 0]));
  const usedPairs = new Set();
  const pairs = [];

  function pairKey(a, b) {
    return [a, b].sort().join("::");
  }

  while (pairs.length < comparisonBudget) {
    const leftId = [...ids].sort((a, b) => {
      const appearanceDelta = appearanceCounts[a] - appearanceCounts[b];
      if (appearanceDelta !== 0) return appearanceDelta;
      return String(a).localeCompare(String(b));
    })[0];

    const rightId = [...ids]
      .filter((id) => id !== leftId && !usedPairs.has(pairKey(leftId, id)))
      .sort((a, b) => {
        const appearanceDelta = appearanceCounts[a] - appearanceCounts[b];
        if (appearanceDelta !== 0) return appearanceDelta;
        return String(a).localeCompare(String(b));
      })[0];

    if (!rightId) {
      break;
    }

    pairs.push({ leftId, rightId });
    usedPairs.add(pairKey(leftId, rightId));
    appearanceCounts[leftId] += 1;
    appearanceCounts[rightId] += 1;
  }

  return pairs;
}

function buildTieBreakPairSchedule(ids) {
  if (ids.length <= 1) return [];

  const usedPairs = new Set();
  const pairs = [];
  const appearanceCounts = Object.fromEntries(ids.map((id) => [id, 0]));
  const comparisonBudget =
    ids.length <= 4
      ? Math.min((ids.length * (ids.length - 1)) / 2, 6)
      : Math.min(Math.ceil((2 * ids.length) / 2), 6);

  function pairKey(a, b) {
    return [a, b].sort().join("::");
  }

  while (pairs.length < comparisonBudget) {
    const leftId = [...ids].sort((a, b) => {
      const appearanceDelta = appearanceCounts[a] - appearanceCounts[b];
      if (appearanceDelta !== 0) return appearanceDelta;
      return String(a).localeCompare(String(b));
    })[0];

    const rightId = [...ids]
      .filter((id) => id !== leftId && !usedPairs.has(pairKey(leftId, id)))
      .sort((a, b) => {
        const appearanceDelta = appearanceCounts[a] - appearanceCounts[b];
        if (appearanceDelta !== 0) return appearanceDelta;
        return String(a).localeCompare(String(b));
      })[0];

    if (!rightId) {
      break;
    }

    pairs.push({ leftId, rightId });
    usedPairs.add(pairKey(leftId, rightId));
    appearanceCounts[leftId] += 1;
    appearanceCounts[rightId] += 1;
  }

  return pairs;
}

function buildPairSchedule(ids, compareMode) {
  if (compareMode === "tie-break") {
    return buildTieBreakPairSchedule(ids);
  }

  return buildStandardPairSchedule(ids);
}

export default function ComparePage({ session, onBack, onCompareComplete }) {
  const allItems = session.candidateItems || [];
  const keepTarget = resolveKeepTarget(session);
  const compareMode = session.tieBreakRound ? "tie-break" : "standard";
  const baseOutcomes = session.tieBreakRound ? session.pairwiseOutcomes || [] : [];
  const tieBreakIds = session.tieBreakItemIds || [];

  const tieBreakIdsKey = tieBreakIds.join("::");

  const items = useMemo(() => {
    return compareMode === "tie-break"
      ? allItems.filter((item) => tieBreakIds.includes(item.id))
      : allItems;
  }, [allItems, compareMode, tieBreakIdsKey]);

  const itemIdsKey = items.map((item) => item.id).join("::");

  const itemsById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items]
  );

  const pairSchedule = useMemo(
    () => buildPairSchedule(items.map((item) => item.id), compareMode),
    [items, compareMode]
  );

  const [matchupIndex, setMatchupIndex] = useState(0);
  const [pairwiseOutcomes, setPairwiseOutcomes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setMatchupIndex(0);
    setPairwiseOutcomes([]);
    setSelectedId(null);
    setIsComplete(false);
  }, [itemIdsKey, keepTarget, compareMode]);

  useEffect(() => {
    if (pairSchedule.length === 0 && !isComplete) {
      onCompareComplete({
        pairwiseOutcomes: baseOutcomes,
        finalistIds: allItems.map((item) => item.id),
        tieBreakComplete: compareMode === "tie-break",
      });
      setIsComplete(true);
    }
  }, [pairSchedule, isComplete, onCompareComplete, baseOutcomes, allItems, compareMode]);

  const currentMatchup = pairSchedule[matchupIndex] || null;
  const leftItem = currentMatchup ? itemsById[currentMatchup.leftId] : null;
  const rightItem = currentMatchup ? itemsById[currentMatchup.rightId] : null;

  const backLabel = compareMode === "tie-break" ? "Back to results" : "Back to set goal";

  function finishCompare(outcomes) {
    setIsComplete(true);
    setPairwiseOutcomes(outcomes);

    const finalOutcomes =
      compareMode === "tie-break" ? [...baseOutcomes, ...outcomes] : outcomes;

    onCompareComplete({
      pairwiseOutcomes: finalOutcomes,
      finalistIds: allItems.map((item) => item.id),
      tieBreakComplete: compareMode === "tie-break",
      tieBreakItemIds: compareMode === "tie-break" ? items.map((item) => item.id) : [],
    });
  }

  function goToNextMatchup(nextOutcomes) {
    const isLastMatchup = matchupIndex >= pairSchedule.length - 1;

    if (isLastMatchup) {
      finishCompare(nextOutcomes);
      return;
    }

    setPairwiseOutcomes(nextOutcomes);
    setMatchupIndex((prev) => prev + 1);
  }

  function handlePick(winnerId) {
  if (!currentMatchup || selectedId) return;

    const loserId =
      winnerId === currentMatchup.leftId
        ? currentMatchup.rightId
        : currentMatchup.leftId;

    setSelectedId(winnerId);

    const outcome = {
      matchup: matchupIndex + 1,
      leftId: currentMatchup.leftId,
      rightId: currentMatchup.rightId,
      winnerId,
      loserId,
    };

    const nextOutcomes = [...pairwiseOutcomes, outcome];

    window.setTimeout(() => {
      setSelectedId(null);
      goToNextMatchup(nextOutcomes);
    }, 180);
  }

  if (isComplete) {
    const comparedItems = items
      .map((item) => item.id)
      .map((id) => itemsById[id])
      .filter(Boolean);

    return (
      <div className="page-shell">
        <div className="compare-shell">
          <header className="compare-header">
            <div className="compare-topbar">
              <div className="wordmark">
                <span className="wordmark-cart">Cart</span>
                <span className="wordmark-cleanse">Cleanse</span>
              </div>

              <div className="compare-meta">
                <span className="meta-item">05 — Compare</span>
              </div>
            </div>

            <div className="compare-hero">
              <div className="compare-copy">
                <h1 className="compare-title">Preference signal captured.</h1>
                <p className="compare-subtitle">
                  {compareMode === "tie-break"
                    ? "We used a focused tie-break pass to separate the strongest contenders before final scoring."
                    : "We now have enough tradeoffs to score your strongest preferences for this round."}
                </p>
              </div>
            </div>
          </header>

          <main className="compare-main">
            <div className="compare-summary-bar">
              <p className="compare-summary-text">
                {pairwiseOutcomes.length} new comparisons recorded · {comparedItems.length} items scored next
              </p>
            </div>

            <div className="compare-grid">
              {comparedItems.map((item) => (
                <article key={item.id} className="compare-card compare-card-static">
                  <div className="compare-image-wrap">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="compare-image"
                    />
                  </div>

                  <div className="compare-card-content">
                    <p className="compare-brand">{item.brand}</p>
                    <h2 className="compare-card-title">{item.title}</h2>
                    <p className="compare-price">
                      {item.price || "Price unavailable"}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="compare-actions-row">
              <button type="button" className="compare-secondary" onClick={onBack}>
                {backLabel}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const progressLabel = `${compareMode === "tie-break" ? "Tie-break" : "Matchup"} ${Math.min(matchupIndex + 1, pairSchedule.length || 1)} of ${pairSchedule.length || 1}`;
  const summaryLabel =
    compareMode === "tie-break"
      ? `${items.length} tied contenders still being measured · sharpening the final shortlist`
      : `${items.length} items still being measured · narrowing toward a trustworthy final shortlist`;

  return (
    <div className="page-shell">
      <div className="compare-shell">
        <header className="compare-header">
          <div className="compare-topbar">
            <div className="wordmark">
              <span className="wordmark-cart">Cart</span>
              <span className="wordmark-cleanse">Cleanse</span>
            </div>

            <div className="compare-meta">
              <span className="meta-item">05 — Compare</span>
            </div>
          </div>

          <div className="compare-hero">
            <div className="compare-copy">
              <h1 className="compare-title">Which do you prefer?</h1>
              <p className="compare-subtitle">
                {compareMode === "tie-break"
                  ? "These items were too close to call, so we’re running a short tie-break round to separate the strongest contenders."
                  : "We’re showing a focused set of tradeoffs to learn your strongest preferences for this round."}
              </p>
            </div>
          </div>

          <div className="compare-progress-row">
            <span className="progress-line" />
            <p className="compare-progress">{progressLabel}</p>
            <span className="progress-line" />
          </div>
        </header>

        <main className="compare-main">
          <div className="compare-summary-bar">
            <p className="compare-summary-text">{summaryLabel}</p>
          </div>

          <div className="compare-grid">
            {[leftItem, rightItem].map((item) => {
              if (!item) return null;

              const isSelected = selectedId === item.id;
              const isMuted = selectedId && selectedId !== item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`compare-card ${
                    isSelected ? "is-selected" : ""
                  } ${isMuted ? "is-muted" : ""}`}
                  onClick={() => handlePick(item.id)}
                  disabled={Boolean(selectedId)}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    pointerEvents: "auto",
                    cursor: "pointer",
                  }}
                >
                  <div className="compare-image-wrap" style={{ pointerEvents: "none" }}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="compare-image"
                      style={{ pointerEvents: "none" }}
                    />
                  </div>

                  <div className="compare-card-content" style={{ pointerEvents: "none" }}>
                    <p className="compare-brand" style={{ pointerEvents: "none" }}>{item.brand}</p>
                    <h2 className="compare-card-title" style={{ pointerEvents: "none" }}>{item.title}</h2>
                    <p className="compare-price" style={{ pointerEvents: "none" }}>
                      {item.price || "Price unavailable"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="compare-actions-row">
            <button type="button" className="compare-secondary" onClick={onBack}>
              {backLabel}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}