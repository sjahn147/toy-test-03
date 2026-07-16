# NEON SERAPH: PIXEL RUN

GitHub Pages-ready mobile browser game prototype.

## Current status

This branch starts the implementation track for a new game prototype:

- **Title:** NEON SERAPH: PIXEL RUN
- **Genre:** mobile 2D cyberpunk action platformer
- **Style:** retro pixel-art feeling, neon city, cyberpunk magical-girl warrior
- **Runtime:** Vite + Phaser 3 + JavaScript
- **Deployment target:** GitHub Pages via GitHub Actions

Tracking issue: #1

## Hard constraints

- Use Vite + Phaser 3 + JavaScript.
- Do not use TypeScript, React, Vue, Svelte, backend, DB, login, or online ranking.
- Do not rely on remote image URLs.
- Do not require external image assets for the first playable version.
- Generate placeholder pixel-art textures in code.
- Support mobile touch controls first.
- Support desktop keyboard controls as a secondary path.
- Keep GitHub Pages compatibility by using `vite.config.js` with `base: './'`.

## First playable loop

1. Title screen
2. Start button
3. Stage entry
4. Player movement
5. Jump
6. Dash
7. Energy blade attack
8. Neon Core collection
9. Drone / turret enemies
10. Checkpoint
11. Goal gate
12. Result screen
13. Restart

## Visual direction

- Gradient night sky
- Three-layer parallax cyberpunk city
- Neon signs
- CRT scanline overlay
- Hologram UI frame
- Pixel particles
- Energy blade afterimage
- Dash neon trail
- Hit glitch effect
- Goal gate light column

## Recommended implementation order

1. Replace current root app with Vite + Phaser 3 scaffold on this branch.
2. Add GitHub Pages workflow.
3. Add procedural texture generation.
4. Add scenes: Boot, Preload, Title, Game, Result.
5. Add player movement with coyote time and jump buffer.
6. Add mobile touch controls.
7. Add first level data.
8. Add enemies, Neon Cores, checkpoint, and goal gate.
9. Run `npm run build` and fix import/case issues.
10. Merge only after GitHub Pages build succeeds.
