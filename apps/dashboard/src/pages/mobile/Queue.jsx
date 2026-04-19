import React, { useState } from 'react';
import { useOpsStore } from '../../store/ops';
import { Clock, Ticket, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Queue() {
  const { queues, userTokens, generateToken } = useOpsStore();
  const [showModal, setShowModal] = useState(null);

  const activeToken = userTokens[0] || null;

  const handleJoin = (stall) => {
    generateToken(stall.name, stall.current_wait);
    setShowModal(null);
  };

  return (
    <div className="flex flex-col h-full font-ui">
      <div className="p-4 bg-[var(--ag-bg-panel)] border-b border-[var(--ag-border-subtle)] flex items-center gap-3">
         <Clock size={18} className="text-[var(--ag-cyan)]" />
         <span className="font-mono text-sm tracking-widest text-[var(--ag-cyan)]">SMARTQUEUE</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Active Token Display */}
        <AnimatePresence>
          {activeToken && (
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }}
               className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center shadow-lg ${activeToken.status === 'CALLED' ? 'border-[var(--ag-green)] bg-[var(--ag-green)]/10' : 'border-[var(--ag-amber)] bg-[var(--ag-amber)]/10'}`}
             >
               <Ticket size={32} className={`mb-2 ${activeToken.status === 'CALLED' ? 'text-[var(--ag-green)]' : 'text-[var(--ag-amber)]'}`} />
               <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">VIRTUAL TOKEN</span>
               <span className="text-xl font-bold mt-1 text-white">{activeToken.id}</span>
               <span className="text-sm mt-1">{activeToken.stallName}</span>
               
               <div className="mt-4 p-3 bg-black/40 rounded-xl w-full border border-white/10">
                 {activeToken.status === 'WAITING' ? (
                   <>
                     <div className="text-3xl font-mono font-bold text-[var(--ag-amber)]">{activeToken.eta}m</div>
                     <div className="text-xs text-gray-400 mt-1">ESTIMATED WAIT</div>
                   </>
                 ) : (
                   <>
                     <div className="text-3xl font-mono font-bold text-[var(--ag-green)] animate-pulse">TURN READY</div>
                     <div className="text-xs text-gray-400 mt-1">PLEASE PROCEED TO COUNTER</div>
                   </>
                 )}
               </div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* List of Stalls */}
        <div className="mt-2 flex flex-col gap-3">
          <span className="text-xs text-[var(--ag-text-secondary)] font-mono">AVAILABLE QUEUES</span>
          {queues.map(q => (
            <div key={q.id} className="bg-[var(--ag-bg-card)] p-4 rounded-xl border border-[var(--ag-border-subtle)] flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block text-white">{q.name}</span>
                <span className={`text-xs font-mono mt-1 block ${q.current_wait > 18 ? 'text-[var(--ag-red)]' : q.current_wait > 10 ? 'text-[var(--ag-amber)]' : 'text-[var(--ag-green)]'}`}>
                  {q.current_wait}m wait
                </span>
              </div>
              <button 
                onClick={() => setShowModal(q)}
                disabled={activeToken !== null}
                className="px-4 py-2 bg-[var(--ag-cyan)]/20 text-[var(--ag-cyan)] font-mono text-xs font-bold rounded-lg border border-[var(--ag-cyan)]/50 disabled:opacity-30 disabled:border-gray-500 disabled:text-gray-500 disabled:bg-transparent transition-all"
              >
                JOIN
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-[var(--ag-bg-panel)] w-full rounded-2xl p-6 border border-[var(--ag-border-normal)]">
              <h2 className="text-xl font-bold text-white mb-2">Confirm Queue</h2>
              <p className="text-sm text-gray-300 mb-6">Join virtual queue for <strong className="text-[var(--ag-cyan)]">{showModal.name}</strong>? Estimated wait is {showModal.current_wait} minutes.</p>
              
              <div className="bg-[var(--ag-green)]/10 border border-[var(--ag-green)] p-3 rounded-lg mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--ag-green)] shrink-0" />
                <span className="text-xs text-[var(--ag-green)]">+50 FanPulse Points for choosing an optimal stall!</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(null)} className="flex-1 py-3 text-sm text-white font-mono bg-white/5 rounded-lg border border-white/10">CANCEL</button>
                <button onClick={() => handleJoin(showModal)} className="flex-1 py-3 text-sm text-[var(--ag-bg-primary)] font-bold bg-[var(--ag-cyan)] rounded-lg">CONFIRM JOIN</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
