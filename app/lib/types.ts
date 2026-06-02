/** A kid's stable identifier. Existing data uses the name as the id; new kids
 * get a generated id so renaming a child never loses their history. */
export type KidId = string;

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

export interface Kid {
  id: KidId;
  name: string;
  emoji: string;
  color: string;
}

/** An optional savings goal for a kid. */
export interface Goal {
  label: string;
  /** Positive target amount. */
  target: number;
}

export interface Settings {
  currency: string;
  /** Minimum weekly allowance, per kid id. */
  weekly: Record<KidId, number>;
}

export interface AppState {
  kids: Kid[];
  settings: Settings;
  /** Optional savings goal per kid id. */
  goals: Partial<Record<KidId, Goal>>;
  /** ISO timestamp the allowance clock is counted from, per kid id. */
  lastAllowance: Partial<Record<KidId, string>>;
  entries: Record<KidId, Entry[]>;
}
