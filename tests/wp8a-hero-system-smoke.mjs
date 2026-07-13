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

// HeroSystem spawns one agent per definition in the shared HeroDefinitions
// registry, which later work packages (WP8b onward) append more heroes to -
// so these checks confirm WP8a's trio is present and every spawned agent is
// unique/placed, rather than that the registry is frozen at exactly 3.
const system = new HeroSystem({ onEvent: (text, meta) => events.push({ text, ...meta }) });
system.initialize(sim);
assert.ok(sim.agents.length >= 3);
const heroIds = sim.agents.map(agent => agent.heroId);
for (const id of ['hero.karg', 'hero.kirik', 'hero.nibble']) assert.ok(heroIds.includes(id), `missing ${id}`);
assert.equal(new Set(sim.agents.map(agent => agent.id)).size, sim.agents.length, 'every spawned hero agent must have a unique id');
assert.equal(placements.length, sim.agents.length);

const totalAfterFirstInit = sim.agents.length;
system.initialize(sim);
assert.equal(sim.agents.length, totalAfterFirstInit, 'heroes must not duplicate on repeated initialization');

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
assert.ok(snapshot.heroes.length >= 3);
assert.doesNotThrow(() => JSON.stringify(snapshot));
assert.ok(system.metrics().heroDefinitions >= 3);
console.log('WP8-A hero system smoke passed');
