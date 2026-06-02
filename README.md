# 💰 Pocket Money Tracker

A simple pocket money tracker for **Sebastian** and **Oscar**. Each child gets a
guaranteed weekly allowance, can earn special bonuses for being helpful or
gracious, and their spending is tracked too — so you always know the current
balance.

Built with **Next.js (App Router)**, **TypeScript** and **Tailwind CSS**. Data is
stored locally in the browser (`localStorage`) — no backend or database needed.

## Features

- **Two children** — Sebastian and Oscar, each with their own balance and history.
- **Weekly allowance** — a configurable minimum amount per week. The app counts
  how many whole weeks are owed and pays them with one tap, catching up if you
  missed a few weeks.
- **Bonus money** — award extra for *being helpful*, *being gracious*, good
  behaviour or chores, each with an optional note.
- **Spending** — record what each child spends, and balances update automatically.
- **Full history** — every allowance, bonus and spend is listed, and can be
  deleted if you make a mistake.
- **Settings** — change the currency symbol and each child's weekly amount.
- **Export** — download all data as JSON for backup.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To build for production:

```bash
npm run build
npm start
```

> **Note:** data lives in the browser's local storage, so use the same
> browser/device to keep a continuous history, and use **Export data** in
> Settings (⚙️) to keep a backup.

## Project structure

| Path                              | Purpose                                   |
|-----------------------------------|-------------------------------------------|
| `app/page.tsx`                    | Main page, wires state to the UI          |
| `app/layout.tsx`                  | Root layout and metadata                  |
| `app/lib/types.ts`                | Shared TypeScript types                    |
| `app/lib/store.ts`                | Constants, persistence and pure helpers   |
| `app/lib/usePocketMoney.ts`       | State hook with allowance/bonus/spend logic |
| `app/components/KidCard.tsx`      | Per-child card with balance and history   |
| `app/components/EntryModal.tsx`   | Add-bonus / record-spend dialog           |
| `app/components/SettingsModal.tsx`| Currency and weekly-amount settings       |
