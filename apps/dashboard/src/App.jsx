import React, { useState, useEffect, useRef } from 'react';
import CommandCenter from './pages/CommandCenter';
import MobileContainer from './pages/mobile/MobileContainer';
import Home from './pages/mobile/Home';
import MapBase from './pages/mobile/MapBase';
import Queue from './pages/mobile/Queue';
import Rewards from './pages/mobile/Rewards';
import Safety from './pages/mobile/Safety';
import { socketService } from './services/socket';
import { useOpsStore } from './store/ops';

export default function App() {
  // Parse URL params for judge-friendly auto-start
  const params = new URLSearchParams(window.location.search);
  const autoDemo   = params.get('demo')   === 'true';
  const autoMobile = params.get('mobile') === 'true';

  // Primary view: 'dashboard' or 'mobile'
  const [view, setView] = useState(() => {
    if (autoMobile) return 'mobile';
    if (window.location.pathname.startsWith('/mobile')) return 'mobile';
    return 'dashboard';
  });

  // Internal route within the mobile container
  const [mobileRoute, setMobileRoute] = useState('home');

  // Ref filled by CommandCenter so App can trigger startDemo externally
  const demoRef = useRef(null);

  // Sync token state ticks based on intervals (for queue updates)
  useEffect(() => {
    const interval = setInterval(() => {
      useOpsStore.getState().updateTokens();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-demo: 3 second delay then fire
  useEffect(() => {
    if (!autoDemo || view !== 'dashboard') return;
    const t = setTimeout(() => {
      demoRef.current?.start?.();
    }, 3000);
    return () => clearTimeout(t);
  }, [autoDemo, view]);

  if (view === 'dashboard') {
    return <CommandCenter setView={setView} demoRef={demoRef} />;
  }

  // Mobile view — resolve component
  let MobileComponent;
  switch (mobileRoute) {
    case 'home':    MobileComponent = Home;    break;
    case 'map':     MobileComponent = MapBase; break;
    case 'queue':   MobileComponent = Queue;   break;
    case 'rewards': MobileComponent = Rewards; break;
    case 'safety':  MobileComponent = Safety;  break;
    default:        MobileComponent = Home;
  }

  return (
    <div className="relative">
      {/* ← OPS VIEW back button — always visible over mobile */}
      <button
        onClick={() => setView('dashboard')}
        className="fixed top-3 left-3 z-50 px-3 py-1 font-mono text-xs border border-[var(--ag-cyan)] text-[var(--ag-cyan)] bg-black/80 backdrop-blur rounded-full hover:bg-[var(--ag-cyan)]/10 transition-colors tracking-widest"
      >
        ← OPS VIEW
      </button>
      <MobileContainer route={mobileRoute} setRoute={setMobileRoute}>
        <MobileComponent setRoute={setMobileRoute} />
      </MobileContainer>
    </div>
  );
}
