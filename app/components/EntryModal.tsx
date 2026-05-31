"use client";

import { useEffect, useState } from "react";
import type { KidName } from "../lib/types";
import { BONUS_REASONS, SPEND_REASONS } from "../lib/store";

interface Props {
  kid: KidName;
  type: "bonus" | "spend";
  currency: string;
  onClose: () => void;
  onSubmit: (amount: number, reason: string, note: string) => void;
}

export default function EntryModal({ kid, type, currency, onClose, onSubmit }: Props) {
  const isBonus = type === "bonus";
  const reasons = isBonus ? BONUS_REASONS : SPEND_REASONS;

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0)) return;
    onSubmit(value, reason, note.trim());
  }

  return (
    <Backdrop onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {isBonus ? "Add bonus for " : "Record spend for "}
        {kid}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Amount">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </Field>

        <Field label={isBonus ? "Reason" : "Spent on"}>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Note (optional)">
          <input
            type="text"
            maxLength={80}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isBonus ? "e.g. helped with the washing up" : "e.g. football stickers"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </Field>

        <div className="mt-1 flex justify-end gap-2.5">
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
            {isBonus ? "Add bonus" : "Record spend"}
          </button>
        </div>
      </form>
    </Backdrop>
  );
}

export function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}
