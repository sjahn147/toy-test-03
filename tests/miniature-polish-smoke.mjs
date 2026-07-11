import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MINIATURE_RECIPES } from '../src/miniatures/recipes.js';

const factorySource = await readFile(new URL('../src/engine/PolishedMiniatureFactory.js', import.meta.url), 'utf8');
const profilesSource = await readFile(new URL('../src/engine/MiniatureBodyProfiles.js', import.meta.url), 'utf8');
const humanoidSource = await readFile(new URL('../src/engine/HumanoidMiniatureRig.js', import.meta.url), 'utf8');
const skeletonSource = await readFile(new URL('../src/engine/SkeletonMiniatureRig.js', import.meta.url), 'utf8');
const creatureSource = await readFile(new URL('../src/engine/CreatureMiniatureBuilders.js', import.meta.url), 'utf8');
const animatorSource = await readFile(new URL('../src/engine/MiniatureAnimator.js', import.meta.url), 'utf8');
const registrySource = await readFile(new URL('../src/engine/AssetRegistryPhase8.js', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/engine/DungeonRendererPhase8.js', import.meta.url), 'utf8');

for (const role of ['fighter', 'rogue', 'cleric', 'wizard', 'archer']) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, 'humanoid', `${role} must remain humanoid`);
  assert.ok(['masculine', 'feminine', 'neutral'].includes(MINIATURE_RECIPES[role].bodyType), `${role} needs an explicit bodyType`);
}
for (const token of ['masculine', 'feminine', 'neutral', 'agent.bodyType', 'agent.presentation', 'agent.gender']) {
  assert.ok(profilesSource.includes(token), `body profile resolver is missing ${token}`);
}
for (const joint of ['rig_pelvis', 'rig_spine', 'rig_chest', 'rig_neck', 'rig_head']) {
  assert.ok(humanoidSource.includes(joint), `humanoid rig is missing ${joint}`);
}
for (const limb of ['upperArm', 'forearm', 'thigh', 'shin', 'foot']) {
  assert.ok(humanoidSource.includes(`rig_${limb}`), `humanoid rig is missing ${limb}`);
}
for (const anatomy of ['skeleton-iliac', 'skeleton-vertebra', 'skeleton-sternum', 'skeleton-rib', 'skeleton-clavicle', 'skeleton-femur', 'skeleton-tibia', 'skeleton-finger']) {
  assert.ok(skeletonSource.includes(anatomy), `skeleton anatomy is missing ${anatomy}`);
}
for (const goblinDetail of ['goblin_ear_', 'goblin-tusk', 'goblin-wart', 'variation.faceBias', 'variation.asymmetry']) {
  assert.ok(humanoidSource.includes(goblinDetail), `goblin variation is missing ${goblinDetail}`);
}
for (const slimeDetail of ['slime_body', 'slime_skirt', 'slime_lobe_', 'part:slime-core']) {
  assert.ok(creatureSource.includes(slimeDetail), `slime model is missing ${slimeDetail}`);
}
for (const mimicDetail of ['mimic_lid_pivot', 'mimic_jaw', 'mimic_tongue', 'mimic_leg_']) {
  assert.ok(creatureSource.includes(mimicDetail), `mimic model is missing ${mimicDetail}`);
}
for (const behavior of ['attackTimeline', 'windup', 'strike', 'recover', 'combatArmPose', 'poseLeg', 'poseArm', 'animateCreatureFallback']) {
  assert.ok(animatorSource.includes(behavior), `animator is missing ${behavior}`);
}
assert.ok(animatorSource.includes("role === 'skeleton'"), 'animator needs skeletal motion');
assert.ok(animatorSource.includes('rig.earL'), 'animator needs goblin ear motion');
assert.ok(animatorSource.includes('parts.lidPivot'), 'animator needs articulated mimic lid motion');
assert.ok(animatorSource.includes('parts.skirt'), 'animator needs slime footprint deformation');
assert.ok(factorySource.includes('buildHumanoidRig'), 'factory must route humanoids through the articulated builder');
assert.ok(factorySource.includes('buildSkeletonRig'), 'factory must route skeletons through the anatomical builder');
assert.ok(factorySource.includes('buildSlime'), 'factory must route slimes through the layered builder');
assert.ok(factorySource.includes('buildMimic'), 'factory must route mimics through the hinged builder');
assert.ok(registrySource.includes('new PolishedMiniatureFactory()'), 'Phase8 registry must use the polished factory');
assert.ok(rendererSource.includes('this.miniatureAnimator.update'), 'Phase8 renderer must drive miniature animation');

console.log('miniature polish smoke: ok');
