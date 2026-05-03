export type PriceEntry = {
  ticker: string;
  price: number;
  prev_price: number;
  timestamp: string;
  direction: 'up' | 'down' | 'flat';
};

export type PriceMap = Record<string, PriceEntry>;
export type PriceHistory = Record<string, number[]>;

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export type WatchlistItem = {
  ticker: string;
  price: number | null;
};

export type Position = {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  unrealized_pnl: number;
  pnl_pct: number;
};

export type Portfolio = {
  cash_balance: number;
  positions: Position[];
  total_value: number;
  total_pnl: number;
};

export type TradeRequest = {
  ticker: string;
  quantity: number;
  side: 'buy' | 'sell';
};

export type TradeResult = {
  success: boolean;
  trade_id: string;
  message: string;
  new_cash_balance: number;
  position: { ticker: string; quantity: number; avg_cost: number } | null;
};

export type HistoryPoint = {
  total_value: number;
  recorded_at: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  actions?: {
    trades_executed: ChatTradeResult[];
    watchlist_changes: { ticker: string; action: string }[];
    errors: string[];
  } | null;
};

export type ChatTradeResult = {
  trade_id: string;
  ticker: string;
  side: string;
  quantity: number;
  price: number;
};

export type ChatResponse = {
  message: string;
  trades_executed: ChatTradeResult[];
  watchlist_changes: { ticker: string; action: string }[];
  errors: string[];
};
