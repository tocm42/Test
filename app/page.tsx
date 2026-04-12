"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type GameState,
  type Holding,
  type SuggestionPick,
  type SuggestionsResponse,
  getInitialState,
  saveState,
  loadState,
  generatePriceTrajectory,
  totalPortfolioValue,
  pctChange,
} from "./utils";
import WelcomeScreen from "./components/WelcomeScreen";
import Dashboard from "./components/Dashboard";
import EndScreen from "./components/EndScreen";

export default function Home() {
  const [state, setState] = useState<GameState>(getInitialState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setState(saved);
    }
    setHydrated(true);
  }, []);

  // Persist state changes
  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [state, hydrated]);

  const updateState = useCallback((partial: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Actions ──

  const handleStart = useCallback(() => {
    updateState({ screen: "dashboard" });
  }, [updateState]);

  const handleGetSuggestions = useCallback(async () => {
    updateState({ loading: true, error: null });

    const recentTrades = state.tradeHistory
      .slice(-5)
      .map((t) => `${t.action} ${t.ticker} on day ${t.day}`);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cash: state.cash,
          holdings: state.holdings.map((h) => ({
            ticker: h.ticker,
            shares: h.shares,
            currentPrice: h.currentPrice,
          })),
          day: state.day,
          recentTrades,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const suggestions: SuggestionsResponse = await res.json();
      updateState({ suggestions, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to get suggestions";
      updateState({ error: message, loading: false });
    }
  }, [state.cash, state.holdings, state.day, state.tradeHistory, updateState]);

  const handleBuy = useCallback(
    (pick: SuggestionPick, shares: number) => {
      const cost = shares * pick.current_price_gbp;
      if (cost > state.cash) return;

      // Check if we already hold this ticker
      const existingIdx = state.holdings.findIndex(
        (h) => h.ticker === pick.ticker
      );

      let newHoldings: Holding[];
      if (existingIdx >= 0) {
        // Average in
        newHoldings = state.holdings.map((h, i) => {
          if (i !== existingIdx) return h;
          const totalShares = h.shares + shares;
          const avgPrice =
            (h.avgPrice * h.shares + pick.current_price_gbp * shares) /
            totalShares;
          return { ...h, shares: totalShares, avgPrice };
        });
      } else {
        // New position
        const priceHistory = generatePriceTrajectory(
          pick.current_price_gbp,
          pick.volatility
        );
        const newHolding: Holding = {
          ticker: pick.ticker,
          company: pick.company,
          shares,
          avgPrice: pick.current_price_gbp,
          currentPrice: pick.current_price_gbp,
          volatility: pick.volatility,
          buyDay: state.day,
          priceHistory,
          priceIndex: 0,
        };
        newHoldings = [...state.holdings, newHolding];
      }

      setState((prev) => ({
        ...prev,
        cash: prev.cash - cost,
        holdings: newHoldings,
        tradeHistory: [
          ...prev.tradeHistory,
          {
            action: "BUY",
            ticker: pick.ticker,
            shares,
            price: pick.current_price_gbp,
            day: prev.day,
          },
        ],
      }));
    },
    [state.cash, state.holdings, state.day]
  );

  const handleSell = useCallback(
    (ticker: string) => {
      const holding = state.holdings.find((h) => h.ticker === ticker);
      if (!holding) return;

      const gainAbs =
        (holding.currentPrice - holding.avgPrice) * holding.shares;
      const gainPct = pctChange(holding.currentPrice, holding.avgPrice);

      setState((prev) => ({
        ...prev,
        cash: prev.cash + holding.currentPrice * holding.shares,
        holdings: prev.holdings.filter((h) => h.ticker !== ticker),
        tradeHistory: [
          ...prev.tradeHistory,
          {
            action: "SELL",
            ticker,
            shares: holding.shares,
            price: holding.currentPrice,
            day: prev.day,
            gainPct,
            gainAbs,
          },
        ],
      }));
    },
    [state.holdings]
  );

  const handleAdvanceDay = useCallback(() => {
    setState((prev) => {
      const newDay = prev.day + 1;

      // Advance all holdings to their next price
      const newHoldings = prev.holdings.map((h) => {
        const nextIndex = h.priceIndex + 1;
        const newPrice =
          nextIndex < h.priceHistory.length
            ? h.priceHistory[nextIndex]
            : h.currentPrice;
        return { ...h, currentPrice: newPrice, priceIndex: nextIndex };
      });

      const newTotal = totalPortfolioValue(prev.cash, newHoldings);
      const newDailyValues = [
        ...prev.dailyValues,
        { day: newDay, value: newTotal },
      ];

      const isEnd = newDay > 30;

      return {
        ...prev,
        day: isEnd ? 30 : newDay,
        holdings: newHoldings,
        dailyValues: newDailyValues,
        suggestions: null,
        screen: isEnd ? "end" : "dashboard",
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setState(getInitialState());
    try {
      localStorage.removeItem("paper-trader-state");
    } catch {
      // ignore
    }
  }, []);

  // Don't render until hydrated to avoid mismatch
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#64748b] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  // ── Render ──

  if (state.screen === "welcome") {
    return <WelcomeScreen onStart={handleStart} />;
  }

  if (state.screen === "end") {
    const finalValue = totalPortfolioValue(state.cash, state.holdings);
    return (
      <EndScreen
        finalValue={finalValue}
        dailyValues={state.dailyValues}
        tradeHistory={state.tradeHistory}
        onRestart={handleReset}
      />
    );
  }

  return (
    <Dashboard
      day={state.day}
      cash={state.cash}
      holdings={state.holdings}
      tradeHistory={state.tradeHistory}
      dailyValues={state.dailyValues}
      suggestions={state.suggestions}
      loading={state.loading}
      error={state.error}
      onGetSuggestions={handleGetSuggestions}
      onBuy={handleBuy}
      onSell={handleSell}
      onAdvanceDay={handleAdvanceDay}
      onReset={handleReset}
    />
  );
}
