import React from 'react';
import { useOpsStore } from '../../store/ops';
import { Phone, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Safety() {
  const { emergencyMode } = useOpsStore();

  if (emergencyMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--ag-red)] p-6 text-white text-center animate-[ag-emergency-flash_1s_infinite]">
         <AlertTriangle size={80} className="mb-6 animate-pulse" />
         <h1 className="text-4xl font-mono font-bold tracking-widest mb-4">CRITICAL EVENT</h1>
         <p className="text-lg font-bold bg-black/30 p-4 rounded-xl border border-white/20 mb-8">
            Please proceed immediately to the nearest marked exit. Do not use elevators.
         </p>

         {/* Evac routes computed dynamically to match the mobile styling restrictions */}
         <div className="w-full bg-black/60 p-4 rounded-2xl border border-red-400/50 flex flex-col gap-4">
            <span className="text-xs font-mono text-red-300 opacity-80 tracking-widest border-b border-red-500/30 pb-2">NEAREST EVACUATION ROUTE</span>
            <div className="flex items-center justify-between text-left">
              <span className="text-xl font-bold">GATE NW EXIT</span>
              <Navigation className="text-red-300 transform rotate-45" size={24} />
            </div>
            <div className="h-[2px] bg-red-900 overflow-hidden relative">
              <motion.div 
                 className="absolute inset-0 bg-red-400"
                 animate={{ x: ["-100%", "100%"] }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-ui p-4 gap-6">
      <div className="flex items-center justify-center py-6">
        <ShieldCheck size={64} className="text-[var(--ag-green)]" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Safety & Assistance</h2>
        <p className="text-sm text-gray-400">Your well-being is our priority. Connect instantly with venue staff.</p>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <button className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center justify-between hover:bg-red-500/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 p-2 rounded-full text-white"><Phone size={20} /></div>
            <div className="text-left">
              <span className="font-bold text-white block">Medical Emergency</span>
              <span className="text-xs text-red-300">Dispatch nearest paramedic</span>
            </div>
          </div>
        </button>

        <button className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-center justify-between hover:bg-amber-500/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-2 rounded-full text-white"><AlertTriangle size={20} /></div>
            <div className="text-left">
              <span className="font-bold text-white block">Report Issue</span>
              <span className="text-xs text-amber-300">Spills, disturbances, missing items</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
