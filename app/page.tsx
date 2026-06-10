"use client";

import { useEffect, useState } from "react";
import type { Entry } from "./lib/types";
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
  const { state, hydrated, addEntry, editEntry, payAllowance, accrueAllowance, deleteEntry, applySettings } =
    usePocketMoney();
  const syncStatus = useSyncStatus();
  const [entryModal, setEntryModal] = useState<{
    kidId: string;
    kidName: string;
    type: "bonus" | "spend";
    entry?: Entry;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reconnect to the cloud on load if this device remembers the PIN.
  useEffect(() => {
    initSync();
  }, []);

  // Auto-add weekly allowance (Saturdays 07:00) whenever the app is open or
  // brought back into focus, plus a periodic check for a left-open device.
  // Runs once data is ready and, when sync is on, once the cloud has loaded —
  // so we never accrue against stale local state.
  useEffect(() => {
    if (!hydrated || (syncStatus !== "disabled" && syncStatus !== "synced")) return;
    accrueAllowance();
    const onVisible = () => {
      if (document.visibilityState === "visible") accrueAllowance();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(accrueAllowance, 15 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [hydrated, syncStatus, accrueAllowance]);

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
          {state.kids.map((kid) => (
            <KidCard
              key={kid.id}
              kid={kid}
              state={state}
              onPayAllowance={() => payAllowance(kid.id)}
              onBonus={() => setEntryModal({ kidId: kid.id, kidName: kid.name, type: "bonus" })}
              onSpend={() => setEntryModal({ kidId: kid.id, kidName: kid.name, type: "spend" })}
              onEdit={(entry) =>
                setEntryModal({
                  kidId: kid.id,
                  kidName: kid.name,
                  type: entry.type === "spend" ? "spend" : "bonus",
                  entry,
                })
              }
              onDelete={(id) => deleteEntry(kid.id, id)}
            />
          ))}
        </div>
      </main>

      {entryModal && (
        <EntryModal
          kidName={entryModal.kidName}
          type={entryModal.type}
          currency={state.settings.currency}
          initial={
            entryModal.entry
              ? {
                  amount: entryModal.entry.amount,
                  reason: entryModal.entry.reason,
                  note: entryModal.entry.note,
                }
              : undefined
          }
          onClose={() => setEntryModal(null)}
          onSubmit={(amount, reason, note) => {
            if (entryModal.entry) {
              editEntry(entryModal.kidId, entryModal.entry.id, amount, reason, note);
            } else {
              addEntry(entryModal.kidId, entryModal.type, amount, reason, note);
            }
            setEntryModal(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          state={state}
          onClose={() => setShowSettings(false)}
          onSave={(next) => {
            applySettings(next);
            setShowSettings(false);
          }}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
