import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';

const app = express();
const PORT = Number(process.env.PROXY_PORT || 3001);

app.use(cors());

interface ParsedOpenInsiderRow {
  id: string;
  filingDate: string;
  tradeDate: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  tradeType: 'Buy' | 'Sell';
  price: number;
  qty: number;
  ownedAfter: number;
  deltaOwnPct: number;
  value: number;
  clusterCount: number;
  source: 'OpenInsider';
}

function parseNum(raw: string): number {
  const cleaned = raw.replace(/[$,+%\s,]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchOpenInsiderTable(url: string): Promise<ParsedOpenInsiderRow[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SignalLedger/1.0 (Personal Research Tool)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!res.ok) {
    throw new Error(`OpenInsider responded with HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows: ParsedOpenInsiderRow[] = [];
  const tickerCounts: Record<string, number> = {};

  $('table.tinytable tbody tr').each((idx, el) => {
    const cells = $(el)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get();

    // OpenInsider standard table has 13+ columns
    if (cells.length < 13) return;

    const filingDate = (cells[1] || '').slice(0, 10);
    const tradeDate = (cells[2] || filingDate).slice(0, 10);
    const ticker = (cells[3] || '').toUpperCase().trim();
    if (!ticker) return;

    const companyName = cells[4] || ticker;
    const insiderName = cells[5] || 'Corporate Insider';
    const title = cells[6] || 'Officer/Director';
    const rawType = cells[7] || 'P - Purchase';
    const tradeType: 'Buy' | 'Sell' = /sale|^s\b/i.test(rawType) ? 'Sell' : 'Buy';
    const price = parseNum(cells[8] || '0');
    const qty = Math.abs(parseNum(cells[9] || '0'));
    const ownedAfter = parseNum(cells[10] || '0');
    const deltaOwnPct = parseNum(cells[11] || '0');
    const value = Math.abs(parseNum(cells[12] || '0')) || Math.round(price * qty);

    if (tradeType === 'Buy') {
      tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
    }

    rows.push({
      id: `oi-${idx}-${ticker}-${filingDate}`,
      filingDate,
      tradeDate,
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
      source: 'OpenInsider',
    });
  });

  return rows.slice(0, 60).map((r) => ({
    ...r,
    clusterCount: Math.max(1, tickerCounts[r.ticker] || 1),
  }));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'live-proxy', sources: ['OpenInsider'] });
});

app.get('/api/openinsider/clusters', async (_req, res) => {
  try {
    const trades = await fetchOpenInsiderTable('http://openinsider.com/latest-cluster-buys');
    res.json({ ok: true, fetchedAt: new Date().toISOString(), count: trades.length, trades });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to fetch OpenInsider cluster buys',
    });
  }
});

app.get('/api/openinsider/latest', async (_req, res) => {
  try {
    const trades = await fetchOpenInsiderTable('http://openinsider.com/latest-insider-trading');
    res.json({ ok: true, fetchedAt: new Date().toISOString(), count: trades.length, trades });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to fetch OpenInsider latest trades',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[SignalLedger Proxy] Running on http://localhost:${PORT}`);
});
