import assert from 'node:assert/strict';
import { OVERLAY_MODES, cycleOverlayMode, deriveStrategicOverlay } from '../src/engine/StrategicOverlayModel.js';

const snapshot = {
  rooms: [
    { id: 'A01', x: 0, z: 0, w: 10, d: 10, tags: ['safe_zone'] },
    { id: 'H36', x: 20, z: 0, w: 22, d: 17, visualState: 'prosperous' },
    { id: 'H40', x: 28, z: 8, w: 11, d: 10, visualState: 'operations-room' },
    { id: 'I45', x: 42, z: 8, w: 13, d: 17, visualState: 'active' },
    { id: 'F30', x: 20, z: 24, w: 18, d: 16, visualState: 'expanding', tags: ['fungal-core'] }
  ],
  agents: [
    { id: 'fighter-1', name: 'Rana', role: 'fighter', faction: 'party', alive: true, roomId: 'H36', travel: { fromRoomId: 'H36', toRoomId: 'H40', progress: 0.4 } },
    { id: 'spider-1', role: 'spider', faction: 'dungeon', ecologyFaction: 'red-silk-brood', alive: true, roomId: 'F30' },
    { id: 'host-1', role: 'rogue', faction: 'party', alive: true, roomId: 'F30', hosted: true }
  ],
  props: [
    { id: 'ore-1', type: 'territory_resource', resourceType: 'scrap', roomId: 'I45', stock: 7 }
  ],
  territory: { rooms: [
    { roomId: 'H36', owner: 'adventurer-expedition', control: 82, contested: false },
    { roomId: 'F30', owner: 'red-silk-brood', control: 58, contested: true, challenger: 'adventurer-expedition' }
  ] },
  settlement: { settlements: [
    { id: 'settlement-old-lantern-inn', roomId: 'H36', name: 'Old Lantern Inn', supplyStatus: 'threatened', supplyEfficiency: 0.65, food: 6, water: 4, medicine: 2, materials: 8, wealth: 3 }
  ] },
  logistics: { cargo: [
    { id: 'cargo-1', state: 'carried', resourceType: 'materials', route: ['A01', 'H36', 'H40'], factionId: 'adventurer-expedition', routeRisk: 0.68, routeCut: false, carrierId: 'fighter-1' }
  ] },
  routes: [
    { id: 'route-H36-H40', from: 'H36', to: 'H40', kind: 'ordinary', state: 'open', active: true, points: [{ x: 20, z: 0 }, { x: 28, z: 8 }] },
    { id: 'secret-H40-I45', from: 'H40', to: 'I45', kind: 'secret', state: 'discovered', active: false, points: [{ x: 28, z: 8 }, { x: 42, z: 8 }] }
  ],
  construction: { sieges: [{ roomId: 'F30', active: true }] },
  environmentTasks: { tasks: [{ id: 'task-1', actionId: 'route.open', targetRoomId: 'H40', assignedAgentIds: ['fighter-1'], state: 'working', progress: 0.6, label: 'Open smuggler door' }] },
  settlementOperations: { orders: [] },
  zoneInteractions: { tasks: [] }
};

assert.equal(OVERLAY_MODES.length, 9);
assert.equal(cycleOverlayMode('world', 1), 'territory');
assert.equal(cycleOverlayMode('world', -1), 'path-intent');

for (const mode of OVERLAY_MODES) {
  const model = deriveStrategicOverlay(snapshot, mode, { followAgentId: 'fighter-1' });
  assert.equal(model.mode, mode);
  assert.ok(Array.isArray(model.legend));
  assert.ok(Array.isArray(model.roomMarkers));
  assert.ok(Array.isArray(model.routeMarkers));
  assert.ok(Array.isArray(model.pointMarkers));
}

assert.ok(deriveStrategicOverlay(snapshot, 'territory').roomMarkers.length >= 2);
assert.ok(deriveStrategicOverlay(snapshot, 'supply').routeMarkers.some(marker => marker.kind === 'supply-risk'));
assert.ok(deriveStrategicOverlay(snapshot, 'danger').roomMarkers.some(marker => marker.roomId === 'F30'));
assert.ok(deriveStrategicOverlay(snapshot, 'population').roomMarkers.some(marker => marker.count >= 2));
assert.ok(deriveStrategicOverlay(snapshot, 'resources').pointMarkers.some(marker => marker.resourceType === 'scrap'));
assert.ok(deriveStrategicOverlay(snapshot, 'infection').roomMarkers.some(marker => marker.roomId === 'F30'));
assert.ok(deriveStrategicOverlay(snapshot, 'secrets').routeMarkers.some(marker => marker.routeId === 'secret-H40-I45'));
assert.ok(deriveStrategicOverlay(snapshot, 'path-intent', { followAgentId: 'fighter-1' }).routeMarkers.length >= 2);

console.log('WP6 strategic overlay model smoke: ok');
