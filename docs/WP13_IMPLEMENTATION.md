# WP13 Formal Floor Architecture — implementation

## Product result

Sleeping Citadel remains a four-floor dungeon, but the floors are now explicit campaign content rather than hidden Y offsets. Each floor is a separately readable horizontal dungeon map with loops, hubs, chokepoints, secret passages and authored vertical access.

- F0 is a compact expedition threshold with one orientation loop, clear supply preparation and a single canonical descent.
- B1 is the broad settlement/industry layer with eleven circulation loops, Old Lantern and Central Market hubs, faction approaches and a late royal freight route.
- B2 is the more dangerous ecology/royal layer with nine circulation loops, optional secret approaches, an ossuary chokepoint and a royal-laboratory endgame branch.
- B3 is a short, legible final procession from seal to sanctum to heart.

## Map grammar

The layout generator preserves room IDs, sizes, landmarks and gameplay roles while rebuilding X/Z placement. Horizontal routes are grid-routed around room footprints. Reused corridor cells become explicit junction records; unexplained route crossing is rejected.

The formal invariant is enforced in content and runtime:

```text
horizontal route: one floor, one surface Y
vertical connector: two aligned landings on different floors
```

Cross-floor corridor interpolation, route elevation and point yOffset are rejected for the formal campaign map.

## Vertical progression

Nine named connectors provide the dungeon's progression gates. The existing route-state APIs continue to recognize legacy route IDs as aliases for replacement connectors, so drainage, chapel discovery and emergency access work can migrate without silently retaining diagonal cross-floor corridors.

Connector traversal has approach/queue/enter/transit/exit phases, capacity, large-actor and cargo restrictions, and runtime state snapshots.

## Rendering and interaction

The WP13 renderer keeps simulation global but filters dynamic rendering to the active floor. Static room and route objects are indexed by floor and hidden from rendering and world interaction when inactive. A dedicated connector renderer shows only the landing relevant to the active floor.

The floor rail supports direct floor observation, Page Up/Page Down navigation, population, alert and connector summaries, selected-entity indication and access state. Floor-local camera bounds and last-used poses are persisted in local storage. Selecting an off-floor room or agent switches floors before camera movement. Following an agent changes floor only after connector transit completes.

## Height stability

Stationary and travelling actors both use the model-derived `agentGroundOffset(agent, mesh)`. A runtime landmark clearance audit records visual volumes that exceed the floor-height budget. The old travel path's fixed `agentRenderHeight()` and duplicate yOffset addition are removed. Horizontal corridors no longer interpolate between room floors.

## Compatibility

The installer transforms the current manifest and authored layout in place. It generates:

- explicit floors and room floor IDs;
- nine vertical connectors;
- new independent floor coordinates;
- horizontal routes and junctions;
- route migration JSON and Markdown;
- generated layout JavaScript consumed by the browser runtime.

The installer is repeatable, CRLF-tolerant, backs up every modified file, writes atomically and restores the previous repository on any validation failure.
