import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  OSSUARY_CATHEDRAL_LANDMARK_RECIPES,
  getOssuaryCathedralLandmarkRecipe,
  listOssuaryCathedralLandmarkRecipes
} from '../src/engine/OssuaryCathedralLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json', import.meta.url), 'utf8'));
const sources = await Promise.all([
  'OssuaryCathedralLandmarkAssetFactory.js',
  'OssuaryCathedralGeometry.js',
  'OssuaryBoneCloisterDiorama.js',
  'OssuaryFuneralChapelDiorama.js',
  'OssuaryShelvesDiorama.js',
  'OssuaryNamelessTombDiorama.js',
  'OssuaryWellOfLastNamesDiorama.js'
].map(name => readFile(new URL(`../src/engine/${name}`, import.meta.url), 'utf8')));
const dioramaSource = sources.join('\n');
const animatorSource = await readFile(new URL('../src/engine/OssuaryCathedralAssetAnimator.js', import.meta.url), 'utf8');
const packSource = await readFile(new URL('../src/engine/OssuaryCathedralAssetPack.js', import.meta.url), 'utf8');
const resolverSource = await readFile(new URL('../src/engine/Phase8AssetResolver.js', import.meta.url), 'utf8');

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listOssuaryCathedralLandmarkRecipes();

assert.equal(recipes.length, 5, 'ossuary cathedral slice must expose five hero landmarks');
assert.equal(Object.keys(OSSUARY_CATHEDRAL_LANDMARK_RECIPES).length, recipes.length, 'ossuary recipe listing is inconsistent');

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
  assert.equal(getOssuaryCathedralLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(dioramaSource.includes(`'${recipe.id}'`), `factory does not claim ${recipe.id}`);
}

for (const semanticNode of [
  'bone-gate', 'rib-bell', 'grave-guard-post', 'corpse-cart', 'skull-arch', 'processional-lane',
  'demon-altar', 'corpse-choir-stalls', 'soul-organ', 'black-braziers', 'sacrifice-dais', 'chapel-aisle',
  'bone-racks', 'assembly-tables', 'skull-bins', 'marrow-cauldron', 'skeleton-muster-gate', 'bone-cart-lane',
  'black-knight-sarcophagus', 'wraith-chain', 'cursed-treasure', 'guardian-gargoyles', 'mourning-statues', 'tomb-escape-lane',
  'soul-well', 'demon-obelisks', 'wraith-ring', 'chained-name-stones', 'abyssal-bridge', 'deep-route-gate',
  'laughing-skull-sentinel', 'jawless-choirmaster', 'wrong-legs-skeleton', 'knight-who-forgot-his-name', 'crooked-herald-of-the-well'
]) {
  assert.ok(dioramaSource.includes(`'${semanticNode}'`), `diorama modules are missing semantic node ${semanticNode}`);
}

for (const state of ['silent', 'undead-held', 'reconsecrated', 'dormant', 'choir-active', 'purified', 'ordered', 'spawning', 'collapsed', 'sealed', 'opened', 'haunted', 'quiet', 'overflowing']) {
  assert.ok(dioramaSource.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
}

assert.ok(dioramaSource.includes('MeshStandardMaterial'), 'ossuary materials must be lit, not basic');
assert.ok(dioramaSource.includes('guard-leg-upper') && dioramaSource.includes('guard-leg-lower'), 'grave guard must be a composite articulated skeleton');
assert.ok(dioramaSource.includes('vertebra-ring'), 'bone columns need a layered ribbed silhouette');
assert.ok(!dioramaSource.includes("'inn."), 'isolated ossuary pack must not claim inn bundles');
assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import shared renderer');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore scale from a stable base');
assert.equal(getOssuaryCathedralLandmarkRecipe('missing.ossuary.landmark'), null, 'unknown ossuary landmarks must fail softly');

assert.ok(resolverSource.includes('OssuaryCathedralAssetPack'), 'Phase8AssetResolver must register the ossuary cathedral pack');

console.log(`ossuary cathedral asset smoke passed with ${recipes.length} isolated hero dioramas`);
