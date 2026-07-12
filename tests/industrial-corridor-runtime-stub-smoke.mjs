import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Actually instantiates every recipe/state via the real diorama builders (with
// ThreeScene swapped for a local stub) instead of just scanning source text, so
// a plain ReferenceError inside a builder fails this test instead of slipping
// through undetected (the ossuary-cathedral pack shipped exactly this kind of
// bug - a helper used but not imported - before this test existed).

const sourceRoot = new URL('../src/engine/', import.meta.url);
const stubPath = new URL('./support/ThreeSceneStub.js', import.meta.url);
const tempRoot = await mkdtemp(join(tmpdir(), 'industrial-corridor-runtime-'));
const engineRoot = join(tempRoot, 'engine');

await cp(sourceRoot, engineRoot, { recursive: true });
await writeFile(join(engineRoot, 'ThreeScene.js'), await readFile(stubPath, 'utf8'));
await writeFile(join(tempRoot, 'package.json'), '{"type":"module"}\n');

const packModule = await import(pathToFileURL(join(engineRoot, 'IndustrialCorridorAssetPack.js')).href);
const recipeModule = await import(pathToFileURL(join(engineRoot, 'IndustrialCorridorLandmarkRecipes.js')).href);
const { IndustrialCorridorAssetPack } = packModule;
const { listIndustrialCorridorLandmarkRecipes } = recipeModule;
const pack = new IndustrialCorridorAssetPack();
const recipes = listIndustrialCorridorLandmarkRecipes();
const results = [];

assert.equal(recipes.length, 4, 'runtime smoke expected four industrial corridor recipes');

for (const recipe of recipes) {
  const stateSignatures = new Set();
  assert.equal(pack.canCreate(recipe.id), true, `${recipe.id} is not claimed by the pack`);

  for (const state of recipe.states) {
    const root = pack.create(recipe.id, { state });
    assert.ok(root, `${recipe.id}:${state} returned no root`);
    assert.equal(root.userData.bundleId, recipe.id, `${recipe.id}:${state} lost bundle metadata`);
    assert.equal(root.userData.roomId, recipe.roomId, `${recipe.id}:${state} lost room metadata`);
    assert.equal(root.userData.state, state, `${recipe.id}:${state} resolved the wrong state`);
    assert.deepEqual([...root.userData.sockets], [...recipe.sockets], `${recipe.id}:${state} socket metadata drifted`);

    const metrics = inspect(root);
    assert.ok(metrics.meshes > 0, `${recipe.id}:${state} produced no meshes`);
    assert.equal(metrics.invalidTransforms, 0, `${recipe.id}:${state} contains invalid transforms before animation`);
    stateSignatures.add(metrics.nodeNames.join('|'));

    for (const elapsed of [0, 1.25, 12.75]) pack.update(root, elapsed);
    assert.equal(inspect(root).invalidTransforms, 0, `${recipe.id}:${state} contains invalid transforms after animation`);

    results.push({ room: recipe.roomId, state, ...metrics });
  }
  assert.equal(stateSignatures.size, recipe.states.length, `${recipe.id} states do not produce distinct scene structures`);
}

assert.equal(pack.canCreate('industry.missing'), false, 'unknown bundle must not be claimed');
assert.equal(pack.create('industry.missing'), null, 'unknown bundle must fail softly');

console.log('industrial corridor runtime stub smoke passed');
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
  return { nodes, meshes, materials: materials.size, nodeNames, animated, invalidTransforms };
}
