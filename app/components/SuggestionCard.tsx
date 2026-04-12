"use client";

import { useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { type SuggestionPick, type Conviction, suggestedShares, formatGBP } from "../utils";

interface SuggestionCardProps {
  pick: SuggestionPick;
  cash: number;
  onBuy: (pick: SuggestionPick, shares: number) => void;
  onSkip: () => void;
  disabled: boolean;
}

function convictionColor(c: Conviction): string {
  if (c === "high") return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
  if (c === "medium") return "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30";
  return "bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30";
}

function volatilityLabel(v: string): string {
  if (v === "vhigh") return "Very High";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function SuggestionCard({
  pick,
  cash,
  onBuy,
  onSkip,
  disabled,
}: SuggestionCardProps) {
  const suggested = suggestedShares(pick.conviction, pick.current_price_gbp, cash);
  const [shares, setShares] = useState(suggested);
  const cost = shares * pick.current_price_gbp;
  const canAfford = cost <= cash && shares > 0;

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-[10px] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono font-bold text-lg text-[#f8fafc]">
            {pick.ticker}
          </span>
          <span className="ml-2 text-[#64748b] text-sm">{pick.exchange}</span>
          <div className="text-[#94a3b8] text-sm">{pick.company}</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-semibold text-[#f8fafc]">
            {formatGBP(pick.current_price_gbp)}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-mono ${convictionColor(pick.conviction)}`}
        >
          {pick.conviction} conviction
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-[#334155] text-[#94a3b8] font-mono">
          {volatilityLabel(pick.volatility)} vol
        </span>
      </div>

      {/* Rationale */}
      <div className="border-l-2 border-[#334155] pl-3 mb-4 text-sm text-[#94a3b8] leading-relaxed">
        {pick.rationale}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#64748b] font-mono">Shares:</label>
          <input
            type="number"
            min={1}
            max={Math.floor(cash / pick.current_price_gbp)}
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 bg-[#1e293b] border border-[#334155] rounded-md px-2 py-1 text-sm font-mono text-[#f8fafc] focus:outline-none focus:border-[#22c55e]"
          />
        </div>
        <button
          onClick={() => setShares(suggested)}
          className="text-xs text-[#64748b] hover:text-[#94a3b8] font-mono cursor-pointer"
        >
          Suggest: {suggested}
        </button>
        <div className="flex-1" />
        <span className="text-xs font-mono text-[#64748b]">
          {formatGBP(cost)}
        </span>
        <button
          onClick={() => onBuy(pick, shares)}
          disabled={disabled || !canAfford}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-sm font-[family-name:var(--font-space-grotesk)] font-semibold text-white bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ShoppingCart size={13} />
          Buy
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-sm font-[family-name:var(--font-space-grotesk)] text-[#94a3b8] hover:text-[#f8fafc] border border-[#334155] hover:border-[#64748b] transition-all cursor-pointer"
        >
          <X size={13} />
          Skip
        </button>
      </div>
    </div>
  );
}
