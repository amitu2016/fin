'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  selectedTicker: string;
  onTradeComplete: () => void;
};

export function TradeBar({ selectedTicker, onTradeComplete }: Props) {
  const [ticker, setTicker] = useState(selectedTicker);
  const [qty, setQty] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync ticker when selectedTicker prop changes
  if (ticker !== selectedTicker && !loading) {
    setTicker(selectedTicker);
  }

  async function trade(side: 'buy' | 'sell') {
    const quantity = parseFloat(qty);
    if (!ticker || !quantity || quantity <= 0) {
      setStatus('Enter ticker and quantity');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const result = await api.executeTrade({ ticker: ticker.toUpperCase(), quantity, side });
      setStatus(result.message);
      setQty('');
      onTradeComplete();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span style={{ color: 'var(--yellow)', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginRight: 4 }}>
        TRADE
      </span>
      <input
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="TICKER"
        maxLength={5}
        style={{
          width: 80,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: '5px 8px',
          fontSize: 12,
          borderRadius: 3,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="QTY"
        type="number"
        min="0"
        step="any"
        style={{
          width: 90,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: '5px 8px',
          fontSize: 12,
          borderRadius: 3,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <button
        onClick={() => trade('buy')}
        disabled={loading}
        style={{
          background: 'var(--purple)',
          border: 'none',
          color: '#fff',
          padding: '5px 16px',
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 3,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        BUY
      </button>
      <button
        onClick={() => trade('sell')}
        disabled={loading}
        style={{
          background: '#b91c1c',
          border: 'none',
          color: '#fff',
          padding: '5px 16px',
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 3,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        SELL
      </button>
      {status && (
        <span style={{ fontSize: 11, color: status.includes('Insufficient') || status.includes('Enter') ? 'var(--red)' : 'var(--green)', marginLeft: 8 }}>
          {status}
        </span>
      )}
    </div>
  );
}
