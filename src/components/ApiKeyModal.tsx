import { useState } from 'react';
import { ExternalLink, KeyRound, X } from 'lucide-react';
import { getStoredGeminiKey, saveGeminiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  onClose: () => void;
  onKeyUpdated: () => void;
}

export function ApiKeyModal({ onClose, onKeyUpdated }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState(getStoredGeminiKey());

  const handleSave = () => {
    saveGeminiKey(keyInput);
    onKeyUpdated();
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="apikey-modal-title">
      <div className="modal-card" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h2 id="apikey-modal-title" className="panel-title">
              Google AI Studio API Key
            </h2>
            <p className="panel-subtitle">
              Stored locally in your browser only — never sent to any third-party server.
            </p>
          </div>
          <button
            id="btn-close-apikey-modal"
            type="button"
            className="btn btn-icon btn-subtle"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="notice-banner">
            Get a free Gemini API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 600 }}
            >
              Google AI Studio <ExternalLink size={11} />
            </a>
            . Used for grounded web news scans and insider/congress cross-analysis.
          </div>

          <label
            htmlFor="gemini-key-input"
            style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink-secondary)' }}
          >
            Gemini API Key
          </label>
          <input
            id="gemini-key-input"
            type="password"
            className="input-field mono"
            style={{ width: '100%' }}
            placeholder="AIza..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setKeyInput('');
              saveGeminiKey('');
              onKeyUpdated();
              onClose();
            }}
          >
            Clear Key
          </button>
          <button
            id="btn-save-gemini-key"
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            <KeyRound size={14} />
            <span>Save Key</span>
          </button>
        </div>
      </div>
    </div>
  );
}
