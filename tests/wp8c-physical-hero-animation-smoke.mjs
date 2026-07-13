import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';

const root = await mkdtemp(join(tmpdir(), 'wp8c-animation-'));
await mkdir(join(root, 'src/engine/heroes'), { recursive: true });
await mkdir(join(root, 'src/content/heroes'), { recursive: true });
await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(join(root, 'src/engine/ThreeScene.js'), THREE_STUB);
for (const file of ['HeroMiniatureFactory.js', 'HeroAnimator.js', 'HeroSecondaryMotion.js']) {
  await copyFile(new URL(`../src/engine/heroes/${file}`, import.meta.url), join(root, `src/engine/heroes/${file}`));
}
for (const file of ['HeroDefinitions.js', 'HeroAnimationClips.js']) {
  await copyFile(new URL(`../src/content/heroes/${file}`, import.meta.url), join(root, `src/content/heroes/${file}`));
}
const factoryUrl = pathToFileURL(join(root, 'src/engine/heroes/HeroMiniatureFactory.js')).href;
const animatorUrl = pathToFileURL(join(root, 'src/engine/heroes/HeroAnimator.js')).href;
const { createHeroMiniature } = await import(`${factoryUrl}?v=1`);
const { animateHeroMiniature } = await import(`${animatorUrl}?v=1`);

const cases = [
  {
    id: 'hero.jijik', role: 'hero-jijik', skill: 'jijik-air-cannon', movingJoint: 'mechanicalShoulder',
    skillCheck: mesh => {
      assert.equal(mesh.userData.skillParts.toolNozzle.visible, true);
      assert.equal(mesh.userData.skillParts.toolHammer.visible, false);
      assert.ok(Math.abs(mesh.userData.joints.mechanicalElbow.rotation.x) > 0.05);
    }
  },
  {
    id: 'hero.tissa', role: 'hero-tissa', skill: 'tissa-emergency-drain', movingJoint: 'tailBase',
    aquatic: true,
    skillCheck: mesh => {
      assert.ok(Math.abs(mesh.userData.joints.gauge.rotation.z) > 0.1);
      assert.ok(Math.abs(mesh.userData.joints.shoulderL.rotation.z) > 0.1);
    }
  },
  {
    id: 'hero.murga', role: 'hero-murga', skill: 'murga-war-feast', movingJoint: 'cauldronRoot',
    skillCheck: mesh => {
      assert.ok(Math.abs(mesh.userData.joints.lid.rotation.z) > 0.1);
      assert.ok(Math.abs(mesh.userData.joints.cleaverRoot.rotation.z) > 0.1);
    }
  }
];

for (const item of cases) {
  const agent = {
    id: `agent-${item.role}`, heroId: item.id, role: item.role, faction: 'dungeon',
    hp: 100, maxHp: 100, alive: true, index: 1, travel: { phase: 'corridor' },
    mood: 'moving', heroRevealRemaining: 0, heroDamageStage: 0, heroAquaticMode: item.aquatic === true
  };
  const mesh = createHeroMiniature(agent);
  assert.equal(animateHeroMiniature(mesh, agent, 1.25), true);
  const locomotionValue = mesh.userData.joints[item.movingJoint].rotation.x + mesh.userData.joints[item.movingJoint].rotation.y + mesh.userData.joints[item.movingJoint].rotation.z;
  assert.ok(Math.abs(locomotionValue) > 0.001, `${item.id} should articulate during locomotion`);

  agent.travel = null;
  agent.heroCast = { skillId: item.skill, phase: 'windup', elapsed: 0.7, duration: 1 };
  animateHeroMiniature(mesh, agent, 2.0);
  item.skillCheck(mesh);

  const marker = mesh.getObjectByName('hero-marker');
  const joint = mesh.userData.joints[item.movingJoint];
  const snapshot = {
    markerY: marker.position.y,
    rx: joint.rotation.x, ry: joint.rotation.y, rz: joint.rotation.z,
    px: joint.position.x, py: joint.position.y, pz: joint.position.z
  };
  animateHeroMiniature(mesh, agent, 2.0);
  assert.deepEqual({
    markerY: marker.position.y,
    rx: joint.rotation.x, ry: joint.rotation.y, rz: joint.rotation.z,
    px: joint.position.x, py: joint.position.y, pz: joint.position.z
  }, snapshot, `${item.id} animation must be absolute and drift-free at a repeated timestamp`);

  agent.heroCast = null;
  agent.heroDamageStage = 1;
  animateHeroMiniature(mesh, agent, 2.2);
  assert.ok(mesh.userData.damageParts.stage1Show.some(node => node.visible));
  agent.heroDamageStage = 2;
  animateHeroMiniature(mesh, agent, 2.4);
  assert.ok(mesh.userData.damageParts.stage2Show.some(node => node.visible));
  assert.ok(mesh.userData.damageParts.stage2Hide.some(node => !node.visible));

  agent.hp = 25;
  animateHeroMiniature(mesh, agent, 2.6);
  assert.ok(mesh.getObjectByName('hp').scale.x <= 0.25 + 1e-9);
}

console.log('WP8-C hero animation smoke passed');
