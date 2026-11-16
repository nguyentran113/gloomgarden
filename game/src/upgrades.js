// The level-up pool. Each entry knows its name, its flavour line, whether it
// can still be offered (weapons cap at level 5, passives at 4), and how to
// apply itself to the player. The world rolls three distinct offers from
// whatever is still available, so every run grows a different build.

import { WEAPONS } from './config.js';

export const UPGRADES = [
  {
    id: 'darts-up',
    icon: '✦',
    name: () => `Glow Darts ${roman(nextLevel('darts'))}`,
    blurb: () => '+1 dart damage, and every third level an extra dart flies.',
    can: (p) => p.weapons.darts.level < 5,
    apply: (p) => { p.weapons.darts.level += 1; },
  },
  {
    id: 'nova',
    icon: '✸',
    name: (p) => (p.weapons.nova.level === 0 ? 'Thorn Nova' : `Thorn Nova ${roman(p.weapons.nova.level + 1)}`),
    blurb: () => 'A ring of thorns bursts outward every few seconds.',
    can: (p) => p.weapons.nova.level < 5,
    apply: (p) => { p.weapons.nova.level += 1; },
  },
  {
    id: 'ring',
    icon: '❀',
    name: (p) => (p.weapons.ring.level === 0 ? 'Sunpetal Ring' : `Sunpetal Ring ${roman(p.weapons.ring.level + 1)}`),
    blurb: () => 'Glowing petals orbit you, shredding anything they touch.',
    can: (p) => p.weapons.ring.level < 5,
    apply: (p) => { p.weapons.ring.level += 1; },
  },
  {
    id: 'lance',
    icon: '☾',
    name: (p) => (p.weapons.lance.level === 0 ? 'Moonlance' : `Moonlance ${roman(p.weapons.lance.level + 1)}`),
    blurb: () => 'A piercing moonbeam strikes the thickest part of the swarm.',
    can: (p) => p.weapons.lance.level < 5,
    apply: (p) => { p.weapons.lance.level += 1; },
  },
  {
    id: 'wings',
    icon: '➤',
    name: () => 'Swift Wings',
    blurb: () => '+12% flight speed. The dark cannot catch what it cannot reach.',
    can: (p) => (p.passives.wings ?? 0) < 4,
    apply: (p) => { p.passives.wings = (p.passives.wings ?? 0) + 1; p.speed *= 1.12; },
  },
  {
    id: 'heart',
    icon: '♥',
    name: () => 'Honey Heart',
    blurb: () => '+25 max health, and mend 25 now.',
    can: (p) => (p.passives.heart ?? 0) < 4,
    apply: (p) => {
      p.passives.heart = (p.passives.heart ?? 0) + 1;
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 25);
    },
  },
  {
    id: 'magnet',
    icon: '◎',
    name: () => 'Magnet Bloom',
    blurb: () => '+45% mote pull. Fallen light finds its way home.',
    can: (p) => (p.passives.magnet ?? 0) < 4,
    apply: (p) => { p.passives.magnet = (p.passives.magnet ?? 0) + 1; p.magnet *= 1.45; },
  },
  {
    id: 'ember',
    icon: '♨',
    name: () => 'Ember Core',
    blurb: () => '+12% damage from every weapon you carry.',
    can: (p) => (p.passives.ember ?? 0) < 4,
    apply: (p) => { p.passives.ember = (p.passives.ember ?? 0) + 1; p.damageMul *= 1.12; },
  },
  {
    id: 'dew',
    icon: '❄',
    name: () => 'Dew Clock',
    blurb: () => 'Weapons ready 10% sooner. Time runs kindly for the lit.',
    can: (p) => (p.passives.dew ?? 0) < 4,
    apply: (p) => { p.passives.dew = (p.passives.dew ?? 0) + 1; p.cooldownMul *= 0.9; },
  },
];

function nextLevel(weapon) {
  return (currentPlayer?.weapons[weapon].level ?? 1) + 1;
}

let currentPlayer = null;

export function roman(n) {
  return ['0', 'I', 'II', 'III', 'IV', 'V'][n] ?? String(n);
}

export function rollChoices(rng, player, count = 3) {
  currentPlayer = player;
  const pool = UPGRADES.filter((u) => u.can(player));
  const choices = [];
  const bag = [...pool];
  while (choices.length < count && bag.length > 0) {
    const index = Math.floor(rng.next() * bag.length);
    choices.push(bag.splice(index, 1)[0]);
  }
  // If the pool runs dry late in a run, a warm snack is never wasted.
  while (choices.length < count) {
    choices.push({
      id: 'snack',
      icon: '✿',
      name: () => 'Nectar Snack',
      blurb: () => 'Mend 40 health and glow a little brighter.',
      can: () => true,
      apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 40); },
    });
  }
  return choices;
}

export function weaponSummary(player) {
  const parts = [];
  const w = player.weapons;
  parts.push(`${WEAPONS.darts.label} ${roman(w.darts.level)}`);
  if (w.nova.level > 0) parts.push(`${WEAPONS.nova.label} ${roman(w.nova.level)}`);
  if (w.ring.level > 0) parts.push(`${WEAPONS.ring.label} ${roman(w.ring.level)}`);
  if (w.lance.level > 0) parts.push(`${WEAPONS.lance.label} ${roman(w.lance.level)}`);
  return parts.join(' · ');
}
