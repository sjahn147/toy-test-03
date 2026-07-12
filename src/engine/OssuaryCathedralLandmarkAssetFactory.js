import { getOssuaryCathedralLandmarkRecipe } from './OssuaryCathedralLandmarkRecipes.js';
import { buildBoneCloister } from './OssuaryBoneCloisterDiorama.js';
import { buildFuneralChapel } from './OssuaryFuneralChapelDiorama.js';
import { buildOssuaryShelves } from './OssuaryShelvesDiorama.js';
import { buildNamelessTomb } from './OssuaryNamelessTombDiorama.js';
import { buildWellOfLastNames } from './OssuaryWellOfLastNamesDiorama.js';

const BUILDERS = Object.freeze({
  'ossuary.cloister.bone': buildBoneCloister,
  'ossuary.chapel.funeral': buildFuneralChapel,
  'ossuary.shelves.working': buildOssuaryShelves,
  'ossuary.tomb.nameless': buildNamelessTomb,
  'ossuary.well.last-names': buildWellOfLastNames
});

export class OssuaryCathedralLandmarkAssetFactory {
  canCreate(bundleId) { return Boolean(getOssuaryCathedralLandmarkRecipe(bundleId)); }

  create(bundleId, context = {}) {
    const recipe = getOssuaryCathedralLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    const root = BUILDERS[bundleId]?.(state);
    if (!root) return null;
    root.name = `campaign-landmark:${bundleId}`;
    root.userData = {
      bundleId,
      roomId: recipe.roomId,
      state,
      sockets: [...recipe.sockets],
      systems: [...recipe.systems],
      storyNode: recipe.storyNode,
      traversal: recipe.traversal,
      detailBudget: recipe.detailBudget,
      triangleBudget: recipe.triangleBudget,
      animationProfile: 'ossuary-cathedral'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
