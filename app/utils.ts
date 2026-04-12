// ── Types ──

export type Screen = "welcome" | "dashboard" | "end";
export type Volatility = "low" | "medium" | "high" | "vhigh";
export type Conviction = "high" | "medium" | "low";

export interface Holding {
  ticker: string;
  company: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  volatility: Volatility;
  buyDay: number;
  priceHistory: number[];
  priceIndex: number;
}

export interface Trade {
  action: "BUY" | "SELL";
  ticker: string;
  shares: number;
  price: number;
  day: number;
  gainPct?: number;
  gainAbs?: number;
}

export interface DailyValue {
  day: number;
  value: number;
}

export interface SuggestionPick {
  ticker: string;
  company: string;
  exchange: string;
  current_price_gbp: number;
  volatility: Volatility;
  conviction: Conviction;
  rationale: string;
}

export interface SuggestionsResponse {
  market_summary: string;
  picks: SuggestionPick[];
}

export interface GameState {
  screen: Screen;
  day: number;
  cash: number;
  holdings: Holding[];
  tradeHistory: Trade[];
  dailyValues: DailyValue[];
  suggestions: SuggestionsResponse | null;
  loading: boolean;
  error: string | null;
}

// ── Constants ──

export const INITIAL_CASH = 500;
export const TOTAL_DAYS = 30;

export const VOLATILITY_PROFILES: Record<
  Volatility,
  { mean: number; std: number }
> = {
  low: { mean: 0.0008, std: 0.008 },
  medium: { mean: 0.001, std: 0.015 },
  high: { mean: 0.0012, std: 0.028 },
  vhigh: { mean: 0.0015, std: 0.04 },
};

// ── Helpers ──

/** Box-Muller transform for Gaussian random numbers */
export function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Generate a 30-day forward price trajectory */
export function generatePriceTrajectory(
  startPrice: number,
  volatility: Volatility
): number[] {
  const profile = VOLATILITY_PROFILES[volatility];
  const prices: number[] = [startPrice];
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const dailyReturn = profile.mean + profile.std * gaussianRandom();
    const prev = prices[i - 1];
    prices.push(Math.max(0.01, prev * (1 + dailyReturn)));
  }
  return prices;
}

/** Format currency in GBP */
export function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`;
}

/** Calculate percentage change */
export function pctChange(current: number, original: number): number {
  if (original === 0) return 0;
  return ((current - original) / original) * 100;
}

/** Calculate total portfolio value */
export function totalPortfolioValue(cash: number, holdings: Holding[]): number {
  const invested = holdings.reduce(
    (sum, h) => sum + h.shares * h.currentPrice,
    0
  );
  return cash + invested;
}

/** Calculate total invested amount */
export function totalInvested(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
}

/** Suggest number of shares based on conviction */
export function suggestedShares(
  conviction: Conviction,
  price: number,
  cash: number
): number {
  const pct = conviction === "high" ? 0.3 : conviction === "medium" ? 0.2 : 0.1;
  const budget = cash * pct;
  return Math.max(1, Math.floor(budget / price));
}

/** Save state to localStorage */
export function saveState(state: GameState): void {
  try {
    localStorage.setItem("paper-trader-state", JSON.stringify(state));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/** Load state from localStorage */
export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem("paper-trader-state");
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

/** Get default initial state */
export function getInitialState(): GameState {
  return {
    screen: "welcome",
    day: 1,
    cash: INITIAL_CASH,
    holdings: [],
    tradeHistory: [],
    dailyValues: [{ day: 1, value: INITIAL_CASH }],
    suggestions: null,
    loading: false,
    error: null,
  };
}
