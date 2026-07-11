import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNGAL_GARDEN_BUNDLE_IDS,
  FUNGAL_GARDEN_LANDMARK_RECIPES,
  getFungalGardenLandmarkRecipe,
  listFungalGardenLandmarkRecipes
} from '../src/engine/FungalGardenLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(
  new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url),
  'utf8'
));
const catalog = JSON.parse(await readFile(
  new URL('../content/assets/asset-catalog.json', import.meta.url),
  'utf8'
));
const factorySource = await readFile(
  new URL('../src/engine/FungalGardenLandmarkAssetFactory.js', import.meta.url),
  'utf8'
);
const packSource = await readFile(
  new URL('../src/engine/FungalGardenAssetPack.js', import.meta.url),
  'utf8'
);
const animatorSource = await readFile(
  new URL('../src/engine/FungalGardenAssetAnimator.js', import.meta.url),
  'utf8'
);

const rooms = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listFungalGardenLandmarkRecipes();

assert.equal(recipes.length, 3, 'fungal slice must contain F26, F28 and F30');
assert.deepEqual(FUNGAL_GARDEN_BUNDLE_IDS, [
  'fungal.spore-field.blue',
  'fungal.pillars.forest',
  'fungal.heart.mycelial'
]);
assert.equal(Object.keys(FUNGAL_GARDEN_LANDMARK_RECIPES).length, recipes.length);

for (const recipe of recipes) {
  const room = rooms.get(recipe.roomId);
  assert.ok(room, `${recipe.id} references missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `${recipe.roomId} does not select ${recipe.id}`);
  assert.ok(catalogIds.has(recipe.id), `catalog is missing ${recipe.id}`);
  assert.deepEqual(recipe.states, room.stateVariants, `${recipe.id} state contract differs from manifest`);
  assert.ok(recipe.states.includes(recipe.defaultState), `${recipe.id} has an invalid default state`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} has no height budget`);
  assert.ok(recipe.sockets.length >= 5, `${recipe.id} needs at least five semantic sockets`);
  assert.equal(new Set(recipe.sockets).size, recipe.sockets.length, `${recipe.id} contains duplicate sockets`);
  assert.ok(recipe.triangleBudget <= 75000, `${recipe.id} exceeds desktop hero budget`);
  assert.equal(getFungalGardenLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(factorySource.includes(`'${recipe.id}'`) || factorySource.includes(`recipe.factory === '${recipe.factory}'`), `factory does not claim ${recipe.id}`);
}

for (const semanticNode of [
  'blue-spore-cluster',
  'spore-vent',
  'memory-bloom',
  'harvest-station',
  'colossal-pillar',
  'mycelial-bridge',
  'spore-lantern',
  'communion-circle',
  'blight-overlay',
  'mycelial-core',
  'biomass-sac',
  'defense-spore-pod',
  'growth-frontier'
]) {
  assert.ok(factorySource.includes(`'${semanticNode}'`), `factory is missing semantic node ${semanticNode}`);
}

for (const state of ['blooming', 'harvested', 'burned', 'wild', 'communion', 'blighted', 'stable', 'expanding', 'burned-out']) {
  assert.ok(factorySource.includes(`'${state}'`) || factorySource.includes(`state === '${state}'`), `factory is missing state ${state}`);
}

assert.ok(packSource.includes('createFungalGardenAssetPack'), 'pack adapter is missing');
assert.ok(packSource.includes('canCreate'), 'pack adapter needs a non-invasive capability check');
assert.ok(animatorSource.includes('baseY'), 'animator must retain rest positions');
assert.ok(animatorSource.includes('baseScale'), 'animator must retain rest scales');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.equal(getFungalGardenLandmarkRecipe('inn.old-lantern.common-room'), null, 'fungal pack must not claim inn assets');
assert.equal(getFungalGardenLandmarkRecipe('missing.asset'), null, 'unknown assets must fail softly');

console.log(`fungal garden asset smoke passed with ${recipes.length} isolated hero dioramas`);
