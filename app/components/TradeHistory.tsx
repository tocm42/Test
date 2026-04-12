"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type Trade, formatGBP } from "../utils";

interface TradeHistoryProps {
  trades: Trade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (trades.length === 0) return null;

  const sorted = [...trades].reverse();

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full cursor-pointer"
      >
        <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-sm text-[#94a3b8]">
          Trade History ({trades.length})
        </h3>
        {expanded ? (
          <ChevronUp size={16} className="text-[#64748b]" />
        ) : (
          <ChevronDown size={16} className="text-[#64748b]" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {sorted.map((trade, i) => {
            const isBuy = trade.action === "BUY";
            return (
              <div
                key={`${trade.ticker}-${trade.day}-${i}`}
                className="flex items-center justify-between text-sm py-2 border-b border-[#334155]/40 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      isBuy
                        ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : "bg-[#ef4444]/15 text-[#ef4444]"
                    }`}
                  >
                    {trade.action}
                  </span>
                  <span className="font-mono font-semibold text-[#f8fafc]">
                    {trade.ticker}
                  </span>
                  <span className="text-[#64748b] text-xs">
                    {trade.shares} share{trade.shares !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-[#94a3b8]">
                    {formatGBP(trade.price)} · Day {trade.day}
                  </span>
                  {trade.gainPct !== undefined && (
                    <span
                      className={`ml-2 font-mono text-xs ${
                        trade.gainPct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {trade.gainPct >= 0 ? "+" : ""}
                      {trade.gainPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
