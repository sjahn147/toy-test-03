import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveOutpostProfile } from '../src/domain/OutpostProfiles.js';
import { ForwardOutpostAssetFactory } from '../src/engine/ForwardOutpostAssetFactory.js';
import { StrategyAssetRegistry, isForwardOutpost } from '../src/engine/StrategyAssetRegistry.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [overlaySource, rendererSource, observerSource, expansionSource] = await Promise.all([
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
  'spore-nest',
  'silk-watchpost'
]);

const factory = new ForwardOutpostAssetFactory();
for (const faction of ['undead-host', 'goblin-clan', 'red-tusk-tribe', 'bluecap-colony', 'pale-brood']) {
  const mesh = factory.create({ id: `outpost-${faction}`, ecologyFaction: faction });
  assert.equal(mesh.userData.outpostProfile, resolveOutpostProfile(faction).id);
  assert.ok(mesh.children.length >= 4, `${faction} outpost should be a composed diorama`);
}
assert.ok(factory.create({ id: 'bone', ecologyFaction: 'undead-host' }).getObjectByName('soul-flame'));
assert.ok(factory.create({ id: 'spore', ecologyFaction: 'bluecap-colony' }).getObjectByName('spore-cap'));
assert.ok(factory.create({ id: 'silk', ecologyFaction: 'pale-brood' }).getObjectByName('silk-web'));

const registry = new StrategyAssetRegistry();
const outpost = { id: 'monster-forward-outpost-1', type: 'forward_outpost', ecologyFaction: 'goblin-clan' };
assert.equal(isForwardOutpost(outpost), true);
assert.equal(registry.makeProp(outpost).userData.outpostProfile, 'scrap-palisade');
assert.equal(isForwardOutpost({ id: 'territory-banner', type: 'territory_banner' }), false);

assert.match(overlaySource, /renderControlFields/);
assert.match(overlaySource, /renderSupplyRoutes/);
assert.match(overlaySource, /renderActivityBeacons/);
assert.match(overlaySource, /LineDashedMaterial/);
assert.match(overlaySource, /ACTIVE_ACTIVITY_SOURCES/);
assert.match(rendererSource, /WorldStatusOverlayRenderer/);
assert.match(rendererSource, /renderForwardOutposts/);
assert.match(rendererSource, /worldStatusOverlay\.render/);
assert.match(rendererSource, /isForwardOutpost/);

assert.match(observerSource, /StrategyDungeonRenderer/);
assert.match(observerSource, /StrategyAssetRegistry/);
assert.doesNotMatch(observerSource, /import \{ DungeonRendererPhase8 \}/);
assert.doesNotMatch(observerSource, /import \{ AssetRegistryPhase8 \}/);

assert.match(expansionSource, /type: 'forward_outpost'/);
assert.match(expansionSource, /outpostProfile: profile\.id/);
assert.match(expansionSource, /restBehavior: profile\.restBehavior/);
assert.match(expansionSource, /resolveOutpostProfile/);

console.log('world status and faction outposts smoke: ok');
