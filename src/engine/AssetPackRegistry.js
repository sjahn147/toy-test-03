function assertPack(pack) {
  if (!pack || typeof pack !== 'object') throw new TypeError('Asset pack must be an object.');
  if (typeof pack.id !== 'string' || !pack.id.trim()) throw new TypeError('Asset pack id must be a non-empty string.');
  if (typeof pack.create !== 'function') throw new TypeError(`Asset pack ${pack.id} must expose create(bundleId, context).`);
}

function enumerateBundleIds(pack) {
  if (Array.isArray(pack.bundleIds)) return [...new Set(pack.bundleIds)];
  if (typeof pack.listRecipes === 'function') {
    return [...new Set(pack.listRecipes().map((recipe) => recipe?.id).filter(Boolean))];
  }
  throw new TypeError(`Asset pack ${pack.id} must expose bundleIds or listRecipes().`);
}

export class AssetPackRegistry {
  constructor(packs = []) {
    this._packs = new Map();
    this._bundleOwners = new Map();
    for (const pack of packs) this.register(pack);
  }

  register(pack, { replace = false } = {}) {
    assertPack(pack);
    const bundleIds = enumerateBundleIds(pack);
    if (bundleIds.length === 0) throw new TypeError(`Asset pack ${pack.id} does not declare any bundle ids.`);

    if (this._packs.has(pack.id) && !replace) {
      throw new Error(`Asset pack already registered: ${pack.id}`);
    }

    for (const bundleId of bundleIds) {
      const owner = this._bundleOwners.get(bundleId);
      if (owner && owner !== pack.id && !replace) {
        throw new Error(`Bundle id ${bundleId} is already owned by asset pack ${owner}.`);
      }
    }

    if (replace && this._packs.has(pack.id)) this.unregister(pack.id);

    this._packs.set(pack.id, pack);
    for (const bundleId of bundleIds) this._bundleOwners.set(bundleId, pack.id);
    return pack;
  }

  unregister(packId) {
    const pack = this._packs.get(packId);
    if (!pack) return false;
    for (const [bundleId, owner] of this._bundleOwners) {
      if (owner === packId) this._bundleOwners.delete(bundleId);
    }
    this._packs.delete(packId);
    return true;
  }

  getPack(packId) {
    return this._packs.get(packId) ?? null;
  }

  getPackFor(bundleId) {
    const packId = this._bundleOwners.get(bundleId);
    return packId ? this._packs.get(packId) ?? null : null;
  }

  getRecipe(bundleId) {
    const pack = this.getPackFor(bundleId);
    return pack && typeof pack.getRecipe === 'function' ? pack.getRecipe(bundleId) : null;
  }

  has(bundleId) {
    return this._bundleOwners.has(bundleId);
  }

  listPacks() {
    return [...this._packs.values()];
  }

  listBundleIds() {
    return [...this._bundleOwners.keys()];
  }
}
