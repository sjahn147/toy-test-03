# Asset licensing notes

This folder tracks licenses for vendored game assets.

Rules for this repo:

1. Prefer CC0 / public-domain assets for the web build.
2. Keep a license note beside each imported asset pack.
3. Do not hotlink asset files from third-party websites unless their terms explicitly allow it.
4. Keep primitive Three.js fallback meshes working even when no external assets are present.
5. Large source ZIP files should not be committed unless there is a clear reason. Prefer selected optimized `.glb`, `.png`, `.jpg`, `.webp`, and `.ogg` files.

Suggested pack layout:

```text
assets/
  vendor/
    kenney/
      dungeon/
        LICENSE.txt
        models/
        textures/
    quaternius/
      creatures/
        LICENSE.txt
        models/
```
