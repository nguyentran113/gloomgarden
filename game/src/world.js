// The garden's simulation: the player, the swarm, the weapons, the motes and
// all the little explosions of light. Fixed rules, seeded randomness — the
// same seed and the same inputs always grow the same night. Rendering and
// sound live elsewhere; this file only decides what is true.

import { ENEMY_KINDS, NIGHT_SECONDS, PALETTE, SPAWN, VIEW, WAVE_SCHEDULE, WEAPONS, XP } from './config.js';
import { makeBeam, makeDamageNumber, makeDart, makeMote, makeParticle, makePlayer, makeShockwave, makeThorn, spawnEnemy } from './entities.js';
import { rollChoices } from './upgrades.js';

export const PHASE = { TITLE: 'title', PLAYING: 'playing', LEVELUP: 'levelup', PAUSED: 'paused', OVER: 'over' };

export class World {
  constructor(rng, sound) {
    this.rng = rng;
    this.sound = sound;
    this.phase = PHASE.TITLE;
    this.reset();
  }

  reset() {
    this.player = makePlayer();
    this.enemies = [];
    this.projectiles = [];
    this.motes = [];
    this.particles = [];
    this.numbers = [];
    this.beams = [];
    this.waves = [];
    this.elapsed = 0;
    this.kills = 0;
    this.spawnTimer = 0.6;
    this.shake = 0;
    this.flashRed = 0;
    this.choices = null;
    this.result = null;
    this.idleTime = 0;
    this.ambient = [];
    for (let i = 0; i < 26; i += 1) {
      this.ambient.push({
        x: this.rng.range(30, VIEW.width - 30),
        y: this.rng.range(30, VIEW.height - 30),
        phase: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(4, 11),
      });
    }
  }

  startRun() {
    this.reset();
    this.phase = PHASE.PLAYING;
  }

  get dawnProgress() {
    return Math.min(1, this.elapsed / NIGHT_SECONDS);
  }

  activeKinds() {
    let kinds = WAVE_SCHEDULE[0].kinds;
    for (const wave of WAVE_SCHEDULE) {
      if (this.elapsed >= wave.at) kinds = wave.kinds;
    }
    return kinds;
  }

  update(dt, input) {
    this.updateAmbient(dt);
    if (this.phase !== PHASE.PLAYING) return;
    const player = this.player;
    this.elapsed += dt;

    if (this.elapsed >= NIGHT_SECONDS) {
      this.finish(true);
      return;
    }

    // Movement.
    const move = input.moveVector();
    player.x += move.x * player.speed * dt;
    player.y += move.y * player.speed * dt;
    player.x = clamp(player.x, player.radius, VIEW.width - player.radius);
    player.y = clamp(player.y, player.radius, VIEW.height - player.radius);
    if (move.x !== 0) player.face = Math.sign(move.x);
    player.bobPhase += dt * 6;
    player.hurtTimer = Math.max(0, player.hurtTimer - dt);

    this.director(dt);
    this.updateWeapons(dt);
    this.updateEnemies(dt, input);
    this.updateProjectiles(dt);
    this.updateMotes(dt);
    this.updateEffects(dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flashRed = Math.max(0, this.flashRed - dt * 2.4);
  }

  updateAmbient(dt) {
    for (const mote of this.ambient) {
      mote.phase += dt * 0.7;
      mote.x += Math.sin(mote.phase * 1.7) * mote.speed * dt;
      mote.y += Math.cos(mote.phase * 1.3) * mote.speed * dt * 0.6;
    }
  }

  director(dt) {
    this.spawnTimer -= dt;
    const interval = Math.max(
      SPAWN.minInterval,
      SPAWN.startInterval - this.elapsed * SPAWN.intervalDecay,
    );
    if (this.spawnTimer <= 0 && this.enemies.length < SPAWN.maxAlive) {
      this.spawnTimer = interval;
      const kinds = this.activeKinds();
      const kind = kinds[Math.floor(this.rng.next() * kinds.length)];
      const elite = this.elapsed > SPAWN.eliteChanceAfter && this.rng.chance(SPAWN.eliteChance);
      this.enemies.push(spawnEnemy(this.rng, kind, this.elapsed, elite));
    }
  }

  updateWeapons(dt) {
    const player = this.player;
    const w = player.weapons;
    const damage = (base) => base * player.damageMul;

    // Glow Darts: steady bolts at the nearest shadow.
    w.darts.timer -= dt;
    if (w.darts.timer <= 0) {
      const target = this.nearestEnemy(player.x, player.y);
      if (target) {
        w.darts.timer = WEAPONS.darts.cooldown * player.cooldownMul;
        const count = 1 + Math.floor(w.darts.level / 3);
        for (let i = 0; i < count; i += 1) {
          const spread = (i - (count - 1) / 2) * 0.14;
          const angle = Math.atan2(target.y - player.y, target.x - player.x) + spread;
          this.projectiles.push(makeDart(
            player.x, player.y, angle,
            damage(WEAPONS.darts.damage + w.darts.level * 2),
            WEAPONS.darts.pierce + (w.darts.level >= 5 ? 1 : 0),
          ));
        }
        this.sound.dart();
      } else {
        w.darts.timer = 0.12;
      }
    }

    // Thorn Nova: a radial burst on a slow clock.
    if (w.nova.level > 0) {
      w.nova.timer -= dt;
      if (w.nova.timer <= 0) {
        w.nova.timer = WEAPONS.nova.cooldown * player.cooldownMul;
        const count = WEAPONS.nova.count + w.nova.level * 2;
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2 + this.elapsed;
          this.projectiles.push(makeThorn(
            player.x, player.y, angle,
            damage(WEAPONS.nova.damage + w.nova.level * 3),
          ));
        }
        this.waves.push(makeShockwave(player.x, player.y, 60, PALETTE.teal));
        this.sound.nova();
      }
    }

    // Sunpetal Ring: orbiting petals saw through whatever they touch.
    if (w.ring.level > 0) {
      w.ring.angle += dt * WEAPONS.ring.orbitSpeed;
      const petals = WEAPONS.ring.petals + Math.floor(w.ring.level / 2);
      const orbitR = WEAPONS.ring.orbitRadius + w.ring.level * 5;
      for (let i = 0; i < petals; i += 1) {
        const angle = w.ring.angle + (i / petals) * Math.PI * 2;
        const px = player.x + Math.cos(angle) * orbitR;
        const py = player.y + Math.sin(angle) * orbitR;
        for (const enemy of this.enemies) {
          if (enemy.ringTick > 0) continue;
          if (dist2(px, py, enemy.x, enemy.y) < (enemy.radius + 17) ** 2) {
            enemy.ringTick = 0.34;
            this.hurtEnemy(enemy, damage(WEAPONS.ring.damage + w.ring.level * 2), angle);
          }
        }
      }
    }

    // Moonlance: one heavy beam into the densest knot of the swarm.
    if (w.lance.level > 0) {
      w.lance.timer -= dt;
      if (w.lance.timer <= 0) {
        const target = this.densestEnemy();
        if (target) {
          w.lance.timer = WEAPONS.lance.cooldown * player.cooldownMul;
          const angle = Math.atan2(target.y - player.y, target.x - player.x);
          const beam = makeBeam(player.x, player.y, angle, damage(WEAPONS.lance.damage + w.lance.level * 18));
          this.beams.push(beam);
          for (const enemy of this.enemies) {
            if (pointToSegment(enemy.x, enemy.y, player.x, player.y,
              player.x + Math.cos(angle) * beam.length,
              player.y + Math.sin(angle) * beam.length) < enemy.radius + WEAPONS.lance.width / 2) {
              this.hurtEnemy(enemy, beam.damage, angle);
            }
          }
          this.shake = Math.min(9, this.shake + 3.5);
          this.sound.lance();
        } else {
          w.lance.timer = 0.3;
        }
      }
    }
  }

  updateEnemies(dt) {
    const player = this.player;
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt * 9);
      enemy.ringTick = Math.max(0, (enemy.ringTick ?? 0) - dt);
      enemy.touchTimer = Math.max(0, enemy.touchTimer - dt);
      enemy.wobble += dt * 5;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = (dx / d) * enemy.speed;
      let vy = (dy / d) * enemy.speed;

      if (enemy.kind === 'moth') {
        // Umbra Moths flutter sideways as they close in.
        const sway = Math.sin(enemy.wobble * 1.6) * 46;
        vx += (-dy / d) * sway;
        vy += (dx / d) * sway;
      }
      if (enemy.kind === 'stinger') {
        // Gloom Stingers stalk, then lunge in a straight dash.
        enemy.lungeTimer -= dt;
        if (enemy.lungeTimer <= 0) {
          enemy.lungeTimer = this.rng.range(1.6, 2.8);
          enemy.lungeVx = (dx / d) * 330;
          enemy.lungeVy = (dy / d) * 330;
          enemy.lungeLeft = 0.34;
        }
        if ((enemy.lungeLeft ?? 0) > 0) {
          enemy.lungeLeft -= dt;
          vx = enemy.lungeVx;
          vy = enemy.lungeVy;
        }
      }

      enemy.x += (vx + enemy.knockX) * dt;
      enemy.y += (vy + enemy.knockY) * dt;
      enemy.knockX *= Math.pow(0.0018, dt);
      enemy.knockY *= Math.pow(0.0018, dt);

      // Contact: a shadow that reaches the firefly bites, then backs off.
      if (d < enemy.radius + player.radius && enemy.touchTimer <= 0 && player.hurtTimer <= 0) {
        enemy.touchTimer = 0.9;
        this.hurtPlayer(enemy.damage);
      }
    }
    // Gentle separation so the swarm reads as bodies, not one blob.
    for (let i = 0; i < this.enemies.length; i += 1) {
      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const rr = a.radius + b.radius;
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 > 0.01 && d2 < rr * rr) {
          const d = Math.sqrt(d2);
          const push = ((rr - d) / d) * 0.5 * 26 * dt;
          const ux = (b.x - a.x) / d;
          const uy = (b.y - a.y) / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (shot.life <= 0 || shot.x < -30 || shot.x > VIEW.width + 30 || shot.y < -30 || shot.y > VIEW.height + 30) {
        shot.dead = true;
        continue;
      }
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        if (dist2(shot.x, shot.y, enemy.x, enemy.y) < (enemy.radius + shot.radius) ** 2) {
          const angle = Math.atan2(shot.vy, shot.vx);
          this.hurtEnemy(enemy, shot.damage, angle, shot.thorn ? 60 : 130);
          if (shot.pierce > 0) {
            shot.pierce -= 1;
          } else {
            shot.dead = true;
          }
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((s) => !s.dead);
  }

  updateMotes(dt) {
    const player = this.player;
    let picked = false;
    for (const mote of this.motes) {
      mote.phase += dt * 4;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.vx *= Math.pow(0.02, dt);
      mote.vy *= Math.pow(0.02, dt);
      const d = Math.hypot(player.x - mote.x, player.y - mote.y);
      if (d < player.magnet) {
        const pull = 340 * (1 - d / player.magnet) + 90;
        mote.x += ((player.x - mote.x) / (d || 1)) * pull * dt;
        mote.y += ((player.y - mote.y) / (d || 1)) * pull * dt;
      }
      if (d < XP.collectRadius) {
        mote.collected = true;
        picked = true;
        this.gainXp(mote.value);
        this.sound.pickup();
      }
    }
    if (!picked) {
      this.idleTime += dt;
      if (this.idleTime > 0.4) this.sound.pickupIdle();
    } else {
      this.idleTime = 0;
    }
    this.motes = this.motes.filter((m) => !m.collected);
  }

  updateEffects(dt) {
    for (const beam of this.beams) beam.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const wave of this.waves) {
      wave.life -= dt;
      wave.radius += dt * 320;
    }
    this.waves = this.waves.filter((w) => w.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt + p.gravity * dt;
      p.vx *= Math.pow(0.5, p.drag * dt);
      p.vy *= Math.pow(0.5, p.drag * dt);
      if (p.life <= 0) p.dead = true;
    }
    this.particles = this.particles.filter((p) => !p.dead);
    for (const n of this.numbers) {
      n.life -= dt;
      n.y += n.vy * dt;
      if (n.life <= 0) n.dead = true;
    }
    this.numbers = this.numbers.filter((n) => !n.dead);
  }

  hurtEnemy(enemy, amount, angle, knock = 130) {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    enemy.flash = 1;
    enemy.knockX += Math.cos(angle) * knock;
    enemy.knockY += Math.sin(angle) * knock;
    this.numbers.push(makeDamageNumber(
      enemy.x + this.rng.range(-6, 6), enemy.y - enemy.radius - 4,
      String(Math.round(amount)),
      enemy.elite ? '#ffb3b3' : '#ffffff',
      amount >= 60,
    ));
    this.burst(enemy.x, enemy.y, enemy.color, 3, 90, 2.2);
    this.sound.hit();
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    this.kills += enemy.score;
    this.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'brute' ? 26 : 12, 190, 3.2);
    this.burst(enemy.x, enemy.y, '#ffffff', 4, 120, 2);
    for (let i = 0; i < enemy.motes; i += 1) {
      this.motes.push(makeMote(this.rng, enemy.x, enemy.y));
    }
    if (enemy.kind === 'brute') {
      this.shake = Math.min(10, this.shake + 4);
      this.waves.push(makeShockwave(enemy.x, enemy.y, 30, PALETTE.brute));
      // A Spore Brute bursts into mites — killing it is not the end of it.
      if (!enemy.fromSplit) {
        for (let i = 0; i < 2; i += 1) {
          const mite = spawnEnemy(this.rng, 'mite', this.elapsed, false);
          mite.x = enemy.x + this.rng.range(-16, 16);
          mite.y = enemy.y + this.rng.range(-16, 16);
          mite.fromSplit = true;
          this.enemies.push(mite);
        }
      }
    }
    this.sound.pop();
  }

  hurtPlayer(amount) {
    const player = this.player;
    player.hp -= amount;
    player.hurtTimer = 0.45;
    this.flashRed = 1;
    this.shake = Math.min(10, this.shake + 5);
    this.burst(player.x, player.y, PALETTE.blood, 10, 150, 2.6);
    this.sound.hurt();
    if (player.hp <= 0) {
      player.hp = 0;
      this.finish(false);
    }
  }

  gainXp(amount) {
    const player = this.player;
    player.xp += amount;
    if (player.xp >= player.xpNext && this.phase === PHASE.PLAYING) {
      player.xp -= player.xpNext;
      player.level += 1;
      player.xpNext = XP.firstLevelCost + player.level * XP.levelCostGrowth;
      this.choices = rollChoices(this.rng, player);
      this.phase = PHASE.LEVELUP;
      this.waves.push(makeShockwave(player.x, player.y, 24, PALETTE.gold));
      this.burst(player.x, player.y, PALETTE.gold, 22, 200, 3);
      this.sound.levelUp();
    }
  }

  chooseUpgrade(index) {
    if (this.phase !== PHASE.LEVELUP || !this.choices) return;
    const choice = this.choices[index];
    if (!choice) return;
    choice.apply(this.player);
    this.choices = null;
    this.phase = PHASE.PLAYING;
    this.sound.choose();
  }

  finish(won) {
    this.phase = PHASE.OVER;
    this.result = {
      won,
      time: this.elapsed,
      kills: this.kills,
      level: this.player.level,
    };
    if (won) this.sound.victory();
    else this.sound.defeat();
  }

  burst(x, y, color, count, speed, size) {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length > 420) return;
      this.particles.push(makeParticle(x, y, {
        angle: this.rng.angle(),
        speed: this.rng.range(speed * 0.3, speed),
        life: this.rng.range(0.25, 0.6),
        size: this.rng.range(size * 0.5, size * 1.3),
        color,
      }));
    }
  }

  nearestEnemy(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const enemy of this.enemies) {
      const d = dist2(x, y, enemy.x, enemy.y);
      if (d < bestD) { bestD = d; best = enemy; }
    }
    return best;
  }

  densestEnemy() {
    // The enemy with the most neighbours — where a beam does the most good.
    let best = null;
    let bestScore = -1;
    for (const enemy of this.enemies) {
      let score = 0;
      for (const other of this.enemies) {
        if (dist2(enemy.x, enemy.y, other.x, other.y) < 130 * 130) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = enemy; }
    }
    return best;
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function pointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { ENEMY_KINDS, NIGHT_SECONDS };
