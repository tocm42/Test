import type { AppState, Entry, KidName, Settings } from "./types";

export const STORAGE_KEY = "pocketMoney.v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const KIDS: { name: KidName; emoji: string; color: string }[] = [
  { name: "Sebastian", emoji: "🦊", color: "#4f46e5" },
  { name: "Oscar", emoji: "🐻", color: "#0891b2" },
];

export const BONUS_REASONS = [
  "Being helpful",
  "Being gracious",
  "Good behaviour",
  "Chores",
  "Other",
];

export const SPEND_REASONS = ["Toys", "Sweets", "Games", "Books", "Saving up", "Other"];

export function defaultState(): AppState {
  return {
    settings: {
      currency: "£",
      weekly: { Sebastian: 2, Oscar: 2 },
    },
    lastAllowance: {},
    entries: { Sebastian: [], Oscar: [] },
  };
}

/** Load persisted state, merging with defaults so upgrades don't lose fields. */
export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    const settings: Settings = {
      ...base.settings,
      ...parsed.settings,
      weekly: { ...base.settings.weekly, ...parsed.settings?.weekly },
    };
    return {
      settings,
      lastAllowance: { ...parsed.lastAllowance },
      entries: {
        Sebastian: parsed.entries?.Sebastian ?? [],
        Oscar: parsed.entries?.Oscar ?? [],
      },
    };
  } catch (err) {
    console.error("Failed to load pocket money data; starting fresh.", err);
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Pure helpers ---------------------------------------------------------

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function balance(entries: Entry[]): number {
  return round2(
    entries.reduce((sum, e) => sum + (e.type === "spend" ? -e.amount : e.amount), 0),
  );
}

export function money(amount: number, currency: string): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${currency}${Math.abs(amount).toFixed(2)}`;
}

/** Whole weeks of allowance currently owed to a kid. */
export function weeksDue(state: AppState, kid: KidName): number {
  const weekly = Number(state.settings.weekly[kid]) || 0;
  if (weekly <= 0) return 0;
  const last = state.lastAllowance[kid];
  if (!last) return 1; // never paid → first week is available
  const elapsed = Date.now() - new Date(last).getTime();
  return Math.max(0, Math.floor(elapsed / WEEK_MS));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export { WEEK_MS };
