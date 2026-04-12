"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import {
  type Holding,
  type Trade,
  type DailyValue,
  type SuggestionsResponse,
  type SuggestionPick,
  formatGBP,
  totalInvested,
  totalPortfolioValue,
  pctChange,
  INITIAL_CASH,
  TOTAL_DAYS,
} from "../utils";
import SuggestionCard from "./SuggestionCard";
import HoldingRow from "./HoldingRow";
import TradeHistory from "./TradeHistory";

interface DashboardProps {
  day: number;
  cash: number;
  holdings: Holding[];
  tradeHistory: Trade[];
  dailyValues: DailyValue[];
  suggestions: SuggestionsResponse | null;
  loading: boolean;
  error: string | null;
  onGetSuggestions: () => void;
  onBuy: (pick: SuggestionPick, shares: number) => void;
  onSell: (ticker: string) => void;
  onAdvanceDay: () => void;
  onReset: () => void;
}

export default function Dashboard({
  day,
  cash,
  holdings,
  tradeHistory,
  dailyValues,
  suggestions,
  loading,
  error,
  onGetSuggestions,
  onBuy,
  onSell,
  onAdvanceDay,
  onReset,
}: DashboardProps) {
  const invested = totalInvested(holdings);
  const total = totalPortfolioValue(cash, holdings);
  const totalChange = pctChange(total, INITIAL_CASH);
  const isUp = totalChange >= 0;
  const isLastDay = day >= TOTAL_DAYS;

  // Track which suggestion cards have been skipped
  const [skippedPicks, setSkippedPicks] = useState<Set<string>>(new Set());

  const chartColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[640px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
            Paper Trader
          </h1>
          <span className="font-mono text-sm text-[#64748b]">
            Day {day} / {TOTAL_DAYS}
          </span>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1e293b] border border-[#334155] rounded-[10px] p-4">
            <div className="text-xs text-[#64748b] font-mono mb-1">Cash</div>
            <div className="font-mono font-bold text-lg">{formatGBP(cash)}</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-[10px] p-4">
            <div className="text-xs text-[#64748b] font-mono mb-1">
              Invested
            </div>
            <div className="font-mono font-bold text-lg">
              {formatGBP(invested)}
            </div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-[10px] p-4">
            <div className="text-xs text-[#64748b] font-mono mb-1">Total</div>
            <div className="font-mono font-bold text-lg">
              {formatGBP(total)}
            </div>
            <div
              className={`text-xs font-mono ${
                isUp ? "text-[#22c55e]" : "text-[#ef4444]"
              }`}
            >
              {isUp ? "+" : ""}
              {totalChange.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {dailyValues.length > 1 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-5">
            <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-sm text-[#94a3b8] mb-4">
              Portfolio Performance
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyValues}>
                <defs>
                  <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chartColor}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `£${v.toFixed(0)}`}
                  domain={["dataMin - 20", "dataMax + 20"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: "12px",
                    color: "#f8fafc",
                  }}
                  formatter={(value) => [formatGBP(Number(value)), "Value"]}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Research Panel */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-sm text-[#94a3b8]">
              AI Research
            </h3>
            <button
              onClick={() => {
                setSkippedPicks(new Set());
                onGetSuggestions();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-[family-name:var(--font-space-grotesk)] font-semibold text-white bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {loading ? "Researching..." : "Get Suggestions"}
            </button>
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-[8px] p-3 text-sm text-[#ef4444] mb-4">
              {error}
            </div>
          )}

          {suggestions && (
            <div className="space-y-3">
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                {suggestions.market_summary}
              </p>
              {suggestions.picks
                .filter((pick) => !skippedPicks.has(pick.ticker))
                .map((pick) => (
                  <SuggestionCard
                    key={pick.ticker}
                    pick={pick}
                    cash={cash}
                    onBuy={onBuy}
                    onSkip={() =>
                      setSkippedPicks((prev) => new Set(prev).add(pick.ticker))
                    }
                    disabled={loading}
                  />
                ))}
            </div>
          )}

          {!suggestions && !loading && !error && (
            <p className="text-sm text-[#64748b] text-center py-4">
              Click &quot;Get Suggestions&quot; to research stock picks with AI.
            </p>
          )}
        </div>

        {/* Holdings */}
        {holdings.length > 0 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-5">
            <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-sm text-[#94a3b8] mb-3">
              Holdings ({holdings.length})
            </h3>
            <div>
              {holdings.map((h) => (
                <HoldingRow key={h.ticker} holding={h} onSell={onSell} />
              ))}
            </div>
          </div>
        )}

        {/* Advance Day Button */}
        <button
          onClick={onAdvanceDay}
          className="w-full py-3.5 rounded-[10px] font-[family-name:var(--font-space-grotesk)] font-semibold text-white bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLastDay ? "Finish Challenge" : `Advance to Day ${day + 1}`}
          <ArrowRight size={16} />
        </button>

        {/* Trade History */}
        <TradeHistory trades={tradeHistory} />

        {/* Reset */}
        <div className="text-center pb-8">
          <button
            onClick={onReset}
            className="text-xs text-[#64748b] hover:text-[#94a3b8] font-mono flex items-center gap-1 mx-auto cursor-pointer"
          >
            <RotateCcw size={11} />
            Reset all progress
          </button>
        </div>
      </div>
    </div>
  );
}
