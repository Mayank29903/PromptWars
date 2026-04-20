import React, { useState, useEffect, useRef } from 'react';
import { getDemoHeaders } from '../services/socket';
import { Zap, X, RotateCcw, Activity } from 'lucide-react';

// ── Power chips — picked to showcase AI depth to judges ─────────────────────
const POWER_CHIPS = [
  { label: '🔴 East Stand safe?', query: 'Is East Stand safe right now? What is the crush risk score?' },
  { label: '🍔 Shortest queue?', query: 'Which food stall has the shortest queue right now and how many FanPulse points do I earn for going there?' },
  { label: '⚡ Reroute East Stand', query: 'Trigger fan rerouting for east_stand with 30 points incentive' },
  { label: '📊 Astroworld scenario', query: 'Run a counterfactual for east_stand — what would have happened without ANTIGRAVITY compared to Astroworld 2021?' },
  { label: '🎯 Pre-match briefing', query: 'Give me a full operational briefing for venue management right now' },
  { label: '🚨 Dispatch staff', query: 'Dispatch 4 stewards to east_stand urgently' },
];

export default function AICommandBar({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]); // {role, text, actions, meta}
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Focus on open, reset on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setError(null);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async (text) => {
    const q = (text || query).trim();
    if (!q || loading) return;
    setQuery('');
    setError(null);

    // Add user message
    const userTurn = { role: 'user', text: q };
    const newConv = [...conversation, userTurn];
    setConversation(newConv);
    setLoading(true);

    // Build history for multi-turn (last 6 turns, alternating user/model)
    const history = conversation.slice(-6).map(t => ({ role: t.role === 'user' ? 'user' : 'model', text: t.text }));

    try {
      // Try /act first (function calling), fallback to /command
      let data;
      try {
        const res = await fetch('/api/v1/ai/act', {
          method: 'POST',
          headers: { ...getDemoHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, history }),
        });
        if (res.ok) data = await res.json();
      } catch {}

      if (!data?.success) {
        const res2 = await fetch('/api/v1/ai/command', {
          method: 'POST',
          headers: { ...getDemoHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, history }),
        });
        data = await res2.json();
      }

      if (data?.success) {
        setConversation(prev => [
          ...prev,
          {
            role: 'model',
            text: data.answer,
            actions: data.actions_taken || [],
            meta: {
              model: data.model,
              latency_ms: data.latency_ms,
              safety_score: data.context_snapshot?.safety_score,
              critical_zones: data.context_snapshot?.critical_zones,
            },
          },
        ]);
      } else {
        setError('Command center temporarily offline');
      }
    } catch (e) {
      setError('Command center temporarily offline');
    }
    setLoading(false);
  };

  const handleChip = (chip) => {
    handleSubmit(chip.query);
  };

  const clearConversation = () => {
    setConversation([]);
    setError(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  const hasConversation = conversation.length > 0;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed inset-x-0 top-16 flex justify-center px-4" style={{ pointerEvents: 'none' }}>
        <div
          className="w-full max-w-2xl pointer-events-auto bg-black/97 border border-[var(--ag-cyan)] rounded-xl shadow-[0_0_60px_rgba(0,212,255,0.25)] flex flex-col"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ag-cyan)]/30 shrink-0">
            <div className="flex items-center gap-2 text-[var(--ag-cyan)]">
              <Zap size={14} fill="currentColor" />
              <span className="font-mono font-bold tracking-widest text-xs">ANTIGRAVITY COMMAND</span>
              <span className="px-2 py-0.5 text-[9px] font-mono border border-[var(--ag-cyan)]/40 rounded text-[var(--ag-cyan)]/60">
                gemini-2.0-flash
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasConversation && (
                <button
                  onClick={clearConversation}
                  className="flex items-center gap-1 px-2 py-1 font-mono text-[9px] text-gray-500 hover:text-[var(--ag-cyan)] border border-gray-700 hover:border-[var(--ag-cyan)]/40 rounded transition-colors"
                >
                  <RotateCcw size={9} />
                  CLEAR
                </button>
              )}
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Conversation thread ──────────────────────────────────────── */}
          {hasConversation && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {conversation.map((turn, i) => (
                <div key={i} className={`flex flex-col gap-1 ${turn.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {turn.role === 'user' ? (
                    <div className="max-w-[80%] px-3 py-2 rounded-lg bg-[var(--ag-cyan)]/10 border border-[var(--ag-cyan)]/30">
                      <p className="font-mono text-xs text-[var(--ag-cyan)]">{turn.text}</p>
                    </div>
                  ) : (
                    <div className="max-w-[95%] flex flex-col gap-2">
                      {/* Actions taken (function calls) */}
                      {turn.actions?.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {turn.actions.map((action, ai) => (
                            <div key={ai} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--ag-amber)]/5 border border-[var(--ag-amber)]/20">
                              <Activity size={9} className="text-[var(--ag-amber)] shrink-0" />
                              <span className="font-mono text-[9px] text-[var(--ag-amber)]">
                                CALLED: {action.tool}({Object.entries(action.args || {}).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join(', ')})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* AI answer */}
                      <div className="px-3 py-2 rounded-lg bg-[var(--ag-bg-panel)] border border-[var(--ag-border-normal)]">
                        <p className="font-mono text-xs text-white leading-relaxed whitespace-pre-line">{turn.text}</p>
                      </div>
                      {/* Meta row */}
                      {turn.meta && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 text-[8px] font-mono border border-[var(--ag-green)]/40 text-[var(--ag-green)]/80 rounded">
                            LIVE REDIS
                          </span>
                          <span className="px-1.5 py-0.5 text-[8px] font-mono border border-[var(--ag-cyan)]/40 text-[var(--ag-cyan)]/80 rounded">
                            AI SYNTHESIZED
                          </span>
                          {turn.meta.latency_ms > 0 && (
                            <span className="px-1.5 py-0.5 text-[8px] font-mono border border-gray-700 text-gray-500 rounded">
                              {turn.meta.latency_ms}ms
                            </span>
                          )}
                          {turn.meta.safety_score !== undefined && (
                            <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded border ${
                              turn.meta.critical_zones > 0
                                ? 'border-[var(--ag-red)]/40 text-[var(--ag-red)]'
                                : 'border-[var(--ag-green)]/40 text-[var(--ag-green)]'
                            }`}>
                              SAFETY {turn.meta.safety_score}/100
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading state */}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--ag-cyan)] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ag-cyan)]/60 animate-pulse">
                    ANALYZING VENUE STATE...
                  </span>
                </div>
              )}

              {error && (
                <p className="font-mono text-xs text-[var(--ag-red)]">{error}</p>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* ── Input area ───────────────────────────────────────────────── */}
          <div className="px-4 py-3 border-t border-[var(--ag-cyan)]/20 shrink-0">
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="flex items-center gap-2">
              <span className="font-mono text-[var(--ag-cyan)] text-sm shrink-0">{'>'}</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                disabled={loading}
                placeholder={hasConversation ? 'Follow up...' : 'Ask anything about the venue...'}
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm py-1 disabled:opacity-50"
              />
              {query && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1 font-mono text-xs text-[var(--ag-cyan)] border border-[var(--ag-cyan)]/40 rounded hover:bg-[var(--ag-cyan)]/10 transition-colors disabled:opacity-30"
                >
                  SEND
                </button>
              )}
            </form>
          </div>

          {/* ── Power chips (only when no conversation) ───────────────────── */}
          {!hasConversation && !loading && (
            <div className="px-4 pb-4 flex gap-2 flex-wrap shrink-0">
              {POWER_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => handleChip(chip)}
                  className="px-3 py-1.5 rounded-full border border-[var(--ag-cyan)]/30 text-[var(--ag-cyan)]/80 text-[10px] font-mono hover:bg-[var(--ag-cyan)]/10 hover:border-[var(--ag-cyan)]/60 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
