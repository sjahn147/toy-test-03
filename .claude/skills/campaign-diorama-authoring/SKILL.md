---
name: campaign-diorama-authoring
description: >-
  Build a detailed, story-bearing procedural 3D landmark diorama pack for one zone of the
  Sleeping Citadel campaign in the-little-dungeon-that-could (Three.js, no build step, ES modules).
  Use when a work-unit asks to author/replace a campaign landmark asset — a room whose landmarkBundle
  currently falls back to CommonDungeonArchitecture or the pink diagnostic marker. Produces the full
  6-file pack (Recipes/Geometry/Diorama/Factory/Animator/Pack) + catalog wiring + a node smoke test,
  matching the SpiderColony/FloodedStorehouse reference packs. NOT for character miniatures
  (see docs/modular-miniatures.md), NOT for UI, NOT for simulation systems.
---

# Campaign diorama authoring

You are building **detailed procedural 3D dioramas with storytelling**, not placeholders. Every mesh is a
semantically named, layered, lit object; state variants change real geometry; creatures/machines are composite
and articulated. The bar is set by the shipped reference packs — match them.

## Before you start: read the source of truth

For the room(s) in your work-unit, read the room-bible entry and transcribe it. Each room in
`docs/campaigns/sleeping-citadel-room-bible.md` (heading `## <ID>. <Name>`) has 8 fields:

| Bible field | Becomes |
|---|---|
| 규모 (size) | `recipe.footprint` (must stay ≤ manifest `room.size`) |
| 시각 (visual/silhouette) | layered geometry, readable silhouette |
| 핵심 프롭 (key props) | `recipe.sockets` + named sub-meshes |
| 스토리 (story hook) | at least one bespoke named prop (e.g. `queen-field-notes`) |
| 상태 변화 (state variants) | `recipe.states` — MUST deep-equal manifest `room.stateVariants` |
| 기능 / 생태 / 연결 | inform prop choice; do not block ports or >35% of the floor |

Cross-check the manifest `content/campaigns/sleeping-citadel/campaign.manifest.json`: your recipe `id` must
equal the room's `landmarkBundle`, `roomId` must equal the room `id`, and `states` must exactly equal
`room.stateVariants` (order matters — the test uses `assert.deepEqual`). The catalog entry in
`content/assets/asset-catalog.json` already exists for all 63 landmarks (`status:"author"`); do not remove it.

Read the doc guidelines: `docs/assets/content-asset-inventory.md` §8 (GLB/socket/footprint conventions, socket
name vocabulary), §11 (definition of done); `docs/handoff/developer-3-campaign-landmarks.md` (what "done"
means, the placement audit). Do not add `Phase9` layers or bypass `Phase8AssetResolver`.

## The reference packs — copy their anatomy

Open **`src/engine/SpiderColony*.js`** (canonical) and **`src/engine/FloodedStorehouse*.js`** and mirror them.
A zone pack is 6 file roles:

1. `<Zone>LandmarkRecipes.js` — **pure data, NO THREE import** (the smoke test loads this in Node).
   Frozen table keyed by bundleId + `get<Zone>LandmarkRecipe(id)` + `list<Zone>LandmarkRecipes()`.
2. `<Zone>Geometry.js` — a frozen `COLORS` table keyed by semantic material name, `material()` returning
   **`MeshStandardMaterial`**, and primitive helpers (`group/box/cylinder/sphere/torus/beam`) + composite makers.
3. `<Zone><Landmark>Diorama.js` (one per landmark) — exports `build<Landmark>(state)` returning a fully-named
   `THREE.Group`. State drives geometry.
4. `<Zone>LandmarkAssetFactory.js` — `canCreate(id)` + `create(id, ctx)` with an **explicit literal id→builder
   map** (never a fall-through `else` — the test greps the source for each `'<id>'` string).
5. `<Zone>AssetAnimator.js` — `prepare(root)` snapshots a stable base; `update(root, elapsed)` writes ABSOLUTE
   values from `userData.animation` tags. Never `position.y +=`, never `scale.multiplyScalar` (test forbids both).
6. `<Zone>AssetPack.js` — facade exposing `canCreate/create/getRecipe/listRecipes` (+`update` or a prepared animator).
   Must NOT import `AssetRegistryPhase8` or `DungeonRendererPhase8` (test forbids).

### Canonical recipe shape (mandatory fields)

```js
'spider.nest.queen-empty': Object.freeze({
  id: 'spider.nest.queen-empty',            // === manifest room.landmarkBundle
  roomId: 'G35',                            // === manifest room.id
  defaultState: 'empty',                    // must be in states
  states: Object.freeze(['empty','queen-awakened','captured']), // === room.stateVariants (deep-equal)
  placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }),
  footprint: Object.freeze({ width: 20.6, depth: 16.8, height: 10.8 }), // width≤size[0], depth≤size[1], height>0
  sockets: Object.freeze(['queen-exuvia','egg-throne','host-ritual-altar','silk-crown-crest','adventurer-containment']),
  detailBudget: 'hero',
  triangleBudget: 74000                     // ≤ 75000
})
```

### Factory dispatch (explicit map — required by the test)

```js
create(bundleId, context = {}) {
  const recipe = getSpiderColonyLandmarkRecipe(bundleId);
  if (!recipe) return null;
  const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
  const builders = {
    'spider.ramp.silk': buildSilkRamp,
    'spider.well.vertical': buildVerticalWell,
    'spider.nest.queen-empty': buildQueenNest   // every id named literally
  };
  const build = builders[bundleId];
  if (!build) return null;
  const root = build(state);
  root.name = `campaign-landmark:${bundleId}`;
  root.userData = { bundleId, roomId: recipe.roomId, state, sockets: [...recipe.sockets],
    detailBudget: recipe.detailBudget, triangleBudget: recipe.triangleBudget, animationProfile: '<zone>-...' };
  root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
  root.rotation.y = recipe.placement.rotation;
  root.scale.setScalar(recipe.placement.scale);
  return root;
}
```

## What makes it detailed + storytelling (not a placeholder)

1. **Every mesh has a semantic kebab-case name** — story-bearing nouns: `nest-stone-foundation`,
   `crown-silk-rib`, `queen-exuvia`, `host-ritual-altar`, `queen-field-notes`, `voussoir`, `waterwheel-spoke`,
   `pressure-gauge`. No anonymous meshes.
2. **Sockets are the semantic contract** — the recipe's ≥5 (Flooded ≥6) unique sockets must each be realized as
   named nodes; the test greps the diorama source for every socket/semantic-node string you declare.
3. **States change real geometry** — `if (state==='captured') root.add(makeContainment())`. Default and alternate
   states must NOT be identical scenes. Add/remove/reshape sub-trees per state.
4. **Layered silhouette** — foundation slab → concentric ridges/tiers → vertical crown/ribs → props. Arches from
   `voussoir` blocks; wheels from spokes; instruments modeled, not boxed.
5. **Composite articulated parts** — creatures/machines from many jointed `beam(a,b)` segments (spider legs,
   gear trains), never one primitive. (SpiderColony test greps `queen-leg-upper`.)
6. **Lit materials only** — `MeshStandardMaterial` everywhere (roughness/metalness/emissive). `MeshBasicMaterial`
   is reserved for diagnostic markers. Test asserts `MeshStandardMaterial` appears.
7. **Emissive + animation for life** — eggs/motes/flames carry `{emissive, emissiveIntensity}` + a
   `userData.animation` tag (`egg-pulse`, `spore-orbit`, `flame-flicker`, `silk-sway`) with a per-instance `phase`.
8. **Zone palette** in a frozen `COLORS` table keyed by semantic material name (`stone/silk/chitin/blood/gold`),
   so geometry reads `box(...,'blood',...)`.

## Wiring (make it render)

1. Register in `src/engine/Phase8AssetResolver.js` `registerDefaults()`, priority **100** for a zone hero pack
   (Common kit is 10 so specific packs win; CampaignCompletion 130):
   ```js
   this.register(new <Zone>AssetPack(), { priority: 100, animate: (pack, root, _dt, elapsed) => pack.update(root, elapsed) });
   ```
   (Or the `prepare: root => new <Zone>AssetAnimator(root), animate: (a, dt) => a.update(dt)` idiom.)
2. The catalog entry already exists (`template:"campaign-landmark"`, `status:"author"`); ensure its `variants`
   mirror your recipe `states`.
3. The renderer bridge is automatic: `DungeonRendererPhase8.renderCampaignLandmarks` reads `room.landmarkBundle`,
   gets your recipe, swaps the mesh when `state` changes, and animates via the resolver. You add nothing there.

## The acceptance bar — write and pass a smoke test

Create `tests/<zone>-assets-smoke.mjs` mirroring `tests/spider-colony-assets-smoke.mjs`. It imports the
**pure-data recipes** and reads the diorama/factory/animator/pack files as **text**. It must assert:

- recipe count === N; `Object.keys(TABLE).length === N`
- per recipe: room exists; `room.landmarkBundle === recipe.id`; `recipe.states` deep-equals `room.stateVariants`;
  `defaultState` ∈ states; `catalogIds.has(id)`; `footprint.width ≤ room.size[0]`, `depth ≤ room.size[1]`,
  `height > 0`; `triangleBudget ≤ 75000`; `sockets.length ≥ 5` (6 for flooded), no dup sockets; `get(id) === recipe`; `get('missing') === null`
- source greps: factory/diorama contains `'<id>'` for every bundle; diorama contains `'<socket>'`/`'<semantic-node>'`
  for every declared node; contains `'<state>'` for every state; contains `MeshStandardMaterial`; contains your
  articulation/silhouette proof strings
- isolation: pack source has NO `AssetRegistryPhase8`, NO `DungeonRendererPhase8`; diorama has no `'inn.`;
  animator has no `position.y +=`, no `scale.multiplyScalar`

Add the script to `package.json`: `"test:<zone>": "node tests/<zone>-assets-smoke.mjs"` and append it to the
`test:assets` chain. Run `node tests/<zone>-assets-smoke.mjs` and `npm run test:production` — both must be green
before you report done. Do NOT commit; report the files created and the test output. The orchestrator commits.

## Definition of done (per docs/assets/content-asset-inventory.md §11)

Catalog entry ✓ (exists) · procedural pack registered ✓ · footprint+socket metadata ✓ · base + alternate +
destroyed/restored states with distinct geometry ✓ · triangle budget ≤ 75000 ✓ · placement inside the room ✓ ·
smoke test green ✓ · `test:production` green ✓.
