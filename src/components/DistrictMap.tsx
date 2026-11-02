'use client';

import { useEffect, useRef, useState } from 'react';

interface District {
  key: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  fires_2025: number;
  fire_points: number;
}

interface Props {
  districts: District[];
  selected: string | null;
  onSelect: (key: string) => void;
}

const LAT_MIN = 20.5;
const LAT_MAX = 33.2;
const LON_MIN = 69.5;
const LON_MAX = 85.0;

const SEVERITY_COLORS = [
  { threshold: 500, color: '#ff2d2d', label: 'Critical' },
  { threshold: 200, color: '#ff6b00', label: 'High' },
  { threshold: 80,  color: '#ffb300', label: 'Moderate' },
  { threshold: 20,  color: '#c8e645', label: 'Low' },
  { threshold: 0,   color: '#2d6a4f', label: 'None' },
];

// Simplified state boundary polygons [lat, lon][]
const STATE_POLYGONS: Record<string, [number, number][]> = {
  PUNJAB: [
    [32.5,75.3],[32.3,76.6],[31.4,76.8],[30.9,76.9],[30.5,76.9],
    [29.5,76.3],[29.5,74.9],[29.9,73.9],[31.5,73.9],[32.5,75.3],
  ],
  HARYANA: [
    [30.5,76.9],[30.9,76.9],[31.4,76.8],[30.5,77.7],[29.9,77.6],
    [28.4,77.2],[28.0,76.8],[28.0,75.6],[28.9,74.5],[29.5,74.9],
    [29.5,76.3],[30.5,76.9],
  ],
  DELHI: [
    [28.88,76.84],[28.88,77.35],[28.40,77.35],[28.40,76.84],[28.88,76.84],
  ],
  RAJASTHAN: [
    [30.2,73.9],[29.9,73.9],[28.9,74.5],[28.0,75.6],[28.0,76.8],
    [27.5,77.5],[26.5,77.0],[25.0,77.8],[24.5,76.5],[23.5,76.0],
    [23.5,74.0],[23.5,71.0],[24.0,70.5],[27.5,70.9],[30.2,73.9],
  ],
  UTTAR_PRADESH: [
    [30.4,77.7],[31.5,78.0],[31.0,80.5],[29.5,81.0],[28.5,84.0],
    [25.0,84.0],[24.0,83.0],[24.5,81.0],[25.0,80.0],[24.5,78.5],
    [25.0,77.8],[26.5,77.0],[27.5,77.5],[28.0,76.8],[28.4,77.2],
    [28.88,77.35],[29.9,77.6],[30.5,77.7],[30.4,77.7],
  ],
  MADHYA_PRADESH: [
    [25.0,74.0],[25.0,77.8],[24.5,78.5],[25.0,80.0],[24.5,81.0],
    [24.0,83.0],[22.0,82.5],[21.0,80.5],[21.5,78.5],[22.0,76.5],
    [22.0,75.0],[23.0,74.5],[23.5,74.0],[25.0,74.0],
  ],
};

const STATE_LABEL_POS: Record<string, [number, number]> = {
  PUNJAB:         [31.0, 74.9],
  HARYANA:        [29.4, 76.2],
  DELHI:          [28.65,77.09],
  RAJASTHAN:      [26.5, 73.0],
  UTTAR_PRADESH:  [26.8, 81.0],
  MADHYA_PRADESH: [23.2, 78.5],
};

function getColor(fires: number) {
  for (const s of SEVERITY_COLORS) {
    if (fires >= s.threshold) return s;
  }
  return SEVERITY_COLORS[SEVERITY_COLORS.length - 1];
}

function project(lat: number, lon: number, W: number, H: number, pad = 40) {
  const x = pad + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - pad * 2);
  const y = pad + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - pad * 2);
  return { x, y };
}

export function DistrictMap({ districts, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: District } | null>(null);
  const districtPositions = useRef<{ key: string; cx: number; cy: number; r: number }[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;

    const render = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (W === 0 || H === 0) { raf = requestAnimationFrame(render); return; }

      canvas.width = W * window.devicePixelRatio;
      canvas.height = H * window.devicePixelRatio;
      const dpr = window.devicePixelRatio;
      ctx.scale(dpr, dpr);

      const frame = frameRef.current++;

      // ── Background ────────────────────────────────────────────
      ctx.fillStyle = '#050d1a';
      ctx.fillRect(0, 0, W, H);

      // Dot grid
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let gx = 18; gx < W; gx += 26) {
        for (let gy = 18; gy < H; gy += 26) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── State boundary polygons ───────────────────────────────
      Object.entries(STATE_POLYGONS).forEach(([, poly]) => {
        if (poly.length < 2) return;
        ctx.beginPath();
        poly.forEach(([lat, lon], i) => {
          const { x, y } = project(lat, lon, W, H);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // ── State labels ──────────────────────────────────────────
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      Object.entries(STATE_LABEL_POS).forEach(([state, [lat, lon]]) => {
        const { x, y } = project(lat, lon, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillText(state.replace('_', ' '), x, y);
      });

      // ── Districts ─────────────────────────────────────────────
      districtPositions.current = [];
      const maxFires = Math.max(...districts.map(d => d.fires_2025), 1);

      // Pass 1: glows for high-fire districts
      districts.forEach(d => {
        if (d.fires_2025 < 80) return;
        const { x, y } = project(d.lat, d.lon, W, H);
        const col = getColor(d.fires_2025);
        const pulse = Math.sin(frame * 0.055 + d.lat) * 0.3 + 0.7;
        const r = 4 + (d.fires_2025 / maxFires) * 12;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8 * pulse);
        g.addColorStop(0, col.color + '33');
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, r * 2.8 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      // Pass 2: dots
      districts.forEach(d => {
        const { x, y } = project(d.lat, d.lon, W, H);
        const col = getColor(d.fires_2025);
        const r = Math.max(3, 3 + (d.fires_2025 / maxFires) * 10);
        const isSel = d.key === selected;
        const isHov = d.key === hovered;

        districtPositions.current.push({ key: d.key, cx: x, cy: y, r: r + 5 });

        if (isSel || isHov) {
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = col.color + '99';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = col.color;
        ctx.shadowColor = d.fires_2025 > 200 ? col.color : 'transparent';
        ctx.shadowBlur = d.fires_2025 > 200 ? 6 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Highlight glint
        ctx.beginPath();
        ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fill();
      });

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    const ro = new ResizeObserver(() => { /* next frame will re-render */ });
    ro.observe(canvas);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [districts, selected, hovered]);

  const hit = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const pos of districtPositions.current) {
      const dx = mx - pos.cx, dy = my - pos.cy;
      if (Math.sqrt(dx * dx + dy * dy) < pos.r) return pos.key;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const key = hit(e);
    setHovered(key);
    if (key) {
      const d = districts.find(x => x.key === key);
      if (d) {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, d });
      }
    } else setTooltip(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const key = hit(e);
    if (key) onSelect(key);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHovered(null); setTooltip(null); }}
        onClick={handleClick}
      />

      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-[#0d1f35]/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 44 }}
        >
          <div className="font-semibold text-white">{tooltip.d.name}</div>
          <div className="text-gray-400">{tooltip.d.state.replace('_', ' ')}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ background: getColor(tooltip.d.fires_2025).color }} />
            <span className="text-white font-mono font-bold">{tooltip.d.fires_2025.toLocaleString()}</span>
            <span className="text-gray-500">fires 2025</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-[#050d1a]/85 border border-white/8 rounded-lg px-3 py-2.5">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Fire Count 2025</div>
        {SEVERITY_COLORS.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[11px]">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}88` }} />
            <span className="text-gray-400">{s.label}</span>
            <span className="text-gray-600 font-mono text-[10px]">{s.threshold > 0 ? `≥${s.threshold}` : '<20'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
