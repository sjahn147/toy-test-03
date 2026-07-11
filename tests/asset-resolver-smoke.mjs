import assert from 'node:assert/strict';
import { AssetPackRegistry } from '../src/engine/AssetPackRegistry.js';
import { AssetResolutionDiagnostics } from '../src/engine/AssetResolutionDiagnostics.js';
import { AssetResolver } from '../src/engine/AssetResolver.js';

function asset(name) {
  return { name, children: [], userData: {}, clone() { return asset(`${name}:clone`); } };
}

let animated = 0;
let disposed = 0;
const pack = {
  id: 'test.pack',
  bundleIds: ['procedural.hero', 'authored.fallback'],
  getRecipe(id) {
    return { id, states: ['idle', 'active'], defaultState: 'idle', placement: { scale: 1 } };
  },
  create(id, context) {
    return asset(`${id}:${context.state}`);
  },
  animate() { animated += 1; },
  dispose() { disposed += 1; }
};

const registry = new AssetPackRegistry([pack]);
assert.equal(registry.getPackFor('procedural.hero'), pack);
assert.throws(() => registry.register({ ...pack, id: 'duplicate.pack' }), /already owned/);

let loadCalls = 0;
const diagnostics = new AssetResolutionDiagnostics({ dedupeWindowMs: 0 });
const resolver = new AssetResolver({
  catalog: {
    'authored.hero': { id: 'authored.hero', authored: { model: '/hero.glb' }, variants: ['idle'] },
    'authored.fallback': { id: 'authored.fallback', authored: { model: '/missing.glb' }, variants: ['idle', 'active'] }
  },
  registry,
  diagnostics,
  authoredLoader: async (path) => {
    loadCalls += 1;
    if (path.includes('missing')) throw new Error('404');
    return asset(`template:${path}`);
  },
  legacyFactory: (id) => id === 'legacy.hero' ? asset('legacy') : null
});

const authored = await resolver.resolve('authored.hero', { state: 'idle' });
assert.equal(authored.userData.assetResolution.source, 'authored');
assert.equal(loadCalls, 1);
await resolver.resolve('authored.hero', { state: 'idle' });
assert.equal(loadCalls, 1, 'authored templates should be request-cached');

const fallback = await resolver.resolve('authored.fallback', { state: 'invalid' });
assert.equal(fallback.userData.assetResolution.source, 'procedural');
assert.equal(fallback.userData.assetResolution.state, 'idle');
assert.equal(loadCalls, 2);
await resolver.resolve('authored.fallback', { state: 'active' });
assert.equal(loadCalls, 2, 'failed authored paths should not be retried by default');

const procedural = await resolver.resolve('procedural.hero', { state: 'active' });
resolver.animate(procedural, 1, 0.016);
resolver.dispose(procedural);
assert.equal(animated, 1);
assert.equal(disposed, 1);

const legacy = await resolver.resolve('legacy.hero');
assert.equal(legacy.userData.assetResolution.source, 'legacy');

const missing = await resolver.resolve('missing.hero');
assert.equal(missing.userData.assetResolution.source, 'diagnostic');
assert.equal(missing.userData.assetResolution.missing, true);

const codes = diagnostics.snapshot().map((entry) => entry.code);
assert.ok(codes.includes('authored-load-failed'));
assert.ok(codes.includes('invalid-state'));
assert.ok(codes.includes('missing-asset'));

console.log('asset resolver smoke passed');
