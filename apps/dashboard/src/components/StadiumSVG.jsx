import React from 'react';
import { useOpsStore } from '../store/ops';

const getInterpolatedColor = (value) => {
  if (value < 0.25) return 'rgba(0, 212, 255, 0.4)';  // cyan
  if (value < 0.50) return 'rgba(0, 224, 158, 0.6)';  // green
  if (value < 0.75) return 'rgba(245, 160, 32, 0.7)'; // amber
  return 'rgba(255, 61, 84, 0.8)';                    // red
};

export default function StadiumSVG({ onZoneClick }) {
  const { zones, emergencyMode, predictMode } = useOpsStore();
  
  const findZone = (id) => zones.find(z => z.id === id) || { current: 0, label: id };
  
  const drawZone = (zoneId, pathD, labelX, labelY) => {
    const zone = findZone(zoneId);
    const color = getInterpolatedColor(zone.current);
    const densityPct = (zone.current * 100).toFixed(0) + '%';
    const isCritical = zone.current > 0.65;
    
    return (
      <g 
        key={zoneId} 
        onClick={() => onZoneClick && onZoneClick(zone)}
        className="cursor-pointer hover:opacity-100 transition-opacity"
        style={{ opacity: 0.85 }}
      >
        <path 
           d={pathD} 
           fill={predictMode ? 'url(#pattern-predict)' : color}
           stroke={(isCritical && emergencyMode) ? '#ff3d54' : 'rgba(255,255,255,0.2)'}
           strokeWidth={(isCritical && emergencyMode) ? "4" : "1"}
        >
          {isCritical && emergencyMode && (
            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
          )}
        </path>
        <text x={labelX} y={labelY - 5} fontFamily="monospace" fontSize="11px" fill="white" textAnchor="middle" pointerEvents="none" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
          {zone.label.replace('Gate ', '').replace(' Stand', '')}
        </text>
        <text x={labelX} y={labelY + 8} fontFamily="monospace" fontSize="11px" fill="white" opacity="0.9" textAnchor="middle" pointerEvents="none" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
          {densityPct}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-full flex justify-center items-center absolute inset-0 pt-8 pb-4">
      <svg viewBox="0 0 880 520" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <defs>
          <pattern id="pattern-predict" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(245, 160, 32, 0.4)" strokeWidth="10" />
          </pattern>
        </defs>

        {/* Outer stadium footprint */}
        <ellipse cx="440" cy="260" rx="420" ry="240" fill="transparent" stroke="white" strokeOpacity="0.15" strokeWidth="2" />
        
        {/* Pitch boundary */}
        <rect x="250" y="160" width="380" height="200" rx="8" fill="#1a3a1a" stroke="#2d5a2d" strokeWidth="2" />
        
        {/* Pitch lines */}
        <circle cx="440" cy="260" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <line x1="440" y1="160" x2="440" y2="360" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

        {/* Zones */}
        {drawZone("N", "M 180,30  Q 440,0   700,30  L 700,155 Q 440,115 180,155 Z", 440, 75)}
        {drawZone("S", "M 180,490 Q 440,520 700,490 L 700,365 Q 440,405 180,365 Z", 440, 445)}
        {drawZone("E", "M 700,155 Q 850,260 700,365 L 610,320 Q 670,260 610,200 Z", 735, 260)}
        {drawZone("W", "M 180,155 Q 30,260  180,365 L 270,320 Q 210,260 270,200 Z", 145, 260)}
        
        {/* Corner Gates */}
        {drawZone("NW", "M 130,40 L 190,40 L 190,100 L 130,100 Z", 160, 70)}
        {drawZone("NE", "M 690,40 L 750,40 L 750,100 L 690,100 Z", 720, 70)}
        {drawZone("SW", "M 130,420 L 190,420 L 190,480 L 130,480 Z", 160, 450)}
        {drawZone("SE", "M 690,420 L 750,420 L 750,480 L 690,480 Z", 720, 450)}

        {/* Fan count overlay */}
        <text x="440" y="268" fontFamily="monospace" fontSize="24px" fill="white" opacity="0.6" textAnchor="middle" pointerEvents="none">
          41,293 FANS
        </text>
      </svg>
    </div>
  );
}
