import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CENTRAL_MARKET_BUNDLE_IDS,
  CENTRAL_MARKET_LANDMARK_RECIPES,
  getCentralMarketLandmarkRecipe,
  listCentralMarketLandmarkRecipes
} from '../src/engine/CentralMarketLandmarkRecipes.js';

const contract = await loadContract();
const roomById = new Map(contract.rooms.map(room => [room.id, room]));
const catalogIds = new Set(contract.catalogEntries);
const recipes = listCentralMarketLandmarkRecipes();
const sourceNames = [
  'CentralMarketGeometry.js',
  'CentralMarketLandmarkAssetFactory.js',
  'GrandCrossroadsDiorama.js',
  'DeadCustomsHouseDiorama.js',
  'RuinedAuctionHallDiorama.js',
  'NeutralWellDiorama.js',
  'SmugglersWayDiorama.js'
];
const sources = await Promise.all(sourceNames.map(name => source(`../src/engine/${name}`)));
const implementationSource = sources.join('\n');
const animatorSource = await source('../src/engine/CentralMarketAssetAnimator.js');
const packSource = await source('../src/engine/CentralMarketAssetPack.js');

assert.equal(recipes.length, 5, 'Central Cross-Market must expose five dedicated landmark recipes');
assert.equal(Object.keys(CENTRAL_MARKET_LANDMARK_RECIPES).length, recipes.length, 'recipe object and listing differ');
assert.deepEqual(CENTRAL_MARKET_BUNDLE_IDS, contract.catalogEntries, 'bundle order drifted from the approved contract');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `missing contract room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `${recipe.roomId} bundle mismatch`);
  assert.deepEqual(recipe.states, room.stateVariants, `${recipe.id} state variants drifted from manifest`);
  assert.ok(recipe.states.includes(recipe.defaultState), `${recipe.id} default state is invalid`);
  assert.ok(catalogIds.has(recipe.id), `asset catalog fixture lacks ${recipe.id}`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} lacks vertical budget`);
  assert.ok(recipe.triangleBudget <= 75000, `${recipe.id} exceeds desktop hero triangle budget`);
  assert.ok(recipe.semanticSockets.length >= 12, `${recipe.id} requires at least twelve semantic sockets`);
  assert.equal(new Set(recipe.semanticSockets.map(socket => socket.id)).size, recipe.semanticSockets.length, `${recipe.id} has duplicate sockets`);
  for (const socket of recipe.semanticSockets) {
    assert.ok(Math.abs(socket.position[0]) <= recipe.footprint.width / 2, `${recipe.id}:${socket.id} exceeds footprint width`);
    assert.ok(Math.abs(socket.position[2]) <= recipe.footprint.depth / 2, `${recipe.id}:${socket.id} exceeds footprint depth`);
  }
  for (const lane of recipe.reservedLanes) {
    for (const point of [lane.from, lane.to]) {
      assert.ok(Math.abs(point[0]) <= recipe.footprint.width / 2, `${recipe.id}:${lane.id} exceeds footprint width`);
      assert.ok(Math.abs(point[1]) <= recipe.footprint.depth / 2, `${recipe.id}:${lane.id} exceeds footprint depth`);
    }
  }
  assert.ok(recipe.storyProps.length >= 3, `${recipe.id} requires three narrative props`);
  assert.ok(recipe.animationChannels.length >= 4, `${recipe.id} needs a lived-in animation vocabulary`);
  assert.equal(getCentralMarketLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(implementationSource.includes(`'${recipe.id}'`), `factory does not claim ${recipe.id}`);
}

for (const semanticNode of [
  'story.market-wayfinder',
  'story.guild-route-stone',
  'story.overwritten-notice-board',
  'customs.inspection-table',
  'customs.scale',
  'story.burned-ledger-chest',
  'story.confiscation-seals',
  'story.false-duty-table',
  'story.auctioneer-platform',
  'story.hidden-consignment-cache',
  'story.last-lot-number',
  'auction.display-cage',
  'story.neutrality-marker',
  'story.repaired-pulley',
  'story.shared-cup-shelf',
  'well.water-surface',
  'well.bucket',
  'story.false-dead-end',
  'story.floor-cache',
  'story.smugglers-code-marks',
  'socket.secret-trigger'
]) assert.ok(implementationSource.includes(`'${semanticNode}'`), `missing semantic story node ${semanticNode}`);

for (const state of contract.rooms.flatMap(room => room.stateVariants)) {
  assert.ok(implementationSource.includes(`'${state}'`) || JSON.stringify(recipes).includes(`"${state}"`), `missing state ${state}`);
}

for (const animation of [
  'cloth-sway', 'sign-creak', 'lantern-sway', 'flame-flicker', 'smoke-rise',
  'chain-tremble', 'water-ripple', 'poison-ripple', 'bucket-sway', 'rope-drift',
  'hidden-lamp-pulse', 'dust-breath'
]) assert.ok(animatorSource.includes(`'${animation}'`), `animator lacks ${animation}`);

assert.ok(implementationSource.includes('materialCache'), 'geometry helpers must reuse materials');
assert.ok(implementationSource.includes('geometryCache'), 'geometry helpers must reuse geometry');
assert.ok(implementationSource.includes('blocksTraversal'), 'assets must declare traversal behavior');
assert.ok(implementationSource.includes('semanticSockets'), 'assets must expose semantic sockets');
assert.ok(!animatorSource.includes('position.y +='), 'animator may not accumulate vertical drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore transform from a stable base');
assert.ok(packSource.includes("this.id = 'campaign.central-cross-market'"), 'pack needs a stable domain id');
assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import the shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import the shared renderer');
assert.equal(getCentralMarketLandmarkRecipe('market.missing'), null, 'unknown bundles must fail softly');

console.log(`central market asset smoke passed with ${recipes.length} detailed landmark dioramas`);

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

async function loadContract() {
  try {
    const manifest = JSON.parse(await source('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
    const catalog = JSON.parse(await source('../content/assets/asset-catalog.json'));
    return {
      rooms: manifest.rooms.filter(room => ['I41', 'I42', 'I43', 'I44', 'I45'].includes(room.id)),
      catalogEntries: catalog.entries
        .map(entry => entry.id)
        .filter(id => id.startsWith('market.'))
        .filter(id => ['market.crossroads.grand', 'market.customs.dead', 'market.auction.ruined', 'market.well.neutral', 'market.smuggler.way'].includes(id))
    };
  } catch {
    return JSON.parse(await source('../fixtures/central-market-contract.json'));
  }
}
