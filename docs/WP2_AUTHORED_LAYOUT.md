# Sleeping Citadel WP2 — Authored Physical Layout and Active Route Graph

## Scope

This slice replaces Sleeping Citadel shelf-packing with fixed campaign-authored room placement and introduces one route model shared by pathfinding, travel topology, rendering, and normalized observer snapshots.

## Delivered contracts

- 63 explicit room placements with `x`, `z`, `floor`, and `rotation`.
- 90 route definitions: 80 ordinary, 4 conditional, and 6 secret.
- Authored endpoint ports, corridor polylines, widths, route kinds, initial states, and elevation layers.
- Five camera landmarks and authored cross-zone transition metadata.
- Room-overlap, corridor/room-intersection, same-layer crossing, endpoint-port, graph-connectivity, and route-transition gates.
- `ActiveCampaignGraph` as the authoritative live route-state boundary.
- Dynamic route topology rebuild after secret discovery, conditional opening, collapse, or blockage.
- Safe cancellation of agents travelling on a route that becomes non-traversable.
- Renderer presentation for ordinary corridors, locked conditional seals, hidden secret covers, opened routes, and collapsed routes.

## Initial campaign graph

Only the 80 ordinary routes are traversable when the campaign compiles. Conditional routes begin `locked`; secret routes begin `hidden`. The ordinary graph remains connected from A01 to all 63 rooms, so existing campaign entry and autonomous simulation continue to function.

## Route elevation

The base ordinary graph is planar, but the complete graph becomes non-planar when authored conditional and secret shortcuts are included. Routes therefore carry explicit elevation layers. The audit forbids crossings between routes of the same kind on the same elevation. Grade-separated crossings remain visually and topologically distinct.

## State vocabularies

- ordinary: `open`, `blocked`, `barricaded`, `collapsed`, `flooded`, `webbed`
- conditional: `locked`, `opening`, `opened`, `collapsed`
- secret: `hidden`, `suspected`, `discovered`, `opened`, `collapsed`

Only `open` ordinary routes and `opened` conditional/secret routes are traversable.

## WP3 boundary

This package exposes `DungeonSim.setRouteState(routeId, state, metadata)` but does not add player task commands for searching, lockpicking, operating sluices, breaching walls, or clearing rubble. Those actions belong to WP3 and should complete through agent activities before calling the route-state API.
