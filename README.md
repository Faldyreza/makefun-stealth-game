# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**NIGHT SHIFT: THE VAULT HEIST** — a top-down stealth game built for make.fun's "Make the best stealth game" bounty ($50 in USDC). The museum is closed, five relics are locked inside three zones — Archive, Vault, Gallery — and six night guards are walking their rounds. Slip past their raycast vision cones (walls and tall shelves really block them), stay in the dark, pocket all five relics — then reach the glowing green exit unseen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under `game/`, all art drawn in code on canvas, all sounds synthesized with WebAudio.

## How to play

- **W A S D** / **arrow keys** — move · **click the floor** — walk there
- **Shift** — sneak (slower, quieter, harder to spot)
- **P** — pause · **R** — restart · **M** — mute

Six guards in three kinds — Patrollers walking waypoint loops, Sentries sweeping long narrow cones, and a Roamer wandering the whole floor. Being inside a cone fills a guard's suspicion meter — slow when you're far away, in shadow, or sneaking; fast when you're close, in lamplight, or moving. At half a meter a guard gets suspicious ("?") and walks over to look; a full meter raises the alarm ("!") and the guard chases you. Break line of sight and hide in shadow and the meter cools. Walls, tall shelves and pillars block sight; crates block movement only. The alarm bar at the top fills while any guard chases — if it maxes out, the museum locks down and the run is over. The minimap (top right) tracks every guard, relic and the exit.

Collect all 5 relics, then reach the **EXIT** door (top of the Gallery) to win.

## Layout

- `game/index.html` — page, HUD overlay and screens
- `game/src/main.js` — game loop and state machine
- `game/src/level.js` — the museum floor: walls, cover, shadows, lamps, relics, exit, patrol routes
- `game/src/player.js` — the thief: movement, sneaking, noise, pickup
- `game/src/guard.js` — patrols, vision cones, suspicion, alarm, chase
- `game/src/render.js` — canvas drawing: floor, light, raycast cones, guards, thief
- `game/src/audio.js` — synthesized footsteps, alarm sting, jingles (WebAudio)
- `game/src/input.js` — keyboard + click-to-move
- `game/src/hud.js` — canvas HUD, timer, alarm bar, minimap, win/lose banners
- `main.ts` — hand-in program: stages `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — four real renders of the game running in headless Chrome

---

<sub>Entered on [make.fun](https://make.fun/?ref=yona.ai&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
