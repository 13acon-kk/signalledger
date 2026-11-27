import { Bookmark, Building2, KeyRound, Landmark, Sparkles } from 'lucide-react';
import type { DataSourceMode, TrackerTab } from '../types';

interface HeaderProps {
  activeTab: TrackerTab;
  onSelectTab: (tab: TrackerTab) => void;
  sourceMode: DataSourceMode;
  hasGeminiKey: boolean;
  watchlistCount: number;
  insiderCount: number;
  congressCount: number;
  onOpenApiKeyModal: () => void;
}

export function Header({
  activeTab,
  onSelectTab,
  sourceMode,
  hasGeminiKey,
  watchlistCount,
  insiderCount,
  congressCount,
  onOpenApiKeyModal,
}: HeaderProps) {
  return (
    <header className="masthead">
      <div className="container masthead-inner">
        <div className="brand">
          <h1 className="brand-title">SignalLedger</h1>
          <span className="brand-subtitle">Zero-Fee Insider &amp; Congress Tracker</span>
        </div>

        <nav className="nav-tabs" aria-label="Primary sections">
          <button
            id="tab-insiders"
            type="button"
            className={`nav-tab ${activeTab === 'insiders' ? 'active' : ''}`}
            onClick={() => onSelectTab('insiders')}
          >
            <Building2 size={15} />
            <span>Corporate Insiders</span>
            <span className="tab-count">{insiderCount}</span>
          </button>

          <button
            id="tab-congress"
            type="button"
            className={`nav-tab ${activeTab === 'congress' ? 'active' : ''}`}
            onClick={() => onSelectTab('congress')}
          >
            <Landmark size={15} />
            <span>Congress</span>
            <span className="tab-count">{congressCount}</span>
          </button>

          <button
            id="tab-analyst"
            type="button"
            className={`nav-tab ${activeTab === 'analyst' ? 'active' : ''}`}
            onClick={() => onSelectTab('analyst')}
          >
            <Sparkles size={15} />
            <span>Gemini Analyst</span>
          </button>

          <button
            id="tab-watchlist"
            type="button"
            className={`nav-tab ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => onSelectTab('watchlist')}
          >
            <Bookmark size={15} />
            <span>Watchlist</span>
            <span className="tab-count">{watchlistCount}</span>
          </button>
        </nav>

        <div className="header-actions">
          <span
            className={`mode-indicator ${sourceMode === 'live-proxy' ? 'live' : ''}`}
            title={
              sourceMode === 'live-proxy'
                ? 'Local OpenInsider proxy connected on port 3001'
                : 'Standalone AI Studio mode (paste tables or use Gemini Search grounding)'
            }
          >
            <span className="mode-dot" />
            {sourceMode === 'live-proxy' ? 'Live Proxy' : 'AI Studio Mode'}
          </span>

          <button
            id="btn-api-key"
            type="button"
            className="btn btn-sm"
            onClick={onOpenApiKeyModal}
          >
            <KeyRound size={14} />
            <span>{hasGeminiKey ? 'Gemini Connected' : 'Add Gemini Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
