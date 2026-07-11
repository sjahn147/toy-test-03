import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MINIATURE_RECIPES } from '../src/miniatures/recipes.js';

const factorySource = await readFile(new URL('../src/engine/PolishedMiniatureFactory.js', import.meta.url), 'utf8');
const animatorSource = await readFile(new URL('../src/engine/MiniatureAnimator.js', import.meta.url), 'utf8');
const registrySource = await readFile(new URL('../src/engine/AssetRegistryPhase8.js', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/engine/DungeonRendererPhase8.js', import.meta.url), 'utf8');

for (const role of ['fighter', 'rogue', 'cleric', 'wizard', 'archer']) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, 'humanoid', `${role} must remain humanoid`);
  assert.ok(['masculine', 'feminine', 'neutral'].includes(MINIATURE_RECIPES[role].bodyType), `${role} needs an explicit bodyType`);
}

assert.equal(MINIATURE_RECIPES.fighter.bodyType, 'feminine');
assert.equal(MINIATURE_RECIPES.rogue.bodyType, 'masculine');
assert.equal(MINIATURE_RECIPES.cleric.bodyType, 'feminine');
assert.equal(MINIATURE_RECIPES.wizard.bodyType, 'masculine');
assert.equal(MINIATURE_RECIPES.archer.bodyType, 'feminine');

for (const token of ['masculine', 'feminine', 'neutral', 'agent.bodyType', 'agent.presentation', 'agent.gender']) {
  assert.ok(factorySource.includes(token), `body profile resolver is missing ${token}`);
}

for (const joint of ['rig_pelvis', 'rig_spine', 'rig_chest', 'rig_neck', 'rig_head']) {
  assert.ok(factorySource.includes(joint), `articulated rig is missing ${joint}`);
}
for (const limb of ['upperArm', 'forearm', 'thigh', 'shin', 'foot']) {
  assert.ok(factorySource.includes(`rig_${limb}\${suffix}`), `articulated rig is missing generated ${limb} joints`);
  assert.ok(factorySource.includes(`rig[\`${limb}\${suffix}\`]`), `rig map is missing generated ${limb} handles`);
}
assert.ok(factorySource.includes('socket(`hand${suffix}`)'), 'articulated rig is missing generated hand sockets');
assert.ok(factorySource.includes('rig[`hand${suffix}`]'), 'rig map is missing generated hand handles');

for (const behavior of ['poseLeg', 'poseArm', 'movementPace', 'animateCreatureFallback', 'strongestEffect']) {
  assert.ok(animatorSource.includes(behavior), `animator is missing ${behavior}`);
}

assert.ok(registrySource.includes('new PolishedMiniatureFactory()'), 'Phase8 registry must use the polished factory');
assert.ok(rendererSource.includes('this.miniatureAnimator.update'), 'Phase8 renderer must drive miniature animation');

console.log('miniature polish smoke: ok');
