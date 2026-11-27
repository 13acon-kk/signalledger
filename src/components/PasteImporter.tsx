import { useState } from 'react';
import { ClipboardPaste, ExternalLink, X } from 'lucide-react';
import { FREE_SOURCE_URLS } from '../data/sampleData';
import type { CongressTrade, InsiderTrade } from '../types';
import { parseCongressPaste, parseInsiderPaste } from '../utils/tableParser';

interface PasteImporterProps {
  mode: 'insiders' | 'congress';
  onClose: () => void;
  onImportInsiders: (trades: InsiderTrade[]) => void;
  onImportCongress: (trades: CongressTrade[]) => void;
}

export function PasteImporter({
  mode,
  onClose,
  onImportInsiders,
  onImportCongress,
}: PasteImporterProps) {
  const [rawText, setRawText] = useState('');
  const [source, setSource] = useState<string>(
    mode === 'insiders' ? 'OpenInsider' : 'Quiver'
  );
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    if (!rawText.trim()) {
      setError('Paste one or more table rows first.');
      return;
    }

    if (mode === 'insiders') {
      const parsed = parseInsiderPaste(
        rawText,
        source === 'SECForm4' ? 'SECForm4' : 'OpenInsider'
      );
      if (parsed.length === 0) {
        setError(
          'Could not parse any rows. Copy directly from the OpenInsider or SECForm4 table (keeping tab-separated columns).'
        );
        return;
      }
      onImportInsiders(parsed);
      onClose();
    } else {
      const parsed = parseCongressPaste(
        rawText,
        source === 'InsiderFinance' ? 'InsiderFinance' : 'Quiver'
      );
      if (parsed.length === 0) {
        setError(
          'Could not parse any rows. Copy rows directly from Quiver Quantitative or InsiderFinance with politician, ticker, and amount.'
        );
        return;
      }
      onImportCongress(parsed);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="paste-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2 id="paste-modal-title" className="panel-title">
              {mode === 'insiders'
                ? 'Paste SEC Form 4 Table (OpenInsider / SECForm4)'
                : 'Paste Congressional Trades (Quiver / InsiderFinance)'}
            </h2>
            <p className="panel-subtitle">
              Zero-fee standalone import — highlight rows on the site, copy (Ctrl/Cmd+C), and paste below.
            </p>
          </div>
          <button
            id="btn-close-paste-modal"
            type="button"
            className="btn btn-icon btn-subtle"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="paste-source-select" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)' }}>
                Source:
              </label>
              <select
                id="paste-source-select"
                className="select-field"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {mode === 'insiders' ? (
                  <>
                    <option value="OpenInsider">OpenInsider</option>
                    <option value="SECForm4">SECForm4.com</option>
                  </>
                ) : (
                  <>
                    <option value="Quiver">Quiver Quantitative</option>
                    <option value="InsiderFinance">InsiderFinance</option>
                  </>
                )}
              </select>
            </div>

            <div className="external-links">
              {mode === 'insiders' ? (
                <>
                  <a
                    className="ext-link"
                    href={FREE_SOURCE_URLS.openInsiderClusters}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open OpenInsider Clusters <ExternalLink size={10} />
                  </a>
                  <a
                    className="ext-link"
                    href={FREE_SOURCE_URLS.secForm4}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open SECForm4 <ExternalLink size={10} />
                  </a>
                </>
              ) : (
                <>
                  <a
                    className="ext-link"
                    href={FREE_SOURCE_URLS.quiverCongress}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Quiver <ExternalLink size={10} />
                  </a>
                  <a
                    className="ext-link"
                    href={FREE_SOURCE_URLS.insiderFinanceCongress}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open InsiderFinance <ExternalLink size={10} />
                  </a>
                </>
              )}
            </div>
          </div>

          {error && <div className="notice-banner error">{error}</div>}

          <textarea
            id="paste-input-area"
            className="paste-textarea"
            placeholder={
              mode === 'insiders'
                ? 'Paste tab-separated rows copied from OpenInsider or SECForm4...\nExample:\nM\t2026-11-24\t2026-11-22\tINTC\tIntel Corp\tDavid Zinsner\tCFO\tP - Purchase\t$24.85\t+28,000\t162,400\t+21%\t+$695,800'
                : 'Paste tab-separated rows copied from Quiver Quantitative or InsiderFinance...\nExample:\nNancy Pelosi\tD\tHouse\tVST\tPurchase\t$500K - $1M\t2026-11-11\t2026-11-22'
            }
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            id="btn-confirm-paste-import"
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
          >
            <ClipboardPaste size={14} />
            <span>Parse &amp; Import Rows</span>
          </button>
        </div>
      </div>
    </div>
  );
}
