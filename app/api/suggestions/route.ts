import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface Holding {
  ticker: string;
  shares: number;
  currentPrice: number;
}

interface RequestBody {
  cash: number;
  holdings: Holding[];
  day: number;
  recentTrades: string[];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured. Please add it to .env.local" },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();
    const { cash, holdings, day, recentTrades } = body;

    const holdingSummary =
      holdings.length > 0
        ? holdings
            .map(
              (h) =>
                `${h.ticker} (${h.shares} shares @ £${h.currentPrice.toFixed(2)})`
            )
            .join(", ")
        : "none";

    const recentTradesSummary =
      recentTrades.length > 0 ? recentTrades.join(", ") : "none yet";

    const systemPrompt = `You are a stock market research analyst for a UK-based paper trading simulation. The user has £${cash.toFixed(2)} in cash and these current holdings: ${holdingSummary}. This is day ${day} of 30. Recent trades: ${recentTradesSummary}.

Search the web for current stock market news, trends, and promising opportunities. Focus on stocks listed on major exchanges (London Stock Exchange, New York Stock Exchange, NASDAQ).

Based on your research, suggest exactly 3 stock picks. For each pick, determine a realistic current share price from your research.

You MUST respond with ONLY a JSON object in this exact format, no other text:
{
  "market_summary": "One sentence summary of current market conditions",
  "picks": [
    {
      "ticker": "AAPL",
      "company": "Apple Inc",
      "exchange": "NASDAQ",
      "current_price_gbp": 185.50,
      "volatility": "medium",
      "conviction": "high",
      "rationale": "2-3 sentence explanation"
    }
  ]
}

Volatility must be one of: low, medium, high, vhigh.
Conviction must be one of: high, medium, low.
Prices should be in GBP. For USD-listed stocks, convert at roughly 0.79 GBP per USD.
Pick a diverse mix — different sectors and risk levels.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "Search for current stock market news and give me your 3 stock picks for today.",
        },
      ],
    });

    // Extract text blocks from the response
    const textBlocks = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text);

    const fullText = textBlocks.join("\n");

    // Try to parse JSON from the response
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response — no JSON found" },
        { status: 500 }
      );
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return NextResponse.json(suggestions);
  } catch (error: unknown) {
    console.error("Suggestions API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
