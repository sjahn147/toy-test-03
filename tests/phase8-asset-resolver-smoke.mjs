import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resolver = await source('../src/engine/Phase8AssetResolver.js');
const registry = await source('../src/engine/AssetRegistryPhase8.js');
const renderer = await source('../src/engine/DungeonRendererPhase8.js');
const fungalPack = await source('../src/engine/FungalGardenAssetPack.js');

for (const factory of [
  'createCommonDungeonArchitectureAssetPack',
  'createFungalGardenAssetPack',
  'SpiderColonyAssetPack',
  'createFloodedStorehouseAssetPack',
  'createLaboratoryAssetPack',
  'createRoyalSanctumAssetPack'
]) assert.ok(resolver.includes(factory), `resolver must register ${factory}`);

assert.ok(resolver.includes('diagnosticMarker'), 'unknown assets need a visible fail-soft marker');
assert.ok(resolver.includes('release(root)'), 'resolver must release animation state');
assert.ok(registry.includes('makeCampaignLandmark'), 'registry must expose landmark creation');
assert.ok(registry.includes('animateCampaignLandmark'), 'registry must expose landmark animation');
assert.ok(renderer.includes('renderCampaignLandmarks'), 'renderer must render campaign landmarks');
assert.ok(renderer.includes('room.landmarkBundle'), 'renderer must consume manifest landmark bundles');
assert.ok(renderer.includes('disposeTree(mesh)'), 'renderer must dispose replaced landmark resources');
assert.ok(renderer.includes('prepareVisualAgents'), 'renderer must preserve corpse-linger presentation');
assert.ok(fungalPack.includes('canCreate:'), 'fungal pack contract must be complete');
assert.ok(fungalPack.trim().endsWith('}'), 'fungal pack source must not be truncated');

console.log('phase8 asset resolver integration smoke: ok');

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
