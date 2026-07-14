# WP13 validation record

## Target baseline

The installer was authored against `sjahn147/toy-test-03` main at `b0c909f1729e3f2d9882dca2c368c4b2a56fb7d7` (WP12 Modern Adventurers).

## Package-side verification

The installer was applied to a representative 63-room repository fixture containing the current compiler, topology, route graph, renderer, room-state and simulation patch anchors.

Verified:

- dry-run performs no writes;
- 63 rooms compile into F0/B1/B2/B3 counts of 5/27/28/3;
- 80 ordinary, 3 conditional and 7 secret horizontal routes remain;
- all four floor-local ordinary graphs are connected;
- F0 has an orientation loop, B1 and B2 retain multiple circulation loops, and B3 is a linear finale;
- no same-floor room overlap;
- no corridor intersects an unrelated room;
- every non-endpoint corridor intersection has an explicit junction record;
- all corridor routes have one floor, constant elevation, no `vertical` flag and no `yOffset`;
- nine aligned vertical connectors compile;
- connector alias migration, opening, queueing, capacity and traversal complete;
- active-floor scene isolation survives 100 floor switches without index growth;
- actor travel uses model-derived grounding and does not double-apply route offsets;
- a second installation produces byte-identical repository files;
- a forced test failure restores every modified file and removes newly created files;
- all packaged JavaScript and MJS files pass `node --check`.

## Repository verification at application time

`--full-test` runs the target repository's complete `npm run test:production` after the focused WP13 tests. Browser/WebGL visual inspection must be performed in the target checkout because this package does not contain the repository's browser runtime or screenshot baselines.
