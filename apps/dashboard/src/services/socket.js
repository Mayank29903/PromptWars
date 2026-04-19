import { useOpsStore } from '../store/ops';

// Mock WebSocket Integration matching spec requirements
class MockSocketService {
  constructor() {
    this.connected = false;
    this.reconnectAttempts = 0;
    this.intervals = [];
  }

  connect() {
    console.log("WS Connecting to ws://localhost:3001...");
    setTimeout(() => {
      this.connected = true;
      this.startSimulations();
    }, 1000);
  }

  startSimulations() {
    const store = useOpsStore.getState();

    // 1. Queue Update Interval (every 4800ms)
    this.intervals.push(setInterval(() => {
      const { queues, setQueues } = useOpsStore.getState();
      const updatedQueues = queues.map(q => {
        // Random walk +/- 1 min bounds checked
        const walk = Math.floor(Math.random() * 3) - 1; 
        const newWait = Math.max(0, Math.min(q.wait_max, q.current_wait + walk));
        return { ...q, current_wait: newWait };
      });
      setQueues(updatedQueues);
    }, 4800));

    // 2. Zone Target updates for Heatmap smooth lerping (every 4s)
    this.intervals.push(setInterval(() => {
      const { zones, updateZoneTarget } = useOpsStore.getState();
      zones.forEach(z => {
        if (z.is_pitch) return;
        
        let min = 0.1, max = 0.9;
        
        // Use specified density_range if available in original spec (we mocked it randomly here bounded)
        if (z.always_high) { min = 0.80; max = 0.99; }
        else if (z.id === 'N') { min = 0.55; max = 0.92; }
        else if (z.id === 'NW') { min = 0.28; max = 0.65; }
        else if (z.id === 'S') { min = 0.70; max = 0.96; }
        
        const newTarget = Math.random() * (max - min) + min;
        updateZoneTarget(z.id, newTarget);
      });
    }, 4000));

    // 3. System module latency update (every 2.4s)
    this.intervals.push(setInterval(() => {
      const { systemModuleStatuses, updateSystemLatency } = useOpsStore.getState();
      for (const [key, mod] of Object.entries(systemModuleStatuses)) {
        if (mod.range) {
          const latency = Math.floor(Math.random() * (mod.range[1] - mod.range[0] + 1)) + mod.range[0];
          updateSystemLatency(key, latency);
        }
      }
    }, 2400));
  }

  disconnect() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.connected = false;
  }
}

export const socketService = new MockSocketService();
