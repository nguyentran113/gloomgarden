// Deterministic screenshot scenes. The maker captures the game's own renders
// for screenshots/ by opening the game with ?shot=<name>&seed=<n>; each scene
// plays the real simulation forward with a scripted pilot at a fixed timestep
// and freezes on a moment that shows the game honestly: the title, a mid-night
// fight, a level-up choice, and the results screen. Nothing here draws — the
// Renderer paints these states exactly as it paints live play.

import { PHASE } from './world.js';

const STEP = 1 / 60;

// A patient pilot: fly in a slow circle, drifting toward the nearest mote.
const pilot = {
  moveVector() {
    return pilotVector;
  },
};
let pilotVector = { x: 1, y: 0 };

function simulate(world, seconds, pilotFn) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase === PHASE.LEVELUP) {
      world.chooseUpgrade(0);
    }
    if (world.phase !== PHASE.PLAYING) break;
    pilotVector = pilotFn(world, i * STEP);
    world.update(STEP, pilot);
  }
}

function circlingPilot(world, t) {
  const cx = 640 + Math.cos(t * 0.45) * 300;
  const cy = 360 + Math.sin(t * 0.45) * 190;
  const dx = cx - world.player.x;
  const dy = cy - world.player.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

function patientPilot(world) {
  // For the ending: the pilot simply stops, and the swarm closes in.
  return { x: 0, y: 0 };
}

export function buildShotScene(world, name) {
  if (name === 'title') {
    world.phase = PHASE.TITLE;
    world.player.x = 168;
    world.player.y = 588;
    world.player.bobPhase = 2.2;
    return;
  }
  world.startRun();
  if (name === 'play') {
    simulate(world, 52, circlingPilot);
    if (world.phase === PHASE.OVER) {
      // A rough seed: start over and take the earlier, calmer moment.
      world.startRun();
      simulate(world, 34, circlingPilot);
    }
    // Then keep flying until the frame is busy — darts in the air and a
    // crowd of shadows on screen — the way a photographer waits for the
    // moment rather than posing it.
    for (let i = 0; i < 60 * 30 && world.phase !== PHASE.OVER; i += 1) {
      if (world.phase === PHASE.LEVELUP) {
        world.chooseUpgrade(0);
        continue;
      }
      if (world.phase !== PHASE.PLAYING) break;
      if (world.enemies.length >= 11 && world.projectiles.length >= 2) break;
      pilotVector = circlingPilot(world, world.elapsed);
      world.update(STEP, pilot);
    }
    if (world.phase === PHASE.LEVELUP) world.chooseUpgrade(0);
    if (world.phase === PHASE.OVER) {
      world.startRun();
      simulate(world, 34, circlingPilot);
    }
    world.phase = PHASE.PLAYING;
    return;
  }
  if (name === 'levelup') {
    // Play until the garden offers a gift, then hold on the choice.
    for (let i = 0; i < 60 * 120 && world.phase === PHASE.PLAYING; i += 1) {
      pilotVector = circlingPilot(world, i * STEP);
      world.update(STEP, pilot);
    }
    return;
  }
  if (name === 'end') {
    simulate(world, 95, circlingPilot);
    // Then the pilot stops flying, and the swarm does the rest — a real
    // death, at whatever moment the dark actually wins.
    for (let i = 0; i < 60 * 90 && world.phase !== PHASE.OVER; i += 1) {
      if (world.phase === PHASE.LEVELUP) {
        world.chooseUpgrade(0);
        continue;
      }
      if (world.phase !== PHASE.PLAYING) break;
      pilotVector = patientPilot(world);
      world.update(STEP, pilot);
    }
    if (world.phase !== PHASE.OVER) {
      // In a stubborn seed the build out-fights the swarm even standing
      // still; report the night honestly as run out at the end instead.
      world.elapsed = Math.max(world.elapsed, 150);
      world.finish(false);
    }
    return;
  }
  world.phase = PHASE.TITLE;
}
