"use client";

import { useEffect, useState } from "react";
import type { KidName } from "./lib/types";
import { KIDS } from "./lib/store";
import { usePocketMoney, useSyncStatus } from "./lib/usePocketMoney";
import { initSync } from "./lib/sync";
import KidCard from "./components/KidCard";
import EntryModal from "./components/EntryModal";
import SettingsModal from "./components/SettingsModal";
import PinGate from "./components/PinGate";

const SYNC_BADGE: Record<string, { label: string; className: string } | null> = {
  disabled: null,
  locked: null,
  connecting: { label: "Syncing…", className: "bg-amber-100 text-amber-700" },
  synced: { label: "Synced", className: "bg-emerald-100 text-emerald-700" },
  offline: { label: "Offline", className: "bg-gray-200 text-gray-600" },
};

export default function Home() {
  const { state, hydrated, addEntry, payAllowance, deleteEntry, updateSettings } = usePocketMoney();
  const syncStatus = useSyncStatus();
  const [entryModal, setEntryModal] = useState<{ kid: KidName; type: "bonus" | "spend" } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reconnect to the cloud on load if this device remembers the PIN.
  useEffect(() => {
    initSync();
  }, []);

  // Block the app behind the PIN prompt until this device is unlocked.
  if (syncStatus === "locked" || syncStatus === "connecting") {
    return <PinGate connecting={syncStatus === "connecting"} />;
  }

  const badge = SYNC_BADGE[syncStatus];

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
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">💰 Pocket Money Tracker</h1>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
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
