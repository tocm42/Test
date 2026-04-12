"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type Holding, formatGBP, pctChange } from "../utils";

interface HoldingRowProps {
  holding: Holding;
  onSell: (ticker: string) => void;
}

export default function HoldingRow({ holding, onSell }: HoldingRowProps) {
  const change = pctChange(holding.currentPrice, holding.avgPrice);
  const isUp = change >= 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#334155]/50 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[#f8fafc]">
            {holding.ticker}
          </span>
          <span className="text-xs text-[#64748b]">
            {holding.shares} share{holding.shares !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-xs text-[#64748b] font-mono mt-0.5">
          Avg {formatGBP(holding.avgPrice)}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-sm text-[#f8fafc]">
            {formatGBP(holding.currentPrice)}
          </div>
          <div
            className={`flex items-center justify-end gap-0.5 text-xs font-mono ${
              isUp ? "text-[#22c55e]" : "text-[#ef4444]"
            }`}
          >
            {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {isUp ? "+" : ""}
            {change.toFixed(2)}%
          </div>
        </div>

        <button
          onClick={() => onSell(holding.ticker)}
          className="px-3 py-1 rounded-[8px] text-xs font-[family-name:var(--font-space-grotesk)] font-semibold text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/10 transition-all cursor-pointer"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
