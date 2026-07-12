import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = new URL('../src/engine/', import.meta.url);
const stubPath = new URL('./support/ThreeSceneStub.js', import.meta.url);
const contract = JSON.parse(await readFile(new URL('../fixtures/orc-barracks-contract.json', import.meta.url), 'utf8'));
const tempRoot = await mkdtemp(join(tmpdir(), 'orc-barracks-runtime-'));
const engineRoot = join(tempRoot, 'engine');

await cp(sourceRoot, engineRoot, { recursive: true });
await writeFile(join(engineRoot, 'ThreeScene.js'), await readFile(stubPath, 'utf8'));
await writeFile(join(tempRoot, 'package.json'), '{"type":"module"}\n');

const { OrcBarracksAssetPack } = await import(pathToFileURL(join(engineRoot, 'OrcBarracksAssetPack.js')).href);
const { listOrcBarracksLandmarkRecipes } = await import(pathToFileURL(join(engineRoot, 'OrcBarracksLandmarkRecipes.js')).href);
const pack = new OrcBarracksAssetPack();
const recipes = listOrcBarracksLandmarkRecipes();
const roomById = new Map(contract.rooms.map(room => [room.id, room]));
const results = [];
const validMaterialNames = new Set([
  'stone', 'stoneDark', 'wood', 'woodDark', 'iron', 'brass', 'leather',
  'clanRed', 'ochre', 'parchment', 'ember', 'meatDark', 'parasite', 'water'
]);
const meshLimits = { J46: 130, J47: 125, J48: 115 };
const animationLimits = { J46: 16, J47: 14, J48: 15 };

assert.equal(recipes.length, 3, 'runtime smoke expected three recipes');

for (const recipe of recipes) {
  const room = roomById.get(recipe.roomId);
  const signatures = new Set();
  assert.ok(room, `missing contract room ${recipe.roomId}`);
  assert.equal(pack.canCreate(recipe.id), true, `${recipe.id} is not claimed`);

  for (const state of recipe.states) {
    const root = pack.create(recipe.id, { state });
    assert.ok(root, `${recipe.id}:${state} returned no root`);
    assert.equal(root.userData.bundleId, recipe.id, `${recipe.id}:${state} lost bundle metadata`);
    assert.equal(root.userData.roomId, recipe.roomId, `${recipe.id}:${state} lost room metadata`);
    assert.equal(root.userData.state, state, `${recipe.id}:${state} resolved wrong state`);
    assert.deepEqual(root.userData.sockets, recipe.semanticSockets.map(socket => socket.id), `${recipe.id}:${state} socket metadata drifted`);
    assert.deepEqual(root.userData.systemConnections, recipe.systemConnections, `${recipe.id}:${state} system connections drifted`);

    for (const storyProp of recipe.storyProps) assert.ok(root.getObjectByName(storyProp), `${recipe.id}:${state} is missing story prop ${storyProp}`);
    for (const semanticSocket of recipe.semanticSockets) assert.ok(root.getObjectByName(semanticSocket.id), `${recipe.id}:${state} is missing socket ${semanticSocket.id}`);

    const metrics = inspect(root);
    assert.ok(metrics.meshes <= meshLimits[recipe.roomId], `${recipe.id}:${state} has ${metrics.meshes} meshes, limit ${meshLimits[recipe.roomId]}`);
    assert.ok(metrics.materials <= 15, `${recipe.id}:${state} has ${metrics.materials} materials, limit 15`);
    assert.ok(metrics.animated <= animationLimits[recipe.roomId], `${recipe.id}:${state} has ${metrics.animated} animated nodes, limit ${animationLimits[recipe.roomId]}`);
    assert.equal(metrics.invalidTransforms, 0, `${recipe.id}:${state} has invalid transforms before animation`);
    for (const materialName of metrics.materialNames) assert.ok(validMaterialNames.has(materialName), `${recipe.id}:${state} uses unregistered material ${materialName}`);
    signatures.add(metrics.nodeNames.join('|'));

    for (const elapsed of [0, 1.25, 12.75, 120]) pack.update(root, elapsed);
    assert.equal(inspect(root).invalidTransforms, 0, `${recipe.id}:${state} has invalid transforms after animation`);
    pack.dispose(root);
    root.traverse(node => assert.equal(Boolean(node.userData?.orcBarracksAnimationBase), false, `${recipe.id}:${state} animation base was not disposed`));
    results.push({ room: recipe.roomId, state, ...metrics });
  }
  assert.equal(signatures.size, recipe.states.length, `${recipe.id} states do not produce distinct scene graphs`);
}

assert.equal(pack.canCreate('orc.missing'), false, 'unknown bundle must not be claimed');
assert.equal(pack.create('orc.missing'), null, 'unknown bundle must fail softly');

console.log('orc barracks runtime stub smoke passed');
for (const result of results) console.log(`${result.room}:${result.state} nodes=${result.nodes} meshes=${result.meshes} materials=${result.materials} animated=${result.animated}`);

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
    for (const transform of [node.position, node.rotation, node.scale]) if (![transform.x, transform.y, transform.z].every(Number.isFinite)) invalidTransforms += 1;
  });
  const materialNames = [...materials].map(material => String(material.name ?? '').replace('orc-barracks-material:', ''));
  return { nodes, meshes, materials: materials.size, materialNames, nodeNames, animated, invalidTransforms };
}
