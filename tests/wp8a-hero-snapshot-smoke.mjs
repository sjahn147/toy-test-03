import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';

const sim = {
  time: 0,
  rooms: [{ id: 'D19' }, { id: 'D18' }, { id: 'J49' }, { id: 'I41' }],
  agents: [],
  graph: new Map([['D19', ['I41']], ['I41', ['D19']], ['D18', []], ['J49', []]]),
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
  equipmentSystem: { initializeAgent() {} },
  occupancy: { placeAgent() { return true; } },
  constructionSystem: { structures: [] },
  advancedEcologySystem: { traps: [] }
};
const heroSystem = new HeroSystem();
const skillSystem = new HeroSkillSystem();
const leadershipSystem = new HeroLeadershipSystem();
heroSystem.initialize(sim);
skillSystem.initialize(sim);
const nibble = sim.agents.find(agent => agent.heroId === 'hero.nibble');
skillSystem.resolve(nibble, { type: 'hero-cast', skillId: 'nibble-lock-the-ways', targetRoomId: 'D19' }, sim);
skillSystem.update(2, sim);
leadershipSystem.update(0.5, sim);
heroSystem.update(0.5, sim);

const payload = {
  heroes: heroSystem.snapshot(),
  heroSkills: skillSystem.snapshot(),
  heroLeadership: leadershipSystem.snapshot()
};
const serialized = JSON.stringify(payload);
assert.ok(serialized.length > 100);
const roundTrip = JSON.parse(serialized);
assert.equal(roundTrip.heroes.heroes.length, 3);
assert.ok(Array.isArray(roundTrip.heroSkills.routeLocks));
assert.ok(Array.isArray(roundTrip.heroLeadership.activeEffects));
assert.equal(containsMapOrSet(payload), false, 'snapshot payload must not leak Map or Set');
console.log('WP8-A hero snapshot smoke passed');

function containsMapOrSet(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Map || value instanceof Set) return true;
  if (seen.has(value)) return false;
  seen.add(value);
  const values = Array.isArray(value) ? value : Object.values(value);
  return values.some(item => containsMapOrSet(item, seen));
}
