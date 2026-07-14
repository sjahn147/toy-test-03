import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  RESIDENTIAL_QUARTER_LANDMARK_RECIPES,
  getResidentialQuarterLandmarkRecipe,
  listResidentialQuarterLandmarkRecipes
} from '../src/engine/ResidentialQuarterLandmarkRecipes.js';

const manifest = JSON.parse(await source('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog = JSON.parse(await source('../content/assets/asset-catalog.json'));
const resolver = await source('../src/engine/Phase8AssetResolver.js');
const packageJson = JSON.parse(await source('../package.json'));
const pack = await source('../src/engine/ResidentialQuarterAssetPack.js');
const factory = await source('../src/engine/ResidentialQuarterLandmarkAssetFactory.js');
const animator = await source('../src/engine/ResidentialQuarterAssetAnimator.js');
const dioramaSources = await Promise.all([
  'ResidentialQuarterGeometry.js',
  'ResidentialDormitoryDiorama.js',
  'ResidentialKitchenDiorama.js',
  'ResidentialLaundryDiorama.js',
  'ResidentialCourtDiorama.js',
  'ResidentialChapelDiorama.js'
].map(name => source(`../src/engine/${name}`)));
const dioramas = dioramaSources.join('\n');

const recipes = listResidentialQuarterLandmarkRecipes();
const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const authoredLinks = [
  ...manifest.connections,
  ...manifest.secretConnections.map(link => [link.from, link.to]),
  // WP13 room-to-room vertical connectors also need an authored portal on each landing room.
  ...(manifest.verticalConnectors ?? []).map(connector => [connector.from?.roomId, connector.to?.roomId])
];

assert.equal(recipes.length, 5, 'Residential Quarter must provide five dedicated landmarks');
assert.equal(Object.keys(RESIDENTIAL_QUARTER_LANDMARK_RECIPES).length, 5);

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `missing room ${recipe.roomId}`);
  assert.equal(room.zoneId, 'B', `${recipe.roomId} must remain in Residential Quarter`);
  assert.equal(room.landmarkBundle, recipe.id, `${recipe.roomId} bundle mismatch`);
  assert.deepEqual([...recipe.states], room.stateVariants, `${recipe.roomId} states drifted`);
  assert.ok(recipe.states.includes(recipe.defaultState), `${recipe.id} has invalid default state`);
  assert.ok(catalogIds.has(recipe.id), `asset catalog missing ${recipe.id}`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} has no height budget`);
  assert.ok(recipe.triangleBudget <= 75000, `${recipe.id} exceeds desktop hero budget`);
  assert.ok(recipe.sockets.length >= 6, `${recipe.id} requires six semantic sockets`);
  assert.ok(recipe.systems.length >= 3, `${recipe.id} must connect to multiple simulation systems`);
  assert.ok(recipe.traversal.minimumClearWidth >= 2.2, `${recipe.id} traversal width is unsafe`);
  assert.ok(recipe.traversal.lanes.length >= 1, `${recipe.id} has no reserved traversal lane`);
  assert.ok(recipe.traversal.portals.length >= 3, `${recipe.id} lacks logical adjacency intent`);
  assert.equal(getResidentialQuarterLandmarkRecipe(recipe.id), recipe);
  assert.ok(factory.includes(`'${recipe.id}'`), `factory does not explicitly claim ${recipe.id}`);
  assert.ok(dioramas.includes(`'${recipe.storyNode}'`), `${recipe.id} story node is not modeled`);

  const expectedNeighbors = authoredLinks.flatMap(([a, b]) => a === recipe.roomId ? [b] : b === recipe.roomId ? [a] : []);
  const declaredNeighbors = recipe.traversal.portals.map(portal => portal.replace('-secret', ''));
  assert.deepEqual([...declaredNeighbors].sort(), [...expectedNeighbors].sort(), `${recipe.roomId} portal intent must mirror authored map links`);

  for (const socket of recipe.sockets) assert.ok(dioramas.includes(`'${socket}'`), `${recipe.id} missing socket node ${socket}`);
}

for (const required of [
  'central-traversal-aisle', 'communal-range', 'raised-dry-walkway',
  'cross-traversal-lane', 'ossuary-threshold', 'smuggler-drain',
  'child-map-mural', 'last-supper-place-setting', 'smuggler-route-scratch',
  'tenant-key-mosaic', 'hidden-prayer-scroll'
]) assert.ok(dioramas.includes(`'${required}'`), `missing Residential Quarter narrative/spatial node ${required}`);

for (const state of [
  'abandoned', 'field-camp', 'burned',
  'cold', 'working', 'infested',
  'clear', 'camped', 'fungal-contaminated',
  'empty', 'occupied', 'barricaded',
  'dormant', 'reconsecrated', 'defiled'
]) assert.ok(dioramas.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);

assert.ok(dioramas.includes('MeshStandardMaterial'), 'Residential Quarter must use lit materials');
assert.ok(dioramas.includes("'bunk-frame'"), 'dormitory needs articulated bunk construction');
assert.ok(dioramas.includes("'prep-pot'"), 'kitchen needs recognizable cookware');
assert.ok(dioramas.includes("'laundry-lines'"), 'laundry needs overhead domestic dressing');
assert.ok(dioramas.includes("'tenement-balcony'"), 'court needs vertical residential silhouette');
assert.ok(dioramas.includes("'family-icon-wall'"), 'chapel needs domestic devotional identity');
assert.ok(pack.includes('ResidentialQuarterLandmarkAssetFactory'));
assert.ok(pack.includes('ResidentialQuarterAssetAnimator'));
assert.ok(resolver.includes('ResidentialQuarterAssetPack'));
assert.ok(resolver.includes('priority: 110'));
assert.ok(!animator.includes('position.y +='), 'animation must not accumulate drift');
assert.ok(!animator.includes('scale.multiplyScalar'), 'animation must restore stable scale');
assert.equal(packageJson.scripts['test:residential'], 'node tests/residential-quarter-assets-smoke.mjs');
assert.ok(packageJson.scripts['test:assets'].includes('test:residential'));
assert.equal(getResidentialQuarterLandmarkRecipe('missing.residential.landmark'), null);

console.log('Residential Quarter asset smoke passed: 5 coherent living-quarter landmarks');

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
