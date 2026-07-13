import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectRoomInspector } from '../src/presentation/selectors/selectRoomInspector.js';
import { selectWorldInteractionInspector } from '../src/presentation/selectors/selectWorldInteractionInspector.js';

const state = {
  entities: {
    rooms: {
      H36: { id: 'H36', name: 'Old Lantern Common Room', kind: 'inn-common-room', zoneId: 'H', w: 22, d: 17, tags: ['inn-core', 'secret-route'], visualState: 'prosperous', visited: true, food: 8, water: 5, ownership: { factionId: 'adventurer-expedition', control: 84, contested: false } },
      H39: { id: 'H39', name: 'Underbarrel Cellar', w: 18, d: 14 }
    },
    agents: {
      fighter: { id: 'fighter', name: 'Fighter', role: 'fighter', faction: 'party', roomId: 'H36', hp: 10, maxHp: 12, alive: true }
    },
    props: {
      hearth: { id: 'hearth', roomId: 'H36', type: 'facility', label: 'Great Hearth', state: 'working' },
      stockade: { id: 'stockade', roomId: 'H36', type: 'palisade', integrity: 30, maxIntegrity: 40, buildProgress: 1 }
    },
    connections: {
      'secret-H36-H39': { id: 'secret-H36-H39', from: 'H36', to: 'H39', kind: 'secret', state: 'hidden' }
    },
    cargo: {
      ale: { id: 'ale', roomId: 'H36', resourceType: 'ale', amount: 4, state: 'stored', routeRisk: 0.18 }
    },
    structures: {
      stockade: { id: 'stockade', roomId: 'H36', type: 'palisade', integrity: 30, maxIntegrity: 40, buildProgress: 1 }
    }
  },
  indexes: { agentsByRoom: { H36: ['fighter'] }, propsByRoom: { H36: ['hearth', 'stockade'] } }
};

const room = selectRoomInspector(state, 'H36');
assert.equal(room.secret, true, 'hyphenated secret-route tag must be recognized');
assert.equal(room.routes.length, 1);
assert.equal(room.routes[0].kind, 'secret');
assert.equal(room.resources.food, 8);
assert.equal(room.occupants[0].factionId, 'adventurer-expedition');
assert.equal(room.status.visualState, 'prosperous');

const cargo = selectWorldInteractionInspector(state, { type: 'cargo', id: 'ale', roomId: 'H36', label: 'Ale Cargo' });
assert.equal(cargo.kind, 'cargo');
assert.ok(cargo.details.some(item => item.label === 'route risk' && item.value === '18%'));

const structure = selectWorldInteractionInspector(state, { type: 'structure', id: 'stockade', roomId: 'H36' });
assert.equal(structure.kind, 'structure');
assert.ok(structure.details.some(item => item.label === 'integrity' && item.value === '30/40'));

const story = selectWorldInteractionInspector(state, { type: 'story-prop', id: 'H36:reservation-ledger', roomId: 'H36', assetId: 'inn.old-lantern.common-room', semanticName: 'reservation-ledger', label: 'Reservation Ledger' });
assert.equal(story.kind, 'story-prop');
assert.equal(story.roomId, 'H36');
assert.ok(story.affordances.includes('inspect-story'));

const observe = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
const facade = await readFile(new URL('../src/application/GameRuntimeFacade.js', import.meta.url), 'utf8');
const inspector = await readFile(new URL('../src/ui/renderStrategyInspector.js', import.meta.url), 'utf8');
for (const marker of ['WorldInteractionPicker', 'installWorldInteraction', 'selectWorldTarget', 'worldTarget: this.selection.worldTarget']) assert.ok(observe.includes(marker), `ObserveScreen missing ${marker}`);
assert.ok(facade.includes('selectWorldInteractionInspector'));
for (const type of ['cargo', 'structure', 'story-prop', 'interaction-socket', 'landmark', 'route']) assert.ok(inspector.includes(`'${type}'`), `inspector missing ${type}`);

console.log('world interaction WP1 smoke passed');
