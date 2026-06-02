export type KidName = "Sebastian" | "Oscar";

export type EntryType = "allowance" | "bonus" | "spend";

export interface Entry {
  id: string;
  type: EntryType;
  /** Always a positive number; `type` determines whether it adds or subtracts. */
  amount: number;
  reason: string;
  note: string;
  /** ISO timestamp. */
  date: string;
}

export interface Settings {
  currency: string;
  weekly: Record<KidName, number>;
}

export interface AppState {
  settings: Settings;
  /** ISO timestamp the allowance clock is counted from, per kid. */
  lastAllowance: Partial<Record<KidName, string>>;
  entries: Record<KidName, Entry[]>;
}
