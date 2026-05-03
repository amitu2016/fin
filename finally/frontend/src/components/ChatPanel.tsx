'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ChatMessage, ChatTradeResult } from '@/lib/types';

function TradeTag({ trades }: { trades: { ticker: string; side: string; quantity: number; price: number }[] }) {
  if (!trades.length) return null;
  return (
    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {trades.map((t, i) => (
        <span
          key={i}
          style={{
            background: t.side === 'buy' ? '#3b0764' : '#450a0a',
            color: t.side === 'buy' ? '#c4b5fd' : '#fca5a5',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            border: `1px solid ${t.side === 'buy' ? '#6d28d9' : '#b91c1c'}`,
          }}
        >
          {t.side.toUpperCase()} {t.quantity} {t.ticker} @ ${t.price.toFixed(2)}
        </span>
      ))}
    </div>
  );
}

export function ChatPanel({ onTradeComplete }: { onTradeComplete: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getChatHistory().then((hist) => {
      if (hist.length > 0) setMessages(hist);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const resp = await api.sendChat(text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: resp.message,
        actions: {
          trades_executed: resp.trades_executed,
          watchlist_changes: resp.watchlist_changes,
          errors: resp.errors,
        },
      };
      setMessages((m) => [...m, assistantMsg]);
      if (resp.trades_executed.length > 0) onTradeComplete();
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      style={{
        width: 300,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
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
        AI ASSISTANT
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Ask me about your portfolio, request trades, or get market insights.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
            }}
          >
            <div
              style={{
                background: msg.role === 'user' ? '#1e3a5f' : '#1a1a2e',
                border: `1px solid ${msg.role === 'user' ? '#2563eb' : 'var(--border)'}`,
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '6px 10px',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
              {msg.actions?.trades_executed && msg.actions.trades_executed.length > 0 && (
                <TradeTag trades={msg.actions.trades_executed as ChatTradeResult[]} />
              )}
              {msg.actions?.errors && msg.actions.errors.length > 0 && (
                <div style={{ marginTop: 4, color: 'var(--red)', fontSize: 10 }}>
                  {msg.actions.errors.join('; ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div
              style={{
                background: '#1a1a2e',
                border: '1px solid var(--border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--muted)',
              }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: 8,
          display: 'flex',
          gap: 6,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask the AI..."
          rows={2}
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '6px 8px',
            fontSize: 12,
            borderRadius: 4,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            background: 'var(--purple)',
            border: 'none',
            color: '#fff',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
