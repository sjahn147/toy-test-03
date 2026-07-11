import { getSpiderColonyLandmarkRecipe } from './SpiderColonyLandmarkRecipes.js';
import { buildSilkRamp } from './SpiderSilkRampDiorama.js';
import { buildVerticalWell } from './SpiderVerticalWellDiorama.js';
import { buildQueenNest } from './SpiderQueenNestDiorama.js';

export class SpiderColonyLandmarkAssetFactory {
  canCreate(bundleId) {
    return Boolean(getSpiderColonyLandmarkRecipe(bundleId));
  }

  create(bundleId, context = {}) {
    const recipe = getSpiderColonyLandmarkRecipe(bundleId);
    if (!recipe) return null;

    const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    const root = bundleId === 'spider.ramp.silk'
      ? buildSilkRamp(state)
      : bundleId === 'spider.well.vertical'
        ? buildVerticalWell(state)
        : buildQueenNest(state);

    root.name = `campaign-landmark:${bundleId}`;
    root.userData = {
      bundleId,
      roomId: recipe.roomId,
      state,
      sockets: [...recipe.sockets],
      detailBudget: recipe.detailBudget,
      triangleBudget: recipe.triangleBudget,
      animationProfile: 'spider-colony-organic'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
