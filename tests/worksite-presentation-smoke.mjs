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
  'worksite-lift-load',
  'animateScaffold'
]) assert.ok(assetSource.includes(token), `missing ${token}`);

for (const token of [
  'renderScaffolds',
  'renderUnloadingCargo',
  "prop.underConstruction",
  "activity.type !== 'unloading'",
  'cargoMeshes.get(activity.cargoId)',
  'activity.anchor',
  'disposeTree'
]) assert.ok(rendererSource.includes(token), `missing ${token}`);

assert.match(registrySource, /new WorksiteAssetFactory/);
assert.match(registrySource, /makeWorksiteScaffold/);
assert.match(registrySource, /animateWorksiteScaffold/);
assert.match(strategyRendererSource, /new WorksitePresentationRenderer/);
assert.match(strategyRendererSource, /worksitePresentation\.render/);
assert.match(strategyRendererSource, /worksitePresentation\.destroy/);

console.log('worksite presentation smoke: ok');
