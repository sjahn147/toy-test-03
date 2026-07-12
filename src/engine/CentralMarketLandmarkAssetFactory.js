import { getCentralMarketLandmarkRecipe } from './CentralMarketLandmarkRecipes.js';
import { buildGrandCrossroadsDiorama } from './GrandCrossroadsDiorama.js';
import { buildDeadCustomsHouseDiorama } from './DeadCustomsHouseDiorama.js';
import { buildRuinedAuctionHallDiorama } from './RuinedAuctionHallDiorama.js';
import { buildNeutralWellDiorama } from './NeutralWellDiorama.js';
import { buildSmugglersWayDiorama } from './SmugglersWayDiorama.js';

const BUILDERS = Object.freeze({
  'market.crossroads.grand': buildGrandCrossroadsDiorama,
  'market.customs.dead': buildDeadCustomsHouseDiorama,
  'market.auction.ruined': buildRuinedAuctionHallDiorama,
  'market.well.neutral': buildNeutralWellDiorama,
  'market.smuggler.way': buildSmugglersWayDiorama
});

export class CentralMarketLandmarkAssetFactory {
  canCreate(bundleId) {
    return Boolean(getCentralMarketLandmarkRecipe(bundleId));
  }

  create(bundleId, context = {}) {
    const recipe = getCentralMarketLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    const build = BUILDERS[bundleId];
    if (!build) throw new Error(`Central Market recipe ${bundleId} has no builder`);
    const root = build(recipe, state, context);
    if (!root) throw new Error(`Central Market builder ${bundleId} returned no root`);

    root.name = `campaign-landmark:${bundleId}`;
    root.userData = {
      ...root.userData,
      bundleId,
      roomId: recipe.roomId,
      state,
      sockets: recipe.semanticSockets.map(socket => socket.id),
      storyProps: [...recipe.storyProps],
      reservedLanes: recipe.reservedLanes.map(lane => ({ ...lane })),
      detailBudget: recipe.detailBudget,
      triangleBudget: recipe.triangleBudget,
      animationProfile: 'central-market-lived-in'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
