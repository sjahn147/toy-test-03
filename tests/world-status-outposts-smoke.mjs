import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isForwardOutpostProp, resolveOutpostProfile } from '../src/domain/OutpostProfiles.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  outpostFactorySource,
  registrySource,
  overlaySource,
  rendererSource,
  observerSource,
  expansionSource
] = await Promise.all([
  read('../src/engine/ForwardOutpostAssetFactory.js'),
  read('../src/engine/StrategyAssetRegistry.js'),
  read('../src/engine/WorldStatusOverlayRenderer.js'),
  read('../src/engine/StrategyDungeonRenderer.js'),
  read('../src/screens/ObserveScreenPhase8.js'),
  read('../src/sim/StrategicExpansionSystem.js')
]);

const profiles = [
  resolveOutpostProfile('undead-host'),
  resolveOutpostProfile('goblin-clan'),
  resolveOutpostProfile('red-tusk-tribe'),
  resolveOutpostProfile('bluecap-colony'),
  resolveOutpostProfile('pale-brood')
];
assert.equal(new Set(profiles.map(profile => profile.id)).size, profiles.length);
assert.deepEqual(profiles.map(profile => profile.id), [
  'bone-reliquary',
  'scrap-palisade',
  'war-totem-camp',
  'spore-garden',
  'brood-nest'
]);
assert.equal(isForwardOutpostProp({ type: 'forward_outpost' }), true);
assert.equal(isForwardOutpostProp({ type: 'territory_banner', outpostProfile: 'bone-reliquary' }), true);
assert.equal(isForwardOutpostProp({ type: 'territory_banner' }), false);

assert.match(outpostFactorySource, /class ForwardOutpostAssetFactory/);
assert.match(outpostFactorySource, /addBoneReliquary/);
assert.match(outpostFactorySource, /addScrapPalisade/);
assert.match(outpostFactorySource, /addWarTotemCamp/);
assert.match(outpostFactorySource, /addSporeNest/);
assert.match(outpostFactorySource, /addSilkWatchpost/);
assert.match(outpostFactorySource, /profile\.id === 'spore-garden'/);
assert.match(outpostFactorySource, /profile\.id === 'brood-nest'/);
assert.match(outpostFactorySource, /soul-flame/);
assert.match(outpostFactorySource, /spore-cap/);
assert.match(outpostFactorySource, /silk-web/);
assert.match(outpostFactorySource, /group\.userData\.outpostProfile = profile\.id/);
assert.match(outpostFactorySource, /animate\(root, prop, time\)/);

assert.match(registrySource, /class StrategyAssetRegistry/);
assert.match(registrySource, /new ForwardOutpostAssetFactory/);
assert.match(registrySource, /isForwardOutpostProp/);
assert.match(registrySource, /animateForwardOutpost/);

assert.match(overlaySource, /renderControlFields/);
assert.match(overlaySource, /renderSupplyRoutes/);
assert.match(overlaySource, /renderActivityBeacons/);
assert.match(overlaySource, /LineDashedMaterial/);
assert.match(overlaySource, /ACTIVE_ACTIVITY_SOURCES/);
assert.match(overlaySource, /camp-life/);
assert.match(overlaySource, /operations/);
assert.match(overlaySource, /strategic-expansion/);

assert.match(rendererSource, /WorldStatusOverlayRenderer/);
assert.match(rendererSource, /renderForwardOutposts/);
assert.match(rendererSource, /worldStatusOverlay\.render/);
assert.match(rendererSource, /isForwardOutpost/);
assert.match(rendererSource, /assets\.animateForwardOutpost/);

assert.match(observerSource, /StrategyDungeonRenderer/);
assert.match(observerSource, /StrategyAssetRegistry/);
assert.doesNotMatch(observerSource, /import \{ DungeonRendererPhase8 \}/);
assert.doesNotMatch(observerSource, /import \{ AssetRegistryPhase8 \}/);

assert.match(expansionSource, /type: 'forward_outpost'/);
assert.match(expansionSource, /outpostProfile: profile\.id/);
assert.match(expansionSource, /restBehavior: profile\.restBehavior/);
assert.match(expansionSource, /resolveOutpostProfile/);

console.log('world status and faction outposts smoke: ok');
