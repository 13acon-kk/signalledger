import { useMemo } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ClipboardPaste,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FREE_SOURCE_URLS, getTrackerLinks } from '../data/sampleData';
import type { CongressTrade, PoliticianProfile, ScreeningCriteria } from '../types';

interface CongressTrackerProps {
  politicians: PoliticianProfile[];
  trades: CongressTrade[];
  criteria: ScreeningCriteria;
  watchlistTickers: Set<string>;
  onChangeCriteria: (next: ScreeningCriteria) => void;
  onOpenPasteModal: () => void;
  onToggleWatchlist: (ticker: string, companyName: string, tag: string) => void;
  onAskGeminiTicker: (ticker: string) => void;
}

export function CongressTracker({
  politicians,
  trades,
  criteria,
  watchlistTickers,
  onChangeCriteria,
  onOpenPasteModal,
  onToggleWatchlist,
  onAskGeminiTicker,
}: CongressTrackerProps) {
  const allCommittees = useMemo(() => {
    const set = new Set<string>();
    politicians.forEach((p) => p.committees.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [politicians]);

  const shortlistedPoliticians = useMemo(() => {
    return politicians.filter((p) => {
      if (criteria.partyFilter !== 'ALL' && p.party !== criteria.partyFilter) return false;
      if (criteria.mustBeatSp500 && p.delayAdjustedRoi1Y <= criteria.sp500Benchmark1Y) {
        return false;
      }
      const gap = Math.abs(p.roi1Y - p.delayAdjustedRoi1Y);
      if (gap > criteria.maxDelayGapPct) return false;

      const meetsSize = p.portfolioSizeM >= criteria.minPortfolioM;
      const isException =
        criteria.includeSmallPortfolioExceptions &&
        Boolean(p.uniqueAllocationNote) &&
        p.delayAdjustedRoi1Y > criteria.sp500Benchmark1Y;
      if (!meetsSize && !isException) return false;

      if (
        criteria.committeeFilter !== 'ALL' &&
        !p.committees.includes(criteria.committeeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [politicians, criteria]);

  const shortlistedNames = useMemo(
    () => new Set(shortlistedPoliticians.map((p) => p.name)),
    [shortlistedPoliticians]
  );

  const chartData = useMemo(
    () =>
      shortlistedPoliticians.map((p) => ({
        name: p.name.split(' ').slice(-1)[0],
        fullName: p.name,
        totalRoi: p.roi1Y,
        delayAdjustedRoi: p.delayAdjustedRoi1Y,
      })),
    [shortlistedPoliticians]
  );

  const avgDelay = useMemo(() => {
    if (!shortlistedPoliticians.length) return 0;
    return Math.round(
      shortlistedPoliticians.reduce((s, p) => s + p.avgFilingDelayDays, 0) /
        shortlistedPoliticians.length
    );
  }, [shortlistedPoliticians]);

  const avgDelayAdjRoi = useMemo(() => {
    if (!shortlistedPoliticians.length) return 0;
    return (
      shortlistedPoliticians.reduce((s, p) => s + p.delayAdjustedRoi1Y, 0) /
      shortlistedPoliticians.length
    ).toFixed(1);
  }, [shortlistedPoliticians]);

  return (
    <section aria-label="Congressional Trades Screener">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Congressional Delay-Adjusted Screener</h2>
          <p className="page-lead">
            Filter members who beat the S&amp;P 500 even after STOCK Act disclosure delays — backed by free Quiver &amp; InsiderFinance dashboards.
          </p>
        </div>

        <div className="page-actions">
          <button
            id="btn-paste-congress"
            type="button"
            className="btn btn-primary"
            onClick={onOpenPasteModal}
          >
            <ClipboardPaste size={14} />
            <span>Paste Quiver / InsiderFinance</span>
          </button>
        </div>
      </div>

      <div className="source-strip">
        <span>
          <strong>Free Congressional Trackers:</strong> Check live disclosures, trade sizes, and filing delays at no cost.
        </span>
        <div className="source-links">
          <a className="ext-link" href={FREE_SOURCE_URLS.quiverCongress} target="_blank" rel="noreferrer">
            Quiver Quantitative Congress <ExternalLink size={11} />
          </a>
          <a className="ext-link" href={FREE_SOURCE_URLS.insiderFinanceCongress} target="_blank" rel="noreferrer">
            InsiderFinance Congress <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Shortlisted Members</div>
          <div className="kpi-value">
            {shortlistedPoliticians.length} / {politicians.length}
          </div>
          <div className="kpi-sub">Passing reliability &amp; size filters</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Delay-Adj 1Y ROI</div>
          <div className="kpi-value positive">+{avgDelayAdjRoi}%</div>
          <div className="kpi-sub">vs. S&amp;P 500 (+{criteria.sp500Benchmark1Y}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Filing Delay</div>
          <div className="kpi-value">{avgDelay}d</div>
          <div className="kpi-sub">STOCK Act legal max: 45 days</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Max ROI Gap Allowed</div>
          <div className="kpi-value">{criteria.maxDelayGapPct}%</div>
          <div className="kpi-sub">Filters out stale-lag signals</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Reliability Criteria Controls</h3>
            <p className="panel-subtitle">
              These exact filters are automatically injected into your Gemini Analyst prompt.
            </p>
          </div>
        </div>

        <div className="filter-bar">
          <label className="toggle-label">
            <input
              id="toggle-beat-sp500"
              type="checkbox"
              checked={criteria.mustBeatSp500}
              onChange={(e) =>
                onChangeCriteria({ ...criteria, mustBeatSp500: e.target.checked })
              }
            />
            <span>Must Beat S&amp;P 500 (+{criteria.sp500Benchmark1Y}%)</span>
          </label>

          <div className="range-group">
            <span>Max Delay Gap:</span>
            <input
              id="range-max-delay-gap"
              type="range"
              min={2}
              max={20}
              step={1}
              value={criteria.maxDelayGapPct}
              onChange={(e) =>
                onChangeCriteria({ ...criteria, maxDelayGapPct: Number(e.target.value) })
              }
            />
            <span className="mono">{criteria.maxDelayGapPct}%</span>
          </div>

          <label className="toggle-label">
            <input
              id="toggle-small-exceptions"
              type="checkbox"
              checked={criteria.includeSmallPortfolioExceptions}
              onChange={(e) =>
                onChangeCriteria({
                  ...criteria,
                  includeSmallPortfolioExceptions: e.target.checked,
                })
              }
            />
            <span>Allow &lt;$1M Unique Exceptions</span>
          </label>

          <select
            id="select-party-filter"
            className="select-field"
            value={criteria.partyFilter}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                partyFilter: e.target.value as 'ALL' | 'D' | 'R',
              })
            }
          >
            <option value="ALL">All Parties</option>
            <option value="D">Democrats (D)</option>
            <option value="R">Republicans (R)</option>
          </select>

          <select
            id="select-committee-filter"
            className="select-field"
            value={criteria.committeeFilter}
            onChange={(e) =>
              onChangeCriteria({ ...criteria, committeeFilter: e.target.value })
            }
          >
            <option value="ALL">All Committees</option>
            {allCommittees.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {chartData.length > 0 && (
          <div className="panel-body" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e4dc" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4e4c46' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#78746c', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v) => `+${v}%`}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `+${Number(value).toFixed(1)}%`,
                      String(name),
                    ]}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #d4cfc3',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={criteria.sp500Benchmark1Y}
                    stroke="#b42318"
                    strokeDasharray="4 4"
                    label={{
                      value: `S&P 500 (+${criteria.sp500Benchmark1Y}%)`,
                      position: 'insideTopRight',
                      fill: '#b42318',
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="totalRoi" name="1Y Total ROI" fill="#1d3557" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar
                    dataKey="delayAdjustedRoi"
                    name="Delay-Adjusted ROI"
                    fill="#0f6e4a"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Politician</th>
                <th>Committees</th>
                <th className="num">Portfolio</th>
                <th className="num">1Y ROI</th>
                <th className="num">Delay-Adj ROI</th>
                <th className="num">Lag Gap</th>
                <th className="num">Avg Delay</th>
                <th>Top Holdings</th>
              </tr>
            </thead>
            <tbody>
              {shortlistedPoliticians.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--ink-muted)' }}>
                    No members pass the current criteria. Try widening the Max Delay Gap or clearing the Committee filter.
                  </td>
                </tr>
              ) : (
                shortlistedPoliticians.map((p) => {
                  const gap = p.roi1Y - p.delayAdjustedRoi1Y;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span className={`pill ${p.party === 'D' ? 'pill-dem' : 'pill-rep'}`}>
                            {p.party}-{p.state}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                          {p.chamber}
                          {p.uniqueAllocationNote ? ` · ${p.uniqueAllocationNote}` : ''}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                        {p.committees.join(', ')}
                      </td>
                      <td className="num mono">${p.portfolioSizeM.toFixed(2)}M</td>
                      <td className="num mono positive" style={{ fontWeight: 600 }}>
                        +{p.roi1Y.toFixed(1)}%
                      </td>
                      <td className="num mono positive" style={{ fontWeight: 600 }}>
                        +{p.delayAdjustedRoi1Y.toFixed(1)}%
                      </td>
                      <td className={`num mono ${gap > 8 ? 'negative' : 'muted'}`}>
                        -{gap.toFixed(1)}%
                      </td>
                      <td className="num mono">{p.avgFilingDelayDays}d</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.topHoldings.slice(0, 4).map((ticker) => (
                            <button
                              key={ticker}
                              type="button"
                              className="ticker-badge"
                              style={{ border: 'none', cursor: 'pointer' }}
                              onClick={() => onAskGeminiTicker(ticker)}
                              title={`Ask Gemini about ${ticker}`}
                            >
                              {ticker}
                            </button>
                          ))}
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

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Congressional Disclosures</h3>
            <p className="panel-subtitle">
              Highlighting disclosures from members passing your reliability criteria
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Disclosed</th>
                <th>Member</th>
                <th>Ticker</th>
                <th>Type</th>
                <th>Size Range</th>
                <th className="num">Filing Delay</th>
                <th>Free Trackers</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const links = getTrackerLinks(t.ticker);
                const isShortlisted = shortlistedNames.has(t.politician);
                const isWatched = watchlistTickers.has(t.ticker);
                return (
                  <tr key={t.id}>
                    <td className="mono muted">{t.disclosureDate}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>{t.politician}</span>
                        {isShortlisted && <span className="pill pill-buy">Shortlisted</span>}
                      </div>
                      {t.committeeOverlap && (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                          {t.committeeOverlap}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="ticker-badge">{t.ticker}</span>
                    </td>
                    <td>
                      <span className={`pill ${t.transactionType === 'Buy' ? 'pill-buy' : 'pill-sell'}`}>
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="mono">{t.amountRange}</td>
                    <td className={`num mono ${t.filingDelayDays > 25 ? 'negative' : 'muted'}`}>
                      {t.filingDelayDays}d
                    </td>
                    <td>
                      <div className="external-links">
                        <a className="ext-link" href={links.quiver} target="_blank" rel="noreferrer">
                          Quiver
                        </a>
                        <a className="ext-link" href={links.insiderFinance} target="_blank" rel="noreferrer">
                          InsiderFinance
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
                            onToggleWatchlist(t.ticker, t.companyName, 'Congress Disclosure')
                          }
                          title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          {isWatched ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
