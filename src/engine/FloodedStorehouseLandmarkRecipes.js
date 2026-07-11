export const FLOODED_STOREHOUSE_LANDMARK_RECIPES = Object.freeze({
  'flooded.reservoir.shallow': Object.freeze({
    id: 'flooded.reservoir.shallow', roomId: 'C11', factory: 'shallow-reservoir', defaultState: 'shallow',
    states: Object.freeze(['shallow', 'drained', 'overflowing']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 16.2, depth: 12.4, height: 4.8 }),
    sockets: Object.freeze(['reservoir-basin', 'sluice-gate', 'water-level-gauge', 'pump-intake', 'stone-walkway', 'drain-grate']),
    detailBudget: 'hero', triangleBudget: 46000
  }),
  'flooded.drainage.engine': Object.freeze({
    id: 'flooded.drainage.engine', roomId: 'C14', factory: 'drainage-engine-hall', defaultState: 'stalled',
    states: Object.freeze(['stalled', 'operational', 'sabotaged']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.9 }),
    footprint: Object.freeze({ width: 16.4, depth: 12.6, height: 8.5 }),
    sockets: Object.freeze(['drainage-waterwheel', 'gear-train', 'pressure-console', 'pump-bank', 'maintenance-catwalk', 'master-valve']),
    detailBudget: 'hero', triangleBudget: 62000
  }),
  'flooded.sluice.passage': Object.freeze({
    id: 'flooded.sluice.passage', roomId: 'C15', factory: 'sluice-passage', defaultState: 'open',
    states: Object.freeze(['open', 'flooded', 'fortified']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.92 }),
    footprint: Object.freeze({ width: 10.4, depth: 18, height: 6.5 }),
    sockets: Object.freeze(['sluice-channel', 'lift-gate', 'cargo-catwalk', 'chain-hoist', 'flood-warning', 'fortification-line']),
    detailBudget: 'hero', triangleBudget: 52000
  })
});

export const FLOODED_STOREHOUSE_BUNDLE_IDS = Object.freeze(Object.keys(FLOODED_STOREHOUSE_LANDMARK_RECIPES));
export function getFloodedStorehouseLandmarkRecipe(bundleId) { return FLOODED_STOREHOUSE_LANDMARK_RECIPES[bundleId] ?? null; }
export function listFloodedStorehouseLandmarkRecipes() { return Object.values(FLOODED_STOREHOUSE_LANDMARK_RECIPES); }
