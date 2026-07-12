import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INDUSTRIAL_CORRIDOR_LANDMARK_RECIPES,
  getIndustrialCorridorLandmarkRecipe,
  listIndustrialCorridorLandmarkRecipes
} from '../src/engine/IndustrialCorridorLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json', import.meta.url), 'utf8'));
const sources = await Promise.all([
  'IndustrialCorridorLandmarkAssetFactory.js',
  'IndustrialCorridorGeometry.js',
  'IndustrialWorkshopDiorama.js',
  'IndustrialScrapDiorama.js',
  'IndustrialTrapworksDiorama.js',
  'IndustrialMagazineDiorama.js'
].map(name => readFile(new URL(`../src/engine/${name}`, import.meta.url), 'utf8')));
const dioramaSource = sources.join('\n');
const animatorSource = await readFile(new URL('../src/engine/IndustrialCorridorAssetAnimator.js', import.meta.url), 'utf8');
const packSource = await readFile(new URL('../src/engine/IndustrialCorridorAssetPack.js', import.meta.url), 'utf8');
const resolverSource = await readFile(new URL('../src/engine/Phase8AssetResolver.js', import.meta.url), 'utf8');

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listIndustrialCorridorLandmarkRecipes();

assert.equal(recipes.length, 4, 'industrial corridor slice must expose four hero landmarks');
assert.equal(Object.keys(INDUSTRIAL_CORRIDOR_LANDMARK_RECIPES).length, recipes.length, 'industrial recipe listing is inconsistent');

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
  assert.equal(getIndustrialCorridorLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(dioramaSource.includes(`'${recipe.id}'`), `factory does not claim ${recipe.id}`);
}

for (const semanticNode of [
  'master-lathe', 'repair-bench', 'overhead-hoist', 'tool-cage', 'work-order-wall', 'cart-lane',
  'scrap-crane', 'sorting-bins', 'weighbridge', 'kobold-nest', 'salvage-ledger', 'cargo-lane',
  'trap-carousel', 'test-corridor', 'spring-rack', 'signal-board', 'clutch-shrine', 'safe-passage-lane',
  'powder-vault', 'blast-baffle', 'humidity-gauge', 'fuse-locker', 'breach-wall', 'evacuation-lane',
  'unfinished-clockwork-bird', 'bell-made-from-helmets', 'first-safe-trap', 'names-on-the-blast-door'
]) {
  assert.ok(dioramaSource.includes(`'${semanticNode}'`), `diorama modules are missing semantic node ${semanticNode}`);
}

for (const state of ['ruined', 'reactivated', 'exploded', 'stocked', 'stripped', 'weaponized', 'active', 'allied', 'destroyed', 'sealed', 'looted', 'detonated']) {
  assert.ok(dioramaSource.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
}

assert.ok(dioramaSource.includes('MeshStandardMaterial'), 'industrial materials must be lit, not basic');
assert.ok(dioramaSource.includes('gear-tooth'), 'geared machinery must be composite, not a single primitive');
assert.ok(dioramaSource.includes('hoist-chain'), 'overhead hoist needs an articulated chain');
assert.ok(!dioramaSource.includes("'inn."), 'isolated industrial pack must not claim inn bundles');
assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import shared renderer');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore scale from a stable base');
assert.equal(getIndustrialCorridorLandmarkRecipe('missing.industrial.landmark'), null, 'unknown industrial landmarks must fail softly');

assert.ok(resolverSource.includes('IndustrialCorridorAssetPack'), 'Phase8AssetResolver must register the industrial corridor pack');

console.log(`industrial corridor asset smoke passed with ${recipes.length} isolated hero dioramas`);
