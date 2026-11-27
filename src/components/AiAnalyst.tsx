import { useState } from 'react';
import { ExternalLink, Globe, KeyRound, Send, Sparkles } from 'lucide-react';
import type {
  AiAnalysisMessage,
  CongressTrade,
  InsiderTrade,
  PoliticianProfile,
  ScreeningCriteria,
} from '../types';
import { runGeminiAnalysis } from '../services/geminiService';

interface AiAnalystProps {
  hasGeminiKey: boolean;
  criteria: ScreeningCriteria;
  shortlistedPoliticians: PoliticianProfile[];
  insiderTrades: InsiderTrade[];
  congressTrades: CongressTrade[];
  watchlistTickers: string[];
  messages: AiAnalysisMessage[];
  pendingPrompt: string;
  onClearPendingPrompt: () => void;
  onAppendMessages: (msgs: AiAnalysisMessage[]) => void;
  onOpenApiKeyModal: () => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Scan News for Overlap Beneficiaries',
    desc: 'Uses Google Search to match today’s policy & market headlines against your shortlisted politicians and cluster buys.',
    prompt:
      'Scan today’s major U.S. policy, defense, energy, and tech news via Google Search. Identify potential stock beneficiaries and cross-check which ones overlap with our shortlisted politicians or corporate insider cluster buys. Present a concise table with supporting figures and filing-delay caveats.',
  },
  {
    title: 'Double-Signal Overlap Audit',
    desc: 'Find tickers where both corporate executives (Form 4) and shortlisted members of Congress are buying.',
    prompt:
      'Compare our loaded corporate insider cluster buys against our shortlisted Congressional trades and holdings. Rank the top double-signal overlaps by conviction, citing cluster counts, executive roles, committee overlaps, and filing delays.',
  },
  {
    title: 'Live OpenInsider & Congress Check',
    desc: 'Ask Gemini Search for the newest public SEC Form 4 cluster buys and recent Congressional disclosures.',
    prompt:
      'Use Google Search to check for notable recent SEC Form 4 corporate insider cluster buys (OpenInsider / SECForm4) and notable recent U.S. Congressional stock disclosures (Quiver Quantitative / Capitol Trades) from the past two weeks. Summarize the top 5 tickers worth researching further.',
  },
];

export function AiAnalyst({
  hasGeminiKey,
  criteria,
  shortlistedPoliticians,
  insiderTrades,
  congressTrades,
  watchlistTickers,
  messages,
  pendingPrompt,
  onClearPendingPrompt,
  onAppendMessages,
  onOpenApiKeyModal,
}: AiAnalystProps) {
  const [input, setInput] = useState(pendingPrompt);
  const [useSearch, setUseSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync incoming ticker prompt from other tabs
  if (pendingPrompt && pendingPrompt !== input && !loading) {
    setInput(pendingPrompt);
    onClearPendingPrompt();
  }

  const handleSubmit = async (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query || loading) return;

    setError('');
    setLoading(true);
    if (!promptText) setInput('');

    const userMsg: AiAnalysisMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    onAppendMessages([userMsg]);

    try {
      const result = await runGeminiAnalysis(
        query,
        {
          criteria,
          shortlistedPoliticians,
          recentInsiderTrades: insiderTrades,
          recentCongressTrades: congressTrades,
          watchlistTickers,
        },
        useSearch
      );

      const aiMsg: AiAnalysisMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: result.sources,
      };
      onAppendMessages([aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gemini request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Gemini AI Stock Analyst">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Gemini Analyst &amp; Grounded News Scanner</h2>
          <p className="page-lead">
            Powered by Google AI Studio&apos;s free Gemini tier with Google Search grounding and your active screening criteria.
          </p>
        </div>

        <div className="page-actions">
          <label className="toggle-label">
            <input
              id="toggle-google-search"
              type="checkbox"
              checked={useSearch}
              onChange={(e) => setUseSearch(e.target.checked)}
            />
            <Globe size={14} />
            <span>Google Search Grounding</span>
          </label>
        </div>
      </div>

      {!hasGeminiKey && (
        <div className="notice-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            Add a free <strong>Google AI Studio Gemini API key</strong> to run live news scans and cross-reference your tables.
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenApiKeyModal}>
            <KeyRound size={13} />
            <span>Add Free Gemini Key</span>
          </button>
        </div>
      )}

      {error && <div className="notice-banner error">{error}</div>}

      <div className="analyst-grid">
        <aside className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Research Workflows</h3>
              <p className="panel-subtitle">One-click prompts using your active filters</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="preset-list">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  className="preset-btn"
                  disabled={loading}
                  onClick={() => handleSubmit(preset.prompt)}
                >
                  <span className="preset-title">{preset.title}</span>
                  <span className="preset-desc">{preset.desc}</span>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--ink-muted)',
              }}
            >
              <strong style={{ color: 'var(--ink-secondary)' }}>Active Prompt Context:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                <li>{shortlistedPoliticians.length} shortlisted politicians</li>
                <li>{insiderTrades.length} loaded Form 4 filings</li>
                <li>Max delay gap: {criteria.maxDelayGapPct}%</li>
                <li>Watchlist: {watchlistTickers.length} tickers</li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Analysis Thread</h3>
              <p className="panel-subtitle">Model: gemini-2.5-flash {useSearch ? '· Live Web Search ON' : '· Context Only'}</p>
            </div>
          </div>

          <div className="chat-feed">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-muted)' }}>
                <Sparkles size={26} style={{ marginBottom: 10, color: 'var(--accent-navy)' }} />
                <p style={{ margin: '0 0 6px', fontWeight: 500, color: 'var(--ink-primary)' }}>
                  Ask about any ticker, policy headline, or cluster buy
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  Pick a workflow on the left or type a question below. Gemini automatically sees your filtered insiders, shortlisted politicians, and watchlist.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-msg ${m.role}`}>
                  <div className="chat-meta">
                    {m.role === 'user' ? 'You' : 'SignalLedger · Gemini'} · {m.timestamp}
                  </div>
                  <div className="chat-content">{m.content}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="sources-box">
                      {m.sources.map((src) => (
                        <a
                          key={src.uri}
                          className="ext-link"
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {src.title.slice(0, 42)} <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-meta">SignalLedger · Gemini</div>
                <div className="chat-content muted">
                  Analyzing filings and scanning grounded web sources…
                </div>
              </div>
            )}
          </div>

          <div className="chat-composer">
            <textarea
              id="analyst-prompt-input"
              placeholder="e.g., Check recent news on INTC and VST — do any shortlisted politicians or corporate insiders have fresh activity?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              id="btn-send-analyst"
              type="button"
              className="btn btn-primary"
              disabled={loading || !input.trim()}
              onClick={() => handleSubmit()}
            >
              <Send size={14} />
              <span>Analyze</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
