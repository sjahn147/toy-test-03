import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MINIATURE_RECIPES } from '../src/miniatures/recipes.js';
import { MINIATURE_PARTS } from '../src/miniatures/partCatalog.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  factorySource,
  profilesSource,
  humanoidSource,
  skeletonSource,
  creatureSource,
  exoticSource,
  weaponSource,
  phase3EquipmentSource,
  orcSource,
  presentationSource,
  animatorSource,
  advancedAnimatorSource,
  registrySource,
  rendererSource,
  observerShellSource
] = await Promise.all([
  read('../src/engine/PolishedMiniatureFactory.js'),
  read('../src/engine/MiniatureBodyProfiles.js'),
  read('../src/engine/HumanoidMiniatureRig.js'),
  read('../src/engine/SkeletonMiniatureRig.js'),
  read('../src/engine/CreatureMiniatureBuilders.js'),
  read('../src/engine/ExoticMiniatureBuilders.js'),
  read('../src/engine/MiniatureWeaponBuilders.js'),
  read('../src/engine/MiniaturePhase3Equipment.js'),
  read('../src/engine/OrcMiniaturePolish.js'),
  read('../src/engine/MiniaturePresentationPolish.js'),
  read('../src/engine/MiniatureAnimator.js'),
  read('../src/engine/AdvancedMiniatureAnimator.js'),
  read('../src/engine/AssetRegistryPhase8.js'),
  read('../src/engine/DungeonRendererPhase8.js'),
  read('../src/ui/StrategyObserverShell.js')
]);

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
for (const anatomy of ['skeleton-iliac', 'skeleton-vertebra', 'skeleton-sternum', 'skeleton-rib', 'skeleton-clavicle', 'skeleton-femur', 'skeleton-tibia', 'skeleton-finger']) {
  assert.ok(skeletonSource.includes(anatomy), `skeleton anatomy is missing ${anatomy}`);
}
for (const detail of ['slime_body', 'slime_skirt', 'mimic_lid_pivot', 'mimic_tongue']) {
  assert.ok(creatureSource.includes(detail), `core creature model is missing ${detail}`);
}

const exoticContracts = {
  spider: ['arachnid', 'buildSpider', 'spider_hip_', 'spider_fang_'],
  wraith: ['spectral', 'buildWraith', 'wraith_tatter'],
  myconid: ['fungal', 'buildMyconid', 'myconid-spore-sac'],
  stirge: ['flying', 'buildStirge', 'stirge_wing_']
};
for (const [role, [skeleton, builder, detail]] of Object.entries(exoticContracts)) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, skeleton, `${role} needs the ${skeleton} skeleton family`);
  assert.ok(factorySource.includes(builder), `factory must route ${role}`);
  assert.ok(exoticSource.includes(detail), `${role} model is missing ${detail}`);
}

assert.equal(MINIATURE_RECIPES.archer.weaponStyle, 'bow');
assert.equal(MINIATURE_PARTS.off_bow_long.builder, 'bowLong');
assert.equal(MINIATURE_PARTS.wpn_arrow_nocked.builder, 'arrowNocked');
assert.ok(weaponSource.includes('TubeGeometry'), 'longbow needs a curved stave');

assert.equal(MINIATURE_RECIPES.orc.skeleton, 'orc');
assert.equal(MINIATURE_RECIPES.orc.weaponStyle, 'axe-shield');
assert.equal(MINIATURE_PARTS.wpn_axe_heavy.builder, 'axeHeavy');
assert.equal(MINIATURE_PARTS.off_shield_kite.builder, 'shieldKite');
for (const detail of ['orc-jaw', 'orc-tusk', 'orc-pauldron', 'orc_topknot']) {
  assert.ok(orcSource.includes(detail), `orc polish is missing ${detail}`);
}
for (const detail of ['weapon_axe_heavy', 'shield_kite']) {
  assert.ok(phase3EquipmentSource.includes(detail), `Phase 3 equipment is missing ${detail}`);
}

for (const behavior of ['attackTimeline', 'windup', 'strike', 'recover', 'combatArmPose', 'poseLeg', 'poseArm', 'animateCreatureFallback']) {
  assert.ok(animatorSource.includes(behavior), `base animator is missing ${behavior}`);
}
for (const behavior of ['animateWeaponStyle', 'animatePresentation', 'animateSpider', 'animateWraith', 'animateMyconid', 'animateStirge']) {
  assert.ok(advancedAnimatorSource.includes(behavior), `advanced animator is missing ${behavior}`);
}
for (const style of ['bow', 'staff-focus', 'mace-book', 'axe-shield', 'heavy-club']) {
  assert.ok(advancedAnimatorSource.includes(`style === '${style}'`), `advanced animator is missing ${style}`);
}
for (const detail of ['miniature_contact_shadow', 'back_cape_short', 'wpn_arrow_nocked', 'orc_topknot']) {
  assert.ok(presentationSource.includes(detail), `presentation polish is missing ${detail}`);
}
assert.ok(advancedAnimatorSource.includes('agent.downed'), 'Phase 3 needs a downed pose');
assert.ok(advancedAnimatorSource.includes('presentation.arrow.visible'), 'Phase 3 needs arrow release visibility');
assert.ok(factorySource.includes('applyMiniaturePresentationPolish'), 'factory must apply presentation polish');
assert.ok(factorySource.includes("'orc'"), 'factory must route orcs as articulated humanoids');
assert.ok(registrySource.includes('new PolishedMiniatureFactory()'), 'Phase8 registry must use the polished factory');
assert.ok(rendererSource.includes('this.miniatureAnimator.update'), 'Phase8 renderer must drive miniature animation');

assert.ok(!observerShellSource.includes('?.dataset.mobileSurface ='), 'optional chaining cannot be used as an assignment target');
assert.ok(observerShellSource.includes('if (this.screenEl) this.screenEl.dataset.mobileSurface = surface;'), 'mobile surface assignment needs an explicit null guard');

console.log('miniature polish smoke: ok');
