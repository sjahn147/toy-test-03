import assert from 'node:assert/strict';
import { HeroPhysicsSystem } from '../src/sim/heroes/HeroPhysicsSystem.js';

const events = [];
const physics = new HeroPhysicsSystem({ onEvent: (text, meta) => events.push({ text, ...meta }) });
const room = { id: 'R1', x: 0, z: 0, w: 8, d: 8 };
const source = { id: 'jijik', name: 'Jijik', roomId: 'R1', roomCell: { x: 0, z: 0 }, alive: true, size: 'small', isHero: true };
const target = { id: 'target', name: 'Target', roomId: 'R1', roomCell: { x: 3.45, z: 0 }, alive: true, size: 'small', heroStatuses: {}, combat: { id: 'combat' } };
const sim = { rooms: [room], agents: [source, target] };

const impulse = physics.applyImpulse(target, { x: 1, z: 0 }, 8, { sourceId: source.id, duration: 0.6, collisionStagger: 0.9 });
assert.ok(impulse);
physics.update(0.05, sim);
assert.ok(target.heroPhysicsOffset.x > 0);
assert.ok(target.heroStatuses.stagger?.collision);
for (let i = 1; i < 8; i += 1) physics.update(0.05, sim);
assert.equal(target.combat, null);
assert.ok(events.some(event => event.type === 'hero-physics-collision'));

for (let i = 0; i < 30; i += 1) physics.update(0.05, sim);
assert.ok(Math.abs(target.heroPhysicsOffset.x) < 0.15);
assert.equal(target.heroStatuses.displaced, undefined);

const pulled = { id: 'downed', roomId: 'R1', roomCell: { x: 2.6, z: 0 }, alive: true, size: 'medium', heroStatuses: {}, combat: { id: 'x' } };
sim.agents.push(pulled);
const tether = physics.createTether(source, pulled, { targetType: 'agent', duration: 2, strength: 5, completeDistance: 0.45, payload: { action: 'test' } });
assert.ok(tether);
for (let i = 0; i < 50 && physics.tethers.length; i += 1) physics.update(0.05, sim);
const completed = physics.takeCompletedTethers();
assert.equal(completed.length, 1);
assert.equal(completed[0].targetId, pulled.id);
assert.equal(pulled.combat, null);
assert.ok(Math.abs(pulled.heroPhysicsOffset.x) > 1);
assert.equal(physics.snapshot().tethers.length, 0);
console.log('WP8-C hero physics smoke passed');

// A single renderer-sized frame spike must advance the physical timeline through fixed substeps.
{
  const fixed = new HeroPhysicsSystem();
  const runner = { id: 'runner', roomId: 'R1', roomCell: { x: 0, z: 0 }, alive: true, size: 'small', heroStatuses: {} };
  const fixedSim = { rooms: [room], agents: [runner] };
  fixed.applyImpulse(runner, { x: 1, z: 0 }, 5, { duration: 0.35, damping: 4 });
  fixed.update(0.35, fixedSim);
  assert.ok(Math.abs(fixed.clock - 0.35) < 0.0001, 'physics must not discard elapsed time within its catch-up budget');
  assert.equal(fixed.impulses.length, 0, 'fixed substeps must expire a completed impulse in one large update');
  assert.ok(runner.heroPhysicsOffset.x > 0);
}

// Moving bodies must separate by mass instead of occupying the same visual point.
{
  const collisionPhysics = new HeroPhysicsSystem();
  const light = { id: 'light', roomId: 'R1', roomCell: { x: 0, z: 0 }, alive: true, size: 'small', heroStatuses: {} };
  const heavy = { id: 'heavy', roomId: 'R1', roomCell: { x: 0.05, z: 0 }, alive: true, size: 'large', heroStatuses: {}, heroMassMultiplier: 1.5 };
  const collisionSim = { rooms: [room], agents: [light, heavy] };
  collisionPhysics.applyImpulse(light, { x: 1, z: 0 }, 2, { duration: 0.1, damping: 12 });
  collisionPhysics.update(0.05, collisionSim);
  const lightPosition = collisionPhysics.localPosition(light, collisionSim);
  const heavyPosition = collisionPhysics.localPosition(heavy, collisionSim);
  assert.ok(Math.hypot(lightPosition.x - heavyPosition.x, lightPosition.z - heavyPosition.z) >= 0.84 - 0.001);
  assert.ok(Math.abs(light.heroPhysicsOffset.x) > Math.abs(heavy.heroPhysicsOffset.x), 'lighter bodies should absorb more positional correction');
  assert.ok(collisionPhysics.metrics().heroAgentCollisions > 0);
}
