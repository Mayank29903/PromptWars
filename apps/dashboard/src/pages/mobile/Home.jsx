import React from 'react';
import { useOpsStore } from '../../store/ops';
import { Bell, Trophy, Zap, Clock } from 'lucide-react';

export default function Home({ setRoute }) {
  const { userPoints, queues, alerts } = useOpsStore();
  const topQueue = queues[0];
  const activeAlert = alerts[0] || null;

  return (
    <div className="p-4 flex flex-col gap-6 font-ui text-[var(--ag-text-primary)]">
       {/* Hero */}
       <div className="bg-[var(--ag-bg-card)] rounded-2xl p-6 border border-[var(--ag-border-normal)] flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-[var(--ag-cyan)]/10 to-transparent"></div>
         <span className="text-[10px] font-mono tracking-widest text-[var(--ag-cyan)] uppercase z-10">Champions League Final</span>
         <h1 className="text-3xl font-bold mt-1 z-10">KICKOFF</h1>
         <div className="font-mono text-4xl mt-3 text-white tracking-widest z-10" style={{ textShadow: '0 0 15px var(--ag-cyan)' }}>01:42:09</div>
       </div>

       {/* Greeting */}
       <div className="flex justify-between items-center bg-[var(--ag-bg-elevated)] p-4 rounded-xl border border-[var(--ag-border-subtle)]">
         <div>
           <span className="text-xs text-[var(--ag-text-secondary)] block">Welcome back,</span>
           <span className="font-bold text-lg">Commander Alex</span>
         </div>
         <div className="text-right">
           <span className="text-[10px] text-[var(--ag-text-secondary)] block">Section 312, Row F</span>
           <span className="font-mono text-[var(--ag-amber)] font-bold text-lg">{userPoints} pts</span>
         </div>
       </div>

       {/* Top Alert */}
       {activeAlert && (
         <div className={`p-4 rounded-xl border ${activeAlert.type === 'critical' ? 'bg-[var(--ag-red)]/10 border-[var(--ag-red)]' : 'bg-[var(--ag-amber)]/10 border-[var(--ag-amber)]'}`}>
           <div className="flex gap-3 items-start">
             <Bell className={activeAlert.type === 'critical' ? 'text-[var(--ag-red)] animate-bounce' : 'text-[var(--ag-amber)]'} size={20} />
             <div>
               <span className="font-bold text-sm block mb-1">Live Advisory</span>
               <span className="text-xs leading-snug">{activeAlert.message}</span>
             </div>
           </div>
         </div>
       )}

       {/* Quick Actions / Pulse */}
       <div className="grid grid-cols-2 gap-4">
         <button onClick={() => setRoute('queue')} className="bg-[var(--ag-bg-card)] p-4 rounded-xl border border-[var(--ag-border-subtle)] flex flex-col items-center gap-2 hover:bg-[var(--ag-cyan)]/10 transition-colors">
            <Clock className="text-[var(--ag-cyan)]" />
            <span className="text-xs font-mono">Join SmartQueue</span>
            <span className="text-[10px] text-[var(--ag-text-secondary)]">{topQueue ? `${topQueue.current_wait}m wait` : 'Offline'}</span>
         </button>
         
         <button onClick={() => setRoute('rewards')} className="bg-[var(--ag-bg-card)] p-4 rounded-xl border border-[var(--ag-border-subtle)] flex flex-col items-center gap-2 hover:bg-[var(--ag-green)]/10 transition-colors">
            <Trophy className="text-[var(--ag-green)]" />
            <span className="text-xs font-mono">FanPulse Hub</span>
            <span className="text-[10px] text-[var(--ag-text-secondary)]">View Tier Progress</span>
         </button>
       </div>
    </div>
  );
}
