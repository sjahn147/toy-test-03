export const SPIDER_COLONY_LANDMARK_RECIPES = Object.freeze({
  'spider.ramp.silk': Object.freeze({
    id: 'spider.ramp.silk',
    roomId: 'G31',
    factory: 'spider-silk-ramp',
    defaultState: 'webbed',
    states: Object.freeze(['webbed', 'cleared', 'burning']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.86 }),
    footprint: Object.freeze({ width: 12.8, depth: 18.4, height: 8.8 }),
    sockets: Object.freeze([
      'silk-ramp-structure',
      'sticky-ambush-zone',
      'hanging-cocoon-line',
      'royal-guard-insignia',
      'rope-route'
    ]),
    detailBudget: 'hero',
    triangleBudget: 62000
  }),
  'spider.well.vertical': Object.freeze({
    id: 'spider.well.vertical',
    roomId: 'G34',
    factory: 'spider-vertical-well',
    defaultState: 'web-bridge',
    states: Object.freeze(['web-bridge', 'cleared', 'collapsed']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.84 }),
    footprint: Object.freeze({ width: 14.6, depth: 16.8, height: 13.6 }),
    sockets: Object.freeze([
      'vertical-shaft',
      'silk-bridge-network',
      'rope-elevator',
      'royal-secret-exit',
      'fall-hazard'
    ]),
    detailBudget: 'hero',
    triangleBudget: 70000
  }),
  'spider.nest.queen-empty': Object.freeze({
    id: 'spider.nest.queen-empty',
    roomId: 'G35',
    factory: 'spider-queen-nest',
    defaultState: 'empty',
    states: Object.freeze(['empty', 'queen-awakened', 'captured']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }),
    footprint: Object.freeze({ width: 20.6, depth: 16.8, height: 10.8 }),
    sockets: Object.freeze([
      'queen-exuvia',
      'egg-throne',
      'host-ritual-altar',
      'silk-crown-crest',
      'adventurer-containment'
    ]),
    detailBudget: 'hero',
    triangleBudget: 74000
  })
});

export function getSpiderColonyLandmarkRecipe(bundleId) {
  return SPIDER_COLONY_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listSpiderColonyLandmarkRecipes() {
  return Object.values(SPIDER_COLONY_LANDMARK_RECIPES);
}
