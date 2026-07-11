# The Little Dungeon That Could

A Three.js fantasy dungeon ecosystem and observer simulation.

You do not directly control every adventurer or monster. Parties explore, split, regroup, rest, acquire equipment and establish bases. Monster populations feed, reproduce, defend habitats and compete for territory. Settlements gather physical supplies, build defenses and survive sieges while the observer follows the resulting stories.

## Current prototype capabilities

- Port-to-port rooms, doors and continuous corridor movement
- Reserved room cells, large-creature footprints and collision-aware props
- Party cohesion, orphaned members, entrance queues and expedition supplies
- Melee phases, arrows, spells, healing, webs, downed states and resurrection
- Equipment, loot, durability, merchants and live miniature part replacement
- Fifteen-plus ecology species with habitats, hunger, hosts, corpses and reproduction
- Territory control, physical cargo, guarded routes, construction, sieges and blockades
- Settlement capacity, overcrowding, home return and displaced populations
- Persistent personality, relationships, memories and deliberate behavior
- Fixed, free and unit-follow camera modes
- Procedural multi-part dioramas and miniature fallbacks

The current runtime remains a prototype composition built through `Phase*` compatibility layers. New production work must not extend that inheritance chain. The migration target is documented below.

## Run

No build step is currently required.

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

The repository can also be served through GitHub Pages.

## Production documentation

Start with [`docs/README.md`](docs/README.md).

Authoritative design documents:

- [`docs/architecture/production-layering.md`](docs/architecture/production-layering.md) — target layering, runtime façade, content and asset contracts
- [`docs/ui/strategy-ui-surface.md`](docs/ui/strategy-ui-surface.md) — production strategy-simulation UI surfaces
- [`docs/campaigns/sleeping-citadel-overview.md`](docs/campaigns/sleeping-citadel-overview.md) — campaign vision, factions and progression
- [`docs/campaigns/sleeping-citadel-room-bible.md`](docs/campaigns/sleeping-citadel-room-bible.md) — detailed specification for all 63 campaign rooms
- [`docs/assets/content-asset-inventory.md`](docs/assets/content-asset-inventory.md) — reusable procedural resources and authored asset requirements
- [`docs/migration/production-content-migration.md`](docs/migration/production-content-migration.md) — incremental migration plan without a big-bang rewrite
- [`docs/handoff/workstream-plan.md`](docs/handoff/workstream-plan.md) — parallel workstreams, ownership and acceptance gates

Machine-readable design contracts:

- [`content/campaigns/sleeping-citadel/campaign.manifest.json`](content/campaigns/sleeping-citadel/campaign.manifest.json)
- [`content/assets/asset-catalog.json`](content/assets/asset-catalog.json)
- [`content/ui/surface-manifest.json`](content/ui/surface-manifest.json)
- [`content/README.md`](content/README.md)

These manifests are design contracts and are not yet loaded by the current runtime. A future `ContentRegistry`, `ScenarioCompiler` and `AssetResolver` will consume them while the existing simulation remains available through a compatibility adapter.

## Content, assets and procedural fallback

The repository now uses three explicit visual layers:

```text
Authored asset
→ Procedural composite fallback
→ Primitive emergency fallback
→ Missing-asset diagnostic marker
```

- `content/` stores authored campaign, UI and asset metadata.
- `assets/` is reserved for real binary runtime files: GLB, textures, audio, shaders and licenses.
- Current `AssetFactory` and `MiniatureFactory` code remains the official procedural fallback.
- Campaign content references stable asset IDs, never hard-coded file paths.
- `content/assets/asset-catalog.json` connects each asset ID to an authored file target and a fallback recipe.

The largely empty binary `assets/` directories are therefore a production backlog, not the intended permanent state. The Old Lantern Inn, campaign zone kits, landmark dioramas, UI icon atlas and ambience are explicitly inventoried for authored production.

## Current and target architecture

Current compatibility path:

```text
App
→ ObserveScreenPhase8
→ DungeonSimPhase8
→ feature systems
→ DungeonRendererPhase8
→ AssetRegistryPhase8
→ procedural factories
```

Target dependency direction:

```text
content/ and assets/
        ↓
src/content/
        ↓
src/domain/
        ↓
src/systems/
        ↓
src/application/
        ↓
src/presentation/
        ↓
src/ui/ and src/render/
```

New functionality should be added as named modules and contracts rather than new `Phase9` or `Phase10` subclasses.

## Tests

The repository contains smoke tests for the implemented feature phases.

```bash
npm run test:phase1
npm run test:phase4
npm run test:phase8
npm run test:phase8e
```

The production migration will add content schema validation, selector fixtures, campaign graph validation, asset coverage checks and long-running soak tests.

## Product direction

The central appeal is watching a place develop memory.

A ruined room can become a habitat, a field camp, an inn, a market, a fortress or a battlefield. Adventurers and monsters should not merely collide; they should depend on food, shelter, territory, relationships and history, then change the dungeon through their decisions.
