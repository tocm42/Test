"use client";

import { useState } from "react";
import { connect } from "../lib/sync";

/** Full-screen unlock prompt shown before the app when cloud sync is enabled. */
export default function PinGate({ connecting }: { connecting: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim().length < 4) {
      setError("Please enter at least 4 digits.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await connect(pin.trim());
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-1 text-2xl">💰🔒</div>
        <h1 className="text-lg font-bold text-gray-900">Pocket Money Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your family PIN to unlock and sync this device. The first device sets
          the PIN — use the same one everywhere.
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={busy || connecting}
          placeholder="Family PIN"
          aria-label="Family PIN"
          className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-indigo-500"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || connecting}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {busy || connecting ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
