import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';

const placements = [];
const events = [];
const sim = {
  time: 0,
  rooms: [{ id: 'D19' }, { id: 'D18' }, { id: 'J49' }],
  agents: [],
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
  equipmentSystem: { initializeAgent(agent) { agent.equipmentInitialized = true; } },
  occupancy: { placeAgent(agent, roomId) { placements.push([agent.id, roomId]); agent.roomCell = { x: 0, z: 0 }; return true; } },
  emitEffect(type, payload) { events.push({ type, ...payload }); }
};

const system = new HeroSystem({ onEvent: (text, meta) => events.push({ text, ...meta }) });
system.initialize(sim);
assert.equal(sim.agents.length, 3);
assert.deepEqual(sim.agents.map(agent => agent.heroId).sort(), ['hero.karg', 'hero.kirik', 'hero.nibble']);
assert.equal(new Set(sim.agents.map(agent => agent.id)).size, 3);
assert.equal(placements.length, 3);

system.initialize(sim);
assert.equal(sim.agents.length, 3, 'heroes must not duplicate on repeated initialization');

const nibble = sim.agents.find(agent => agent.heroId === 'hero.nibble');
nibble.hp = Math.floor(nibble.maxHp * 0.55);
system.update(0.25, sim);
assert.equal(nibble.heroDamageStage, 1);
nibble.hp = Math.floor(nibble.maxHp * 0.2);
system.update(0.25, sim);
assert.equal(nibble.heroDamageStage, 2);

const karg = sim.agents.find(agent => agent.heroId === 'hero.karg');
const beforeAttack = karg.attack;
karg.heroLastHp = karg.hp;
karg.hp -= Math.ceil(karg.maxHp * 0.16);
system.update(0.1, sim);
assert.equal(karg.heroStatuses.lessonStacks, 1);
assert.ok(karg.attack > beforeAttack, 'Karg passive must affect runtime stats');

system.onAgentDeath(nibble, sim);
nibble.alive = false;
assert.equal(system.stateFor('hero.nibble').state, 'dead');
const count = sim.agents.length;
system.initialize(sim);
assert.equal(sim.agents.length, count, 'dead unique hero must not respawn');

const snapshot = system.snapshot();
assert.equal(snapshot.heroes.length, 3);
assert.doesNotThrow(() => JSON.stringify(snapshot));
assert.equal(system.metrics().heroDefinitions, 3);
console.log('WP8-A hero system smoke passed');
