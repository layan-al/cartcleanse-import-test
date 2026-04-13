import { useEffect, useMemo, useState } from "react";
import "../styles/results.css";

function isAccessoryItem(item) {
  const label = `${item?.brand || ""} ${item?.title || ""}`.toLowerCase();
  return /(necklace|belt|choker|pendant|medal|bracelet|earring|ring|jewelry)/.test(label);
}

function resolveKeepMode(session) {
  if (session.keepTarget === "You pick") return "you-pick";
  if (session.keepTarget === "No target") return "no-target";
  if (session.keepTarget === "Custom") return "custom";
  return "exact";
}

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

function resolveBudget(session) {
  if (session.budgetMode === "none") return Infinity;

  if (session.budgetMode === "custom") {
    const parsed = Number(session.customBudgetValue);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Infinity;
  }

  const parsed = Number(session.budgetValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Infinity;
}

function parsePrice(value) {
  if (!value) return Infinity;

  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return Infinity;

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : Infinity;
}

function normalizeScores(rawScores, ids) {
  if (ids.length === 0) return {};

  const values = ids.map((id) => rawScores[id] ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return Object.fromEntries(ids.map((id) => [id, 0.5]));
  }

  return Object.fromEntries(
    ids.map((id) => [id, (rawScores[id] - min) / (max - min)])
  );
}

function computeBradleyTerryScores(ids, outcomes) {
  if (ids.length === 0) return {};

  const abilities = Object.fromEntries(ids.map((id) => [id, 1]));
  const wins = Object.fromEntries(ids.map((id) => [id, 0]));

  outcomes.forEach((outcome) => {
    if (wins[outcome.winnerId] !== undefined) {
      wins[outcome.winnerId] += 1;
    }
  });

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const nextAbilities = {};

    ids.forEach((id) => {
      let denominator = 0;

      outcomes.forEach((outcome) => {
        if (outcome.leftId !== id && outcome.rightId !== id) return;

        const opponentId =
          outcome.leftId === id ? outcome.rightId : outcome.leftId;
        const ability = abilities[id] ?? 1;
        const opponentAbility = abilities[opponentId] ?? 1;
        denominator += 1 / (ability + opponentAbility);
      });

      const safeWins = Math.max(wins[id], 0.01);
      nextAbilities[id] =
        denominator > 0 ? safeWins / denominator : abilities[id];
    });

    ids.forEach((id) => {
      abilities[id] = Math.max(nextAbilities[id], 0.0001);
    });
  }

  const logScores = Object.fromEntries(
    ids.map((id) => [id, Math.log(abilities[id])])
  );

  return normalizeScores(logScores, ids);
}

function buildComparisonStats(ids, outcomes) {
  const stats = Object.fromEntries(
    ids.map((id) => [id, { appearances: 0, wins: 0, losses: 0 }])
  );

  outcomes.forEach((outcome) => {
    if (stats[outcome.leftId]) {
      stats[outcome.leftId].appearances += 1;
    }

    if (stats[outcome.rightId]) {
      stats[outcome.rightId].appearances += 1;
    }

    if (stats[outcome.winnerId]) {
      stats[outcome.winnerId].wins += 1;
    }

    const loserId =
      outcome.winnerId === outcome.leftId ? outcome.rightId : outcome.leftId;

    if (stats[loserId]) {
      stats[loserId].losses += 1;
    }
  });

  return stats;
}

function getTopTieCluster(candidateItems, tasteScores, keepMode, keepTarget) {
  if (!candidateItems.length) {
    return {
      threshold: 0.03,
      topScore: null,
      items: [],
      needsTieBreak: false,
    };
  }

  const threshold = 0.03;
  const sortedItems = [...candidateItems].sort(
    (a, b) => (tasteScores[b.id] ?? 0) - (tasteScores[a.id] ?? 0)
  );
  const topScore = tasteScores[sortedItems[0].id] ?? 0;
  const items = sortedItems.filter(
    (item) => topScore - (tasteScores[item.id] ?? 0) <= threshold
  );

  const minimumClusterSize =
    keepMode === "exact" && Number.isFinite(keepTarget) ? keepTarget + 1 : 4;

  return {
    threshold,
    topScore,
    items,
    needsTieBreak: items.length >= minimumClusterSize,
  };
}

function generateSubsets(items, targetSize) {
  const subsets = [];

  function backtrack(startIndex, currentSubset) {
    if (currentSubset.length === targetSize) {
      subsets.push([...currentSubset]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      currentSubset.push(items[index]);
      backtrack(index + 1, currentSubset);
      currentSubset.pop();
    }
  }

  backtrack(0, []);
  return subsets;
}

function chooseBestBudgetOnlySet(items, budget, scores) {
  let bestEntry = null;

  for (let size = 1; size <= items.length; size += 1) {
    const subsets = generateSubsets(items, size);

    subsets.forEach((subset) => {
      const totalPrice = subset.reduce(
        (sum, item) => sum + item.numericPrice,
        0
      );
      const totalScore = subset.reduce(
        (sum, item) => sum + (scores[item.id] ?? 0),
        0
      );
      const averageScore = totalScore / subset.length;

      if (totalPrice > budget) return;

      const entry = {
        subset,
        totalPrice,
        totalScore,
        averageScore,
      };

      if (!bestEntry) {
        bestEntry = entry;
        return;
      }

      if (entry.totalScore > bestEntry.totalScore) {
        bestEntry = entry;
        return;
      }

      if (
        entry.totalScore === bestEntry.totalScore &&
        entry.averageScore > bestEntry.averageScore
      ) {
        bestEntry = entry;
        return;
      }

      if (
        entry.totalScore === bestEntry.totalScore &&
        entry.averageScore === bestEntry.averageScore &&
        entry.totalPrice < bestEntry.totalPrice
      ) {
        bestEntry = entry;
      }
    });
  }

  return bestEntry ? bestEntry.subset : [];
}

function chooseNoTargetSet(items, budget, scores) {
  return chooseBestBudgetOnlySet(items, budget, scores);
}

function chooseYouPickSet(items, budget, scores) {
  const affordableItems = items
    .filter((item) => item.numericPrice <= budget)
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  if (affordableItems.length === 0) return [];

  const dropOffBar = 0.17;
  const epsilon = 0.0001;
  const chosen = [affordableItems[0]];
  let runningTotal = affordableItems[0].numericPrice;

  for (let index = 1; index < affordableItems.length; index += 1) {
    const nextItem = affordableItems[index];
    const previousChosen = chosen[chosen.length - 1];
    const previousScore = scores[previousChosen.id] ?? 0;
    const nextScore = scores[nextItem.id] ?? 0;
    const gap = previousScore - nextScore;

    if (gap - dropOffBar > epsilon) {
      break;
    }

    if (runningTotal + nextItem.numericPrice <= budget) {
      chosen.push(nextItem);
      runningTotal += nextItem.numericPrice;
    }
  }

  return chosen;
}

function getRunDiagnostics({
  candidateItems,
  tasteScores,
  keepIds,
  holdIds,
  budget,
  keepTargetLabel,
  sessionKeepTarget,
  comparisonStats,
  tieCluster,
}) {
  const sortedItems = [...candidateItems].sort(
    (a, b) => (tasteScores[b.id] ?? 0) - (tasteScores[a.id] ?? 0)
  );

  const keepIdSet = new Set(keepIds);
  const holdIdSet = new Set(holdIds);

  const rows = sortedItems.map((item, index) => {
    const score = tasteScores[item.id] ?? 0;
        const itemStats = comparisonStats[item.id] ?? {
      appearances: 0,
      wins: 0,
      losses: 0,
    };
    const previousScore =
      index > 0 ? tasteScores[sortedItems[index - 1].id] ?? 0 : null;
    const gapFromPrevious =
      previousScore == null ? null : previousScore - score;

    let status = "Not selected";
    if (keepIdSet.has(item.id)) status = "Keep";
    if (holdIdSet.has(item.id)) status = "Hold";

    let reason = "Not surfaced in the final shortlist.";
    if (keepIdSet.has(item.id)) {
      reason = "Included in the final selected set.";
    } else if (holdIdSet.has(item.id)) {
      reason = Number.isFinite(item.numericPrice)
        ? "Strong leftover, but not included in the final set."
        : "Strong leftover, but price was unavailable or sold out.";
    } else if (!Number.isFinite(item.numericPrice)) {
      reason = "Not selected because the price was unavailable or sold out.";
    }

        return {
      id: item.id,
      brand: item.brand,
      title: item.title,
      price: item.price,
      score,
      appearances: itemStats.appearances,
      record: `${itemStats.wins}W-${itemStats.losses}L`,
      inTieCluster: tieCluster.items.some((tiedItem) => tiedItem.id === item.id),
      gapFromPrevious,
      status,
      reason,
    };
  });

  const keepTotal = keepIds.reduce((sum, id) => {
    const item = candidateItems.find((candidate) => candidate.id === id);
    return sum + (item?.numericPrice ?? 0);
  }, 0);

  let modeLabel = keepTargetLabel;
  if (sessionKeepTarget === "No target") modeLabel = "No target";
  if (sessionKeepTarget === "You pick") modeLabel = "You pick";

    return {
    modeLabel,
    budget,
    keepTotal,
    rows,
    tieClusterCount: tieCluster.items.length,
    tieClusterThreshold: tieCluster.threshold,
    tieClusterTopScore: tieCluster.topScore,
    needsTieBreak: tieCluster.needsTieBreak,
    tieClusterTitles: tieCluster.items.map((item) => item.title),
    tieClusterIds: tieCluster.items.map((item) => item.id),
  };
}

function chooseKeepSet(items, keepTarget, budget, scores) {
  if (keepTarget == null) {
    return chooseBestBudgetOnlySet(items, budget, scores);
  }

  for (let size = keepTarget; size >= 1; size -= 1) {
    const subsets = generateSubsets(items, size);

    const feasibleSubsets = subsets
      .map((subset) => {
        const totalPrice = subset.reduce(
          (sum, item) => sum + item.numericPrice,
          0
        );
        const totalScore = subset.reduce(
          (sum, item) => sum + (scores[item.id] ?? 0),
          0
        );

        return {
          subset,
          totalPrice,
          totalScore,
        };
      })
      .filter((entry) => entry.totalPrice <= budget);

    if (feasibleSubsets.length > 0) {
      feasibleSubsets.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.totalPrice - b.totalPrice;
      });

      return feasibleSubsets[0].subset;
    }
  }

  return [];
}

function getKeepReason(itemId, keepIds, scores, budgetLabel) {
  const sortedKeep = [...keepIds].sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)
  );
  const strongestKeepId = sortedKeep[0];

  if (itemId === strongestKeepId) {
    return "Selected because it was one of your strongest preference signals and fit the final set.";
  }

  return `Selected because it helped form the strongest final set${budgetLabel}.`;
}

function getHoldReason(itemId, holdIds, scores) {
  const strongestHold = [...holdIds].sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)
  )[0];

  if (itemId === strongestHold) {
    return "Held because it was a strong contender, but another combination made better use of this session’s budget.";
  }

  return "Held because it performed strongly, but wasn’t included in the final selected combination.";
}

function getNextHoldReplacement(holdIds, keepIds, itemsById) {
  return (
    holdIds
      .map((id) => itemsById[id])
      .filter(Boolean)
      .find((item) => !keepIds.includes(item.id)) || null
  );
}

function buildUpdatedHoldIds(candidateIds, keepIds, tasteScores) {
  return candidateIds
    .filter((id) => !keepIds.includes(id))
    .sort((a, b) => (tasteScores[b] ?? 0) - (tasteScores[a] ?? 0))
    .slice(0, 3);
}

function getPressureTestItems(keepIds, itemsById) {
  return keepIds.map((id) => itemsById[id]).filter(Boolean);
}

function getWeakestKeepId(keepIds, scores) {
  if (!keepIds.length) return null;

  return [...keepIds].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0))[0];
}

function buildSwappedKeepIds(keepIds, holdItemId, scores) {
  if (keepIds.includes(holdItemId)) return keepIds;

  const weakestKeepId = getWeakestKeepId(keepIds, scores);
  if (!weakestKeepId) return [...keepIds, holdItemId];

  return keepIds.map((id) => (id === weakestKeepId ? holdItemId : id));
}
export default function ResultsPage({ session, onBack }) {
  const [openReasonId, setOpenReasonId] = useState(null);
  const [manualKeepIds, setManualKeepIds] = useState(null);
  const [manualHoldIds, setManualHoldIds] = useState(null);
  const [isPressureOpen, setIsPressureOpen] = useState(false);
  const [pressureIndex, setPressureIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [pressedAnswer, setPressedAnswer] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const allItems = session.candidateItems || [];
  const finalistIds = session.finalistIds || allItems.map((item) => item.id);
  const pairwiseOutcomes = session.pairwiseOutcomes || [];
  const keepMode = resolveKeepMode(session);
  const keepTarget = resolveKeepTarget(session);
  const budget = resolveBudget(session);

  const itemsById = useMemo(
    () => Object.fromEntries(allItems.map((item) => [item.id, item])),
    [allItems]
  );

  const scoredItems = useMemo(() => {
    const candidateItems = finalistIds
      .map((id) => itemsById[id])
      .filter(Boolean)
      .map((item) => ({
        ...item,
        numericPrice: parsePrice(item.price),
      }));

    const tasteScores = computeBradleyTerryScores(
      candidateItems.map((item) => item.id),
      pairwiseOutcomes
    );

        const comparisonStats = buildComparisonStats(
      candidateItems.map((item) => item.id),
      pairwiseOutcomes
    );

    const tieCluster = getTopTieCluster(
      candidateItems,
      tasteScores,
      keepMode,
      keepTarget
    );

    let keepSet = [];

    if (keepMode === "you-pick") {
      keepSet = chooseYouPickSet(candidateItems, budget, tasteScores);
    } else if (keepMode === "no-target") {
      keepSet = chooseNoTargetSet(candidateItems, budget, tasteScores);
    } else {
      keepSet = chooseKeepSet(candidateItems, keepTarget, budget, tasteScores);
    }

    const keepIds = keepSet.map((item) => item.id);

    const holdItems = candidateItems
      .filter((item) => !keepIds.includes(item.id))
      .sort((a, b) => (tasteScores[b.id] ?? 0) - (tasteScores[a.id] ?? 0))
      .slice(0, 3);

    const holdIds = holdItems.map((item) => item.id);

    const debug = getRunDiagnostics({
      candidateItems,
      tasteScores,
      keepIds,
      holdIds,
      budget,
      comparisonStats,
      tieCluster,
      keepTargetLabel:
        keepMode === "you-pick"
          ? "You pick"
          : keepMode === "no-target"
          ? "No target"
          : String(keepTarget),
      sessionKeepTarget: session.keepTarget,
    });

    return {
      candidateItems,
      candidateIds: candidateItems.map((item) => item.id),
      tasteScores,
      keepIds,
      holdIds,
      debug,
    };
  }, [budget, finalistIds, itemsById, keepMode, keepTarget, pairwiseOutcomes]);

  const activeKeepIds = manualKeepIds ?? scoredItems.keepIds;
  const activeHoldIds = manualHoldIds ?? scoredItems.holdIds;

  const keepItems = activeKeepIds.map((id) => itemsById[id]).filter(Boolean);
  const holdItems = activeHoldIds.map((id) => itemsById[id]).filter(Boolean);
  const pressureItems = getPressureTestItems(activeKeepIds, itemsById);
  const currentPressureItem = pressureItems[pressureIndex] || null;

  const budgetLabel = Number.isFinite(budget)
    ? " within your budget"
    : " for this round";

  useEffect(() => {
    setManualKeepIds(null);
    setManualHoldIds(null);
    setIsPressureOpen(false);
    setPressureIndex(0);
    setToast(null);
    setShowDebug(false);
    setPressedAnswer(null);
  }, [
    session.pairwiseOutcomes,
    session.finalistIds,
    session.keepTarget,
    session.budgetMode,
    session.budgetValue,
    session.customBudgetValue,
  ]);

  function toggleReason(id) {
    setOpenReasonId((prev) => (prev === id ? null : id));
  }

  function openPressureTest() {
    if (pressureItems.length === 0) return;
    setPressureIndex(0);
    setPressedAnswer(null);
    setToast(null);
    setIsPressureOpen(true);
  }

  function closePressureTest() {
    setIsPressureOpen(false);
    setPressedAnswer(null);
  }

  function setManualState(nextKeepIds) {
    const nextHoldIds = buildUpdatedHoldIds(
      scoredItems.candidateIds,
      nextKeepIds,
      scoredItems.tasteScores
    );

    setManualKeepIds(nextKeepIds);
    setManualHoldIds(nextHoldIds);

    return nextHoldIds;
  }

    function handleMoveHoldToKeep(itemId) {
    const previousKeepIds = [...activeKeepIds];
    const previousHoldIds = [...activeHoldIds];

    const nextKeepIds = buildSwappedKeepIds(
      activeKeepIds,
      itemId,
      scoredItems.tasteScores
    );

    setManualState(nextKeepIds);

    setToast({
      message: "Moved to Keep.",
      undo: () => {
        setManualKeepIds(previousKeepIds);
        setManualHoldIds(previousHoldIds);
      },
    });
  }

  function handlePressureKeep() {
    const nextIndex = pressureIndex + 1;
    setToast({ message: "Stayed in Keep.", undo: null });

    if (nextIndex >= pressureItems.length) {
      setIsPressureOpen(false);
      return;
    }

    setPressureIndex(nextIndex);
  }

  function handlePressureHold() {
    if (!currentPressureItem) return;

    const previousKeepIds = [...activeKeepIds];
    const previousHoldIds = [...activeHoldIds];
    const itemId = currentPressureItem.id;
    const nextKeepIds = activeKeepIds.filter((id) => id !== itemId);

    setManualState(nextKeepIds);

    setToast({
      message: "Moved to Hold.",
      undo: () => {
        setManualKeepIds(previousKeepIds);
        setManualHoldIds(previousHoldIds);
        setPressureIndex(pressureIndex);
        setIsPressureOpen(true);
      },
    });

    const nextPressureItems = getPressureTestItems(nextKeepIds, itemsById);
    if (
      nextPressureItems.length === 0 ||
      pressureIndex >= nextPressureItems.length
    ) {
      setIsPressureOpen(false);
    }
  }

  function handlePressureReplace() {
    if (!currentPressureItem) return;

    const previousKeepIds = [...activeKeepIds];
    const previousHoldIds = [...activeHoldIds];
    const itemId = currentPressureItem.id;
    const remainingKeepIds = activeKeepIds.filter((id) => id !== itemId);
    const replacement = getNextHoldReplacement(
      activeHoldIds,
      remainingKeepIds,
      itemsById
    );
    const nextKeepIds = replacement
      ? [...remainingKeepIds, replacement.id]
      : remainingKeepIds;

    setManualState(nextKeepIds);

    setToast({
      message: replacement ? "Replaced with next backup." : "Removed from Keep.",
      undo: () => {
        setManualKeepIds(previousKeepIds);
        setManualHoldIds(previousHoldIds);
        setPressureIndex(pressureIndex);
        setIsPressureOpen(true);
      },
    });

    const nextPressureItems = getPressureTestItems(nextKeepIds, itemsById);
    if (
      nextPressureItems.length === 0 ||
      pressureIndex >= nextPressureItems.length
    ) {
      setIsPressureOpen(false);
    }
  }

  function flashAnswer(answer, action) {
    setPressedAnswer(answer);

    setTimeout(() => {
      action();
      setPressedAnswer(null);
    }, 180);
  }

  function handleUndo() {
    if (toast?.undo) {
      const undoFn = toast.undo;
      setToast(null);
      undoFn();
    }
  }



  return (
    <div className="page-shell">
      <div className="results-shell">
        <header className="results-header">
          <div className="results-topbar">
            <div className="wordmark">
              <span className="wordmark-cart">Cart</span>
              <span className="wordmark-cleanse">Cleanse</span>
            </div>

            <div className="results-meta">
              <span className="meta-item">Results</span>
              <span className="meta-slash" />
              <span className="meta-item">{keepItems.length} Keep</span>
              <span className="meta-slash" />
              <span className="meta-item meta-strong">{holdItems.length} Hold</span>
            </div>
          </div>

          <div className="results-hero">
            <div className="results-copy">
              <h1 className="results-title">Your shortlist.</h1>
              <p className="results-subtitle">
                We scored your strongest preferences, then built the best shortlist for this session based on your selected mode and budget.
              </p>
            </div>

            <div className="results-hero-actions">
              <button
                className="pressure-button"
                type="button"
                onClick={openPressureTest}
                disabled={keepItems.length === 0}
              >
                Pressure test picks
              </button>

              <button
                className="pressure-button pressure-button-secondary"
                type="button"
                onClick={() => setShowDebug((prev) => !prev)}
              >
                {showDebug ? "Hide debug data" : "Show debug data"}
              </button>

              <button
                className="pressure-button pressure-button-secondary"
                type="button"
                onClick={onBack}
              >
                Back to compare
              </button>
            </div>
          </div>
        </header>

        <main className="results-main">
          {showDebug && (
            <section className="results-section results-section-diagnostics">
              <div className="section-header">
                <p className="section-label">Debug this run</p>
              </div>

              <div className="debug-panel">
                <div className="debug-summary-grid">
                  <div className="debug-summary-card">
                    <span className="debug-summary-label">Mode</span>
                    <span className="debug-summary-value">
                      {scoredItems.debug.modeLabel}
                    </span>
                  </div>

                  <div className="debug-summary-card">
                    <span className="debug-summary-label">Budget</span>
                    <span className="debug-summary-value">
                      {Number.isFinite(scoredItems.debug.budget)
                        ? `$${scoredItems.debug.budget.toFixed(0)}`
                        : "No budget"}
                    </span>
                  </div>

                  <div className="debug-summary-card">
                    <span className="debug-summary-label">Keep total</span>
                    <span className="debug-summary-value">
                      ${scoredItems.debug.keepTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                {scoredItems.debug.needsTieBreak && (
  <div className="debug-tie-banner">
    <p className="debug-tie-copy">
      Top tie detected across {scoredItems.debug.tieClusterCount} items
within {scoredItems.debug.tieClusterThreshold.toFixed(2)} of the
top score. Debug note: this cluster met the tie-break threshold.
    </p>
  </div>
)}
                <div className="debug-table-wrap">
                  <table className="debug-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Taste</th>
                        <th>Seen</th>
                        <th>Record</th>
                        <th>Gap</th>
                        <th>Status</th>
                        <th>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoredItems.debug.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="debug-item-cell">
                              <span className="debug-item-brand">{row.brand}</span>
                              <span className="debug-item-title">{row.title}</span>
                            </div>
                          </td>
                          <td>{row.price || "Price unavailable"}</td>
                          <td>{row.score.toFixed(3)}</td>
                          <td>{row.appearances}</td>
                          <td>{row.record}</td>
                          <td>
                            {row.gapFromPrevious == null
                              ? "—"
                              : row.gapFromPrevious.toFixed(3)}
                          </td>
                          <td>
                            {row.status}
                            {row.inTieCluster ? " • Tie cluster" : ""}
                          </td>
                          <td>{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <section className="results-section">
            <div className="section-header">
              <p className="section-label">Keep now</p>
            </div>

            <div className="results-grid keep-grid">
              {keepItems.map((item) => {
                const isOpen = openReasonId === item.id;

                return (
                  <article key={item.id} className="result-card keep-card">
                    <div
  className={`result-image-wrap ${
    isAccessoryItem(item) ? "is-accessory-image" : ""
  }`}
>
  <img
    src={item.image}
    alt={item.title}
    className="result-image"
  />
</div>

                    <div className="result-content">
                      <p className="result-brand">{item.brand}</p>
                      <h3 className="result-title-card">{item.title}</h3>
                      <p className="result-price">
                        {item.price || "Price unavailable"}
                      </p>

                      <button
                        type="button"
                        className="result-link"
                        onClick={() => toggleReason(item.id)}
                      >
                        ⓘ
                      </button>

                      {isOpen && (
                        <p className="result-reason">
                          {getKeepReason(
                            item.id,
                            activeKeepIds,
                            scoredItems.tasteScores,
                            budgetLabel
                          )}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="results-section">
            <div className="section-header">
              <p className="section-label">Hold for later</p>
            </div>

            <div className="results-grid hold-grid">
              {holdItems.map((item) => {
                const isOpen = openReasonId === item.id;

                return (
                  <article key={item.id} className="result-card hold-card">
                    <div
  className={`result-image-wrap ${
    isAccessoryItem(item) ? "is-accessory-image" : ""
  }`}
>
  <img
    src={item.image}
    alt={item.title}
    className="result-image"
  />
</div>

                    <div className="result-content">
                      <p className="result-brand">{item.brand}</p>
                      <h3 className="result-title-card">{item.title}</h3>
                      <p className="result-price">
                        {item.price || "Price unavailable"}
                      </p>

                      <button
                        type="button"
                        className="result-link"
                        onClick={() => toggleReason(item.id)}
                      >
                        ⓘ
                      </button>

                                            <button
                        type="button"
                        className="result-link result-link-secondary"
                        onClick={() => handleMoveHoldToKeep(item.id)}
                      >
                        Move to Keep
                      </button>

                      {isOpen && (
                        <p className="result-reason">
                          {getHoldReason(
                            item.id,
                            activeHoldIds,
                            scoredItems.tasteScores
                          )}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {isPressureOpen && currentPressureItem && (
        <div className="modal-backdrop" onClick={closePressureTest}>
          <div
            className="pressure-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pressure-modal-top">
              <h2 className="pressure-modal-title">Pressure Test</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closePressureTest}
                aria-label="Close pressure test"
              >
                ×
              </button>
            </div>

            <div className="pressure-item-row">
              <div className="pressure-item-image-wrap">
                <img
                  src={currentPressureItem.image}
                  alt={currentPressureItem.title}
                  className="pressure-item-image"
                />
              </div>

              <div className="pressure-item-copy">
                <p className="pressure-item-brand">{currentPressureItem.brand}</p>
                <p className="pressure-item-title">{currentPressureItem.title}</p>
                <p className="pressure-item-price">
                  {currentPressureItem.price || "Price unavailable"}
                </p>
              </div>
            </div>

            <p className="pressure-question">
              If this disappeared tomorrow, would you try to find it again?
            </p>

            <p className="pressure-helper">Final gut-check for this pick.</p>

            <div className="pressure-actions">
              <button
                type="button"
                className={`pressure-answer pressure-answer-primary ${
                  pressedAnswer === "yes" ? "is-active" : ""
                }`}
                onClick={() => flashAnswer("yes", handlePressureKeep)}
              >
                Yes — Keep it
              </button>

              <button
                type="button"
                className={`pressure-answer pressure-answer-secondary ${
                  pressedAnswer === "maybe" ? "is-active" : ""
                }`}
                onClick={() => flashAnswer("maybe", handlePressureHold)}
              >
                Maybe — Hold it
              </button>

              <button
                type="button"
                className={`pressure-answer pressure-answer-secondary ${
                  pressedAnswer === "no" ? "is-active" : ""
                }`}
                onClick={() => flashAnswer("no", handlePressureReplace)}
              >
                No — Replace it
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" className="toast-undo" onClick={handleUndo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}