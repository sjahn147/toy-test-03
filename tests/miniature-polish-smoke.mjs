import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MINIATURE_RECIPES } from '../src/miniatures/recipes.js';
import { MINIATURE_PARTS } from '../src/miniatures/partCatalog.js';

const factorySource = await readFile(new URL('../src/engine/PolishedMiniatureFactory.js', import.meta.url), 'utf8');
const profilesSource = await readFile(new URL('../src/engine/MiniatureBodyProfiles.js', import.meta.url), 'utf8');
const humanoidSource = await readFile(new URL('../src/engine/HumanoidMiniatureRig.js', import.meta.url), 'utf8');
const skeletonSource = await readFile(new URL('../src/engine/SkeletonMiniatureRig.js', import.meta.url), 'utf8');
const creatureSource = await readFile(new URL('../src/engine/CreatureMiniatureBuilders.js', import.meta.url), 'utf8');
const exoticSource = await readFile(new URL('../src/engine/ExoticMiniatureBuilders.js', import.meta.url), 'utf8');
const weaponSource = await readFile(new URL('../src/engine/MiniatureWeaponBuilders.js', import.meta.url), 'utf8');
const animatorSource = await readFile(new URL('../src/engine/MiniatureAnimator.js', import.meta.url), 'utf8');
const advancedAnimatorSource = await readFile(new URL('../src/engine/AdvancedMiniatureAnimator.js', import.meta.url), 'utf8');
const registrySource = await readFile(new URL('../src/engine/AssetRegistryPhase8.js', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/engine/DungeonRendererPhase8.js', import.meta.url), 'utf8');

for (const role of ['fighter', 'rogue', 'cleric', 'wizard', 'archer']) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, 'humanoid', `${role} must remain humanoid`);
  assert.ok(['masculine', 'feminine', 'neutral'].includes(MINIATURE_RECIPES[role].bodyType), `${role} needs an explicit bodyType`);
  assert.ok(MINIATURE_RECIPES[role].weaponStyle, `${role} needs a weapon style`);
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
for (const [role, skeleton] of [['spider', 'arachnid'], ['wraith', 'spectral'], ['myconid', 'fungal'], ['stirge', 'flying']]) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, skeleton, `${role} needs the ${skeleton} skeleton family`);
  assert.ok(factorySource.includes(`build${role === 'myconid' ? 'Myconid' : role[0].toUpperCase() + role.slice(1)}`), `factory must route ${role}`);
}
for (const detail of ['spider_hip_', 'spider_fang_', 'wraith_tatter', 'myconid-spore', 'stirge_wing_']) {
  assert.ok(exoticSource.includes(detail), `exotic miniature model is missing ${detail}`);
}
assert.equal(MINIATURE_RECIPES.archer.weaponStyle, 'bow');
assert.equal(MINIATURE_PARTS.off_bow_long.builder, 'bowLong');
assert.equal(MINIATURE_PARTS.wpn_arrow_nocked.builder, 'arrowNocked');
for (const detail of ['TubeGeometry', 'weapon_bow_long', 'weapon_arrow_nocked']) {
  assert.ok(weaponSource.includes(detail), `ranged weapon builder is missing ${detail}`);
}
for (const behavior of ['attackTimeline', 'windup', 'strike', 'recover', 'combatArmPose', 'poseLeg', 'poseArm', 'animateCreatureFallback']) {
  assert.ok(animatorSource.includes(behavior), `animator is missing ${behavior}`);
}
for (const behavior of ['installAdvancedMiniatureAnimation', 'animateWeaponStyle', 'animateSpider', 'animateWraith', 'animateMyconid', 'animateStirge']) {
  assert.ok(advancedAnimatorSource.includes(behavior), `advanced animator is missing ${behavior}`);
}
for (const style of ['bow', 'staff-focus', 'mace-book', 'heavy-club']) {
  assert.ok(advancedAnimatorSource.includes(`style === '${style}'`), `advanced animator is missing ${style}`);
}
assert.ok(factorySource.includes('installAdvancedMiniatureAnimation()'), 'factory must install advanced animation without renderer replacement');
assert.ok(factorySource.includes('EXOTIC_BUILDERS'), 'factory must route exotic skeleton families');
assert.ok(registrySource.includes('new PolishedMiniatureFactory()'), 'Phase8 registry must use the polished factory');
assert.ok(rendererSource.includes('this.miniatureAnimator.update'), 'Phase8 renderer must drive miniature animation');

console.log('miniature polish smoke: ok');
