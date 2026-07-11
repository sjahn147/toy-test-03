import { FloodedStorehouseLandmarkAssetFactory } from './FloodedStorehouseLandmarkAssetFactory.js';
import { FloodedStorehouseAssetAnimator } from './FloodedStorehouseAssetAnimator.js';
import { FLOODED_STOREHOUSE_BUNDLE_IDS, getFloodedStorehouseLandmarkRecipe, listFloodedStorehouseLandmarkRecipes } from './FloodedStorehouseLandmarkRecipes.js';

export const FLOODED_STOREHOUSE_ASSET_PACK_ID = 'campaign.flooded-storehouse';

export function createFloodedStorehouseAssetPack() {
  const factory = new FloodedStorehouseLandmarkAssetFactory();
  const animator = new FloodedStorehouseAssetAnimator();
  const ids = new Set(FLOODED_STOREHOUSE_BUNDLE_IDS);
  return Object.freeze({
    id: FLOODED_STOREHOUSE_ASSET_PACK_ID,
    bundleIds: FLOODED_STOREHOUSE_BUNDLE_IDS,
    canCreate(bundleId) { return ids.has(bundleId); },
    create(bundleId, context = {}) { return factory.create(bundleId, context); },
    animate(root, elapsedSeconds, deltaSeconds) { animator.update(root, elapsedSeconds, deltaSeconds); },
    getRecipe: getFloodedStorehouseLandmarkRecipe,
    listRecipes: listFloodedStorehouseLandmarkRecipes
  });
}
