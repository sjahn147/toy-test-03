import assert from 'node:assert/strict';
import { selectRoomState, selectRoomStateMap } from '../src/presentation/selectors/selectRoomStateMap.js';
import { selectRoomInspector } from '../src/presentation/selectors/selectRoomInspector.js';

function emptyTables() {
  return {
    agents: {}, rooms: {}, connections: {}, props: {}, settlements: {}, factions: {}, parties: {},
    cargo: {}, structures: {}, environmentTasks: {}, territories: {}, sieges: {}, constructionJobs: {}, spatialRooms: {}, effects: {}
  };
}
function emptyIndexes() {
  return {
    agentsByRoom: {}, propsByRoom: {}, settlementsByFaction: {}, environmentTasksByRoom: {}, environmentTasksByTarget: {},
    settlementsByRoom: {}, structuresByRoom: {}, cargoByRoom: {}, siegesByRoom: {}, constructionJobsByRoom: {}, connectionsByRoom: {}
  };
}

const entities = emptyTables();
entities.rooms.A01 = { id: 'A01', name: 'Lantern Plaza', kind: 'start', x: 0, z: 0, floor: 0, w: 12, d: 10, visited: true, ownerFactionId: 'stale-owner' };
entities.rooms.A02 = { id: 'A02', name: 'Registry', kind: 'room', x: 16, z: 0, floor: 0, w: 10, d: 8, visited: true };
entities.agents.orc = { id: 'orc', role: 'orc', alive: true, roomId: 'A01', ecologyFaction: 'red-tusk-tribe', combat: { state: 'windup' } };
entities.agents.goblin = { id: 'goblin', role: 'goblin', alive: true, roomId: 'A01', ecologyFaction: 'goblin-clan' };
entities.settlements.camp = { id: 'camp', roomId: 'A01', factionId: 'red-tusk-tribe', state: 'threatened', tier: 2, capacity: 4, effectiveCapacity: 4, guestCapacity: 0, structuralIntegrity: 73, supplyStatus: 'threatened', supplyEfficiency: 0.65, food: 3, materials: 2 };
entities.territories.A01 = { id: 'A01', roomId: 'A01', owner: 'red-tusk-tribe', challenger: 'goblin-clan', control: 63, contested: true };
entities.spatialRooms.A01 = { id: 'A01', roomId: 'A01', totalCells: 12, walkableCells: 3, actorCapacity: 3, blockedCells: 9, placementReservedCells: 2, routeReservedCells: 1, largeAnchors: 0, conflicts: 0 };
entities.connections.ordinary = { id: 'ordinary', from: 'A01', to: 'A02', kind: 'ordinary', state: 'open', active: true };
entities.connections.secret = { id: 'secret', from: 'A01', to: 'A02', kind: 'secret', state: 'hidden', active: false };
entities.sieges.siege = { id: 'siege', roomId: 'A01', active: true, phase: 'breach', attackerFaction: 'goblin-clan', defenderFaction: 'red-tusk-tribe', attackers: 2 };
entities.constructionJobs.job = { id: 'job', roomId: 'A01', type: 'gatehouse', state: 'building', progress: 5, duration: 10 };
entities.environmentTasks.task = { id: 'task', targetRoomId: 'A01', actionId: 'room.salvage', status: 'working', progress: 0.4 };

const indexes = emptyIndexes();
indexes.agentsByRoom.A01 = ['orc', 'goblin'];
indexes.settlementsByRoom.A01 = ['camp'];
indexes.connectionsByRoom.A01 = ['ordinary', 'secret'];
indexes.connectionsByRoom.A02 = ['ordinary', 'secret'];
indexes.siegesByRoom.A01 = ['siege'];
indexes.constructionJobsByRoom.A01 = ['job'];
indexes.environmentTasksByRoom.A01 = ['task'];

const state = { clock: { time: 12, turn: 4, ended: false }, entities, indexes, events: [], metrics: {} };
const previous = { ownership: { control: 70 }, population: { current: 3 } };
const room = selectRoomState(state, 'A01', { previous, observerFactionId: 'red-tusk-tribe' });
assert.equal(room.ownership.ownerFactionId, 'red-tusk-tribe', 'live territory must override stale room ownership');
assert.equal(room.ownership.challengerFactionId, 'goblin-clan');
assert.equal(room.ownership.control, 63);
assert.equal(room.ownership.controlTrend, 'falling');
assert.equal(room.population.current, 2);
assert.equal(room.population.capacity, 3, 'effective displayed capacity must respect spatial capacity');
assert.equal(room.population.trend, 'falling');
assert.equal(room.activity.siege.phase, 'breach');
assert.equal(room.activity.construction[0].progress, 0.5);
assert.equal(room.routes.open, 1);
assert.equal(room.routes.secretDiscovered, 0);
assert.equal('secretHidden' in room.routes, false, 'undiscovered secret count must not leak into UI state');
assert.ok(room.presentation.statuses.length <= 3);
assert.equal(room.presentation.primaryStatus, 'siege');
assert.equal(room.observer.friendly, true);

entities.spatialRooms.A01.actorCapacity = 1;
entities.spatialRooms.A01.walkableCells = 1;
const overcrowdedRoom = selectRoomState(state, 'A01');
assert.equal(overcrowdedRoom.population.capacity, 1, 'capacity must not be inflated to hide overcrowding');
assert.equal(overcrowdedRoom.population.overcrowded, 1);
entities.spatialRooms.A01.actorCapacity = 3;
entities.spatialRooms.A01.walkableCells = 3;

const map = selectRoomStateMap(state, { previous: { A01: previous } });
assert.equal(Object.keys(map).length, 2);

const inspector = selectRoomInspector(state, 'A01', map);
assert.equal(inspector.roomState.roomId, 'A01');
assert.equal(inspector.routes.some(route => route.id === 'secret'), false, 'hidden route must not appear in room inspector');

entities.connections.secret.state = 'discovered';
const discovered = selectRoomState(state, 'A01');
assert.equal(discovered.routes.secretDiscovered, 1);
const discoveredInspector = selectRoomInspector(state, 'A01', { A01: discovered });
assert.equal(discoveredInspector.routes.some(route => route.id === 'secret'), true);

console.log('WP11 canonical room state selector: ok');
