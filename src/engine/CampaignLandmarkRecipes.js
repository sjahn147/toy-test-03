export const CAMPAIGN_LANDMARK_RECIPES = Object.freeze({
  'waystation.plaza.core': Object.freeze({
    id: 'waystation.plaza.core',
    roomId: 'A01',
    factory: 'lantern-plaza',
    placement: Object.freeze({ ox: 0, oz: 0.2, rotation: 0, scale: 0.92 }),
    sockets: Object.freeze(['ritual-flame', 'registry-board', 'water-queue', 'memorial-offerings']),
    detailBudget: 'hero'
  }),
  'gate.citadel.outer': Object.freeze({
    id: 'gate.citadel.outer',
    roomId: 'A03',
    factory: 'sealed-citadel-gate',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.94 }),
    sockets: Object.freeze(['gate-seal', 'winch-left', 'winch-right', 'defense-banner', 'supply-lane']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.common-room': Object.freeze({
    id: 'inn.old-lantern.common-room',
    roomId: 'H36',
    factory: 'old-lantern-common-room',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
    sockets: Object.freeze(['hearth-fire', 'bar-service', 'music-stage', 'faction-banner', 'barricade-front']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.kitchen': Object.freeze({
    id: 'inn.old-lantern.kitchen',
    roomId: 'H37',
    factory: 'blackened-kitchen',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
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
