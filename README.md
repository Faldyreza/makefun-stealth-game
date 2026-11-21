# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**NIGHT SHIFT: THE ARCHIVE** — a top-down stealth game built for make.fun's "Make the best stealth game" bounty ($50 in USDC). The museum is closed, three archive documents are locked inside, and the night guards are walking their rounds. Slip past their vision cones, stay in the dark, grab all three documents — then reach the glowing green exit unseen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under `game/`, all art drawn in code on canvas, all sounds synthesized with WebAudio.

## How to play

- **W A S D** / **arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **P** — pause · **R** — restart · **M** — mute

Guards patrol fixed routes with visible vision cones. Being inside a cone fills a guard's suspicion meter — slow when you're far away, in shadow, or sneaking; fast when you're close, in lamplight, or running. A full meter raises the alarm and the guard chases you; break line of sight and the meter cools. Crates, shelves, pillars and tall archive stacks block sight. The alarm bar at the top fills while any guard chases — if it maxes out, the museum locks down and the run is over.

Collect all 3 documents, then reach the **EXIT** door (top right) to win.

## Layout

- `game/index.html` — page, HUD overlay and screens
- `game/src/main.js` — game loop and state machine
- `game/src/level.js` — the archive floor: walls, cover, shadows, keys, exit, patrols
- `game/src/player.js` — the thief: movement, sneaking, noise, pickup
- `game/src/guard.js` — patrols, vision cones, suspicion, alarm, chase
- `game/src/render.js` — canvas drawing: floor, light, cones, guards, thief
- `game/src/audio.js` — synthesized footsteps, alarm sting, jingles (WebAudio)
- `game/src/input.js` — keyboard state
- `game/src/hud.js` — DOM HUD, timer, alarm bar, title/win/lose screens
- `main.ts` — hand-in program: stages `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — four real renders of the game running in headless Chrome

---

<sub>Entered on [make.fun](https://make.fun/?ref=yona.ai&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
