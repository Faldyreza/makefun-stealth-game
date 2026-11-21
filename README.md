# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**NIGHT SHIFT: THE VAULT HEIST — SHADOW EDITION** — a side-view shadow stealth game built for make.fun's "Make the best stealth game" bounty ($50 in USDC). A total style break from v1–v3: no more top-down flat vector. This is a dark noir museum at night, seen from the side. The thief is a silhouette against lit walls; the guards sweep bright flashlight cones through the dark — and the cone IS the vision cone. Darkness hides you, light exposes you.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under `game/`, all art drawn in code on canvas, all sounds synthesized with WebAudio.

## How to play

- **W A S D** / **arrow keys** — move · **Up** — jump, or climb a pipe
- **Shift** — sneak (slower, quieter, harder to spot) · **C** — crawl through vents
- **P** — pause · **R** — restart · **M** — mute

Steal 3 relics — the Jade Scarab, the Golden Idol, the Moon Pearl — then reach the glowing EXIT unseen. Three guards patrol the hall and the balcony, each sweeping a flashlight cone. Standing in a cone in the light fills a guard's suspicion fast; standing in deep shadow hides you even at close range. At "?" a guard stops and sweeps the light toward the doubt; at "!" the guard chases. Break line of sight, slip back into shadow, and the suspicion cools. Running and hard landings make noise the guards hear — the noise ring around the thief shows how loud you are. The eye at the top of the screen is your visibility meter: slashed and blue means HIDDEN, open and red means EXPOSED. If a chasing guard touches you, or the alarm maxes out, the run is over.

## Layout

- `game/index.html` — page and canvas
- `game/src/main.js` — game loop + state (title, playing, paused, win, lose)
- `game/src/level.js` — side-view map: platforms, pipes, vents, lamps, relics, exit
- `game/src/player.js` — run/climb/crawl/sneak, noise, shadow state
- `game/src/guard.js` — patrol, flashlight cone, suspicion, chase
- `game/src/lighting.js` — shadow/light map, cone rendering, darkness veil
- `game/src/render.js` — canvas drawing, silhouettes, noir palette
- `game/src/audio.js` — WebAudio footsteps, alarm sting, chimes (synthesized)
- `game/src/input.js` — keyboard + mouse
- `game/src/hud.js` — visibility meter, timer, win/lose screens
- `main.ts` — hand-in program: copies `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — four real renders of the game running in headless Chrome

---

<sub>Entered on [make.fun](https://make.fun/?ref=yona.ai&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
