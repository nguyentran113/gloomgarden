// All painting. The world simulation decides what is true; this file decides
// how it looks: a baked night-garden backdrop, glow sprites stamped additively,
// plump shadow-creatures with eyes, a firefly with a heartbeat of light, and
// screens for title, level-up, pause and results that a screenshot can read
// at a glance.

import { ENEMY_KINDS, NIGHT_SECONDS, PALETTE, VIEW, WEAPONS, XP } from './config.js';
import { PHASE, formatTime } from './world.js';
import { weaponSummary } from './upgrades.js';

const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

export class Renderer {
  constructor(ctx, sprites, backdrop) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.backdrop = backdrop;
    this.time = 0;
  }

  draw(world, input) {
    const ctx = this.ctx;
    this.time = world.elapsed + world.idleTime + performance.now() / 1000;
    ctx.save();
    if (world.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    ctx.drawImage(this.backdrop, 0, 0);
    this.drawAmbient(world);
    this.drawMotes(world);
    this.drawEnemies(world);
    this.drawBeams(world);
    this.drawProjectiles(world);
    this.drawPlayer(world);
    this.drawParticles(world);
    this.drawWaves(world);
    this.drawNumbers(world);
    ctx.restore();

    if (world.flashRed > 0) {
      const gradient = ctx.createRadialGradient(640, 360, 240, 640, 360, 720);
      gradient.addColorStop(0, 'rgba(255,40,70,0)');
      gradient.addColorStop(1, `rgba(255,40,70,${0.34 * world.flashRed})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    if (world.phase !== PHASE.TITLE) this.drawHud(world);
    if (world.phase === PHASE.TITLE) this.drawTitle(world);
    if (world.phase === PHASE.LEVELUP) this.drawLevelUp(world, input);
    if (world.phase === PHASE.PAUSED) this.drawPaused(world);
    if (world.phase === PHASE.OVER) this.drawResults(world);
  }

  drawAmbient(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of world.ambient) {
      const tw = 0.5 + 0.5 * Math.sin(mote.phase * 3);
      ctx.globalAlpha = 0.25 + tw * 0.5;
      const s = this.sprites.moteGlow;
      ctx.drawImage(s, mote.x - 13, mote.y - 13, 26, 26);
    }
    ctx.restore();
  }

  drawMotes(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of world.motes) {
      const pulse = 1 + Math.sin(mote.phase) * 0.25;
      const size = 26 * pulse;
      ctx.drawImage(this.sprites.moteGlow, mote.x - size / 2, mote.y - size / 2, size, size);
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEnemies(world) {
    for (const enemy of world.enemies) this.drawEnemy(enemy);
  }

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const { x, y, radius } = enemy;
    const wob = Math.sin(enemy.wobble) * radius * 0.08;
    ctx.save();
    ctx.translate(x, y);
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.82, radius * 0.95, radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: a plump shadow blob in the kind's colour, darker at the rim.
    const body = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.2, 0, 0, radius * 1.15);
    body.addColorStop(0, enemy.flash > 0 ? '#ffffff' : lighten(enemy.color));
    body.addColorStop(0.55, enemy.color);
    body.addColorStop(1, '#0a0d24');
    ctx.fillStyle = body;
    ctx.beginPath();
    if (enemy.kind === 'moth') {
      // Wings behind a small body.
      const flap = Math.sin(enemy.wobble * 2.4) * 0.5;
      ctx.save();
      ctx.rotate(-0.5 - flap * 0.4);
      ctx.ellipse(-radius * 0.95, -radius * 0.2, radius * 0.85, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(0.5 + flap * 0.4);
      ctx.ellipse(radius * 0.95, -radius * 0.2, radius * 0.85, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, wob * 0.4, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'brute') {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      // Spore pods on its back.
      ctx.fillStyle = PALETTE.magenta;
      for (const [px, py, pr] of [[-14, -16, 7], [12, -20, 6], [2, -6, 5], [-20, 4, 5]]) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (enemy.kind === 'stinger') {
      ctx.rotate(Math.atan2(Math.sin(enemy.wobble * 0.2), 1) * 0.2);
      ctx.beginPath();
      ctx.moveTo(radius * 1.25, 0);
      ctx.quadraticCurveTo(0, -radius * 0.95, -radius * 1.05, -radius * 0.5);
      ctx.quadraticCurveTo(-radius * 0.6, 0, -radius * 1.05, radius * 0.5);
      ctx.quadraticCurveTo(0, radius * 0.95, radius * 1.25, 0);
      ctx.fill();
    } else {
      ctx.arc(0, wob * 0.4, radius, 0, Math.PI * 2);
      ctx.fill();
      // Mite spikes.
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + enemy.wobble * 0.15;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.85);
        ctx.lineTo(Math.cos(a) * radius * 1.18, Math.sin(a) * radius * 1.18);
        ctx.stroke();
      }
    }
    // Eyes: two angry embers.
    ctx.fillStyle = enemy.elite ? '#ffffff' : '#ffd9d9';
    const eyeY = -radius * 0.18;
    const eyeGap = radius * 0.36;
    ctx.beginPath();
    ctx.arc(-eyeGap, eyeY, radius * 0.13, 0, Math.PI * 2);
    ctx.arc(eyeGap, eyeY, radius * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0505';
    ctx.beginPath();
    ctx.arc(-eyeGap, eyeY, radius * 0.06, 0, Math.PI * 2);
    ctx.arc(eyeGap, eyeY, radius * 0.06, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.elite) {
      ctx.strokeStyle = PALETTE.elite;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 6 + Math.sin(enemy.wobble * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Health sliver for anything tougher than a mite.
    if (enemy.hp < enemy.maxHp && enemy.maxHp > 30) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - radius, y - radius - 13, radius * 2, 5);
      ctx.fillStyle = enemy.elite ? PALETTE.elite : PALETTE.teal;
      ctx.fillRect(x - radius, y - radius - 13, radius * 2 * Math.max(0, enemy.hp / enemy.maxHp), 5);
    }
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const player = world.player;
    const pulse = 1 + Math.sin(player.bobPhase) * 0.06;
    ctx.save();
    ctx.translate(player.x, player.y + Math.sin(player.bobPhase) * 3);
    // The firefly's halo.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowSize = 180 * pulse;
    ctx.globalAlpha = player.hurtTimer > 0 ? 0.65 : 0.9;
    ctx.drawImage(this.sprites.fireflyGlow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
    ctx.restore();
    // Sunpetal ring petals, orbiting.
    const ring = player.weapons.ring;
    if (ring.level > 0) {
      const petals = WEAPONS.ring.petals + Math.floor(ring.level / 2);
      const orbitR = WEAPONS.ring.orbitRadius + ring.level * 5;
      for (let i = 0; i < petals; i += 1) {
        const a = ring.angle + (i / petals) * Math.PI * 2;
        const px = Math.cos(a) * orbitR;
        const py = Math.sin(a) * orbitR;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.ellipse(0, -3, 3.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // Wings: two translucent ellipses that blur with speed.
    ctx.fillStyle = 'rgba(210,240,255,0.55)';
    const flap = Math.sin(player.bobPhase * 3.2) * 0.35;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 10, -8);
      ctx.rotate(side * (0.7 + flap));
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body.
    const body = ctx.createRadialGradient(-4, -5, 2, 0, 0, player.radius + 3);
    body.addColorStop(0, '#fff8dc');
    body.addColorStop(0.5, PALETTE.firefly);
    body.addColorStop(1, '#e89b3c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    // Face: two calm eyes and a smile — the garden's last light has a face.
    ctx.fillStyle = '#4a2f05';
    ctx.beginPath();
    ctx.arc(-5.5 * player.face, -2, 2.1, 0, Math.PI * 2);
    ctx.arc(5.5 * player.face, -2, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2f05';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 2.5, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  drawProjectiles(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const shot of world.projectiles) {
      if (shot.thorn) {
        ctx.save();
        ctx.translate(shot.x, shot.y);
        ctx.rotate(Math.atan2(shot.vy, shot.vx));
        ctx.fillStyle = PALETTE.teal;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        const s = 30;
        ctx.drawImage(this.sprites.moteGlow, shot.x - s / 2, shot.y - s / 2, s, s);
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawBeams(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const beam of world.beams) {
      const alpha = beam.life / beam.maxLife;
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate(beam.angle);
      const grad = ctx.createLinearGradient(0, 0, beam.length, 0);
      grad.addColorStop(0, `rgba(230,240,255,${0.95 * alpha})`);
      grad.addColorStop(1, `rgba(154,123,255,${0.15 * alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, -WEAPONS.lance.width / 2 * alpha - 3, beam.length, WEAPONS.lance.width * alpha + 6);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
      ctx.fillRect(0, -2.5, beam.length, 5);
      ctx.restore();
    }
    ctx.restore();
  }

  drawParticles(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawWaves(world) {
    const ctx = this.ctx;
    for (const wave of world.waves) {
      const alpha = wave.life / wave.maxLife;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 3 + alpha * 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawNumbers(world) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    for (const n of world.numbers) {
      ctx.globalAlpha = Math.min(1, (n.life / n.maxLife) * 1.6);
      ctx.font = `bold ${n.big ? 25 : 16}px ${FONT}`;
      ctx.fillStyle = n.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(world) {
    const ctx = this.ctx;
    const player = world.player;
    ctx.save();
    // Top-left: health and level.
    panel(ctx, 16, 14, 300, 64, 0.55);
    ctx.fillStyle = '#2a0f16';
    roundRect(ctx, 28, 26, 200, 16, 8);
    ctx.fill();
    const hpFrac = Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = hpFrac > 0.35 ? PALETTE.teal : PALETTE.blood;
    roundRect(ctx, 28, 26, 200 * hpFrac, 16, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`♥ ${Math.ceil(player.hp)} / ${player.maxHp}`, 28, 58);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Lv ${player.level}`, 304, 47);

    // Top-center: the night clock — survive to dawn.
    panel(ctx, 490, 14, 300, 64, 0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `bold 21px ${FONT}`;
    const left = Math.max(0, NIGHT_SECONDS - world.elapsed);
    ctx.fillText(`☾ ${formatTime(left)} to dawn`, 640, 42);
    ctx.fillStyle = '#26355e';
    roundRect(ctx, 506, 52, 268, 9, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.violet;
    roundRect(ctx, 506, 52, 268 * world.dawnProgress, 9, 5);
    ctx.fill();

    // Top-right: shadows banished.
    panel(ctx, 964, 14, 300, 64, 0.55);
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `bold 21px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`✦ ${world.kills} banished`, 1114, 42);
    ctx.fillStyle = '#9fb6dd';
    ctx.font = `12.5px ${FONT}`;
    ctx.fillText(weaponSummary(player), 1114, 62);

    // Bottom: experience bar across the whole width.
    ctx.fillStyle = 'rgba(4,6,18,0.65)';
    ctx.fillRect(0, VIEW.height - 14, VIEW.width, 14);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, VIEW.height - 14, VIEW.width * Math.min(1, player.xp / player.xpNext), 14);
    ctx.restore();
  }

  drawTitle(world) {
    const ctx = this.ctx;
    // A soft dusk over the garden, then the name of the game.
    const veil = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    veil.addColorStop(0, 'rgba(5,7,20,0.25)');
    veil.addColorStop(0.55, 'rgba(5,7,20,0.45)');
    veil.addColorStop(1, 'rgba(5,7,20,0.72)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.drawPlayer(world);

    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = PALETTE.firefly;
    ctx.shadowBlur = 42;
    ctx.fillStyle = PALETTE.fireflyCore;
    ctx.font = `900 96px ${FONT}`;
    ctx.fillText('GLOOMGARDEN', 640, 218);
    ctx.restore();
    ctx.fillStyle = PALETTE.teal;
    ctx.font = `600 25px ${FONT}`;
    ctx.fillText('The garden went dark. You are its last firefly.', 640, 262);

    panel(ctx, 340, 300, 600, 208, 0.62);
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `19px ${FONT}`;
    const lines = [
      'Survive the night until dawn — 3 minutes of swarm.',
      'Your light fires on its own. You just fly.',
      '',
      'Move  ·  WASD / Arrow keys / drag',
      'Pause  ·  P or Esc        Mute  ·  M',
      'Grow  ·  gather gold motes, choose a gift each level',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 640, 344 + i * 27));

    const pulse = 0.72 + 0.28 * Math.sin(this.time * 3.4);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText('▶  CLICK OR PRESS ENTER TO BEGIN  ◀', 640, 586);
    ctx.restore();
    ctx.fillStyle = '#8fa5cc';
    ctx.font = `15px ${FONT}`;
    ctx.fillText('Banish shadows · gather light · outlast the dark', 640, 640);
  }

  cardRects() {
    const rects = [];
    for (let i = 0; i < 3; i += 1) {
      rects.push({ x: 190 + i * 310, y: 268, w: 280, h: 240 });
    }
    return rects;
  }

  drawLevelUp(world, input) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4,6,18,0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 26;
    ctx.fillStyle = PALETTE.fireflyCore;
    ctx.font = `900 46px ${FONT}`;
    ctx.fillText('✦ THE GARDEN OFFERS A GIFT ✦', 640, 208);
    ctx.restore();
    ctx.fillStyle = '#bcd2f5';
    ctx.font = `18px ${FONT}`;
    ctx.fillText(`Level ${world.player.level} — choose one (click, or press 1 · 2 · 3)`, 640, 240);

    const rects = this.cardRects();
    world.choices?.forEach((choice, i) => {
      const rect = rects[i];
      const hover = input && input.pointer.x >= rect.x && input.pointer.x <= rect.x + rect.w
        && input.pointer.y >= rect.y && input.pointer.y <= rect.y + rect.h;
      ctx.fillStyle = hover ? 'rgba(38,52,96,0.95)' : 'rgba(16,24,52,0.95)';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.fill();
      ctx.strokeStyle = hover ? PALETTE.gold : '#3a4f86';
      ctx.lineWidth = hover ? 3.5 : 2;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `44px ${FONT}`;
      ctx.fillText(choice.icon, rect.x + rect.w / 2, rect.y + 66);
      ctx.fillStyle = PALETTE.bone;
      ctx.font = `bold 21px ${FONT}`;
      wrapText(ctx, choice.name(world.player), rect.x + rect.w / 2, rect.y + 108, rect.w - 32, 24);
      ctx.fillStyle = '#a9bde0';
      ctx.font = `15.5px ${FONT}`;
      wrapText(ctx, choice.blurb(), rect.x + rect.w / 2, rect.y + 148, rect.w - 36, 20);
      ctx.fillStyle = PALETTE.teal;
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`[ ${i + 1} ]`, rect.x + rect.w / 2, rect.y + rect.h - 18);
    });
  }

  drawPaused(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4,6,18,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `900 54px ${FONT}`;
    ctx.fillText('PAUSED', 640, 330);
    ctx.fillStyle = '#a9bde0';
    ctx.font = `20px ${FONT}`;
    ctx.fillText('The garden holds its breath. Press P or Esc to fly on.', 640, 380);
  }

  drawResults(world) {
    const ctx = this.ctx;
    const result = world.result;
    ctx.fillStyle = 'rgba(4,6,18,0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    if (result.won) {
      const dawn = ctx.createLinearGradient(0, 120, 0, 620);
      dawn.addColorStop(0, 'rgba(255,190,90,0.25)');
      dawn.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = dawn;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    ctx.save();
    ctx.shadowColor = result.won ? PALETTE.gold : PALETTE.blood;
    ctx.shadowBlur = 34;
    ctx.fillStyle = result.won ? PALETTE.fireflyCore : '#ffb9c4';
    ctx.font = `900 72px ${FONT}`;
    ctx.fillText(result.won ? '☀ DAWN BREAKS' : 'THE LIGHT GOES OUT', 640, 216);
    ctx.restore();
    ctx.fillStyle = PALETTE.teal;
    ctx.font = `600 23px ${FONT}`;
    ctx.fillText(
      result.won ? 'The garden glows again — every flower remembers your light.'
        : 'The swarm takes the garden… this time.',
      640, 260,
    );

    panel(ctx, 415, 292, 450, 158, 0.66);
    ctx.fillStyle = PALETTE.bone;
    ctx.font = `22px ${FONT}`;
    const rows = [
      ['Shadows banished', String(result.kills)],
      ['Night survived', `${formatTime(result.time)} / ${formatTime(NIGHT_SECONDS)}`],
      ['Level reached', String(result.level)],
    ];
    rows.forEach(([label, value], i) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9fb6dd';
      ctx.fillText(label, 445, 336 + i * 42);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.bone;
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(value, 835, 336 + i * 42);
      ctx.font = `22px ${FONT}`;
    });
    // The build gets its own centered line under the panel — weapon names
    // are long, and a right-aligned cell would swallow the label.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fb6dd';
    ctx.font = `17px ${FONT}`;
    ctx.fillText(`Build · ${weaponSummary(world.player)}`, 640, 492);

    const pulse = 0.72 + 0.28 * Math.sin(this.time * 3.4);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 27px ${FONT}`;
    ctx.fillText('▶  PRESS R OR CLICK TO PLAY AGAIN  ◀', 640, 580);
    ctx.restore();
  }
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8,12,30,${alpha})`;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,120,190,0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
  return lines.length;
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 40);
  const g = Math.min(255, ((n >> 8) & 0xff) + 40);
  const b = Math.min(255, (n & 0xff) + 40);
  return `rgb(${r},${g},${b})`;
}
