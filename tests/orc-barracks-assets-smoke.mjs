import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ORC_BARRACKS_LANDMARK_RECIPES,
  getOrcBarracksLandmarkRecipe,
  listOrcBarracksLandmarkRecipes
} from '../src/engine/OrcBarracksLandmarkRecipes.js';

const contract = JSON.parse(await readFile(new URL('../fixtures/orc-barracks-contract.json', import.meta.url), 'utf8'));
const roomById = new Map(contract.rooms.map(room => [room.id, room]));
const recipes = listOrcBarracksLandmarkRecipes();
const sourceFiles = [
  'OrcBarracksGeometry.js',
  'OrcDrillYardDiorama.js',
  'OrcWarArmoryDiorama.js',
  'OrcMeatStoreDiorama.js',
  'OrcBarracksLandmarkAssetFactory.js'
];
const source = (await Promise.all(sourceFiles.map(name => readFile(new URL(`../src/engine/${name}`, import.meta.url), 'utf8')))).join('\n');
const animatorSource = await readFile(new URL('../src/engine/OrcBarracksAssetAnimator.js', import.meta.url), 'utf8');
const packSource = await readFile(new URL('../src/engine/OrcBarracksAssetPack.js', import.meta.url), 'utf8');

assert.equal(recipes.length, 3, 'orc barracks slice must expose three dedicated landmarks');
assert.equal(Object.keys(ORC_BARRACKS_LANDMARK_RECIPES).length, 3, 'recipe object and listing drifted');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  assert.ok(room, `missing contract room ${recipe.roomId}`);
  assert.equal(room.landmarkBundle, recipe.id, `${recipe.roomId} bundle drifted`);
  assert.deepEqual(recipe.states, room.stateVariants, `${recipe.id} states drifted from manifest contract`);
  assert.ok(recipe.states.includes(recipe.defaultState), `${recipe.id} default state is invalid`);
  assert.ok(recipe.footprint.width <= room.size[0], `${recipe.id} exceeds room width`);
  assert.ok(recipe.footprint.depth <= room.size[1], `${recipe.id} exceeds room depth`);
  assert.ok(recipe.footprint.height > 0, `${recipe.id} has no vertical budget`);
  assert.ok(recipe.triangleBudget <= 75000, `${recipe.id} exceeds desktop hero budget`);
  assert.ok(recipe.semanticSockets.length >= 18, `${recipe.id} needs rich semantic sockets`);
  assert.equal(new Set(recipe.semanticSockets.map(socket => socket.id)).size, recipe.semanticSockets.length, `${recipe.id} has duplicate sockets`);
  assert.ok(recipe.storyProps.length >= 3, `${recipe.id} needs three story props`);
  assert.ok(recipe.systemConnections.length >= 5, `${recipe.id} needs five system connections`);
  assert.ok(recipe.reservedLanes.every(lane => lane.width >= 2.8), `${recipe.id} has an undersized primary lane`);
  assert.equal(getOrcBarracksLandmarkRecipe(recipe.id), recipe, `${recipe.id} lookup is unstable`);
  assert.ok(source.includes(`'${recipe.id}'`), `factory does not explicitly claim ${recipe.id}`);
  for (const state of recipe.states) assert.ok(source.includes(`'${state}'`) || JSON.stringify(recipe).includes(`"${state}"`), `${recipe.id} is missing state ${state}`);
}

for (const nodeName of [
  'story.veterans-oath-post', 'story.recruit-score-board', 'story.worn-duel-ring',
  'drill.command-platform', 'drill.charge-log', 'drill.war-drum',
  'story.issue-token-rack', 'story.last-unreturned-blade', 'story.armorer-tea-cup',
  'armory.issue-counter', 'armory.weapon-wall-spears', 'armory.forge', 'armory-hidden-reserve-closed',
  'story.ration-scar-beam', 'story.last-stew-bowl', 'story.quarantine-ledger',
  'store.meat-rail', 'store.smoke-hearth', 'store.ration-scale', 'store.cauldron'
]) assert.ok(source.includes(`'${nodeName}'`) || source.includes(`\`${nodeName}\``), `implementation is missing named node ${nodeName}`);

for (const channel of [
  'banner-sway', 'target-swing', 'drum-pulse', 'weapon-tremble', 'chain-sway',
  'forge-flicker', 'bellows-pulse', 'whetstone-turn', 'ember-rise', 'smoke-drift',
  'hook-sway', 'cauldron-steam', 'fly-orbit', 'parasite-pulse'
]) assert.ok(animatorSource.includes(`'${channel}'`) || source.includes(`'${channel}'`), `missing animation channel ${channel}`);

assert.ok(!packSource.includes('AssetRegistryPhase8'), 'standalone pack must not import shared registry');
assert.ok(!packSource.includes('DungeonRendererPhase8'), 'standalone pack must not import renderer');
assert.ok(!packSource.includes('StrategyObserverScreen'), 'standalone pack must not import observer UI');
assert.ok(!packSource.includes('DungeonSimulation'), 'standalone pack must not import simulation');
assert.ok(!animatorSource.includes('position.y +='), 'animator must not accumulate vertical drift');
assert.ok(!animatorSource.includes('rotation.y +='), 'animator must not accumulate rotation drift');
assert.ok(!animatorSource.includes('scale.multiplyScalar'), 'animator must restore scale from a stable base');
assert.equal(getOrcBarracksLandmarkRecipe('orc.missing'), null, 'unknown orc landmark must fail softly');

console.log('orc barracks asset smoke passed with 3 isolated hero dioramas');
