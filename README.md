[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/nguyentran113/gloomgarden/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/nguyentran113/gloomgarden/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# GLOOMGARDEN

**The garden went dark. You are its last firefly.**

An original browser survival game in vanilla JavaScript and Canvas 2D — no
build step, no dependencies, no network. A shadow swarm has eaten the light
of a bioluminescent night garden; you are the last firefly in it. Your light
fires on its own — Glow Darts, Thorn Novas, an orbiting Sunpetal Ring, a
piercing Moonlance — so your whole job is flying: weave through Husk Mites,
Umbra Moths, Gloom Stingers and Spore Brutes, vacuum up the gold motes they
drop, and take the garden's gifts each level to grow a different build every
run. Survive three minutes, until dawn, and the garden glows again.

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

Or serve `game/` with any static file server and open `game/index.html`.

- **Move** — WASD / arrow keys, or press-and-drag on touch screens
- **Pause** — P or Esc · **Mute** — M
- **Level-up gifts** — click a card, or press 1 · 2 · 3
- **Restart** — R on the results screen

## How it is built

Plain ES modules under `game/src/`, one job each: `config.js` (tuning and
palette), `random.js` (a seeded mulberry32 stream, so runs replay exactly),
`audio.js` (every sound synthesised with WebAudio — no audio files),
`input.js` (keyboard, mouse, touch joystick), `sprites.js` (pre-rendered
glow art and the baked garden backdrop), `entities.js` (factories for the
player, the swarm, projectiles, motes and particles), `upgrades.js` (the
level-up gift pool), `world.js` (the simulation: spawn director, weapons,
collisions, experience), `render.js` (all painting, HUD and screens),
`shots.js` (deterministic screenshot scenes) and `main.js` (the loop and
state machine). The root `main.ts` hands the entry in: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
kit's vendored library in `vendor/`.

Screenshots are real renders of the game, captured from the deterministic
scenes listed in `shots.json` (for example `game/index.html?shot=play`).

## License

MIT — see `LICENSE`.
