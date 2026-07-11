export const FUNGAL_GARDEN_LANDMARK_RECIPES = Object.freeze({
  'fungal.spore-field.blue': Object.freeze({
    id: 'fungal.spore-field.blue',
    roomId: 'F26',
    factory: 'blue-spore-field',
    defaultState: 'blooming',
    states: Object.freeze(['blooming', 'harvested', 'burned']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
    footprint: Object.freeze({ width: 17.6, depth: 13.4, height: 5.2 }),
    sockets: Object.freeze([
      'spore-vent',
      'sleep-spore-cloud',
      'mycelial-path',
      'memory-bloom',
      'harvest-station'
    ]),
    detailBudget: 'hero',
    triangleBudget: 42000
  }),
  'fungal.pillars.forest': Object.freeze({
    id: 'fungal.pillars.forest',
    roomId: 'F28',
    factory: 'mushroom-pillar-forest',
    defaultState: 'wild',
    states: Object.freeze(['wild', 'communion', 'blighted']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 19.8, depth: 14.8, height: 11.2 }),
    sockets: Object.freeze([
      'colossal-pillar',
      'mycelial-bridge',
      'spore-lantern',
      'communion-circle',
      'blight-overlay'
    ]),
    detailBudget: 'hero',
    triangleBudget: 56000
  }),
  'fungal.heart.mycelial': Object.freeze({
    id: 'fungal.heart.mycelial',
    roomId: 'F30',
    factory: 'mycelial-heart',
    defaultState: 'stable',
    states: Object.freeze(['stable', 'expanding', 'burned-out']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 15.8, depth: 13.8, height: 8.6 }),
    sockets: Object.freeze([
      'mycelial-core',
      'radial-root',
      'biomass-sac',
      'defense-spore-pod',
      'growth-frontier'
    ]),
    detailBudget: 'hero',
    triangleBudget: 52000
  })
});

export const FUNGAL_GARDEN_BUNDLE_IDS = Object.freeze(
  Object.keys(FUNGAL_GARDEN_LANDMARK_RECIPES)
);

export function getFungalGardenLandmarkRecipe(bundleId) {
  return FUNGAL_GARDEN_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listFungalGardenLandmarkRecipes() {
  return Object.values(FUNGAL_GARDEN_LANDMARK_RECIPES);
}
