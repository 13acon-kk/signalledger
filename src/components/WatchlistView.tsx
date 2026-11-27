import { useState } from 'react';
import { ExternalLink, Plus, Sparkles, Trash2 } from 'lucide-react';
import { getTrackerLinks } from '../data/sampleData';
import type { WatchlistItem } from '../types';

interface WatchlistViewProps {
  items: WatchlistItem[];
  onAddTicker: (ticker: string, companyName: string, notes: string) => void;
  onRemoveTicker: (ticker: string) => void;
  onAskGeminiTicker: (ticker: string) => void;
}

export function WatchlistView({
  items,
  onAddTicker,
  onRemoveTicker,
  onAskGeminiTicker,
}: WatchlistViewProps) {
  const [tickerInput, setTickerInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tickerInput.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
    if (!clean) return;
    onAddTicker(clean, clean, noteInput.trim() || 'Added manually');
    setTickerInput('');
    setNoteInput('');
  };

  return (
    <section aria-label="Watchlist and Free Tracker Hub">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Watchlist &amp; Deep-Link Hub</h2>
          <p className="page-lead">
            Pin high-conviction tickers for one-click access to OpenInsider, SECForm4, Quiver Quantitative, and InsiderFinance.
          </p>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={handleAdd} className="filter-bar">
          <input
            id="watchlist-ticker-input"
            type="text"
            className="input-field mono"
            placeholder="Ticker (e.g. NVDA)"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            style={{ width: 150 }}
          />
          <input
            id="watchlist-note-input"
            type="text"
            className="input-field"
            placeholder="Thesis or signal note..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button id="btn-add-watchlist" type="submit" className="btn btn-primary">
            <Plus size={14} />
            <span>Add Ticker</span>
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
            Your watchlist is empty. Pin tickers from the Corporate Insiders or Congress tabs, or add one above.
          </div>
        </div>
      ) : (
        <div className="watchlist-grid">
          {items.map((item) => {
            const links = getTrackerLinks(item.ticker);
            return (
              <article key={item.ticker} className="watch-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ticker-badge" style={{ fontSize: 14, padding: '3px 9px' }}>
                        {item.ticker}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        Added {item.addedAt}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>{item.companyName}</div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-icon btn-subtle"
                    onClick={() => onRemoveTicker(item.ticker)}
                    title={`Remove ${item.ticker}`}
                    aria-label={`Remove ${item.ticker}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
                  {item.notes}
                </p>

                {item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {item.tags.map((tag) => (
                      <span key={tag} className="pill pill-neutral">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div className="external-links" style={{ flexWrap: 'wrap' }}>
                    <a className="ext-link" href={links.openInsider} target="_blank" rel="noreferrer">
                      OpenInsider <ExternalLink size={10} />
                    </a>
                    <a className="ext-link" href={links.secForm4} target="_blank" rel="noreferrer">
                      SECForm4 <ExternalLink size={10} />
                    </a>
                    <a className="ext-link" href={links.quiver} target="_blank" rel="noreferrer">
                      Quiver <ExternalLink size={10} />
                    </a>
                    <a className="ext-link" href={links.insiderFinance} target="_blank" rel="noreferrer">
                      InsiderFinance <ExternalLink size={10} />
                    </a>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onAskGeminiTicker(item.ticker)}
                    style={{ width: '100%' }}
                  >
                    <Sparkles size={13} />
                    <span>Run Gemini Deep-Dive on {item.ticker}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
