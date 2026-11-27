import { GoogleGenAI } from '@google/genai';
import type {
  CongressTrade,
  GroundedSource,
  InsiderTrade,
  PoliticianProfile,
  ScreeningCriteria,
} from '../types';

const STORAGE_KEY = 'signalledger_gemini_api_key';

export function getStoredGeminiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (typeof window !== 'undefined') {
    const localKey = window.localStorage.getItem(STORAGE_KEY);
    if (localKey && localKey.trim()) return localKey.trim();
  }
  return envKey ? String(envKey).trim() : '';
}

export function saveGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  }
}

export interface AnalystContext {
  criteria: ScreeningCriteria;
  shortlistedPoliticians: PoliticianProfile[];
  recentInsiderTrades: InsiderTrade[];
  recentCongressTrades: CongressTrade[];
  watchlistTickers: string[];
}

export interface AnalystResponse {
  text: string;
  sources: GroundedSource[];
}

function buildSystemInstruction(ctx: AnalystContext): string {
  const politicianSummary = ctx.shortlistedPoliticians
    .map(
      (p) =>
        `- ${p.name} (${p.party}-${p.state}, ${p.chamber}): Portfolio $${p.portfolioSizeM}M | 1Y ROI +${p.roi1Y}% vs Delay-Adjusted +${p.delayAdjustedRoi1Y}% (gap ${(p.roi1Y - p.delayAdjustedRoi1Y).toFixed(1)}%, avg delay ${p.avgFilingDelayDays}d) | Committees: ${p.committees.join(', ')} | Top holdings: ${p.topHoldings.join(', ')}`
    )
    .join('\n');

  const clusterSummary = ctx.recentInsiderTrades
    .filter((t) => t.tradeType === 'Buy')
    .slice(0, 10)
    .map(
      (t) =>
        `- ${t.ticker} (${t.companyName}): ${t.insiderName} (${t.title}) bought $${t.value.toLocaleString()} @ $${t.price} (cluster count: ${t.clusterCount}, filed ${t.filingDate})`
    )
    .join('\n');

  const congressSummary = ctx.recentCongressTrades
    .slice(0, 10)
    .map(
      (t) =>
        `- ${t.politician} (${t.party}-${t.chamber}) ${t.transactionType} ${t.ticker} (${t.amountRange}, delay ${t.filingDelayDays}d, disclosed ${t.disclosureDate})`
    )
    .join('\n');

  return `You are SignalLedger, a disciplined, zero-fluff financial research analyst specializing in SEC Form 4 corporate insider cluster buying (OpenInsider / SECForm4) and U.S. Congressional STOCK Act disclosures (Quiver Quantitative / InsiderFinance).

Apply these exact screening criteria whenever evaluating politicians or stocks:
1. Performance: Overall 1Y returns must beat the S&P 500 benchmark (+${ctx.criteria.sp500Benchmark1Y}%).
2. Reliability: 1Y total returns should stay within ${ctx.criteria.maxDelayGapPct}% of delay-adjusted returns (measuring performance if bought on the disclosure date). Flag large disclosure lags as unreliable signals.
3. Size: Prioritize portfolios above $${ctx.criteria.minPortfolioM}M. ${
    ctx.criteria.includeSmallPortfolioExceptions
      ? 'Include sub-$1M exceptions when they show strong returns or unique concentrated stock allocations.'
      : 'Exclude sub-$1M portfolios.'
  }
4. Context: Cross-check Congressional committee overlaps, corporate executive cluster buys (multiple insiders buying together), and reputable current financial news via Google Search.

Current Workspace Snapshot:
Watchlist Tickers: ${ctx.watchlistTickers.length ? ctx.watchlistTickers.join(', ') : 'None yet'}

Shortlisted Politicians Passing Active Filters:
${politicianSummary || 'None passing current filters'}

Recent Corporate Insider Buys Loaded:
${clusterSummary || 'None loaded'}

Recent Congressional Disclosures Loaded:
${congressSummary || 'None loaded'}

Formatting rules:
- Lead with a concise executive takeaway.
- Cite concrete numbers (trade sizes, cluster counts, filing delays, ROI vs. delay-adjusted ROI).
- Highlight overlaps where BOTH corporate executives and shortlisted politicians are buying.
- Include a brief one-line reminder that disclosures are delayed and this is research, not financial advice.`;
}

export async function runGeminiAnalysis(
  prompt: string,
  ctx: AnalystContext,
  useSearchGrounding = true
): Promise<AnalystResponse> {
  const apiKey = getStoredGeminiKey();
  if (!apiKey) {
    throw new Error(
      'No Gemini API key configured. Click "API Key" in the top bar to add your free Google AI Studio key.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: buildSystemInstruction(ctx),
      ...(useSearchGrounding ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  const text = response.text || 'No analysis returned.';
  const sources: GroundedSource[] = [];

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(chunks)) {
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ title: title || uri, uri });
      }
    }
  }

  return { text, sources };
}
