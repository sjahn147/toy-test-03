import { AssetPackRegistry } from './AssetPackRegistry.js';
import { AssetResolutionDiagnostics, createDiagnosticAsset } from './AssetResolutionDiagnostics.js';

function catalogToMap(catalog) {
  if (catalog instanceof Map) return new Map(catalog);
  const entries = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.assets) ? catalog.assets : null;
  if (entries) return new Map(entries.filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
  if (catalog && typeof catalog === 'object') return new Map(Object.entries(catalog));
  return new Map();
}

function callLegacy(legacyFactory, bundleId, context) {
  if (!legacyFactory) return null;
  if (typeof legacyFactory === 'function') return legacyFactory(bundleId, context);
  if (typeof legacyFactory.create === 'function') return legacyFactory.create(bundleId, context);
  return null;
}

function setScalar(target, value) {
  if (!target || value === undefined || value === null) return;
  if (typeof target.setScalar === 'function') target.setScalar(value);
  else if (typeof target.set === 'function') target.set(value, value, value);
}

function applyPlacement(asset, placement = {}) {
  if (!asset || !placement) return;
  if (asset.position?.set) asset.position.set(placement.ox ?? 0, placement.oy ?? 0, placement.oz ?? 0);
  if (asset.rotation) asset.rotation.y = placement.rotation ?? asset.rotation.y ?? 0;
  setScalar(asset.scale, placement.scale);
}

function attachMetadata(asset, metadata) {
  if (!asset || typeof asset !== 'object') return asset;
  asset.userData ??= {};
  asset.userData.assetResolution = Object.freeze({ ...(asset.userData.assetResolution ?? {}), ...metadata });
  return asset;
}

function validateState(bundleId, requestedState, recipe, catalogEntry, diagnostics) {
  const states = recipe?.states ?? catalogEntry?.variants ?? catalogEntry?.stateVariants ?? [];
  const fallback = recipe?.defaultState ?? states[0] ?? requestedState ?? null;
  if (!requestedState || states.length === 0 || states.includes(requestedState)) return requestedState ?? fallback;
  diagnostics.record('invalid-state', { bundleId, state: requestedState, fallbackState: fallback });
  return fallback;
}

async function loadAuthored(loader, path, context) {
  if (typeof loader === 'function') return loader(path, context);
  if (typeof loader?.loadAsync === 'function') return loader.loadAsync(path, context);
  if (typeof loader?.load === 'function') return loader.load(path, context);
  throw new TypeError('Authored asset loader must be a function or expose loadAsync/load.');
}

function defaultClone(asset) {
  return typeof asset?.clone === 'function' ? asset.clone(true) : asset;
}

function defaultDispose(asset) {
  if (!asset?.traverse) return;
  asset.traverse((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) value?.isTexture && value.dispose?.();
      material.dispose?.();
    }
  });
}

export class AssetResolver {
  constructor({
    catalog = [],
    registry = new AssetPackRegistry(),
    authoredLoader = null,
    legacyFactory = null,
    diagnosticFactory = createDiagnosticAsset,
    diagnostics = new AssetResolutionDiagnostics(),
    cloneAsset = defaultClone,
    disposeAsset = defaultDispose
  } = {}) {
    this.catalog = catalogToMap(catalog);
    this.registry = registry;
    this.authoredLoader = authoredLoader;
    this.legacyFactory = legacyFactory;
    this.diagnosticFactory = diagnosticFactory;
    this.diagnostics = diagnostics;
    this.cloneAsset = cloneAsset;
    this.disposeAsset = disposeAsset;
    this._authoredPromises = new Map();
    this._authoredFailures = new Set();
  }

  setCatalog(catalog) {
    this.catalog = catalogToMap(catalog);
    return this;
  }

  registerPack(pack, options) {
    return this.registry.register(pack, options);
  }

  async resolve(bundleId, context = {}) {
    if (typeof bundleId !== 'string' || !bundleId) throw new TypeError('bundleId must be a non-empty string.');
    const catalogEntry = this.catalog.get(bundleId) ?? null;
    const pack = this.registry.getPackFor(bundleId);
    const recipe = pack && typeof pack.getRecipe === 'function' ? pack.getRecipe(bundleId) : null;
    const state = validateState(bundleId, context.state, recipe, catalogEntry, this.diagnostics);
    const resolvedContext = { ...context, state, recipe, catalogEntry };

    const authoredPath = catalogEntry?.authored?.model;
    if (authoredPath && this.authoredLoader && (!this._authoredFailures.has(authoredPath) || context.retryAuthored)) {
      try {
        const template = await this._loadAuthoredCached(authoredPath, resolvedContext, context.retryAuthored);
        const authored = this.cloneAsset(template, resolvedContext);
        applyPlacement(authored, recipe?.placement ?? context.placement);
        return attachMetadata(authored, { bundleId, state, source: 'authored', path: authoredPath, packId: null });
      } catch (error) {
        this._authoredFailures.add(authoredPath);
        this.diagnostics.record('authored-load-failed', { bundleId, path: authoredPath, message: error?.message ?? String(error) });
      }
    }

    if (pack) {
      try {
        const procedural = await pack.create(bundleId, resolvedContext);
        if (procedural) {
          applyPlacement(procedural, recipe?.placement ?? context.placement);
          return attachMetadata(procedural, { bundleId, state, source: 'procedural', packId: pack.id });
        }
        this.diagnostics.record('procedural-empty', { bundleId, packId: pack.id });
      } catch (error) {
        this.diagnostics.record('procedural-create-failed', { bundleId, packId: pack.id, message: error?.message ?? String(error) });
      }
    }

    try {
      const legacy = await callLegacy(this.legacyFactory, bundleId, resolvedContext);
      if (legacy) return attachMetadata(legacy, { bundleId, state, source: 'legacy', packId: null });
    } catch (error) {
      this.diagnostics.record('legacy-create-failed', { bundleId, message: error?.message ?? String(error) });
    }

    this.diagnostics.record('missing-asset', { bundleId, state });
    const diagnostic = await this.diagnosticFactory(bundleId, resolvedContext);
    return attachMetadata(diagnostic, { bundleId, state, source: 'diagnostic', packId: null, missing: true });
  }

  async preload(bundleIds, context = {}) {
    return Promise.all(bundleIds.map((bundleId) => this.resolve(bundleId, context)));
  }

  animate(asset, elapsedSeconds, deltaSeconds) {
    const packId = asset?.userData?.assetResolution?.packId;
    const pack = packId ? this.registry.getPack(packId) : null;
    pack?.animate?.(asset, elapsedSeconds, deltaSeconds);
  }

  dispose(asset) {
    const packId = asset?.userData?.assetResolution?.packId;
    const pack = packId ? this.registry.getPack(packId) : null;
    if (pack?.dispose) pack.dispose(asset);
    else this.disposeAsset(asset);
  }

  clearCaches({ failures = true } = {}) {
    this._authoredPromises.clear();
    if (failures) this._authoredFailures.clear();
  }

  _loadAuthoredCached(path, context, retry) {
    if (retry) this._authoredPromises.delete(path);
    if (!this._authoredPromises.has(path)) {
      const promise = Promise.resolve(loadAuthored(this.authoredLoader, path, context));
      this._authoredPromises.set(path, promise);
    }
    return this._authoredPromises.get(path);
  }
}
