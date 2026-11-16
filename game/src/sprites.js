// Pre-rendered art. Glow is expensive to paint with shadowBlur every frame,
// so each glow is baked once into a small offscreen canvas — a radial
// gradient disc — and stamped with drawImage. The garden backdrop (gradient
// sky, moon, layered grass, glowing flowers, dew sparkles) is baked whole
// into one 1280x720 canvas at boot and blitted each frame.

import { PALETTE, VIEW } from './config.js';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function glowSprite(color, radius = 64) {
  const canvas = makeCanvas(radius * 2, radius * 2);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.25, color + 'aa');
  gradient.addColorStop(0.6, color + '33');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return canvas;
}

export function buildSprites() {
  return {
    fireflyGlow: glowSprite(PALETTE.firefly, 90),
    moteGlow: glowSprite(PALETTE.gold, 26),
    tealGlow: glowSprite(PALETTE.teal, 60),
    hurtGlow: glowSprite(PALETTE.blood, 120),
    whiteGlow: glowSprite('#ffffff', 40),
  };
}

// The whole night garden, painted once. `rng` scatters the flowers and stars
// so the backdrop is rich but costs nothing per frame.
export function paintBackdrop(rng) {
  const { width, height } = VIEW;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.nightTop);
  sky.addColorStop(0.62, PALETTE.nightBottom);
  sky.addColorStop(1, PALETTE.soil);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Stars.
  ctx.fillStyle = '#cfe6ff';
  for (let i = 0; i < 130; i += 1) {
    const x = rng.range(0, width);
    const y = rng.range(0, height * 0.55);
    ctx.globalAlpha = rng.range(0.15, 0.8);
    const r = rng.range(0.6, 1.7);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The moon and its halo, top right — low enough to clear the HUD panel.
  const moon = ctx.createRadialGradient(1145, 188, 8, 1145, 188, 130);
  moon.addColorStop(0, 'rgba(230,240,255,0.85)');
  moon.addColorStop(0.25, 'rgba(190,210,255,0.25)');
  moon.addColorStop(1, 'rgba(190,210,255,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(995, 38, 300, 300);
  ctx.fillStyle = '#e9f1ff';
  ctx.beginPath();
  ctx.arc(1145, 188, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,180,220,0.5)';
  ctx.beginPath();
  ctx.arc(1133, 176, 7, 0, Math.PI * 2);
  ctx.arc(1159, 202, 5, 0, Math.PI * 2);
  ctx.arc(1151, 170, 4, 0, Math.PI * 2);
  ctx.fill();

  // Rolling grass silhouettes, three depths.
  const layers = [
    { base: height * 0.8, amp: 26, color: '#12294a', blades: 0 },
    { base: height * 0.88, amp: 20, color: '#0d3a34', blades: 260 },
    { base: height * 0.96, amp: 14, color: '#08251f', blades: 420 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 32) {
      ctx.lineTo(x, layer.base + Math.sin(x * 0.011 + layer.base) * layer.amp * 0.4 + rng.range(-3, 3));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < layer.blades; i += 1) {
      const x = rng.range(0, width);
      const y = rng.range(layer.base, height);
      const h = rng.range(8, 26);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + rng.range(-4, 4), y - h * 0.6, x + rng.range(-7, 7), y - h);
      ctx.stroke();
    }
  }

  // Glowing flowers and mushrooms dotted through the grass.
  const blooms = [PALETTE.teal, PALETTE.magenta, PALETTE.violet, PALETTE.gold];
  for (let i = 0; i < 90; i += 1) {
    const x = rng.range(14, width - 14);
    const y = rng.range(height * 0.6, height - 12);
    const color = blooms[i % blooms.length];
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
    glow.addColorStop(0, color + '66');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rng.range(1.6, 3.2), 0, Math.PI * 2);
    ctx.fill();
  }

  // Dew sparkles on the ground.
  ctx.fillStyle = '#bfe9ff';
  for (let i = 0; i < 70; i += 1) {
    ctx.globalAlpha = rng.range(0.08, 0.35);
    ctx.beginPath();
    ctx.arc(rng.range(0, width), rng.range(height * 0.55, height), rng.range(0.7, 1.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}
