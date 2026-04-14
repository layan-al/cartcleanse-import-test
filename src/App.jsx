import { useEffect, useState } from "react";
import { mockItems } from "./mockItems";
import SetupPage from "./pages/SetupPage";
import InstallPage from "./pages/InstallPage";
import SetGoalPage from "./pages/SetGoalPage";
import ComparePage from "./pages/ComparePage";
import ResultsPage from "./pages/ResultsPage";
import QuickCutPage from "./pages/QuickCutPage";


function readImportedItemsFromHash() {
  if (typeof window === "undefined") return null;

  const rawHash = window.location.hash || "";
  const prefix = "#import=";

  if (!rawHash.startsWith(prefix)) return null;

  try {
    const encoded = rawHash.slice(prefix.length);
    const parsed = JSON.parse(decodeURIComponent(encoded));

    if (!Array.isArray(parsed)) return null;

    return parsed.filter(
      (item) => item && (item.title || item.image || item.url || item.brand)
    );
  } catch (error) {
    console.error("Failed to parse CartCleanse import payload", error);
    return null;
  }
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

function resolveKeepMode(session) {
  if (session.keepTarget === "You pick") return "you-pick";
  if (session.keepTarget === "No target") return "no-target";
  if (session.keepTarget === "Custom") return "custom";
  return "exact";
}

function resolveBudget(session) {
  if (session.budgetMode === "none") return null;

  if (session.budgetMode === "custom") {
    const parsed = Number(session.customBudgetValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const parsed = Number(session.budgetValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}


function parseItemPrice(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function filterCandidateItemsForSession(items, session) {
  const budget = resolveBudget(session);
  const sourceItems = items || [];

  if (!Number.isFinite(budget)) return sourceItems;

  const budgetEligibleItems = sourceItems.filter((item) => {
    const price = parseItemPrice(item.price);
    return price == null || price <= budget;
  });

  const keepMode = resolveKeepMode(session);
  const keepTarget = resolveKeepTarget(session);
  const isExactCountMode =
    (keepMode === "exact" || keepMode === "custom") &&
    Number.isFinite(keepTarget) &&
    keepTarget > 1;

  if (!isExactCountMode) {
    return budgetEligibleItems;
  }

  const smartFilteredItems = budgetEligibleItems.filter((item) => {
    const itemPrice = parseItemPrice(item.price);
    if (itemPrice == null) return true;

    const companionPrices = budgetEligibleItems
      .filter((otherItem) => otherItem.id !== item.id)
      .map((otherItem) => parseItemPrice(otherItem.price))
      .filter((price) => price != null)
      .sort((a, b) => a - b)
      .slice(0, keepTarget - 1);

    if (companionPrices.length < keepTarget - 1) {
      return true;
    }

    const minimumPossibleTotal =
      itemPrice + companionPrices.reduce((sum, price) => sum + price, 0);

    return minimumPossibleTotal <= budget;
  });

  return smartFilteredItems.length > 0 ? smartFilteredItems : budgetEligibleItems;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("setup");

  const [session, setSession] = useState({
    candidateItems: mockItems,
    baseCandidateItems: mockItems,
    importedItems: mockItems,
    keepTarget: 3,
    customKeepValue: "",
    budgetMode: "preset",
    budgetValue: 500,
    customBudgetValue: "",
    pairwiseOutcomes: [],
    finalistIds: [],
    tieBreakRound: false,
    tieBreakItemIds: [],
    tieBreakComplete: false,
  });

  function updateSession(patch) {
    setSession((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    const importedItems = readImportedItemsFromHash();

    if (!importedItems || importedItems.length === 0) return;

    setSession((prev) => ({
      ...prev,
      importedItems,
      candidateItems: importedItems,
      baseCandidateItems: importedItems,
      pairwiseOutcomes: [],
      finalistIds: [],
    }));

    setCurrentPage("quick-cut");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (currentPage === "setup") {
    return <SetupPage onOpenInstall={() => setCurrentPage("install")} />;
  }

  if (currentPage === "install") {
    return (
      <InstallPage
        onBack={() => setCurrentPage("setup")}
        onInstalled={() => setCurrentPage("quick-cut")}
      />
    );
  }

  if (currentPage === "quick-cut") {
    return (
      <QuickCutPage
        session={session}
        onBack={() => setCurrentPage("install")}
        onContinue={(candidateItems) => {
          updateSession({
            candidateItems,
            baseCandidateItems: candidateItems,
          });
          setCurrentPage("set-goal");
        }}
      />
    );
  }

  if (currentPage === "set-goal") {
    return (
      <SetGoalPage
        keepTarget={session.keepTarget}
        customKeepValue={session.customKeepValue}
        budgetMode={session.budgetMode}
        budgetValue={session.budgetValue}
        customBudgetValue={session.customBudgetValue}
        onKeepTargetChange={(value) => updateSession({ keepTarget: value })}
        onCustomKeepChange={(value) =>
          updateSession({ customKeepValue: value })
        }
        onBudgetPresetSelect={(value) =>
          updateSession({
            budgetMode: "preset",
            budgetValue: value,
          })
        }
        onNoBudgetSelect={() =>
          updateSession({
            budgetMode: "none",
            budgetValue: null,
            customBudgetValue: "",
          })
        }
        onCustomBudgetSelect={() =>
          updateSession({
            budgetMode: "custom",
            budgetValue: null,
          })
        }
        onCustomBudgetChange={(value) =>
          updateSession({ customBudgetValue: value })
        }
        onBack={() => setCurrentPage("quick-cut")}
        onStartNarrowing={() => {
          const sourceItems = session.baseCandidateItems || session.candidateItems || [];

          const candidateItems = filterCandidateItemsForSession(
            sourceItems,
            session
          );

          updateSession({
            candidateItems,
            pairwiseOutcomes: [],
            finalistIds: [],
            tieBreakRound: false,
            tieBreakItemIds: [],
            tieBreakComplete: false,
          });
          setCurrentPage("compare");
        }}
      />
    );
  }

  if (currentPage === "compare") {
    return (
      <ComparePage
        session={session}
        onBack={() => setCurrentPage(session.tieBreakRound ? "results" : "set-goal")}
        onCompareComplete={(patch) => {
          const nextPairwiseOutcomes = patch.pairwiseOutcomes || [];
          const nextFinalistIds = patch.finalistIds || [];
          const keepMode = resolveKeepMode(session);
          const keepTarget = resolveKeepTarget(session);
          const candidateItems = (session.candidateItems || []).filter((item) =>
            nextFinalistIds.includes(item.id)
          );
          const tasteScores = computeBradleyTerryScores(
            candidateItems.map((item) => item.id),
            nextPairwiseOutcomes
          );
          const tieCluster = getTopTieCluster(
            candidateItems,
            tasteScores,
            keepMode,
            keepTarget
          );

          if (!patch.tieBreakComplete && tieCluster.needsTieBreak) {
            updateSession({
              ...patch,
              pairwiseOutcomes: nextPairwiseOutcomes,
              finalistIds: nextFinalistIds,
              tieBreakRound: true,
              tieBreakItemIds: tieCluster.items.map((item) => item.id),
              tieBreakComplete: false,
            });
            setCurrentPage("compare");
            return;
          }

          updateSession({
            ...patch,
            pairwiseOutcomes: nextPairwiseOutcomes,
            finalistIds: nextFinalistIds,
            tieBreakRound: false,
            tieBreakItemIds: [],
          });
          setCurrentPage("results");
        }}
      />
    );
  }

    if (currentPage === "results") {
    return (
      <ResultsPage
        session={session}
        onBack={() => setCurrentPage("compare")}
      />
    );
  }
  return null;
}