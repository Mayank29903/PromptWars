import React, { useState, useEffect } from 'react';
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
  // Primary view: 'dashboard' or 'mobile'
  const [view, setView] = useState(
    window.location.pathname.startsWith('/mobile') ? 'mobile' : 'dashboard'
  );
  // Internal route within the mobile container
  const [mobileRoute, setMobileRoute] = useState('home');

  // Sync token state ticks based on intervals (for queue updates)
  useEffect(() => {
    const interval = setInterval(() => {
      useOpsStore.getState().updateTokens();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (view === 'dashboard') {
    return <CommandCenter setView={setView} />;
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
