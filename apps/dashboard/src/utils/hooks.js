import { useState, useEffect } from 'react';

// Custom hook for exact 1s ticks
export function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return {
    timeStr: time.toLocaleTimeString('en-US', { hour12: false }),
    ms: time.getTime()
  };
}

// Format specific system latencies
export function formatLatency(latency) {
  return latency ? `${latency}ms` : '--';
}
