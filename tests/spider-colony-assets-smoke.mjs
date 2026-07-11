import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SPIDER_COLONY_LANDMARK_RECIPES,
  getSpiderColonyLandmarkRecipe,
  listSpiderColonyLandmarkRecipes
} from '../src/engine/SpiderColonyLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json', import.meta.url), 'utf8'));
const sources = await Promise.all([
  'SpiderColonyLandmarkAssetFactory.js',
  'SpiderColonyGeometry.js',
  'SpiderSilkRampDiorama.js',
  'SpiderVerticalWellDiorama.js',
  'SpiderQueenNestDiorama.js'
].map(name => readFile(new URL(`../src/engine/${name}`, import.meta.url), 'utf8')));
const dioramaSource = sources.join('\n');
const animatorSource = await readFile(new URL('../src/engine/SpiderColonyAssetAnimator.js', import.meta.url), 'utf8');
const packSource = await readFile(new URL('../src/engine/SpiderColonyAssetPack.js', import.meta.url), 'utf8');

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listSpiderColonyLandmarkRecipes();

assert.equal(recipes.length, 3, 'spider colony slice must expose three hero landmarks');
assert.equal(Object.keys(SPIDER_COLONY_LANDMARK_RECIPES).length, recipes.length, 'spider recipe listing is inconsistent');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `${room.id} does not select ${recipe.id}`);
  assert.deepEqual(recipe.states, room.stateVariants, `${recipe.id} states drift from manifest`);
  assert.ok(recipe.states.includes(recipe.defaultState), `${recipe.id} default state is invalid`);
  assert.ok(catalogIds.has(recipe.id), `asset catalog is missing ${recipe.id}`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} has no vertical budget`);
  assert.ok(recipe.triangleBudget <= 75000, `${recipe.id} exceeds desktop hero triangle budget`);
  assert.ok(recipe.sockets.length >= 5, `${recipe.id} needs five semantic sockets`);
  assert.equal(new Set(recipe.sockets).size, recipe.sockets.length, `${recipe.id} has duplicate sockets`);
  assert.equal(getSpiderColonyLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(dioramaSource.includes(`'${recipe.id}'`), `factory does not claim ${recipe.id}`);
}

for (const semanticNode of [
  'silk-ramp-structure','sticky-ambush-zone','hanging-cocoon-line','royal-guard-insignia','rope-route',
  'vertical-shaft','silk-bridge-network','rope-elevator','royal-secret-exit','fall-hazard',
  'queen-exuvia','egg-throne','host-ritual-altar','silk-crown-crest','adventurer-containment','awakened-spider-queen'
]) {
  assert.ok(dioramaSource.includes(`'${semanticNode}'`), `diorama modules are missing semantic node ${semanticNode}`);
}

for (const state of ['webbed','cleared','burning','web-bridge','collapsed','empty','queen-awakened','captured']) {
  assert.ok(dioramaSource.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
}

assert.ok(dioramaSource.includes('queen-leg-upper'), 'queen must be a composite articulated creature');
assert.ok(dioramaSource.includes('crown-silk-rib'), 'queen nest must have a crown silhouette');
assert.ok(dioramaSource.includes('bridge-cross-thread'), 'vertical well bridges need woven traversal detail');
assert.ok(!dioramaSource.includes("'inn."), 'isolated spider pack must not claim inn bundles');
assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import shared renderer');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore scale from a stable base');
assert.equal(getSpiderColonyLandmarkRecipe('missing.spider.landmark'), null, 'unknown spider landmarks must fail softly');

console.log(`spider colony asset smoke passed with ${recipes.length} isolated hero dioramas`);
