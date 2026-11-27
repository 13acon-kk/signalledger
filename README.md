# SignalLedger — Zero-Fee Hybrid Insider & Congressional Stock Tracker

A Google AI Studio–compatible React + TypeScript stock tracker built around **free** public trackers:

- **Corporate Insiders (SEC Form 4):** [OpenInsider](http://openinsider.com/) (real-time cluster buys) & [SECForm4.com](https://www.secform4.com/)
- **Congressional Trades:** [Quiver Quantitative](https://www.quiverquant.com/congresstrading/) & [InsiderFinance](https://www.insiderfinance.io/congress-trades)
- **AI Analyst:** Free-tier Gemini (`@google/genai` with Google Search grounding)

## Hybrid Modes

1. **Standalone / Google AI Studio Mode (`npm run dev`)**
   - Works 100% in the browser with no backend required.
   - Copy-paste tables directly from OpenInsider, SECForm4, Quiver, or InsiderFinance using the built-in **Paste Importer**.
   - Add your free [Google AI Studio Gemini API key](https://aistudio.google.com/apikey) in the header to run grounded web news scans and cross-reference your tables.

2. **Live Local Proxy Mode (`npm run dev:full`)**
   - Starts both Vite (`:5173`) and the lightweight local Express proxy (`:3001`, `server.ts`).
   - Enables the **Sync Live OpenInsider** button to automatically fetch and parse `http://openinsider.com/latest-cluster-buys` without browser CORS issues.

## Quick Start

**Live site:** https://13acon-kk.github.io/signalledger/ (auto-deployed by GitHub Actions on every push to `main`)

```bash
git clone https://github.com/13acon-kk/signalledger.git
cd signalledger
npm install

# Standalone frontend (Google AI Studio mode)
npm run dev

# Or hybrid mode with live OpenInsider proxy
npm run dev:full
```
