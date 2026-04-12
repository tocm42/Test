# 30-Day Paper Trader

AI-powered paper trading simulation — start with £500 in virtual cash and grow your portfolio over 30 days using real market research.

![Screenshot placeholder](screenshot.png)

## Setup

```bash
git clone <your-repo-url>
cd paper-trader
npm install
```

Add your Anthropic API key to `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. **AI research** — Click "Get Suggestions" to call Claude with web search enabled. Claude searches for current stock market news and returns 3 stock picks with prices, conviction levels, and rationale.

2. **Buy stocks** — Each suggestion card shows the ticker, price (in GBP), and a conviction-based share quantity suggestion. Buy what looks promising.

3. **Price simulation** — When you buy a stock, a 30-day forward price trajectory is generated using a volatility-calibrated random walk (Box-Muller Gaussian). Each volatility profile (low/medium/high/vhigh) has a different mean return and standard deviation. Prices update each time you advance a day.

4. **Advance days** — Step through 30 days, watching your portfolio value change. Sell holdings to lock in gains (or cut losses). Get new AI suggestions any time.

5. **Challenge complete** — After 30 days, see your final return, performance chart, and best/worst trades.

No real money is involved. This is a simulation for entertainment and education.

## Tech stack

- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Anthropic Claude API** with web search for AI stock research
- **Recharts** for portfolio performance charts
- **Lucide React** for icons
- **localStorage** for state persistence (no database)

## Deployment (Vercel)

1. Push this repository to GitHub
2. Import the project into [Vercel](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` as an environment variable in your Vercel project settings
4. Deploy

The API route (`/api/suggestions`) runs as a serverless function automatically — no extra configuration needed.

## Disclaimer

This application uses virtual money only. No real financial transactions take place. Stock prices in the simulation are based on AI research but use simulated price trajectories. This is not financial advice.
