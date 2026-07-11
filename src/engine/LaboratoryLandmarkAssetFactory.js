import { createAlchemical, createVats, createObservatory } from './LaboratoryDioramas.js';
import { getLaboratoryLandmarkRecipe } from './LaboratoryLandmarkRecipes.js';
export class LaboratoryLandmarkAssetFactory {
  create(bundleId, context = {}) {
    const recipe = getLaboratoryLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const state = context.state && recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    const root = bundleId === 'laboratory.alchemical.main'
      ? createAlchemical(state)
      : bundleId === 'laboratory.parasite.vats'
        ? createVats(state)
        : createObservatory(state);
    root.userData = { assetId: bundleId, roomId: recipe.roomId, state, triangleBudget: recipe.triangleBudget };
    return root;
  }
}
