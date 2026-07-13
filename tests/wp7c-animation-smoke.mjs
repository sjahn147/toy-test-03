import assert from 'node:assert/strict';
import { animateEliteMiniature } from '../src/miniatures/MiniatureAnimator.js';

class Vec {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vec(this.x, this.y, this.z); }
  copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(v) { this.x = this.y = this.z = v; return this; }
}
function joint(name) {
  const position = new Vec();
  const rotation = new Vec();
  const scale = new Vec(1, 1, 1);
  return { name, position, rotation, scale, userData: { baseTransform: { position: position.clone(), rotation: rotation.clone(), scale: scale.clone() } } };
}
const joints = Object.fromEntries(['motionRoot','pelvis','legL','legR','chest','head','shoulderL','shoulderR','upperArmL','upperArmR','armL','armR'].map(name => [name, joint(name)]));
const ring = { rotation: new Vec(), material: { opacity: 0.7 }, scale: new Vec(1,1,1) };
const mesh = {
  userData: { articulated: true, joints, animationProfile: 'biped', baseScale: 1 },
  scale: new Vec(1,1,1),
  getObjectByName(name) { return name === 'elite-ring' ? ring : null; },
  traverse(callback) { callback({ name: 'elite-kit:test', visible: true }); }
};
const agent = {
  id: 'elite-test', size: 'medium', hp: 20, maxHp: 40, travel: { phase: 'corridor' }, combat: null,
  eliteCast: { abilityId: 'shield-rush', phase: 'windup', elapsed: 0.5, duration: 1 }, eliteStatuses: {}, eliteSpawnRemaining: 0
};
assert.equal(animateEliteMiniature(mesh, agent, 1.25), true);
assert.notEqual(joints.legL.rotation.x, 0);
assert.notEqual(joints.shoulderR.rotation.x, 0);
assert.equal(mesh.scale.x, 1);
console.log('WP7-C animation smoke passed');
