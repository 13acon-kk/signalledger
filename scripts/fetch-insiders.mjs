import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function parseNum(raw) {
  const cleaned = String(raw || '').replace(/[$,+%\s,]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchOpenInsider(url) {
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
  const rows = [];
  const tickerCounts = {};

  $('table.tinytable tbody tr').each((idx, el) => {
    const cells = $(el)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get();

    if (cells.length < 13) return;

    const filingDate = (cells[1] || '').slice(0, 10);
    const tradeDate = (cells[2] || filingDate).slice(0, 10);
    const ticker = (cells[3] || '').toUpperCase().trim();
    if (!ticker) return;

    const companyName = cells[4] || ticker;
    const insiderName = cells[5] || 'Corporate Insider';
    const title = cells[6] || 'Officer/Director';
    const rawType = cells[7] || 'P - Purchase';
    const tradeType = /sale|^s\b/i.test(rawType) ? 'Sell' : 'Buy';
    const price = parseNum(cells[8]);
    const qty = Math.abs(parseNum(cells[9]));
    const ownedAfter = parseNum(cells[10]);
    const deltaOwnPct = parseNum(cells[11]);
    const value = Math.abs(parseNum(cells[12])) || Math.round(price * qty);

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

  return rows.slice(0, 80).map((r) => ({
    ...r,
    clusterCount: Math.max(1, tickerCounts[r.ticker] || 1),
  }));
}

async function main() {
  const outPath = resolve(process.cwd(), 'public/data/insiders.json');
  await mkdir(dirname(outPath), { recursive: true });

  const trades = await fetchOpenInsider('http://openinsider.com/latest-cluster-buys');
  const payload = {
    ok: true,
    fetchedAt: new Date().toISOString(),
    count: trades.length,
    trades,
  };

  await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${trades.length} OpenInsider rows to ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to fetch OpenInsider:', err);
  process.exit(1);
});
