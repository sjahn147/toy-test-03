# WP12 Modern Adventurer Pipeline

## Delivered runtime path

WP12 replaces the ordinary party-adventurer visual path with a deterministic modernized character runtime while preserving heroes, elites, monsters, and the old procedural miniature as fallbacks.

The delivered path includes:

- a canonical 24-bone humanoid hierarchy;
- shared-skeleton `SkinnedMesh` body, limb, robe, and armor layers;
- up to four bone influences per generated vertex;
- body-volume morph targets;
- rigid headwear, weapon, shield, relic, quiver, and backpack attachments;
- three runtime LODs;
- deterministic body, face, hair, palette, archetype, background, trait, specialization, and equipment variation;
- equipment tiers driven by level;
- a role-aware animation controller that never modifies the world-space root height;
- an optional GLB/KTX2/Meshopt cache for later Blender-authored assets;
- ordinary-adventurer abilities and cooldown state;
- source and behavior regression tests.

## Scope boundary

This package implements the complete runtime contract and a production-usable procedural skinned fallback. It does not claim that Blender-authored high-poly sculpts, hand-retopologized meshes, baked normal maps, or artist-authored animation clips exist. Those binary assets can be introduced later through `AdventurerGLTFAssetCache` without replacing the simulation, appearance, progression, LOD, or fallback contracts.

## Runtime selection

```text
hero                  -> existing hero factory
elite                 -> existing elite factory
ordinary party member -> WP12 modern skinned adventurer
other creature        -> existing polished miniature factory
asset failure         -> existing procedural fallback remains available
```

## Character identity

`ensureAdventurerProfile()` assigns stable values derived from `agent.id` and preserves explicitly authored values:

- body build and stature;
- face and hair;
- skin and hair palette;
- class visual archetype;
- specialization;
- background and traits;
- equipment condition;
- unlocked ordinary-adventurer abilities;
- visual equipment tier.

A visual signature causes the renderer to rebuild an ordinary adventurer only when visual identity or equipment tier changes.

## Height ownership

The character factory keeps the model origin at the feet. The animation controller only changes bones below the model root. `DungeonRenderer` remains the sole owner of world X/Y/Z placement, including multi-floor route height and grounding.

## Authored GLB adoption

When authored assets are added:

1. Keep the same canonical bone names.
2. Export feet-centered Y-up GLB files.
3. Include LOD0-LOD2 or register separate URLs in the asset manifest.
4. Use KTX2 textures and Meshopt geometry/animation compression.
5. Load and clone skinned scenes through `AdventurerGLTFAssetCache`.
6. Fall back to `createModernAdventurerMiniature()` while assets load or fail.

## Performance notes

The runtime fallback intentionally uses shared role logic and deterministic generation. Each character currently owns its generated materials and geometries so it can be safely disposed during a visual-tier rebuild. A later asset-batching pass may pool immutable geometry and palette materials after browser profiling confirms the final variation budget.
