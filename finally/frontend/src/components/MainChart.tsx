'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import type { PriceHistory } from '@/lib/types';

type Props = {
  ticker: string;
  priceHistory: PriceHistory;
};

export function MainChart({ ticker, priceHistory }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: { vertLine: { color: '#209dd7' }, horzLine: { color: '#209dd7' } },
      timeScale: { borderColor: '#2a2a4a', timeVisible: true },
      rightPriceScale: { borderColor: '#2a2a4a' },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(LineSeries, {
      color: '#209dd7',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    const hist = priceHistory[ticker] ?? [];
    if (hist.length === 0) return;
    const now = Date.now();
    const data: LineData[] = hist.map((price, i) => ({
      time: ((now - (hist.length - 1 - i) * 500) / 1000) as LineData['time'],
      value: price,
    }));
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [ticker, priceHistory]);

  return (
    <div
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--yellow)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        {ticker} — LIVE PRICE
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
