import { getFloodedStorehouseLandmarkRecipe } from './FloodedStorehouseLandmarkRecipes.js';
import { createFloodedReservoirDiorama } from './FloodedReservoirDiorama.js';
import { createFloodedDrainageEngineDiorama } from './FloodedDrainageEngineDiorama.js';
import { createFloodedSluicePassageDiorama } from './FloodedSluicePassageDiorama.js';

const BUILDERS = Object.freeze({
  'shallow-reservoir': createFloodedReservoirDiorama,
  'drainage-engine-hall': createFloodedDrainageEngineDiorama,
  'sluice-passage': createFloodedSluicePassageDiorama
});

export class FloodedStorehouseLandmarkAssetFactory {
  canCreate(bundleId) { return Boolean(getFloodedStorehouseLandmarkRecipe(bundleId)); }
  create(bundleId, context = {}) {
    const recipe = getFloodedStorehouseLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const builder = BUILDERS[recipe.factory];
    if (!builder) return null;
    const root = builder({ ...context, state: context.state ?? context.variant ?? recipe.defaultState, recipe });
    root.userData.bundleId = bundleId; root.userData.roomId = recipe.roomId; root.userData.recipe = recipe;
    root.scale.setScalar(recipe.placement.scale);
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    return root;
  }
}
