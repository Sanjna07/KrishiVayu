'use client';

import { useEffect, useRef } from 'react';

interface Field {
  col: number;
  row: number;
  state: 'green' | 'harvested' | 'burning' | 'detected';
  fireFlicker: number;
  detectedAt: number;
  harvestDelay: number;
  burnDelay: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const COLS = 24;
const ROWS = 14;

// Phases in frames (60fps)
const PHASE_HARVEST = 90;
const PHASE_FIRE = 240;
const PHASE_SCAN = 400;
const PHASE_LOOP = 700;

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    // Stars
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.45,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.7 + 0.3,
    }));

    // Fields
    const fields: Field[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        fields.push({
          col, row,
          state: 'green',
          fireFlicker: Math.random() * Math.PI * 2,
          detectedAt: -1,
          harvestDelay: Math.random() * 80,
          burnDelay: Math.random() * 60,
        });
      }
    }

    // ~70% will harvest, ~22% of those will burn
    const willHarvest = new Set(
      fields.filter(() => Math.random() < 0.72).map(f => f.col + f.row * COLS)
    );
    const willBurn = new Set(
      fields
        .filter(f => willHarvest.has(f.col + f.row * COLS) && Math.random() < 0.28)
        .map(f => f.col + f.row * COLS)
    );

    const particles: Particle[] = [];
    let scanX = -1;

    const reset = () => {
      t = 0;
      scanX = -1;
      particles.length = 0;
      fields.forEach(f => {
        f.state = 'green';
        f.detectedAt = -1;
        f.fireFlicker = Math.random() * Math.PI * 2;
        f.harvestDelay = Math.random() * 80;
        f.burnDelay = Math.random() * 60;
      });
    };

    const draw = () => {
      const W = canvas.width / window.devicePixelRatio;
      const H = canvas.height / window.devicePixelRatio;
      const DPR = window.devicePixelRatio;

      ctx.save();
      ctx.scale(DPR, DPR);

      const FW = W / COLS;
      const FH = H / ROWS;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#020714');
      bg.addColorStop(0.5, '#060d1a');
      bg.addColorStop(1, '#0a1525');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      });

      // Subtle star twinkle
      if (t % 4 === 0) {
        const idx = Math.floor(Math.random() * stars.length);
        stars[idx].a = Math.random() * 0.7 + 0.3;
      }

      // Update + draw fields
      fields.forEach(f => {
        const key = f.col + f.row * COLS;
        const fx = f.col * FW;
        const fy = f.row * FH;
        const fw = FW - 1;
        const fh = FH - 1;

        // Phase transitions
        if (t > PHASE_HARVEST + f.harvestDelay && willHarvest.has(key) && f.state === 'green') {
          f.state = 'harvested';
        }
        if (t > PHASE_FIRE + f.burnDelay && willBurn.has(key) && f.state === 'harvested') {
          f.state = 'burning';
        }

        // Fire flicker
        if (f.state === 'burning' || f.state === 'detected') {
          f.fireFlicker += 0.12 + Math.random() * 0.05;
        }

        // Draw field
        if (f.state === 'green') {
          const v = 0.85 + Math.sin(f.col * 0.7 + f.row * 1.1) * 0.15;
          ctx.fillStyle = `rgb(${Math.floor(20 * v)},${Math.floor(88 * v)},${Math.floor(42 * v)})`;
          ctx.fillRect(fx, fy, fw, fh);
          // Crop row lines
          ctx.strokeStyle = `rgba(15,65,30,0.6)`;
          ctx.lineWidth = 0.5;
          for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(fx, fy + fh * i / 5);
            ctx.lineTo(fx + fw, fy + fh * i / 5);
            ctx.stroke();
          }
        } else if (f.state === 'harvested') {
          const v = 0.85 + Math.sin(f.col * 1.3 + f.row * 0.9) * 0.15;
          ctx.fillStyle = `rgb(${Math.floor(148 * v)},${Math.floor(108 * v)},${Math.floor(42 * v)})`;
          ctx.fillRect(fx, fy, fw, fh);
          // Stubble dots
          ctx.fillStyle = `rgba(200,160,60,0.25)`;
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(fx + fw * i / 4, fy, 0.8, fh);
          }
        } else if (f.state === 'burning') {
          // Charred base
          ctx.fillStyle = '#130800';
          ctx.fillRect(fx, fy, fw, fh);

          // Fire core
          const flick = Math.sin(f.fireFlicker) * 0.25 + 0.75;
          const grad = ctx.createRadialGradient(
            fx + fw / 2, fy + fh * 0.7, 1,
            fx + fw / 2, fy + fh * 0.2, fh * flick * 1.1
          );
          grad.addColorStop(0, `rgba(255,220,60,${0.95 * flick})`);
          grad.addColorStop(0.25, `rgba(255,100,10,${0.85 * flick})`);
          grad.addColorStop(0.6, `rgba(200,20,5,${0.6 * flick})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(fx, fy, fw, fh);

          // Outer glow
          ctx.shadowColor = '#ff6600';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(fx + fw / 2, fy + fh / 2, fw * 0.3 * flick, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,80,0,${0.15 * flick})`;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Emit smoke particles
          if (Math.random() < 0.25) {
            particles.push({
              x: fx + fw / 2 + (Math.random() - 0.5) * fw * 0.6,
              y: fy + fh * 0.15,
              vx: (Math.random() - 0.5) * 0.4,
              vy: -(Math.random() * 1.2 + 0.5),
              life: 1,
              size: 2 + Math.random() * 3,
            });
          }
        } else if (f.state === 'detected') {
          // Charred
          ctx.fillStyle = '#130800';
          ctx.fillRect(fx, fy, fw, fh);

          // Residual glow fading
          const age = t - f.detectedAt;
          const fade = Math.max(0, 1 - age / 80);
          if (fade > 0) {
            ctx.fillStyle = `rgba(255,60,0,${fade * 0.35})`;
            ctx.fillRect(fx, fy, fw, fh);
          }

          // Pulsing detection ring
          const pulse = ((t - f.detectedAt) % 50) / 50;
          const ringR = Math.max(fw, fh) * (0.55 + pulse * 1.0);
          const ringA = Math.max(0, 0.85 - pulse);

          ctx.beginPath();
          ctx.arc(fx + fw / 2, fy + fh / 2, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,45,45,${ringA})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner dot
          ctx.beginPath();
          ctx.arc(fx + fw / 2, fy + fh / 2, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ff3333';
          ctx.shadowColor = '#ff3333';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Smoke particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.06;
        p.size *= 1.015;
        p.life -= 0.012;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(90,90,100,${p.life * 0.35})`;
        ctx.fill();
      }

      // Scan line
      if (t >= PHASE_SCAN) {
        const scanProgress = (t - PHASE_SCAN) / (PHASE_LOOP - PHASE_SCAN - 30);
        scanX = Math.min(scanProgress, 1) * (W + 80) - 60;

        if (scanX < W + 60) {
          // Beam body
          const beamGrad = ctx.createLinearGradient(scanX - 55, 0, scanX + 8, 0);
          beamGrad.addColorStop(0, 'rgba(80,200,255,0)');
          beamGrad.addColorStop(0.6, 'rgba(80,200,255,0.08)');
          beamGrad.addColorStop(0.9, 'rgba(150,230,255,0.22)');
          beamGrad.addColorStop(1, 'rgba(220,245,255,0.55)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(scanX - 55, 0, 63, H);

          // Leading edge glow
          ctx.fillStyle = 'rgba(180,240,255,0.85)';
          ctx.fillRect(scanX, 0, 1.5, H);

          // Detect burning fields under beam
          fields.forEach(f => {
            if (f.state === 'burning') {
              const fcx = (f.col + 0.5) * FW;
              if (Math.abs(fcx - scanX) < FW * 0.8) {
                f.state = 'detected';
                f.detectedAt = t;
              }
            }
          });

          // Satellite icon above beam
          const satY = H * 0.04;
          ctx.save();
          ctx.translate(scanX, satY);
          ctx.fillStyle = '#d0d8e8';
          ctx.fillRect(-6, -2, 12, 4);       // body
          ctx.fillStyle = '#4a9eff';
          ctx.fillRect(-18, -1.5, 10, 3);    // left panel
          ctx.fillRect(8, -1.5, 10, 3);      // right panel
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1, -5, 2, 4);         // antenna
          ctx.restore();

          // Downward beam from satellite
          const beamDown = ctx.createLinearGradient(0, satY, 0, H * 0.15);
          beamDown.addColorStop(0, 'rgba(100,210,255,0.5)');
          beamDown.addColorStop(1, 'rgba(100,210,255,0)');
          ctx.fillStyle = beamDown;
          ctx.fillRect(scanX - 1, satY, 2, H * 0.15);
        }
      }

      // Vignette overlay
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Top atmospheric fade (space-to-ground transition)
      const atm = ctx.createLinearGradient(0, 0, 0, H * 0.2);
      atm.addColorStop(0, 'rgba(2,7,20,0.9)');
      atm.addColorStop(1, 'rgba(2,7,20,0)');
      ctx.fillStyle = atm;
      ctx.fillRect(0, 0, W, H * 0.2);

      ctx.restore();

      t++;
      if (t >= PHASE_LOOP) reset();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
