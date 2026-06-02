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

// ---- External store (for useSyncExternalStore) ----------------------------
//
// A tiny localStorage-backed store. Using useSyncExternalStore keeps loading
// SSR-safe and lint-clean (no setState-in-effect), and gives cross-tab sync.

let memState: AppState | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = defaultState();

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memState = loadState();
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): AppState {
  if (memState === null) memState = loadState();
  return memState;
}

export function getServerSnapshot(): AppState {
  return SERVER_SNAPSHOT;
}

// Optional cloud-sync hook. When connected, the sync layer registers a pusher
// here so every local mutation is also sent (encrypted) to the shared backend.
let remotePush: ((state: AppState) => void) | null = null;

export function setRemotePush(fn: ((state: AppState) => void) | null): void {
  remotePush = fn;
}

/** Replace local state with one received from the cloud (does not re-push). */
export function applyRemoteState(state: AppState): void {
  memState = state;
  saveState(state);
  listeners.forEach((l) => l());
}

function mutate(updater: (state: AppState) => AppState): void {
  memState = updater(getSnapshot());
  saveState(memState);
  listeners.forEach((l) => l());
  remotePush?.(memState);
}

export function addEntryAction(
  kid: KidName,
  type: Exclude<Entry["type"], "allowance">,
  amount: number,
  reason: string,
  note: string,
): void {
  mutate((prev) => ({
    ...prev,
    entries: {
      ...prev.entries,
      [kid]: [
        { id: uid(), type, amount: round2(amount), reason, note, date: new Date().toISOString() },
        ...prev.entries[kid],
      ],
    },
  }));
}

export function payAllowanceAction(kid: KidName): void {
  mutate((prev) => {
    const due = weeksDue(prev, kid);
    const weekly = Number(prev.settings.weekly[kid]) || 0;
    if (due <= 0 || weekly <= 0) return prev;

    const total = round2(weekly * due);
    const label = due === 1 ? "Weekly allowance" : `Weekly allowance (${due} weeks)`;
    // Advance the clock by the whole weeks paid so partial weeks aren't lost.
    const base = prev.lastAllowance[kid] ? new Date(prev.lastAllowance[kid] as string).getTime() : Date.now();

    return {
      ...prev,
      lastAllowance: { ...prev.lastAllowance, [kid]: new Date(base + due * WEEK_MS).toISOString() },
      entries: {
        ...prev.entries,
        [kid]: [
          { id: uid(), type: "allowance", amount: total, reason: label, note: "", date: new Date().toISOString() },
          ...prev.entries[kid],
        ],
      },
    };
  });
}

export function deleteEntryAction(kid: KidName, id: string): void {
  mutate((prev) => ({
    ...prev,
    entries: { ...prev.entries, [kid]: prev.entries[kid].filter((e) => e.id !== id) },
  }));
}

export function updateSettingsAction(currency: string, weekly: Record<KidName, number>): void {
  mutate((prev) => ({ ...prev, settings: { currency: currency || "£", weekly } }));
}
