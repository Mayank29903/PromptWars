import React, { useEffect, useRef, useState } from 'react';
import { useOpsStore } from '../store/ops';

const COLOR_MAP = [
  { val: 0.00, color: [2, 6, 13] },     // #02060d (near black)
  { val: 0.32, color: [8, 145, 178] },  // #0891b2 (teal)
  { val: 0.62, color: [217, 119, 6] },  // #d97706 (amber)
  { val: 0.82, color: [220, 38, 38] },  // #dc2626 (red)
  { val: 1.00, color: [127, 29, 29] }   // #7f1d1d (deep crimson)
];

function getInterpolatedColor(density) {
  const d = Math.max(0, Math.min(1, density));
  
  let lower = COLOR_MAP[0];
  let upper = COLOR_MAP[COLOR_MAP.length - 1];
  
  for (let i = 0; i < COLOR_MAP.length - 1; i++) {
    if (d >= COLOR_MAP[i].val && d <= COLOR_MAP[i+1].val) {
      lower = COLOR_MAP[i];
      upper = COLOR_MAP[i+1];
      break;
    }
  }
  
  const range = upper.val - lower.val;
  if (range === 0) return `rgb(${lower.color.join(',')})`;
  
  const percent = (d - lower.val) / range;
  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * percent);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * percent);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * percent);
  
  return `rgb(${r},${g},${b})`;
}

export function HeatmapCanvas() {
  const canvasRef = useRef(null);
  const { zones, predictMode, emergencyMode } = useOpsStore();
  const zonesRef = useRef(zones);
  const selectedZoneRef = useRef(null);
  
  // Keep refs updated for canvas loop without triggering React renders
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    const renderLoop = () => {
      time += 0.016; // Approx 60fps delta
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update zone internal lerps & draw
      zonesRef.current.forEach(z => {
        // Lerp towards target
        z.current += (z.target - z.current) * 0.018;
        
        let displayDensity = z.current;
        if (predictMode) {
          displayDensity = Math.min(1.0, displayDensity * 1.20);
        }

        // Emergency Mode logic
        if (emergencyMode) {
          ctx.fillStyle = displayDensity > 0.65 ? '#dc2626' : '#00e09e';
        } else {
          ctx.fillStyle = getInterpolatedColor(displayDensity);
        }
        
        // Draw main rect
        ctx.fillRect(z.x, z.y, z.w, z.h);

        // Emergency Evac markers
        if (emergencyMode) {
           ctx.fillStyle = '#ffffff';
           ctx.font = "bold 16px monospace";
           ctx.textAlign = "center";
           ctx.fillText(displayDensity > 0.65 ? '⚠ EVACUATE' : 'SAFE ROUTE ✓', z.x + z.w/2, z.y + z.h/2);
           return; // skip other overlays in emergency
        }

        // Draw Predict Mode amber tint on top
        if (predictMode) {
          ctx.fillStyle = 'rgba(217, 119, 6, 0.04)';
          ctx.fillRect(z.x, z.y, z.w, z.h);
        }

        // Grid lines (subtle border)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        // Selection style
        if (selectedZoneRef.current === z.id) {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
          ctx.fillRect(z.x, z.y, z.w, z.h);
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(z.x, z.y, z.w, z.h);
        }

        // High density effects
        if (displayDensity > 0.85 && !z.is_pitch) {
          const pulseScale = 1 + (time % 1.4) / 1.4; // 1 to 2
          const opacity = Math.max(0, 1 - (time % 1.4) / 1.4);
          
          ctx.beginPath();
          ctx.arc(z.x + z.w/2, z.y + z.h/2, 20 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (displayDensity > 0.65 && !z.is_pitch) {
          ctx.strokeStyle = '#d97706'; // Amber
          ctx.setLineDash([1.5, 0.5]);
          ctx.lineWidth = 0.5;
          ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
          ctx.setLineDash([]); // reset
        }

        // Text Labels
        ctx.fillStyle = 'rgba(176, 204, 228, 0.7)'; // text-secondary
        ctx.font = "8px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        
        // Convert to small caps rough equivalent
        ctx.fillText(z.label.toUpperCase(), z.x + z.w/2, z.y + z.h/2 - 8);

        if (!z.is_pitch) {
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.fillStyle = displayDensity > 0.82 ? '#dc2626' : displayDensity > 0.62 ? '#d97706' : '#0891b2';
          ctx.fillText((displayDensity * 100).toFixed(1) + "%", z.x + z.w/2, z.y + z.h/2 + 8);
        }
      });

      // Scanning line
      const scanY = (time % 2.8) / 2.8 * canvas.height;
      
      const grad = ctx.createLinearGradient(0, scanY - 5, 0, scanY + 5);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, 'rgba(0, 212, 255, 0.8)');
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 5, canvas.width, 10);

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationId);
  }, [predictMode, emergencyMode]);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 880 / rect.width;
    const scaleY = 520 / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const hit = zonesRef.current.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    if (hit) {
      selectedZoneRef.current = selectedZoneRef.current === hit.id ? null : hit.id;
      // In a real app this would dispatch to store
    }
  };

  return (
    <div className="relative w-full h-full rounded border border-[var(--ag-border-subtle)] bg-[#02060d] overflow-hidden">
      <canvas 
        ref={canvasRef}
        width={880}
        height={520}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-crosshair"
      />
      
      {predictMode && (
        <div className="absolute bottom-4 right-4 text-[var(--ag-amber)] font-mono text-xs opacity-80 animate-pulse">
          ◈ PREDICTED STATE +30MIN
        </div>
      )}
    </div>
  );
}
