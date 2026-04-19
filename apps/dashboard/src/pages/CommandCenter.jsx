import React, { useState, useEffect, useRef } from 'react';
import { useOpsStore } from '../store/ops';
import { useClock } from '../utils/hooks';
import { HeatmapCanvas } from '../components/HeatmapCanvas';
import { socketService } from '../services/socket';
import { TimelineScrubber, Ticker } from '../components/TimelineFooter';

function Header() {
  const { timeStr } = useClock();
  const [aiState, setAiState] = useState(0);

  useEffect(() => {
    const it = setInterval(() => setAiState(p => (p + 1) % 3), 8000);
    return () => clearInterval(it);
  }, []);

  const aiPillData = [
    { text: "THINKING...", color: "var(--ag-amber)", animate: "animate-pulse" },
    { text: "ROUTING 312 FANS", color: "var(--ag-cyan)", animate: "" },
    { text: "ALL SYSTEMS NOMINAL", color: "var(--ag-green)", animate: "" }
  ];

  const currentAi = aiPillData[aiState];

  return (
    <div className="h-[50px] flex items-center justify-between px-4 border-b border-[var(--ag-border-normal)] bg-[var(--ag-bg-panel)] z-10 w-full shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="w-[6px] h-6 bg-[var(--ag-cyan)]"></div>
        <div className="flex flex-col">
          <span className="font-mono text-[var(--ag-cyan)] font-bold tracking-widest text-lg leading-none" style={{ textShadow: '0 0 10px var(--ag-cyan)' }}>
            ANTIGRAVITY
          </span>
          <span className="text-[6px] leading-tight tracking-widest text-[var(--ag-text-secondary)] font-sans">
            VENUE INTELLIGENCE SYSTEM
          </span>
        </div>
      </div>

      {/* Center Left */}
      <div className="flex items-center gap-2 border border-[var(--ag-border-subtle)] px-3 py-1 rounded bg-[var(--ag-bg-elevated)]">
        <div className="ag-live-dot"></div>
        <span className="font-mono text-[var(--ag-red)] text-xs tracking-widest">LIVE OPS</span>
      </div>

      {/* Center */}
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-wider">CHAMPIONS LEAGUE FINAL</span>
        <span className="text-[var(--ag-text-secondary)] mx-1">|</span>
        <span className="text-[var(--ag-text-secondary)] italic text-sm">Match in progress (1T 42')</span>
      </div>

      {/* Center Right */}
      <div 
        className={`px-3 py-1 font-mono text-xs border rounded transition-colors duration-500`}
        style={{ borderColor: currentAi.color, color: currentAi.color, backgroundColor: `color-mix(in srgb, ${currentAi.color} 10%, transparent)` }}
      >
        <span className={currentAi.animate}>{currentAi.text}</span>
      </div>

      {/* Right */}
      <div className="font-mono tracking-widest text-lg font-bold" style={{ color: 'var(--ag-cyan)', textShadow: '0 0 10px var(--ag-cyan)' }}>
        {timeStr}
      </div>
    </div>
  );
}

function MetricsRow() {
  const { emergencyMode } = useOpsStore();
  const [attendees, setAttendees] = useState(41293);

  useEffect(() => {
    const it = setInterval(() => setAttendees(p => p + Math.floor(Math.random()*5)), 3200);
    return () => clearInterval(it);
  }, []);

  return (
    <div className="h-[72px] grid grid-cols-4 gap-4 px-4 py-2 bg-transparent z-10 w-full relative shrink-0">
      <MetricCard label="TOTAL ATTENDEES" value={attendees.toLocaleString()} subtext="↑ 218 in last 5min" color="cyan" />
      <MetricCard label="AVG WAIT TIME" value="8.2m" subtext="Gate A: 22min ⚠" color="amber" />
      <MetricCard label="SAFETY SCORE" value={emergencyMode ? "CRITICAL" : "94"} subtext={emergencyMode ? "Evacuation in progress" : "Optimal · 0 critical zones"} color={emergencyMode ? "red" : "green"} />
      <MetricCard label="ACTIVE ALERTS" value={emergencyMode ? "1" : "3"} subtext={emergencyMode ? "1 critical" : "0 critical · 3 warnings"} color={emergencyMode ? "red" : "amber"} pulse={emergencyMode} />
    </div>
  );
}

function MetricCard({ label, value, subtext, color, pulse }) {
  return (
    <div className={`ag-card h-full flex flex-col justify-between p-2 relative ${pulse ? 'animate-pulse' : ''}`} style={{ borderTopWidth: '2px', borderTopColor: `var(--ag-${color})` }}>
      <div className="flex justify-between items-center z-10 relative">
        <span className="ag-label">{label}</span>
      </div>
      <div className="flex items-end justify-between z-10 relative">
        <span className="font-mono text-2xl font-bold leading-none" style={{ color: `var(--ag-${color})`, textShadow: `0 0 10px var(--ag-${color})` }}>{value}</span>
        <span className="text-[10px] text-[var(--ag-text-secondary)]">{subtext}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-[7px] h-[7px] pointer-events-none opacity-25" style={{ borderBottom: `1.5px solid var(--ag-${color})`, borderRight: `1.5px solid var(--ag-${color})` }}></div>
    </div>
  );
}

function PredictPanel() {
  const { predictMode, predictData, loadPredictData } = useOpsStore();
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
     if (predictMode && !predictData) loadPredictData();
  }, [predictMode, predictData, loadPredictData]);

  useEffect(() => {
    if (!predictMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Check if we have actual predictData or generate deterministic mock data for 48 ticks
    const ticks = [];
    for (let i = 0; i < 48; i++) {
       const base = 0.5 + Math.sin(i / 10) * 0.3 + (Math.random() * 0.05);
       ticks.push({ 
         p25: Math.max(0.1, base * 0.8), 
         p50: Math.max(0.1, base), 
         p85: Math.min(1.0, base * 1.25) 
       });
    }

    const render = () => {
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       
       ctx.strokeStyle = 'rgba(255,255,255,0.1)';
       ctx.lineWidth = 1;
       ctx.beginPath();
       for (let y = 0; y <= canvas.height; y += 25) {
         ctx.moveTo(0, y);
         ctx.lineTo(canvas.width, y);
       }
       ctx.stroke();

       const barW = 4;
       const gap = 2;
       
       const totalChartW = ticks.length * (barW * 3 + gap);
       const startX = (canvas.width - totalChartW) / 2;
       
       ticks.forEach((t, i) => {
          const x = startX + i * (barW * 3 + gap);
          const ch = canvas.height - 10;
          
          const h85 = t.p85 * ch;
          ctx.fillStyle = '#dc2626'; // P85 Red
          ctx.fillRect(x, canvas.height - h85, barW, h85);
          
          const h50 = t.p50 * ch;
          ctx.fillStyle = '#d97706'; // P50 Amber
          ctx.fillRect(x + barW, canvas.height - h50, barW, h50);

          const h25 = t.p25 * ch;
          ctx.fillStyle = '#00e09e'; // P25 Green
          ctx.fillRect(x + barW * 2, canvas.height - h25, barW, h25);
       });

       const currentTick = 12; // Example vertical line
       const lineX = startX + currentTick * (barW * 3 + gap) + (barW * 1.5);
       ctx.strokeStyle = '#dc2626';
       ctx.lineWidth = 2;
       ctx.setLineDash([4, 4]);
       ctx.beginPath();
       ctx.moveTo(lineX, 0);
       ctx.lineTo(lineX, canvas.height);
       ctx.stroke();
       ctx.setLineDash([]);
    };

    render();

    const handleMouseMove = (e) => {
       const rect = canvas.getBoundingClientRect();
       const x = e.clientX - rect.left;
       const barW = 4;
       const gap = 2;
       const totalW = barW * 3 + gap;
       const totalChartW = 48 * totalW;
       const startX = (canvas.width - totalChartW) / 2;
       
       const tickIdx = Math.floor((x - startX) / totalW);
       if (tickIdx >= 0 && tickIdx < 48) {
         const t = ticks[tickIdx];
         setTooltip({
           x: e.clientX,
           y: e.clientY,
           tick: tickIdx,
           min: tickIdx * 15,
           val: (t.p50 * 100).toFixed(0)
         });
       } else {
         setTooltip(null);
       }
    };
    const handleMouseLeave = () => setTooltip(null);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [predictMode, predictData]);

  return (
    <div className={`overflow-hidden transition-all duration-500 ease-in-out px-4 shrink-0 ${predictMode ? 'h-[120px] pb-4 opacity-100' : 'h-0 pb-0 opacity-0'}`}>
       <div className="w-full h-full border border-[var(--ag-border-subtle)] bg-[var(--ag-bg-panel)] rounded flex flex-col relative px-4">
          <div className="absolute top-2 left-4 text-xs font-mono text-[var(--ag-amber)] tracking-widest font-bold">PREDICT 48H: EAST STAND DENSITY FORECAST</div>
          <div className="absolute top-2 right-4 text-[10px] font-mono text-[var(--ag-text-secondary)] flex gap-4">
            <span><span className="inline-block w-2 h-2 bg-[var(--ag-red)] mr-1"></span>P85</span>
            <span><span className="inline-block w-2 h-2 bg-[var(--ag-amber)] mr-1"></span>P50</span>
            <span><span className="inline-block w-2 h-2 bg-[var(--ag-green)] mr-1"></span>P25</span>
          </div>
          <div className="flex-1 mt-6">
            <canvas ref={canvasRef} width={800} height={70} className="w-full h-full" />
          </div>
          {tooltip && (
             <div className="fixed bg-black/90 border border-[var(--ag-border-subtle)] text-white p-2 text-xs rounded z-50 pointer-events-none shadow-xl font-mono" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
                <div className="text-[var(--ag-text-secondary)] border-b border-gray-800 pb-1 mb-1">Tick: {tooltip.tick} (T+{tooltip.min}m)</div>
                <div className="text-[var(--ag-amber)]">P50 Density: {tooltip.val}%</div>
             </div>
          )}
       </div>
    </div>
  )
}

function Sidebar() {
  const { systemModuleStatuses, queues } = useOpsStore();

  return (
    <div className="w-[268px] flex flex-col gap-4 h-full">
      <div className="ag-card p-3 flex-1 flex flex-col min-h-0">
        <span className="ag-label block border-b border-[var(--ag-border-subtle)] pb-2 mb-2">SYSTEM MODULES</span>
        <div className="flex flex-col gap-[6px] overflow-y-auto">
          {Object.values(systemModuleStatuses).map(mod => {
            const isWatch = mod.status === 'watch';
            return (
              <div key={mod.name} className="flex justify-between items-center text-sm p-1 rounded hover:bg-[var(--ag-cyan)]/10 hover:text-[var(--ag-cyan)] transition-colors group cursor-default">
                <div className="flex items-center gap-2">
                  <div className={`w-[6px] h-[6px] rounded-full ${isWatch ? 'bg-[var(--ag-amber)]' : 'bg-[var(--ag-green)]'} relative`}>
                    {!isWatch && <div className="absolute inset-0 bg-inherit rounded-full animate-ping opacity-75"></div>}
                  </div>
                  <span>{mod.name}</span>
                </div>
                {mod.static_label ? (
                  <span className="font-mono text-[10px]" style={{ color: `var(--ag-${mod.color})` }}>{mod.static_label}</span>
                ) : (
                  <span className="font-mono text-xs opacity-80 group-hover:opacity-100">{mod.current}ms</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="ag-card p-3 flex-1 flex flex-col min-h-0">
        <span className="ag-label block border-b border-[var(--ag-border-subtle)] pb-2 mb-3">QUEUE STATUS</span>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {queues.map(q => {
            const isRed = q.current_wait > 18;
            const isAmber = q.current_wait > 10;
            const cColor = isRed ? '--ag-red' : isAmber ? '--ag-amber' : '--ag-green';
            return (
              <div key={q.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="truncate">{q.name}</span>
                  <span className="font-mono" style={{ color: `var(${cColor})` }}>{q.current_wait}m</span>
                </div>
                <div className="h-[2px] w-full bg-[#0a1524]">
                  <div className="h-full transition-all duration-[4800ms] ease-in-out" style={{ width: `${(q.current_wait / q.wait_max) * 100}%`, backgroundColor: `var(${cColor})` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

function IntelligenceFeed() {
  const { alerts } = useOpsStore();
  
  return (
    <div className="absolute bottom-6 left-6 right-6 pointer-events-none flex flex-col-reverse gap-2 z-20" style={{ maxWidth: 'calc(100% - 268px - 48px)' }}>
      {alerts.slice(0, 4).map((a, i) => {
        let borders = 'border-l-2 ';
        let bgStyle = '';
        if(a.type === 'critical') { borders += 'border-[var(--ag-red)]'; bgStyle = 'rgba(255,61,84,0.07)'; }
        if(a.type === 'warning') { borders += 'border-[var(--ag-amber)]'; bgStyle = 'rgba(245,160,32,0.05)'; }
        if(a.type === 'info') { borders += 'border-[#00d4ff]'; bgStyle = 'rgba(0,212,255,0.04)'; }
        if(a.type === 'ok') { borders += 'border-[#00e09e]'; bgStyle = 'rgba(0,224,158,0.04)'; }

        return (
           <div key={`${a.id}-${i}`} className={`ag-card p-2 px-3 pointer-events-auto flex items-center gap-3 animate-[ag-slide-in_0.3s_ease-out] backdrop-blur-md ${borders}`} style={{ backgroundColor: bgStyle, borderTop: 'none', borderRight: 'none', borderBottom: 'none' }}>
             <span className="font-mono font-bold" style={{ color: a.type === 'critical' ? 'var(--ag-red)' : a.type === 'warning' ? 'var(--ag-amber)' : a.type === 'ok' ? 'var(--ag-green)' : 'var(--ag-cyan)'}}>{a.icon}</span>
             <span className="text-sm font-sans tracking-wide leading-tight">{a.message}</span>
           </div>
        )
      })}
    </div>
  );
}

function EmergencyOverlay() {
  const { emergencyMode, setEmergencyMode } = useOpsStore();
  if(!emergencyMode) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center border-[1px] border-[var(--ag-red)] bg-red-500/10 backdrop-blur-[2px]">
       <div className="absolute inset-0 animate-[ag-emergency-flash_1s_infinite] pointer-events-none -z-10"></div>
       <div className="max-w-2xl bg-black/90 p-8 border border-[var(--ag-red)] shadow-[0_0_80px_rgba(220,38,38,0.3)]">
         <h1 className="text-5xl font-mono test-red text-[var(--ag-red)] text-center mb-8 animate-bounce font-bold tracking-widest">EMERGENCY</h1>
         
         <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div className="border border-[var(--ag-border-subtle)] p-4 bg-[var(--ag-bg-panel)]">
              <span className="ag-label mb-2 block">EVAC ROUTES COMPUTED</span>
              <ul className="list-disc pl-4 opacity-80 space-y-1">
                <li>Zone N → Exit Gates N1, N2</li>
                <li>Zone S → Loading Bay Doors</li>
                <li>Pitch Clear → Stand by</li>
              </ul>
            </div>
            <div className="border border-[var(--ag-border-subtle)] p-4 bg-[var(--ag-bg-panel)]">
              <span className="ag-label mb-2 block">DISPATCH PANEL</span>
              <ul className="list-disc pl-4 opacity-80 space-y-1">
                <li>Unit 4 (Medic) → Zone S</li>
                <li>Unit 9 (Security) → Gate E</li>
                <li>CMD Center → Active</li>
              </ul>
            </div>
         </div>
         
         <div className="flex gap-4">
           <button className="flex-1 py-3 bg-[var(--ag-red)] text-white font-bold tracking-widest rounded hover:bg-red-700 transition-colors">
              CONTACT 911
           </button>
           <button className="flex-1 py-3 border border-[var(--ag-cyan)] text-[var(--ag-cyan)] font-bold tracking-widest rounded hover:bg-cyan-900/30 transition-colors">
              PA BROADCAST
           </button>
         </div>

         <button 
            onClick={() => setEmergencyMode(false)}
            className="w-full mt-4 py-2 border border-dashed border-gray-600 text-gray-400 font-mono text-sm hover:border-white hover:text-white transition-all">
           STAND DOWN [CLEAR EMERGENCY]
         </button>
       </div>
    </div>
  )
}

export default function CommandCenter() {
  const { setPredictMode, setEmergencyMode, predictMode } = useOpsStore();

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  return (
    <div className={`w-screen h-screen m-0 p-0 overflow-hidden flex flex-col font-ui text-[var(--ag-text-primary)] ag-grid-bg transition-colors duration-1000`}>
      <Header />
      <MetricsRow />
      <PredictPanel />
      
      {/* Main Area */}
      <div className="flex-1 flex px-4 pb-4 gap-[6px] relative overflow-hidden min-h-0">
        <div className="flex-1 relative border border-[var(--ag-border-subtle)] rounded overflow-hidden">
           <HeatmapCanvas />
           {/* Dev tools hidden in production build */}
           <div className="absolute top-4 right-4 z-10 flex gap-2">
             {import.meta.env.DEV && (
             <button 
                onClick={() => setEmergencyMode(true)} 
                className="px-3 py-1 bg-[var(--ag-red)]/10 text-[var(--ag-red)] text-xs border border-[var(--ag-red)]/50 border-dashed hover:bg-red-900 focus:outline-none">
               [DEV] CRITICAL ON
             </button>
             )}
             <button 
                onClick={() => setPredictMode(!predictMode)} 
                className={`px-3 py-1 text-xs border transition-colors focus:outline-none ${predictMode ? 'border-[var(--ag-amber)] text-[var(--ag-amber)] bg-amber-900/40 shadow-[0_0_10px_var(--ag-amber)] font-bold' : 'border-[var(--ag-cyan)] text-[var(--ag-cyan)] bg-transparent hover:bg-cyan-900/20'}`}>
               PREDICT 30M
             </button>
           </div>
        </div>
        <Sidebar />
        <IntelligenceFeed />
      </div>

      <TimelineScrubber />
      <Ticker />
      <EmergencyOverlay />
    </div>
  );
}
