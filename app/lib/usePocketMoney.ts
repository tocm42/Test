import { useSyncExternalStore } from "react";
import {
  accrueAllowanceAction,
  addEntryAction,
  applySettingsAction,
  deleteEntryAction,
  editEntryAction,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "./store";
import { getStatus, type SyncStatus, subscribeStatus } from "./sync";

const noopSubscribe = () => () => {};

/** Live cloud-sync status (always "disabled" during SSR / when not configured). */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore<SyncStatus>(
    subscribeStatus,
    getStatus,
    () => "disabled",
  );
}

export function usePocketMoney() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false during SSR + first hydration render, true once on the client — lets
  // us avoid flashing default data before localStorage is read.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return {
    state,
    hydrated,
    addEntry: addEntryAction,
    editEntry: editEntryAction,
    accrueAllowance: accrueAllowanceAction,
    deleteEntry: deleteEntryAction,
    applySettings: applySettingsAction,
  };
}
