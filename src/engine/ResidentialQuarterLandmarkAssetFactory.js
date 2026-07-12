import { getResidentialQuarterLandmarkRecipe } from './ResidentialQuarterLandmarkRecipes.js';
import { buildBrokenDormitory } from './ResidentialDormitoryDiorama.js';
import { buildCommunalKitchen } from './ResidentialKitchenDiorama.js';
import { buildLaundryCistern } from './ResidentialLaundryDiorama.js';
import { buildTenementCourt } from './ResidentialCourtDiorama.js';
import { buildHouseholdChapel } from './ResidentialChapelDiorama.js';

export class ResidentialQuarterLandmarkAssetFactory {
  canCreate(bundleId){ return Boolean(getResidentialQuarterLandmarkRecipe(bundleId)); }
  create(bundleId, context={}){
    const recipe=getResidentialQuarterLandmarkRecipe(bundleId);
    if(!recipe) return null;
    const state=recipe.states.includes(context.state)?context.state:recipe.defaultState;
    const builders={
      'residential.dormitory.broken':buildBrokenDormitory,
      'residential.kitchen.communal':buildCommunalKitchen,
      'residential.laundry.cistern':buildLaundryCistern,
      'residential.tenement.court':buildTenementCourt,
      'residential.chapel.household':buildHouseholdChapel
    };
    const root=builders[bundleId]?.(state);
    if(!root) return null;
    root.name=`campaign-landmark:${bundleId}`;
    root.userData={bundleId,roomId:recipe.roomId,state,sockets:[...recipe.sockets],systems:[...recipe.systems],storyNode:recipe.storyNode,traversal:recipe.traversal,detailBudget:recipe.detailBudget,triangleBudget:recipe.triangleBudget,animationProfile:'residential-living-quarter'};
    root.position.set(recipe.placement.ox,0,recipe.placement.oz);
    root.rotation.y=recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
