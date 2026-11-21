# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Faldyreza/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**NIGHT SHIFT: THE GRAND HEIST** — a top-down stealth game built for make.fun's "Make the best stealth game" bounty ($50 in USDC). The museum is closed, five relics are locked inside three floors — Archive, Vault, Gallery — and twelve night guards are walking their rounds, with security cameras sweeping the Vault and the Gallery. Slip past their raycast vision cones (walls and tall shelves really block them), stay in the dark, cut the fuse boxes to kill the cameras, pocket all five relics — then reach the glowing exit unseen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under `game/`, all art drawn in code on canvas, all sounds synthesized with WebAudio.

## How to play

- **W A S D** / **arrow keys** — move · **click the floor** — walk there
- **Shift** — sneak (slower, quieter, harder to spot)
- **P** — pause · **R** — restart · **M** — mute

Twelve guards in four kinds — Patrollers walking waypoint loops, Sentries sweeping long narrow cones from a post, a Roamer wandering at random, and a fast Elite in the Gallery. Being inside a cone fills a guard's suspicion meter — slow when you're far away, in shadow, or sneaking; fast when you're close, in lamplight, or moving. At half a meter a guard gets suspicious ("?") and walks over to look; a full meter raises the alarm ("!") and the guard chases you — and radios the guards nearby, who converge on where you were last seen. Break line of sight and hide in shadow and the meter cools; lose them for a few seconds and they search the area in a pattern before giving up and returning to patrol. Walls, tall shelves and statue plinths block sight; crates and desks block movement only. Security cameras (Vault and Gallery) sweep their own cones — a full camera lock trips the alarm and sends the nearest guard to look, until you cut the floor's fuse box. The alarm bar at the top fills while any guard chases or a camera watches — if it maxes out, the museum locks down and the run is over. The minimap (bottom left) tracks every guard, relic, camera and the exit.

Three floors, each harder than the last: the Archive (warm wood, 3 patrollers, 2 relics), the Vault (cold steel, cameras + 4 guards, 2 relics), the Gallery (red carpet and gold frames, cameras + 5 guards including a fast Elite, the Crimson Vermeer). Clear a floor's relics to unlock its glowing exit, then escape to the next floor. Win the run by escaping the Gallery with all five relics.

## Layout

- `game/index.html` — page and canvas
- `game/src/main.js` — game loop, state machine and level flow
- `game/src/levels.js` — the three museum floors: walls, cover, shadows, lamps, relics, exits, cameras, patrol routes
- `game/src/player.js` — the thief: movement, sneaking, noise, pickup
- `game/src/guard.js` — patrols, vision cones, suspicion, alarm, chase, search, alert propagation
- `game/src/camera.js` — wall-mounted security cameras: sweeping cones, lock-on, fuse cut
- `game/src/lighting.js` — raycast vision cones, line of sight, shadow and lamp light
- `game/src/render.js` — canvas drawing: floors, props, light, cones, animated guards and thief
- `game/src/audio.js` — synthesized footsteps, camera beeps, alarm sting, jingles (WebAudio)
- `game/src/input.js` — keyboard + click-to-move
- `game/src/hud.js` — top bar, timer, alarm bar, title / pause / end screens
- `game/src/minimap.js` — bottom-left floor-plan minimap
- `main.ts` — hand-in program: stages `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — four real renders of the game running in headless Chrome

---

<sub>Entered on [make.fun](https://make.fun/?ref=yona.ai&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
