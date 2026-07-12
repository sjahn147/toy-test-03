// Zone A — Gate & Waystation hero landmark recipes.
// PURE DATA. No THREE import (the smoke test loads this module in Node).
export const WAYSTATION_LANDMARK_RECIPES = Object.freeze({
  'waystation.plaza.core': Object.freeze({
    id: 'waystation.plaza.core',
    roomId: 'A01',
    factory: 'waystation-lantern-plaza',
    defaultState: 'operational',
    states: Object.freeze(['operational', 'refugee-crowded', 'expedition-suspended']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.86 }),
    footprint: Object.freeze({ width: 19.4, depth: 15.4, height: 8.4 }),
    sockets: Object.freeze([
      'goddess-statue',
      'resurrection-circle',
      'communal-fountain',
      'queue-rope-line',
      'wagon-baggage',
      'brass-lantern-ring'
    ]),
    detailBudget: 'hero',
    triangleBudget: 61000
  }),
  'waystation.registry.office': Object.freeze({
    id: 'waystation.registry.office',
    roomId: 'A02',
    factory: 'waystation-expedition-registry',
    defaultState: 'operational',
    states: Object.freeze(['operational', 'memorial', 'inn-recruitment-office']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 12.4, depth: 9.4, height: 6.2 }),
    sockets: Object.freeze([
      'registrar-desk',
      'wall-campaign-map',
      'contract-board',
      'roster-shelf',
      'baggage-scale',
      'recruitment-standards'
    ]),
    detailBudget: 'hero',
    triangleBudget: 47000
  }),
  'gate.citadel.outer': Object.freeze({
    id: 'gate.citadel.outer',
    roomId: 'A03',
    factory: 'waystation-sealed-gate',
    defaultState: 'managed',
    states: Object.freeze(['managed', 'pressured', 'supply-gateway']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.84 }),
    footprint: Object.freeze({ width: 17.2, depth: 10.4, height: 11.4 }),
    sockets: Object.freeze([
      'triple-stone-arch',
      'iron-crossbar',
      'rune-seal-ring',
      'guard-post',
      'repair-winch',
      'customs-ramp'
    ]),
    detailBudget: 'hero',
    triangleBudget: 68000
  }),
  'waystation.baggage.store': Object.freeze({
    id: 'waystation.baggage.store',
    roomId: 'A04',
    factory: 'waystation-baggage-vault',
    defaultState: 'ordered',
    states: Object.freeze(['ordered', 'overfilled', 'raided']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 13.4, depth: 10.4, height: 6.6 }),
    sockets: Object.freeze([
      'numbered-crate-stacks',
      'weapon-rack',
      'ration-sacks',
      'repair-bench',
      'lost-found-shelf',
      'bedroll-row'
    ]),
    detailBudget: 'hero',
    triangleBudget: 49000
  }),
  'stairs.citadel.descent': Object.freeze({
    id: 'stairs.citadel.descent',
    roomId: 'A05',
    factory: 'waystation-descent-stairs',
    defaultState: 'lit',
    states: Object.freeze(['lit', 'darkened', 'fortified']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
    footprint: Object.freeze({ width: 11.4, depth: 17.2, height: 10.4 }),
    sockets: Object.freeze([
      'descending-stairway',
      'forty-lamp-array',
      'safety-railing',
      'fall-guard-chain',
      'warning-stele',
      'landing-platform'
    ]),
    detailBudget: 'hero',
    triangleBudget: 55000
  })
});

export function getWaystationLandmarkRecipe(bundleId) {
  return WAYSTATION_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listWaystationLandmarkRecipes() {
  return Object.values(WAYSTATION_LANDMARK_RECIPES);
}
