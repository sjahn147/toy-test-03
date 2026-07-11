export const CAMPAIGN_LANDMARK_RECIPES = Object.freeze({
  'waystation.plaza.core': Object.freeze({
    id: 'waystation.plaza.core',
    roomId: 'A01',
    factory: 'lantern-plaza',
    defaultState: 'operational',
    placement: Object.freeze({ ox: 0, oz: 0.2, rotation: 0, scale: 0.92 }),
    footprint: Object.freeze({ width: 8.4, depth: 7.2, height: 3.4 }),
    sockets: Object.freeze(['ritual-flame', 'registry-board', 'water-queue', 'memorial-offerings']),
    detailBudget: 'hero'
  }),
  'gate.citadel.outer': Object.freeze({
    id: 'gate.citadel.outer',
    roomId: 'A03',
    factory: 'sealed-citadel-gate',
    defaultState: 'managed',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.94 }),
    footprint: Object.freeze({ width: 11.2, depth: 6.8, height: 6.2 }),
    sockets: Object.freeze(['gate-seal', 'winch-left', 'winch-right', 'defense-banner', 'supply-lane']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.common-room': Object.freeze({
    id: 'inn.old-lantern.common-room',
    roomId: 'H36',
    factory: 'old-lantern-common-room',
    defaultState: 'ruined',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
    footprint: Object.freeze({ width: 14.2, depth: 10.8, height: 6.2 }),
    sockets: Object.freeze(['hearth-fire', 'bar-service', 'music-stage', 'faction-banner', 'barricade-front']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.kitchen': Object.freeze({
    id: 'inn.old-lantern.kitchen',
    roomId: 'H37',
    factory: 'blackened-kitchen',
    defaultState: 'blackened',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 10.2, depth: 7.8, height: 5.6 }),
    sockets: Object.freeze(['oven-fire', 'chopping-board', 'wash-basin', 'pantry', 'infestation-overlay']),
    detailBudget: 'hero'
  })
});

export function getCampaignLandmarkRecipe(bundleId) {
  return CAMPAIGN_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listCampaignLandmarkRecipes() {
  return Object.values(CAMPAIGN_LANDMARK_RECIPES);
}
