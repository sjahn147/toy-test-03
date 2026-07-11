import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listRoyalSanctumLandmarkRecipes, getRoyalSanctumLandmarkRecipe } from '../src/engine/RoyalSanctumLandmarkRecipes.js';
const manifest=JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../content/assets/asset-catalog.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../src/engine/RoyalSanctumDioramas.js',import.meta.url),'utf8');
const rooms=new Map(manifest.rooms.map(room=>[room.id,room]));
const ids=new Set(catalog.entries.map(entry=>entry.id));
const recipes=listRoyalSanctumLandmarkRecipes();
assert.equal(recipes.length,3);
for(const recipe of recipes){
  const room=rooms.get(recipe.roomId);
  assert.ok(room);
  assert.equal(room.landmarkBundle,recipe.id);
  assert.deepEqual(room.stateVariants,recipe.states);
  assert.ok(ids.has(recipe.id));
  assert.ok(recipe.footprint.width<=room.size[0]);
  assert.ok(recipe.footprint.depth<=room.size[1]);
  assert.ok(recipe.sockets.length>=5);
  assert.equal(getRoyalSanctumLandmarkRecipe(recipe.id),recipe);
}
for(const semantic of ['guardian-statue','black-throne','awakened-eye','seal-door','ritual-lock','opened-threshold']) assert.ok(source.includes(`'${semantic}'`));
assert.equal(getRoyalSanctumLandmarkRecipe('missing'),null);
console.log('royal sanctum asset contracts passed');
