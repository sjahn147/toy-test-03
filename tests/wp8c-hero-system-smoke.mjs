import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { getHeroDefinition, listHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';

const roomIds = [...new Set(listHeroDefinitions().map(hero => hero.initialRoomId))];
const placed = [];
const sim = {
  time: 0,
  rooms: roomIds.map(id => ({ id, w: 18, d: 14, tags: [] })),
  agents: [],
  effects: [],
  combatSystem: { initializeAgent(agent) { agent.combatInitialized = true; } },
  equipmentSystem: { initializeAgent(agent) { agent.equipmentInitialized = true; } },
  occupancy: {
    placeAgent(agent, roomId) {
      agent.roomId = roomId;
      agent.roomCell = { x: 0, z: 0, footprint: [] };
      placed.push(agent.id);
      return agent.roomCell;
    }
  },
  emitEffect(type, payload) { this.effects.push({ type, ...payload }); }
};

const system = new HeroSystem();
system.initialize(sim);
assert.ok(sim.agents.length >= 9, 'WP8-C must expose the cumulative nine completed heroes');
assert.equal(new Set(sim.agents.map(agent => agent.heroId)).size, sim.agents.length, 'hero identities must remain unique');
assert.equal(placed.length, sim.agents.length, 'every hero must receive an occupancy placement');

const totalAfterFirstInit = sim.agents.length;
system.initialize(sim);
assert.equal(sim.agents.length, totalAfterFirstInit, 'reinitialization must not duplicate unique heroes');

for (const heroId of ['hero.jijik', 'hero.tissa', 'hero.murga']) {
  const definition = getHeroDefinition(heroId);
  const agent = sim.agents.find(candidate => candidate.heroId === heroId);
  assert.ok(agent, `${heroId} must spawn`);
  assert.equal(agent.unique, true);
  assert.equal(agent.isHero, true);
  assert.equal(agent.role, definition.role);
  assert.equal(agent.maxHp, definition.baseStats.hp);
  assert.ok(agent.heroMassMultiplier > 0.8, `${heroId} must participate in physical mass resolution`);
  assert.ok(agent.heroKnockbackResistance >= 0 && agent.heroKnockbackResistance < 1);
  assert.equal(agent.combatInitialized, true);
  assert.equal(agent.equipmentInitialized, true);

  agent.hp = definition.baseStats.hp * 0.5;
  system.update(0, sim);
  assert.equal(agent.heroDamageStage, 1, `${heroId} must expose stage-one visual damage`);
  agent.hp = definition.baseStats.hp * 0.2;
  system.update(0, sim);
  assert.equal(agent.heroDamageStage, 2, `${heroId} must expose stage-two visual damage`);
}

const jijik = sim.agents.find(agent => agent.heroId === 'hero.jijik');
system.onAgentDeath(jijik, sim);
sim.agents = sim.agents.filter(agent => agent.id !== jijik.id);
system.initialize(sim);
assert.equal(sim.agents.some(agent => agent.heroId === 'hero.jijik'), false, 'dead heroes must never respawn through initialization');
assert.equal(system.stateFor('hero.jijik').state, 'dead');

const snapshot = system.snapshot();
assert.ok(snapshot.heroes.length >= 9);
assert.doesNotThrow(() => JSON.stringify(snapshot));
assert.ok(system.metrics().heroDefinitions >= 9);

console.log('WP8-C hero system smoke passed');
