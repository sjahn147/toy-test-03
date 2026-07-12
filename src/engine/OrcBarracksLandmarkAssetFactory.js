import { getOrcBarracksLandmarkRecipe } from './OrcBarracksLandmarkRecipes.js';
import { buildOrcDrillYardDiorama } from './OrcDrillYardDiorama.js';
import { buildOrcWarArmoryDiorama } from './OrcWarArmoryDiorama.js';
import { buildOrcMeatStoreDiorama } from './OrcMeatStoreDiorama.js';

const BUILDERS = Object.freeze({
  'orc.drill-yard': buildOrcDrillYardDiorama,
  'orc.armory.war': buildOrcWarArmoryDiorama,
  'orc.store.meat': buildOrcMeatStoreDiorama
});

export class OrcBarracksLandmarkAssetFactory {
  canCreate(bundleId) {
    return Boolean(getOrcBarracksLandmarkRecipe(bundleId));
  }

  create(bundleId, context = {}) {
    const recipe = getOrcBarracksLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    const build = BUILDERS[bundleId];
    if (!build) throw new Error(`Orc Barracks recipe ${bundleId} has no builder`);
    const root = build(recipe, state, context);
    if (!root) throw new Error(`Orc Barracks builder ${bundleId} returned no root`);

    root.name = `campaign-landmark:${bundleId}`;
    root.userData = {
      ...root.userData,
      bundleId,
      roomId: recipe.roomId,
      state,
      sockets: recipe.semanticSockets.map(socket => socket.id),
      storyProps: [...recipe.storyProps],
      reservedLanes: recipe.reservedLanes.map(lane => ({ ...lane })),
      placementZones: recipe.placementZones.map(zone => ({ ...zone })),
      systemConnections: [...recipe.systemConnections],
      detailBudget: recipe.detailBudget,
      triangleBudget: recipe.triangleBudget,
      animationProfile: 'red-tusk-military-life'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
