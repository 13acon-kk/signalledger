import type { CongressTrade, InsiderTrade } from '../types';

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/[$,+\s]/g, '').toUpperCase();
  if (!cleaned) return 0;
  let multiplier = 1;
  let numStr = cleaned;
  if (cleaned.endsWith('K')) {
    multiplier = 1_000;
    numStr = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('M')) {
    multiplier = 1_000_000;
    numStr = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('B')) {
    multiplier = 1_000_000_000;
    numStr = cleaned.slice(0, -1);
  }
  const n = parseFloat(numStr.replace(/,/g, ''));
  return Number.isFinite(n) ? n * multiplier : 0;
}

function parsePercent(raw: string): number {
  const cleaned = raw.replace(/[%,+\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function estimateRangeMidpoint(rangeStr: string): number {
  const matches = rangeStr.match(/\$?[\d,.]+[KMB]?/gi);
  if (!matches || matches.length === 0) return 0;
  if (matches.length === 1) return parseCurrency(matches[0]);
  return Math.round((parseCurrency(matches[0]) + parseCurrency(matches[1])) / 2);
}

function daysBetween(startDate: string, endDate: string): number {
  const a = new Date(startDate).getTime();
  const b = new Date(endDate).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 14;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Parses tab-separated or multi-space rows pasted from OpenInsider or SECForm4.
 * Supports OpenInsider's standard columns:
 * X | Filing Date | Trade Date | Ticker | Company Name | Insider Name | Title | Trade Type | Price | Qty | Owned | ΔOwn | Value
 */
export function parseInsiderPaste(
  rawText: string,
  source: 'OpenInsider' | 'SECForm4' = 'OpenInsider'
): InsiderTrade[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const trades: InsiderTrade[] = [];
  const tickerCounts: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header lines
    if (/filing\s*date|trade\s*date|ticker|company\s*name/i.test(line)) {
      continue;
    }

    const cols = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(/\s{2,}/).map((c) => c.trim());

    if (cols.length < 5) continue;

    // Detect if first column is OpenInsider's single-letter flag (e.g., "M", "D", "A", "")
    const hasFlagCol = cols.length >= 12 && /^[A-Z]{0,2}$/.test(cols[0]);
    const offset = hasFlagCol ? 1 : 0;

    // OpenInsider full format (12+ columns)
    if (cols.length - offset >= 11) {
      const filingDate = (cols[offset] || '').slice(0, 10);
      const tradeDate = (cols[offset + 1] || filingDate).slice(0, 10);
      const ticker = (cols[offset + 2] || '').toUpperCase().replace(/[^A-Z0-9.-]/g, '');
      if (!ticker || ticker.length > 6) continue;

      const companyName = cols[offset + 3] || ticker;
      const insiderName = cols[offset + 4] || 'Insider';
      const title = cols[offset + 5] || 'Officer/Director';
      const rawType = cols[offset + 6] || 'P - Purchase';
      const tradeType: 'Buy' | 'Sell' = /sale|^s\b/i.test(rawType) ? 'Sell' : 'Buy';
      const price = parseCurrency(cols[offset + 7] || '0');
      const qty = Math.abs(parseCurrency(cols[offset + 8] || '0'));
      const ownedAfter = parseCurrency(cols[offset + 9] || '0');
      const deltaOwnPct = parsePercent(cols[offset + 10] || '0');
      const value = Math.abs(parseCurrency(cols[offset + 11] || '0')) || Math.round(price * qty);

      tickerCounts[ticker] = (tickerCounts[ticker] || 0) + (tradeType === 'Buy' ? 1 : 0);

      trades.push({
        id: `paste-ins-${Date.now()}-${i}`,
        filingDate: filingDate || new Date().toISOString().slice(0, 10),
        tradeDate: tradeDate || filingDate || new Date().toISOString().slice(0, 10),
        ticker,
        companyName,
        insiderName,
        title,
        tradeType,
        price,
        qty,
        ownedAfter,
        deltaOwnPct,
        value,
        clusterCount: 1,
        source,
      });
      continue;
    }

    // Compact / SECForm4 format: Date | Ticker | Company/Insider | Type | Value
    const tickerMatch = cols.find((c) => /^[A-Z]{1,5}$/.test(c));
    if (!tickerMatch) continue;
    const valueCol = [...cols].reverse().find((c) => /\$[\d,]+/.test(c)) || '0';
    const isSell = cols.some((c) => /sale|sell/i.test(c));
    const dateCol = cols.find((c) => /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(c));

    tickerCounts[tickerMatch] = (tickerCounts[tickerMatch] || 0) + (!isSell ? 1 : 0);

    trades.push({
      id: `paste-ins-${Date.now()}-${i}`,
      filingDate: dateCol ? dateCol.slice(0, 10) : new Date().toISOString().slice(0, 10),
      tradeDate: dateCol ? dateCol.slice(0, 10) : new Date().toISOString().slice(0, 10),
      ticker: tickerMatch,
      companyName: cols[cols.indexOf(tickerMatch) + 1] || tickerMatch,
      insiderName: cols[2] || 'Executive Insider',
      title: 'SEC Form 4 Filer',
      tradeType: isSell ? 'Sell' : 'Buy',
      price: 0,
      qty: 0,
      ownedAfter: 0,
      deltaOwnPct: 0,
      value: parseCurrency(valueCol),
      clusterCount: 1,
      source,
    });
  }

  return trades.map((t) => ({
    ...t,
    clusterCount: Math.max(1, tickerCounts[t.ticker] || 1),
  }));
}

/**
 * Parses tab-separated or multi-space rows pasted from Quiver Quantitative or InsiderFinance.
 * Flexible column matching for: Politician | Ticker | Transaction | Amount | Trade Date | Disclosure Date
 */
export function parseCongressPaste(
  rawText: string,
  source: 'Quiver' | 'InsiderFinance' = 'Quiver'
): CongressTrade[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const trades: CongressTrade[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/politician|representative|senator|ticker|transaction|disclosure/i.test(line)) {
      continue;
    }

    const cols = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(/\s{2,}/).map((c) => c.trim());

    if (cols.length < 3) continue;

    const tickerCol = cols.find((c) => /^[A-Z]{1,5}$/.test(c));
    if (!tickerCol) continue;

    const politician =
      cols.find(
        (c) =>
          c !== tickerCol &&
          /^[A-Za-z.\s'-]{4,40}$/.test(c) &&
          !/purchase|sale|buy|sell|house|senate|democrat|republican/i.test(c)
      ) || 'Member of Congress';

    const party: 'D' | 'R' | 'I' = cols.some((c) => /\b(R|Republican)\b/i.test(c))
      ? 'R'
      : cols.some((c) => /\b(D|Democrat)\b/i.test(c))
        ? 'D'
        : 'I';

    const chamber: 'House' | 'Senate' = cols.some((c) => /senate|sen\./i.test(c))
      ? 'Senate'
      : 'House';

    const transactionType: 'Buy' | 'Sell' = cols.some((c) => /sale|sell/i.test(c))
      ? 'Sell'
      : 'Buy';

    const amountRange =
      cols.find((c) => /\$[\d,.]+[KMB]?\s*[-–]\s*\$?[\d,.]+[KMB]?/i.test(c)) ||
      cols.find((c) => /\$[\d,.]+/i.test(c)) ||
      '$15K - $50K';

    const dates = cols.filter((c) =>
      /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}/.test(c)
    );
    const tradeDate = dates[0] || new Date().toISOString().slice(0, 10);
    const disclosureDate = dates[1] || dates[0] || new Date().toISOString().slice(0, 10);

    trades.push({
      id: `paste-cong-${Date.now()}-${i}`,
      politician,
      party,
      chamber,
      ticker: tickerCol,
      companyName: tickerCol,
      transactionType,
      amountRange,
      estimatedValue: estimateRangeMidpoint(amountRange),
      tradeDate,
      disclosureDate,
      filingDelayDays: daysBetween(tradeDate, disclosureDate),
      source,
    });
  }

  return trades;
}
