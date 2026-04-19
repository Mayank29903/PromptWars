import React from 'react';
import { useOpsStore } from '../../store/ops';
import { Bell, Trophy, Clock, MapPin, Shield } from 'lucide-react';

export default function Home({ setRoute }) {
  const { userPoints, userTier, queues, alerts, connectionStatus } = useOpsStore();
  const topQueue = queues[0];
  const activeAlert = alerts[0] || null;

  return (
    <div className="p-4 flex flex-col gap-6 font-ui text-[var(--ag-text-primary)] relative">
       
       {/* Connection Status */}
       <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
         <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-[var(--ag-green)] animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-[var(--ag-amber)]' : 'bg-[var(--ag-red)]'
         }`}></div>
         <span className="text-[10px] font-mono text-gray-400">
            {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
         </span>
       </div>

       {/* Hero / Match Status */}
       <div className="bg-[var(--ag-bg-card)] rounded-2xl p-6 border border-[var(--ag-border-normal)] flex flex-col items-center justify-center relative overflow-hidden mt-6">
         <div className="absolute inset-0 bg-gradient-to-b from-[var(--ag-cyan)]/10 to-transparent"></div>
         <span className="text-[10px] font-mono tracking-widest text-[var(--ag-cyan)] uppercase z-10 mb-2">Champions League Final</span>
         
         <div className="flex items-center gap-4 z-10 w-full justify-center">
            <div className="text-right">
              <span className="block font-bold text-lg text-white">HOME</span>
              <span className="block font-mono text-2xl text-[var(--ag-cyan)]">1</span>
            </div>
            <div className="font-mono text-xl text-gray-500">-</div>
            <div className="text-left">
              <span className="block font-bold text-lg text-white">AWAY</span>
              <span className="block font-mono text-2xl text-white">0</span>
            </div>
         </div>
         <div className="mt-3 bg-white/5 border border-white/10 px-3 py-1 rounded font-mono text-sm tracking-widest text-[var(--ag-amber)] z-10">
            1T 42:09
         </div>
       </div>

       {/* Greeting & Points Mini Card */}
       <div className="flex justify-between items-center bg-[var(--ag-bg-elevated)] p-4 rounded-xl border border-[var(--ag-border-subtle)]">
         <div>
           <span className="text-xs text-[var(--ag-text-secondary)] block">Welcome back,</span>
           <span className="font-bold text-lg">Commander Alex</span>
           <span className="text-[10px] text-[var(--ag-text-secondary)] block mt-1">Section 312, Row F</span>
         </div>
         <div className="text-right bg-black/40 p-2 px-3 rounded border border-white/5 cursor-pointer hover:border-white/20 transition-colors" onClick={() => setRoute('rewards')}>
           <span className="text-[10px] font-mono text-[var(--ag-text-secondary)] block uppercase tracking-widest pb-1 w-full text-center border-b border-white/10 mb-1">Your Points</span>
           <div className="flex items-center gap-2">
             <Trophy size={14} className={userTier === 'Silver' ? "text-gray-300" : "text-amber-400"} />
             <span className="font-mono font-bold text-lg text-white">{userPoints.toLocaleString()}</span>
           </div>
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

       {/* Quick Actions Row */}
       <div className="grid grid-cols-3 gap-3">
         <button onClick={() => setRoute('queue')} className="bg-[var(--ag-bg-card)] p-3 rounded-xl border border-[var(--ag-border-subtle)] flex flex-col items-center justify-center gap-2 hover:bg-[var(--ag-cyan)]/10 transition-colors">
            <Clock className="text-[var(--ag-cyan)]" size={24} />
            <span className="text-xs font-bold mt-1">Queue</span>
            <span className="text-[9px] font-mono text-[var(--ag-text-secondary)]">{topQueue ? `${topQueue.current_wait}m` : '--'}</span>
         </button>
         
         <button onClick={() => setRoute('nav')} className="bg-[var(--ag-bg-card)] p-3 rounded-xl border border-[var(--ag-border-subtle)] flex flex-col items-center justify-center gap-2 hover:bg-[var(--ag-amber)]/10 transition-colors">
            <MapPin className="text-[var(--ag-amber)]" size={24} />
            <span className="text-xs font-bold mt-1">Map</span>
            <span className="text-[9px] font-mono text-[var(--ag-text-secondary)]">Navigate</span>
         </button>

         <button onClick={() => setRoute('safety')} className="bg-[var(--ag-bg-card)] p-3 rounded-xl border border-[var(--ag-border-subtle)] flex flex-col items-center justify-center gap-2 hover:bg-[var(--ag-green)]/10 transition-colors">
            <Shield className="text-[var(--ag-green)]" size={24} />
            <span className="text-xs font-bold mt-1">Safety</span>
            <span className="text-[9px] font-mono text-[var(--ag-text-secondary)]">Assistance</span>
         </button>
       </div>
    </div>
  );
}
