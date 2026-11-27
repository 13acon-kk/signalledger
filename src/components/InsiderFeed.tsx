import { useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ClipboardPaste,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FREE_SOURCE_URLS, getTrackerLinks } from '../data/sampleData';
import type { DataSourceMode, InsiderTrade } from '../types';

interface InsiderFeedProps {
  trades: InsiderTrade[];
  sourceMode: DataSourceMode;
  isSyncing: boolean;
  syncError: string;
  watchlistTickers: Set<string>;
  onSyncLiveClusters: () => void;
  onOpenPasteModal: () => void;
  onToggleWatchlist: (ticker: string, companyName: string, tag: string) => void;
  onAskGeminiTicker: (ticker: string) => void;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export function InsiderFeed({
  trades,
  sourceMode,
  isSyncing,
  syncError,
  watchlistTickers,
  onSyncLiveClusters,
  onOpenPasteModal,
  onToggleWatchlist,
  onAskGeminiTicker,
}: InsiderFeedProps) {
  const [search, setSearch] = useState('');
  const [clusterOnly, setClusterOnly] = useState(true);
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'ALL' | 'Buy' | 'Sell'>('Buy');
  const [minValueK, setMinValueK] = useState(100);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trades.filter((t) => {
      if (clusterOnly && t.clusterCount < 2) return false;
      if (tradeTypeFilter !== 'ALL' && t.tradeType !== tradeTypeFilter) return false;
      if (t.value < minValueK * 1000) return false;
      if (
        q &&
        !t.ticker.toLowerCase().includes(q) &&
        !t.companyName.toLowerCase().includes(q) &&
        !t.insiderName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [trades, search, clusterOnly, tradeTypeFilter, minValueK]);

  const stats = useMemo(() => {
    const buys = filtered.filter((t) => t.tradeType === 'Buy');
    const totalBuyValue = buys.reduce((sum, t) => sum + t.value, 0);
    const uniqueTickers = new Set(buys.map((t) => t.ticker));
    const clusterTickers = new Set(buys.filter((t) => t.clusterCount >= 2).map((t) => t.ticker));
    const maxCluster = buys.reduce((m, t) => Math.max(m, t.clusterCount), 0);
    return {
      totalBuyValue,
      uniqueTickers: uniqueTickers.size,
      clusterTickers: clusterTickers.size,
      maxCluster,
    };
  }, [filtered]);

  const chartData = useMemo(() => {
    const byTicker: Record<string, { ticker: string; valueK: number; insiders: number }> = {};
    for (const t of filtered) {
      if (t.tradeType !== 'Buy') continue;
      if (!byTicker[t.ticker]) {
        byTicker[t.ticker] = { ticker: t.ticker, valueK: 0, insiders: t.clusterCount };
      }
      byTicker[t.ticker].valueK += Math.round(t.value / 1000);
      byTicker[t.ticker].insiders = Math.max(byTicker[t.ticker].insiders, t.clusterCount);
    }
    return Object.values(byTicker)
      .sort((a, b) => b.valueK - a.valueK)
      .slice(0, 8);
  }, [filtered]);

  return (
    <section aria-label="Corporate Insider Form 4 Tracker">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Corporate Insiders &amp; Cluster Buys</h2>
          <p className="page-lead">
            Track real-time SEC Form 4 executive purchases with cluster-buy filtering — zero subscription fees.
          </p>
        </div>

        <div className="page-actions">
          <button
            id="btn-sync-openinsider"
            type="button"
            className="btn"
            onClick={onSyncLiveClusters}
            disabled={isSyncing || sourceMode !== 'live-proxy'}
            title={
              sourceMode === 'live-proxy'
                ? 'Fetch live cluster buys from OpenInsider via local proxy'
                : 'Start local proxy with "npm run dev:full" for 1-click live sync'
            }
          >
            <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Syncing…' : 'Sync Live OpenInsider'}</span>
          </button>

          <button
            id="btn-paste-insiders"
            type="button"
            className="btn btn-primary"
            onClick={onOpenPasteModal}
          >
            <ClipboardPaste size={14} />
            <span>Paste OpenInsider / SECForm4</span>
          </button>
        </div>
      </div>

      <div className="source-strip">
        <span>
          <strong>Free Form 4 Sources:</strong> Open directly in a tab, filter for Cluster Buys, or paste rows right into SignalLedger.
        </span>
        <div className="source-links">
          <a className="ext-link" href={FREE_SOURCE_URLS.openInsiderClusters} target="_blank" rel="noreferrer">
            OpenInsider Cluster Buys <ExternalLink size={11} />
          </a>
          <a className="ext-link" href={FREE_SOURCE_URLS.openInsiderHome} target="_blank" rel="noreferrer">
            OpenInsider Screener <ExternalLink size={11} />
          </a>
          <a className="ext-link" href={FREE_SOURCE_URLS.secForm4} target="_blank" rel="noreferrer">
            SECForm4.com <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {syncError && <div className="notice-banner error">{syncError}</div>}

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Filtered Buy Volume</div>
          <div className="kpi-value positive">{formatUsd(stats.totalBuyValue)}</div>
          <div className="kpi-sub">Across {stats.uniqueTickers} unique tickers</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cluster-Buy Tickers</div>
          <div className="kpi-value">{stats.clusterTickers}</div>
          <div className="kpi-sub">2+ executives buying together</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Strongest Cluster</div>
          <div className="kpi-value">{stats.maxCluster}x</div>
          <div className="kpi-sub">Distinct insiders on one ticker</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Feed Status</div>
          <div className="kpi-value" style={{ fontSize: 17, paddingTop: 4 }}>
            {sourceMode === 'live-proxy' ? 'Live Proxy Ready' : 'Standalone / Paste'}
          </div>
          <div className="kpi-sub">
            {sourceMode === 'live-proxy'
              ? 'OpenInsider HTML parser active'
              : 'Run npm run dev:full for auto-fetch'}
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Executive Accumulation by Ticker ($K)</h3>
              <p className="panel-subtitle">Aggregated open-market purchase value in current filter view</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e4dc" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 12, fill: '#4e4c46', fontFamily: 'JetBrains Mono' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78746c', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v) => `$${v}K`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`$${Number(value).toLocaleString()}K`, 'Buy Volume']}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #d4cfc3',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="valueK" fill="#1d3557" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="filter-bar">
          <input
            id="insider-search-input"
            type="text"
            className="input-field"
            placeholder="Search ticker, company, or insider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 230 }}
          />

          <select
            id="insider-type-select"
            className="select-field"
            value={tradeTypeFilter}
            onChange={(e) => setTradeTypeFilter(e.target.value as 'ALL' | 'Buy' | 'Sell')}
          >
            <option value="Buy">Purchases Only</option>
            <option value="ALL">Buys &amp; Sells</option>
            <option value="Sell">Sales Only</option>
          </select>

          <label className="toggle-label">
            <input
              id="toggle-cluster-only"
              type="checkbox"
              checked={clusterOnly}
              onChange={(e) => setClusterOnly(e.target.checked)}
            />
            <span>Cluster Buys Only (2+ insiders)</span>
          </label>

          <div className="range-group">
            <span>Min Value:</span>
            <input
              id="range-min-insider-value"
              type="range"
              min={0}
              max={1000}
              step={50}
              value={minValueK}
              onChange={(e) => setMinValueK(Number(e.target.value))}
            />
            <span className="mono">${minValueK}K</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filed</th>
                <th>Ticker</th>
                <th>Insider &amp; Title</th>
                <th>Signal</th>
                <th className="num">Price</th>
                <th className="num">Value</th>
                <th className="num">Δ Own</th>
                <th>Free Trackers</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-muted)' }}>
                    No filings match these filters. Try lowering the minimum value or disabling Cluster Buys Only.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const links = getTrackerLinks(t.ticker);
                  const isWatched = watchlistTickers.has(t.ticker);
                  return (
                    <tr key={t.id}>
                      <td className="mono muted">{t.filingDate}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="ticker-badge" style={{ width: 'fit-content' }}>
                            {t.ticker}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                            {t.companyName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.insiderName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{t.title}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className={`pill ${t.tradeType === 'Buy' ? 'pill-buy' : 'pill-sell'}`}>
                            {t.tradeType}
                          </span>
                          {t.clusterCount >= 2 && (
                            <span className="pill pill-cluster">{t.clusterCount}x Cluster</span>
                          )}
                        </div>
                      </td>
                      <td className="num mono">{t.price > 0 ? `$${t.price.toFixed(2)}` : '—'}</td>
                      <td className={`num mono ${t.tradeType === 'Buy' ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                        {formatUsd(t.value)}
                      </td>
                      <td className={`num mono ${t.deltaOwnPct >= 0 ? 'positive' : 'negative'}`}>
                        {t.deltaOwnPct !== 0 ? `${t.deltaOwnPct > 0 ? '+' : ''}${t.deltaOwnPct.toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        <div className="external-links">
                          <a className="ext-link" href={links.openInsider} target="_blank" rel="noreferrer">
                            OpenInsider
                          </a>
                          <a className="ext-link" href={links.secForm4} target="_blank" rel="noreferrer">
                            SECForm4
                          </a>
                        </div>
                      </td>
                      <td className="num">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-subtle"
                            onClick={() => onAskGeminiTicker(t.ticker)}
                            title={`Analyze ${t.ticker} with Gemini`}
                          >
                            <Sparkles size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() =>
                              onToggleWatchlist(
                                t.ticker,
                                t.companyName,
                                t.clusterCount >= 2 ? 'Cluster Buy' : 'Form 4 Buy'
                              )
                            }
                            title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {isWatched ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
