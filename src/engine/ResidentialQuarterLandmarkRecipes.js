// Zone B - Abandoned Residential Quarter landmark contracts.
// Pure data: safe to import from Node smoke tests.

const room = ({
  id, roomId, defaultState, states, width, depth, height, sockets,
  systems, storyNode, lanes, portals, triangleBudget
}) => Object.freeze({
  id,
  roomId,
  defaultState,
  states: Object.freeze(states),
  placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
  footprint: Object.freeze({ width, depth, height }),
  sockets: Object.freeze(sockets),
  systems: Object.freeze(systems),
  storyNode,
  traversal: Object.freeze({
    minimumClearWidth: 2.2,
    lanes: Object.freeze(lanes.map(lane => Object.freeze(lane))),
    portals: Object.freeze(portals)
  }),
  detailBudget: 'hero',
  triangleBudget
});

export const RESIDENTIAL_QUARTER_LANDMARK_RECIPES = Object.freeze({
  'residential.dormitory.broken': room({
    id: 'residential.dormitory.broken', roomId: 'B06', defaultState: 'abandoned',
    states: ['abandoned', 'field-camp', 'burned'], width: 15.8, depth: 11.6, height: 8.8,
    sockets: ['double-bunk-row', 'salvage-lockers', 'central-traversal-aisle', 'ceiling-collapse', 'child-map-mural', 'camp-hearth'],
    systems: ['settlement-capacity', 'salvage-materials', 'rat-habitat'], storyNode: 'child-map-mural',
    lanes: [{ axis: 'z', offset: 0, width: 2.4 }, { axis: 'x', offset: 0.4, width: 2.2 }],
    portals: ['A05', 'B07', 'B09'], triangleBudget: 61000
  }),
  'residential.kitchen.communal': room({
    id: 'residential.kitchen.communal', roomId: 'B07', defaultState: 'cold',
    states: ['cold', 'working', 'infested'], width: 13.8, depth: 10.8, height: 7.2,
    sockets: ['communal-range', 'prep-island', 'drying-rack', 'food-locker', 'service-hatch', 'smoke-flue'],
    systems: ['food-production', 'settlement-support', 'ecology-attraction'], storyNode: 'last-supper-place-setting',
    lanes: [{ axis: 'x', offset: 0, width: 2.4 }, { axis: 'z', offset: 2.7, width: 2.2 }],
    portals: ['B06', 'B08', 'B10'], triangleBudget: 56000
  }),
  'residential.laundry.cistern': room({
    id: 'residential.laundry.cistern', roomId: 'B08', defaultState: 'clear',
    states: ['clear', 'camped', 'fungal-contaminated'], width: 14.6, depth: 10.8, height: 7.8,
    sockets: ['wash-basin', 'hot-water-cistern', 'raised-dry-walkway', 'sluice-valve', 'laundry-lines', 'smuggler-drain'],
    systems: ['water-supply', 'condition-recovery', 'secret-route', 'fungal-contamination'], storyNode: 'smuggler-route-scratch',
    lanes: [{ axis: 'z', offset: 0, width: 2.6 }, { axis: 'x', offset: -2.8, width: 2.2 }],
    portals: ['B07', 'B09', 'C11', 'H37-secret'], triangleBudget: 60000
  }),
  'residential.tenement.court': room({
    id: 'residential.tenement.court', roomId: 'B09', defaultState: 'empty',
    states: ['empty', 'occupied', 'barricaded'], width: 17.8, depth: 13.8, height: 10.4,
    sockets: ['dead-courtyard-tree', 'tenement-balcony', 'common-well', 'market-bays', 'cross-traversal-lane', 'defense-barricade'],
    systems: ['territory-control', 'settlement-core', 'market-candidate', 'large-combat'], storyNode: 'tenant-key-mosaic',
    lanes: [{ axis: 'x', offset: 0, width: 2.8 }, { axis: 'z', offset: 0, width: 2.8 }],
    portals: ['B06', 'B08', 'B10'], triangleBudget: 72000
  }),
  'residential.chapel.household': room({
    id: 'residential.chapel.household', roomId: 'B10', defaultState: 'dormant',
    states: ['dormant', 'reconsecrated', 'defiled'], width: 11.8, depth: 9.8, height: 8.6,
    sockets: ['household-altar', 'prayer-benches', 'holy-water-font', 'family-icon-wall', 'ossuary-threshold', 'hidden-prayer-scroll'],
    systems: ['sanctuary-recovery', 'undead-border', 'campaign-story'], storyNode: 'hidden-prayer-scroll',
    lanes: [{ axis: 'z', offset: 0, width: 2.2 }],
    portals: ['B07', 'B09', 'E21', 'H38'], triangleBudget: 52000
  })
});

export const RESIDENTIAL_QUARTER_BUNDLE_IDS = Object.freeze(Object.keys(RESIDENTIAL_QUARTER_LANDMARK_RECIPES));
export const getResidentialQuarterLandmarkRecipe = id => RESIDENTIAL_QUARTER_LANDMARK_RECIPES[id] ?? null;
export const listResidentialQuarterLandmarkRecipes = () => Object.values(RESIDENTIAL_QUARTER_LANDMARK_RECIPES);
