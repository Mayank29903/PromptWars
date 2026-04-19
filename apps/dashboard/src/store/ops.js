import { create } from 'zustand';

// Initial data models based on Part 2 specification

const initialZones = [
  { id: "NW", label: "Gate NW", x: 0, y: 0, w: 198, h: 162, current: 0.28, target: 0.45 },
  { id: "N", label: "North Stand", x: 210, y: 0, w: 454, h: 162, current: 0.55, target: 0.65 },
  { id: "NE", label: "Gate NE", x: 678, y: 0, w: 194, h: 162, current: 0.25, target: 0.35 },
  { id: "W", label: "West Stand", x: 0, y: 174, w: 198, h: 168, current: 0.40, target: 0.50 },
  { id: "PITCH", label: "Pitch", x: 210, y: 174, w: 454, h: 168, current: 0, target: 0, is_pitch: true },
  { id: "E", label: "East Stand", x: 678, y: 174, w: 194, h: 168, current: 0.80, target: 0.95, always_high: true },
  { id: "SW", label: "Gate SW", x: 0, y: 356, w: 198, h: 156, current: 0.22, target: 0.40 },
  { id: "S", label: "South Food Court", x: 210, y: 356, w: 454, h: 156, current: 0.70, target: 0.85 },
  { id: "SE", label: "Gate SE", x: 678, y: 356, w: 194, h: 156, current: 0.48, target: 0.60 }
];

const initialQueues = [
  { id: 'gate-a', name: 'Gate A – Main Entry', wait_max: 30, initial: 22, current_wait: 22 },
  { id: 'east-stand', name: 'East Stand', wait_max: 30, initial: 20, current_wait: 20 },
  { id: 'gate-b', name: 'Gate B – North', wait_max: 30, initial: 8, current_wait: 8 },
  { id: 'food-w', name: 'Food Court West', wait_max: 30, initial: 18, current_wait: 18 },
  { id: 'rest-l1', name: 'Restrooms L1', wait_max: 30, initial: 4, current_wait: 4 },
  { id: 'merch', name: 'Merchandise Hub', wait_max: 30, initial: 11, current_wait: 11 }
];

const initialAlerts = [
  { id: 1, type: "critical", icon: "⚠", message: "East Stand density 91% — crush risk threshold hit — AI rerouting 312 fans now" },
  { id: 2, type: "warning", icon: "↗", message: "Gate A wait: 22min — SmartQueue virtual token override activated for 180 fans" },
  { id: 3, type: "info", icon: "◎", message: "CrowdFlow AI rerouted 82 fans via Corridor C — avg wait reduced by 4min" },
  { id: 4, type: "ok", icon: "✓", message: "Zone SW density normalized to 41% — CAUTION alert automatically cleared" }
];

const moduleStatus = {
  crowdFlow: { name: "CrowdFlow AI", status: "active", range: [80, 110], current: 95 },
  smartQueue: { name: "SmartQueue", status: "active", range: [8, 18], current: 12 },
  venueNav: { name: "VenueNav AR", status: "active", range: [18, 32], current: 24 },
  safetyNet: { name: "SafetyNet", status: "watch", static_label: "WATCH", color: "amber" },
  fanPulse: { name: "FanPulse", status: "active", range: [12, 22], current: 16 },
  predictEngine: { name: "PredictEngine", status: "active", static_label: "SIM✓", color: "cyan" }
};

export const useOpsStore = create((set) => ({
  zones: initialZones,
  queues: initialQueues,
  alerts: initialAlerts,
  selectedZone: null,
  predictMode: false,
  emergencyMode: false,
  timelinePosition: 0, 
  systemModuleStatuses: moduleStatus,
  connectionStatus: 'connecting',
  predictData: null,

  // FanPulse & SmartQueue State
  userPoints: 1240,
  userTier: 'Silver',
  userTokens: [],
  activityFeed: [
    { title: 'Entered Zone N', pts: 0, time: '12:00 PM' },
    { title: 'Early Arrival Bonus', pts: +250, time: '11:45 AM' }
  ],

  // Actions
  setZones: (newZones) => set({ zones: newZones }),
  updateZoneTarget: (id, target) => set((state) => ({
    zones: state.zones.map(z => z.id === id ? { ...z, target } : z)
  })),
  setQueues: (newQueues) => set({ queues: newQueues }),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 20)
  })),
  setSelectedZone: (id) => set({ selectedZone: id }),
  setPredictMode: (mode) => set({ predictMode: mode }),
  setEmergencyMode: (mode) => set({ emergencyMode: mode }),
  setTimelinePosition: (pos) => set({ timelinePosition: pos }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setPredictData: (data) => set({ predictData: data }),
  updateSystemLatency: (key, latency) => set((state) => ({
    systemModuleStatuses: {
      ...state.systemModuleStatuses,
      [key]: { ...state.systemModuleStatuses[key], current: latency }
    }
  })),

  loadPredictData: async () => {
    try {
      const res = await fetch('/api/v1/predict/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: 'evt-premier-league-finals-001', n_runs: 10, n_agents: 1000 })
      });
      if (!res.ok) return;
      const data = await res.json();
      set({ predictData: data });
    } catch (err) {
      console.error("Failed to load predict data", err);
    }
  },

  addPoints: (amount, reason) => set(state => {
    let newPoints = state.userPoints + amount;
    let newTier = newPoints >= 5000 ? 'Platinum' : newPoints >= 2500 ? 'Gold' : newPoints >= 1000 ? 'Silver' : 'Bronze';
    return {
      userPoints: newPoints,
      userTier: newTier,
      activityFeed: [{ title: reason, pts: `+${amount}`, time: 'Just now' }, ...state.activityFeed]
    };
  }),

  generateToken: (stallName, initialWait) => set(state => {
    const token = {
      id: `TKN-${Math.floor(Math.random()*10000)}`,
      stallName,
      status: 'WAITING',
      position: initialWait,
      eta: initialWait
    };
    return { userTokens: [token, ...state.userTokens] };
  }),

  updateTokens: () => set(state => ({
    userTokens: state.userTokens.map(t => {
      if (t.status === 'WAITING' && t.position > 0) {
        const newPos = t.position - 1;
        return { ...t, position: newPos, eta: newPos, status: newPos === 0 ? 'CALLED' : 'WAITING'};
      }
      return t;
    })
  }))
}));

// Simulate East Stand fluctuations
setInterval(() => {
  useOpsStore.setState(state => ({
    queues: state.queues.map(q => {
      if (q.id === 'east-stand') {
        const fluctuate = Math.floor(Math.random() * (24 - 18 + 1)) + 18; 
        return { ...q, current_wait: fluctuate };
      }
      return q;
    })
  }));
}, 4000);
