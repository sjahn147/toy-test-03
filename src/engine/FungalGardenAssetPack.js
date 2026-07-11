import { FungalGardenLandmarkAssetFactory } from './FungalGardenLandmarkAssetFactory.js';
import {
  FUNGAL_GARDEN_BUNDLE_IDS,
  getFungalGardenLandmarkRecipe,
  listFungalGardenLandmarkRecipes
} from './FungalGardenLandmarkRecipes.js';

export const FUNGAL_GARDEN_ASSET_PACK_ID = 'campaign.fungal-garden';

export function createFungalGardenAssetPack() {
  const factory = new FungalGardenLandmarkAssetFactory();
  const bundleIds = new Set(FUNGAL_GARDEN_BUNDLE_IDS);
  return Object.freeze({
    id: FUNGAL_GARDEN_ASSET_PACK_ID,
    bundleIds: FUNGAL_GARDEN_BUNDLE_IDS,
    canCreate: bundleId => bundleIds.has(bundleId),
    create: (bundleId, context = {}) => factory.create(bundleId, context),
    getRecipe: getFungalGardenLandmarkRecipe,
    listRecipes: listFungalGardenLandmarkRecipes
  });
}
