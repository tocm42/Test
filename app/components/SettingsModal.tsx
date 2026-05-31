"use client";

import { useEffect, useState } from "react";
import type { AppState, KidName } from "../lib/types";
import { KIDS } from "../lib/store";
import { Backdrop, Field } from "./EntryModal";

interface Props {
  state: AppState;
  onClose: () => void;
  onSave: (currency: string, weekly: Record<KidName, number>) => void;
  onExport: () => void;
}

export default function SettingsModal({ state, onClose, onSave, onExport }: Props) {
  const [currency, setCurrency] = useState(state.settings.currency);
  const [weekly, setWeekly] = useState<Record<string, string>>({
    Sebastian: String(state.settings.weekly.Sebastian),
    Oscar: String(state.settings.weekly.Oscar),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(currency.trim() || "£", {
      Sebastian: Math.max(0, parseFloat(weekly.Sebastian) || 0),
      Oscar: Math.max(0, parseFloat(weekly.Oscar) || 0),
    });
  }

  const cur = currency.trim() || "£";

  return (
    <Backdrop onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Settings</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Currency symbol">
          <input
            type="text"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </Field>

        {KIDS.map((k) => (
          <Field key={k.name} label={`Weekly allowance (minimum) — ${k.name}`}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {cur}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weekly[k.name]}
                onChange={(e) => setWeekly((w) => ({ ...w, [k.name]: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </Field>
        ))}

        <div className="mt-1 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:brightness-95"
          >
            Export data
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:brightness-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Backdrop>
  );
}
