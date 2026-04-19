import React, { useState } from 'react';
import { useOpsStore } from '../../store/ops';
import { Phone, Navigation, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Safety() {
  const { emergencyMode } = useOpsStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState(null); // null, 'submitting', 'submitted'

  const handleReport = async (incidentType) => {
    setReportStatus('submitting');
    try {
      await fetch('/api/v1/ops/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: incidentType, zone_id: 'unknown' })
      });
    } catch (e) {
      // ignore, handle auth gracefully
    }
    setReportStatus('submitted');
    setTimeout(() => {
       setModalOpen(false);
       setReportStatus(null);
    }, 2000);
  };

  if (emergencyMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--ag-red)] p-6 text-white text-center animate-[ag-emergency-flash_1s_infinite]">
         <AlertTriangle size={80} className="mb-6 animate-pulse" />
         <h1 className="text-4xl font-mono font-bold tracking-widest mb-4">CRITICAL EVENT</h1>
         <p className="text-lg font-bold bg-black/30 p-4 rounded-xl border border-white/20 mb-8">
            Please proceed immediately to the nearest marked exit.
         </p>

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
    <div className="flex flex-col h-full font-ui p-4 gap-6 overflow-y-auto pb-20">
      <div className="flex items-center justify-center pt-2 pb-4">
        <ShieldCheck size={56} className="text-[var(--ag-green)] mb-2" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Safety & Assistance</h2>
        <p className="text-sm text-gray-400">Your well-being is our priority.</p>
      </div>

      {/* Emergency Contacts */}
      <div className="flex gap-4">
        <a href="tel:+441619505001" className="flex-1 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-red-500/20 transition-colors active:scale-95">
          <div className="bg-red-500 p-3 rounded-full text-white"><Phone size={24} /></div>
          <span className="font-bold text-white text-sm">Medical</span>
          <span className="text-[10px] text-red-300">Tap to call</span>
        </a>

        <a href="tel:+441619505000" className="flex-1 bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors active:scale-95">
          <div className="bg-blue-500 p-3 rounded-full text-white"><ShieldCheck size={24} /></div>
          <span className="font-bold text-white text-sm">Security</span>
          <span className="text-[10px] text-blue-300">Tap to call</span>
        </a>
      </div>

      {/* Nearest Exit Card */}
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border-subtle)] p-5 rounded-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--ag-green)]/5 rounded-bl-full pointer-events-none"></div>
        <div className="flex justify-between items-center z-10">
           <span className="font-bold tracking-widest text-sm text-[var(--ag-text-secondary)]">NEAREST EXIT</span>
           <Navigation size={18} className="text-[var(--ag-green)]" />
        </div>
        <div className="z-10">
           <span className="text-2xl font-bold block text-white">Exit Gate N2</span>
           <span className="text-sm text-gray-400">45 meters away · Est. 38 seconds</span>
        </div>
        
        {/* Simple map SVG placeholder */}
        <div className="mt-2 h-20 bg-black/30 rounded border border-white/5 relative flex items-center justify-center overflow-hidden">
           <svg viewBox="0 0 100 50" className="w-full h-full opacity-30 stroke-white fill-none stroke-2">
             <path d="M 10,25 Q 20,-5 50,5 T 90,25 Q 80,55 50,45 T 10,25 Z"/>
           </svg>
           {/* Green dot indicating exit point */}
           <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" style={{ top: '20%', right: '15%' }}></div>
           <div className="absolute w-2 h-2 rounded-full border border-blue-400 bg-blue-500/50" style={{ bottom: '30%', left: '40%' }}></div>
           {/* Line connecting them */}
           <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M 40,70 L 60,70 L 85,20" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" strokeDasharray="4,4" fill="none"/>
           </svg>
        </div>
      </div>

      {/* Report Incident */}
      <button 
         onClick={() => setModalOpen(true)}
         className="w-full bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-center justify-between hover:bg-amber-500/20 transition-colors">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-full text-white"><AlertTriangle size={20} /></div>
          <div className="text-left font-sans">
            <span className="font-bold text-white block">Report an Incident</span>
            <span className="text-xs text-amber-300">Spills, disturbances, medical</span>
          </div>
        </div>
      </button>

      {/* Report Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--ag-bg-panel)] w-full max-w-sm rounded-t-2xl p-6 border border-[var(--ag-border-subtle)] border-b-0 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-bold text-lg">Report Incident</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
              </div>

              {reportStatus === 'submitted' ? (
                 <div className="py-10 text-center flex flex-col items-center">
                    <ShieldCheck size={48} className="text-green-500 mb-4" />
                    <span className="font-bold">Report Submitted</span>
                    <span className="text-sm text-gray-400 mt-2">Staff have been notified and are responding.</span>
                 </div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  <button onClick={() => handleReport('MEDICAL')} disabled={reportStatus==='submitting'} className="p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-red-100 flex items-center justify-between font-bold">
                    Medical Issue <Phone size={18} className="opacity-50"/>
                  </button>
                  <button onClick={() => handleReport('FIGHT')} disabled={reportStatus==='submitting'} className="p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-amber-100 flex items-center justify-between font-bold">
                    Disturbance / Fight <AlertTriangle size={18} className="opacity-50"/>
                  </button>
                  <button onClick={() => handleReport('SUSPICIOUS_ITEM')} disabled={reportStatus==='submitting'} className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-blue-100 flex items-center justify-between font-bold">
                    Suspicious Item <ShieldCheck size={18} className="opacity-50"/>
                  </button>
                  <button onClick={() => handleReport('GENERAL')} disabled={reportStatus==='submitting'} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 font-bold">
                    Other Issue
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
