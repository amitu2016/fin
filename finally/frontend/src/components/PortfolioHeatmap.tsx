'use client';

import type { Position } from '@/lib/types';

function pnlColor(pct: number): string {
  if (pct > 5) return '#14532d';
  if (pct > 2) return '#166534';
  if (pct > 0) return '#15803d';
  if (pct > -2) return '#991b1b';
  if (pct > -5) return '#b91c1c';
  return '#7f1d1d';
}

export function PortfolioHeatmap({ positions }: { positions: Position[] }) {
  const totalValue = positions.reduce(
    (s, p) => s + p.quantity * (p.current_price ?? p.avg_cost),
    0
  );

  if (positions.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          background: 'var(--panel)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 11,
        }}
      >
        <div>
          <div style={{ color: 'var(--yellow)', fontWeight: 700, marginBottom: 8 }}>HEATMAP</div>
          <div>No positions</div>
        </div>
      </div>
    );
  }

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
        HEATMAP
      </div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 2, padding: 4, alignContent: 'flex-start' }}>
        {positions.map((p) => {
          const value = p.quantity * (p.current_price ?? p.avg_cost);
          const weight = totalValue > 0 ? value / totalValue : 0;
          const minW = 48;
          return (
            <div
              key={p.ticker}
              title={`${p.ticker}: ${p.pnl_pct.toFixed(2)}% PnL`}
              style={{
                width: `calc(${(weight * 100).toFixed(1)}% - 4px)`,
                minWidth: minW,
                minHeight: 48,
                backgroundColor: pnlColor(p.pnl_pct),
                borderRadius: 3,
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{p.ticker}</div>
              <div style={{ fontSize: 10, color: p.pnl_pct >= 0 ? '#86efac' : '#fca5a5' }}>
                {p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
