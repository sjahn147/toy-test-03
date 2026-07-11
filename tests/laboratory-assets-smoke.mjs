import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  listLaboratoryLandmarkRecipes,
  getLaboratoryLandmarkRecipe
} from '../src/engine/LaboratoryLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(
  new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url),
  'utf8'
));
const catalog = JSON.parse(await readFile(
  new URL('../content/assets/asset-catalog.json', import.meta.url),
  'utf8'
));
const source = await readFile(
  new URL('../src/engine/LaboratoryDioramas.js', import.meta.url),
  'utf8'
);
const rooms = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listLaboratoryLandmarkRecipes();

assert.equal(recipes.length, 3);
for (const recipe of recipes) {
  const room = rooms.get(recipe.roomId);
  assert.ok(room, `missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id);
  assert.deepEqual(room.stateVariants, recipe.states);
  assert.ok(catalogIds.has(recipe.id));
  assert.ok(recipe.footprint.width <= room.size[0]);
  assert.ok(recipe.footprint.depth <= room.size[1]);
  assert.ok(recipe.sockets.length >= 5);
  assert.ok(recipe.triangleBudget <= 75000);
  assert.equal(getLaboratoryLandmarkRecipe(recipe.id), recipe);
}
for (const semantic of ['distillation-array','parasite-vat','host-cradle','feeding-manifold','orrery-core','celestial-ring','void-aperture']) {
  assert.ok(source.includes(`'${semantic}'`), `missing ${semantic}`);
}
assert.equal(getLaboratoryLandmarkRecipe('missing'), null);
console.log('laboratory asset contracts passed');
