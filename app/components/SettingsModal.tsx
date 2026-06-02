"use client";

import { useEffect, useState } from "react";
import type { AppState, Goal, Kid, KidId } from "../lib/types";
import { KID_COLORS, uid } from "../lib/store";
import { Backdrop, Field } from "./EntryModal";

interface SaveArgs {
  currency: string;
  kids: Kid[];
  weekly: Record<KidId, number>;
  goals: Partial<Record<KidId, Goal>>;
}

interface Props {
  state: AppState;
  onClose: () => void;
  onSave: (next: SaveArgs) => void;
  onExport: () => void;
}

// Editable per-kid row (everything as strings while the form is open).
interface KidDraft {
  id: KidId;
  name: string;
  emoji: string;
  color: string;
  weekly: string;
  goalLabel: string;
  goalTarget: string;
}

export default function SettingsModal({ state, onClose, onSave, onExport }: Props) {
  const [currency, setCurrency] = useState(state.settings.currency);
  const [kids, setKids] = useState<KidDraft[]>(() =>
    state.kids.map((k) => ({
      id: k.id,
      name: k.name,
      emoji: k.emoji,
      color: k.color,
      weekly: String(state.settings.weekly[k.id] ?? 0),
      goalLabel: state.goals[k.id]?.label ?? "",
      goalTarget: state.goals[k.id]?.target ? String(state.goals[k.id]?.target) : "",
    })),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(id: KidId, patch: Partial<KidDraft>) {
    setKids((list) => list.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }

  function addKid() {
    setKids((list) => [
      ...list,
      {
        id: uid(),
        name: "",
        emoji: "🙂",
        color: KID_COLORS[list.length % KID_COLORS.length],
        weekly: "2",
        goalLabel: "",
        goalTarget: "",
      },
    ]);
  }

  function removeKid(id: KidId, name: string) {
    if (window.confirm(`Remove ${name || "this child"} and all their entries? This can't be undone.`)) {
      setKids((list) => list.filter((k) => k.id !== id));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const named = kids.filter((k) => k.name.trim());
    if (named.length === 0) {
      window.alert("Please keep at least one child with a name.");
      return;
    }

    const cleanKids: Kid[] = named.map((k) => ({
      id: k.id,
      name: k.name.trim(),
      emoji: k.emoji.trim() || "🙂",
      color: k.color || "#4f46e5",
    }));
    const weekly: Record<KidId, number> = {};
    const goals: Partial<Record<KidId, Goal>> = {};
    for (const k of named) {
      weekly[k.id] = Math.max(0, parseFloat(k.weekly) || 0);
      const target = Math.max(0, parseFloat(k.goalTarget) || 0);
      if (target > 0) goals[k.id] = { label: k.goalLabel.trim(), target };
    }

    onSave({ currency: currency.trim() || "£", kids: cleanKids, weekly, goals });
  }

  const cur = currency.trim() || "£";

  return (
    <Backdrop onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Settings</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Currency symbol">
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </Field>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Children
            </span>
            {kids.map((k) => (
              <div key={k.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={k.emoji}
                    onChange={(e) => update(k.id, { emoji: e.target.value })}
                    aria-label="Emoji"
                    className="w-12 rounded-lg border border-gray-300 py-2 text-center text-lg outline-none focus:border-indigo-500"
                  />
                  <input
                    type="color"
                    value={k.color}
                    onChange={(e) => update(k.id, { color: e.target.value })}
                    aria-label="Colour"
                    className="h-10 w-10 flex-none cursor-pointer rounded-lg border border-gray-300"
                  />
                  <input
                    type="text"
                    value={k.name}
                    placeholder="Name"
                    onChange={(e) => update(k.id, { name: e.target.value })}
                    aria-label="Name"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-indigo-500"
                  />
                  {kids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKid(k.id, k.name)}
                      title="Remove child"
                      className="flex-none rounded-lg px-2 py-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">Allowance / week</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {cur}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={k.weekly}
                        onChange={(e) => update(k.id, { weekly: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-2 text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">Goal target</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {cur}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={k.goalTarget}
                        onChange={(e) => update(k.id, { goalTarget: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-2 text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </label>
                </div>

                {parseFloat(k.goalTarget) > 0 && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">Saving up for…</span>
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="e.g. Lego set"
                      value={k.goalLabel}
                      onChange={(e) => update(k.id, { goalLabel: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-indigo-500"
                    />
                  </label>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addKid}
              className="rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
            >
              + Add child
            </button>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onExport}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:brightness-95"
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
      </div>
    </Backdrop>
  );
}
