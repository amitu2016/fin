'use client';

import { useEffect, useRef, useState } from 'react';
import type { WatchlistItem, PriceMap, PriceHistory } from '@/lib/types';

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span style={{ width: 60, height: 20, display: 'inline-block' }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 20, PAD = 2;
  const points = data
    .map((v, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
      const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  watchlist: WatchlistItem[];
  prices: PriceMap;
  priceHistory: PriceHistory;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
  onAdd: (ticker: string) => void;
};

export function WatchlistPanel({
  watchlist,
  prices,
  priceHistory,
  selectedTicker,
  onSelect,
  onRemove,
  onAdd,
}: Props) {
  const [newTicker, setNewTicker] = useState('');
  const flashRef = useRef<Record<string, string>>({});
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const item of watchlist) {
      const entry = prices[item.ticker];
      if (entry) next[item.ticker] = entry.direction;
    }
    flashRef.current = next;
    setFlashKey((k) => k + 1);
  }, [prices, watchlist]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = newTicker.trim().toUpperCase();
    if (t) { onAdd(t); setNewTicker(''); }
  }

  return (
    <div
      style={{
        width: 200,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--yellow)',
          fontWeight: 700,
          letterSpacing: 1,
          fontSize: 11,
        }}
      >
        WATCHLIST
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.map((item) => {
          const entry = prices[item.ticker];
          const hist = priceHistory[item.ticker] ?? [];
          const price = entry?.price ?? item.price ?? 0;
          const prev = entry?.prev_price ?? price;
          const changePct = prev ? ((price - prev) / prev) * 100 : 0;
          const isSelected = item.ticker === selectedTicker;
          const dir = flashRef.current[item.ticker] ?? 'flat';
          const flashClass = dir === 'up' ? 'flash-up' : dir === 'down' ? 'flash-down' : '';

          return (
            <div
              key={`${item.ticker}-${flashKey}`}
              className={flashClass}
              onClick={() => onSelect(item.ticker)}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: isSelected ? 'rgba(32, 157, 215, 0.12)' : undefined,
                borderLeft: isSelected ? '2px solid var(--blue)' : '2px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 12 }}>
                  {item.ticker}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.ticker); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: '0 2px',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 12 }}>${price.toFixed(2)}</span>
                <span style={{ color: changePct >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              </div>
              <div style={{ marginTop: 3 }}>
                <Sparkline data={hist} />
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleAdd}
        style={{
          padding: '6px 8px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 4,
        }}
      >
        <input
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          placeholder="ADD TICKER"
          maxLength={5}
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 6px',
            fontSize: 11,
            borderRadius: 3,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--blue)',
            border: 'none',
            color: '#fff',
            padding: '4px 8px',
            fontSize: 11,
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </form>
    </div>
  );
}
