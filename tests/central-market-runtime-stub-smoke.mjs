import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = new URL('../src/engine/', import.meta.url);
const stubPath = new URL('./support/ThreeSceneStub.js', import.meta.url);
const contract = await loadContract();
const tempRoot = await mkdtemp(join(tmpdir(), 'central-market-runtime-'));
const engineRoot = join(tempRoot, 'engine');

await cp(sourceRoot, engineRoot, { recursive: true });
await writeFile(join(engineRoot, 'ThreeScene.js'), await readFile(stubPath, 'utf8'));
await writeFile(join(tempRoot, 'package.json'), '{"type":"module"}\n');

const packModule = await import(pathToFileURL(join(engineRoot, 'CentralMarketAssetPack.js')).href);
const recipeModule = await import(pathToFileURL(join(engineRoot, 'CentralMarketLandmarkRecipes.js')).href);
const { CentralMarketAssetPack } = packModule;
const { listCentralMarketLandmarkRecipes } = recipeModule;
const pack = new CentralMarketAssetPack();
const recipes = listCentralMarketLandmarkRecipes();
const roomById = new Map(contract.rooms.map(room => [room.id, room]));
const results = [];
const validMaterialNames = new Set([
  'stone', 'stoneDark', 'wood', 'woodDark', 'iron', 'brass',
  'clothRed', 'clothOchre', 'clothOlive', 'clothBlue', 'clothBlack',
  'parchment', 'waxRed', 'lantern', 'water', 'poison'
]);

assert.equal(recipes.length, 5, 'runtime smoke expected five recipes');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  const stateSignatures = new Set();
  assert.ok(room, `missing contract room ${recipe.roomId}`);
  assert.equal(pack.canCreate(recipe.id), true, `${recipe.id} is not claimed by the pack`);

  for (const state of recipe.states) {
    const root = pack.create(recipe.id, { state });
    assert.ok(root, `${recipe.id}:${state} returned no root`);
    assert.equal(root.userData.bundleId, recipe.id, `${recipe.id}:${state} lost bundle metadata`);
    assert.equal(root.userData.roomId, recipe.roomId, `${recipe.id}:${state} lost room metadata`);
    assert.equal(root.userData.state, state, `${recipe.id}:${state} resolved the wrong state`);
    assert.deepEqual(root.userData.sockets, recipe.semanticSockets.map(socket => socket.id), `${recipe.id}:${state} socket metadata drifted`);

    const visibleStoryProps = recipe.storyProps.filter(storyProp => root.getObjectByName(storyProp));
    assert.ok(visibleStoryProps.length >= 2, `${recipe.id}:${state} exposes only ${visibleStoryProps.length} narrative props`);
    for (const semanticSocket of recipe.semanticSockets) {
      assert.ok(root.getObjectByName(semanticSocket.id), `${recipe.id}:${state} is missing semantic socket ${semanticSocket.id}`);
    }

    const metrics = inspect(root);
    const meshLimit = recipe.roomId === 'I43' ? 130 : 90;
    const materialLimit = recipe.roomId === 'I43' ? 15 : 12;
    const animationLimit = recipe.roomId === 'I43' ? 24 : 16;
    assert.ok(metrics.meshes <= meshLimit, `${recipe.id}:${state} has ${metrics.meshes} meshes, limit ${meshLimit}`);
    assert.ok(metrics.materials <= materialLimit, `${recipe.id}:${state} has ${metrics.materials} materials, limit ${materialLimit}`);
    assert.ok(metrics.animated <= animationLimit, `${recipe.id}:${state} has ${metrics.animated} animated nodes, limit ${animationLimit}`);
    assert.equal(metrics.invalidTransforms, 0, `${recipe.id}:${state} contains invalid transforms before animation`);
    for (const materialName of metrics.materialNames) {
      assert.ok(validMaterialNames.has(materialName), `${recipe.id}:${state} uses unregistered material ${materialName}`);
    }
    stateSignatures.add(metrics.nodeNames.join('|'));

    for (const elapsed of [0, 1.25, 12.75]) pack.update(root, elapsed);
    assert.equal(inspect(root).invalidTransforms, 0, `${recipe.id}:${state} contains invalid transforms after animation`);
    pack.dispose(root);
    root.traverse(node => assert.equal(Boolean(node.userData?.centralMarketAnimationBase), false, `${recipe.id}:${state} animation base was not disposed`));

    results.push({ room: recipe.roomId, state, ...metrics });
  }
  assert.equal(stateSignatures.size, recipe.states.length, `${recipe.id} states do not produce distinct scene structures`);
}

assert.equal(pack.canCreate('market.missing'), false, 'unknown bundle must not be claimed');
assert.equal(pack.create('market.missing'), null, 'unknown bundle must fail softly');

console.log('central market runtime stub smoke passed');
for (const result of results) {
  console.log(`${result.room}:${result.state} nodes=${result.nodes} meshes=${result.meshes} materials=${result.materials} animated=${result.animated}`);
}

function inspect(root) {
  const materials = new Set();
  const nodeNames = [];
  let nodes = 0;
  let meshes = 0;
  let animated = 0;
  let invalidTransforms = 0;
  root.traverse(node => {
    nodes += 1;
    nodeNames.push(node.name ?? '');
    if (node.geometry && node.material) {
      meshes += 1;
      if (Array.isArray(node.material)) node.material.forEach(material => materials.add(material));
      else materials.add(node.material);
    }
    if (node.userData?.animation) animated += 1;
    for (const transform of [node.position, node.rotation, node.scale]) {
      if (![transform.x, transform.y, transform.z].every(Number.isFinite)) invalidTransforms += 1;
    }
  });
  const materialNames = [...materials].map(material => String(material.name ?? '').replace('central-market-material:', ''));
  return { nodes, meshes, materials: materials.size, materialNames, nodeNames, animated, invalidTransforms };
}

async function loadContract() {
  try {
    const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/campaign.manifest.json', import.meta.url), 'utf8'));
    return { rooms: manifest.rooms.filter(room => ['I41', 'I42', 'I43', 'I44', 'I45'].includes(room.id)) };
  } catch {
    return JSON.parse(await readFile(new URL('../fixtures/central-market-contract.json', import.meta.url), 'utf8'));
  }
}
