import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLegacySnapshot } from '../src/compat/normalizeLegacySnapshot.js';
import { ENTITY_TABLES, INDEX_NAMES } from '../src/domain/snapshotContract.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [facade, screen, strategyScreen, occupancy, territory, shell, renderer, selector, inspector, indexHtml] = await Promise.all([
  read('../src/application/GameRuntimeFacade.js'),
  read('../src/screens/ObserveScreenPhase8.js'),
  read('../src/screens/StrategyObserverScreen.js'),
  read('../src/sim/RoomOccupancySystem.js'),
  read('../src/sim/TerritorySystem.js'),
  read('../src/ui/StrategyObserverShellRoomStateWP11.js'),
  read('../src/engine/StrategyDungeonRendererWP11.js'),
  read('../src/presentation/selectors/selectRoomStateMap.js'),
  read('../src/ui/renderStrategyInspector.js'),
  read('../index.html')
]);

for (const table of ['territories', 'sieges', 'constructionJobs', 'spatialRooms']) assert.ok(ENTITY_TABLES.includes(table), `missing entity table ${table}`);
for (const name of ['settlementsByRoom', 'structuresByRoom', 'cargoByRoom', 'siegesByRoom', 'constructionJobsByRoom', 'connectionsByRoom']) assert.ok(INDEX_NAMES.includes(name), `missing index ${name}`);

const normalized = normalizeLegacySnapshot({
  time: 2,
  rooms: [{ id: 'A01' }],
  agents: [], props: [], routes: [],
  territory: { rooms: [{ roomId: 'A01', owner: 'goblin-clan', control: 55 }] },
  settlement: { settlements: [{ id: 's1', roomId: 'A01', factionId: 'goblin-clan' }] },
  construction: { structures: [{ id: 'wall', roomId: 'A01' }], sieges: [{ id: 'siege', roomId: 'A01' }], jobs: [{ id: 'job', roomId: 'A01' }] },
  logistics: { cargo: [{ id: 'cargo', roomId: 'A01' }] },
  environmentTasks: { tasks: [] },
  occupancy: { spatial: { rooms: [{ roomId: 'A01', totalCells: 10, actorCapacity: 8 }] } }
});
assert.equal(normalized.entities.territories.A01.owner, 'goblin-clan');
assert.deepEqual(normalized.indexes.settlementsByRoom.A01, ['s1']);
assert.deepEqual(normalized.indexes.connectionsByRoom, {});
assert.equal(normalized.entities.spatialRooms.A01.actorCapacity, 8);

for (const token of ['selectRoomStateMap', 'previousRoomStates', 'selectOverlayAvailability', 'roomStates']) assert.ok(facade.includes(token), `facade missing ${token}`);
for (const token of ['applyWP11SpatialLayout', 'StrategyObserverShellRoomStateWP11', 'onRoomOverlayMode']) assert.ok(screen.includes(token), `screen missing ${token}`);
for (const token of ['ObserveScreenRoomStateWP11', 'StrategyDungeonRendererWP11', 'rebindRoomStatePresentation']) assert.ok(strategyScreen.includes(token), `strategy screen missing ${token}`);
for (const token of ['SpatialReservationCompositor', 'findPlacement', 'roomSpatialState', 'spatial: this.spatialCompositor.snapshot()']) assert.ok(occupancy.includes(token), `occupancy missing ${token}`);
for (const token of ['WP11 immediate reservation', 'unblockByBlocker', 'placementFor(room, type, faction)']) assert.ok(territory.includes(token), `territory integration missing ${token}`);
assert.ok(shell.includes('data-room-overlay'));
assert.ok(renderer.includes('setCanonicalRoomStates'));
assert.ok(selector.includes("kind === 'secret' && !DISCOVERED_SECRET_STATES.has(state)"), 'hidden secret suppression is missing');
assert.ok(inspector.includes('Why this room is changing'));
assert.equal((indexHtml.match(/wp11-room-state\.css/g) ?? []).length, 1, 'WP11 stylesheet must be installed exactly once');

console.log('WP11 room-state source integration: ok');
