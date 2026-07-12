import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  WAYSTATION_LANDMARK_RECIPES,
  getWaystationLandmarkRecipe,
  listWaystationLandmarkRecipes
} from '../src/engine/WaystationLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json', import.meta.url), 'utf8'));
const sources = await Promise.all([
  'WaystationLandmarkAssetFactory.js',
  'WaystationGeometry.js',
  'WaystationPlazaDiorama.js',
  'WaystationRegistryDiorama.js',
  'WaystationGateDiorama.js',
  'WaystationBaggageDiorama.js',
  'WaystationDescentDiorama.js'
].map(name => readFile(new URL(`../src/engine/${name}`, import.meta.url), 'utf8')));
const dioramaSource = sources.join('\n');
const animatorSource = await readFile(new URL('../src/engine/WaystationAssetAnimator.js', import.meta.url), 'utf8');
const packSource = await readFile(new URL('../src/engine/WaystationAssetPack.js', import.meta.url), 'utf8');

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listWaystationLandmarkRecipes();

assert.equal(recipes.length, 5, 'waystation zone must expose five hero landmarks');
assert.equal(Object.keys(WAYSTATION_LANDMARK_RECIPES).length, recipes.length, 'waystation recipe listing is inconsistent');

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
  assert.equal(getWaystationLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(dioramaSource.includes(`'${recipe.id}'`), `factory does not claim ${recipe.id}`);
  // catalog variants must mirror the recipe states
  const entry = catalog.entries.find(e => e.id === recipe.id);
  assert.ok(entry.variants && entry.variants.length, `${recipe.id} catalog entry has no variants`);
  assert.deepEqual(entry.variants, recipe.states, `${recipe.id} catalog variants drift from recipe states`);
  // every declared socket is realized as a named node in the diorama sources
  for (const socket of recipe.sockets) {
    assert.ok(dioramaSource.includes(`'${socket}'`), `diorama modules are missing socket node ${socket}`);
  }
}

// bespoke story props (one authored named prop per room minimum)
for (const storyNode of [
  'founders-roster-plate',
  'old-mine-map-scroll',
  'escape-claw-marks',
  'royal-crest-suitcase',
  'fortieth-dark-lamp',
  'lab-escape-sigil'
]) {
  assert.ok(dioramaSource.includes(`'${storyNode}'`), `diorama modules are missing story node ${storyNode}`);
}

// every state string must be represented (grep or recipe table)
for (const state of [
  'operational', 'refugee-crowded', 'expedition-suspended',
  'memorial', 'inn-recruitment-office',
  'managed', 'pressured', 'supply-gateway',
  'ordered', 'overfilled', 'raided',
  'lit', 'darkened', 'fortified'
]) {
  assert.ok(dioramaSource.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
}

// detailed-not-placeholder proofs: lit materials, arches from voussoirs, articulated composites, layered silhouette
assert.ok(dioramaSource.includes('MeshStandardMaterial'), 'landmarks must use lit MeshStandardMaterial');
assert.ok(dioramaSource.includes("'voussoir'"), 'the sealed gate must build arches from voussoir blocks');
assert.ok(dioramaSource.includes("'lantern-arm'"), 'brass lanterns must be articulated (post -> arm -> cage)');
assert.ok(dioramaSource.includes("'baggage-scale-beam'"), 'the baggage scale must be an articulated balance');
assert.ok(dioramaSource.includes("'stair-tread'"), 'the descent must be a layered stepped stairway');
assert.ok(dioramaSource.includes("'goddess-arm'"), 'the goddess statue must be a composite figure');
assert.ok(dioramaSource.includes('emissive'), 'lamps/runes/water must carry emissive life');

// isolation
assert.ok(!dioramaSource.includes("'inn."), 'isolated waystation pack must not claim inn.* bundles');
assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import shared renderer');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore scale from a stable base');
assert.equal(getWaystationLandmarkRecipe('missing.waystation.landmark'), null, 'unknown waystation landmarks must fail softly');

console.log(`waystation asset smoke passed with ${recipes.length} isolated hero dioramas`);
