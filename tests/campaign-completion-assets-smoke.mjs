import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listCampaignCompletionRecipes, getCampaignCompletionRecipe } from '../src/engine/CampaignCompletionLandmarkRecipes.js';

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json', import.meta.url), 'utf8'));
const resolver = await readFile(new URL('../src/engine/Phase8AssetResolver.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../src/engine/CampaignCompletionDioramas.js', import.meta.url), 'utf8');
const rooms = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listCampaignCompletionRecipes();
assert.equal(recipes.length, 16);
for (const recipe of recipes) {
  const room = rooms.get(recipe.roomId);
  assert.ok(room, `missing room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id);
  assert.deepEqual(room.stateVariants, recipe.states);
  assert.ok(catalogIds.has(recipe.id));
  assert.ok(recipe.footprint.width <= room.size[0]);
  assert.ok(recipe.footprint.depth <= room.size[1]);
  assert.ok(recipe.sockets.length >= 5);
  assert.equal(getCampaignCompletionRecipe(recipe.id), recipe);
}
for (const semantic of ['market-square','combat-pit','war-throne','ritual-core','heart-core','summoning-circle','blast-door','crown-vault','high-table','royal-bed','grain-silo','barrel-rack','glasshouse-frame','gardener-cot','host-cocoon','egg-clutch']) assert.ok(source.includes(`'${semantic}'`), `missing ${semantic}`);
assert.ok(resolver.includes('createCampaignCompletionAssetPack'));
console.log('campaign completion asset contracts passed');
