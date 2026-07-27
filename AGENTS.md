# AGENTS.md — Matrix Rain (Three.js)

## Project Goal
A progressive 3D Matrix code rain effect built with vanilla JS + Three.js.
Learning project — code must be readable and educational, not just functional.

## Tech Stack
- Three.js r170+ (ES module via import map or npm)
- Vite 8+ for dev/build
- Vanilla JS only — no React, Vue, or other frameworks
- Target: modern browsers (Chrome/Firefox/Safari latest)
- Deploy: GitHub Pages or Cloudflare Pages (static build)

## Milestones (do not skip ahead)
1. CanvasTexture 2D rain on a flat plane
2. InstancedMesh true 3D rain columns
3. First-person WASD + mouse-look camera
4. Display an image encoded in a dense shower of code rain

## Architecture Rules
- Each milestone lives in its own module under src/ unless if it doesn't makes logical sense to do so
- No global variables — pass state explicitly
- Animation loop lives ONLY in main.js
- Geometry and materials are created ONCE, mutated each frame
- Never use `new THREE.Vector3()` inside requestAnimationFrame

## Current Milestone
Milestone 1: CanvasTexture 2D rain on a flat plane — COMPLETED
Milestone 2: InstancedMesh true 3D rain columns — COMPLETED
Milestone 3: First-person WASD + mouse-look camera — COMPLETED
Milestone 4: Display an image encoded in a dense shower of code rain — COMPLETED

## Code Style
- ES Modules (import/export), no CommonJS
- JSDoc comments on every exported function
- Prefer typed arrays (Float32Array, Uint8Array) for bulk data
- No external dependencies beyond Three.js

# DO
- Use rules from .antigravity/rules folder. Prompt if new requirement is not compatible with a rule. I can change the rule if needed.
- Follow the guidelines of devlog and documentation from core.md

## Do NOT
- Install extra npm packages without asking
- Use React, jQuery, or any DOM framework
- Write code that only works with a bundler (keep it ESM-importable)
- Generate placeholder/TODO code — implement or leave out