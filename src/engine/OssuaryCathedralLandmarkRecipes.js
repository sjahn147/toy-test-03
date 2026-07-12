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
    states: ['silent', 'undead-held', 'reconsecrated'], footprint: { width: 16.8, depth: 12.8, height: 9.6 },
    sockets: ['bone-arcade', 'patrol-turnstile', 'corpse-tithe-desk', 'finger-tag-rack', 'cloister-bell', 'survivor-lane'],
    systems: ['undead-patrol', 'corpse-collection', 'holy-conflict', 'defense'],
    storyNode: 'visitor-policy-for-the-living', lanes: [{ axis: 'x', offset: 0, width: 2.4 }],
    portals: ['B10', 'E22', 'E23'], triangleBudget: 68000
  }),
  'ossuary.chapel.funeral': defineRecipe({
    id: 'ossuary.chapel.funeral', roomId: 'E22', defaultState: 'dormant',
    states: ['dormant', 'choir-active', 'purified'], footprint: { width: 15.8, depth: 11.8, height: 10.2 },
    sockets: ['rib-organ', 'jawbone-choir', 'mortuary-pews', 'corpse-intake-desk', 'resurrection-ledger', 'chapel-aisle'],
    systems: ['death-energy', 'undead-settlement', 'terror', 'resurrection-research'],
    storyNode: 'overdue-death-fees', lanes: [{ axis: 'z', offset: 0, width: 2.5 }],
    portals: ['E21', 'E24'], triangleBudget: 72000
  }),
  'ossuary.shelves.working': defineRecipe({
    id: 'ossuary.shelves.working', roomId: 'E23', defaultState: 'ordered',
    states: ['ordered', 'spawning', 'collapsed'], footprint: { width: 17.8, depth: 12.8, height: 9.4 },
    sockets: ['ossuary-shelves', 'bone-sorting-crane', 'skeleton-assembly-bench', 'misfiled-person-bin', 'femur-return-slot', 'cart-lane'],
    systems: ['skeleton-spawn', 'bone-cargo', 'corpse-conversion', 'industrial-hazard'],
    storyNode: 'misfiled-person-bin', lanes: [{ axis: 'x', offset: 0, width: 2.6 }],
    portals: ['E21', 'E24', 'E25'], triangleBudget: 75000
  }),
  'ossuary.tomb.nameless': defineRecipe({
    id: 'ossuary.tomb.nameless', roomId: 'E24', defaultState: 'sealed',
    states: ['sealed', 'opened', 'haunted'], footprint: { width: 13.8, depth: 11.8, height: 9.2 },
    sockets: ['nameless-sarcophagus', 'wraith-anchor', 'blank-epitaph-wall', 'grave-goods-cage', 'name-auction-chits', 'retreat-lane'],
    systems: ['wraith', 'rare-loot', 'terror', 'sealed-story'],
    storyNode: 'receipt-for-one-stolen-name', lanes: [{ axis: 'z', offset: 0, width: 2.2 }],
    portals: ['E22', 'E23'], triangleBudget: 62000
  }),
  'ossuary.well.last-names': defineRecipe({
    id: 'ossuary.well.last-names', roomId: 'E25', defaultState: 'quiet',
    states: ['quiet', 'overflowing', 'sealed'], footprint: { width: 14.8, depth: 14.8, height: 11.5 },
    sockets: ['last-name-well', 'name-chain-rig', 'wraith-spawn-ring', 'confession-pulley', 'deep-route-seal', 'circular-survivor-lane'],
    systems: ['death-energy', 'wraith-spawn', 'boss-hook', 'deep-route'],
    storyNode: 'names-that-answer-back', lanes: [{ axis: 'ring', offset: 4.4, width: 2.4 }],
    portals: ['E23', 'L56-conditional'], triangleBudget: 74000
  })
});

export const getOssuaryCathedralLandmarkRecipe = id => OSSUARY_CATHEDRAL_LANDMARK_RECIPES[id] ?? null;
export const listOssuaryCathedralLandmarkRecipes = () => Object.values(OSSUARY_CATHEDRAL_LANDMARK_RECIPES);
