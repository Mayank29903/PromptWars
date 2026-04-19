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
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  // Internal mock route state for the mobile container bounding box
  const [mobileRoute, setMobileRoute] = useState('home');

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Sync token state ticks based on intervals (for queue updates)
  useEffect(() => {
    const interval = setInterval(() => {
      useOpsStore.getState().updateTokens();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine correct module to load based on path
  if (currentPath === '/dashboard' || currentPath === '/') {
    return <CommandCenter />;
  }

  // Mobile App Paths Routing Execution
  let MobileComponent;
  switch (mobileRoute) {
    case 'home': MobileComponent = Home; break;
    case 'map': MobileComponent = MapBase; break;
    case 'queue': MobileComponent = Queue; break;
    case 'rewards': MobileComponent = Rewards; break;
    case 'safety': MobileComponent = Safety; break;
    default: MobileComponent = Home;
  }

  return (
    <MobileContainer route={mobileRoute} setRoute={setMobileRoute}>
       <MobileComponent setRoute={setMobileRoute} />
    </MobileContainer>
  );
}
