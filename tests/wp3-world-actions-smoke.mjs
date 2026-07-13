import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectWorldTaskActions } from '../src/presentation/selectors/selectWorldTaskActions.js';

const state = {
  entities: {
    agents: { rogue: { id: 'rogue', role: 'rogue', faction: 'party', roomId: 'A01', alive: true } },
    rooms: { A01: { id: 'A01' }, B06: { id: 'B06', scouted: false }, H39: { id: 'H39' } },
    connections: {
      ordinary: { id: 'ordinary', from: 'A01', to: 'B06', kind: 'ordinary', state: 'open', active: true },
      secret: { id: 'secret-B08-H39', from: 'B06', to: 'H39', kind: 'secret', state: 'hidden', active: false }
    },
    props: { engine: { id: 'engine', roomId: 'B06', type: 'drainage_engine', integrity: 50, maxIntegrity: 100 } },
    structures: {}, environmentTasks: {}
  }, indexes: {}
};
const room = selectWorldTaskActions(state, { type: 'room', id: 'B06', roomId: 'B06' });
assert.deepEqual(room.actions.map(action => action.id), ['room.scout', 'room.search', 'room.salvage']);
assert.ok(room.actions.every(action => action.enabled));
const secret = selectWorldTaskActions(state, { type: 'route', id: 'secret-B08-H39', roomId: 'B06' });
assert.ok(secret.actions.some(action => action.id === 'route.discover'));
assert.ok(!secret.actions.some(action => action.id === 'route.open'));
state.entities.connections.secret.state = 'discovered';
assert.ok(selectWorldTaskActions(state, { type: 'route', id: 'secret-B08-H39', roomId: 'B06' }).actions.some(action => action.id === 'route.open'));
state.entities.connections.secret.state = 'collapsed';
assert.ok(selectWorldTaskActions(state, { type: 'route', id: 'secret-B08-H39', roomId: 'B06' }).actions.some(action => action.id === 'route.clear'));
state.entities.connections.secret.state = 'discovered';
const prop = selectWorldTaskActions(state, { type: 'prop', id: 'engine', roomId: 'B06' });
assert.ok(prop.actions.some(action => action.id === 'landmark.operate'));
assert.ok(prop.actions.some(action => action.id === 'landmark.repair'));
state.entities.environmentTasks.busy = { id: 'busy', actionId: 'landmark.repair', targetId: 'engine', targetRoomId: 'B06', status: 'working', progress: 0.5 };
const busy = selectWorldTaskActions(state, { type: 'prop', id: 'engine', roomId: 'B06' });
assert.equal(busy.actions.find(action => action.id === 'landmark.repair').enabled, false);
assert.equal(busy.tasks.length, 1);

const pickerSource = await readFile(new URL('../src/engine/WorldInteractionPicker.js', import.meta.url), 'utf8');
assert.match(pickerSource, /routeId \?\? object\?\.userData\?\.connectionId/, 'picker must accept WP2 routeId metadata');
assert.match(pickerSource, /resolveSemanticRoute/, 'picker must resolve semantic portal and secret nodes to authored routes');
console.log('WP3 world action selector smoke passed');
