import React, { useEffect, useState, useRef } from 'react';
import { X, Zap } from 'lucide-react';

export default function CounterfactualPanel({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasLeft = useRef(null);
  const canvasRight = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    
    // Attempt fetch from API
    fetch('/ml/predict/counterfactual')
      .then(res => {
         if(!res.ok) throw new Error('API absent');
         return res.json();
      })
      .then(json => {
         setData(json);
         setLoading(false);
      })
      .catch((e) => {
         // Mock fallback because this is usually calculated deep in the ML pipeline or requested specifically
         setTimeout(() => {
            setData({
               scenario: "ASTROWORLD",
               timeline_without_ai: [5.0, 5.2, 5.5, 5.8, 6.1, 6.4, 6.8, 7.1, 7.5, 7.8, 8.0, 8.1, 8.2, 8.2, 8.1, 8.0, 7.8, 7.5, 7.1, 6.8],
               timeline_with_ai:    [5.0, 5.2, 5.5, 5.8, 5.2, 4.8, 4.5, 4.2, 4.1, 4.0, 4.1, 4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6, 3.5, 3.5],
               verdict: "AI averted a localized density crush (8.2 persons/sqm) by actively rerouting 312 fans at minute 4, immediately flattening the density curve and saving an estimated 7.5 minutes of emergency response delay."
            });
            setLoading(false);
         }, 800);
      });
  }, [isOpen]);

  useEffect(() => {
    if(!isOpen || loading || !data) return;

    const drawChart = (canvas, timeline, lineColor, markDotConfig) => {
       const ctx = canvas.getContext('2d');
       ctx.clearRect(0,0, canvas.width, canvas.height);
       
       const w = canvas.width;
       const h = canvas.height;
       const padding = 30;
       const chartW = w - padding * 2;
       const chartH = h - padding * 2;
       
       // Draw Grid
       ctx.strokeStyle = 'rgba(255,255,255,0.05)';
       ctx.lineWidth = 1;
       ctx.beginPath();
       for(let i=0; i<=4; i++) {
          const y = padding + (chartH / 4) * i;
          ctx.moveTo(padding, y);
          ctx.lineTo(w - padding, y);
       }
       ctx.stroke();

       // Draw Labels Y
       ctx.fillStyle = 'rgba(255,255,255,0.5)';
       ctx.font = '10px monospace';
       ctx.textAlign = 'right';
       for(let i=0; i<=4; i++) {
          const y = padding + (chartH / 4) * i;
          const val = 8.5 - i * 1.0; 
          ctx.fillText(val.toFixed(1), padding - 5, y + 4);
       }

       // Draw X Axis
       ctx.textAlign = 'center';
       for(let i=0; i<timeline.length; i+=2) {
          const x = padding + (chartW / (timeline.length - 1)) * i;
          ctx.fillText((i / 2) + 'm', x, h - padding + 15);
       }
       
       // Threshold line (Y = 6.0)
       const thresholdY = padding + chartH * ((8.5 - 6.0) / 4.0);
       ctx.strokeStyle = '#dc2626';
       ctx.setLineDash([4, 4]);
       ctx.beginPath();
       ctx.moveTo(padding, thresholdY);
       ctx.lineTo(w - padding, thresholdY);
       ctx.stroke();
       ctx.setLineDash([]);
       ctx.fillStyle = '#dc2626';
       ctx.textAlign = 'right';
       ctx.fillText('CRITICAL', w - padding + 55, thresholdY - 4);

       // Draw Path
       ctx.strokeStyle = lineColor;
       ctx.lineWidth = 3;
       ctx.beginPath();
       timeline.forEach((val, idx) => {
          const x = padding + (chartW / (timeline.length - 1)) * idx;
          const y = padding + chartH * ((8.5 - Math.min(8.5, val)) / 4.0);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
       });
       ctx.stroke();

       // Draw Marks
       markDotConfig.forEach(mark => {
          const idx = mark.tick;
          const val = timeline[idx];
          const x = padding + (chartW / (timeline.length - 1)) * idx;
          const y = padding + chartH * ((8.5 - Math.min(8.5, val)) / 4.0);
          
          ctx.fillStyle = mark.color;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(mark.label, x, y - 10);
       });
    };

    drawChart(canvasLeft.current, data.timeline_without_ai, '#dc2626', [
       { tick: 8, label: 'CRITICAL REACHED', color: '#ff3d54' },
       { tick: 15, label: 'Human notices ⚑', color: '#f5a020' }
    ]);
    
    drawChart(canvasRight.current, data.timeline_with_ai, '#00e09e', [
       { tick: 3, label: 'AI DETECTS', color: '#00d4ff' },
       { tick: 4, label: 'Rerouting activated', color: '#00e09e' }
    ]);
    
  }, [isOpen, loading, data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="max-w-4xl w-full bg-[var(--ag-bg-panel)] border border-[var(--ag-border-normal)] rounded-xl p-6 shadow-[0_0_80px_rgba(0,212,255,0.1)] flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
           <div>
              <div className="text-[10px] font-mono text-[var(--ag-cyan)] flex items-center gap-2 mb-1 tracking-widest"><Zap size={14}/> COUNTERFACTUAL ANALYSIS — ASTROWORLD SCENARIO</div>
              <h2 className="text-xl font-bold font-sans text-white">What would have happened at East Stand, Minute 61, without AI intervention?</h2>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-[var(--ag-cyan)] font-mono animate-pulse">
            COMPUTING PARALLEL SCENARIOS ...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex gap-6 divide-x divide-white/10">
              
              {/* LEFT: WITHOUT AI */}
              <div className="flex-1 flex flex-col pr-6">
                 <div className="flex items-center justify-between mb-4 pb-2 border-b border-red-500/20">
                    <span className="font-bold text-red-500 tracking-widest text-sm">WITHOUT ANTIGRAVITY</span>
                 </div>
                 <canvas ref={canvasLeft} width={380} height={200} className="w-full bg-[#02050a] border border-red-900/30 rounded mb-4" />
                 <div className="flex flex-col gap-3 text-sm">
                    <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">Time to Critical: <span className="font-bold text-red-400">4 minutes</span></div>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">Evacuation delay: <span className="font-bold text-amber-500">7.5 minutes</span></div>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">Est. injury risk: <span className="font-bold text-red-500 animate-pulse">HIGH</span></div>
                    </div>
                 </div>
              </div>

              {/* RIGHT: WITH AI */}
              <div className="flex-1 flex flex-col pl-6">
                 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--ag-green)]/20">
                    <span className="font-bold text-[var(--ag-green)] tracking-widest text-sm">WITH ANTIGRAVITY</span>
                 </div>
                 <canvas ref={canvasRight} width={380} height={200} className="w-full bg-[#02050a] border border-[var(--ag-green)]/20 rounded mb-4" />
                 <div className="flex flex-col gap-3 text-sm">
                    <div className="bg-[var(--ag-green)]/5 border border-[var(--ag-green)]/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">AI detection: <span className="font-bold text-green-400">90 seconds</span></div>
                    </div>
                    <div className="bg-[var(--ag-green)]/5 border border-[var(--ag-green)]/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">Crush prevented: <span className="font-bold text-[var(--ag-cyan)]">YES</span></div>
                    </div>
                    <div className="bg-[var(--ag-green)]/5 border border-[var(--ag-green)]/20 p-3 rounded">
                      <div className="text-[10px] uppercase text-gray-400 font-mono mb-1">Fans rerouted: <span className="font-bold text-white">312</span></div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="bg-[var(--ag-cyan)]/5 border border-[var(--ag-cyan)] p-4 rounded text-center">
               <h4 className="font-bold text-[var(--ag-cyan)] font-mono text-sm mb-1 uppercase tracking-widest">VERDICT</h4>
               <p className="text-sm font-bold text-white max-w-2xl mx-auto">{data.verdict}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
