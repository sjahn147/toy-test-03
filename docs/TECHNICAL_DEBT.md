# Technical Debt Register

_Last verified against `main` at merge of PR #42 on 2026-07-13._

This document records debt that remains after the committed strategic-expansion, camp-life, logistics, world-status, faction-outpost, regression-repair, worksite-presentation, Residential Quarter, Industrial Corridor, Ossuary Cathedral, Central Cross-Market, and Red-Tusk Barracks landmark slices. It intentionally separates finished work from active debt so completed features are not repeatedly reimplemented.

## Status legend

- **P0** — blocks campaign completion or invalidates core runtime behavior.
- **P1** — high-value product or architecture debt that should follow the P0 campaign track.
- **P2** — quality, performance, maintainability, or tooling debt.
- **Tracked elsewhere** — an issue or PR already owns the implementation; this register records integration risk and completion conditions only.

## Committed baseline — not debt

The following capabilities are already on `main` and should be extended rather than rebuilt:

- Strategic party relay camps and monster forward-outpost expansion.
- Camp-life activities with authored anchors, recovery effects, sentry coverage, monster rest, and outpost maintenance.
- Timed cargo unloading and timed material-handling/building activities.
- Logistics route risk, rerouting, escorting, ambushes, raids, and route metrics.
- Terminal settlement-collapse guard and focused Phase 7–8 regression gate.
- Stable application-facing `DungeonSimulation`, `StrategyObserverScreen`, `StrategyDungeonRenderer`, and `StrategyAssetRegistry` facades.
- World ownership/control fields, contested overlays, supply-route rendering, and activity beacons.
- Faction-specific forward-outpost dioramas.
- Physical worksite presentation: scaffolds, stored materials, pulley/load motion, and cargo lowering at unloading anchors.
- Industrial Corridor (D16, D17, D18, D20), Ossuary Cathedral (E21–E25), Residential Quarter (B06–B10), Central Cross-Market (I41–I45), and Red-Tusk Barracks (J46–J48) dedicated landmark recipes — all 63/63 Sleeping Citadel rooms now resolve to a dedicated recipe (verified by `tests/campaign-map-integration-audit.mjs`, which now dynamically checks every registered zone pack instead of a hardcoded baseline).
- Frame-rate-independent miniature damping and species-specific movement, attack, and death presentation for the currently supported families.

## P0 — Campaign map completion

### TD-CAMPAIGN-01: Dedicated landmark coverage — RESOLVED

**Status: closed 2026-07-13.** All 63/63 Sleeping Citadel rooms now resolve to a dedicated landmark recipe. `tests/campaign-map-integration-audit.mjs` asserts `missing.length === 0` and `dedicated.length === 63` as a hard regression gate (it previously hardcoded a stale 46-dedicated/17-missing baseline from before Industrial Corridor, Ossuary Cathedral, Central Cross-Market, and Red-Tusk Barracks existed, and silently kept "passing" against that stale number because it didn't import those packs' recipe lists — fixed alongside this closure so the test now dynamically reflects every registered zone pack).

**Completion condition (met)**

- 63/63 manifest bundles resolve to dedicated runtime recipes. ✓
- No production room silently omits its authored landmark. ✓ (verified via `Phase8AssetResolver` + the audit's own manifest walk)
- Every declared state has a visibly distinct, reachable runtime presentation — verified per-pack by each zone's own smoke test; not independently re-verified in a live browser across all 63 rooms simultaneously (see TD-QA-02).

### TD-CAMPAIGN-02: Physical layout is generated, not authored

**Current state**

The campaign graph is connected, but room placement still relies on deterministic packing rather than authored coordinates, orientations, ports, and corridor paths.

**Debt**

- Corridors do not reliably avoid rooms, other corridors, or landmark footprints.
- Doors are not consistently attached to authored ports.
- The map reads as packed independent rooms rather than one physical dungeon.

**Completion condition**

- Fixed room coordinates and orientation for all 63 rooms.
- Authored ports and routed corridor polylines.
- Automated room, corridor, and landmark intersection checks.
- Ordinary links support legal two-way movement through their authored openings.

### TD-CAMPAIGN-03: Placement systems do not share one clearance contract

**Current state**

Landmarks, settlement props, camps, construction structures, outposts, activity anchors, and traversal cells are authored by separate systems.

**Debt**

There is no single compositor that reserves door clearance, traversal lanes, large-creature widths, staging areas, semantic interaction sockets, and dynamic structure footprints before placement.

**Completion condition**

- A placement compositor owns reserved lanes and footprints.
- System props cannot overlap critical landmarks or permanently block campaign routes.
- Ogre-sized and party-group traversal widths are validated.
- Semantic sockets are used consistently for interaction, work, guard, rest, and combat staging.

### TD-CAMPAIGN-04: Conditional and secret routes are flattened

**Current state**

Conditional and secret links are represented in authored content but are not fully enforced as distinct live route states.

**Debt**

- Hidden routes may behave as ordinary graph edges.
- Locked routes do not consistently alter pathfinding and logistics.
- Route-state changes do not have one authoritative graph rebuild path.

**Completion condition**

- Hidden/discovered and locked/opened states are explicit.
- Renderer, pathfinding, movement, supply routes, and AI consume the same active graph.
- Route transitions rebuild or invalidate derived navigation safely.

### TD-CAMPAIGN-05: Campaign state is only partially wired into room visuals

**Debt**

Territory, settlement condition, ecology, construction, route state, campaign milestones, and landmark-specific state are not yet composed through one visual-state resolver for every room.

**Completion condition**

- Every declared state variant is reachable from a real runtime transition.
- State priority and conflict resolution are deterministic and tested.
- Campaign landmarks, dynamic structures, overlays, and activity props remain spatially coherent after state changes.

## P1 — Open branch and integration debt

### TD-INTEGRATION-01: Draft PR #29 must be integrated against the current main

**Current state**

PR #29 is currently reported mergeable, but its base predates the committed regression repairs, world-status renderer, faction outposts, and worksite presentation.

**Debt**

A clean merge result alone does not prove compatibility. The branch changes campaign asset resolution, production gates, package scripts, and landmark coverage while `main` has continued to evolve.

**Required integration checks**

- Rebase or rebuild on current `main` before final merge.
- Preserve stable strategy renderer and registry composition.
- Run campaign coverage, production content, placement, world-status, operations, worksite, and miniature gates together.
- Perform a browser smoke of B06–B10 with dynamic camps, outposts, construction props, and overlays present.

### TD-INTEGRATION-02: Draft PR #23 is superseded in architecture but still owns useful UX

**Current state**

PR #23 is conflicted and predates the committed `WorldStatusOverlayRenderer`. Its independent rendering implementation now overlaps the newer world-status layer.

**Debt**

The useful toolbar, keyboard shortcuts, responsive controls, non-color state markers, and Territory/Supply/Danger mode UX have not been ported to the current renderer.

**Disposition**

- Do not merge PR #23 wholesale.
- Port only the interaction and accessibility layer onto the current `StrategyObserverScreen` and `WorldStatusOverlayRenderer` contracts.
- Close the old PR after the replacement slice lands.

**Completion condition**

- World, Territory, Supply, Danger, and Activity views have explicit controls.
- Current mode is represented by text/state as well as color.
- Keyboard and mobile interactions are covered.
- Layer filtering does not duplicate room geometry or leak materials.

## P1 — Simulation and presentation depth

### TD-OUTPOST-01: Outpost visuals are faction-specific; daily life is not fully profile-driven

**Current state**

Outpost profiles and faction-specific dioramas exist. Camp-life provides generic monster rest and maintenance behavior.

**Debt**

The profile-specific behavior vocabulary is not consistently expressed through decisions, props, anchors, poses, and recovery effects.

**Examples**

- Undead death vigil, bone sorting, and soul-flame tending.
- Goblin fire-circle planning, scrap sorting, and palisade repair.
- Orc weapon circles, drill, and war-totem rites.
- Kobold trap repair and workbench huddles.
- Fungal spore trance and bloom-pool tending.
- Spider hanging rest, feeding, wrapping, and web repair.

**Completion condition**

- One domain-oriented outpost-life system derives behavior from faction/species profile.
- No persistence-format fork is introduced solely for presentation.
- Activities use authored non-overlapping anchors and visible miniature/prop contracts.

### TD-COMBAT-01: Ranged attacks lack physical projectile presentation

**Debt**

Arrows and spells do not yet have pooled world-space projectiles with source, trajectory, impact, expiry, and hit synchronization.

**Completion condition**

- Arrow and spell projectile families are pooled.
- Impact timing follows authoritative combat metadata rather than guessed animation time.
- Offscreen and expired projectiles are cleaned deterministically.

### TD-COMBAT-02: Combat presentation still depends on prototype patching

**Debt**

`CombatPresentationBridge` should be replaced by native combat event metadata emitted at the simulation boundary.

**Completion condition**

- Attack, hit, projectile, downed, death, and recovery events have stable metadata contracts.
- Presentation subscribes without monkey-patching simulation prototypes.
- Existing damage and AI semantics remain unchanged.

## P1 — Stable architecture migration

### TD-ARCH-01: Stable facades still subclass phase-numbered implementations

**Evidence**

- `DungeonSimulation` extends `DungeonSimPhase8`.
- `StrategyObserverScreen` extends `ObserveScreenPhase8`.
- `StrategyDungeonRenderer` and `StrategyAssetRegistry` still wrap phase-numbered internals.

**Debt**

The public API is stable, but composition order, scenario transformation, rendering lifecycle, and subsystem ownership remain coupled to historical implementation-stage classes.

**Migration rule**

Do not perform a mass rename. Move one responsibility at a time behind stable domain-oriented modules while retaining compatibility tests.

**Completion condition**

- New application code imports only stable modules.
- Scenario preparation has one stable pipeline.
- Simulation subsystem ordering and renderer lifecycle are explicit in stable composition roots.
- Phase-numbered modules become compatibility adapters and can eventually be removed without feature rewrites.

### TD-ARCH-02: Scenario transformation order is distributed

**Debt**

Facilities, ecology, territories, spatial scaling, prop layout, and campaign compilation can be applied through multiple historical paths. Recent campaign-entry fixes demonstrate that order and idempotency remain fragile.

**Completion condition**

- Introduce one `prepareStrategyScenario`-style entrypoint.
- Each transformation declares idempotency and pre/postconditions.
- Generated-map and authored-campaign scenarios use the same stable contract.
- Regression tests cover already-scaled and not-yet-scaled inputs.

## P2 — Visual QA and regression tooling

### TD-QA-01: No deterministic browser gallery for miniature states

**Tracked by**

Issue #24.

**Debt**

There is no deterministic fixture that freezes supported miniatures at idle, walk, windup, strike, recovery, hit, downed, and death timestamps.

**Completion condition**

- Stable gallery fixtures for each role/species/state.
- Playwright screenshots at 1440×900, 1024×768, and 390×844.
- Intentional baseline-update process.

### TD-QA-02: Campaign browser QA is incomplete

**Debt**

Node smoke tests validate contracts but cannot detect camera clipping, unreadable density, landmark overlap, corridor occlusion, responsive UI failure, or visual hierarchy problems.

**Completion condition**

- Browser flythrough for all zones.
- A01-to-M63 movement validation.
- Long-run simulation soak with overlays, camps, outposts, logistics, and construction enabled.
- Screenshot coverage for representative quiet, occupied, contested, besieged, and collapsed states.

### TD-QA-03: Legacy red CI tracks are not classified

**Debt**

The repository contains focused green gates alongside known unrelated red workflows. Without ownership and classification, contributors cannot distinguish a real regression from stale infrastructure.

**Completion condition**

Every red workflow is classified as one of:

1. required and repaired,
2. required but quarantined with an owner and deadline,
3. superseded and removed,
4. environment-dependent and documented.

Focused gates must remain, but they should not be used as a permanent substitute for a trustworthy aggregate gate.

## P2 — Performance and resource budgets

### TD-PERF-01: No explicit large-map rendering budget

**Debt**

World overlays, 63-room landmarks, animated outposts, worksite scaffolds, dynamic activity props, cargo, projectiles, and miniatures can accumulate without a documented draw-call, mesh, material, and animation budget.

**Completion condition**

- Record representative draw calls, triangles, live materials, and animated objects.
- Skip or reduce offscreen animation.
- Add LOD or aggregation where measurements justify it.
- Verify disposal after state replacement and screen destruction.

### TD-PERF-02: Miniature LOD and offscreen animation skipping are absent

**Tracked by**

Issue #24.

**Completion condition**

- Offscreen agents do not run full presentation animation.
- Distant agents use reduced update frequency or simplified rigs.
- Simulation decisions remain independent of presentation throttling.

## Recommended execution order

1. ~~Integrate PR #29 onto the current main and land Residential Quarter B06–B10.~~ Done.
2. ~~Complete the remaining 8 landmark recipes (Central Cross-Market I41–I45, Red-Tusk Barracks J46–J48).~~ Done — 63/63 landmark coverage reached.
3. Implement authored layout, ports, corridors, and shared placement clearance.
4. Implement conditional/secret route state and active graph rebuilding.
5. Wire live campaign state into room visuals.
6. Port the useful strategy-overlay controls from PR #23 and close the superseded branch.
7. Add profile-driven outpost life.
8. Add native combat event metadata and pooled projectiles.
9. Add deterministic browser galleries, campaign flythrough, and screenshot regression.
10. Consolidate scenario preparation and progressively retire phase-numbered internals.
11. Classify legacy red CI and establish measured rendering budgets.

## Maintenance rules

- Update the verified `main` SHA and date whenever this register changes.
- Remove an item only when its completion condition is demonstrably satisfied on `main`.
- Link implementation PRs to the debt ID they retire.
- Do not add new phase-numbered production modules.
- Prefer stable facade extension and domain-oriented modules over parallel replacement stacks.
- A green source-contract test is necessary but not sufficient for browser-facing completion.
