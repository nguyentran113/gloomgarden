// Factories for everything that moves. Entities are plain objects; the world
// updates them, the renderer draws them. Kinds come from config's
// ENEMY_KINDS; behaviour flags (flutter, lunging, splitting) hang off `kind`.

import { ENEMY_KINDS, PALETTE, PLAYER, VIEW, WEAPONS, XP } from './config.js';

export function makePlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    radius: PLAYER.radius,
    hp: PLAYER.baseHp,
    maxHp: PLAYER.baseHp,
    speed: PLAYER.baseSpeed,
    level: PLAYER.startLevel,
    xp: 0,
    xpNext: XP.firstLevelCost,
    hurtTimer: 0,
    face: 1,
    bobPhase: 0,
    weapons: {
      darts: { level: 1, timer: 0.3 },
      nova: { level: 0, timer: 0 },
      ring: { level: 0, angle: 0 },
      lance: { level: 0, timer: 0 },
    },
    damageMul: 1,
    cooldownMul: 1,
    magnet: XP.magnetBase,
    passives: {},
  };
}

export function spawnEnemy(rng, kind, elapsed, elite = false) {
  const base = ENEMY_KINDS[kind];
  // Spawn just outside a random edge, so the swarm pours in from the dark.
  const edge = rng.int(0, 3);
  const margin = 46;
  let x;
  let y;
  if (edge === 0) { x = rng.range(0, VIEW.width); y = -margin; }
  if (edge === 1) { x = rng.range(0, VIEW.width); y = VIEW.height + margin; }
  if (edge === 2) { x = -margin; y = rng.range(0, VIEW.height); }
  if (edge === 3) { x = VIEW.width + margin; y = rng.range(0, VIEW.height); }
  const hpScale = (1 + elapsed * 0.011) * (elite ? 6 : 1);
  return {
    kind,
    x,
    y,
    radius: base.radius * (elite ? 1.5 : 1),
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * rng.range(0.88, 1.12),
    damage: base.damage * (elite ? 1.6 : 1),
    score: base.score * (elite ? 6 : 1),
    motes: base.motes * (elite ? 5 : 1),
    color: elite ? PALETTE.elite : base.color,
    elite,
    flash: 0,
    knockX: 0,
    knockY: 0,
    wobble: rng.range(0, Math.PI * 2),
    lungeTimer: rng.range(1.2, 2.6),
    lungeVx: 0,
    lungeVy: 0,
    touchTimer: 0,
  };
}

export function makeDart(x, y, angle, damage, pierce) {
  return {
    x, y,
    vx: Math.cos(angle) * WEAPONS.darts.speed,
    vy: Math.sin(angle) * WEAPONS.darts.speed,
    radius: 6,
    damage,
    pierce,
    life: 1.1,
    dead: false,
  };
}

export function makeThorn(x, y, angle, damage) {
  return {
    x, y,
    vx: Math.cos(angle) * WEAPONS.nova.speed,
    vy: Math.sin(angle) * WEAPONS.nova.speed,
    radius: 5,
    damage,
    pierce: 1,
    life: 0.62,
    dead: false,
    thorn: true,
  };
}

export function makeMote(rng, x, y, value = XP.moteValue) {
  return {
    x: x + rng.range(-10, 10),
    y: y + rng.range(-10, 10),
    vx: rng.range(-40, 40),
    vy: rng.range(-40, 40),
    value,
    phase: rng.range(0, Math.PI * 2),
    collected: false,
  };
}

export function makeParticle(x, y, options = {}) {
  const angle = options.angle ?? Math.random() * Math.PI * 2;
  const speed = options.speed ?? 120;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: options.life ?? 0.5,
    maxLife: options.life ?? 0.5,
    size: options.size ?? 3,
    color: options.color ?? PALETTE.gold,
    drag: options.drag ?? 3,
    gravity: options.gravity ?? 0,
    dead: false,
  };
}

export function makeDamageNumber(x, y, text, color = '#ffffff', big = false) {
  return { x, y, text, color, life: 0.8, maxLife: 0.8, vy: -56, big, dead: false };
}

export function makeBeam(x, y, angle, damage) {
  // A Moonlance strike: a brief, fat, piercing ray from the firefly outward.
  return { x, y, angle, damage, life: 0.22, maxLife: 0.22, length: 900, dead: false };
}

export function makeShockwave(x, y, radius, color) {
  return { x, y, radius, color, life: 0.34, maxLife: 0.34, dead: false };
}
