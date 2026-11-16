// GLOOMGARDEN tuning: every balance number and every colour lives here, so the
// rest of the code reads as rules rather than magic numbers. The palette is a
// bioluminescent night garden — deep indigo dark, teal grass-glow, gold light,
// magenta spores — and every other module paints from these same swatches.

export const VIEW = { width: 1280, height: 720 };

export const NIGHT_SECONDS = 180; // survive from dusk to dawn to win

export const PLAYER = {
  radius: 15,
  baseSpeed: 248,
  baseHp: 100,
  hurtCooldown: 0.45, // seconds of mercy between contact hits
  startLevel: 1,
};

export const PALETTE = {
  nightTop: '#0b1030',
  nightBottom: '#131a3d',
  grassGlow: '#1d5c4d',
  soil: '#0e2a33',
  firefly: '#ffd76a',
  fireflyCore: '#fff3c4',
  teal: '#3ef2c8',
  gold: '#ffc94d',
  magenta: '#ff5fa2',
  violet: '#9a7bff',
  blood: '#ff5470',
  bone: '#e8f4ff',
  shadow: '#05070f',
  mite: '#5d6bff',
  moth: '#b48cff',
  brute: '#ff7a59',
  stinger: '#ff5fa2',
  elite: '#ff3b3b',
};

export const ENEMY_KINDS = {
  mite: {
    label: 'Husk Mite',
    radius: 14,
    hp: 18,
    speed: 74,
    damage: 9,
    score: 1,
    motes: 1,
    color: PALETTE.mite,
  },
  moth: {
    label: 'Umbra Moth',
    radius: 13,
    hp: 12,
    speed: 118,
    damage: 7,
    score: 2,
    motes: 1,
    color: PALETTE.moth,
  },
  stinger: {
    label: 'Gloom Stinger',
    radius: 12,
    hp: 22,
    speed: 92,
    damage: 13,
    score: 3,
    motes: 2,
    color: PALETTE.stinger,
  },
  brute: {
    label: 'Spore Brute',
    radius: 30,
    hp: 130,
    speed: 44,
    damage: 20,
    score: 8,
    motes: 5,
    color: PALETTE.brute,
  },
};

// The spawn director's clock: which horrors join the swarm, and when.
export const WAVE_SCHEDULE = [
  { at: 0, kinds: ['mite'] },
  { at: 28, kinds: ['mite', 'moth'] },
  { at: 58, kinds: ['mite', 'moth', 'stinger'] },
  { at: 88, kinds: ['mite', 'moth', 'stinger', 'brute'] },
  { at: 128, kinds: ['mite', 'moth', 'stinger', 'brute', 'brute'] },
];

export const SPAWN = {
  startInterval: 1.15,
  minInterval: 0.34,
  intervalDecay: 0.0062, // per second of night survived
  maxAlive: 150,
  eliteChanceAfter: 75, // seconds before elites can appear
  eliteChance: 0.055,
  hpGrowthPerSecond: 0.011, // enemy hp multiplier growth
};

export const WEAPONS = {
  darts: { label: 'Glow Darts', cooldown: 0.55, damage: 13, speed: 560, pierce: 0 },
  nova: { label: 'Thorn Nova', cooldown: 4.2, damage: 17, count: 10, speed: 330 },
  ring: { label: 'Sunpetal Ring', damage: 11, orbitRadius: 74, orbitSpeed: 2.6, petals: 2 },
  lance: { label: 'Moonlance', cooldown: 5.2, damage: 85, width: 26 },
};

export const XP = {
  firstLevelCost: 6,
  levelCostGrowth: 5,
  moteValue: 1,
  magnetBase: 92,
  collectRadius: 24,
};
