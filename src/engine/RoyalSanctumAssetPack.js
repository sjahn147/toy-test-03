import {RoyalSanctumLandmarkAssetFactory} from './RoyalSanctumLandmarkAssetFactory.js';
import {ROYAL_SANCTUM_BUNDLE_IDS,getRoyalSanctumLandmarkRecipe,listRoyalSanctumLandmarkRecipes} from './RoyalSanctumLandmarkRecipes.js';
export const ROYAL_SANCTUM_ASSET_PACK_ID='campaign.royal-sanctum';
export function createRoyalSanctumAssetPack(){
  const factory=new RoyalSanctumLandmarkAssetFactory();
  const ids=new Set(ROYAL_SANCTUM_BUNDLE_IDS);
  return Object.freeze({
    id:ROYAL_SANCTUM_ASSET_PACK_ID,
    bundleIds:ROYAL_SANCTUM_BUNDLE_IDS,
    canCreate:id=>ids.has(id),
    create:(id,context)=>factory.create(id,context),
    getRecipe:getRoyalSanctumLandmarkRecipe,
    listRecipes:listRoyalSanctumLandmarkRecipes
  });
}
