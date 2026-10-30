import type { AppState, Entry, Goal, Kid, KidId, Settings } from "./types";

export const STORAGE_KEY = "pocketMoney.v1";

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

/** Keep only one allowance entry per week, cleaning up any duplicates created
 * by the earlier DST-sensitive scheduler. Keeps the first (newest) occurrence;
 * non-allowance entries pass through untouched. Weeks are matched by their
 * Saturday calendar date, so differently-timestamped duplicates still collapse. */
function dedupeAllowanceByWeek(list: Entry[]): Entry[] {
  const weeks = new Set<string>();
  return list.filter((e) => {
    if (e.type !== "allowance") return true;
    const key = weekKeyOf(e.date);
    return weeks.has(key) ? false : (weeks.add(key), true);
  });
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
    entries[kid.id] = dedupeAllowanceByWeek(dedupeById(parsed.entries?.[kid.id] ?? []));
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

// Weeks are identified by their Saturday's LOCAL CALENDAR DATE (e.g.
// "2026-10-24"), never a millisecond timestamp. All stepping is done with
// setDate(), which moves by whole calendar days and keeps the clock at 07:00
// local — so it stays correct across daylight-saving changes (a timestamp-ms
// approach drifts by an hour at the spring/autumn change and re-adds a week).
const ALLOWANCE_DAY = 6; // 0 = Sunday … 6 = Saturday
const ALLOWANCE_HOUR = 7;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar-date key, e.g. "2026-10-24". */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** The Saturday at 07:00 local on or before `d`'s calendar date. */
function saturdayOnOrBefore(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), ALLOWANCE_HOUR, 0, 0, 0);
  while (s.getDay() !== ALLOWANCE_DAY) s.setDate(s.getDate() - 1);
  return s;
}

/** The week an allowance entry belongs to, as a Saturday date key. */
function weekKeyOf(iso: string): string {
  return dateKey(saturdayOnOrBefore(new Date(iso)));
}

/** The most recent Saturday 07:00 (local) that has already arrived at `now`. */
function currentAllowanceSaturday(now: Date): Date {
  const s = saturdayOnOrBefore(now);
  if (s.getTime() > now.getTime()) s.setDate(s.getDate() - 7); // today's 07:00 not here yet
  return s;
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

/**
 * Add any missing weekly allowance entries for one kid — from the current
 * Saturday back to (but not including) the most recent week already paid.
 * Weeks are keyed by their Saturday calendar date, so the same week is never
 * paid twice, it's DST-proof, and it stays correct no matter what's been
 * deleted. Deterministic ids let two synced devices converge without doubling.
 */
function accrueKid(prev: AppState, kid: KidId, nowMs: number): AppState {
  const weekly = Number(prev.settings.weekly[kid]) || 0;
  if (weekly <= 0) return prev;

  const entries = prev.entries[kid] ?? [];
  const coveredWeeks = new Set<string>();
  const existingIds = new Set<string>();
  for (const e of entries) {
    existingIds.add(e.id);
    if (e.type === "allowance") coveredWeeks.add(weekKeyOf(e.date));
  }
  const isNew = coveredWeeks.size === 0;

  const target = currentAllowanceSaturday(new Date(nowMs));
  const missing: Date[] = [];
  const cursor = new Date(target);
  for (let i = 0; i < 60; i++) {
    if (coveredWeeks.has(dateKey(cursor))) break; // reached already-paid weeks
    missing.push(new Date(cursor));
    if (isNew) break; // brand-new kid → grant the current week only
    cursor.setDate(cursor.getDate() - 7); // step back a whole calendar week
  }

  const added: Entry[] = missing
    .map((sat) => ({
      id: `alw-${kid}-${dateKey(sat)}`,
      type: "allowance" as const,
      amount: round2(weekly),
      reason: "Weekly allowance",
      note: "",
      date: sat.toISOString(),
    }))
    .filter((e) => !existingIds.has(e.id)); // never duplicate an existing id
  if (added.length === 0) return prev;

  const merged = [...added, ...entries].sort(
    (a, z) => new Date(z.date).getTime() - new Date(a.date).getTime(),
  );
  return {
    ...prev,
    lastAllowance: { ...prev.lastAllowance, [kid]: target.toISOString() },
    entries: { ...prev.entries, [kid]: merged },
  };
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
