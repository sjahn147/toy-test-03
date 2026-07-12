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
    // 각 랜드마크 id를 명시적으로 claim (fall-through else 지양 — 스모크가 명시 참조를 요구).
    const builders = {
      'spider.ramp.silk': buildSilkRamp,
      'spider.well.vertical': buildVerticalWell,
      'spider.nest.queen-empty': buildQueenNest
    };
    const build = builders[bundleId];
    if (!build) return null;
    const root = build(state);

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
