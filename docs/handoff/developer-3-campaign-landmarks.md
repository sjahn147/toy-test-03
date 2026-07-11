# Developer #3 — Sleeping Citadel campaign landmark completion

## Mission

Developer #3 owns the remaining procedural campaign landmarks required to turn the Sleeping Citadel from a mostly empty campaign map into a visually legible, stateful dungeon. The work ends when every target bundle has a recognizable diorama, all manifest states are supported, the packs are registered in `Phase8AssetResolver`, and a final placement/wiring audit proves that the campaign renderer can instantiate every target room.

Authoritative tracker: [GitHub issue #19](../../issues/19)

## Status vocabulary

- **Not started** — manifest/catalog contract exists, but no recipe/factory/pack is implemented.
- **Asset complete** — recipe, composite procedural scene, state variants, animator and smoke test exist.
- **Runtime wired** — pack is registered in `Phase8AssetResolver` and production tests include it.
- **Placement verified** — campaign renderer resolves the manifest bundle in the intended room with footprint and state replacement verified.
- **Done** — all four conditions above are met and merged to `main`.

## Completion matrix

| Priority | Room | Bundle | States | Asset | Runtime | Placement | PR |
|---|---|---|---|---|---|---|---|
| P0 | D19 Brass Button Market | `industry.goblin.market` | goblin-market / neutral-market / orc-taxed / burned | Asset complete | Runtime wired | Audit pending | #21 |
| P0 | J49 Red Pit Arena | `orc.arena.red-pit` | matches / chieftain-challenge / liberated | Asset complete | Runtime wired | Audit pending | #21 |
| P0 | J50 Chieftain Hall | `orc.hall.chieftain` | tribal-court / war-council / leaderless | Asset complete | Runtime wired | Audit pending | #21 |
| P0 | M62 Circular Sanctum | `sanctum.circular` | dormant / ritual-active / fractured | Asset complete | Runtime wired | Audit pending | #21 |
| P0 | M63 Heart Chamber | `sanctum.heart.chamber` | sleeping / awakened / claimed / collapsed | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | K54 Failed Summoning Room | `laboratory.summoning.failed` | dormant / breached / stabilized | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | K55 Emergency Way | `laboratory.emergency.way` | sealed / opened / collapsed | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | L57 Crown Vault | `royal.vault.crown` | sealed / opened / stripped | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | L58 Shattered Banquet Hall | `royal.banquet.shattered` | haunted / occupied / restored-feast | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | L60 Royal Bedchamber | `royal.bedchamber` | sealed / searched / sanctuary | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | C12 Granary of Quiet Teeth | `flooded.granary.quiet-teeth` | sealed / rat-dominated / restored | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | C13 Flooded Wine Cellar | `flooded.wine-cellar` | flooded / drained / fermenting-colony | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | F27 Rotten Glasshouse | `fungal.glasshouse.rotten` | overgrown / cultivated / shattered | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | F29 Sleeping Gardener's Chamber | `fungal.gardener.chamber` | sleeping / awakened / consumed | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | G32 Host Vault | `spider.vault.hosts` | occupied / rescued / empty-cocoons | Asset complete | Runtime wired | Audit pending | #21 |
| P1 | G33 Spawning Gallery | `spider.gallery.spawning` | brooding / overpopulated / destroyed | Asset complete | Runtime wired | Audit pending | #21 |

## Current implementation

PR #21 provides one resolver-native completion pack with 16 individual recipes and dedicated room builders. Shared code is limited to material helpers, deterministic animation and pack registration. Each room keeps a distinct dominant silhouette and semantic anchors.

Implemented visual families:

- D19 market stalls, stolen-goods island, faction occupation and tax checkpoint
- J49 arena pit, spectator tiers, fighter gates, chieftain dais and liberation layer
- J50 war throne, trophy wall, council table and leaderless state
- M62 nested ritual rings, faction altars and fracture rifts
- M63 suspended heart, artery bridges, claim standards and collapse state
- K54 containment pylons, summoning breach and stabilization console
- K55 blast door, escape rails and collapse route
- L57 vault door, crown pedestal and stripped state
- L58 banquet rows, ghost occupation and restored feast state
- L60 royal bed, relic cabinet, secret panel and sanctuary state
- C12 silos, loading crane and rat occupation
- C13 barrel racks, flood basin and fermenting fungal colony
- F27 glasshouse ribs, cultivation beds and shattered glazing
- F29 gardener cot, medicine table and consuming root growth
- G32 host cocoons, rescue platform and emptied shells
- G33 egg clutches, nursery web and burned brood state

## Remaining work — WP5 placement and wiring audit

The asset-development phase is complete on PR #21. Final acceptance still requires:

1. Assert every target manifest `landmarkBundle` resolves through `Phase8AssetResolver` without a diagnostic marker.
2. Instantiate every recipe in every declared state.
3. Verify footprint constraints and default placement.
4. Verify renderer signature changes replace the old root when `visualState` changes.
5. Verify `releaseCampaignLandmark` and `disposeTree` are invoked for removed and replaced landmarks.
6. Verify animator registration and release for the new pack.
7. Run the aggregate test through `npm run test:production`.
8. Mark all matrix rows `Placement verified` and then `Done` after merge.

## Asset quality contract

Every landmark must be a recognizable prop assembly or diorama rather than an enlarged primitive. A passing asset includes:

1. A dominant silhouette readable from the campaign camera.
2. At least five semantic sockets or named scene anchors.
3. Secondary storytelling props that identify the room's function.
4. State variants that alter structure, occupation, route, hazards or campaign meaning.
5. Deterministic placement and animation without frame-to-frame drift.
6. Materials and geometry consistent with the adjacent zone pack.
7. A footprint no larger than the manifest room dimensions.
8. A visible diagnostic failure only for genuinely missing bundles.

## Change discipline

- Add new packs and register them in `Phase8AssetResolver`; do not add new `Phase9`-style inheritance layers.
- Do not overwrite `DungeonRendererPhase8`, miniature presentation, combat presentation or Old Lantern integration.
- Keep simulation-specific boss/event logic separate from Three.js asset construction.
- Each work-package PR updates this matrix and issue #19.
- Merge conflict-free PRs immediately after smoke and syntax validation.

## Existing foundation

- Layered resolver core: PR #12
- Runtime procedural-pack wiring: PR #15
- Old Lantern resolver integration: PR #16
- Developer #3 tracking baseline: PR #20
- Campaign completion assets: PR #21

## Completion definition

Developer #3 work is complete when the matrix contains no partial rows, issue #19 is closed, and the aggregate placement audit passes on `main`.
