import { useEffect, useMemo, useState } from 'react';
import { AiAnalyst } from './components/AiAnalyst';
import { ApiKeyModal } from './components/ApiKeyModal';
import { CongressTracker } from './components/CongressTracker';
import { Header } from './components/Header';
import { InsiderFeed } from './components/InsiderFeed';
import { PasteImporter } from './components/PasteImporter';
import { WatchlistView } from './components/WatchlistView';
import {
  DEFAULT_WATCHLIST,
  SAMPLE_CONGRESS_TRADES,
  SAMPLE_INSIDER_TRADES,
  SAMPLE_POLITICIANS,
  SP500_BENCHMARK_1Y,
} from './data/sampleData';
import { getStoredGeminiKey } from './services/geminiService';
import type {
  AiAnalysisMessage,
  CongressTrade,
  DataSourceMode,
  InsiderTrade,
  ScreeningCriteria,
  TrackerTab,
  WatchlistItem,
} from './types';

const WATCHLIST_STORAGE_KEY = 'signalledger_watchlist_v1';
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<TrackerTab>('insiders');
  const [sourceMode, setSourceMode] = useState<DataSourceMode>('standalone');
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(() => Boolean(getStoredGeminiKey()));

  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>(SAMPLE_INSIDER_TRADES);
  const [congressTrades, setCongressTrades] = useState<CongressTrade[]>(SAMPLE_CONGRESS_TRADES);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist);
  const [messages, setMessages] = useState<AiAnalysisMessage[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState('');

  const [criteria, setCriteria] = useState<ScreeningCriteria>({
    sp500Benchmark1Y: SP500_BENCHMARK_1Y,
    mustBeatSp500: true,
    maxDelayGapPct: 8,
    minPortfolioM: 1,
    includeSmallPortfolioExceptions: true,
    committeeFilter: 'ALL',
    partyFilter: 'ALL',
  });

  const [pasteModalMode, setPasteModalMode] = useState<'insiders' | 'congress' | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  // Auto-detect optional local proxy on mount (only when running locally)
  useEffect(() => {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocal && !import.meta.env.VITE_PROXY_URL) return;
    let cancelled = false;
    fetch(`${PROXY_URL}/api/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) {
          setSourceMode('live-proxy');
        }
      })
      .catch(() => {
        // Standalone Google AI Studio mode — proxy not running
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist watchlist
  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [watchlist]);

  const watchlistTickers = useMemo(
    () => new Set(watchlist.map((w) => w.ticker)),
    [watchlist]
  );

  const shortlistedPoliticians = useMemo(() => {
    return SAMPLE_POLITICIANS.filter((p) => {
      if (criteria.partyFilter !== 'ALL' && p.party !== criteria.partyFilter) return false;
      if (criteria.mustBeatSp500 && p.delayAdjustedRoi1Y <= criteria.sp500Benchmark1Y) return false;
      if (Math.abs(p.roi1Y - p.delayAdjustedRoi1Y) > criteria.maxDelayGapPct) return false;
      const meetsSize = p.portfolioSizeM >= criteria.minPortfolioM;
      const isException =
        criteria.includeSmallPortfolioExceptions &&
        Boolean(p.uniqueAllocationNote) &&
        p.delayAdjustedRoi1Y > criteria.sp500Benchmark1Y;
      if (!meetsSize && !isException) return false;
      if (criteria.committeeFilter !== 'ALL' && !p.committees.includes(criteria.committeeFilter)) {
        return false;
      }
      return true;
    });
  }, [criteria]);

  const handleSyncLiveClusters = async () => {
    setIsSyncing(true);
    setSyncError('');
    try {
      const res = await fetch(`${PROXY_URL}/api/openinsider/clusters`);
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not fetch live OpenInsider cluster buys.');
      }
      if (Array.isArray(data.trades) && data.trades.length > 0) {
        setInsiderTrades(data.trades);
      } else {
        setSyncError('OpenInsider returned 0 rows — keeping existing dataset.');
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Live OpenInsider sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleWatchlist = (ticker: string, companyName: string, tag: string) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.ticker === ticker);
      if (exists) {
        return prev.filter((w) => w.ticker !== ticker);
      }
      return [
        {
          ticker,
          companyName,
          addedAt: new Date().toISOString().slice(0, 10),
          notes: `Pinned from ${tag}`,
          tags: [tag],
        },
        ...prev,
      ];
    });
  };

  const handleAddWatchlistTicker = (ticker: string, companyName: string, notes: string) => {
    setWatchlist((prev) => {
      if (prev.some((w) => w.ticker === ticker)) return prev;
      return [
        {
          ticker,
          companyName,
          addedAt: new Date().toISOString().slice(0, 10),
          notes,
          tags: ['Manual'],
        },
        ...prev,
      ];
    });
  };

  const handleAskGeminiTicker = (ticker: string) => {
    setPendingPrompt(
      `Run a deep-dive on ${ticker} using Google Search and our loaded filings. Check recent SEC Form 4 insider cluster buys (OpenInsider / SECForm4), recent Congressional disclosures (Quiver / InsiderFinance), committee overlaps, and key news catalysts.`
    );
    setActiveTab('analyst');
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sourceMode={sourceMode}
        hasGeminiKey={hasGeminiKey}
        watchlistCount={watchlist.length}
        insiderCount={insiderTrades.length}
        congressCount={congressTrades.length}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      />

      <main className="main-content">
        <div className="container">
          {activeTab === 'insiders' && (
            <InsiderFeed
              trades={insiderTrades}
              sourceMode={sourceMode}
              isSyncing={isSyncing}
              syncError={syncError}
              watchlistTickers={watchlistTickers}
              onSyncLiveClusters={handleSyncLiveClusters}
              onOpenPasteModal={() => setPasteModalMode('insiders')}
              onToggleWatchlist={handleToggleWatchlist}
              onAskGeminiTicker={handleAskGeminiTicker}
            />
          )}

          {activeTab === 'congress' && (
            <CongressTracker
              politicians={SAMPLE_POLITICIANS}
              trades={congressTrades}
              criteria={criteria}
              watchlistTickers={watchlistTickers}
              onChangeCriteria={setCriteria}
              onOpenPasteModal={() => setPasteModalMode('congress')}
              onToggleWatchlist={handleToggleWatchlist}
              onAskGeminiTicker={handleAskGeminiTicker}
            />
          )}

          {activeTab === 'analyst' && (
            <AiAnalyst
              hasGeminiKey={hasGeminiKey}
              criteria={criteria}
              shortlistedPoliticians={shortlistedPoliticians}
              insiderTrades={insiderTrades}
              congressTrades={congressTrades}
              watchlistTickers={watchlist.map((w) => w.ticker)}
              messages={messages}
              pendingPrompt={pendingPrompt}
              onClearPendingPrompt={() => setPendingPrompt('')}
              onAppendMessages={(newMsgs) => setMessages((prev) => [...prev, ...newMsgs])}
              onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistView
              items={watchlist}
              onAddTicker={handleAddWatchlistTicker}
              onRemoveTicker={(ticker) =>
                setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker))
              }
              onAskGeminiTicker={handleAskGeminiTicker}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <span>
            SignalLedger — Zero-fee hybrid tracker built for OpenInsider, SECForm4, Quiver Quantitative, InsiderFinance &amp; Google AI Studio.
          </span>
          <span>Research tool only · Public disclosures carry reporting delays · Not financial advice.</span>
        </div>
      </footer>

      {pasteModalMode && (
        <PasteImporter
          mode={pasteModalMode}
          onClose={() => setPasteModalMode(null)}
          onImportInsiders={(rows) => setInsiderTrades((prev) => [...rows, ...prev])}
          onImportCongress={(rows) => setCongressTrades((prev) => [...rows, ...prev])}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onKeyUpdated={() => setHasGeminiKey(Boolean(getStoredGeminiKey()))}
        />
      )}
    </div>
  );
}

export default App;
