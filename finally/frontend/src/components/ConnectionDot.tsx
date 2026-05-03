'use client';

import type { ConnectionStatus } from '@/lib/types';

const colors: Record<ConnectionStatus, string> = {
  connected: '#22c55e',
  reconnecting: '#f59e0b',
  disconnected: '#ef4444',
};

export function ConnectionDot({ status }: { status: ConnectionStatus }) {
  return (
    <span
      title={status}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: colors[status],
        boxShadow: status === 'connected' ? `0 0 6px ${colors.connected}` : undefined,
      }}
    />
  );
}
