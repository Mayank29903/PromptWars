import React from 'react';
import { useOpsStore } from '../../store/ops';
import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';

export default function MapBase() {
  const { zones } = useOpsStore();

  const getDimColor = (density) => {
    if(density > 0.8) return 'rgba(220,38,38,0.8)';
    if(density > 0.6) return 'rgba(217,119,6,0.6)';
    return 'rgba(8,145,178,0.3)';
  };

  return (
    <div className="flex flex-col h-full font-ui text-white">
       <div className="p-4 bg-[var(--ag-bg-panel)] border-b border-[var(--ag-border-subtle)] flex items-center gap-3">
         <Navigation size={18} className="text-[var(--ag-cyan)]" />
         <span className="font-mono text-sm tracking-widest">VENUE MAP</span>
       </div>
       
       <div className="flex-1 relative overflow-hidden bg-[#02060d]">
          {/* SVG 2D Interactive Map mirroring the Heatmap bounds locally */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
             <svg width="100%" height="80%" viewBox="-10 -10 900 540" style={{ transform: 'rotate(90deg) scale(0.9)' }}>
                {zones.map((z, i) => (
                  <g key={z.id}>
                    <motion.rect
                      x={z.x} y={z.y} width={z.w} height={z.h}
                      animate={{ fill: getDimColor(z.current) }}
                      transition={{ duration: 0.8 }}
                      stroke="rgba(255,255,255,0.1)" strokeWidth="2"
                    />
                    <text x={z.x + z.w/2} y={z.y + z.h/2} fill="white" fontSize="16" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                      {z.label}
                    </text>
                  </g>
                ))}
                
                {/* Simulated Animated Route Line */}
                <motion.path 
                  d="M100,50 L200,250 L450,250"
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="6"
                  strokeDasharray="20 10"
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
             </svg>
          </div>
       </div>

       <div className="p-4 bg-[var(--ag-bg-panel)] border-t border-[var(--ag-border-subtle)]">
         <div className="text-xs text-[var(--ag-text-secondary)] mb-2">SUGGESTED ROUTE</div>
         <div className="bg-[var(--ag-cyan)]/10 p-3 rounded-lg border border-[var(--ag-cyan)] flex justify-between items-center">
            <span className="text-sm">Gate NW → Main Concourse</span>
            <span className="font-mono text-[var(--ag-cyan)]">+150 PTS</span>
         </div>
       </div>
    </div>
  );
}
