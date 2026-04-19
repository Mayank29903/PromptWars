// ═══════════════════════════════════════════════════════════════════════
//  @ag/shared-utils — ANTIGRAVITY Shared Utility Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Haversine distance between two GPS coordinates.
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b by factor t.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Format wait time into a human-readable string.
 * @param {number} minutes - Wait time in minutes
 * @returns {string}
 */
export function formatWaitTime(minutes) {
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${Math.round(minutes)}m wait`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m wait` : `${hours}h wait`;
}

/**
 * Convert density ratio to a hex color for heatmap rendering.
 * @param {number} density - Current density value
 * @param {number} [maxDensity=6.0] - Maximum density scale
 * @returns {string} Hex color string
 */
export function densityToColor(density, maxDensity = 6.0) {
  const ratio = clamp(density / maxDensity, 0, 1);
  if (ratio <= 0.40) return '#00e09e';  // Green — safe
  if (ratio <= 0.70) return '#f5a020';  // Amber — watch
  if (ratio <= 0.85) return '#ff6b35';  // Orange — warning
  return '#ff3d54';                      // Red   — critical
}

/**
 * Convert raw density to alert level string.
 * @param {number} density - Density in persons/sqm
 * @returns {'NORMAL'|'CAUTION'|'WARNING'|'CRITICAL'}
 */
export function densityToAlertLevel(density) {
  if (density < 3.5) return 'NORMAL';
  if (density < 4.5) return 'CAUTION';
  if (density < 5.5) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Generate a human-readable token ID: AG-XXXX
 * @returns {string}
 */
export function generateTokenId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AG-${code}`;
}

/**
 * Async sleep helper.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce a function call.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * Group array items by a key function.
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Function that returns group key for each item
 * @returns {Object} Object with keys → arrays of items
 */
export function groupBy(array, keyFn) {
  const result = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}
