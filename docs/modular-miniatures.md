# Modular miniature assembly system

The game now builds every agent as a reusable three-head fantasy miniature.

## Runtime flow

```text
DungeonRenderer
  -> AssetRegistry.makeAgent(agent)
    -> MiniatureFactory.create(agent)
      -> getMiniatureRecipe(role)
      -> create shared sockets
      -> build reusable base body
      -> attach catalog parts
      -> add faction ring and HP bar
```

## Source files

```text
src/miniatures/recipes.js
src/miniatures/partCatalog.js
src/engine/MiniatureFactory.js
src/engine/AssetRegistry.js
```

## Shared sockets

```text
root
pelvis
chest
head
headTop
handL
handR
shoulderL
shoulderR
back
waistFront
waistBack
baseFx
```

## Active recipes

- fighter_rana_v1
- rogue_milo_v1
- cleric_pell_v1
- wizard_orwin_v1
- goblin_common_v1
- skeleton_common_v1
- slime_common_v1
- mimic_common_v1

## Reusable part families

- Heads: round, soft round, square, goblin, skull
- Hats: helmet, rogue hood, cleric band, wizard hat, goblin cap
- Torsos: chain armor, leather vest, cleric robe, mage robe, goblin rags, ribs, slime body, mimic chest
- Back parts: cape, quiver, relic pack, spellbook
- Waist parts: belt, rogue pouches, scroll case, small pouch
- Main-hand weapons: long sword, short sword, dagger, mace, staff, bone club
- Off-hand parts: shield, reverse dagger, book, focus orb
- Accents: halo, arcane floor ring, goblin ears, slime bubbles, mimic teeth

## Reuse and performance

`MiniatureFactory` caches geometry and materials. Every unit instance creates a lightweight object hierarchy while reusing the same geometry buffers and materials for matching parts.

## Adding a new role

1. Add a recipe to `src/miniatures/recipes.js`.
2. Reuse existing part IDs where possible.
3. Add missing part metadata to `src/miniatures/partCatalog.js`.
4. Add a procedural builder method to `MiniatureFactory` only when a genuinely new silhouette is needed.
5. Add the role to `assets/manifest.json`.

## Future GLB replacement seam

The recipe and socket IDs are the stable public contract. A procedural builder can later be replaced by a locally vendored GLB part while preserving:

- role recipes
- socket names
- simulation roles
- renderer integration
- fallback behavior

Authored GLB parts should use the same origin and local scale as the procedural part they replace.
