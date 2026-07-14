import assert from 'node:assert/strict';
import { VerticalConnectorSystem } from '../src/sim/VerticalConnectorSystem.js';

const rooms = [
  { id:'A', floorId:'F0', floor:0 },
  { id:'B', floorId:'B1', floor:-1 }
];
const connectors = [{
  id:'VC', type:'lift', state:'open', capacity:1, queueCapacity:2, transitTime:1,
  allowsCargo:false, allowsLargeActors:false, legacyRouteIds:['old-route'],
  from:{ id:'VC:F0', floorId:'F0', roomId:'A', position:{x:0,z:0}, queueSockets:[{x:1,z:0}] },
  to:{ id:'VC:B1', floorId:'B1', roomId:'B', position:{x:0,z:0}, queueSockets:[{x:1,z:0}] }
}];
const system = new VerticalConnectorSystem(connectors, rooms);
assert.deepEqual(system.activeLinks(), [['A','B']]);
assert.equal(system.get('old-route').id, 'VC');
const first = { id:'first', roomId:'A', size:'small' };
const second = { id:'second', roomId:'A', size:'small' };
let result = system.begin(first, system.findBetween('A','B'));
assert.equal(result.ok, true); first.travel = result.travel;
result = system.begin(second, system.findBetween('A','B'));
assert.equal(result.ok, true); second.travel = result.travel;
assert.equal(first.travel.phase, 'enter');
assert.equal(second.travel.phase, 'queue');
assert.equal(system.advance(first, 1).arrived, true);
assert.equal(system.advance(second, 0).arrived, false);
assert.equal(second.travel.phase, 'enter');
assert.equal(system.setState('old-route','locked').connector.id, 'VC');
assert.equal(system.activeLinks().length, 0);
console.log('WP13 vertical connector system smoke passed');
