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
| P0 | D19 Brass Button Market | `industry.goblin.market` | goblin-market / neutral-market / orc-taxed / burned | Not started | — | — | — |
| P0 | J49 Red Pit Arena | `orc.arena.red-pit` | matches / chieftain-challenge / liberated | Not started | — | — | — |
| P0 | J50 Chieftain Hall | `orc.hall.chieftain` | tribal-court / war-council / leaderless | Not started | — | — | — |
| P0 | M62 Circular Sanctum | `sanctum.circular` | dormant / ritual-active / fractured | Not started | — | — | — |
| P0 | M63 Heart Chamber | `sanctum.heart.chamber` | sleeping / awakened / claimed / collapsed | Not started | — | — | — |
| P1 | K54 Failed Summoning Room | `laboratory.summoning.failed` | dormant / breached / stabilized | Not started | — | — | — |
| P1 | K55 Emergency Way | `laboratory.emergency.way` | sealed / opened / collapsed | Not started | — | — | — |
| P1 | L57 Crown Vault | `royal.vault.crown` | sealed / opened / stripped | Not started | — | — | — |
| P1 | L58 Shattered Banquet Hall | `royal.banquet.shattered` | haunted / occupied / restored-feast | Not started | — | — | — |
| P1 | L60 Royal Bedchamber | `royal.bedchamber` | sealed / searched / sanctuary | Not started | — | — | — |
| P1 | C12 Granary of Quiet Teeth | `flooded.granary.quiet-teeth` | sealed / rat-dominated / restored | Not started | — | — | — |
| P1 | C13 Flooded Wine Cellar | `flooded.wine-cellar` | flooded / drained / fermenting-colony | Not started | — | — | — |
| P1 | F27 Rotten Glasshouse | `fungal.glasshouse.rotten` | overgrown / cultivated / shattered | Not started | — | — | — |
| P1 | F29 Sleeping Gardener's Chamber | `fungal.gardener.chamber` | sleeping / awakened / consumed | Not started | — | — | — |
| P1 | G32 Host Vault | `spider.vault.hosts` | occupied / rescued / empty-cocoons | Not started | — | — | — |
| P1 | G33 Spawning Gallery | `spider.gallery.spawning` | brooding / overpopulated / destroyed | Not started | — | — | — |

## Work packages

### WP1 — Final Sanctum

- M62 Circular Sanctum
- M63 Heart Chamber
- Multi-ring ritual staging, faction altars, fracture states, central heart boss structure and campaign-resolution states

### WP2 — Industrial and Orc power centers

- D19 Brass Button Market
- J49 Red Pit Arena
- J50 Chieftain Hall
- Multi-faction occupation, market taxation, arena spectacle and tribal authority states

### WP3 — Laboratory and Royal completion

- K54, K55
- L57, L58, L60
- Completes the late-campaign route from laboratory failure through royal quarter to M61

### WP4 — Existing-zone gap completion

- C12, C13
- F27, F29
- G32, G33
- Fills the two missing rooms in each already-developed C/F/G zone

### WP5 — Campaign placement and wiring audit

- Assert every target manifest `landmarkBundle` resolves through `Phase8AssetResolver`
- Instantiate every recipe in all declared states
- Verify room footprint constraints and placement offsets
- Verify state replacement and resource disposal in `DungeonRendererPhase8`
- Add one aggregate campaign-landmark smoke test
- Confirm `npm run test:production` contains every pack

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

The following merged systems are prerequisites and must be preserved:

- Layered resolver core: PR #12
- Runtime procedural-pack wiring: PR #15
- Old Lantern resolver integration: PR #16
- Common/flooded pack: PR #8
- Fungal pack: PR #4
- Spider pack: PR #6
- Laboratory pack: PR #9
- Royal/sanctum entry pack: PR #10

## Completion definition

Developer #3 work is complete when the matrix contains no `Not started` or partial rows, issue #19 is closed, and the aggregate placement audit passes on `main`.