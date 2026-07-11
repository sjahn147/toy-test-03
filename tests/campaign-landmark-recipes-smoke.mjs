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
const annexFactorySource = await readFile(new URL('../src/engine/OldLanternAnnexAssetFactory.js', import.meta.url), 'utf8');
const marketFactorySource = await readFile(new URL('../src/engine/CentralMarketLandmarkAssetFactory.js', import.meta.url), 'utf8');
const ossuaryFactorySource = await readFile(new URL('../src/engine/OssuaryLandmarkAssetFactory.js', import.meta.url), 'utf8');
const registrySource = await readFile(new URL('../src/engine/AssetRegistryPhase8.js', import.meta.url), 'utf8');

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
const catalogIds = new Set(catalog.entries.map(entry => entry.id));
const recipes = listCampaignLandmarkRecipes();

assert.equal(recipes.length, 11, 'landmark slice must expose waystation, Old Lantern, Grand Crossroads and three ossuary landmarks');
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

const requiredIds = [
  'waystation.plaza.core',
  'gate.citadel.outer',
  'inn.old-lantern.common-room',
  'inn.old-lantern.kitchen',
  'inn.old-lantern.guest-wing',
  'inn.old-lantern.cellar',
  'inn.old-lantern.secret-office',
  'market.crossroads.grand',
  'ossuary.chapel.funeral',
  'ossuary.shelves.working',
  'ossuary.well.last-names'
];

for (const requiredId of requiredIds) assert.ok(getCampaignLandmarkRecipe(requiredId), `missing required landmark ${requiredId}`);

for (const annexId of requiredIds.filter(id => id.includes('guest-wing') || id.includes('cellar') || id.includes('secret-office'))) {
  assert.ok(annexFactorySource.includes(`'${annexId}'`), `annex factory does not claim ${annexId}`);
}

for (const semanticNode of [
  'linen-service', 'resident-profession', 'web-infiltration', 'brewery-equipment', 'smuggling-door',
  'rat-warren', 'route-map-wall', 'ledger-desk', 'hidden-safe', 'weapon-cache', 'surveillance-hole'
]) {
  assert.ok(annexFactorySource.includes(`'${semanticNode}'`), `annex factory is missing semantic node ${semanticNode}`);
}

for (const marketNode of [
  'central-wayfinder', 'district-mosaic', 'cargo-scale', 'market-notice-board',
  'goblin-market-banner', 'adventurer-market-banner', 'orc-checkpoint-banner', 'battlefield'
]) {
  assert.ok(marketFactorySource.includes(`'${marketNode}'`), `market factory is missing state or semantic node ${marketNode}`);
}

for (const ossuaryNode of [
  'funeral-altar', 'royal-catafalque', 'funeral-bell', 'holy-water-font', 'choir-stalls',
  'ossuary-shelf-wall', 'skeleton-assembly-table', 'bone-cart', 'ladder-rail', 'experiment-catalog',
  'death-well', 'bone-pulley', 'death-crystal', 'royal-conduit', 'last-names-archive',
  'choir-active', 'spawning', 'overflowing'
]) {
  assert.ok(ossuaryFactorySource.includes(`'${ossuaryNode}'`), `ossuary factory is missing state or semantic node ${ossuaryNode}`);
}

assert.ok(
  registrySource.indexOf('this.ossuary.create') < registrySource.indexOf('this.campaignLandmarks.create'),
  'specific ossuary factory must run before the generic factory'
);
assert.equal(getCampaignLandmarkRecipe('missing.landmark'), null, 'unknown landmarks must fail softly');

console.log(`campaign landmark recipe smoke passed with ${recipes.length} detailed procedural dioramas`);
