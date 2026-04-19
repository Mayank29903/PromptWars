import React, { useState, useEffect, useRef } from 'react';
import { getDemoHeaders } from '../services/socket';
import { Zap } from 'lucide-react';

export default function AICommandBar({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setAnswer(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (answer || error) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [answer, error, onClose]);

  const handleSubmit = async (text) => {
    const q = text || query;
    if (!q.trim()) return;
    
    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const res = await fetch('/api/v1/ai/command', {
        method: 'POST',
        headers: getDemoHeaders(),
        body: JSON.stringify({ query: q, context: {} })
      });
      const data = await res.json();
      if (data.success) {
        setAnswer(data.answer);
      } else {
        setError('Command center temporarily offline');
      }
    } catch (e) {
      setError('Command center temporarily offline');
    }
    setLoading(false);
  };

  const handleChip = (text) => {
    setQuery(text);
    handleSubmit(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} style={{ pointerEvents: 'auto' }}>
      <div className="fixed inset-x-0 top-20 flex justify-center pointer-events-none">
        <div 
          className="w-full max-w-2xl pointer-events-auto bg-black/95 border border-[var(--ag-cyan)] rounded-xl shadow-[0_0_40px_rgba(0,212,255,0.2)] p-4 flex flex-col gap-3"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[var(--ag-cyan)]/30 pb-2">
            <div className="flex items-center gap-2 text-[var(--ag-cyan)]">
              <Zap size={16} fill="currentColor" />
              <span className="font-mono font-bold tracking-widest text-sm">ANTIGRAVITY COMMAND</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500">ESC to close</span>
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything... e.g. Is East Stand safe right now?" 
              className="w-full bg-transparent border-none outline-none text-white font-mono text-base py-2 px-0"
            />
          </form>

          {/* Suggestions */}
          {!loading && !answer && !error && (
            <div className="flex gap-2 flex-wrap mt-1">
              {['Is East Stand safe?', 'Shortest food queue?', 'Which zones to avoid?', 'Current safety score?'].map(s => (
                <button 
                  key={s} 
                  onClick={() => handleChip(s)}
                  className="px-3 py-1 rounded-full border border-[var(--ag-cyan)]/40 text-[var(--ag-cyan)] text-xs font-mono cursor-pointer hover:bg-[var(--ag-cyan)]/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Response */}
          {loading && (
            <div className="py-4 font-mono text-sm text-[var(--ag-cyan)] animate-pulse">
              ANALYZING VENUE STATE...
            </div>
          )}
          {error && (
            <div className="py-4 font-mono text-sm text-[var(--ag-red)]">
              {error}
            </div>
          )}
          {answer && (
            <div className="py-2 flex flex-col gap-3">
              <p className="text-white font-mono text-sm leading-relaxed whitespace-pre-line">{answer}</p>
              <div className="flex gap-2 mt-2">
                 <span className="px-2 py-0.5 text-[9px] font-mono border border-[var(--ag-green)] text-[var(--ag-green)] bg-[var(--ag-green)]/10 rounded">LIVE REDIS</span>
                 <span className="px-2 py-0.5 text-[9px] font-mono border border-[var(--ag-cyan)] text-[var(--ag-cyan)] bg-[var(--ag-cyan)]/10 rounded">AI SYNTHESIZED</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
