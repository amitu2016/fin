'use client';

import { useEffect, useRef, useState } from 'react';
import type { PriceEntry, PriceMap, PriceHistory, ConnectionStatus } from './types';

const HISTORY_LIMIT = 60;

export function usePriceStream() {
  const [prices, setPrices] = useState<PriceMap>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function connect() {
      setConnectionStatus('reconnecting');
      const es = new EventSource('/api/stream/prices');
      esRef.current = es;

      es.onopen = () => setConnectionStatus('connected');

      es.onmessage = (e) => {
        const data: PriceEntry[] = JSON.parse(e.data);
        setPrices((prev) => {
          const next = { ...prev };
          for (const item of data) next[item.ticker] = item;
          return next;
        });
        setPriceHistory((prev) => {
          const next = { ...prev };
          for (const item of data) {
            const hist = next[item.ticker] ?? [];
            next[item.ticker] = [...hist, item.price].slice(-HISTORY_LIMIT);
          }
          return next;
        });
      };

      es.onerror = () => {
        setConnectionStatus('reconnecting');
        es.close();
        retryRef.current = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
      clearTimeout(retryRef.current);
    };
  }, []);

  return { prices, priceHistory, connectionStatus };
}
