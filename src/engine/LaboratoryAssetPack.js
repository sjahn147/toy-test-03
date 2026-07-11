import { LaboratoryLandmarkAssetFactory } from './LaboratoryLandmarkAssetFactory.js';
import {
  LABORATORY_BUNDLE_IDS,
  getLaboratoryLandmarkRecipe,
  listLaboratoryLandmarkRecipes
} from './LaboratoryLandmarkRecipes.js';

export const LABORATORY_ASSET_PACK_ID = 'campaign.laboratory';

export function createLaboratoryAssetPack() {
  const factory = new LaboratoryLandmarkAssetFactory();
  const ids = new Set(LABORATORY_BUNDLE_IDS);
  return Object.freeze({
    id: LABORATORY_ASSET_PACK_ID,
    bundleIds: LABORATORY_BUNDLE_IDS,
    canCreate: id => ids.has(id),
    create: (id, context) => factory.create(id, context),
    getRecipe: getLaboratoryLandmarkRecipe,
    listRecipes: listLaboratoryLandmarkRecipes
  });
}
