import assert from 'node:assert/strict';
import {
  updateHeroSecondaryMotion,
  resetHeroSecondaryMotion,
  secondaryMotionSnapshot,
  applyVolumePreservingSquash
} from '../src/engine/heroes/HeroSecondaryMotion.js';

class Vec {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vec(this.x, this.y, this.z); }
  copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; }
}

function joint(name, position = [0, 0, 0]) {
  const item = {
    name,
    position: new Vec(...position),
    rotation: new Vec(),
    scale: new Vec(1, 1, 1),
    userData: {}
  };
  item.userData.baseTransform = {
    position: item.position.clone(),
    rotation: item.rotation.clone(),
    scale: item.scale.clone()
  };
  return item;
}

function makeMesh() {
  const joints = {
    veil0: joint('veil0'),
    veil1: joint('veil1'),
    handL: joint('handL'),
    handR: joint('handR'),
    crown: joint('crown'),
    artifactA: joint('artifactA'),
    artifactB: joint('artifactB')
  };
  return {
    userData: {
      joints,
      secondaryMotionConfig: [
        { id: 'veil', mode: 'veil-chain', joints: ['veil0', 'veil1'], property: 'rotation', amplitude: 0.12, stiffness: 18, damping: 7 },
        { id: 'hands', mode: 'floating-hands', joints: ['handL', 'handR'], property: 'position', amplitude: 0.08, stiffness: 14, damping: 5 },
        { id: 'artifacts', mode: 'artifact-float', joints: ['artifactA', 'artifactB'], property: 'position', amplitude: 0.1, stiffness: 10, damping: 4 },
        { id: 'crown', mode: 'crown-stabilizer', joints: ['crown'], property: 'position', amplitude: 0.13, stiffness: 11, damping: 5 }
      ]
    }
  };
}

function restore(mesh) {
  for (const item of Object.values(mesh.userData.joints)) {
    const base = item.userData.baseTransform;
    item.position.copy(base.position);
    item.rotation.copy(base.rotation);
    item.scale.copy(base.scale);
  }
}

const a = makeMesh();
const b = makeMesh();
const agent = { id: 'hero-glop-agent', heroId: 'hero.glop', heroStance: 'chalice', travel: { progress: 0.5 }, heroCast: { phase: 'windup', elapsed: 0.5, duration: 1 } };

for (let frame = 0; frame < 1800; frame += 1) {
  const time = frame / 60;
  restore(a);
  restore(b);
  assert.equal(updateHeroSecondaryMotion(a, agent, time), true);
  assert.equal(updateHeroSecondaryMotion(b, agent, time), true);
  for (const name of Object.keys(a.userData.joints)) {
    const left = a.userData.joints[name];
    const right = b.userData.joints[name];
    for (const property of ['position', 'rotation', 'scale']) {
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Number.isFinite(left[property][axis]), `${name}.${property}.${axis} became non-finite`);
        assert.ok(Math.abs(left[property][axis]) < 4, `${name}.${property}.${axis} drifted`);
        assert.equal(left[property][axis], right[property][axis], 'secondary motion must be deterministic');
      }
    }
  }
}

const snapshot = secondaryMotionSnapshot(a);
assert.ok(snapshot.lastTime > 20);
assert.ok(Object.keys(snapshot.channels).length >= 7);
for (const channel of Object.values(snapshot.channels)) {
  for (const value of Object.values(channel)) assert.ok(Number.isFinite(value));
}

const squashJoint = joint('blob');
applyVolumePreservingSquash(squashJoint, 0.28, 0.03);
const volume = squashJoint.scale.x * squashJoint.scale.y * squashJoint.scale.z;
assert.ok(Math.abs(volume - (1 - 0.03 ** 2)) < 0.02, `squash should approximately preserve volume, got ${volume}`);

resetHeroSecondaryMotion(a);
assert.deepEqual(secondaryMotionSnapshot(a), { lastTime: 0, channels: {} });

console.log('WP8-B deterministic secondary-motion and volume-preservation smoke passed');
