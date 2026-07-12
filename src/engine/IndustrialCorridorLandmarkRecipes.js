function defineRecipe({
  id,
  roomId,
  defaultState,
  states,
  footprint,
  sockets,
  systems,
  storyNode,
  lanes,
  portals,
  triangleBudget
}) {
  return Object.freeze({
    id,
    roomId,
    defaultState,
    states: Object.freeze(states),
    footprint: Object.freeze(footprint),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.88 }),
    sockets: Object.freeze(sockets),
    systems: Object.freeze(systems),
    storyNode,
    traversal: Object.freeze({
      minimumClearWidth: 2.2,
      lanes: Object.freeze(lanes),
      portals: Object.freeze(portals)
    }),
    detailBudget: 'hero',
    triangleBudget
  });
}

export const INDUSTRIAL_CORRIDOR_LANDMARK_RECIPES = Object.freeze({
  'industry.workshop.abandoned': defineRecipe({
    id: 'industry.workshop.abandoned',
    roomId: 'D16',
    defaultState: 'ruined',
    states: ['ruined', 'reactivated', 'exploded'],
    footprint: { width: 15.8, depth: 11.8, height: 8.5 },
    sockets: ['master-lathe', 'repair-bench', 'overhead-hoist', 'tool-cage', 'work-order-wall', 'cart-lane'],
    systems: ['construction', 'repair', 'settlement-worksite'],
    storyNode: 'unfinished-clockwork-bird',
    lanes: [{ axis: 'x', offset: 0, width: 2.4 }],
    portals: ['C14', 'D17', 'D18'],
    triangleBudget: 64000
  }),
  'industry.scrap.iron': defineRecipe({
    id: 'industry.scrap.iron',
    roomId: 'D17',
    defaultState: 'stocked',
    states: ['stocked', 'stripped', 'weaponized'],
    footprint: { width: 13.8, depth: 10.8, height: 8.0 },
    sockets: ['scrap-crane', 'sorting-bins', 'weighbridge', 'kobold-nest', 'salvage-ledger', 'cargo-lane'],
    systems: ['scrap-cargo', 'trade-input', 'hazard'],
    storyNode: 'bell-made-from-helmets',
    lanes: [{ axis: 'z', offset: 0, width: 2.3 }],
    portals: ['D16', 'D19'],
    triangleBudget: 59000
  }),
  'industry.kobold.trapworks': defineRecipe({
    id: 'industry.kobold.trapworks',
    roomId: 'D18',
    defaultState: 'active',
    states: ['active', 'allied', 'destroyed'],
    footprint: { width: 16.8, depth: 12.8, height: 9.0 },
    sockets: ['trap-carousel', 'test-corridor', 'spring-rack', 'signal-board', 'clutch-shrine', 'safe-passage-lane'],
    systems: ['trap-construction', 'diplomacy', 'route-fortification'],
    storyNode: 'first-safe-trap',
    lanes: [{ axis: 'x', offset: 0, width: 2.6 }, { axis: 'z', offset: -3.2, width: 2.2 }],
    portals: ['D16', 'D19', 'D20'],
    triangleBudget: 72000
  }),
  'industry.powder.magazine': defineRecipe({
    id: 'industry.powder.magazine',
    roomId: 'D20',
    defaultState: 'sealed',
    states: ['sealed', 'looted', 'detonated'],
    footprint: { width: 12.8, depth: 10.8, height: 8.2 },
    sockets: ['powder-vault', 'blast-baffle', 'humidity-gauge', 'fuse-locker', 'breach-wall', 'evacuation-lane'],
    systems: ['siege-resource', 'fire-risk', 'conditional-route'],
    storyNode: 'names-on-the-blast-door',
    lanes: [{ axis: 'z', offset: 0, width: 2.4 }],
    portals: ['D18', 'J48-conditional'],
    triangleBudget: 54000
  })
});

export const getIndustrialCorridorLandmarkRecipe = id => INDUSTRIAL_CORRIDOR_LANDMARK_RECIPES[id] ?? null;
export const listIndustrialCorridorLandmarkRecipes = () => Object.values(INDUSTRIAL_CORRIDOR_LANDMARK_RECIPES);
