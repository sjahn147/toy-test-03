import assert from 'node:assert/strict';
import { SpatialReservationCompositor } from '../src/sim/SpatialReservationCompositor.js';
import { applyWP11SpatialLayout } from '../src/data/applyWP11SpatialLayout.js';

const room = { id: 'A01', x: 0, z: 0, w: 8, d: 8 };
const cells = [];
for (let row = 0; row < 6; row += 1) for (let col = 0; col < 6; col += 1) cells.push({ id: `A01:${col}:${row}`, roomId: 'A01', col, row, x: -2.5 + col, z: -2.5 + row });
const grids = new Map([['A01', { roomId: 'A01', cols: 6, rows: 6, cells }]]);
const blockedCells = new Map();
const topology = { roomPorts: new Map([['A01', [{ id: 'door-east', roomId: 'A01', side: 'E', x: 4, z: 0, normalX: 1, normalZ: 0, width: 1.5 }]]]) };
const compositor = new SpatialReservationCompositor({ rooms: [room], topology, grids, blockedCells, occupiedByCell: new Map(), reservations: new Map(), cellSize: 1 });

const routeState = compositor.roomState('A01');
assert.ok(routeState.routeReservedCells > 0, 'authored door clearance must reserve placement cells');
assert.equal(routeState.blockedCells, 0, 'door clearance must not block traversal');

const first = compositor.reserveCircle({ roomId: 'A01', worldX: 0, worldZ: 0, radius: 0.8, blockerId: 'structure-a' });
const second = compositor.reserveCircle({ roomId: 'A01', worldX: 0, worldZ: 0, radius: 0.8, blockerId: 'structure-b' });
assert.ok(first.length > 0 && second.length > 0);
const shared = first.find(id => second.includes(id));
assert.ok(shared);
assert.equal(blockedCells.has(shared), true);
assert.ok(compositor.roomState('A01').conflicts > 0, 'overlapping reservations must be reported while active');
compositor.releaseBlocker('structure-a');
assert.equal(blockedCells.has(shared), true, 'releasing one overlapping blocker must preserve the other');
compositor.releaseBlocker('structure-b');
assert.equal(blockedCells.has(shared), false);
assert.equal(compositor.roomState('A01').conflicts, 0, 'resolved overlaps must not remain as stale room conflicts');

const placement = compositor.findPlacement('A01', { radius: 0.7, preferred: { ox: 0, oz: 0 } });
assert.ok(placement);
assert.equal(compositor.isPlacementBlocked(placement.cellId), false);
assert.ok(compositor.roomState('A01').largeAnchors >= 0);
assert.doesNotThrow(() => JSON.stringify(compositor.snapshot()));

const scenario = {
  rooms: [room],
  routes: [{ id: 'r1', from: 'A01', to: 'A02', width: 1.5, ports: { A01: { x: 4, z: 0, width: 1.5 } } }],
  props: [
    { id: 'entrance', type: 'dungeon_entrance', roomId: 'A01', placement: { ox: 3.2, oz: 0, scale: 0.7 } },
    { id: 'camp', type: 'orc_tribe_camp', roomId: 'A01', placement: { ox: 3.1, oz: 0.1, scale: 0.7 } }
  ]
};
const arrangedA = applyWP11SpatialLayout(scenario);
const arrangedB = applyWP11SpatialLayout(scenario);
assert.deepEqual(arrangedA, arrangedB, 'spatial layout pass must be deterministic');
assert.equal(arrangedA.wp11SpatialLayoutApplied, true);
assert.ok(arrangedA.props.some(prop => prop.placement.wp11Adjusted), 'port/prop collision should cause deterministic adjustment');

console.log('WP11 spatial reservation compositor: ok');
