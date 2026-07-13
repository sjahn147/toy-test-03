import assert from 'node:assert/strict';
import { HeroDeployableSystem } from '../src/sim/heroes/HeroDeployableSystem.js';
import { HeroPhysicsSystem } from '../src/sim/heroes/HeroPhysicsSystem.js';

const events = [];
const deployables = new HeroDeployableSystem({ onEvent: (text, meta) => events.push({ text, ...meta }) });
const physics = new HeroPhysicsSystem();
const room = { id: 'D20', x: 0, z: 0, w: 12, d: 10 };
const owner = { id: 'jijik', heroId: 'hero.jijik', name: 'Jijik', faction: 'dungeon', ecologyFaction: 'goblin-clan', roomId: room.id, roomCell: { x: 0, z: 0 }, alive: true, hp: 76, maxHp: 76, size: 'small' };
const ally = { id: 'goblin', name: 'Goblin', faction: 'dungeon', ecologyFaction: 'goblin-clan', roomId: room.id, roomCell: { x: 0.9, z: 0 }, alive: true, hp: 20, maxHp: 20, size: 'small', heroBlastDamageMultiplier: 0, heroBlastImpulseMultiplier: 0.72 };
const hostile = { id: 'orc', name: 'Orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: room.id, roomCell: { x: 1.2, z: 0.15 }, alive: true, hp: 50, maxHp: 50, size: 'medium' };
const structure = { id: 'wall', roomId: room.id, factionId: 'red-tusk-tribe', hp: 80, maxHp: 80, placement: { ox: 0.8, oz: 0.2 } };
const effects = [];
const sim = {
  rooms: [room], agents: [owner, ally, hostile], heroPhysicsSystem: physics,
  constructionSystem: { structures: [structure] },
  emitEffect: (type, data) => effects.push({ type, ...data }),
  applyCombatDamage: (_source, target, amount) => { target.hp -= amount; }
};

const charge = deployables.createBreachCharge(owner, {
  targetStructureId: structure.id, ox: 0.8, oz: 0.2, arming: 0.2, fuse: 0.3,
  damage: 10, structureDamage: 30, radius: 3, impulse: 5, friendlyDamage: false
}, sim);
assert.equal(charge.state, 'arming');
for (let i = 0; i < 10; i += 1) {
  deployables.update(0.1, sim);
  physics.update(0.1, sim);
}
assert.equal(deployables.deployables.has(charge.id), false);
assert.ok(hostile.hp < 50, 'hostile should take blast damage');
assert.equal(ally.hp, 20, 'friendly damage should be suppressed');
assert.ok(Math.hypot(ally.heroPhysicsOffset?.x ?? 0, ally.heroPhysicsOffset?.z ?? 0) > 0, 'friendly impulse should remain');
assert.equal(structure.hp, 50, 'target structure should take authored structural damage');
assert.equal(deployables.metrics().heroDetonations, 1);
assert.ok(events.some(event => event.type === 'hero-explosion'));
assert.ok(effects.some(effect => effect.type === 'hero-explosion'));

const beforeBarrageHp = hostile.hp;
const beforeStructureHp = structure.hp;
const shells = deployables.launchBarrage(owner, {
  count: 3, interval: 0.1, flightDuration: 0.25, arcHeight: 3,
  damage: [4, 5, 6], structureDamage: [2, 3, 4], impulse: [1, 1, 1], radius: [4, 4, 4]
}, sim);
assert.equal(shells.length, 3);
assert.equal(deployables.projectiles.size, 3);
for (let i = 0; i < 12; i += 1) {
  deployables.update(0.1, sim);
  physics.update(0.1, sim);
}
assert.equal(deployables.projectiles.size, 0);
assert.ok(hostile.hp < beforeBarrageHp);
assert.equal(structure.hp, beforeStructureHp - 9);
assert.equal(deployables.metrics().heroDetonations, 4);

const seal = deployables.createPressureSeal(owner, 'route-C14-C15', { duration: 3, hp: 12 }, sim);
const cauldron = deployables.createCauldron(owner, { duration: 3, hp: 16 }, sim);
assert.equal(deployables.deployablesInRoom(room.id).length, 2);
assert.equal(deployables.damageDeployable(seal.id, 20, hostile, sim), true);
assert.equal(deployables.deployables.get(seal.id)?.state, 'destroyed');
deployables.update(0.1, sim);
assert.equal(deployables.deployables.has(seal.id), false);
assert.equal(deployables.deployables.has(cauldron.id), true);
assert.doesNotThrow(() => JSON.stringify(deployables.snapshot()));

console.log('WP8-C hero deployables smoke passed');

// Arming, fuse, and impact must remain deterministic through a single catch-up update.
{
  const catchUp = new HeroDeployableSystem();
  const catchPhysics = new HeroPhysicsSystem();
  const catchHostile = { ...hostile, id: 'catch-hostile', hp: 30, maxHp: 30, roomCell: { x: 0.8, z: 0 } };
  const catchSim = {
    rooms: [room], agents: [owner, catchHostile], heroPhysicsSystem: catchPhysics,
    constructionSystem: { structures: [] }, emitEffect: () => {},
    applyCombatDamage: (_source, target, amount) => { target.hp -= amount; }
  };
  catchUp.createBreachCharge(owner, { arming: 0.1, fuse: 0.15, damage: 6, radius: 2, impulse: 2 }, catchSim);
  catchUp.update(0.3, catchSim);
  assert.equal(catchUp.metrics().heroDetonations, 1);
  assert.ok(catchHostile.hp < 30);
  assert.ok(Math.abs(catchUp.clock - 0.3) < 0.0001);
}
