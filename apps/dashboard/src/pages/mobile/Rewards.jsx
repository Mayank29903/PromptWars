import React, { useState, useEffect } from 'react';
import { useOpsStore } from '../../store/ops';
import { Trophy, Star, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDemoHeaders } from '../../services/socket';

export default function Rewards() {
  const { userPoints, userTier, activityFeed } = useOpsStore();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/v1/fan/leaderboard', { headers: getDemoHeaders() });
        const data = await res.json();
        if (data.success && data.data && data.data.top50.length > 0) {
          setLeaderboard(data.data.top50.slice(0, 5));
        } else {
          setLeaderboard([
            {rank:1, displayName:'Alex C.', points:3840, tier:'GOLD'}, 
            {rank:2, displayName:'Jamie L.', points:2910, tier:'GOLD'}, 
            {rank:3, displayName:'Sam K.', points:1980, tier:'SILVER'}, 
            {rank:4, displayName:'Commander Alex', points:1240, tier:'SILVER', isYou:true}, 
            {rank:5, displayName:'Rio M.', points:890, tier:'BRONZE'}
          ]);
        }
      } catch (e) {
        setLeaderboard([
          {rank:1, displayName:'Alex C.', points:3840, tier:'GOLD'}, 
          {rank:2, displayName:'Jamie L.', points:2910, tier:'GOLD'}, 
          {rank:3, displayName:'Sam K.', points:1980, tier:'SILVER'}, 
          {rank:4, displayName:'Commander Alex', points:1240, tier:'SILVER', isYou:true}, 
          {rank:5, displayName:'Rio M.', points:890, tier:'BRONZE'}
        ]);
      }
    };
    fetchLeaderboard();
  }, []);

  const getTierColor = (tier) => {
    const t = (tier || '').toUpperCase();
    if (t === 'PLATINUM') return 'text-purple-400 border-purple-400 bg-purple-400/10';
    if (t === 'GOLD') return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
    if (t === 'SILVER') return 'text-gray-300 border-gray-300 bg-gray-300/10';
    return 'text-amber-700 border-amber-700 bg-amber-700/10';
  };

  const nextTierPts = userTier === 'Platinum' ? null : userTier === 'Gold' ? 5000 : userTier === 'Silver' ? 2500 : 1000;
  const progressPercent = nextTierPts ? (userPoints / nextTierPts) * 100 : 100;

  return (
    <div className="flex flex-col h-full font-ui p-4 overflow-y-auto pb-20">
      {/* Tier Badge */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        <motion.div 
          animate={{ rotateY: 360 }} 
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`w-24 h-24 rounded-full border-[4px] flex items-center justify-center shadow-[0_0_30px_currentColor] ${getTierColor(userTier).split(' ')[0]} ${getTierColor(userTier).split(' ')[1]}`}
        >
          <Trophy size={40} />
        </motion.div>
        
        <span className={`mt-4 font-mono font-bold tracking-widest uppercase text-xl ${getTierColor(userTier).split(' ')[0]}`}>{userTier} MEMBER</span>
        <span className="text-4xl font-bold text-white mt-1">{userPoints.toLocaleString()} <span className="text-xl text-gray-500 font-mono">PTS</span></span>
      </div>

      {/* Progress Bar */}
      {nextTierPts && (
        <div className="bg-[var(--ag-bg-card)] p-4 rounded-xl border border-[var(--ag-border-subtle)] mb-6 shadow-md">
          <div className="flex justify-between text-xs font-mono text-[var(--ag-text-secondary)] mb-2 uppercase">
            <span>{userTier} Benefits Unlocked</span>
            <span>{nextTierPts - userPoints} PTS to Next Tier</span>
          </div>
          <div className="h-3 w-full bg-[#0a1524] rounded-full overflow-hidden border border-white/5">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} 
               transition={{ duration: 1 }}
               className={`h-full ${getTierColor(userTier).split(' ')[2]}`} 
               style={{ backgroundColor: 'currentColor' }}
             />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Medal size={18} className="text-[var(--ag-cyan)]"/>
          <span className="text-xs font-mono text-[var(--ag-text-secondary)] tracking-widest">TOP FANS LEADERBOARD</span>
        </div>
        <div className="flex flex-col gap-2">
          {leaderboard.map((lb, i) => (
             <div 
               key={i} 
               className={`flex justify-between items-center p-3 rounded-lg border ${lb.isYou ? 'bg-[var(--ag-cyan)]/10 border-[var(--ag-cyan)]' : 'bg-black/20 border-white/5'}`}
             >
               <div className="flex items-center gap-3">
                 <span className={`font-mono font-bold text-lg w-6 text-center ${i===0 ? 'text-yellow-400' : i===1 ? 'text-gray-300' : i===2 ? 'text-amber-700' : 'text-gray-500'}`}>
                   #{lb.rank}
                 </span>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-white">{lb.displayName} {lb.isYou && <span className="text-[10px] bg-[var(--ag-cyan)] text-black px-1 rounded ml-1">YOU</span>}</span>
                   <span className={`text-[10px] font-mono ${getTierColor(lb.tier).split(' ')[0]}`}>{lb.tier || 'MEMBER'}</span>
                 </div>
               </div>
               <span className="font-mono text-white text-sm">{lb.points.toLocaleString()} PTS</span>
             </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 flex flex-col gap-3">
        <span className="text-xs font-mono text-[var(--ag-text-secondary)] tracking-widest pt-2">RECENT TRANSACTIONS</span>
        <div className="bg-[var(--ag-bg-panel)] rounded-xl border border-[var(--ag-border-subtle)] overflow-hidden">
          {activityFeed.map((act, i) => (
             <div key={i} className={`flex justify-between items-center p-3 ${i !== activityFeed.length - 1 ? 'border-b border-white/5' : ''}`}>
               <div className="flex gap-3 items-center">
                 <div className="w-8 h-8 rounded-full bg-[var(--ag-green)]/10 flex items-center justify-center text-[var(--ag-green)]">
                   <Star size={14} />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm text-white font-medium">{act.title}</span>
                   <span className="text-[10px] text-gray-500">{act.time}</span>
                 </div>
               </div>
               <span className="font-mono text-[var(--ag-green)] font-bold text-sm bg-[var(--ag-green)]/10 px-2 py-1 rounded">+{act.pts}</span>
             </div>
          ))}
          {activityFeed.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
