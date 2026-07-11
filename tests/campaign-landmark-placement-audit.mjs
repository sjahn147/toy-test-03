import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listCampaignCompletionRecipes } from '../src/engine/CampaignCompletionLandmarkRecipes.js';

const manifest = JSON.parse(await source('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const packageJson = JSON.parse(await source('../package.json'));
const resolver = await source('../src/engine/Phase8AssetResolver.js');
const registry = await source('../src/engine/AssetRegistryPhase8.js');
const renderer = await source('../src/engine/DungeonRendererPhase8.js');
const pack = await source('../src/engine/CampaignCompletionAssetPack.js');
const dioramas = await source('../src/engine/CampaignCompletionDioramas.js');
const recipes = listCampaignCompletionRecipes();
const rooms = new Map(manifest.rooms.map(room => [room.id, room]));

assert.equal(recipes.length, 16, 'all Developer #3 target landmarks must be present');
for (const recipe of recipes) {
  const room = rooms.get(recipe.roomId);
  assert.ok(room, `missing campaign room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `${recipe.roomId} bundle must resolve to its recipe`);
  assert.deepEqual(room.stateVariants, recipe.states, `${recipe.roomId} states must match manifest`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.roomId} width exceeds room`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.roomId} depth exceeds room`);
  for (const state of recipe.states) assert.ok(dioramas.includes(`'${state}'`) || dioramas.includes(`===\'${state}\'`) || state === recipe.defaultState, `${recipe.roomId} state ${state} must be represented`);
}

for (const contract of [
  'createCampaignCompletionAssetPack',
  'priority: 130',
  'entry.pack.canCreate',
  'entry.pack.create',
  'this.animators.set',
  'this.animators.delete'
]) assert.ok(resolver.includes(contract), `resolver missing ${contract}`);

for (const contract of [
  'makeCampaignLandmark',
  'getCampaignLandmarkRecipe',
  'animateCampaignLandmark',
  'releaseCampaignLandmark'
]) assert.ok(registry.includes(contract), `registry missing ${contract}`);

for (const contract of [
  'renderCampaignLandmarks',
  'room.landmarkBundle',
  'room.visualState ?? room.stateVariant',
  'const signature = `${assetId}:${state',
  'this.removeLandmark(key, mesh)',
  'releaseCampaignLandmark(mesh)',
  'disposeTree(mesh)',
  'mesh.position.set',
  'mesh.rotation.y',
  'mesh.scale.setScalar'
]) assert.ok(renderer.includes(contract), `renderer missing ${contract}`);

assert.ok(pack.includes('CAMPAIGN_COMPLETION_BUNDLE_IDS'));
assert.ok(pack.includes('animateCampaignCompletion'));
assert.equal(packageJson.scripts['test:campaign-placement'], 'node tests/campaign-landmark-placement-audit.mjs');
assert.ok(packageJson.scripts['test:assets'].includes('test:campaign-placement'));

console.log('campaign landmark placement and wiring audit passed');

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
