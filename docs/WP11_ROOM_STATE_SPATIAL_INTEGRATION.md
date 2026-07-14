# WP11 — Room State Intelligence and Spatial Integration

## Status

This document describes the implementation installed by the WP11 transactional package.

- Reviewed baseline: `0c65131597049ea8f41e6a17ca26ddefdfd1fbd3`
- Package mode: one transactional installer
- Runtime boundary: normalized `WorldSnapshot` and pure presentation selectors
- Compatibility: committed WP1–WP3, optional WP6 observer shell, optional WP10 camera shell

## Product goal

A room must communicate its strategic state without requiring the player to inspect several unrelated panels. Ownership, control direction, population, capacity, supply, danger, construction, environmental hazards, and spatial availability must be derived from one canonical room-state model.

```text
simulation and spatial facts
        ↓
normalized WorldSnapshot
        ↓
selectRoomStateMap()
        ↓
Navigator / Inspector / room badges / strategic overlays / room visuals
```

## Delivered modules

### Canonical room state

- `src/presentation/selectors/RoomStatePolicy.js`
- `src/presentation/selectors/selectRoomStateMap.js`
- `src/presentation/selectors/selectOverlayAvailability.js`

The selector combines live territory, settlements, agents, routes, cargo, sieges, construction jobs, environment tasks, props, effects, and spatial summaries. It returns plain serializable records keyed by room ID.

Important rules:

- Live `territory.rooms` data overrides stale fields carried by room records.
- Control trend is calculated against the previous projected view model, not written back into simulation state.
- Hidden and merely suspected secret routes are not exposed to player-facing selectors.
- At most three primary status icons are selected using one priority vocabulary.
- Population capacity uses both settlement capacity and physical actor capacity when both are available.

### Normalized facts

The compatibility adapter adds the following entity tables:

- `territories`
- `sieges`
- `constructionJobs`
- `spatialRooms`

It also adds room indexes for settlements, structures, cargo, sieges, construction jobs, and connections. UI and strategic overlays no longer need to read simulation internals to answer room-state questions.

### Room status HUD

- `src/ui/RoomStatusLayer.js`
- `src/ui/StrategyObserverShellRoomStateWP11.js`
- `src/screens/ObserveScreenRoomStateWP11.js`
- `src/wp11-room-state.css`

The screen-space HUD provides:

- faction ownership crest and color
- live control ring and contested split
- population / effective capacity
- control trend
- up to three priority status icons
- semantic zoom levels
- collision-aware label placement
- hover details
- click selection and camera-compatible focus handoff
- English and Korean labels

### Strategic overlays and room visuals

- `src/engine/RoomStrategicOverlayRenderer.js`
- `src/engine/RoomVisualStateComposer.js`
- `src/engine/RoomStateVisualRenderer.js`
- `src/engine/StrategyDungeonRendererWP11.js`

Available modes:

- World
- Control
- Population
- Supply
- Danger
- Activity

The renderer consumes the canonical room-state map through `setCanonicalRoomStates()`. It does not independently recalculate ownership, population, or danger from renderer-side meshes.

Room visual priority is deterministic:

```text
ruined
> collapsing / damaged
> siege / combat / contested
> burning / infected / flooded
> controlled faction state
> default
```

### Spatial reservations

- `src/sim/SpatialReservationCompositor.js`
- patched `RoomOccupancySystem`

The compositor replaces the unsafe single-blocker cell assumption with multi-owner reservations. It supports:

- overlapping blockers with independent release
- traversal and door-clearance lanes
- prop and structure footprints
- large-actor footprint queries
- deterministic placement search
- room-level physical capacity summaries

Existing `blockArea()` and `unblockByBlocker()` callers remain compatible while being routed through the compositor.

### Placement migration

- `src/data/applyWP11SpatialLayout.js`
- patched territory, construction, and forward-outpost placement producers

Static props are adjusted deterministically around authored route ports. Runtime structures and outposts request an available placement before consuming their final position. If no legal construction placement exists, the build is deferred instead of silently blocking a route.

### Effective capacity

Settlement capacity retains existing building, integrity, and collapse rules. WP11 additionally records:

- `logicalCapacity`
- `spatialCapacity`
- `effectiveCapacity`

When both logical and spatial capacities are valid, effective capacity is the lower value. This prevents the UI and spawn admission from claiming space that the room cannot physically host.

## Installer safety

`apply-wp11.mjs` performs the following sequence:

1. Validate repository identity and prerequisite files.
2. Stage every new file and every source patch in memory.
3. Validate required source markers before writing.
4. Create a timestamped backup under `.wp11-backups/`.
5. Replace files atomically through temporary files and rename.
6. Syntax-check all installed JavaScript and MJS files.
7. Run the focused WP11 regression gate by default.
8. Roll back every touched file automatically if installation or focused tests fail.

The installer is idempotent. Reapplying it does not duplicate imports, stylesheet links, package scripts, or source patches.

## Commands

```bash
node apply-wp11.mjs /absolute/path/to/toy-test-03
```

Run the aggregate production gate as part of installation:

```bash
node apply-wp11.mjs /absolute/path/to/toy-test-03 --full-test
```

Skip automatic tests only when a separate CI step will run them immediately:

```bash
node apply-wp11.mjs /absolute/path/to/toy-test-03 --skip-tests
npm run test:wp11
npm run test:production
```

## Regression gate

`npm run test:wp11` validates:

- live territory precedence and control trend
- physical population capacity
- status-priority limit
- hidden-secret non-disclosure
- independent overlapping blocker release
- door-clearance reservations
- deterministic prop relocation
- snapshot tables and indexes
- facade, screen, shell, and renderer wiring
- stylesheet and package-script idempotency

## Remaining browser acceptance

Node tests cannot verify visual crowding or camera projection. Before production acceptance, run browser checks for:

- all 63 rooms at far, medium, and near camera distances
- 1440×900 and 1024×768 desktop layouts
- 390×844 and 430×932 mobile layouts
- label overlap during active sieges and migrations
- color-blind and non-color status readability
- room badge click, hover, selection, and focus behavior
- long-running settlement growth and spatial-capacity consistency
