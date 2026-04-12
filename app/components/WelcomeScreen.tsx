"use client";

import { TrendingUp, Globe, CalendarDays } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-10 max-w-md w-full text-center">
        <div className="mb-2 text-[#64748b] font-mono text-xs tracking-widest uppercase">
          Virtual Trading Simulation
        </div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold mb-3">
          30-Day Paper Trader
        </h1>
        <p className="text-[#94a3b8] mb-8 leading-relaxed">
          Start with £500 in virtual cash. Use AI-powered research to pick
          stocks and grow your portfolio over 30 days. No real money involved.
        </p>

        <div className="flex justify-center gap-3 mb-8">
          <span className="flex items-center gap-1.5 bg-[#0f172a] border border-[#334155] rounded-full px-3 py-1.5 text-xs font-mono text-[#94a3b8]">
            <TrendingUp size={13} className="text-[#22c55e]" />
            AI-powered picks
          </span>
          <span className="flex items-center gap-1.5 bg-[#0f172a] border border-[#334155] rounded-full px-3 py-1.5 text-xs font-mono text-[#94a3b8]">
            <Globe size={13} className="text-[#a78bfa]" />
            Real market data
          </span>
          <span className="flex items-center gap-1.5 bg-[#0f172a] border border-[#334155] rounded-full px-3 py-1.5 text-xs font-mono text-[#94a3b8]">
            <CalendarDays size={13} className="text-[#f59e0b]" />
            30-day challenge
          </span>
        </div>

        <button
          onClick={onStart}
          className="w-full py-3 rounded-[10px] font-[family-name:var(--font-space-grotesk)] font-semibold text-white bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] transition-all cursor-pointer"
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
}
