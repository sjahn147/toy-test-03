# Developer #3 — Sleeping Citadel Campaign Map Integration

Status: **active**  
Owner: **Developer #3**  
Authoritative tracker: **Issue #28**

## 1. Anchor judgment

The Sleeping Citadel is content-loadable and simulation-capable, but it is not yet a finished physical campaign map.

The repository currently compiles all 63 manifest rooms and builds a connected abstract graph. The prior Developer #3 completion work delivered the requested 16 landmark assets and verified their resolver/renderer contracts. That audit did **not** establish that all 63 rooms had dedicated assets, that corridors formed a natural traversable map, or that campaign state drove the declared visual variants.

Current baseline:

- 63/63 manifest rooms compile.
- 41/63 rooms have a dedicated runtime landmark recipe.
- 22/63 rooms have a `landmarkBundle` in the manifest but no dedicated runtime recipe.
- Missing recipes are silently omitted by `DungeonRendererPhase8`; these rooms fall back to generic room architecture and incidental system props.
- Room floors, walls, doors and corridors still use the legacy generic registry path rather than the Phase 8 common/zone architecture packs.
- Zone layout is deterministic shelf-packing, not an authored dungeon layout.
- Corridor routing is a simple orthogonal connection between automatically selected wall ports and does not avoid other rooms, corridors or landmark footprints.
- Conditional and secret connections are currently flattened into ordinary open runtime links.
- Landmark footprint, door clearance, traversal lanes, system props, camps, settlements and defenses are not composed by one placement system.
- Most landmark visual states exist as geometry contracts but are not driven by campaign milestones or live simulation state.

This document supersedes any reading of the earlier Developer #3 handoff that implied the entire 63-room campaign map was complete.

## 2. Missing dedicated landmark coverage

### Zone B — Abandoned Residential Quarter

- B06 Broken Dormitory
- B07 Communal Kitchen
- B08 Laundry Cistern
- B09 Tenement Court
- B10 Household Chapel

### Zone D — Industrial Corridor

- D16 Abandoned Workshop
- D17 Iron Scrap Room
- D18 Copper-Tail Trapworks
- D20 Powder Magazine

D19 Brass Button Market is already implemented.

### Zone E — Ossuary Cathedral

- E21 Bone Cloister
- E22 Funeral Chapel
- E23 Ossuary Shelves
- E24 Nameless Tomb
- E25 Well of Last Names

The ecology props in E22/E23 are not substitutes for room-scale landmark dioramas.

### Zone I — Central Cross-Market

- I41 Grand Crossroads
- I42 Dead Customs House
- I43 Ruined Auction Hall
- I44 Neutral Well
- I45 Smuggler's Way

The former I41 work in superseded PR #3 is not present on `main`.

### Zone J — Red-Tusk Barracks

- J46 Drill Yard
- J47 War Armory
- J48 Meat Store

J49 Red Pit Arena and J50 Chieftain Hall are already implemented.

## 3. Work packages

### WP0 — Authoritative 63-room audit

- Add a deterministic report for all room bundles and recipe ownership.
- Track dedicated, missing and fallback coverage separately.
- Verify manifest endpoints and abstract graph connectivity.
- Record conditional and secret links as unresolved runtime gates rather than treating their existence as completed behavior.
- Prevent regression below the current 41-room dedicated baseline.

### WP1 — Complete 63/63 dedicated landmarks

Implement and register:

1. `ResidentialQuarterAssetPack` — B06–B10
2. `IndustrialCorridorAssetPack` — D16–D18, D20
3. `OssuaryCathedralAssetPack` — E21–E25
4. `CentralMarketAssetPack` — I41–I45
5. `OrcBarracksAssetPack` — J46–J48

Every room requires a recognizable composite diorama, state-specific structural changes, a valid footprint, semantic sockets and production smoke coverage.

### WP2 — Authored physical layout

Replace final reliance on shelf-packing with campaign-authored placement data:

- room coordinates, floor and rotation
- authored ports per connection
- corridor polylines and widths
- ordinary/conditional/secret route presentation
- overlap and corridor-crossing validation
- camera landmarks and zone transitions

### WP3 — Placement compositor and traversal clearance

Create one placement boundary that accounts for:

- landmark footprint and orientation
- door clearance
- reserved traversal lanes
- interaction and staging sockets
- system prop exclusion zones
- settlement, camp and defense placement
- large-unit and group movement widths

### WP4 — Live state and route wiring

Drive room presentation and graph state from:

- territory ownership and contest
- settlement tier and structural integrity
- ecology infestation
- construction and siege state
- boss state and campaign milestones
- conditional route unlocks
- secret route discovery

Pathfinding, logistics and rendering must consume the same active graph.

### WP5 — Zone architecture and presentation QA

- Route floor, wall, door and corridor creation through the Phase 8 common architecture boundary.
- Apply zone kits, lighting, fog, debris and transition dressing.
- Run an A01-to-M63 navigation smoke.
- Run long-duration movement and placement soak tests.
- Complete browser flythrough and screenshot review at campaign camera distances.

## 4. Completion contract

This track is complete only when:

- all 63 manifest landmark bundles resolve to dedicated runtime recipes;
- production does not silently omit landmarks or show diagnostic fallback markers;
- all ordinary routes support legal two-way movement;
- conditional and secret routes obey authored state;
- corridors do not cross rooms or landmark exclusion zones except through authored ports;
- every room has usable entry lanes and staging space;
- system props and dynamic structures do not overlap critical landmarks or permanently block the campaign route;
- every declared visual state is reachable through runtime state transitions;
- browser review confirms that the world reads as a coherent dungeon rather than a shelf-packed collection of rooms.

## 5. Progress log

| Date | Work package | Result |
|---|---|---|
| 2026-07-12 | Track anchor | Issue #28 opened and this document committed. |
| 2026-07-12 | WP0 | 63-room baseline audit started. |
