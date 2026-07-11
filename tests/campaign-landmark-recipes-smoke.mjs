import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CAMPAIGN_LANDMARK_RECIPES,
  getCampaignLandmarkRecipe,
  listCampaignLandmarkRecipes
} from '../src/engine/CampaignLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(
  new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url),
  'utf8'
));
const catalog = JSON.parse(await readFile(
  new URL('../content/assets/asset-catalog.json', import.meta.url),
  'utf8'
));

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listCampaignLandmarkRecipes();

assert.equal(recipes.length, 4, 'P0 landmark slice must expose exactly four recipes');
assert.equal(Object.keys(CAMPAIGN_LANDMARK_RECIPES).length, recipes.length, 'recipe listing is inconsistent');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `landmark ${recipe.id} references missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `room ${room.id} does not select recipe ${recipe.id}`);
  assert.ok(catalogIds.has(recipe.id), `asset catalog is missing ${recipe.id}`);
  assert.ok(room.stateVariants.includes(recipe.defaultState), `${recipe.id} default state is not valid for ${room.id}`);
  assert.ok(recipe.placement && Number.isFinite(recipe.placement.scale), `${recipe.id} has no valid placement`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} has no height budget`);
  assert.ok(recipe.sockets.length >= 4, `${recipe.id} needs at least four semantic sockets`);
  assert.equal(new Set(recipe.sockets).size, recipe.sockets.length, `${recipe.id} has duplicate sockets`);
  assert.equal(getCampaignLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
}

for (const requiredId of [
  'waystation.plaza.core',
  'gate.citadel.outer',
  'inn.old-lantern.common-room',
  'inn.old-lantern.kitchen'
]) {
  assert.ok(getCampaignLandmarkRecipe(requiredId), `missing required P0 landmark ${requiredId}`);
}

assert.equal(getCampaignLandmarkRecipe('missing.landmark'), null, 'unknown landmarks must fail softly');

console.log(`campaign landmark recipe smoke passed with ${recipes.length} detailed P0 dioramas`);
