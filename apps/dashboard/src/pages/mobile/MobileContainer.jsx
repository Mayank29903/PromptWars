import React, { useEffect, useState } from 'react';
import { useOpsStore } from '../../store/ops';
import { Home, Map as MapIcon, Clock, Award, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock routing since we are inside a single monolithic app without react-router
const MobileNav = ({ current, setRoute }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'map', icon: MapIcon, label: 'Map' },
    { id: 'queue', icon: Clock, label: 'Queue' },
    { id: 'rewards', icon: Award, label: 'Rewards' },
    { id: 'safety', icon: ShieldAlert, label: 'Safety' },
  ];

  return (
    <div className="h-16 bg-[#02060d] border-t border-[var(--ag-border-subtle)] px-2 flex items-center justify-between z-50 relative">
      {tabs.map(tab => (
        <button 
          key={tab.id} 
          onClick={() => setRoute(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${current === tab.id ? 'text-[var(--ag-cyan)]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <tab.icon size={20} className={current === tab.id ? "drop-shadow-[0_0_8px_var(--ag-cyan)]" : ""} />
          <span className="text-[10px] uppercase font-mono">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default function MobileContainer({ children, route, setRoute }) {
  const { emergencyMode } = useOpsStore();

  return (
    <div className="flex items-center justify-center min-h-screen bg-black/90 p-4">
      {/* 420px max-width tactical dark wrapper */}
      <div className="w-full max-w-[420px] h-[85vh] max-h-[850px] bg-[var(--ag-bg-primary)] border border-[var(--ag-border-subtle)] rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col scale-[0.95] sm:scale-100 origin-center transition-transform duration-500">
        
        {/* Hardware Status Bar Simulation */}
        <div className="h-6 w-full flex items-center justify-between px-6 bg-black z-50 opacity-60">
           <span className="text-[10px] font-mono text-white">9:41</span>
           <span className="text-[10px] font-mono text-white flex gap-1 items-center">
             <div className="w-3 h-2 bg-white rounded-sm opacity-80"></div> 100%
           </span>
        </div>

        {/* Global Emergency Takeover */}
        <AnimatePresence>
          {emergencyMode && route !== 'safety' && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-40 bg-[var(--ag-red)]/90 backdrop-blur flex flex-col items-center justify-center text-white cursor-pointer px-6 text-center animate-[ag-emergency-flash_1s_infinite]"
               onClick={() => setRoute('safety')}
             >
               <ShieldAlert size={64} className="mb-4" />
               <h1 className="text-3xl font-mono font-bold mb-2">EVACUATE immediately</h1>
               <p className="text-sm">Critical event detected. Tap to view safe exit routes.</p>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Router View Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Nav */}
        <MobileNav current={route} setRoute={setRoute} />
      </div>
    </div>
  );
}
