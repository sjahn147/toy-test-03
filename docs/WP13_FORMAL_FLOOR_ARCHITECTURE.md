# WP13 — Sleeping Citadel Formal Floor Architecture

## 0. Status and decision

This specification converts the current implicit four-level stacking into an explicit, user-operable floor-map system.

The existing coarse room-to-floor grouping is retained because it broadly matches campaign depth and content themes. Current X/Z coordinates and cross-floor corridor polylines are **not** retained as canonical. Every floor is re-authored as an independent horizontal map, and every floor transition becomes a first-class stair, lift, hoist, or shaft.

Core invariant:

```text
Corridors are horizontal.
Floor transitions are vertical connectors.
The active floor is the only fully rendered and interactive floor.
```

This document is a design and implementation specification. It does not itself modify the repository.

---

## 1. Product goals

1. The player can understand the current floor within one glance.
2. The observer can switch floors without moving a unit.
3. Selecting or following an entity automatically reveals the entity's floor.
4. Every unit, cargo route, secret route, siege path, and expedition path uses explicit floor connectivity.
5. No corridor mesh slopes, twists, floats, or crosses another corridor without an authored junction.
6. Other floors continue simulation while not being rendered.
7. Rendering cost scales primarily with the active floor rather than all 63 rooms.
8. Floor structure is declared in campaign content, not silently injected by an implementation-only layout file.

---

## 2. Canonical floor plan applied to the current 63 rooms

### F0 — Lantern Gate / 지상 관문

Purpose: onboarding, expedition assembly, supply preparation, safe camera orientation.

Rooms: 5

```text
A01 A02 A03 A04 A05
```

Content:

- Lantern Plaza
- Expedition Registry
- The Sealed Gate
- Baggage Vault
- Descent of Forty Lamps

### B1 — Outer Citadel / 외성 생활·산업층

Purpose: first settlement layer, food and water infrastructure, markets, inn, faction contact, large conventional combat.

Rooms: 27

```text
B06 B07 B08 B09 B10
C11 C12 C13 C14 C15
D16 D17 D18 D19 D20
H36 H37 H38
I41 I42 I43 I44
J46 J47 J48 J49 J50
```

Macro placement:

```text
west:    Residential Quarter → Flooded Storehouses → Industrial Corridor
center:  Central Cross-Market
north:   Old Lantern upper rooms
 east:   Red-Tusk Barracks and Chieftain Hall
```

### B2 — Deep Citadel / 심층 생태·왕실층

Purpose: advanced ecology, hidden logistics, laboratory systems, undead territory, late-game settlements and royal access.

Rooms: 28

```text
E21 E22 E23 E24 E25
F26 F27 F28 F29 F30
G31 G32 G33 G34 G35
H39 H40
I45
K51 K52 K53 K54 K55
L56 L57 L58 L59 L60
```

Macro placement:

```text
west:    Fungal Garden and Red-Silk Colony
south:   Ossuary Cathedral
center:  Old Lantern cellar and Smuggler's Way
 east:   Sealed Royal Laboratory and Deep Royal Quarter
```

### B3 — Heart Sanctum / 심장 성소

Purpose: final gate, ritual staging, campaign ending.

Rooms: 3

```text
M61 M62 M63
```

Macro placement:

```text
M61 Seal Gate → M62 Circular Sanctum → M63 Heart Chamber
```

### Floor counts

| Floor | Rooms | Primary function |
|---|---:|---|
| F0 | 5 | Entry and expedition preparation |
| B1 | 27 | Outer settlements, market, industry and barracks |
| B2 | 28 | Deep ecology, ossuary, laboratory and royal quarter |
| B3 | 3 | Final sanctum |
| Total | 63 | — |

---

## 3. Vertical connector catalogue

No synthetic room is required. A vertical connector is a first-class graph node with one landing on each floor, reserved queue cells, a visible structure, and a separate traversal state.

### VC-01 — Forty Lamps Grand Stair

```text
F0 A05 ↕ B1 B06
```

- Type: grand stair
- Initial state: open
- Visibility: always known
- Capacity: 6 agents
- Large actors: allowed
- Cargo: allowed
- Role: canonical campaign entrance and evacuation route
- Assets: upper stair mouth, lower landing, lamp line, defensive gate sockets

### VC-02 — Sluice Maintenance Lift

```text
B1 C15 ↕ B2 F26
```

- Type: counterweighted maintenance lift
- Initial state: flooded/locked
- Unlock: Drainage Engine Hall operation
- Capacity: 4 agents or one cargo load
- Large actors: no
- Cargo: yes
- Failure states: flooded, jammed, sabotaged
- Role: western logistics route and explicit replacement for a cross-floor conditional corridor

### VC-03 — Household Chapel Funerary Stair

```text
B1 B10 ↕ B2 E21
```

- Type: narrow secret stair
- Initial state: hidden
- Discovery: chapel or ossuary investigation
- Capacity: 2 agents
- Large actors: no
- Cargo: no
- Role: secret undead-border shortcut
- Visibility: landing remains wall-covered until discovered

### VC-04 — Red-Silk Spiral Shaft

```text
B1 I41 ↕ B2 G31
```

- Type: spiral stair and webbed shaft
- Initial state: webbed
- Capacity: 3 agents
- Large actors: no
- Cargo: no
- Role: central-market to spider-colony transition
- Assets: circular shaft rim, silk bridge, descending stair silhouette, web-clearing state

### VC-05 — Neutral Well Hoist

```text
B1 I44 ↕ B2 F30
```

- Type: well hoist / cage lift
- Initial state: inactive
- Unlock: Neutral Well pact plus Mycelial Heart resolution
- Capacity: 3 agents or one light cargo load
- Large actors: no
- Cargo: light cargo only
- Role: diplomatic midgame shortcut and supply route

### VC-06 — Old Lantern Cellar Stair

```text
B1 H36 ↕ B2 H39
```

- Type: service stair
- Initial state: blocked by debris
- Unlock: inn recovery work
- Capacity: 4 agents
- Large actors: no
- Cargo: yes
- Role: settlement-internal vertical circulation
- Assets: common-room trapdoor/stair, cellar landing, repair-stage variants

### VC-07 — Royal Freight Lift

```text
B1 J50 ↕ B2 L56
```

- Type: heavy freight elevator
- Initial state: sealed
- Unlock: Chieftain Hall control, royal mechanism, or siege breach
- Capacity: 8 agents or one large actor/cargo platform
- Large actors: yes
- Cargo: yes
- Role: principal east-side transition and late-game military route

### VC-08 — Throne Processional Stair

```text
B2 L59 ↕ B3 M61
```

- Type: monumental stair
- Initial state: ritual-locked
- Capacity: 8 agents
- Large actors: yes
- Cargo: no
- Role: main final-campaign entrance
- Assets: throne-floor gate, descending processional stair, Seal Gate landing

### VC-09 — Emergency Counterweight Shaft

```text
B2 K55 ↕ B3 M61
```

- Type: emergency cage/ladder shaft
- Initial state: hidden and sealed
- Capacity: 2 agents
- Large actors: no
- Cargo: no
- Role: alternate final access and escape path
- Failure state: collapsed

### Connector placement rule

For aligned room pairs, the landing X/Z is explicitly shared.

For non-aligned pairs, the floor layout must be re-authored so the connector landing lies at the same X/Z on both floors. The room itself need not share a center; a short horizontal corridor may connect the room to the landing. The layout compiler must never fake this with a diagonal cross-floor corridor.

---

## 4. Content contract

The campaign manifest becomes the authoritative owner of floor structure.

```json
{
  "floors": [
    {
      "id": "F0",
      "index": 0,
      "elevation": 0,
      "name": { "en": "Lantern Gate", "ko": "지상 관문" },
      "roomIds": ["A01", "A02", "A03", "A04", "A05"],
      "cameraProfile": "entry",
      "ambientProfile": "surface-gate"
    }
  ],
  "verticalConnectors": [
    {
      "id": "VC-01",
      "type": "grand-stair",
      "state": "open",
      "from": { "floorId": "F0", "roomId": "A05", "landingId": "VC-01:F0" },
      "to": { "floorId": "B1", "roomId": "B06", "landingId": "VC-01:B1" },
      "capacity": 6,
      "allowsCargo": true,
      "allowsLargeActors": true
    }
  ]
}
```

Each room receives both fields:

```text
floorId: F0 | B1 | B2 | B3
floor:   0  | -1 | -2 | -3
```

`floorId` is the content-facing primary key. Numeric `floor` remains a compatibility and world-height value.

### Horizontal route contract

Every corridor route must satisfy:

```text
route.floorId === fromRoom.floorId
route.floorId === toRoom.floorId
route.fromFloor === route.toFloor
route.vertical === false
all corridor vertices use one surface Y
```

The following become invalid on corridors:

```text
elevation used to grade-separate routes
yOffset used to slope a corridor
fromFloor != toFloor
vertical: true
```

### Vertical connector contract

```js
VerticalConnector {
  id,
  type,
  state,
  landings: [Landing, Landing],
  capacity,
  queueCapacity,
  transitTime,
  allowsCargo,
  allowsLargeActors,
  allowedFactions,
  accessCondition,
  visibility,
  damage,
  repairProgress
}

Landing {
  id,
  connectorId,
  floorId,
  roomId,
  position: { x, z },
  facing,
  arrivalSocket,
  queueSockets,
  cameraAnchor
}
```

---

## 5. Graph and traversal model

The navigation graph contains two edge classes.

```text
HorizontalRouteEdge
VerticalConnectorEdge
```

They share pathfinding but not geometry or travel animation.

### Horizontal travel

```text
approach port → corridor traversal → enter destination room
```

Y remains fixed for the full corridor traversal.

### Vertical travel

```text
approach landing
→ reserve connector slot
→ queue if occupied
→ enter stair/lift/shaft
→ transit
→ emerge at destination landing
→ enter destination room
```

Agent state:

```js
travel: {
  kind: 'vertical-connector',
  connectorId,
  fromLandingId,
  toLandingId,
  phase: 'approach' | 'queue' | 'enter' | 'transit' | 'exit',
  progress
}
```

### Capability constraints

Pathfinding must reject a connector when:

- state is not traversable;
- queue or platform capacity is exhausted;
- actor size is unsupported;
- cargo is unsupported;
- faction access is denied;
- flood, web, siege or collapse has blocked the connector.

Logistics and settlement supply use the same connector capability model as agent pathfinding.

---

## 6. Floor-aware renderer

### Scene groups

```text
WorldRoot
├─ FloorGroup:F0
├─ FloorGroup:B1
├─ FloorGroup:B2
├─ FloorGroup:B3
└─ VerticalConnectorGroup
```

Each floor group owns:

- room floors and walls;
- horizontal corridors;
- props and landmarks;
- structures and settlements;
- agents and effects;
- floor-local strategic overlays.

### Default visibility

```text
active floor: full render, animation and picking
other floors: hidden, not pickable, no mesh animation update
connector destination hint: optional minimal marker only
```

Simulation remains global. Rendering is floor-filtered.

### Optional ghost mode

An accessibility/debug setting may display adjacent floors at 8–12% opacity. Ghost floors:

- are never pickable;
- do not show room badges;
- do not show agents, props or effects;
- display only room footprints and connector alignment;
- are disabled by default.

### Transition render

During a stair or lift focus transition, render only:

- current landing;
- connector structure;
- destination landing;
- the moving agent or lift cage.

Do not reveal the complete adjacent floor merely to animate a transition.

---

## 7. Floor UI

### Floor rail

A persistent vertical rail is added to the map edge.

```text
F0  Lantern Gate       5 rooms   0 alerts
B1  Outer Citadel     27 rooms   3 alerts
B2  Deep Citadel      28 rooms   2 alerts
B3  Heart Sanctum      3 rooms   locked
```

Each floor button shows:

- floor label and localized name;
- discovery/lock state;
- population;
- owned and contested room count;
- critical alert count;
- selected or followed entity indicator;
- active connector activity.

### Interaction

- Click floor: observe that floor without moving units.
- Page Up: move one floor shallower.
- Page Down: move one floor deeper.
- Click connector up/down icon: focus its landing.
- Double-click connector: preview destination landing.
- Select entity on another floor: switch floor, then focus entity.
- Follow entity: floor changes automatically when the entity exits a connector.

### Inspector additions

Every room/entity inspector shows:

```text
Floor: B2 — Deep Citadel
Nearest connector: Royal Freight Lift, 2 rooms away
Vertical access: B1 / B3
```

Connector inspector shows:

- destination floor and room;
- state and access condition;
- current queue;
- supported actor/cargo classes;
- travel time;
- damage, blockade and repair state;
- actions such as open, repair, clear, sabotage or fortify.

### Off-floor alerts

Room badges are active-floor only. Off-floor events are summarized on the floor rail.

Examples:

```text
B1: siege ×1, supply blocked ×2
B2: hero wounded ×1, infection critical ×1
```

Clicking the alert switches floor and focuses the source.

---

## 8. Camera behavior

Each floor has its own:

- X/Z bounds;
- default pivot;
- default zoom;
- landmark presets;
- last-used camera pose.

Floor switch behavior:

1. Preserve yaw and pitch.
2. Move pivot to the same normalized map position when possible.
3. Clamp to the destination floor bounds.
4. Animate vertical target change in 300–500 ms.
5. Restore that floor's last zoom unless switching to a selected target.

Selection behavior:

```text
selection floor differs from active floor
→ switch active floor
→ wait for floor group visibility update
→ move camera to selection
```

Follow behavior changes floor only after the followed agent reaches the destination landing, preventing rapid camera toggling during transit.

---

## 9. Floor-aware overlays and HUD

The following consume `activeFloorId`:

- RoomStatusLayer;
- strategic overlays;
- world interaction picker;
- route selection;
- settlement/party/room navigator sections;
- path-intent and supply-route display;
- danger, population and control summaries.

Overlay modes have two summaries:

```text
active-floor summary
global summary by floor
```

Example:

```text
B1 Control: 3 contested rooms
All floors: F0 0 · B1 3 · B2 1 · B3 0
```

Supply routes crossing floors are drawn as:

```text
horizontal route on active floor
→ connector icon
```

No diagonal line is drawn through world space to another floor.

---

## 10. Re-authoring current coordinates

The current room IDs, sizes, zone membership, landmarks, state variants, spawn sockets and gameplay meaning are retained.

The following are regenerated:

- room X/Z coordinates within each floor;
- horizontal route polylines;
- corridor modules;
- camera landmarks;
- floor-local map bounds;
- connector landing and queue sockets.

### Layout rules

- minimum room margin: 2.0 world units;
- main corridor width: 3.2;
- service corridor width: 2.2;
- secret corridor width: 1.6–2.0;
- no room overlap on the same floor;
- no route crossing unless both routes terminate at an explicit shared junction;
- no route crosses a room footprint other than its endpoints;
- corridor bend angle: 90 degrees by default;
- no segment shorter than 1.2 units;
- connector landing clearance: at least 3.0 × 3.0;
- large/cargo connector landing clearance: at least 5.0 × 5.0;
- authored door ports must remain inside room-edge bounds;
- landmark bounds must not cover door, queue or connector cells.

### Removal of current crossing allowlist

Known cosmetic crossings are not accepted in the formal floor map. Every currently allowlisted crossing must be resolved by one of:

1. rerouting a corridor;
2. moving a room;
3. introducing an explicit junction module;
4. converting the intended transition into a vertical connector.

---

## 11. Content placement additions

New connector landmark assets:

```text
stairs.citadel.forty-lamps.upper
stairs.citadel.forty-lamps.lower
lift.sluice.maintenance
stairs.chapel.funerary-secret
shaft.spider.red-silk
hoist.market.neutral-well
stairs.inn.old-lantern-cellar
lift.royal.freight
stairs.royal.processional
shaft.laboratory.emergency
```

Each asset provides states:

```text
open
locked
hidden
blocked
working
damaged
collapsed
fortified
```

Each landing also provides:

- queue markers;
- arrival socket;
- cargo socket where applicable;
- blocker/fortification socket;
- camera anchor;
- interaction hotspot;
- up/down floor glyph anchor.

---

## 12. Simulation and performance policy

### Simulation

All floors continue:

- AI decisions;
- combat;
- settlement production;
- ecology;
- logistics;
- siege and control changes;
- chronicle events.

### Rendering

Off-floor work is reduced to derived counts and alert summaries.

Skip for hidden floors:

- mesh position updates;
- animation updates;
- particle effects;
- status badge projection;
- world picking;
- overlay geometry rebuilds.

The renderer retains floor groups in memory for rapid switching but may evict an inactive floor's transient effects and low-priority agent meshes under a memory budget.

---

## 13. Save/load and compatibility

Persist:

```text
activeFloorId
last camera pose by floor
floor discovery state
connector state and damage
connector queues/transit state
```

Compatibility migration:

- old numeric `floor` maps to floorId;
- old cross-floor routes are migrated to connector IDs by a fixed mapping table;
- agents saved mid-cross-floor route are placed at the nearest connector landing;
- unsupported old elevation/yOffset corridor data is rejected by validation rather than silently rendered.

---

## 14. Required code changes

### Content

- `content/campaigns/sleeping-citadel/campaign.manifest.json`
- `content/campaigns/sleeping-citadel/authored-layout.json`
- generated `SleepingCitadelAuthoredLayout.js`
- campaign schema and validator
- asset catalogue and connector recipes

### Compilation/domain

- `ScenarioCompiler.js`: compile floors and connectors
- `ActiveCampaignGraph.js`: typed horizontal/vertical edges
- `DungeonTopology.js`: horizontal routes only
- new `VerticalConnectorTopology.js`
- normalized snapshot tables for floors, landings and connectors

### Simulation

- movement/pathfinding vertical-edge support
- connector reservation/queue system
- cargo and large-actor capability checks
- connector damage, repair, blockade and fortification
- transition-safe travel cancellation

### Rendering

- new `FloorSceneManager.js`
- new `VerticalConnectorRenderer.js`
- floor-filtered `DungeonRenderer`
- horizontal-only `AuthoredRouteRenderer`
- floor-aware effects, settlements, props and agents

### Presentation/UI

- floor selector state and commands
- new `FloorRail.js`
- floor-aware RoomStatusLayer
- floor-aware navigator and inspector
- floor-aware strategic overlays and legends
- off-floor alert aggregation

### Camera/interaction

- floor-specific camera bounds and saved poses
- selection auto-floor-switch
- connector preview/focus
- floor-filtered world picker

---

## 15. Validation gates

### Content validation

- all 63 rooms belong to exactly one floor;
- floor IDs and numeric levels are consistent;
- every corridor has same-floor endpoints;
- every cross-floor graph edge is a vertical connector;
- every connector has exactly one landing per endpoint floor;
- landing X/Z alignment is exact;
- no same-floor room overlap;
- no unexplained same-floor corridor crossing;
- no corridor intersects a non-endpoint room;
- all connector landings have reserved clearance;
- floor-local graphs and the complete graph meet connectivity requirements.

### Runtime validation

- floor switch does not change simulation state;
- inactive floors are not pickable;
- selected off-floor entity switches and focuses correctly;
- followed agent switches floor once per connector transit;
- connector queues do not overlap actors;
- large actors and cargo obey connector capability;
- corridor travel has constant Y;
- vertical travel uses connector animation only;
- no agent root-position jitter at connector entry or exit;
- room badges and overlays show only the active floor;
- global alerts still include all floors.

### Visual acceptance

- no room from another floor is visible in the default view;
- no corridor slopes between floors;
- no corridor appears to twist or hang in the air;
- each vertical transition visibly reads as stair, lift, hoist or shaft;
- floor switching is understandable without opening an inspector;
- the active floor remains readable at 1024×768;
- connector icons remain understandable without relying on color;
- all previously allowlisted corridor crossings are removed.

### Performance acceptance

- only active-floor meshes participate in animation and picking;
- floor switch completes within 250 ms after assets are cached;
- frame time with the largest floor is not worse than rendering the current complete map;
- off-floor HUD projection cost is zero;
- no geometry or material leak after 100 floor switches.

---

## 16. Implementation sequence

### WP13-A — Content contract and validator

- floors and connectors in manifest;
- same-floor route invariant;
- migration table for old vertical routes;
- tests fail on current cross-floor corridors and allowlisted crossings.

### WP13-B — Floor re-layout

- re-author X/Z by floor;
- remove corridor crossings;
- align connector shafts;
- regenerate routes, modules, spawn sockets and camera landmarks.

### WP13-C — Connector graph and simulation

- connector topology;
- traversal phases, queue and capability;
- cargo and large-actor handling;
- save/load migration.

### WP13-D — Active-floor rendering

- floor scene groups;
- hidden inactive floors;
- connector renderer;
- floor-filtered agents, props, effects, overlays and picking.

### WP13-E — Floor UI and camera

- floor rail;
- keyboard navigation;
- floor-specific camera bounds and poses;
- selection/follow auto-switch;
- off-floor alerts.

### WP13-F — Production verification

- full graph audit;
- browser visual regression;
- 100-switch leak test;
- long-running multi-floor simulation;
- mobile and reduced-motion checks.

---

## 17. Final design decision

The four-level dungeon is retained, but it stops being an incidental Y offset.

```text
Current state:
stacked coordinates + cross-floor corridor interpolation + all floors rendered

Target state:
explicit floor content + horizontal floor maps + authored vertical connectors
+ active-floor rendering + floor UI + floor-aware camera and overlays
```

Room IDs and campaign content remain stable. Coordinates, route polylines and floor transitions are re-authored as a formal map system.
