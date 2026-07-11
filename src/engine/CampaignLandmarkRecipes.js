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
  }),
  'inn.old-lantern.guest-wing': Object.freeze({
    id: 'inn.old-lantern.guest-wing',
    roomId: 'H38',
    factory: 'old-lantern-guest-wing',
    defaultState: 'collapsed',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }),
    footprint: Object.freeze({ width: 11.8, depth: 8.4, height: 4.6 }),
    sockets: Object.freeze(['linen-service', 'resident-profession', 'guestroom-doors', 'bed-capacity', 'web-infiltration']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.cellar': Object.freeze({
    id: 'inn.old-lantern.cellar',
    roomId: 'H39',
    factory: 'old-lantern-cellar',
    defaultState: 'flooded',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.86 }),
    footprint: Object.freeze({ width: 12.4, depth: 8.8, height: 4.2 }),
    sockets: Object.freeze(['brewery-equipment', 'food-storage', 'smuggling-door', 'rat-warren', 'cooling-channel']),
    detailBudget: 'hero'
  }),
  'inn.old-lantern.secret-office': Object.freeze({
    id: 'inn.old-lantern.secret-office',
    roomId: 'H40',
    factory: 'old-lantern-secret-office',
    defaultState: 'sealed',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.86 }),
    footprint: Object.freeze({ width: 7.8, depth: 6.6, height: 4.0 }),
    sockets: Object.freeze(['route-map-wall', 'ledger-desk', 'hidden-safe', 'weapon-cache', 'surveillance-hole']),
    detailBudget: 'hero'
  }),
  'market.crossroads.grand': Object.freeze({
    id: 'market.crossroads.grand',
    roomId: 'I41',
    factory: 'central-market-crossroads',
    defaultState: 'neutral-ruin',
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }),
    footprint: Object.freeze({ width: 21.4, depth: 16.8, height: 7.8 }),
    sockets: Object.freeze(['central-wayfinder', 'district-mosaic', 'cargo-scale', 'market-notice-board', 'faction-banner']),
    detailBudget: 'hero'
  })
});

export function getCampaignLandmarkRecipe(bundleId) {
  return CAMPAIGN_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listCampaignLandmarkRecipes() {
  return Object.values(CAMPAIGN_LANDMARK_RECIPES);
}
