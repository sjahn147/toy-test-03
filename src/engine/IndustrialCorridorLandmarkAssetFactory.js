import { getIndustrialCorridorLandmarkRecipe } from './IndustrialCorridorLandmarkRecipes.js';
import { buildAbandonedWorkshop } from './IndustrialWorkshopDiorama.js';
import { buildIronScrapRoom } from './IndustrialScrapDiorama.js';
import { buildCopperTailTrapworks } from './IndustrialTrapworksDiorama.js';
import { buildPowderMagazine } from './IndustrialMagazineDiorama.js';

const BUILDERS = Object.freeze({
  'industry.workshop.abandoned': buildAbandonedWorkshop,
  'industry.scrap.iron': buildIronScrapRoom,
  'industry.kobold.trapworks': buildCopperTailTrapworks,
  'industry.powder.magazine': buildPowderMagazine
});

export class IndustrialCorridorLandmarkAssetFactory {
  canCreate(bundleId) { return Boolean(getIndustrialCorridorLandmarkRecipe(bundleId)); }

  create(bundleId, context = {}) {
    const recipe = getIndustrialCorridorLandmarkRecipe(bundleId);
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
      animationProfile: 'industrial-corridor'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
