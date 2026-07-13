import assert from 'node:assert/strict';
import { animateHeroMiniature } from '../src/engine/heroes/HeroAnimator.js';

class Vec {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(value) { this.x = this.y = this.z = value; return this; }
  clone() { return new Vec(this.x, this.y, this.z); }
  copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; }
  multiplyScalar(value) { this.x *= value; this.y *= value; this.z *= value; return this; }
}

function joint(name) {
  const position = new Vec();
  const rotation = new Vec();
  const scale = new Vec(1, 1, 1);
  return { name, position, rotation, scale, visible: true, userData: { baseTransform: { position: position.clone(), rotation: rotation.clone(), scale: scale.clone() } } };
}

function meshFor(heroId, profile, names) {
  const joints = Object.fromEntries(names.map(name => [name, joint(name)]));
  const ring = { name: 'hero-ring', rotation: new Vec(), position: new Vec(), scale: new Vec(1, 1, 1), material: { opacity: 0.8 } };
  const inner = { name: 'hero-ring-inner', rotation: new Vec(), position: new Vec(), scale: new Vec(1, 1, 1), material: { opacity: 0.7 } };
  const marker = { name: 'hero-marker', rotation: new Vec(), position: new Vec(0, 2, 0), scale: new Vec(1, 1, 1), material: {} };
  const hp = { name: 'hp', rotation: new Vec(), position: new Vec(), scale: new Vec(1, 1, 1), material: {} };
  const named = new Map([[ring.name, ring], [inner.name, inner], [marker.name, marker], [hp.name, hp]]);
  const stage1Hide = [{ visible: true }];
  const stage2Hide = [{ visible: true }];
  const stage1Show = [{ visible: false }];
  const stage2Show = [{ visible: false }];
  return {
    userData: {
      isHero: true,
      heroId,
      animationProfile: profile,
      baseScale: 1,
      joints,
      damageParts: { stage1Hide, stage2Hide, stage1Show, stage2Show }
    },
    position: new Vec(),
    rotation: new Vec(),
    scale: new Vec(1, 1, 1),
    getObjectByName(name) { return named.get(name) ?? null; }
  };
}

const nibbleJoints = ['motionRoot','pelvis','legL','legR','upperArmL','upperArmR','chest','head','handL','handR','shoulderL','shoulderR','staff','keyRing','coatLeft','coatRight','coatBack'];
const nibbleMesh = meshFor('hero.nibble', 'nibble', nibbleJoints);
const nibble = {
  id: 'nibble', heroId: 'hero.nibble', role: 'hero-nibble', alive: true, hp: 50, maxHp: 68, heroDamageStage: 1,
  heroCast: { skillId: 'nibble-everyone-out', phase: 'windup', elapsed: 1.0, duration: 1.9 }, heroStatuses: {}, travel: null
};
assert.equal(animateHeroMiniature(nibbleMesh, nibble, 1.2), true);
assert.notEqual(nibbleMesh.userData.joints.coatLeft.rotation.z, 0);
assert.notEqual(nibbleMesh.userData.joints.shoulderL.rotation.z, 0);
assert.equal(nibbleMesh.userData.damageParts.stage1Hide[0].visible, false);
assert.equal(nibbleMesh.userData.damageParts.stage1Show[0].visible, true);

const kirikNames = ['motionRoot','chassis','pilotBody','pilotHead','toolArmL','toolArmR','gear','lens','leg0','leg1','leg2','knee0','knee1','knee2','foot0','foot1','foot2','stabilizer0','stabilizer1','stabilizer2'];
const kirikMesh = meshFor('hero.kirik', 'kirik-tripod', kirikNames);
const kirik = {
  id: 'kirik', heroId: 'hero.kirik', role: 'hero-kirik', alive: true, hp: 70, maxHp: 82, heroDamageStage: 0,
  heroCast: { skillId: 'kirik-triangle-bastion', phase: 'windup', elapsed: 1.7, duration: 2.3 }, heroStatuses: {}, travel: null
};
animateHeroMiniature(kirikMesh, kirik, 2);
assert.ok(kirikMesh.userData.joints.chassis.position.y < 0);
assert.notEqual(kirikMesh.userData.joints.stabilizer0.rotation.x, 0);
assert.notEqual(kirikMesh.userData.joints.gear.rotation.z, 0);

const kargNames = ['motionRoot','pelvis','legL','legR','upperArmL','upperArmR','chest','head','shoulderL','shoulderR','weaponRoot','armorShell','bannerL','bannerR'];
const kargMesh = meshFor('hero.karg', 'karg-heavy', kargNames);
const karg = {
  id: 'karg', heroId: 'hero.karg', role: 'hero-karg', alive: true, hp: 30, maxHp: 118, heroDamageStage: 2,
  heroVariant: 'second-defeat', heroCast: { skillId: 'karg-remember-second-defeat', phase: 'impact', elapsed: 0, duration: 0.08 }, heroStatuses: { secondDefeat: { remaining: 10 } }, travel: null
};
animateHeroMiniature(kargMesh, karg, 3);
assert.equal(kargMesh.userData.joints.armorShell.visible, false);
assert.equal(kargMesh.userData.damageParts.stage2Show[0].visible, true);
assert.notEqual(kargMesh.userData.joints.shoulderL.rotation.z, 0);
assert.ok(kargMesh.scale.x > 0);

console.log('WP8-A hero animation smoke passed');
