import assert from 'node:assert/strict';
import { filterSnapshotForFloor, snapshotForFloorArchitecture, usesFormalFloorArchitecture } from '../src/content/floors/FormalFloorCapability.js';

const baseSnapshot = {
  rooms: [{ id:'A', floorId:'F0', floor:0 }, { id:'B', floorId:'B1', floor:-1 }],
  routes: [{ id:'route-A-B', from:'A', to:'B', floorId:'F0' }],
  verticalConnectors: [{ id:'VC-1', from:{ roomId:'A', floorId:'F0' }, to:{ roomId:'B', floorId:'B1' } }],
  agents: [{ id:'agent-1', roomId:'A' }, { id:'agent-2', roomId:'B', travel:{ kind:'vertical-connector', fromFloorId:'F0', toFloorId:'B1' } }],
  props: [{ id:'prop-1', roomId:'A' }, { id:'prop-2', roomId:'B' }],
  effects: [{ id:'effect-1', roomId:'A' }, { id:'effect-2', roomId:'B' }]
};

const proceduralScenario = {
  rooms: [{ id:'A', floor:0 }, { id:'B', floor:0 }],
  floors: [],
  meta: { authoredPhysicalLayout:false }
};
assert.equal(usesFormalFloorArchitecture(proceduralScenario), false);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0'), baseSnapshot);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0').rooms.length, 2);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0').routes.length, 1);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0').agents.length, 2);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0').props.length, 2);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, proceduralScenario, 'F0').effects.length, 2);

const accidentalFloorScenario = {
  rooms: [{ id:'A', floorId:'F0', floor:0 }, { id:'B', floorId:'B1', floor:-1 }],
  floors: [{ id:'F0' }, { id:'B1' }],
  meta: {}
};
assert.equal(usesFormalFloorArchitecture(accidentalFloorScenario), false);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, accidentalFloorScenario, 'F0'), baseSnapshot);

const authoredScenario = {
  rooms: [{ id:'A', floorId:'F0', floor:0 }, { id:'B', floorId:'B1', floor:-1 }],
  floors: [{ id:'F0', roomIds:['A'] }, { id:'B1', roomIds:['B'] }],
  meta: { authoredPhysicalLayout:true }
};
assert.equal(usesFormalFloorArchitecture(authoredScenario), true);
const f0 = snapshotForFloorArchitecture(baseSnapshot, authoredScenario, 'F0');
const b1 = snapshotForFloorArchitecture(baseSnapshot, authoredScenario, 'B1');
assert.notEqual(f0, baseSnapshot);
assert.deepEqual(f0.rooms.map(room => room.id), ['A']);
assert.deepEqual(b1.rooms.map(room => room.id), ['B']);
assert.deepEqual(f0.props.map(prop => prop.id), ['prop-1']);
assert.deepEqual(b1.props.map(prop => prop.id), ['prop-2']);
assert.deepEqual(f0.agents.map(agent => agent.id), ['agent-1', 'agent-2']);
assert.deepEqual(b1.agents.map(agent => agent.id), ['agent-2']);

const authoredWithoutFloors = {
  rooms: [{ id:'A', floorId:'F0', floor:0 }],
  floors: [],
  meta: { authoredPhysicalLayout:true }
};
assert.equal(usesFormalFloorArchitecture(authoredWithoutFloors), false);
assert.equal(snapshotForFloorArchitecture(baseSnapshot, authoredWithoutFloors, 'F0'), baseSnapshot);

const directFiltered = filterSnapshotForFloor(baseSnapshot, 'F0');
assert.deepEqual(directFiltered.rooms.map(room => room.id), ['A']);

console.log('procedural floor bypass regression smoke passed');
