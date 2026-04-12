"use client";

import { Trophy, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import {
  type Trade,
  type DailyValue,
  formatGBP,
  pctChange,
  INITIAL_CASH,
} from "../utils";

interface EndScreenProps {
  finalValue: number;
  dailyValues: DailyValue[];
  tradeHistory: Trade[];
  onRestart: () => void;
}

export default function EndScreen({
  finalValue,
  dailyValues,
  tradeHistory,
  onRestart,
}: EndScreenProps) {
  const returnPct = pctChange(finalValue, INITIAL_CASH);
  const isUp = returnPct >= 0;
  const chartColor = isUp ? "#22c55e" : "#ef4444";

  // Find best and worst trades (sells only, since they have gain data)
  const sells = tradeHistory.filter(
    (t) => t.action === "SELL" && t.gainPct !== undefined
  );
  const bestTrade = sells.length
    ? sells.reduce((best, t) => (t.gainPct! > best.gainPct! ? t : best))
    : null;
  const worstTrade = sells.length
    ? sells.reduce((worst, t) => (t.gainPct! < worst.gainPct! ? t : worst))
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-10 max-w-md w-full text-center">
        <Trophy size={48} className="mx-auto mb-4 text-[#f59e0b]" />
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold mb-1">
          Challenge Complete
        </h1>
        <p className="text-[#64748b] text-sm mb-6">
          30 days of paper trading finished
        </p>

        {/* Final Value */}
        <div className="mb-2">
          <div className="font-mono text-4xl font-bold text-[#f8fafc]">
            {formatGBP(finalValue)}
          </div>
          <div
            className={`font-mono text-lg font-semibold ${
              isUp ? "text-[#22c55e]" : "text-[#ef4444]"
            }`}
          >
            {isUp ? "+" : ""}
            {returnPct.toFixed(2)}% return
          </div>
        </div>

        {/* Mini sparkline */}
        <div className="h-16 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyValues}>
              <defs>
                <linearGradient
                  id="endChartGradient"
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
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#endChartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Best / Worst Trades */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {bestTrade && (
            <div className="bg-[#0f172a] border border-[#334155] rounded-[10px] p-3">
              <div className="flex items-center justify-center gap-1 text-[#22c55e] text-xs font-mono mb-1">
                <TrendingUp size={12} />
                Best Trade
              </div>
              <div className="font-mono font-bold text-sm">
                {bestTrade.ticker}
              </div>
              <div className="font-mono text-xs text-[#22c55e]">
                +{bestTrade.gainPct!.toFixed(1)}% ({formatGBP(bestTrade.gainAbs!)})
              </div>
            </div>
          )}
          {worstTrade && (
            <div className="bg-[#0f172a] border border-[#334155] rounded-[10px] p-3">
              <div className="flex items-center justify-center gap-1 text-[#ef4444] text-xs font-mono mb-1">
                <TrendingDown size={12} />
                Worst Trade
              </div>
              <div className="font-mono font-bold text-sm">
                {worstTrade.ticker}
              </div>
              <div className="font-mono text-xs text-[#ef4444]">
                {worstTrade.gainPct!.toFixed(1)}% ({formatGBP(worstTrade.gainAbs!)})
              </div>
            </div>
          )}
        </div>

        {sells.length === 0 && (
          <p className="text-[#64748b] text-sm mb-8">
            No completed trades to show best/worst. Sell holdings to realise gains!
          </p>
        )}

        <button
          onClick={onRestart}
          className="w-full py-3 rounded-[10px] font-[family-name:var(--font-space-grotesk)] font-semibold text-white bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}
