import React, { useEffect, useRef } from 'react';
import { useOpsStore } from '../store/ops';

const COLOR_MAP = [
  { val: 0.00, color: [2, 6, 13] },     
  { val: 0.32, color: [8, 145, 178] },  
  { val: 0.62, color: [217, 119, 6] },  
  { val: 0.82, color: [220, 38, 38] },  
  { val: 1.00, color: [127, 29, 29] }   
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
  
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    const renderLoop = () => {
      time += 0.016; 
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      zonesRef.current.forEach(z => {
        z.current += (z.target - z.current) * 0.018;
        
        let displayDensity = z.current;
        if (predictMode) {
          // P85 predicted density (mocked as 25% higher)
          displayDensity = Math.min(1.0, displayDensity * 1.25);
        }

        if (emergencyMode) {
          ctx.fillStyle = displayDensity > 0.65 ? '#dc2626' : '#00e09e';
        } else {
          ctx.fillStyle = getInterpolatedColor(displayDensity);
        }
        
        ctx.fillRect(z.x, z.y, z.w, z.h);

        if (emergencyMode) {
           ctx.fillStyle = '#ffffff';
           ctx.font = "bold 16px monospace";
           ctx.textAlign = "center";
           ctx.fillText(displayDensity > 0.65 ? '⚠ EVACUATE' : 'SAFE ROUTE ✓', z.x + z.w/2, z.y + z.h/2);
           return; 
        }

        if (predictMode && !z.is_pitch) {
          // Animated diagonal stripe pattern
          ctx.save();
          ctx.beginPath();
          ctx.rect(z.x, z.y, z.w, z.h);
          ctx.clip();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          const offset = (time * 30) % 20;
          for (let i = -100; i < Math.max(z.w, z.h) * 2; i += 20) {
            ctx.beginPath();
            ctx.moveTo(z.x + i + offset, z.y);
            ctx.lineTo(z.x + i - 200 + offset, z.y + 200);
            ctx.stroke();
          }
          ctx.restore();
          
          ctx.fillStyle = 'rgba(217, 119, 6, 0.1)';
          ctx.fillRect(z.x, z.y, z.w, z.h);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        if (selectedZoneRef.current === z.id) {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
          ctx.fillRect(z.x, z.y, z.w, z.h);
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(z.x, z.y, z.w, z.h);
        }

        if (displayDensity > 0.85 && !z.is_pitch) {
          const pulseScale = 1 + (time % 1.4) / 1.4; 
          const opacity = Math.max(0, 1 - (time % 1.4) / 1.4);
          ctx.beginPath();
          ctx.arc(z.x + z.w/2, z.y + z.h/2, 20 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (displayDensity > 0.65 && !z.is_pitch) {
          ctx.strokeStyle = '#d97706'; 
          ctx.setLineDash([1.5, 0.5]);
          ctx.lineWidth = 0.5;
          ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
          ctx.setLineDash([]); 
        }

        ctx.textAlign = "center";
        
        if (!z.is_pitch) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = "bold 12px 'Inter', sans-serif";
          ctx.fillText(z.label.toUpperCase(), z.x + z.w/2, z.y + z.h/2 - 8);
          
          ctx.font = "bold 20px 'Courier New', monospace";
          ctx.fillStyle = displayDensity > 0.82 ? '#ffb3b3' : displayDensity > 0.62 ? '#ffe0b2' : '#b2ebf2';
          ctx.fillText((displayDensity * 100).toFixed(0) + "%", z.x + z.w/2, z.y + z.h/2 + 12);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.font = "bold 18px 'Inter', sans-serif";
          ctx.fillText(z.label.toUpperCase(), z.x + z.w/2, z.y + z.h/2);
        }
      });

      // Legend
      ctx.font = "12px 'Inter', sans-serif";
      ctx.textAlign = "left";
      const legY = canvas.height - 24;
      const legX = 16;
      ctx.fillStyle = '#00e09e';
      ctx.fillRect(legX, legY, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText("Safe (<60%)", legX + 18, legY + 11);
      
      ctx.fillStyle = '#f5a020';
      ctx.fillRect(legX + 100, legY, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText("Caution (60-80%)", legX + 118, legY + 11);
      
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(legX + 235, legY, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText("Warning (80%+)", legX + 253, legY + 11);

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
      console.log(`[ZONE SELECTED] Zone: ${hit.label} | Density: ${(hit.current * 100).toFixed(1)}% | Status: Nominal`);
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
          ◈ PREDICTED P85 STATE +30MIN
        </div>
      )}
    </div>
  );
}
