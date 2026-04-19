import React, { useState, useEffect } from 'react';
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
    <div className="h-[50px] flex items-center justify-between px-4 border-b border-[var(--ag-border-normal)] bg-[var(--ag-bg-panel)] z-10 w-full">
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
    // Attendees count up increment from spec
    const it = setInterval(() => setAttendees(p => p + Math.floor(Math.random()*5)), 3200);
    return () => clearInterval(it);
  }, []);

  return (
    <div className="h-[72px] grid grid-cols-4 gap-4 px-4 py-2 bg-transparent z-10 w-full relative">
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
      {/* Corner Bracket */}
      <div className="absolute bottom-0 right-0 w-[7px] h-[7px] pointer-events-none opacity-25" style={{ borderBottom: `1.5px solid var(--ag-${color})`, borderRight: `1.5px solid var(--ag-${color})` }}></div>
    </div>
  );
}

function Sidebar() {
  const { systemModuleStatuses, queues } = useOpsStore();

  return (
    <div className="w-[268px] flex flex-col gap-4">
      {/* System Modules */}
      <div className="ag-card p-3 flex-1">
        <span className="ag-label block border-b border-[var(--ag-border-subtle)] pb-2 mb-2">SYSTEM MODULES</span>
        <div className="flex flex-col gap-[6px]">
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

      {/* Queue Status */}
      <div className="ag-card p-3 flex-1 flex flex-col">
        <span className="ag-label block border-b border-[var(--ag-border-subtle)] pb-2 mb-3">QUEUE STATUS</span>
        <div className="flex flex-col gap-3">
          {queues.map(q => {
            const isRed = q.current_wait > 18;
            const isAmber = q.current_wait > 10;
            const cColor = isRed ? '--ag-red' : isAmber ? '--ag-amber' : '--ag-green';
            return (
              <div key={q.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="truncate">{q.name}</span>
                  <span className="font-mono" style={{ color: `var(--ag-${cColor.replace('--ag-','')})` }}>{q.current_wait}m</span>
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
                className={`px-3 py-1 text-xs border transition-colors focus:outline-none ${predictMode ? 'border-[var(--ag-amber)] text-[var(--ag-amber)] bg-amber-900/20 shadow-[0_0_10px_var(--ag-amber)]' : 'border-[var(--ag-cyan)] text-[var(--ag-cyan)] bg-transparent hover:bg-cyan-900/20'}`}>
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
