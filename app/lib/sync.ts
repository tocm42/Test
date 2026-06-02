// Optional cross-device sync via Supabase. The whole AppState is stored as a
// single encrypted row; any device with the family PIN can read/write it, and
// realtime keeps every device live. If the Supabase env vars aren't set, this
// layer stays dormant and the app behaves as a purely local (localStorage) app.

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { AppState } from "./types";
import { applyRemoteState, getSnapshot, migrate, setRemotePush } from "./store";
import { decryptJSON, encryptJSON } from "./crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the backend is configured at build time. */
export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const TABLE = "app_state";
const ROW_ID = "family";
const PIN_KEY = "pocketMoney.pin";

export type SyncStatus = "disabled" | "locked" | "connecting" | "synced" | "offline";

let status: SyncStatus = syncConfigured ? "locked" : "disabled";
const statusListeners = new Set<() => void>();

export function getStatus(): SyncStatus {
  return status;
}

export function subscribeStatus(cb: () => void): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function setStatus(next: SyncStatus): void {
  if (next === status) return;
  status = next;
  statusListeners.forEach((l) => l());
}

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  return client;
}

let pin: string | null = null;
let channel: RealtimeChannel | null = null;
let lastWritten: string | null = null; // ciphertext we wrote, to ignore our own echo
let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pushNow(state: AppState): Promise<void> {
  const c = getClient();
  if (!c || !pin) return;
  try {
    const encrypted = await encryptJSON(state, pin);
    lastWritten = encrypted;
    const { error } = await c
      .from(TABLE)
      .upsert({ id: ROW_ID, data: encrypted, updated_at: new Date().toISOString() });
    if (error) throw error;
    setStatus("synced");
  } catch {
    setStatus("offline");
  }
}

function schedulePush(state: AppState): void {
  if (!pin) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(state), 400);
}

function subscribeRealtime(c: SupabaseClient): void {
  if (channel) return;
  channel = c
    .channel("app_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `id=eq.${ROW_ID}` },
      (payload) => {
        const encrypted = (payload.new as { data?: string } | null)?.data;
        if (!encrypted || !pin || encrypted === lastWritten) return;
        void decryptJSON<AppState>(encrypted, pin)
          .then((state) => applyRemoteState(migrate(state)))
          .catch(() => {
            /* a payload we can't decrypt (e.g. PIN changed elsewhere) — ignore */
          });
      },
    )
    .subscribe();
}

/**
 * Unlock and connect with the family PIN. If cloud data already exists, the PIN
 * must decrypt it; otherwise this device's data seeds the cloud and the entered
 * PIN becomes the shared family PIN.
 */
export async function connect(
  enteredPin: string,
  remember = true,
): Promise<{ ok: boolean; error?: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: "Sync isn't configured." };
  setStatus("connecting");
  try {
    const { data, error } = await c.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
    if (error) throw error;

    if (data?.data) {
      let state: AppState;
      try {
        state = await decryptJSON<AppState>(data.data, enteredPin);
      } catch {
        setStatus("locked");
        return { ok: false, error: "That PIN doesn't match this family's data." };
      }
      pin = enteredPin;
      lastWritten = data.data;
      applyRemoteState(migrate(state));
    } else {
      // First device to connect: seed the cloud from whatever is on this device.
      pin = enteredPin;
      await pushNow(getSnapshot());
    }

    if (remember && typeof window !== "undefined") localStorage.setItem(PIN_KEY, enteredPin);
    setRemotePush(schedulePush);
    subscribeRealtime(c);
    setStatus("synced");
    return { ok: true };
  } catch {
    setStatus("offline");
    return { ok: false, error: "Couldn't reach the sync server. Check your connection." };
  }
}

/** Forget the PIN on this device and stop syncing. */
export function lock(): void {
  pin = null;
  if (typeof window !== "undefined") localStorage.removeItem(PIN_KEY);
  if (channel) {
    void channel.unsubscribe();
    channel = null;
  }
  setRemotePush(null);
  setStatus("locked");
}

/** Auto-reconnect on load if this device already remembers the PIN. */
export function initSync(): void {
  if (!syncConfigured || typeof window === "undefined") return;
  const saved = localStorage.getItem(PIN_KEY);
  if (saved) void connect(saved);
}
