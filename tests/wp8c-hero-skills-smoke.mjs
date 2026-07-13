import assert from 'node:assert/strict';
import { getHeroDefinition } from '../src/content/heroes/HeroDefinitions.js';
import { ensureHeroRuntime } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroPhysicsSystem } from '../src/sim/heroes/HeroPhysicsSystem.js';
import { HeroDeployableSystem } from '../src/sim/heroes/HeroDeployableSystem.js';
import { HeroEnvironmentSystem } from '../src/sim/heroes/HeroEnvironmentSystem.js';

const rooms = [
  { id: 'D20', x: 0, z: 0, w: 14, d: 12 },
  { id: 'C14', x: 0, z: 0, w: 14, d: 12, tags: ['flooded'], waterLevel: 1 },
  { id: 'J48', x: 0, z: 0, w: 14, d: 12 }
];
const makeHero = (id, roomId) => {
  const definition = getHeroDefinition(id);
  const agent = {
    id: `agent-${id.split('.').at(-1)}`, heroId: id, role: definition.role,
    name: definition.displayName, displayName: definition.displayName,
    faction: 'dungeon', ecologyFaction: definition.factionId, roomId,
    roomCell: { x: 0, z: 0 }, alive: true, departed: false, hidden: false,
    downed: false, travel: null, combat: null, hp: definition.baseStats.hp,
    maxHp: definition.baseStats.hp, attack: definition.baseStats.attack,
    courage: definition.baseStats.courage, armor: definition.baseStats.armor,
    size: definition.size, index: 1
  };
  ensureHeroRuntime(agent, definition);
  return agent;
};

const jijik = makeHero('hero.jijik', 'D20');
const tissa = makeHero('hero.tissa', 'C14');
const murga = makeHero('hero.murga', 'J48');
const enemyWall = { id: 'enemy-wall', roomId: 'D20', factionId: 'red-tusk-tribe', hp: 80, maxHp: 80, placement: { ox: 1, oz: 0 } };
const waterRoute = { id: 'route-C14-C15', from: 'C14', to: 'C15', type: 'hydraulic-service-way', state: 'flooded', water: true, active: true };
const routeGraph = { getRoute: id => id === waterRoute.id ? waterRoute : null };
const physics = new HeroPhysicsSystem();
const deployables = new HeroDeployableSystem();
const environment = new HeroEnvironmentSystem();
const skills = new HeroSkillSystem();
const effects = [];
const sim = {
  time: 0,
  rooms,
  agents: [jijik, tissa, murga],
  routeGraph,
  graph: new Map([['D20', []], ['C14', ['C15']], ['J48', []]]),
  constructionSystem: { structures: [enemyWall], jobs: [] },
  advancedEcologySystem: { traps: [] },
  ecosystem: { corpses: [] },
  heroPhysicsSystem: physics,
  heroDeployableSystem: deployables,
  heroEnvironmentSystem: environment,
  heroSkillSystem: skills,
  heroResourceLedger: {
    'goblin-clan': { powder: 12, scrap: 4 },
    'copper-tail-clutch': { scrap: 4 },
    'red-tusk-tribe': { meat: 12 }
  },
  emitEffect: (type, data) => effects.push({ type, ...data }),
  applyCombatDamage: (_source, target, amount) => { target.hp -= amount; },
  finalizeDeath: (_source, target) => { target.alive = false; target.hp = 0; },
  beginTravel: () => false
};
skills.initialize(sim);

const finishCast = (agent, skillId) => {
  const definition = getHeroDefinition(agent.heroId);
  const skill = definition.skills.find(item => item.id === skillId);
  skills.update(skill.windup + 0.01, sim);
  assert.equal(agent.heroCast?.phase, 'impact');
  skills.update(skill.impactDuration + 0.01, sim);
  assert.equal(agent.heroCast?.phase, 'recovery');
  skills.update(skill.recovery + 0.01, sim);
  assert.equal(agent.heroCast, null);
  assert.ok(agent.heroCooldowns[skillId] > 0);
};

// Jijik: costs are reserved, a persistent charge is created, and interruption refunds half.
assert.equal(skills.resolve(jijik, { type: 'hero-cast', skillId: 'jijik-breach-charge', targetStructureId: enemyWall.id }, sim), true);
assert.equal(sim.heroResourceLedger['goblin-clan'].powder, 10);
assert.equal(sim.heroResourceLedger['goblin-clan'].scrap, 3);
finishCast(jijik, 'jijik-breach-charge');
assert.equal(deployables.deployablesInRoom('D20', 'breach-charge').length, 1);

jijik.heroCooldowns['jijik-three-point-barrage'] = 0;
assert.equal(skills.resolve(jijik, { type: 'hero-cast', skillId: 'jijik-three-point-barrage' }, sim), true);
assert.equal(sim.heroResourceLedger['goblin-clan'].powder, 5);
const beforeInterruptedHp = jijik.hp;
jijik.hp -= jijik.maxHp * 0.3;
skills.update(0.05, sim);
assert.equal(jijik.heroCast, null);
assert.equal(skills.metrics().heroCastsInterrupted, 1);
assert.equal(sim.heroResourceLedger['goblin-clan'].powder, 7.5);
jijik.hp = beforeInterruptedHp;

// Tissa: pressure seal creates both a destructible actor and route-affecting field.
assert.equal(skills.resolve(tissa, { type: 'hero-cast', skillId: 'tissa-pressure-seal', targetRouteId: waterRoute.id }, sim), true);
finishCast(tissa, 'tissa-pressure-seal');
assert.equal(deployables.deployablesInRoom('C14', 'pressure-seal').length, 1);
assert.ok([...environment.fields.values()].some(field => field.kind === 'pressure-seal'));
assert.equal(waterRoute.waterSuppressed, true);
assert.equal(sim.heroResourceLedger['copper-tail-clutch'].scrap, 3);

tissa.heroCooldowns['tissa-emergency-drain'] = 0;
assert.equal(skills.resolve(tissa, { type: 'hero-cast', skillId: 'tissa-emergency-drain' }, sim), true);
finishCast(tissa, 'tissa-emergency-drain');
environment.update(0.1, sim);
assert.equal(rooms.find(room => room.id === 'C14').heroEnvironmentState, 'temporarily-drained');

// Murga: cauldron and war feast consume meat and become actual environment fields.
assert.equal(skills.resolve(murga, { type: 'hero-cast', skillId: 'murga-blood-root-broth' }, sim), true);
finishCast(murga, 'murga-blood-root-broth');
assert.equal(sim.heroResourceLedger['red-tusk-tribe'].meat, 10);
assert.equal(deployables.deployablesInRoom('J48', 'healing-cauldron').length, 1);
assert.ok([...environment.fields.values()].some(field => field.kind === 'healing-cauldron'));

murga.heroCooldowns['murga-war-feast'] = 0;
assert.equal(skills.resolve(murga, { type: 'hero-cast', skillId: 'murga-war-feast' }, sim), true);
finishCast(murga, 'murga-war-feast');
assert.equal(sim.heroResourceLedger['red-tusk-tribe'].meat, 4);
assert.ok([...environment.fields.values()].some(field => field.kind === 'war-feast'));

// Butcher hook uses a physical tether, then a timed non-combat work state, and returns meat.
const corpse = { id: 'corpse-orc', roomId: 'J48', x: 3.2, z: 0, food: 3, label: 'orc remains' };
sim.ecosystem.corpses.push(corpse);
murga.heroCooldowns['murga-butchers-hook'] = 0;
assert.equal(skills.resolve(murga, { type: 'hero-cast', skillId: 'murga-butchers-hook', targetId: corpse.id }, sim), true);
const hookSkill = getHeroDefinition('hero.murga').skills.find(item => item.id === 'murga-butchers-hook');
skills.update(hookSkill.windup + 0.01, sim);
assert.equal(physics.tethers.length, 1);
for (let i = 0; i < 45 && physics.tethers.length; i += 1) {
  physics.update(0.05, sim);
  skills.update(0.05, sim);
}
skills.update(0.05, sim);
assert.ok(murga.heroStatuses.butchering);
const meatBeforeButcher = sim.heroResourceLedger['red-tusk-tribe'].meat;
skills.update(2.1, sim);
assert.equal(sim.ecosystem.corpses.length, 0);
assert.ok(sim.heroResourceLedger['red-tusk-tribe'].meat > meatBeforeButcher);
assert.equal(murga.heroStatuses.butchering, undefined);

assert.ok(effects.some(effect => effect.type === 'hero-telegraph'));
assert.ok(effects.some(effect => effect.type === 'hero-impact'));
assert.doesNotThrow(() => JSON.stringify(skills.snapshot()));

console.log('WP8-C hero skills smoke passed');
