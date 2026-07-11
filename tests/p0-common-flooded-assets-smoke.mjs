import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS } from '../src/engine/CommonDungeonArchitectureAssetPack.js';
import { FLOODED_STOREHOUSE_LANDMARK_RECIPES, getFloodedStorehouseLandmarkRecipe, listFloodedStorehouseLandmarkRecipes } from '../src/engine/FloodedStorehouseLandmarkRecipes.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const manifest = JSON.parse(await read('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog = JSON.parse(await read('../content/assets/asset-catalog.json'));
const sources = await Promise.all([
  read('../src/engine/CommonDungeonArchitectureKit.js'),
  read('../src/engine/CommonDungeonArchitectureAssetPack.js'),
  read('../src/engine/FloodedStorehouseGeometry.js'),
  read('../src/engine/FloodedReservoirDiorama.js'),
  read('../src/engine/FloodedDrainageEngineDiorama.js'),
  read('../src/engine/FloodedSluicePassageDiorama.js'),
  read('../src/engine/FloodedStorehouseLandmarkAssetFactory.js'),
  read('../src/engine/FloodedStorehouseAssetAnimator.js'),
  read('../src/engine/FloodedStorehouseAssetPack.js')
]);
const source = sources.join('\n');
const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listFloodedStorehouseLandmarkRecipes();

assert.equal(recipes.length, 3);
assert.equal(Object.keys(FLOODED_STOREHOUSE_LANDMARK_RECIPES).length, 3);
for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id);
  assert.deepEqual(recipe.states, room.stateVariants);
  assert.ok(recipe.states.includes(recipe.defaultState));
  assert.ok(recipe.footprint.width <= room.size[0]);
  assert.ok(recipe.footprint.depth <= room.size[1]);
  assert.ok(recipe.triangleBudget <= 75000);
  assert.ok(recipe.sockets.length >= 6);
  assert.equal(new Set(recipe.sockets).size, recipe.sockets.length);
  assert.ok(catalogIds.has(recipe.id));
  assert.equal(getFloodedStorehouseLandmarkRecipe(recipe.id), recipe);
}

for (const assetId of COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS) assert.ok(catalogIds.has(assetId), `catalog missing ${assetId}`);
for (const method of ['addMasonryFloor', 'addWallSegment', 'addArchway', 'addColumn', 'addDrainChannel', 'addMetalGrate', 'addStairs', 'addRubble']) assert.ok(source.includes(method), `common kit missing ${method}`);
for (const semantic of ['reservoir-basin', 'sluice-gate', 'water-level-gauge', 'pump-intake', 'drainage-waterwheel', 'gear-train', 'pressure-console', 'pump-bank', 'maintenance-catwalk', 'master-valve', 'sluice-channel', 'lift-gate', 'cargo-catwalk', 'chain-hoist', 'fortification-line']) assert.ok(source.includes(`'${semantic}'`), `missing semantic ${semantic}`);
for (const state of ['shallow', 'drained', 'overflowing', 'stalled', 'operational', 'sabotaged', 'open', 'flooded', 'fortified']) assert.ok(source.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
assert.ok(source.includes('MeshStandardMaterial'), 'common kit should use lit materials');
assert.ok(source.includes('voussoir'), 'archway should be assembled from readable masonry blocks');
assert.ok(source.includes('waterwheel-spoke'), 'engine wheel must be composite');
assert.ok(source.includes('pressure-gauge'), 'engine needs readable instrumentation');
assert.ok(!source.includes("'inn."), 'isolated pack must not claim inn assets');
assert.ok(!source.includes('AssetRegistryPhase8'), 'isolated pack must not modify shared registry');
assert.ok(!source.includes('position.y +='), 'water animation must not accumulate drift');
assert.equal(getFloodedStorehouseLandmarkRecipe('missing.flooded.asset'), null);

console.log(`p0 common/flooded asset smoke passed with ${recipes.length} hero landmarks and ${COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS.length} common assets`);
