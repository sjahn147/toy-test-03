import assert from 'node:assert/strict';
import { HeroEnvironmentSystem } from '../src/sim/heroes/HeroEnvironmentSystem.js';
import { HeroDeployableSystem } from '../src/sim/heroes/HeroDeployableSystem.js';

const room = { id: 'C14', x: 0, z: 0, w: 12, d: 10, waterLevel: 1, tags: ['flooded'] };
const route = { id: 'route-C14-C15', from: 'C14', to: 'C15', water: true };
const routeGraph = { getRoute: id => id === route.id ? route : null };
const tissa = { id: 'tissa', heroId: 'hero.tissa', role: 'hero-tissa', faction: 'dungeon', ecologyFaction: 'copper-tail-clutch', roomId: room.id, alive: true, hp: 70, maxHp: 74, speedMultiplier: 1, courage: 16, armor: 2 };
const ally = { id: 'kobold', role: 'kobold', faction: 'dungeon', ecologyFaction: 'copper-tail-clutch', roomId: room.id, alive: true, hp: 7, maxHp: 10, speedMultiplier: 1, courage: 5, armor: 0, fear: 2 };
const aquaticEnemy = { id: 'slime', role: 'slime', faction: 'dungeon', ecologyFaction: 'slime-bloom', roomId: room.id, alive: true, hp: 20, maxHp: 20, speedMultiplier: 1, courage: 4, armor: 0 };
const sim = { rooms: [room], agents: [tissa, ally, aquaticEnemy], routeGraph, emitEffect: () => {} };
const deployables = new HeroDeployableSystem();
const environment = new HeroEnvironmentSystem();
sim.heroDeployableSystem = deployables;
sim.heroEnvironmentSystem = environment;

const sealDeployable = deployables.createPressureSeal(tissa, route.id, { duration: 2, hp: 10 }, sim);
const sealField = environment.createPressureSeal(tissa, sealDeployable, { duration: 2 }, sim);
environment.update(0.1, sim);
assert.equal(route.waterSuppressed, true);
assert.equal(route.aquaticSpawnsSuppressed, true);
assert.equal(route.heroPressureSealId, sealField.id);
assert.equal(room.heroWaterFlowSuppressed, true);
assert.equal(environment.isWaterRouteSuppressed(route.id), true);
assert.equal(environment.isSpawnSuppressed(room.id, 'slime'), true);

environment.createEmergencyDrain(tissa, { duration: 1, waterLevelDelta: -1, alliedSpeedMultiplier: 1.2, aquaticEnemyMultiplier: 0.6 }, sim);
environment.update(0.1, sim);
assert.equal(room.heroEnvironmentState, 'temporarily-drained');
assert.equal(room.heroWaterLevelDelta, -1);
assert.equal(room.heroSubmergedSocketsRevealed, true);
assert.equal(tissa.speedMultiplier, 1, 'aquatic Tissa should not receive a dry-ground speed bonus');
assert.equal(ally.speedMultiplier, 1.2);
assert.equal(aquaticEnemy.speedMultiplier, 0.6);

for (let i = 0; i < 12; i += 1) environment.update(0.1, sim);
assert.equal(environment.fields.has(sealField.id), true, 'pressure seal remains while its independent duration is active');
// Expire the linked deployable and field, then verify route state restoration.
deployables.damageDeployable(sealDeployable.id, 999, aquaticEnemy, sim);
deployables.update(0.1, sim);
environment.update(0.1, sim);
assert.equal(route.heroPressureSealId, undefined);
assert.equal(route.waterSuppressed, undefined);

// Healing cauldron field is linked to a destructible world actor.
const murga = { id: 'murga', heroId: 'hero.murga', role: 'hero-murga', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: room.id, alive: true, hp: 80, maxHp: 104, speedMultiplier: 1, courage: 20, armor: 3, fear: 1 };
const orc = { id: 'orc', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: room.id, alive: true, hp: 10, maxHp: 22, speedMultiplier: 1, courage: 10, armor: 1, fear: 3 };
sim.agents.push(murga, orc);
const cauldron = deployables.createCauldron(murga, { duration: 2, hp: 20, healPerSecond: 4, fearRecoveryPerSecond: 2 }, sim);
const cauldronField = environment.createHealingCauldron(murga, cauldron, { duration: 2, healPerSecond: 4, fearRecoveryPerSecond: 2 }, sim);
const orcHp = orc.hp;
environment.update(0.5, sim);
assert.ok(orc.hp > orcHp);
assert.ok(orc.fear < 3);
assert.ok(orc.heroStatuses.brothWarmth);

deployables.damageDeployable(cauldron.id, 99, aquaticEnemy, sim);
deployables.update(0.1, sim);
environment.update(0.1, sim);
assert.equal(environment.fields.has(cauldronField.id), false);

const feast = environment.createWarFeast(murga, { duration: 2, attackMultiplier: 1.25, lifesteal: 0.2 }, sim);
environment.update(0.1, sim);
assert.equal(orc.courage, 13);
assert.equal(orc.heroStatuses.warFeast.noRetreat, true);
assert.equal(environment.modifyOutgoingDamage(orc, aquaticEnemy, 8), 10);
orc.hp = 10;
assert.equal(environment.onDamageDealt(orc, aquaticEnemy, 10), 2);
assert.equal(orc.hp, 12);

for (let i = 0; i < 25; i += 1) environment.update(0.1, sim);
assert.equal(environment.fields.has(feast.id), false);
assert.equal(orc.courage, 10);
assert.equal(room.heroEnvironmentState, undefined);
assert.doesNotThrow(() => JSON.stringify(environment.snapshot()));

console.log('WP8-C hero environment smoke passed');

// Overlapping fields must always restore from one baseline rather than compound every substep.
{
  const overlap = new HeroEnvironmentSystem();
  const overlapRoom = { id: 'J48', tags: ['flooded'], waterLevel: 1 };
  const overlapMurga = { id: 'm2', role: 'hero-murga', heroId: 'hero.murga', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'J48', alive: true, hp: 80, maxHp: 100, speedMultiplier: 1, courage: 20, armor: 3 };
  const overlapOrc = { id: 'o2', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'J48', alive: true, hp: 20, maxHp: 20, speedMultiplier: 1, courage: 10, armor: 1 };
  const overlapSim = { rooms: [overlapRoom], agents: [overlapMurga, overlapOrc], emitEffect: () => {} };
  overlap.createWarFeast(overlapMurga, { duration: 1, attackMultiplier: 1.2 }, overlapSim);
  overlap.createEmergencyDrain(overlapMurga, { duration: 1, alliedSpeedMultiplier: 1.15 }, overlapSim);
  overlap.update(0.5, overlapSim);
  assert.equal(overlapOrc.courage, 13);
  assert.equal(overlapOrc.speedMultiplier, 1.15);
  overlap.update(0.5, overlapSim);
  assert.equal(overlapOrc.courage, 10, 'expired overlapping fields must restore the original courage exactly');
  assert.equal(overlapOrc.speedMultiplier, 1, 'expired overlapping fields must restore the original movement speed exactly');
}
