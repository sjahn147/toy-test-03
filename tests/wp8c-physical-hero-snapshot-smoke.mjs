import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';
import { HeroPhysicsSystem } from '../src/sim/heroes/HeroPhysicsSystem.js';
import { HeroDeployableSystem } from '../src/sim/heroes/HeroDeployableSystem.js';
import { HeroEnvironmentSystem } from '../src/sim/heroes/HeroEnvironmentSystem.js';
import { listHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';

const rooms = [...new Set(listHeroDefinitions().map(hero => hero.initialRoomId))].map((id, index) => ({ id, x: index * 20, z: 0, w: 14, d: 12, tags: id === 'C14' ? ['flooded'] : [] }));
const sim = {
  time: 0,
  rooms,
  agents: [],
  graph: new Map(rooms.map(room => [room.id, []])),
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
  equipmentSystem: { initializeAgent() {} },
  occupancy: { placeAgent(agent, roomId) { const room = rooms.find(item => item.id === roomId); agent.roomCell = { x: room.x, z: room.z }; return true; } },
  constructionSystem: { structures: [], jobs: [] },
  advancedEcologySystem: { traps: [] },
  heroResourceLedger: { 'goblin-clan': { powder: 10, scrap: 5 }, 'copper-tail-clutch': { scrap: 5 }, 'red-tusk-tribe': { meat: 10 } },
  emitEffect() {},
  event() {}
};
const heroes = new HeroSystem();
const skills = new HeroSkillSystem();
const leadership = new HeroLeadershipSystem();
const physics = new HeroPhysicsSystem();
const deployables = new HeroDeployableSystem();
const environment = new HeroEnvironmentSystem();
Object.assign(sim, { heroSystem: heroes, heroSkillSystem: skills, heroLeadershipSystem: leadership, heroPhysicsSystem: physics, heroDeployableSystem: deployables, heroEnvironmentSystem: environment });
heroes.initialize(sim);
skills.initialize(sim);
leadership.update(0.2, sim);
const jijik = sim.agents.find(agent => agent.heroId === 'hero.jijik');
const tissa = sim.agents.find(agent => agent.heroId === 'hero.tissa');
const murga = sim.agents.find(agent => agent.heroId === 'hero.murga');
deployables.createBreachCharge(jijik, { arming: 1, fuse: 2 }, sim);
deployables.launchBarrage(jijik, { count: 2, flightDuration: 1 }, sim);
environment.createEmergencyDrain(tissa, { duration: 8 }, sim);
physics.applyImpulse(murga, { x: 1, z: 0 }, 3, { sourceId: jijik.id });
heroes.update(0.1, sim);

const payload = {
  heroes: heroes.snapshot(),
  heroSkills: skills.snapshot(),
  heroLeadership: leadership.snapshot(),
  heroPhysics: physics.snapshot(),
  heroDeployables: deployables.snapshot(),
  heroEnvironment: environment.snapshot()
};
assert.equal(payload.heroes.heroes.length, 9);
assert.equal(payload.heroDeployables.deployables.length, 1);
assert.equal(payload.heroDeployables.projectiles.length, 2);
assert.equal(payload.heroEnvironment.fields.length, 1);
assert.equal(payload.heroPhysics.impulses.length, 1);
assert.equal(containsMapOrSet(payload), false);
const serialized = JSON.stringify(payload);
assert.ok(serialized.length > 1000);
const restored = JSON.parse(serialized);
assert.equal(restored.heroes.heroes.find(hero => hero.id === 'hero.jijik').roomId, 'D20');
assert.equal(restored.heroDeployables.deployables[0].kind, 'breach-charge');
assert.equal(restored.heroEnvironment.fields[0].kind, 'emergency-drain');
console.log('WP8-C hero snapshot smoke passed');

function containsMapOrSet(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Map || value instanceof Set) return true;
  if (seen.has(value)) return false;
  seen.add(value);
  return (Array.isArray(value) ? value : Object.values(value)).some(item => containsMapOrSet(item, seen));
}
