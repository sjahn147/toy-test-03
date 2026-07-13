import assert from 'node:assert/strict';
import { LegacyPhaseRuntimeAdapter } from '../src/compat/LegacyPhaseRuntimeAdapter.js';
import { GameRuntimeFacade } from '../src/application/GameRuntimeFacade.js';

const sim = {
  time: 0,
  turn: 0,
  onEvent: () => {},
  agents: [{ id: 'g1', name: 'Goblin A', role: 'goblin', faction: 'dungeon', roomId: 'lair', alive: true }],
  rooms: [{ id: 'lair', name: 'Brass Warrens' }],
  update(dt) { this.time += dt; },
  snapshot() { return { rooms: this.rooms, agents: this.agents, props: [], effects: [] }; },
  metrics() { return { party: 0, dungeon: 1 }; }
};
const adapter = LegacyPhaseRuntimeAdapter.fromSim(sim);
sim.onEvent({ text: 'Goblin A crawled out of Brass Warrens and immediately had opinions.', time: 0 });
sim.time = 4;
adapter.update(0.01);
const facade = new GameRuntimeFacade({ runtime: adapter });
const view = facade.getViewModel({ timelineMode: 'chronicle', locale: 'en', timelineLimit: 20 });
assert.equal(view.timeline.length, 1);
assert.match(view.timeline[0].text, /Brass Warrens/);
sim.onEvent({ text: 'Goblin A could not find a legal corridor to E21.', time: 5 });
const clean = facade.getViewModel({ timelineMode: 'chronicle', locale: 'en' });
assert.equal(clean.timeline.length, 1);
const debug = facade.getViewModel({ timelineMode: 'debug', locale: 'en' });
assert.ok(debug.timeline.some(event => event.channel === 'debug'));
facade.destroy();
console.log('WP9-A adapter integration smoke passed');
