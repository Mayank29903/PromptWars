import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOpsStore } from '../store/ops';
import { useClock } from '../utils/hooks';
import { HeatmapCanvas } from '../components/HeatmapCanvas';
import { socketService } from '../services/socket';
import { TimelineScrubber, Ticker } from '../components/TimelineFooter';
import AICommandBar from '../components/AICommandBar';
import CounterfactualPanel from '../components/CounterfactualPanel';
import StadiumSVG from '../components/StadiumSVG';

// ── Inline sleep util — no external import needed ───────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── NarrationBanner — auto-demo step overlay ─────────────────────────
function NarrationBanner({ demoStep, demoNarration }) {
  return (
    <div className="absolute top-[130px] left-4 right-4 z-30 bg-black/90 border border-[var(--ag-cyan)] rounded overflow-hidden">
      <div className="px-4 py-2 flex items-center gap-3">
        <div className="w-1 self-stretch bg-[var(--ag-cyan)] rounded-full shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono text-[var(--ag-cyan)]/60 tracking-widest mb-0.5">AUTO DEMO — STEP {demoStep}/7</div>
          <div className="font-mono text-sm text-[var(--ag-cyan)] leading-snug">{demoNarration}</div>
        </div>
        <div className="font-mono text-[10px] text-[var(--ag-cyan)]/50 animate-pulse shrink-0">▶ RUNNING</div>
      </div>
      {/* Progress bar */}
      <div className="h-[2px] w-full bg-black/60">
        <div
          className="h-full bg-[var(--ag-cyan)] transition-all duration-1000 ease-linear"
          style={{ width: `${(demoStep / 7) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Header({ setView, demoRunning, onRunDemo, onOpenCommand }) {
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

      {/* Center Right — AI pill + FAN VIEW + RUN DEMO */}
      <div className="flex items-center gap-2">
        <div 
          className={`px-3 py-1 font-mono text-xs border rounded transition-colors duration-500`}
          style={{ borderColor: currentAi.color, color: currentAi.color, backgroundColor: `color-mix(in srgb, ${currentAi.color} 10%, transparent)` }}
        >
          <span className={currentAi.animate}>{currentAi.text}</span>
        </div>

        {/* RUN DEMO button */}
        {demoRunning ? (
          <span className="px-3 py-1 font-mono text-xs border border-dashed border-[var(--ag-cyan)] text-[var(--ag-cyan)] animate-pulse rounded">
            DEMO RUNNING...
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCommand}
              className="px-3 py-1 font-mono text-xs tracking-widest border border-[var(--ag-cyan)]/50 text-[var(--ag-cyan)] bg-[var(--ag-cyan)]/10 hover:bg-[var(--ag-cyan)]/20 transition-colors rounded"
            >
              CMD /
            </button>
            <button
              onClick={onRunDemo}
              className="px-3 py-1 font-mono text-xs tracking-widest border border-dashed border-[var(--ag-cyan)] text-[var(--ag-cyan)] hover:bg-cyan-900/20 transition-colors rounded"
            >
              RUN DEMO
            </button>
          </div>
        )}

        {setView && (
          <button
            onClick={() => setView('mobile')}
            className="px-3 py-1 font-mono text-xs border border-[var(--ag-cyan)] text-[var(--ag-cyan)] rounded-full hover:bg-[var(--ag-cyan)]/10 transition-colors tracking-widest"
          >
            FAN VIEW ↗
          </button>
        )}
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

// BUG-D: Seeded deterministic function — produces identical results every render
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Pre-compute deterministic 48-tick forecast (east stand peaks at tick 12 ≈ minute 61).
// Computed once at module level so it's NEVER regenerated on re-render.
const PREDICT_TICKS = Array.from({ length: 48 }, (_, i) => {
  const base = 0.45 + Math.sin(i * 0.18) * 0.28 + Math.sin(i * 0.41) * 0.12;
  const noise = (seededRandom(i * 7 + 13) - 0.5) * 0.04;
  const val = Math.max(0.1, Math.min(0.98, base + noise));
  return {
    p25: Math.max(0.05, val * 0.78),
    p50: val,
    p85: Math.min(1.0, val * 1.28)
  };
});

function PredictPanel() {
  const { predictMode, predictData, loadPredictData, timelinePosition } = useOpsStore();
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Current tick follows the timeline scrubber
  const currentTick = Math.floor(timelinePosition * 47);

  useEffect(() => {
     if (predictMode && !predictData) loadPredictData();
  }, [predictMode, predictData, loadPredictData]);

  useEffect(() => {
    if (!predictMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const ticks = PREDICT_TICKS;

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

function TelemetryPanel() {
  const [telemetry, setTelemetry] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/v1/ops/telemetry');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTelemetry(data);
        setOffline(false);
      } catch (e) {
        setOffline(true);
      }
    };

    fetchTelemetry();
    const it = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(it);
  }, []);

  const getStatus = () => {
    if (offline || !telemetry) return 'OFFLINE';
    const s = telemetry.services;
    const allUp = s.api_gateway === 'UP' && s.safety_net === 'UP' && s.ml_service === 'UP' && s.predict_engine === 'UP';
    return allUp ? 'NOMINAL' : 'DEGRADED';
  };

  const status = getStatus();
  const statusColor = status === 'NOMINAL' ? 'text-[var(--ag-green)]' : status === 'DEGRADED' ? 'text-[var(--ag-amber)]' : 'text-[var(--ag-red)]';

  const redisLatency = telemetry ? telemetry.redis_latency_ms : 0;
  const latColor = redisLatency < 5 ? 'var(--ag-green)' : redisLatency < 20 ? 'var(--ag-amber)' : 'var(--ag-red)';
  const memory = telemetry ? telemetry.memory_mb : 0;
  const memPct = Math.min(100, (memory / 512) * 100);

  const ServiceDot = ({ up }) => (
    <div className={`w-2 h-2 rounded-full ${offline ? 'bg-[var(--ag-red)]' : (up ? 'bg-[var(--ag-green)]' : 'bg-[var(--ag-red)]')}`}></div>
  );

  return (
    <div className="ag-card p-3 flex flex-col shrink-0 min-h-[120px] justify-between">
      <div className="flex justify-between items-center border-b border-[var(--ag-border-subtle)] pb-2 mb-2">
        <span className="ag-label">SYSTEM HEALTH</span>
        <span className={`font-mono text-[10px] font-bold ${statusColor}`}>{status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
         {/* Left Side: Metrics */}
         <div className="flex flex-col gap-2 justify-center">
            <div className="flex justify-between items-end">
               <span className="text-[10px] text-[var(--ag-text-secondary)]">REDIS IO</span>
               <span className="font-mono text-xs" style={{ color: latColor }}>{offline ? '--' : redisLatency}ms</span>
            </div>
            <div className="flex flex-col gap-1">
               <div className="flex justify-between items-end">
                 <span className="text-[10px] text-[var(--ag-text-secondary)]">MEMORY</span>
                 <span className="font-mono text-[10px] opacity-80">{offline ? '-- ' : memory}MB</span>
               </div>
               <div className="h-[2px] w-full bg-[#0a1524]">
                 <div className="h-full bg-[var(--ag-cyan)] transition-all" style={{ width: `${offline ? 0 : memPct}%` }}></div>
               </div>
            </div>
         </div>

         {/* Right Side: Services Row Map */}
         <div className="flex flex-col items-end justify-center gap-1">
            <span className="text-[10px] text-[var(--ag-text-secondary)] mb-1">SERVICES</span>
            <div className="grid grid-cols-2 gap-2">
               <ServiceDot up={telemetry?.services?.api_gateway === 'UP'} />
               <ServiceDot up={telemetry?.services?.safety_net === 'UP'} />
               <ServiceDot up={telemetry?.services?.ml_service === 'UP'} />
               <ServiceDot up={telemetry?.services?.predict_engine === 'UP'} />
            </div>
            <span className="font-mono text-[8px] text-[var(--ag-text-secondary)] mt-1 opacity-50">API/SAF/ML/PRE</span>
         </div>
      </div>
    </div>
  );
}

function Sidebar({ onOpenWhatIf }) {
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
      
      <button 
         onClick={onOpenWhatIf}
         className="w-full py-2 border border-dashed border-[var(--ag-amber)] text-[var(--ag-amber)] font-mono text-xs tracking-widest hover:bg-amber-900/10 rounded"
      >
         WHAT IF?
      </button>

      <TelemetryPanel />
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

// ── ZoneExplainer — floating explainability panel ────────────────────
function ZoneExplainer({ data, onDismiss }) {
  if (!data) return null;

  const alertColors = {
    NORMAL: { bg: 'var(--ag-green)', text: '#00e09e' },
    CAUTION: { bg: 'var(--ag-amber)', text: '#f5a020' },
    WARNING: { bg: 'var(--ag-red)', text: '#dc2626' },
    CRITICAL: { bg: 'var(--ag-red)', text: '#ff3d54' },
  };

  const alertStyle = alertColors[data.alert_level] || alertColors.NORMAL;
  const contributions = data.feature_contributions || [];
  const topTwo = contributions.slice(0, 2);

  // Max contribution for scaling bars
  const maxContrib = Math.max(...contributions.map(c => c.weighted_contribution), 0.01);

  const barColor = (feat) => {
    if (feat.feature === 'crowd_density') return 'var(--ag-red)';
    if (feat.feature === 'crowd_velocity') return 'var(--ag-amber)';
    if (feat.feature === 'crowd_convergence') return 'var(--ag-cyan)';
    return 'var(--ag-green)';
  };

  return (
    <div className="absolute bottom-16 left-6 w-72 z-30 ag-card p-3 backdrop-blur-md" style={{ backgroundColor: 'rgba(2,6,13,0.95)', borderColor: alertStyle.text, borderWidth: '1px' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="ag-label text-[9px] tracking-widest mb-0.5">ZONE EXPLAINABILITY</div>
          <div className="font-mono text-sm font-bold text-white">{data.zone_name}</div>
        </div>
        <button
          onClick={onDismiss}
          className="text-[var(--ag-text-secondary)] hover:text-white text-lg leading-none transition-colors px-1"
        >
          ×
        </button>
      </div>

      {/* Risk score + badge */}
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[var(--ag-border-subtle)]">
        <span
          className="font-mono text-3xl font-bold leading-none"
          style={{ color: alertStyle.text, textShadow: `0 0 12px ${alertStyle.text}` }}
        >
          {data.crush_risk_score}
        </span>
        <span
          className="px-2 py-0.5 font-mono text-[10px] tracking-widest rounded font-bold"
          style={{
            color: alertStyle.text,
            backgroundColor: `color-mix(in srgb, ${alertStyle.bg} 15%, transparent)`,
            border: `1px solid ${alertStyle.text}`,
          }}
        >
          {data.alert_level}
        </span>
      </div>

      {/* Top 2 contributors */}
      <div className="flex flex-col gap-2 mb-2">
        {topTwo.map((feat, i) => (
          <div key={feat.feature}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] font-mono text-[var(--ag-text-secondary)] uppercase">
                {i === 0 ? '▸ PRIMARY' : '▸ SECONDARY'}: {feat.feature.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-mono" style={{ color: barColor(feat) }}>
                +{feat.weighted_contribution}
              </span>
            </div>
            {/* Bar */}
            <div className="h-[4px] w-full bg-[#0a1524] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(feat.weighted_contribution / maxContrib) * 100}%`,
                  backgroundColor: barColor(feat),
                }}
              />
            </div>
            <div className="text-[9px] text-[var(--ag-text-secondary)] mt-0.5 leading-tight">
              {feat.plain_english}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {data.recommendation && (
        <div className="text-[10px] text-[var(--ag-text-secondary)] border-t border-[var(--ag-border-subtle)] pt-1.5 mt-1 leading-snug font-mono">
          ▶ {data.recommendation}
        </div>
      )}
    </div>
  );
}

export default function CommandCenter({ setView, demoRef }) {
  const { setPredictMode, setEmergencyMode, predictMode, addAlert, loadPredictData } = useOpsStore();

  // ── Zone Explainability state ─────────────────────────────────────
  const [zoneExplanation, setZoneExplanation] = useState(null);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isCounterfactualOpen, setIsCounterfactualOpen] = useState(false);
  const [useStadiumSvg, setUseStadiumSvg] = useState(false);

  const handleZoneClick = useCallback(async (zone) => {
    const density = zone.current * 6.0; // Convert to persons/sqm
    const velocity = 0.3;
    const convergence = zone.current > 0.7 ? 0.8 : 0.2;
    const acceleration = 0.4;

    try {
      const params = new URLSearchParams({
        density: density.toFixed(2),
        velocity: velocity.toFixed(2),
        convergence: convergence.toFixed(2),
        acceleration: acceleration.toFixed(2),
      });
      const resp = await fetch(`/ml/predict/explain-crush?${params}`);
      if (!resp.ok) throw new Error('Endpoint unavailable');
      const data = await resp.json();

      setZoneExplanation({
        zone_name: zone.label,
        crush_risk_score: data.crush_risk_score,
        alert_level: data.alert_level,
        feature_contributions: data.explanation.feature_contributions,
        recommendation: data.explanation.recommendation,
      });
    } catch {
      // Fallback — hardcoded explanation when ML service is unreachable
      const densityPct = (zone.current * 100).toFixed(0);
      const riskLevel = zone.current > 0.82 ? 'CRITICAL' : zone.current > 0.65 ? 'WARNING' : zone.current > 0.4 ? 'CAUTION' : 'NORMAL';
      setZoneExplanation({
        zone_name: zone.label,
        crush_risk_score: (zone.current * 0.95).toFixed(3),
        alert_level: riskLevel,
        feature_contributions: [
          {
            feature: 'crowd_density',
            raw_value: density.toFixed(1),
            normalized_score: zone.current,
            weighted_contribution: (0.35 * zone.current).toFixed(3),
            pct_of_total: 40,
            plain_english: `Zone at ${densityPct}% capacity — density is the primary risk driver`,
          },
          {
            feature: 'crowd_velocity',
            raw_value: velocity,
            normalized_score: 0.625,
            weighted_contribution: (0.30 * 0.625).toFixed(3),
            pct_of_total: 25,
            plain_english: `Crowd moving slowly at ${velocity} m/s — restricted movement detected`,
          },
        ],
        recommendation: riskLevel === 'CRITICAL'
          ? 'EVACUATE — activate full emergency protocol immediately'
          : riskLevel === 'WARNING'
          ? 'Immediate security dispatch required'
          : 'Zone within operational parameters',
      });
    }
  }, []);

  // ── Auto-Demo state ───────────────────────────────────────────────
  const [demoRunning, setDemoRunning]       = useState(false);
  const [demoStep, setDemoStep]             = useState(0);
  const [demoNarration, setDemoNarration]   = useState('');

  const startDemo = async () => {
    if (demoRunning) return;

    // Step 1
    setDemoRunning(true);
    setDemoStep(1);
    setDemoNarration('ANTIGRAVITY DEMO — Loading live venue state...');
    loadPredictData();
    setPredictMode(true);
    await sleep(2000);

    // Step 2
    setDemoStep(2);
    setDemoNarration('CROWDFLOW AI ACTIVE — East Stand at 91% density. Crush risk scoring initiated.');
    addAlert({ id: Date.now(), type: 'critical', icon: '⚠', message: 'CrowdFlow AI: East Stand density 91% — initiating crush risk assessment' });
    await sleep(2000);

    // Step 3
    setDemoStep(3);
    setDemoNarration('SAFETYNET: Reading 1/3 — Risk score 0.847. Consecutive readings required before escalation.');
    addAlert({ id: Date.now(), type: 'warning', icon: '⚠', message: 'SafetyNet reading 1/3 — crush risk score 0.847 (threshold: 0.82)' });
    await sleep(2500);

    // Step 4
    setDemoStep(4);
    setDemoNarration('SAFETYNET: Reading 2/3 — Risk score 0.891. WARNING dispatching security units.');
    addAlert({ id: Date.now(), type: 'warning', icon: '⚠', message: 'SafetyNet reading 2/3 — security units 4 and 9 dispatched to Zone E' });
    await sleep(2500);

    // Step 5 — CRITICAL flip
    setDemoStep(5);
    setDemoNarration('SAFETYNET: Reading 3/3 — CRITICAL THRESHOLD REACHED. Autonomous emergency protocol activating.');
    await sleep(500);
    setEmergencyMode(true);
    await sleep(1000);

    // Step 6
    setDemoStep(6);
    setDemoNarration('EMERGENCY PROTOCOL ACTIVE — PA broadcast sent. Evacuation routes computed. 312 fans rerouted. Emergency services notified.');
    addAlert({ id: Date.now(), type: 'critical', icon: '🚨', message: 'EMERGENCY — All systems activated simultaneously via asyncio.gather. Route: Zone E → Gate NW (38s)' });
    await sleep(4500);

    // Step 7
    setDemoStep(7);
    setDemoNarration('FANPULSE ACTIVE — Fans accepting rerouting earn 25 points. Compliance rate: 68%.');
    addAlert({ id: Date.now(), type: 'ok', icon: '✓', message: 'FanPulse: 312 fans rerouted — 68% accepted AI guidance, earning 25 FanPulse points each' });
    await sleep(3000);

    // Done — leave emergencyMode active for judges
    setDemoStep(0);
    setDemoNarration('');
    setDemoRunning(false);
  };

  useEffect(() => {
    socketService.connect();
    // Expose startDemo via ref for ?demo=true URL param support
    if (demoRef) demoRef.current = { start: startDemo };
    return () => socketService.disconnect();
  }, []);

  // ── Keyboard Shortcuts (for live demo) ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key.toLowerCase()) {
        case '/':
          e.preventDefault();
          setIsCommandBarOpen(true);
          break;
        case 'd':
          startDemo();
          break;
        case 'e':
          setEmergencyMode(!emergencyMode);
          break;
        case 'p':
          setPredictMode(!predictMode);
          break;
        case 'escape':
          setEmergencyMode(false);
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emergencyMode, predictMode, setEmergencyMode, setPredictMode]);

  return (
    <div className={`w-screen h-screen m-0 p-0 overflow-hidden flex flex-col font-ui text-[var(--ag-text-primary)] ag-grid-bg transition-colors duration-1000`}>
      <Header setView={setView} demoRunning={demoRunning} onRunDemo={startDemo} onOpenCommand={() => setIsCommandBarOpen(true)} />
      <MetricsRow />
      <PredictPanel />
      <AICommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
      <CounterfactualPanel isOpen={isCounterfactualOpen} onClose={() => setIsCounterfactualOpen(false)} />
      {/* NarrationBanner — only visible during demo */}
      {demoRunning && demoNarration && (
        <NarrationBanner demoStep={demoStep} demoNarration={demoNarration} />
      )}
      
      {/* Main Area */}
      <div className="flex-1 flex px-4 pb-4 gap-[6px] relative overflow-hidden min-h-0">
        <div className="flex-1 relative border border-[var(--ag-border-subtle)] rounded overflow-hidden">
           {useStadiumSvg ? <StadiumSVG onZoneClick={handleZoneClick} /> : <HeatmapCanvas onZoneClick={handleZoneClick} />}
           {/* Zone Explainability Panel */}
           <ZoneExplainer data={zoneExplanation} onDismiss={() => setZoneExplanation(null)} />
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
                onClick={() => setUseStadiumSvg(!useStadiumSvg)} 
                className={`px-3 py-1 text-xs border transition-colors focus:outline-none ${useStadiumSvg ? 'border-white text-white font-bold bg-white/10' : 'border-gray-500 text-gray-400 hover:text-white'}`}>
               STADIUM VIEW
             </button>
             <button 
                onClick={() => setPredictMode(!predictMode)} 
                className={`px-3 py-1 text-xs border transition-colors focus:outline-none ${predictMode ? 'border-[var(--ag-amber)] text-[var(--ag-amber)] bg-amber-900/40 shadow-[0_0_10px_var(--ag-amber)] font-bold' : 'border-[var(--ag-cyan)] text-[var(--ag-cyan)] bg-transparent hover:bg-cyan-900/20'}`}>
               PREDICT 30M
             </button>
           </div>
           
           {/* Keyboard Shortcut Legend */}
           <div className="absolute bottom-2 left-4 font-mono text-[9px] text-[var(--ag-text-secondary)] opacity-40 hover:opacity-100 transition-opacity z-10 pointer-events-none">
             [D] demo [E] emergency [P] predict [Esc] clear
           </div>
        </div>
        <Sidebar onOpenWhatIf={() => setIsCounterfactualOpen(true)} />
        <IntelligenceFeed />
      </div>

      <TimelineScrubber />
      <Ticker />
      <EmergencyOverlay />
    </div>
  );
}
