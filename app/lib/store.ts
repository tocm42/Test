import type { AppState, Entry, Goal, Kid, KidId, Settings } from "./types";

export const STORAGE_KEY = "pocketMoney.v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Seed children for a brand-new install. Their ids match the original names so
 * data created before kids were configurable migrates without any loss. */
export const DEFAULT_KIDS: Kid[] = [
  { id: "Sebastian", name: "Sebastian", emoji: "🦊", color: "#4f46e5" },
  { id: "Oscar", name: "Oscar", emoji: "🐻", color: "#0891b2" },
];

export const KID_COLORS = [
  "#4f46e5", "#0891b2", "#db2777", "#ea580c", "#16a34a", "#9333ea", "#0d9488", "#dc2626",
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
    kids: DEFAULT_KIDS.map((k) => ({ ...k })),
    settings: {
      currency: "£",
      weekly: { Sebastian: 2, Oscar: 2 },
    },
    goals: {},
    lastAllowance: {},
    entries: { Sebastian: [], Oscar: [] },
  };
}

/** Drop entries sharing an id (can happen if two devices auto-paid the same
 * allowance week before syncing). Keeps the first occurrence. */
function dedupeById(list: Entry[]): Entry[] {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

function normalizeKid(raw: Partial<Kid> | undefined, index: number): Kid {
  const id = String(raw?.id ?? raw?.name ?? uid());
  return {
    id,
    name: String(raw?.name ?? raw?.id ?? `Child ${index + 1}`),
    emoji: String(raw?.emoji ?? "🙂"),
    color: String(raw?.color ?? KID_COLORS[index % KID_COLORS.length]),
  };
}

/**
 * Upgrade any persisted/remote blob to the current shape, merging with defaults
 * so older data (and partial writes) can't crash us or lose entries. Used by
 * both the local loader and the cloud-sync layer.
 */
export function migrate(parsed: Partial<AppState> | null | undefined): AppState {
  if (!parsed || typeof parsed !== "object") return defaultState();

  const kids: Kid[] =
    Array.isArray(parsed.kids) && parsed.kids.length > 0
      ? parsed.kids.map((k, i) => normalizeKid(k, i))
      : defaultState().kids;

  const entries: Record<KidId, Entry[]> = {};
  const weekly: Record<KidId, number> = {};
  const goals: Partial<Record<KidId, Goal>> = {};
  const lastAllowance: Partial<Record<KidId, string>> = {};

  for (const kid of kids) {
    entries[kid.id] = dedupeById(parsed.entries?.[kid.id] ?? []);
    weekly[kid.id] = Number(parsed.settings?.weekly?.[kid.id]) || 0;
    const goal = parsed.goals?.[kid.id];
    if (goal && Number(goal.target) > 0) {
      goals[kid.id] = { label: String(goal.label ?? ""), target: Number(goal.target) };
    }
    const last = parsed.lastAllowance?.[kid.id];
    if (last) lastAllowance[kid.id] = last;
  }

  return {
    kids,
    settings: { currency: parsed.settings?.currency || "£", weekly },
    goals,
    lastAllowance,
    entries,
  };
}

/** Load persisted state, migrating it to the current shape. */
export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw) as Partial<AppState>);
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

// ---- Allowance schedule (Saturdays at 07:00, local time) ------------------

const ALLOWANCE_DAY = 6; // 0 = Sunday … 6 = Saturday
const ALLOWANCE_HOUR = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The most recent Saturday 07:00 (local) at or before `nowMs`. */
function lastBoundary(nowMs: number): number {
  const d = new Date(nowMs);
  let t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), ALLOWANCE_HOUR, 0, 0, 0).getTime();
  if (t > nowMs) t -= DAY_MS; // today's 07:00 hasn't happened yet
  while (new Date(t).getDay() !== ALLOWANCE_DAY) t -= DAY_MS;
  return t;
}

/** Count Saturday-07:00 boundaries strictly after `sinceMs`, up to `nowMs`. */
function boundariesBetween(sinceMs: number, nowMs: number): number {
  let count = 0;
  let b = lastBoundary(nowMs);
  while (b > sinceMs && count < 260) {
    count++;
    b = lastBoundary(b - 1000);
  }
  return count;
}

/** Where a kid's allowance clock starts: their last payment, or — if never
 * paid — one week back, so the current week is granted exactly once. */
function anchorFor(state: AppState, kid: KidId): number {
  const last = state.lastAllowance[kid];
  if (last) return new Date(last).getTime();
  return lastBoundary(Date.now()) - 7 * DAY_MS;
}

/** Whole weeks of allowance currently owed to a kid. */
export function weeksDue(state: AppState, kid: KidId): number {
  const weekly = Number(state.settings.weekly[kid]) || 0;
  if (weekly <= 0) return 0;
  return boundariesBetween(anchorFor(state, kid), Date.now());
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

// ---- Actions --------------------------------------------------------------

export function addEntryAction(
  kid: KidId,
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
        ...(prev.entries[kid] ?? []),
      ],
    },
  }));
}

/** Edit an existing entry's amount, reason and note (type and date unchanged). */
export function editEntryAction(
  kid: KidId,
  id: string,
  amount: number,
  reason: string,
  note: string,
): void {
  mutate((prev) => ({
    ...prev,
    entries: {
      ...prev.entries,
      [kid]: (prev.entries[kid] ?? []).map((e) =>
        e.id === id ? { ...e, amount: round2(amount), reason, note } : e,
      ),
    },
  }));
}

/** Core accrual for one kid: add any owed weeks (up to the latest Saturday
 * 07:00) and advance the clock. Uses a deterministic entry id per boundary so
 * two devices accruing at once can't double-pay the same week. */
function accrueKid(prev: AppState, kid: KidId, now: number): AppState {
  const weekly = Number(prev.settings.weekly[kid]) || 0;
  if (weekly <= 0) return prev;
  const due = boundariesBetween(anchorFor(prev, kid), now);
  if (due <= 0) return prev;

  const boundary = lastBoundary(now);
  const boundaryISO = new Date(boundary).toISOString();
  const id = `alw-${kid}-${boundary}`;
  const existing = prev.entries[kid] ?? [];

  // Already recorded for this boundary (e.g. another device beat us) — just
  // make sure the clock is advanced.
  if (existing.some((e) => e.id === id)) {
    return { ...prev, lastAllowance: { ...prev.lastAllowance, [kid]: boundaryISO } };
  }

  const total = round2(weekly * due);
  const label = due === 1 ? "Weekly allowance" : `Weekly allowance (${due} weeks)`;
  return {
    ...prev,
    lastAllowance: { ...prev.lastAllowance, [kid]: boundaryISO },
    entries: {
      ...prev.entries,
      [kid]: [
        { id, type: "allowance", amount: total, reason: label, note: "", date: boundaryISO },
        ...existing,
      ],
    },
  };
}

export function payAllowanceAction(kid: KidId): void {
  mutate((prev) => accrueKid(prev, kid, Date.now()));
}

/** Auto-add any allowance owed for every kid. Safe to call often: it only
 * writes when something is actually due. */
export function accrueAllowanceAction(): void {
  const prev = getSnapshot();
  const next = prev.kids.reduce((s, k) => accrueKid(s, k.id, Date.now()), prev);
  if (next !== prev) mutate(() => next);
}

export function deleteEntryAction(kid: KidId, id: string): void {
  mutate((prev) => ({
    ...prev,
    entries: { ...prev.entries, [kid]: (prev.entries[kid] ?? []).filter((e) => e.id !== id) },
  }));
}

/**
 * Apply the whole editable settings set in one atomic update: currency, the
 * roster of kids (add/rename/recolour/remove), their weekly allowances and
 * savings goals. Entries and allowance clocks are preserved for kids that
 * remain, and dropped for kids that were removed.
 */
export function applySettingsAction(next: {
  currency: string;
  kids: Kid[];
  weekly: Record<KidId, number>;
  goals: Partial<Record<KidId, Goal>>;
}): void {
  mutate((prev) => {
    const entries: Record<KidId, Entry[]> = {};
    const lastAllowance: Partial<Record<KidId, string>> = {};
    for (const kid of next.kids) {
      entries[kid.id] = prev.entries[kid.id] ?? [];
      if (prev.lastAllowance[kid.id]) lastAllowance[kid.id] = prev.lastAllowance[kid.id];
    }
    const settings: Settings = { currency: next.currency || "£", weekly: next.weekly };
    return { kids: next.kids, settings, goals: next.goals, lastAllowance, entries };
  });
}
