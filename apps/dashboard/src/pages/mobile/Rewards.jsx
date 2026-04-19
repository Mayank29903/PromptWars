import React from 'react';
import { useOpsStore } from '../../store/ops';
import { Trophy, Star, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Rewards() {
  const { userPoints, userTier, activityFeed } = useOpsStore();

  const getTierColor = (tier) => {
    switch(tier) {
      case 'Platinum': return 'text-purple-400 border-purple-400 bg-purple-400/10';
      case 'Gold': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
      case 'Silver': return 'text-gray-300 border-gray-300 bg-gray-300/10';
      default: return 'text-amber-700 border-amber-700 bg-amber-700/10';
    }
  };

  const nextTierPts = userTier === 'Platinum' ? null : userTier === 'Gold' ? 5000 : userTier === 'Silver' ? 2500 : 1000;
  const progressPercent = nextTierPts ? (userPoints / nextTierPts) * 100 : 100;

  return (
    <div className="flex flex-col h-full font-ui p-4">
      {/* Tier Badge */}
      <div className="flex flex-col items-center justify-center p-8 mt-2">
        <motion.div 
          animate={{ rotateY: 360 }} 
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`w-24 h-24 rounded-full border-[4px] flex items-center justify-center shadow-[0_0_30px_currentColor] ${getTierColor(userTier).split(' ')[0]} ${getTierColor(userTier).split(' ')[1]}`}
        >
          <Trophy size={40} />
        </motion.div>
        
        <span className={`mt-4 font-mono font-bold tracking-widest uppercase text-xl ${getTierColor(userTier).split(' ')[0]}`}>{userTier} MEMBER</span>
        <span className="text-4xl font-bold text-white mt-1">{userPoints.toLocaleString()} <span className="text-lg text-gray-500 font-mono">PTS</span></span>
      </div>

      {/* Progress Bar */}
      {nextTierPts && (
        <div className="bg-[var(--ag-bg-card)] p-4 rounded-xl border border-[var(--ag-border-subtle)] mb-6">
          <div className="flex justify-between text-xs font-mono text-[var(--ag-text-secondary)] mb-2">
            <span>Current</span>
            <span>{nextTierPts - userPoints} to next Tier</span>
          </div>
          <div className="h-2 w-full bg-[#0a1524] rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${progressPercent}%` }} 
               transition={{ duration: 1 }}
               className={`h-full ${getTierColor(userTier).split(' ')[2]}`} 
               style={{ backgroundColor: 'currentColor' }}
             />
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex-1 flex flex-col gap-3">
        <span className="text-xs font-mono text-[var(--ag-text-secondary)] tracking-widest">RECENT ACTIVITY</span>
        {activityFeed.map((act, i) => (
           <div key={i} className="flex justify-between items-center p-3 border-b border-[var(--ag-border-subtle)]">
             <div className="flex gap-3 items-center">
               <div className="w-8 h-8 rounded-full bg-[var(--ag-cyan)]/10 flex items-center justify-center text-[var(--ag-cyan)]">
                 <Star size={14} />
               </div>
               <div className="flex flex-col">
                 <span className="text-sm text-white">{act.title}</span>
                 <span className="text-[10px] text-gray-500">{act.time}</span>
               </div>
             </div>
             <span className="font-mono text-[var(--ag-green)] font-bold text-sm bg-[var(--ag-green)]/10 px-2 py-1 rounded">{act.pts}</span>
           </div>
        ))}
      </div>
    </div>
  );
}
