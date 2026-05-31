import { useCallback, useEffect, useState } from "react";
import type { AppState, EntryType, KidName } from "./types";
import {
  defaultState,
  loadState,
  round2,
  saveState,
  uid,
  WEEK_MS,
  weeksDue,
} from "./store";

export function usePocketMoney() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount to avoid SSR hydration mismatches.
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist whenever state changes (once hydrated).
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const addEntry = useCallback(
    (kid: KidName, type: Exclude<EntryType, "allowance">, amount: number, reason: string, note: string) => {
      setState((prev) => ({
        ...prev,
        entries: {
          ...prev.entries,
          [kid]: [
            {
              id: uid(),
              type,
              amount: round2(amount),
              reason,
              note,
              date: new Date().toISOString(),
            },
            ...prev.entries[kid],
          ],
        },
      }));
    },
    [],
  );

  const payAllowance = useCallback((kid: KidName) => {
    setState((prev) => {
      const due = weeksDue(prev, kid);
      const weekly = Number(prev.settings.weekly[kid]) || 0;
      if (due <= 0 || weekly <= 0) return prev;

      const total = round2(weekly * due);
      const label = due === 1 ? "Weekly allowance" : `Weekly allowance (${due} weeks)`;
      // Advance the clock by the whole weeks paid so partial weeks aren't lost.
      const base = prev.lastAllowance[kid]
        ? new Date(prev.lastAllowance[kid] as string).getTime()
        : Date.now();

      return {
        ...prev,
        lastAllowance: {
          ...prev.lastAllowance,
          [kid]: new Date(base + due * WEEK_MS).toISOString(),
        },
        entries: {
          ...prev.entries,
          [kid]: [
            {
              id: uid(),
              type: "allowance" as const,
              amount: total,
              reason: label,
              note: "",
              date: new Date().toISOString(),
            },
            ...prev.entries[kid],
          ],
        },
      };
    });
  }, []);

  const deleteEntry = useCallback((kid: KidName, id: string) => {
    setState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [kid]: prev.entries[kid].filter((e) => e.id !== id),
      },
    }));
  }, []);

  const updateSettings = useCallback((currency: string, weekly: Record<KidName, number>) => {
    setState((prev) => ({
      ...prev,
      settings: { currency: currency || "£", weekly },
    }));
  }, []);

  return { state, hydrated, addEntry, payAllowance, deleteEntry, updateSettings };
}
