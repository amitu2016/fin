'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePriceStream } from '@/lib/sse';
import { api } from '@/lib/api';
import type { Portfolio, WatchlistItem } from '@/lib/types';
import { ConnectionDot } from '@/components/ConnectionDot';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { MainChart } from '@/components/MainChart';
import { TradeBar } from '@/components/TradeBar';
import { PositionsTable } from '@/components/PositionsTable';
import { PortfolioHeatmap } from '@/components/PortfolioHeatmap';
import { PnLChart } from '@/components/PnLChart';
import { ChatPanel } from '@/components/ChatPanel';

const DEFAULT_TICKER = 'AAPL';

export default function TradingTerminal() {
  const { prices, priceHistory, connectionStatus } = usePriceStream();
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash_balance: 0,
    positions: [],
    total_value: 0,
    total_pnl: 0,
  });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<{ total_value: number; recorded_at: string }[]>([]);
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_TICKER);

  const refreshPortfolio = useCallback(async () => {
    const [port, hist] = await Promise.all([
      api.getPortfolio().catch(() => null),
      api.getPortfolioHistory().catch(() => []),
    ]);
    if (port) setPortfolio(port);
    setHistory(hist);
  }, []);

  const refreshWatchlist = useCallback(async () => {
    const wl = await api.getWatchlist().catch(() => []);
    setWatchlist(wl);
  }, []);

  useEffect(() => {
    refreshPortfolio();
    refreshWatchlist();
  }, [refreshPortfolio, refreshWatchlist]);

  async function addToWatchlist(ticker: string) {
    try {
      await api.addWatchlist(ticker);
      await refreshWatchlist();
    } catch {}
  }

  async function removeFromWatchlist(ticker: string) {
    try {
      await api.removeWatchlist(ticker);
      await refreshWatchlist();
    } catch {}
  }

  function handleTradeComplete() {
    refreshPortfolio();
  }

  const liveTotal =
    portfolio.cash_balance +
    portfolio.positions.reduce(
      (s, p) => s + p.quantity * (prices[p.ticker]?.price ?? p.current_price ?? p.avg_cost),
      0
    );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header
        style={{
          height: 44,
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 24,
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--yellow)', fontWeight: 900, fontSize: 15, letterSpacing: 2 }}>
          FIN<span style={{ color: 'var(--blue)' }}>ALLY</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>TOTAL</span>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>
            ${liveTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>CASH</span>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>
            ${portfolio.cash_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>P&L</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: portfolio.total_pnl >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {portfolio.total_pnl >= 0 ? '+' : ''}
            ${portfolio.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ConnectionDot status={connectionStatus} />
          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{connectionStatus.toUpperCase()}</span>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Watchlist */}
        <WatchlistPanel
          watchlist={watchlist}
          prices={prices}
          priceHistory={priceHistory}
          selectedTicker={selectedTicker}
          onSelect={setSelectedTicker}
          onRemove={removeFromWatchlist}
          onAdd={addToWatchlist}
        />

        {/* Center: Chart + Trade + Positions + Bottom */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Top: MainChart */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <MainChart ticker={selectedTicker} priceHistory={priceHistory} />
          </div>

          {/* TradeBar */}
          <TradeBar selectedTicker={selectedTicker} onTradeComplete={handleTradeComplete} />

          {/* Bottom row: Positions + Heatmap + PnL */}
          <div style={{ height: 200, display: 'flex', borderTop: '1px solid var(--border)', minHeight: 0 }}>
            <PositionsTable positions={portfolio.positions} prices={prices} />
            <PortfolioHeatmap positions={portfolio.positions} />
            <PnLChart history={history} />
          </div>
        </div>

        {/* Right: Chat */}
        <ChatPanel onTradeComplete={handleTradeComplete} />
      </div>
    </div>
  );
}
