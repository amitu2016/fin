import type {
  WatchlistItem,
  Portfolio,
  TradeRequest,
  TradeResult,
  HistoryPoint,
  ChatMessage,
  ChatResponse,
} from './types';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getWatchlist: () => req<WatchlistItem[]>('/api/watchlist'),

  addWatchlist: (ticker: string) =>
    req<{ ticker: string }>('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    }),

  removeWatchlist: (ticker: string) =>
    req<void>(`/api/watchlist/${ticker}`, { method: 'DELETE' }),

  getPortfolio: () => req<Portfolio>('/api/portfolio'),

  executeTrade: (trade: TradeRequest) =>
    req<TradeResult>('/api/portfolio/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    }),

  getPortfolioHistory: () => req<HistoryPoint[]>('/api/portfolio/history'),

  getChatHistory: () => req<ChatMessage[]>('/api/chat/history'),

  sendChat: (message: string) =>
    req<ChatResponse>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),
};
