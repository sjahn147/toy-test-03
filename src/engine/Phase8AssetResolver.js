import { THREE } from './ThreeScene.js';
import { createCommonDungeonArchitectureAssetPack } from './CommonDungeonArchitectureAssetPack.js';
import { createFungalGardenAssetPack } from './FungalGardenAssetPack.js';
import { FungalGardenAssetAnimator } from './FungalGardenAssetAnimator.js';
import { SpiderColonyAssetPack } from './SpiderColonyAssetPack.js';
import { createFloodedStorehouseAssetPack } from './FloodedStorehouseAssetPack.js';
import { createLaboratoryAssetPack } from './LaboratoryAssetPack.js';
import { LaboratoryAssetAnimator } from './LaboratoryAssetAnimator.js';
import { createRoyalSanctumAssetPack } from './RoyalSanctumAssetPack.js';
import { RoyalSanctumAssetAnimator } from './RoyalSanctumAssetAnimator.js';
import { createOldLanternAssetPack } from './OldLanternAssetPack.js';
import { installOldLanternRuntimeBridge } from '../sim/OldLanternRuntimeBridge.js';

installOldLanternRuntimeBridge();

export class Phase8AssetResolver {
  constructor({ diagnosticFallback = true } = {}) {
    this.diagnosticFallback = diagnosticFallback;
    this.packs = [];
    this.animators = new WeakMap();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(createCommonDungeonArchitectureAssetPack(), { priority: 10 });
    this.register(createFungalGardenAssetPack(), {
      priority: 100,
      prepare: root => new FungalGardenAssetAnimator(root),
      animate: (animator, deltaSeconds) => animator.update(deltaSeconds)
    });
    this.register(new SpiderColonyAssetPack(), {
      priority: 100,
      animate: (pack, root, _deltaSeconds, elapsedSeconds) => pack.update(root, elapsedSeconds)
    });
    this.register(createFloodedStorehouseAssetPack(), {
      priority: 100,
      animate: (pack, root, deltaSeconds, elapsedSeconds) => pack.animate?.(root, elapsedSeconds, deltaSeconds)
    });
    this.register(createLaboratoryAssetPack(), {
      priority: 100,
      prepare: root => new LaboratoryAssetAnimator(root),
      animate: (animator, deltaSeconds) => animator.update(deltaSeconds)
    });
    this.register(createRoyalSanctumAssetPack(), {
      priority: 100,
      prepare: root => new RoyalSanctumAssetAnimator(root),
      animate: (animator, deltaSeconds) => animator.update(deltaSeconds)
    });
    this.register(createOldLanternAssetPack(), {
      priority: 120,
      animate: (pack, root, _deltaSeconds, elapsedSeconds) => pack.animate?.(root, elapsedSeconds)
    });
  }

  register(pack, options = {}) {
    if (!pack || typeof pack.canCreate !== 'function' || typeof pack.create !== 'function') throw new Error('Asset pack must expose canCreate() and create()');
    this.packs.push({ pack, priority: options.priority ?? 0, prepare: options.prepare ?? null, animate: options.animate ?? null });
    this.packs.sort((a, b) => b.priority - a.priority);
    return this;
  }

  resolve(assetId, context = {}) {
    for (const entry of this.packs) {
      if (!entry.pack.canCreate(assetId, context)) continue;
      const root = entry.pack.create(assetId, context);
      if (!root) continue;
      root.userData ??= {};
      root.userData.assetId ??= assetId;
      root.userData.assetPackId = entry.pack.id ?? entry.pack.constructor?.name ?? 'anonymous-pack';
      const animator = entry.prepare ? entry.prepare(root) : entry.pack;
      if (entry.animate) this.animators.set(root, { entry, animator });
      return root;
    }
    return this.diagnosticFallback ? diagnosticMarker(assetId) : null;
  }

  getRecipe(assetId) {
    for (const { pack } of this.packs) {
      const recipe = pack.getRecipe?.(assetId);
      if (recipe) return recipe;
    }
    return null;
  }

  animate(root, elapsedSeconds, deltaSeconds) {
    const state = this.animators.get(root);
    if (!state) return;
    const { entry, animator } = state;
    if (entry.prepare) entry.animate(animator, deltaSeconds, elapsedSeconds, root);
    else entry.animate(entry.pack, root, deltaSeconds, elapsedSeconds);
  }

  release(root) {
    this.animators.delete(root);
  }
}

function diagnosticMarker(assetId) {
  const root = new THREE.Group();
  root.name = `missing-asset:${assetId}`;
  root.userData.assetId = assetId;
  root.userData.diagnostic = true;
  const material = new THREE.MeshBasicMaterial({ color: 0xff3ea5, wireframe: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material);
  body.position.y = 0.65;
  root.add(body);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 4), material.clone());
  crown.position.y = 1.65;
  root.add(crown);
  return root;
}
