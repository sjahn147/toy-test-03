function defineRecipe({ id, roomId, defaultState, states, footprint, sockets, systems, storyNode, lanes, portals, triangleBudget }) {
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
    traversal: Object.freeze({ minimumClearWidth: 2.2, lanes: Object.freeze(lanes), portals: Object.freeze(portals) }),
    detailBudget: 'hero',
    triangleBudget
  });
}

export const OSSUARY_CATHEDRAL_LANDMARK_RECIPES = Object.freeze({
  'ossuary.cloister.bone': defineRecipe({
    id: 'ossuary.cloister.bone', roomId: 'E21', defaultState: 'silent',
    states: ['silent', 'undead-held', 'reconsecrated'],
    footprint: { width: 16.8, depth: 12.8, height: 9.2 },
    sockets: ['bone-gate', 'rib-bell', 'grave-guard-post', 'corpse-cart', 'skull-arch', 'processional-lane'],
    systems: ['undead-patrol', 'ambush', 'defensive-control'],
    storyNode: 'laughing-skull-sentinel',
    lanes: [{ axis: 'x', offset: 0, width: 2.5 }],
    portals: ['B10', 'E22', 'E23'], triangleBudget: 68000
  }),
  'ossuary.chapel.funeral': defineRecipe({
    id: 'ossuary.chapel.funeral', roomId: 'E22', defaultState: 'dormant',
    states: ['dormant', 'choir-active', 'purified'],
    footprint: { width: 15.8, depth: 11.8, height: 10.0 },
    sockets: ['demon-altar', 'corpse-choir-stalls', 'soul-organ', 'black-braziers', 'sacrifice-dais', 'chapel-aisle'],
    systems: ['death-energy', 'undead-spawn', 'holy-conflict'],
    storyNode: 'jawless-choirmaster',
    lanes: [{ axis: 'z', offset: 0, width: 2.4 }],
    portals: ['E21', 'E24'], triangleBudget: 72000
  }),
  'ossuary.shelves.working': defineRecipe({
    id: 'ossuary.shelves.working', roomId: 'E23', defaultState: 'ordered',
    states: ['ordered', 'spawning', 'collapsed'],
    footprint: { width: 17.8, depth: 12.8, height: 9.0 },
    sockets: ['bone-racks', 'assembly-tables', 'skull-bins', 'marrow-cauldron', 'skeleton-muster-gate', 'bone-cart-lane'],
    systems: ['skeleton-spawn', 'corpse-conversion', 'bone-cargo'],
    storyNode: 'wrong-legs-skeleton',
    lanes: [{ axis: 'x', offset: 0, width: 2.6 }, { axis: 'z', offset: 4.2, width: 2.2 }],
    portals: ['E21', 'E24', 'E25'], triangleBudget: 74000
  }),
  'ossuary.tomb.nameless': defineRecipe({
    id: 'ossuary.tomb.nameless', roomId: 'E24', defaultState: 'sealed',
    states: ['sealed', 'opened', 'haunted'],
    footprint: { width: 13.8, depth: 11.8, height: 9.6 },
    sockets: ['black-knight-sarcophagus', 'wraith-chain', 'cursed-treasure', 'guardian-gargoyles', 'mourning-statues', 'tomb-escape-lane'],
    systems: ['rare-loot', 'wraith-ambush', 'curse'],
    storyNode: 'knight-who-forgot-his-name',
    lanes: [{ axis: 'z', offset: 0, width: 2.3 }],
    portals: ['E22', 'E23'], triangleBudget: 70000
  }),
  'ossuary.well.last-names': defineRecipe({
    id: 'ossuary.well.last-names', roomId: 'E25', defaultState: 'quiet',
    states: ['quiet', 'overflowing', 'sealed'],
    footprint: { width: 14.8, depth: 14.8, height: 11.0 },
    sockets: ['soul-well', 'demon-obelisks', 'wraith-ring', 'chained-name-stones', 'abyssal-bridge', 'deep-route-gate'],
    systems: ['death-energy', 'wraith-spawn', 'boss-hook'],
    storyNode: 'crooked-herald-of-the-well',
    lanes: [{ axis: 'x', offset: 0, width: 2.4 }],
    portals: ['E23', 'L56-conditional'], triangleBudget: 75000
  })
});

export const getOssuaryCathedralLandmarkRecipe = id => OSSUARY_CATHEDRAL_LANDMARK_RECIPES[id] ?? null;
export const listOssuaryCathedralLandmarkRecipes = () => Object.values(OSSUARY_CATHEDRAL_LANDMARK_RECIPES);
