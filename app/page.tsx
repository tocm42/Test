"use client";

import { useState } from "react";
import type { KidName } from "./lib/types";
import { KIDS } from "./lib/store";
import { usePocketMoney } from "./lib/usePocketMoney";
import KidCard from "./components/KidCard";
import EntryModal from "./components/EntryModal";
import SettingsModal from "./components/SettingsModal";

export default function Home() {
  const { state, hydrated, addEntry, payAllowance, deleteEntry, updateSettings } = usePocketMoney();
  const [entryModal, setEntryModal] = useState<{ kid: KidName; type: "bonus" | "spend" } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocket-money-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <h1 className="text-xl font-bold">💰 Pocket Money Tracker</h1>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Settings"
          className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-lg shadow-sm hover:brightness-95"
        >
          ⚙️
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-12">
        {/* Render only after hydration so localStorage data isn't flashed/mismatched. */}
        <div className={`grid gap-5 sm:grid-cols-2 ${hydrated ? "" : "opacity-0"}`}>
          {KIDS.map((kid) => (
            <KidCard
              key={kid.name}
              kid={kid}
              state={state}
              onPayAllowance={() => payAllowance(kid.name)}
              onBonus={() => setEntryModal({ kid: kid.name, type: "bonus" })}
              onSpend={() => setEntryModal({ kid: kid.name, type: "spend" })}
              onDelete={(id) => deleteEntry(kid.name, id)}
            />
          ))}
        </div>
      </main>

      {entryModal && (
        <EntryModal
          kid={entryModal.kid}
          type={entryModal.type}
          currency={state.settings.currency}
          onClose={() => setEntryModal(null)}
          onSubmit={(amount, reason, note) => {
            addEntry(entryModal.kid, entryModal.type, amount, reason, note);
            setEntryModal(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          state={state}
          onClose={() => setShowSettings(false)}
          onSave={(currency, weekly) => {
            updateSettings(currency, weekly);
            setShowSettings(false);
          }}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
