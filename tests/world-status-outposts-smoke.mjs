import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isForwardOutpostProp, resolveOutpostProfile } from '../src/domain/OutpostProfiles.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [outpostFactorySource, registrySource, overlaySource, rendererSource, observerSource, expansionSource] = await Promise.all([
  read('../src/engine/ForwardOutpostAssetFactory.js'),
  read('../src/engine/StrategyAssetRegistry.js'),
  read('../src/engine/WorldStatusOverlayRenderer.js'),
  read('../src/engine/StrategyDungeonRenderer.js'),
  read('../src/screens/ObserveScreenPhase8.js'),
  read('../src/sim/StrategicExpansionSystem.js')
]);

const profiles = ['undead-host', 'goblin-clan', 'red-tusk-tribe', 'bluecap-colony', 'pale-brood'].map(resolveOutpostProfile);
assert.equal(new Set(profiles.map(profile => profile.id)).size, profiles.length);
assert.deepEqual(profiles.map(profile => profile.id), ['bone-reliquary', 'scrap-palisade', 'war-totem-camp', 'spore-garden', 'brood-nest']);
assert.equal(isForwardOutpostProp({ type: 'forward_outpost' }), true);
assert.equal(isForwardOutpostProp({ type: 'territory_banner', outpostProfile: 'bone-reliquary' }), true);
assert.equal(isForwardOutpostProp({ type: 'territory_banner' }), false);

for (const token of ['ForwardOutpostAssetFactory', 'addBoneReliquary', 'addScrapPalisade', 'addWarTotemCamp', 'addSporeNest', 'addSilkWatchpost', 'spore-garden', 'brood-nest', 'soul-flame', 'spore-cap', 'silk-web']) assert.ok(outpostFactorySource.includes(token), `missing ${token}`);
assert.match(outpostFactorySource, /animate\(root, prop, time\)/);
assert.match(registrySource, /class StrategyAssetRegistry/);
assert.match(registrySource, /isForwardOutpostProp/);
assert.match(registrySource, /animateForwardOutpost/);
for (const token of ['renderControlFields', 'renderSupplyRoutes', 'renderActivityBeacons', 'LineDashedMaterial', 'camp-life', 'operations', 'strategic-expansion']) assert.ok(overlaySource.includes(token), `missing ${token}`);
for (const token of ['WorldStatusOverlayRenderer', 'renderForwardOutposts', 'worldStatusOverlay.render', 'isForwardOutpost', 'assets.animateForwardOutpost']) assert.ok(rendererSource.includes(token), `missing ${token}`);
assert.match(observerSource, /StrategyDungeonRenderer/);
assert.match(observerSource, /StrategyAssetRegistry/);
assert.doesNotMatch(observerSource, /import \{ DungeonRendererPhase8 \}/);
assert.doesNotMatch(observerSource, /import \{ AssetRegistryPhase8 \}/);
assert.match(expansionSource, /type: 'forward_outpost'/);
assert.match(expansionSource, /outpostProfile: profile\.id/);
assert.match(expansionSource, /restBehavior: profile\.restBehavior/);
console.log('world status and faction outposts smoke: ok');
