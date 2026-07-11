# Developer #3 — Sleeping Citadel campaign landmark completion

## Mission and result

Developer #3 owns the remaining procedural landmarks required to turn the Sleeping Citadel from a mostly empty campaign map into a stateful, visually legible dungeon. The asset-development and runtime-wiring work is complete. The final placement audit verifies manifest alignment, resolver registration, renderer state replacement, placement transforms, animation lifecycle and resource disposal contracts.

Authoritative tracker: [GitHub issue #19](../../issues/19)

## Completion matrix

| Priority | Room | Bundle | States | Asset | Runtime | Placement | Implementation |
|---|---|---|---|---|---|---|---|
| P0 | D19 Brass Button Market | `industry.goblin.market` | goblin-market / neutral-market / orc-taxed / burned | Done | Done | Verified | PR #21 + final audit |
| P0 | J49 Red Pit Arena | `orc.arena.red-pit` | matches / chieftain-challenge / liberated | Done | Done | Verified | PR #21 + final audit |
| P0 | J50 Chieftain Hall | `orc.hall.chieftain` | tribal-court / war-council / leaderless | Done | Done | Verified | PR #21 + final audit |
| P0 | M62 Circular Sanctum | `sanctum.circular` | dormant / ritual-active / fractured | Done | Done | Verified | PR #21 + final audit |
| P0 | M63 Heart Chamber | `sanctum.heart.chamber` | sleeping / awakened / claimed / collapsed | Done | Done | Verified | PR #21 + final audit |
| P1 | K54 Failed Summoning Room | `laboratory.summoning.failed` | dormant / breached / stabilized | Done | Done | Verified | PR #21 + final audit |
| P1 | K55 Emergency Way | `laboratory.emergency.way` | sealed / opened / collapsed | Done | Done | Verified | PR #21 + final audit |
| P1 | L57 Crown Vault | `royal.vault.crown` | sealed / opened / stripped | Done | Done | Verified | PR #21 + final audit |
| P1 | L58 Shattered Banquet Hall | `royal.banquet.shattered` | haunted / occupied / restored-feast | Done | Done | Verified | PR #21 + final audit |
| P1 | L60 Royal Bedchamber | `royal.bedchamber` | sealed / searched / sanctuary | Done | Done | Verified | PR #21 + final audit |
| P1 | C12 Granary of Quiet Teeth | `flooded.granary.quiet-teeth` | sealed / rat-dominated / restored | Done | Done | Verified | PR #21 + final audit |
| P1 | C13 Flooded Wine Cellar | `flooded.wine-cellar` | flooded / drained / fermenting-colony | Done | Done | Verified | PR #21 + final audit |
| P1 | F27 Rotten Glasshouse | `fungal.glasshouse.rotten` | overgrown / cultivated / shattered | Done | Done | Verified | PR #21 + final audit |
| P1 | F29 Sleeping Gardener's Chamber | `fungal.gardener.chamber` | sleeping / awakened / consumed | Done | Done | Verified | PR #21 + final audit |
| P1 | G32 Host Vault | `spider.vault.hosts` | occupied / rescued / empty-cocoons | Done | Done | Verified | PR #21 + final audit |
| P1 | G33 Spawning Gallery | `spider.gallery.spawning` | brooding / overpopulated / destroyed | Done | Done | Verified | PR #21 + final audit |

## Implemented asset system

The completion pack provides 16 manifest-matched recipes and dedicated room builders. Shared code is limited to material helpers, deterministic animation, explicit state overlays and resolver registration.

- D19: market stalls, stolen-goods island, faction occupation, neutral charter, tax checkpoint and burned market
- J49: combat pit, spectator tiers, fighter gates, chieftain challenge and liberation state
- J50: war throne, trophy wall, council table, tribal court and leaderless hall
- M62: nested ritual rings, faction altars, active ritual and fracture rifts
- M63: suspended heart, artery bridges, awakened pulse, claim standards and collapse state
- K54/K55: summoning breach, stabilizers, blast door, escape rails and collapse route
- L57/L58/L60: crown vault, banquet hall and royal bedchamber state families
- C12/C13: granary and wine cellar occupation, restoration, flooding and fungal states
- F27/F29: glasshouse cultivation and gardener chamber story states
- G32/G33: host rescue and spider nursery lifecycle states

All declared state variants have explicit structural, occupation, hazard or campaign-resolution overlays. Default and alternate states are not intentionally represented by identical scenes.

## Runtime and placement contracts

The final audit fixes the following requirements:

1. Every target manifest `landmarkBundle` matches one recipe and one room.
2. Recipe state lists equal manifest `stateVariants`.
3. Every declared state has an explicit visual overlay.
4. Footprints fit the manifest room dimensions.
5. `Phase8AssetResolver` registers the completion pack and owns animation state.
6. `AssetRegistryPhase8` exposes create, recipe, animate and release methods.
7. `DungeonRendererPhase8` consumes `landmarkBundle`, uses `visualState`/`stateVariant`, includes state in its signature and replaces changed roots.
8. Placement applies room coordinates plus recipe offset, rotation and scale.
9. Removed or replaced landmarks call resolver release and geometry/material disposal.
10. Both asset and placement audits run through `test:production`.

## Files to extend in future

- `src/engine/CampaignCompletionLandmarkRecipes.js`
- `src/engine/CampaignCompletionDioramas.js`
- `src/engine/CampaignCompletionStateOverlays.js`
- `src/engine/CampaignCompletionAssetPack.js`
- `tests/campaign-completion-assets-smoke.mjs`
- `tests/campaign-landmark-placement-audit.mjs`

Do not add new `Phase9` inheritance layers or bypass `Phase8AssetResolver`. Simulation-specific boss and campaign-resolution logic remains separate from Three.js asset construction.

## Validation boundary

The automated audit verifies source and content contracts and is sufficient to declare the campaign map ready for placement and wiring. It does not replace a human browser flythrough for camera composition, occlusion, lighting balance or final art direction. Those are presentation QA rather than missing asset development.

## Merge history

- Resolver core: PR #12
- Runtime pack wiring: PR #15
- Old Lantern integration: PR #16
- Developer #3 tracker: PR #20
- Sixteen remaining landmarks: PR #21
- Placement and wiring audit: final Developer #3 audit PR

## Completion status

**Developer #3 landmark development is complete.** All 16 target rows are asset-complete, runtime-wired and placement-verified. Issue #19 may be closed after the final audit PR merges successfully.
