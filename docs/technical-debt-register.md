# Current technical debt register

Last verified: 2026-07-12  
Baseline: `main` at `5dc6d77b55b2f6df7a5409e973ceeab1b1cc03fb`

This document records debt that remains after the committed strategy, simulation, campaign and presentation work. It is not a speculative roadmap. An item belongs here only when it is visible in the current code, an open tracker, or an unmerged branch that still contains relevant work.

## How to read this register

Priority means:

- **P0 — completion blocker:** the product cannot satisfy its declared campaign or runtime contract without it.
- **P1 — high-value structural debt:** the feature works, but the current implementation blocks safe extension, meaningful UX, or reliable validation.
- **P2 — quality and scale debt:** the prototype works, but presentation, performance or maintainability remains below the intended production standard.
- **P3 — cleanup:** useful consolidation that should not displace P0 or P1 delivery.

Status means:

- **Committed:** present on `main` and should not be planned as missing work.
- **Partial:** a working slice exists, but the acceptance contract is incomplete.
- **Unmerged:** implementation exists only in an open branch or PR and must be reconciled with current `main`.
- **Missing:** no accepted implementation exists on `main`.

## Committed baseline — do not reopen as missing work

The following capabilities are already committed:

1. **Manifest-to-runtime campaign compilation**
   - `src/content/ScenarioCompiler.js` compiles the Sleeping Citadel manifest into the legacy scenario shape.
   - The compiler preserves secret and conditional link metadata, emits factions, agents, lairs and landmark bundle references, and marks the result as already spatially scaled.
   - The remaining debt is runtime route-state behavior and removal of compatibility mappings, not creation of a first compiler.

2. **Stable application-facing composition points**
   - `DungeonSimulation`, `StrategyObserverScreen`, `StrategyDungeonRenderer` and `StrategyAssetRegistry` exist as named entry points.
   - New work must extend these named modules or compose new systems beneath them. It must not introduce `Phase9`, `Phase10`, or another historical inheritance layer.

3. **Strategic simulation foundation**
   - Territory, settlements, physical cargo, route risk, escorts, construction, siege, strategic expansion and camp life are implemented.
   - Terminal settlement collapse and the Phase 7–8 regression boundary have dedicated fixes and tests.

4. **Visible operations and strategic state**
   - Cargo unloading and construction are timed activities.
   - Worksites have physical scaffolds, materials, pulleys and progress-driven presentation.
   - World ownership, control, contested state, supply routes, activity beacons and faction outpost dioramas are rendered.

5. **Miniature motion baseline**
   - Frame-rate-independent damping, stale attack-effect rejection, species-specific locomotion emphasis and species-specific death presentation are committed.

Any new tracker or PR should reference these committed foundations rather than reimplementing them in parallel.

## Debt register

### TD-01 — Complete the 63-room Sleeping Citadel physical campaign map

- **Priority:** P0
- **Status:** Partial on `main`; additional work is unmerged in PR #29
- **Owner/tracker:** Issue #28

Current `main` compiles all 63 rooms and has a connected abstract graph, but the physical campaign map is not complete. The authoritative tracker records 41/63 dedicated runtime landmark recipes on the committed baseline. The remaining rooms can silently fall back rather than rendering their specified landmark.

PR #29 contains the Residential Quarter B06–B10 slice and would move dedicated coverage to 46/63, but it was built from an older baseline and must be reconciled with the current strategy renderer, world overlays and worksite presentation before merge.

Remaining dedicated landmark groups after the Residential Quarter slice:

- Industrial Corridor: D16, D17, D18, D20
- Ossuary Cathedral: E21–E25
- Central Cross-Market: I41–I45
- Red-Tusk Barracks: J46–J48

**Exit criteria**

- 63/63 manifest landmark bundles resolve to dedicated runtime recipes.
- Production does not silently omit a declared landmark or use a diagnostic marker.
- Every recipe has a stable resolver owner, visual-state contract, animation lifecycle and disposal path.
- PR #29 is either rebased and reduced to a mergeable current slice or superseded and closed.

### TD-02 — Replace packed layout with an authored traversable dungeon layout

- **Priority:** P0
- **Status:** Missing
- **Owner/tracker:** Issue #28

`ScenarioCompiler` currently obtains room centers through zone layout compatibility data. The result is deterministic, but it is not yet the authored physical dungeon required by the campaign contract.

Missing pieces:

- fixed room coordinates and orientation
- authored door/room ports
- corridor polylines routed around rooms, landmarks and other corridors
- ordinary, conditional and secret link visual distinction
- overlap, clearance and corridor-crossing validation
- large-creature and party staging widths

**Exit criteria**

- Every connection enters through authored ports.
- No corridor crosses a room or landmark footprint except through an authored port.
- Ordinary connections support legal two-way movement.
- Ogre-size actors and normal groups can traverse every required campaign route.
- Layout validation runs in CI and fails on overlap or blocked-route regressions.

### TD-03 — Make conditional and secret routes real runtime state

- **Priority:** P0
- **Status:** Partial metadata only
- **Owner/tracker:** Issue #28

The compiler preserves `secretLinks` and conditional-link metadata, but it also includes those connections in the legacy open `links` graph because the runtime has no route gate. They therefore remain traversable as ordinary links.

Required work:

- locked/opened state for conditional routes
- hidden/discovered state for secret routes
- presentation for hidden, discovered, locked and opened states
- pathfinding and logistics graph rebuild when route state changes
- save/snapshot support for route state
- tests proving agents and cargo cannot cross unavailable routes

**Exit criteria**

- A hidden or locked route is absent from active traversal and logistics graphs.
- Discovery or unlocking updates the active graph without rebuilding the entire simulation.
- Snapshot and restore preserve route state.

### TD-04 — Add a placement compositor for landmarks and simulation props

- **Priority:** P0
- **Status:** Missing as a shared system
- **Owner/tracker:** Issue #28

Landmarks, settlements, camps, forward outposts, defenses, resources and worksites are produced by separate systems. Individual features use placements and anchors, but there is no shared room-level compositor that reserves critical lanes and arbitrates all footprints.

Risks:

- a later settlement, camp or defense can overlap a campaign landmark
- a construction site can consume a door-clearance or staging lane
- semantic interaction sockets are not the common placement authority
- route legality can differ from what the rendered room appears to permit

**Exit criteria**

- Every room publishes reserved door lanes, traversal lanes, landmark footprints and semantic sockets.
- Dynamic systems request placement through one occupancy/composition contract.
- Placement rejection has a deterministic fallback rather than silent overlap.
- CI includes campaign-wide placement and traversal audits.

### TD-05 — Reconcile obsolete long-running PRs with current `main`

- **Priority:** P1
- **Status:** Unmerged

Two open PRs contain useful work but must not be merged wholesale without reconciliation:

1. **PR #29 — campaign map integration and Residential Quarter**
   - useful: 63-room audit and B06–B10 asset pack
   - risk: large 31-commit branch created before the latest stable strategy renderer, world overlays and worksite layer
   - action: rebase or transplant one bounded work package, run current production/asset/world-status/worksite gates, then close or supersede the old PR

2. **PR #23 — strategy overlay toolbar**
   - useful: selectors, accessible toolbar, keyboard shortcuts and explicit Territory/Supply/Danger modes
   - risk: its rendering layer predates the committed `WorldStatusOverlayRenderer`; direct merge would duplicate overlay ownership and remove newer code
   - action: port only the UI state, selectors, accessibility and controls into the current overlay architecture, then close the old PR

**Exit criteria**

- No open long-running PR remains the only home of production-required code.
- Superseded PRs are closed with a link to the replacement.
- Current `main` remains the only authoritative integration baseline.

### TD-06 — Add controllable strategy overlay UX

- **Priority:** P1
- **Status:** Partial

The current world-status layer renders useful ownership, contested, supply and activity information, but it is primarily always-on presentation. It lacks a complete observer control surface.

Required work:

- World / Territory / Supply / Danger / Activity modes or equivalent layer toggles
- legend and non-color state cues
- observed-faction and selected-room filtering
- mobile-safe controls
- keyboard shortcuts with focus-safe behavior
- selector/view-model ownership rather than direct simulation traversal

PR #23 is a reference implementation for UX intent, not a safe merge source.

**Exit criteria**

- Overlay state is controlled through the application/view-model boundary.
- The renderer receives normalized overlay data and visibility settings.
- All modes are usable by keyboard and on narrow screens.

### TD-07 — Replace generic outpost rest with faction-specific outpost life

- **Priority:** P1
- **Status:** Partial

Faction-specific outpost profiles and dioramas are committed, but most behavioral life at those sites still resolves through generic monster rest or maintenance activities.

Required slices include:

- undead death-vigil and bone-reliquary tending
- goblin fire-circle, salvage sorting and palisade repair
- orc weapon-circle, drill and war-totem ritual
- kobold trap repair and workyard huddle
- fungal spore-trance and bloom tending
- spider hanging rest, feeding and web repair

**Preferred boundary**

- introduce an `OutpostLifeSystem` or equivalent named system
- derive behavior from the existing outpost profile and settlement/faction state
- keep persistence compatible unless new state is genuinely required
- provide authored anchors, props and miniature poses through presentation factories

**Exit criteria**

- Each major outpost family has at least one distinct rest and one distinct maintenance/social routine.
- Activities affect real recovery, readiness, integrity or control values.
- Combat, travel and destruction interrupt activities safely.

### TD-08 — Finish combat presentation and remove prototype patching

- **Priority:** P1
- **Status:** Partial
- **Owner/tracker:** Issue #24

The miniature animation baseline is improved, but the following debt remains:

- deterministic gallery fixtures for idle, walk, windup, strike, recovery, hit, downed and death
- real arrow and spell projectiles with pooling and synchronized impact
- dedicated kobold visual recipe if it still resolves through a goblin fallback
- replacement of `CombatPresentationBridge` prototype patching with native event metadata
- consolidation of role and weapon layers into a pose graph with one final damping pass

**Exit criteria**

- Projectile launch, travel and impact are driven by authoritative combat event timestamps.
- No presentation behavior depends on runtime prototype mutation.
- Every supported role/species can be inspected in a deterministic gallery state.

### TD-09 — Establish browser-level visual regression and campaign soak validation

- **Priority:** P1
- **Status:** Missing
- **Owner/tracker:** Issues #24 and #28

Most current gates are Node smoke and source-contract tests. They protect composition and semantics but do not prove that the rendered Three.js scene remains legible.

Required work:

- Playwright screenshots at 1440×900, 1024×768 and 390×844
- deterministic miniature gallery screenshots
- representative campaign-room and overlay screenshots
- camera clipping and panel-overflow checks
- A01-to-M63 navigation test
- long-running campaign soak with snapshot calls
- mesh, geometry and material lifetime assertions where practical

**Exit criteria**

- Visual baselines run in CI with deterministic fixtures.
- Mobile and desktop observer surfaces remain usable.
- The campaign can navigate from entry to final room under the intended route-state configuration.
- A long soak does not show unbounded scene-object growth.

### TD-10 — Retire the `Phase*` compatibility chain incrementally

- **Priority:** P2
- **Status:** Partial

Stable named facades exist, but the application still delegates major behavior to historical classes such as `ObserveScreenPhase8`, `DungeonSimPhase8`, `DungeonRendererPhase8` and `AssetRegistryPhase8`. The compiler also contains explicit Phase compatibility behavior and legacy mapping tables.

This is not a rename task and must not become a big-bang rewrite.

Required sequence:

1. keep stable public imports as the only imports used by application code
2. move one responsibility at a time into named modules
3. add contract tests before removing each inherited behavior
4. remove compatibility inheritance only after no application entry point imports the historical class
5. delete obsolete guards and mappings only after campaign fixtures prove equivalence

**Exit criteria**

- Application code imports only stable named entry points.
- Historical classes are isolated behind adapters or removed.
- No new phase-numbered module is introduced.
- Scenario preparation is owned by a named pipeline rather than a chain of `applyPhase*` calls.

### TD-11 — Remove manifest/runtime duplication from legacy mappings

- **Priority:** P2
- **Status:** Partial

`ScenarioCompiler` relies on `legacyMappings.js` for zone grids, descriptive kind mapping, faction runtime bindings, wildlife bindings, lair defaults and party role names because the manifest is not runtime-complete.

This keeps migration safe, but it creates two authorities for campaign content.

**Exit criteria**

- Runtime-required faction, lair, species, starting-agent, zone-layout and route metadata is represented in validated content data or a clearly versioned runtime profile.
- The compiler reports unsupported content rather than silently substituting broad defaults.
- Compatibility mappings shrink monotonically and have removal tests.

### TD-12 — Complete authored asset and ambience production

- **Priority:** P2
- **Status:** Missing/partial by asset family

Procedural composites are the official fallback and should remain supported. The binary `assets/` inventory, however, is still largely a backlog.

Remaining production areas include:

- authored campaign zone architecture
- selected hero landmark models and textures
- UI icon atlas
- ambience and interaction audio
- licenses and source attribution
- zone lighting, fog and transition dressing

**Exit criteria**

- Every authored binary has a catalog entry, fallback, license and source record.
- Missing binaries degrade to the procedural composite rather than a primitive or diagnostic marker.
- Asset loading and release are covered by integration tests.

### TD-13 — Add explicit performance budgets

- **Priority:** P2
- **Status:** Missing

The committed world overlays, faction outposts, worksites, campaign landmarks and animated miniatures increase scene complexity. No shared production budget currently defines acceptable draw calls, animated actors, offscreen work or scene-object growth.

Required work:

- representative room and whole-campaign draw-call budgets
- LOD or simplified distant representations
- offscreen animation skipping
- pooled projectiles/effects
- overlay aggregation for large maps
- instrumentation surfaced in development metrics

**Exit criteria**

- Budgets are measured in deterministic benchmark scenarios.
- CI or a documented profiling gate catches major regressions.
- Offscreen and distant entities do materially less work.

### TD-14 — Classify the CI surface and remove knowingly obsolete red tracks

- **Priority:** P2
- **Status:** Partial
- **Owner/tracker:** Issue #24 also records this cleanup need

The repository has many feature-specific workflows. Recent work has correctly used focused regression gates, but the overall CI surface still contains historical tracks whose ownership and blocking status are unclear.

Required work:

- classify workflows as merge-blocking, focused/non-blocking, scheduled, or obsolete
- eliminate duplicate phase-era checks after their contracts move into stable gates
- document known environmental failures rather than normalizing permanent red status
- provide one production gate that composes authoritative content, runtime, presentation and campaign checks

**Exit criteria**

- Every workflow has an owner and declared blocking policy.
- `main` does not remain knowingly red because of obsolete tests.
- Focused feature gates remain available without duplicating the full suite.

### TD-15 — Keep documentation synchronized with committed runtime state

- **Priority:** P2
- **Status:** Active debt

Before this register, root and documentation index text still described `ContentRegistry`, `ScenarioCompiler` and `AssetResolver` entirely as future work, despite the compiler and asset-resolution path being present on `main`. Reading-order diagrams also pointed directly to compatibility classes instead of the stable facades.

**Exit criteria**

- Each architectural milestone updates `README.md`, `docs/README.md` and this register in the same change.
- Completed debt is moved to the resolved log below rather than left as an unchecked future requirement.
- Tracker issues remain implementation authorities; this document remains the cross-cutting integration view.

## Recommended execution order

The ordering below minimizes parallel conflicts and avoids polishing systems that will be displaced by map integration.

1. **Reconcile PR #29 and merge the Residential Quarter as a bounded current-main slice.**
2. **Complete remaining dedicated landmark packs to reach 63/63.**
3. **Implement authored layout, ports, routed corridors and placement composition.**
4. **Implement real conditional/secret route state and active graph rebuilding.**
5. **Port overlay controls from PR #23 into the current world-status architecture; close PR #23.**
6. **Add browser screenshot, A01-to-M63 traversal and soak gates.**
7. **Implement faction-specific outpost life and combat projectile presentation.**
8. **Reduce Phase compatibility and legacy mapping debt one contract at a time.**
9. **Add performance budgets and finish CI classification.**

## Resolved log

Keep resolved entries here briefly so future work does not reopen them from stale plans.

- **2026-07-12 — strategic expansion and camp life:** merged in `4a743ed2ea93a45ff16b031cf4e7f209592dc216`.
- **2026-07-12 — timed logistics and construction operations plus stable simulation/screen facades:** merged in `1c28932e7f87bb63dc8a3124810dc2a3b2fda8aa`.
- **2026-07-12 — territory, settlement and logistics regression repair:** merged in `41280520bafb3a8805c683630cff275a4a5a7865`.
- **2026-07-12 — world-status overlays and faction-specific outpost dioramas:** merged in `35bfe4113ed809676c60bcc94dbd93383c9adab1`.
- **2026-07-12 — physical worksite and cargo-unloading presentation:** merged in `5dc6d77b55b2f6df7a5409e973ceeab1b1cc03fb`.

## Update rule

When changing this document:

1. verify the latest `main` commit rather than relying on an old PR description
2. distinguish committed, partial, unmerged and missing work
3. link detailed implementation debt to its authoritative issue
4. do not mark a debt resolved until its acceptance tests are on `main`
5. record superseded PRs explicitly so future agents do not merge stale architecture
