import { getWaystationLandmarkRecipe } from './WaystationLandmarkRecipes.js';
import { buildLanternPlaza } from './WaystationPlazaDiorama.js';
import { buildExpeditionRegistry } from './WaystationRegistryDiorama.js';
import { buildSealedGate } from './WaystationGateDiorama.js';
import { buildBaggageVault } from './WaystationBaggageDiorama.js';
import { buildDescentOfLamps } from './WaystationDescentDiorama.js';

export class WaystationLandmarkAssetFactory {
  canCreate(bundleId) {
    return Boolean(getWaystationLandmarkRecipe(bundleId));
  }

  create(bundleId, context = {}) {
    const recipe = getWaystationLandmarkRecipe(bundleId);
    if (!recipe) return null;

    const state = recipe.states.includes(context.state) ? context.state : recipe.defaultState;
    // 각 랜드마크 id를 명시적으로 claim (fall-through else 지양 — 스모크가 명시 참조를 요구).
    const builders = {
      'waystation.plaza.core': buildLanternPlaza,
      'waystation.registry.office': buildExpeditionRegistry,
      'gate.citadel.outer': buildSealedGate,
      'waystation.baggage.store': buildBaggageVault,
      'stairs.citadel.descent': buildDescentOfLamps
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
      animationProfile: 'waystation-gate-civic'
    };
    root.position.set(recipe.placement.ox, 0, recipe.placement.oz);
    root.rotation.y = recipe.placement.rotation;
    root.scale.setScalar(recipe.placement.scale);
    return root;
  }
}
