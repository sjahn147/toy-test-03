import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { listWaystationLandmarkRecipes } from '../src/engine/WaystationLandmarkRecipes.js';
import { listFloodedStorehouseLandmarkRecipes } from '../src/engine/FloodedStorehouseLandmarkRecipes.js';
import { listFungalGardenLandmarkRecipes } from '../src/engine/FungalGardenLandmarkRecipes.js';
import { listSpiderColonyLandmarkRecipes } from '../src/engine/SpiderColonyLandmarkRecipes.js';
import { listLaboratoryLandmarkRecipes } from '../src/engine/LaboratoryLandmarkRecipes.js';
import { listRoyalSanctumLandmarkRecipes } from '../src/engine/RoyalSanctumLandmarkRecipes.js';
import { listCampaignCompletionRecipes } from '../src/engine/CampaignCompletionLandmarkRecipes.js';

const manifest = JSON.parse(await source('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog = JSON.parse(await source('../content/assets/asset-catalog.json'));
const oldLanternSource = await source('../src/engine/OldLanternAssetPack.js');
const resolverSource = await source('../src/engine/Phase8AssetResolver.js');

const importedRecipes = [
  ...listWaystationLandmarkRecipes(),
  ...listFloodedStorehouseLandmarkRecipes(),
  ...listFungalGardenLandmarkRecipes(),
  ...listSpiderColonyLandmarkRecipes(),
  ...listLaboratoryLandmarkRecipes(),
  ...listRoyalSanctumLandmarkRecipes(),
  ...listCampaignCompletionRecipes()
];

const recipeByBundle = new Map(importedRecipes.map(recipe => [recipe.id, recipe]));
for (const room of manifest.rooms) {
  if (room.landmarkBundle?.startsWith('inn.old-lantern.') && oldLanternSource.includes(`'${room.landmarkBundle}'`)) {
    recipeByBundle.set(room.landmarkBundle, {
      id: room.landmarkBundle,
      roomId: room.id,
      states: room.stateVariants,
      source: 'OldLanternAssetPack.js'
    });
  }
}

assert.equal(manifest.rooms.length, 63, 'Sleeping Citadel must retain exactly 63 authored rooms');
assert.equal(new Set(manifest.rooms.map(room => room.id)).size, 63, 'room IDs must remain unique');
assert.equal(new Set(manifest.rooms.map(room => room.landmarkBundle)).size, 63, 'every room must own a unique landmark bundle');

const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const missingCatalog = manifest.rooms.filter(room => !catalogIds.has(room.landmarkBundle));
assert.deepEqual(missingCatalog, [], `catalog is missing bundles: ${missingCatalog.map(room => `${room.id}:${room.landmarkBundle}`).join(', ')}`);

const dedicated = [];
const missing = [];
for (const room of manifest.rooms) {
  const recipe = recipeByBundle.get(room.landmarkBundle);
  if (!recipe) {
    missing.push({ roomId: room.id, zoneId: room.zoneId, bundleId: room.landmarkBundle });
    continue;
  }
  assert.equal(recipe.roomId, room.id, `${room.id} recipe room mismatch`);
  assert.deepEqual([...recipe.states], room.stateVariants, `${room.id} recipe states must exactly match manifest`);
  dedicated.push({ roomId: room.id, zoneId: room.zoneId, bundleId: room.landmarkBundle });
}

assert.equal(dedicated.length, 41, 'baseline dedicated landmark coverage changed; update the Developer #3 anchor and target deliberately');
assert.equal(missing.length, 22, 'baseline missing-landmark count changed; update the Developer #3 tracker deliberately');

const expectedMissing = [
  'B06','B07','B08','B09','B10',
  'D16','D17','D18','D20',
  'E21','E22','E23','E24','E25',
  'I41','I42','I43','I44','I45',
  'J46','J47','J48'
];
assert.deepEqual(missing.map(entry => entry.roomId), expectedMissing, 'missing-room baseline drifted');

const { scenario, report } = compileCampaign({ manifest, assetCatalog: catalog });
assert.equal(scenario.rooms.length, 63, 'compiler must preserve all campaign rooms');
assert.equal(report.missingBundles.length, 0, 'compiler must not report catalog-missing bundles');

const graph = new Map(scenario.rooms.map(room => [room.id, new Set()]));
for (const [a, b] of scenario.links) {
  assert.ok(graph.has(a), `link references unknown room ${a}`);
  assert.ok(graph.has(b), `link references unknown room ${b}`);
  graph.get(a).add(b);
  graph.get(b).add(a);
}
const visited = new Set([manifest.entryRoomId]);
const queue = [manifest.entryRoomId];
while (queue.length) {
  const current = queue.shift();
  for (const next of graph.get(current) ?? []) {
    if (visited.has(next)) continue;
    visited.add(next);
    queue.push(next);
  }
}
assert.equal(visited.size, 63, `compiled graph leaves rooms unreachable: ${scenario.rooms.filter(room => !visited.has(room.id)).map(room => room.id).join(', ')}`);

for (const contract of [
  'createWaystation',
  'createFloodedStorehouseAssetPack',
  'createFungalGardenAssetPack',
  'SpiderColonyAssetPack',
  'createLaboratoryAssetPack',
  'createRoyalSanctumAssetPack',
  'createOldLanternAssetPack',
  'createCampaignCompletionAssetPack'
]) {
  assert.ok(resolverSource.includes(contract), `Phase8AssetResolver is missing pack registration contract ${contract}`);
}

const reportByZone = Object.fromEntries([...new Set(manifest.rooms.map(room => room.zoneId))].sort().map(zoneId => {
  const zoneRooms = manifest.rooms.filter(room => room.zoneId === zoneId);
  const zoneDedicated = dedicated.filter(entry => entry.zoneId === zoneId).length;
  return [zoneId, { rooms: zoneRooms.length, dedicated: zoneDedicated, missing: zoneRooms.length - zoneDedicated }];
}));

console.log(JSON.stringify({
  campaign: manifest.id,
  rooms: manifest.rooms.length,
  dedicatedLandmarks: dedicated.length,
  missingLandmarks: missing.length,
  missingRooms: missing.map(entry => entry.roomId),
  zones: reportByZone,
  compiledLinks: scenario.links.length,
  conditionalLinksFlattenedIntoRuntime: manifest.conditionalConnections.length,
  secretLinksFlattenedIntoRuntime: manifest.secretConnections.length
}, null, 2));

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
