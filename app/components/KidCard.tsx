"use client";

import type { AppState, Entry, KidName } from "../lib/types";
import { balance, formatDate, money, weeksDue } from "../lib/store";

interface Props {
  kid: { name: KidName; emoji: string; color: string };
  state: AppState;
  onPayAllowance: () => void;
  onBonus: () => void;
  onSpend: () => void;
  onDelete: (id: string) => void;
}

export default function KidCard({ kid, state, onPayAllowance, onBonus, onSpend, onDelete }: Props) {
  const currency = state.settings.currency;
  const entries = state.entries[kid.name];
  const bal = balance(entries);
  const due = weeksDue(state, kid.name);
  const weekly = Number(state.settings.weekly[kid.name]) || 0;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-lg text-white"
            style={{ background: kid.color }}
          >
            {kid.emoji}
          </span>
          <span className="text-xl font-bold text-gray-900">{kid.name}</span>
        </div>
        <div
          className={`mt-2 text-4xl font-extrabold tracking-tight ${
            bal < 0 ? "text-red-600" : "text-gray-900"
          }`}
        >
          {money(bal, currency)}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          {due > 0 ? (
            <span className="font-semibold text-blue-600">
              {due} week{due > 1 ? "s" : ""} of allowance ready ({money(weekly * due, currency)})
            </span>
          ) : (
            <>Allowance {money(weekly, currency)}/week</>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3.5">
        <ActionButton
          label="Pay allowance"
          icon="📅"
          disabled={due <= 0}
          onClick={onPayAllowance}
          className="bg-blue-100 text-blue-700"
        />
        <ActionButton label="Bonus" icon="⭐" onClick={onBonus} className="bg-green-100 text-green-700" />
        <ActionButton label="Spend" icon="🛍️" onClick={onSpend} className="bg-red-100 text-red-600" />
      </div>

      <div className="flex-1 px-4 pb-4">
        <h3 className="mx-1 my-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          History
        </h3>
        {entries.length === 0 ? (
          <p className="py-5 text-center text-sm text-gray-400">No entries yet.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} currency={currency} onDelete={() => onDelete(e.id)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  className,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-xs font-semibold transition hover:brightness-95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function EntryRow({
  entry,
  currency,
  onDelete,
}: {
  entry: Entry;
  currency: string;
  onDelete: () => void;
}) {
  const isSpend = entry.type === "spend";
  const tone =
    entry.type === "allowance"
      ? { bg: "bg-blue-100", icon: "📅" }
      : isSpend
        ? { bg: "bg-red-100", icon: "🛍️" }
        : { bg: "bg-green-100", icon: "⭐" };
  const title = [entry.reason, entry.note].filter(Boolean).join(" — ") || (isSpend ? "Spend" : "Bonus");
  const amountText = (isSpend ? "-" : "+") + money(entry.amount, currency).replace("-", "");

  function handleDelete() {
    if (window.confirm("Delete this entry?")) onDelete();
  }

  return (
    <li className="group flex items-center gap-2.5 border-b border-gray-100 py-2 last:border-none">
      <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg text-sm ${tone.bg}`}>
        {tone.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-400">{formatDate(entry.date)}</span>
      </span>
      <span
        className={`whitespace-nowrap font-bold tabular-nums ${
          isSpend ? "text-red-600" : "text-green-600"
        }`}
      >
        {amountText}
      </span>
      <button
        onClick={handleDelete}
        title="Delete"
        className="px-1.5 text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
