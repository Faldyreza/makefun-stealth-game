# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**DAYLIGHT HEIST: THE ATRIUM JOB** — a bright isometric stealth game built for make.fun's "Make the best stealth game" bounty ($50 in USDC). A total style break from v1–v4: no more top-down flat vector, no more dark noir. This is a sunlit museum atrium at midday, seen in isometric view. The whole floor is bright, so hiding comes from cover — planters, statues, crates and columns that break a guard's line of sight — while wide bold amber vision cones sweep the cream marble. The guards wear dark navy against the light floor, the three artifacts glow gold on their pedestals, and the exit is a big green doorway. Light is everywhere; the cones are the danger.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under `game/`, all art drawn in code on canvas, all sounds synthesized with WebAudio.

## How to play

- **W A S D** / **arrow keys** — move (isometric) · **click** — walk to a tile
- **Shift** / **Space** — sneak (slower, quieter, harder to spot)
- **P** / **Esc** — pause · **R** — restart · **M** — mute

Steal 3 artifacts — the Sun Disk, the Jade Falcon, the Golden Scarab — then reach the green EXIT unseen. Four guards patrol the atrium, each sweeping a wide amber vision cone across the bright floor. Standing in a cone fills a guard's suspicion fast; breaking line of sight behind a planter, statue, crate or column lets it cool. At "?" a guard stops and stares at the doubt; at "!" the guard chases. The balcony along the north edge is a raised vantage route where guards spot you half as fast. The eye at the top of the screen is your detection meter: green means HIDDEN, amber means SUSPICIOUS, red means SPOTTED. If a chasing guard touches you, or the alarm maxes out, the run is over.

## Layout

- `game/index.html` — page and canvas
- `game/src/main.js` — game loop + state (title, playing, paused, win, lose)
- `game/src/iso.js` — isometric projection, tile + depth sorting
- `game/src/level.js` — atrium map: cover, pedestals, exit, balcony, patrol routes
- `game/src/player.js` — iso movement, sneak, cover state
- `game/src/guard.js` — patrol, vision cone, suspicion, chase, search
- `game/src/render.js` — canvas drawing, bright palette, bold shapes
- `game/src/audio.js` — WebAudio footsteps, alarm sting, chimes (synthesized)
- `game/src/input.js` — keyboard + mouse
- `game/src/hud.js` — detection meter, timer, win/lose screens
- `main.ts` — hand-in program: copies `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — four real renders of the game running in headless Chrome

---

<sub>Entered on [make.fun](https://make.fun/?ref=yona.ai&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
