// GLOOMGARDEN — boot and state machine. Owns the canvas, the clock and the
// transitions between title, play, level-up, pause and results; the World
// simulates, the Renderer paints, this file conducts. A fixed-timestep loop
// keeps the night deterministic: the same seed and inputs replay exactly.

import { VIEW } from './config.js';
import { SoundGarden } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { buildSprites, paintBackdrop } from './sprites.js';
import { makeRandom } from './random.js';
import { PHASE, World } from './world.js';
import { buildShotScene } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '20261116') >>> 0;

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const rng = makeRandom(seed);
const sound = new SoundGarden();
const input = new Input(canvas);
const backdrop = paintBackdrop(makeRandom(seed ^ 0x9e3779b9));
const renderer = new Renderer(ctx, buildSprites(), backdrop);
const world = new World(rng, sound);

// On the title screen the firefly waits in the corner like a mascot.
world.player.x = 168;
world.player.y = 588;

// Screenshot scenes (?shot=title|play|levelup|end) arrange a deterministic
// moment of the game, render it once, and raise a flag for the camera.
const shotName = params.get('shot');
if (shotName) {
  buildShotScene(world, shotName);
  renderer.draw(world, input);
  window.__shotReady = shotName;
} else {
  runLoop();
}

// A small handle for tests and curious players in the console.
window.GLOOMGARDEN = { world, sound, PHASE };

function runLoop() {
  let last = performance.now();
  let accumulator = 0;
  const STEP = 1000 / 60;

  const frame = (now) => {
    requestAnimationFrame(frame);
    let delta = now - last;
    last = now;
    if (delta > 250) delta = 250;
    accumulator += delta;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      tick(STEP / 1000);
    }
    renderer.draw(world, input);
    input.endFrame();
  };
  requestAnimationFrame(frame);
}

function tick(dt) {
  handleGlobalKeys();
  if (world.phase === PHASE.TITLE) {
    world.updateAmbient(dt);
    world.player.bobPhase += dt * 6;
    if (input.pressed('enter') || input.pointer.clicked) beginRun();
    return;
  }
  if (world.phase === PHASE.PLAYING) {
    if (input.pressed('p') || input.pressed('escape')) {
      world.phase = PHASE.PAUSED;
      return;
    }
    world.update(dt, input);
    return;
  }
  if (world.phase === PHASE.LEVELUP) {
    world.updateEffects(dt);
    const pick = pickCard();
    if (pick >= 0) world.chooseUpgrade(pick);
    return;
  }
  if (world.phase === PHASE.PAUSED) {
    if (input.pressed('p') || input.pressed('escape')) world.phase = PHASE.PLAYING;
    return;
  }
  if (world.phase === PHASE.OVER) {
    world.updateEffects(dt);
    if (input.pressed('r') || input.pressed('enter') || input.pointer.clicked) beginRun();
  }
}

function pickCard() {
  if (input.pressed('1')) return 0;
  if (input.pressed('2')) return 1;
  if (input.pressed('3')) return 2;
  if (input.pointer.clicked && world.choices) {
    const rects = renderer.cardRects();
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i];
      if (input.pointer.x >= r.x && input.pointer.x <= r.x + r.w
        && input.pointer.y >= r.y && input.pointer.y <= r.y + r.h) return i;
    }
  }
  return -1;
}

function beginRun() {
  sound.unlock();
  world.startRun();
}

function handleGlobalKeys() {
  if (input.pressed('m')) {
    sound.unlock();
    sound.setMuted(!sound.muted);
  }
  if (input.pointer.clicked) sound.unlock();
  if (input.presses.size > 0) sound.unlock();
}
