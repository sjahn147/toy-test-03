import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [assetSource, rendererSource, registrySource, strategyRendererSource] = await Promise.all([
  read('../src/engine/WorksiteAssetFactory.js'),
  read('../src/engine/WorksitePresentationRenderer.js'),
  read('../src/engine/StrategyAssetRegistry.js'),
  read('../src/engine/StrategyDungeonRenderer.js')
]);

for (const token of [
  'createScaffold',
  'worksite-post',
  'worksite-platform',
  'worksite-material',
  'worksite-pulley',
  'worksite-rope',
  'worksite-lift-load',
  'animateScaffold'
]) assert.ok(assetSource.includes(token), `missing ${token}`);

for (const token of [
  'renderScaffolds',
  'positionUnloadingCargo',
  'prop.underConstruction',
  "activity.type === 'unloading'",
  'cargoMeshes.get(cargo.id)',
  'activity.anchor',
  'smoothstep',
  'disposeTree'
]) assert.ok(rendererSource.includes(token), `missing ${token}`);

assert.match(rendererSource, /this\.assets\.makeWorksiteScaffold\?\.\(prop\)/);
assert.match(rendererSource, /this\.assets\.animateWorksiteScaffold\?\.\(mesh, prop, time\)/);
assert.doesNotMatch(rendererSource, /assets\.worksite\?\./);

assert.match(registrySource, /new WorksiteAssetFactory/);
assert.match(registrySource, /makeWorksiteScaffold/);
assert.match(registrySource, /animateWorksiteScaffold/);
assert.match(strategyRendererSource, /new WorksitePresentationRenderer/);
assert.match(strategyRendererSource, /worksitePresentation\.render/);
assert.match(strategyRendererSource, /worksitePresentation\.destroy/);
assert.match(strategyRendererSource, /cargoMeshes: this\.cargoMeshes/);

console.log('worksite presentation smoke: ok');
