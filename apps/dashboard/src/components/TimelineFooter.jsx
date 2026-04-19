import React from 'react';

export function TimelineScrubber() {
  return (
    <div className="h-[48px] w-full border-t border-[var(--ag-border-subtle)] bg-[var(--ag-bg-card)] flex items-end relative overflow-hidden">
      {/* Dynamic timeline ticks mapped loosely. We create 144 ticks = 12h block */}
      <div className="flex w-full h-full items-end pb-1 opacity-60">
        {Array.from({ length: 144 }).map((_, i) => {
           const isCurrent = i === 60; // Hardcode "NOW" at tick 60
           const isFuture = i > 60;
           return (
             <div 
               key={i} 
               className={`flex-1 border-r border-[var(--ag-border-subtle)] ${isFuture ? 'bg-cyan-900/10' : ''}`}
               style={{ height: i % 12 === 0 ? '24px' : i % 6 === 0 ? '16px' : '8px' }}
             />
           )
        })}
      </div>

      {/* Markers overlay */}
      <div className="absolute inset-0 pointer-events-none text-[8px] font-mono text-[var(--ag-text-secondary)]">
        <span className="absolute left-[0%] top-1 text-center w-20 ml-[-40px]">GATES OPEN<br/>t-120m</span>
        <span className="absolute left-[41.6%] top-1 text-center w-20 ml-[-40px]">KICKOFF<br/>t=0</span>
        <span className="absolute left-[72.9%] top-1 text-center w-20 ml-[-40px]">HALFTIME<br/>t+45m</span>
      </div>

      {/* Current Time Indicator Scrubber Line */}
      <div className="absolute top-0 bottom-0 left-[41.6%] w-[2px] bg-[var(--ag-cyan)]">
        <div className="absolute top-0 left-[-4px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[var(--ag-cyan)]"></div>
      </div>
      
      {/* Congestion Bands */}
      <div className="absolute bottom-0 left-[20%] w-[15%] h-1 bg-amber-500/40"></div>
      <div className="absolute bottom-0 left-[70%] w-[8%] h-1 bg-red-500/60"></div>
    </div>
  );
}

export function Ticker() {
  const items = [
    "FAN PULSE · 38,901 ACTIVE",
    "VIRTUAL TOKENS · 1,247 ISSUED",
    "AI REROUTES · 82 THIS HOUR",
    "SATISFACTION · 94%",
    "CRUSH ALERTS · 0 ALL-TIME",
    "ZONE C3 · CAUTION ACTIVE",
    "GATE B · LOW DENSITY",
    "PREDICT · HALFTIME +8MIN",
    "REVENUE BOOST · +23% PROJECTED",
    "SAFETY SCORE · 94 / 100"
  ];

  return (
    <div className="h-[28px] w-full bg-[#020810] flex items-center overflow-hidden border-t border-[var(--ag-border-subtle)] whitespace-nowrap">
      <div className="flex text-xs font-mono text-[var(--ag-text-secondary)] opacity-80 animate-[ag-ticker_28s_linear_infinite]" style={{ width: '200%' }}>
        {/* Render twice for infinite seam loop */}
        <div className="flex-1 flex justify-around">
           {items.map((it, i) => <span key={i}>{it} ◆</span>)}
        </div>
        <div className="flex-1 flex justify-around">
           {items.map((it, i) => <span key={`dup-${i}`}>{it} ◆</span>)}
        </div>
      </div>
    </div>
  );
}
