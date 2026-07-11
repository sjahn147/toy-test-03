import { CAMPAIGN_COMPLETION_BUNDLE_IDS, getCampaignCompletionRecipe, listCampaignCompletionRecipes } from './CampaignCompletionLandmarkRecipes.js';
import { createCampaignCompletionDiorama, animateCampaignCompletion } from './CampaignCompletionDioramas.js';

export const CAMPAIGN_COMPLETION_ASSET_PACK_ID = 'campaign.sleeping-citadel.completion';

export function createCampaignCompletionAssetPack() {
  const bundleIds = new Set(CAMPAIGN_COMPLETION_BUNDLE_IDS);
  return Object.freeze({
    id: CAMPAIGN_COMPLETION_ASSET_PACK_ID,
    bundleIds: CAMPAIGN_COMPLETION_BUNDLE_IDS,
    canCreate: id => bundleIds.has(id),
    create: (id, context = {}) => createCampaignCompletionDiorama(id, context),
    animate: (root, elapsedSeconds) => animateCampaignCompletion(root, elapsedSeconds),
    getRecipe: getCampaignCompletionRecipe,
    listRecipes: listCampaignCompletionRecipes
  });
}
