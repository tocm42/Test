import { useSyncExternalStore } from "react";
import {
  addEntryAction,
  deleteEntryAction,
  getServerSnapshot,
  getSnapshot,
  payAllowanceAction,
  subscribe,
  updateSettingsAction,
} from "./store";

const noopSubscribe = () => () => {};

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
    payAllowance: payAllowanceAction,
    deleteEntry: deleteEntryAction,
    updateSettings: updateSettingsAction,
  };
}
