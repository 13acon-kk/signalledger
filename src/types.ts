export type DataSourceMode = 'live-proxy' | 'standalone';

export type TrackerTab = 'insiders' | 'congress' | 'analyst' | 'watchlist';

export interface InsiderTrade {
  id: string;
  filingDate: string;
  tradeDate: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  tradeType: 'Buy' | 'Sell';
  price: number;
  qty: number;
  ownedAfter: number;
  deltaOwnPct: number;
  value: number;
  clusterCount: number;
  source: 'OpenInsider' | 'SECForm4' | 'Sample';
}

export interface PoliticianProfile {
  id: string;
  name: string;
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  state: string;
  committees: string[];
  portfolioSizeM: number; // in $ millions
  roi1Y: number; // percentage
  delayAdjustedRoi1Y: number; // percentage if bought on disclosure date
  avgFilingDelayDays: number;
  uniqueAllocationNote?: string;
  topHoldings: string[];
  winRatePct: number;
}

export interface CongressTrade {
  id: string;
  politician: string;
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  ticker: string;
  companyName: string;
  transactionType: 'Buy' | 'Sell';
  amountRange: string;
  estimatedValue: number;
  tradeDate: string;
  disclosureDate: string;
  filingDelayDays: number;
  committeeOverlap?: string;
  source: 'Quiver' | 'InsiderFinance' | 'Sample';
}

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  addedAt: string;
  notes: string;
  tags: string[];
}

export interface ScreeningCriteria {
  sp500Benchmark1Y: number;
  mustBeatSp500: boolean;
  maxDelayGapPct: number;
  minPortfolioM: number;
  includeSmallPortfolioExceptions: boolean;
  committeeFilter: string;
  partyFilter: 'ALL' | 'D' | 'R';
}

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface AiAnalysisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: GroundedSource[];
}
