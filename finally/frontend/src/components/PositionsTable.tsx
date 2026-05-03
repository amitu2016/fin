'use client';

import type { Position, PriceMap } from '@/lib/types';

type Props = {
  positions: Position[];
  prices: PriceMap;
};

export function PositionsTable({ positions, prices }: Props) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '4px 10px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--yellow)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        POSITIONS
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['TICKER', 'QTY', 'AVG', 'PRICE', 'PNL', '%'].map((h) => (
                <th key={h} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--muted)' }}
                >
                  No open positions
                </td>
              </tr>
            )}
            {positions.map((p) => {
              const livePrice = prices[p.ticker]?.price ?? p.current_price ?? p.avg_cost;
              const pnl = (livePrice - p.avg_cost) * p.quantity;
              const pnlPct = p.avg_cost ? ((livePrice - p.avg_cost) / p.avg_cost) * 100 : 0;
              const color = pnl >= 0 ? 'var(--green)' : 'var(--red)';
              return (
                <tr
                  key={p.ticker}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '4px 8px', color: 'var(--blue)', fontWeight: 700 }}>
                    {p.ticker}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{p.quantity}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>${p.avg_cost.toFixed(2)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>${livePrice.toFixed(2)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color }}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color }}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
