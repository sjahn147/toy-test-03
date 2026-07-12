const socket = (id, position, tags, options = {}) => Object.freeze({
  id,
  position: Object.freeze(position),
  tags: Object.freeze(tags),
  radius: options.radius ?? 0.8,
  rotation: Object.freeze(options.rotation ?? [0, 0, 0]),
  enabledIn: options.enabledIn ? Object.freeze(options.enabledIn) : null
});

export const CENTRAL_MARKET_LANDMARK_RECIPES = Object.freeze({
  'market.crossroads.grand': Object.freeze({
    id: 'market.crossroads.grand',
    roomId: 'I41',
    factory: 'central-market-grand-crossroads',
    displayName: 'Grand Crossroads',
    defaultState: 'neutral-ruin',
    states: Object.freeze(['neutral-ruin', 'goblin-market', 'adventurer-market', 'orc-checkpoint', 'battlefield']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 22.8, depth: 17.8, height: 7.4 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.north-south', width: 3.2, from: Object.freeze([0, -8.9]), to: Object.freeze([0, 8.9]) }),
      Object.freeze({ id: 'lane.east-west', width: 3.2, from: Object.freeze([-11.4, 0]), to: Object.freeze([11.4, 0]) })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.north', [0, 0, -8.2], ['entry', 'traversal'], { radius: 1.6 }),
      socket('entry.south', [0, 0, 8.2], ['entry', 'traversal'], { radius: 1.6, rotation: [0, Math.PI, 0] }),
      socket('entry.east', [10.6, 0, 0], ['entry', 'traversal'], { radius: 1.6, rotation: [0, -Math.PI / 2, 0] }),
      socket('entry.west', [-10.6, 0, 0], ['entry', 'traversal'], { radius: 1.6, rotation: [0, Math.PI / 2, 0] }),
      socket('staging.center', [0, 0, 0], ['staging', 'meeting'], { radius: 1.8 }),
      socket('staging.guard.north', [-2.1, 0, -6.7], ['staging', 'guard']),
      socket('staging.guard.south', [2.1, 0, 6.7], ['staging', 'guard']),
      socket('staging.rest.west', [-7.4, 0, 4.8], ['staging', 'rest']),
      socket('socket.trade.northwest', [-7.4, 0, -5.1], ['interaction', 'trade']),
      socket('socket.trade.northeast', [7.3, 0, -5.2], ['interaction', 'trade']),
      socket('socket.cargo.southeast', [7.5, 0, 5.4], ['cargo', 'dynamic-placement'], { radius: 1.25 }),
      socket('socket.fire.southwest', [-7.5, 0, 5.4], ['activity', 'fire']),
      socket('placement.dynamic.northwest', [-8.2, 0, -6.4], ['dynamic-placement', 'camp-or-cargo'], { radius: 1.6 }),
      socket('placement.dynamic.southeast', [8.2, 0, 6.4], ['dynamic-placement', 'worksite-or-outpost'], { radius: 1.6 })
    ]),
    storyProps: Object.freeze(['story.market-wayfinder', 'story.guild-route-stone', 'story.overwritten-notice-board']),
    animationChannels: Object.freeze(['sign-creak', 'cloth-sway', 'lantern-sway', 'flame-flicker', 'smoke-rise']),
    detailBudget: 'hero',
    triangleBudget: 72000
  }),

  'market.customs.dead': Object.freeze({
    id: 'market.customs.dead',
    roomId: 'I42',
    factory: 'central-market-dead-customs-house',
    displayName: 'Dead Customs House',
    defaultState: 'abandoned',
    states: Object.freeze(['abandoned', 'tax-office', 'smuggler-held']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 15.2, depth: 12.2, height: 6.8 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.market-service', width: 2.6, from: Object.freeze([0, -6.1]), to: Object.freeze([0, 6.1]) })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.market', [0, 0, -5.6], ['entry', 'traversal'], { radius: 1.4 }),
      socket('entry.service', [0, 0, 5.6], ['entry', 'traversal'], { radius: 1.4, rotation: [0, Math.PI, 0] }),
      socket('staging.inspection', [0, 0, -1.1], ['staging', 'inspection']),
      socket('staging.guard', [-4.7, 0, -3.5], ['staging', 'guard']),
      socket('staging.clerk', [4.2, 0, 1.0], ['staging', 'clerk']),
      socket('socket.trade.counter', [3.2, 0, 0.4], ['interaction', 'trade']),
      socket('socket.inspect.cargo', [-1.9, 0, -0.8], ['interaction', 'cargo-inspection']),
      socket('socket.cargo.seized', [-5.0, 0, 3.2], ['cargo', 'storage'], { radius: 1.2 }),
      socket('socket.document', [4.9, 0, 2.8], ['interaction', 'document']),
      socket('socket.cover.counter', [2.6, 0, -0.4], ['cover']),
      socket('placement.dynamic.storage', [-5.2, 0, 3.5], ['dynamic-placement', 'storage'], { radius: 1.4 }),
      socket('placement.dynamic.guardpost', [5.3, 0, -3.8], ['dynamic-placement', 'guardpost'], { radius: 1.2 })
    ]),
    storyProps: Object.freeze(['story.burned-ledger-chest', 'story.confiscation-seals', 'story.false-duty-table']),
    animationChannels: Object.freeze(['chain-tremble', 'sign-creak', 'lantern-sway', 'flame-flicker']),
    detailBudget: 'hero',
    triangleBudget: 59000
  }),

  'market.auction.ruined': Object.freeze({
    id: 'market.auction.ruined',
    roomId: 'I43',
    factory: 'central-market-ruined-auction-hall',
    displayName: 'Ruined Auction Hall',
    defaultState: 'ruined',
    states: Object.freeze(['ruined', 'auction-active', 'orc-spoils-hall']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 19.2, depth: 14.2, height: 8.0 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.audience-stage', width: 2.8, from: Object.freeze([0, -7.1]), to: Object.freeze([0, 7.1]) }),
      Object.freeze({ id: 'lane.cargo-backstage', width: 2.4, from: Object.freeze([-9.6, 4.8]), to: Object.freeze([9.6, 4.8]) })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.main', [0, 0, -6.6], ['entry', 'traversal'], { radius: 1.5 }),
      socket('entry.backstage', [7.8, 0, 5.8], ['entry', 'traversal'], { radius: 1.3, rotation: [0, -Math.PI / 2, 0] }),
      socket('entry.cargo', [-7.8, 0, 5.8], ['entry', 'cargo'], { radius: 1.3, rotation: [0, Math.PI / 2, 0] }),
      socket('staging.auctioneer', [0, 0.82, 2.6], ['staging', 'speaker']),
      socket('staging.audience.left', [-4.2, 0, -1.4], ['staging', 'audience']),
      socket('staging.audience.right', [4.2, 0, -1.4], ['staging', 'audience']),
      socket('staging.guard.back', [5.6, 0, 4.3], ['staging', 'guard']),
      socket('staging.ambush.upper', [-5.9, 1.1, 3.7], ['staging', 'ambush']),
      socket('socket.trade.platform', [0, 0.78, 2.2], ['interaction', 'trade']),
      socket('socket.trade.private', [6.1, 0, 3.8], ['interaction', 'trade-private']),
      socket('socket.cargo.display', [-5.8, 0, 1.9], ['cargo', 'display']),
      socket('socket.cargo.holding', [-6.5, 0, 4.7], ['cargo', 'holding']),
      socket('socket.hidden-cache', [0, 0, 3.9], ['interaction', 'secret'], { enabledIn: ['auction-active', 'orc-spoils-hall'] }),
      socket('placement.dynamic.left-bay', [-7.0, 0, -3.8], ['dynamic-placement'], { radius: 1.35 }),
      socket('placement.dynamic.right-bay', [7.0, 0, -3.8], ['dynamic-placement'], { radius: 1.35 })
    ]),
    storyProps: Object.freeze(['story.auctioneer-platform', 'story.hidden-consignment-cache', 'story.last-lot-number']),
    animationChannels: Object.freeze(['cloth-sway', 'lantern-sway', 'chain-tremble', 'hidden-lamp-pulse', 'dust-breath']),
    detailBudget: 'hero',
    triangleBudget: 75000
  }),

  'market.well.neutral': Object.freeze({
    id: 'market.well.neutral',
    roomId: 'I44',
    factory: 'central-market-neutral-well',
    displayName: 'Neutral Well',
    defaultState: 'neutral',
    states: Object.freeze(['neutral', 'claimed', 'poisoned']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 15.2, depth: 13.2, height: 6.2 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.well-ring-north-south', width: 2.6, from: Object.freeze([0, -6.6]), to: Object.freeze([0, 6.6]) }),
      Object.freeze({ id: 'lane.well-ring-east-west', width: 2.6, from: Object.freeze([-7.6, 0]), to: Object.freeze([7.6, 0]) })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.north', [0, 0, -6.0], ['entry', 'traversal'], { radius: 1.35 }),
      socket('entry.south', [0, 0, 6.0], ['entry', 'traversal'], { radius: 1.35, rotation: [0, Math.PI, 0] }),
      socket('entry.east', [7.0, 0, 0], ['entry', 'traversal'], { radius: 1.35, rotation: [0, -Math.PI / 2, 0] }),
      socket('entry.west', [-7.0, 0, 0], ['entry', 'traversal'], { radius: 1.35, rotation: [0, Math.PI / 2, 0] }),
      socket('staging.water-queue', [0, 0, -3.3], ['staging', 'water-queue']),
      socket('staging.rest.left', [-4.6, 0, 2.6], ['staging', 'rest']),
      socket('staging.rest.right', [4.6, 0, 2.6], ['staging', 'rest']),
      socket('staging.neutral-meeting', [0, 0, 3.9], ['staging', 'diplomacy']),
      socket('staging.guard', [5.3, 0, -3.6], ['staging', 'guard']),
      socket('socket.water.primary', [0, 0.9, 0], ['interaction', 'water']),
      socket('socket.water.secondary', [2.9, 0, -1.2], ['interaction', 'water']),
      socket('socket.bucket', [-0.8, 1.1, 0], ['interaction', 'bucket']),
      socket('socket.fire', [-5.0, 0, 3.5], ['activity', 'fire']),
      socket('socket.offering', [1.8, 0, 2.0], ['interaction', 'offering']),
      socket('placement.dynamic.northwest', [-5.6, 0, -4.4], ['dynamic-placement'], { radius: 1.25 }),
      socket('placement.dynamic.southeast', [5.6, 0, 4.4], ['dynamic-placement'], { radius: 1.25 })
    ]),
    storyProps: Object.freeze(['story.neutrality-marker', 'story.repaired-pulley', 'story.shared-cup-shelf']),
    animationChannels: Object.freeze(['water-ripple', 'poison-ripple', 'bucket-sway', 'rope-drift', 'cloth-sway', 'flame-flicker', 'smoke-rise']),
    detailBudget: 'hero',
    triangleBudget: 62000
  }),

  'market.smuggler.way': Object.freeze({
    id: 'market.smuggler.way',
    roomId: 'I45',
    factory: 'central-market-smugglers-way',
    displayName: "Smuggler's Way",
    defaultState: 'hidden',
    states: Object.freeze(['hidden', 'active', 'collapsed']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 12.4, depth: 16.2, height: 5.8 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.smuggler-spine', width: 2.5, from: Object.freeze([0, -8.1]), to: Object.freeze([0, 8.1]) })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.market', [0, 0, -7.5], ['entry', 'traversal'], { radius: 1.3 }),
      socket('entry.back', [0, 0, 7.5], ['entry', 'traversal'], { radius: 1.3, rotation: [0, Math.PI, 0] }),
      socket('entry.secret', [4.8, 0, 3.4], ['entry', 'secret'], { radius: 1.2, rotation: [0, -Math.PI / 2, 0], enabledIn: ['active', 'collapsed'] }),
      socket('staging.lookout', [-4.1, 0, -4.9], ['staging', 'lookout']),
      socket('staging.loader', [3.6, 0, -1.6], ['staging', 'loader']),
      socket('staging.ambush', [-3.8, 0, 2.8], ['staging', 'ambush']),
      socket('staging.escape', [3.9, 0, 4.1], ['staging', 'escape'], { enabledIn: ['active', 'collapsed'] }),
      socket('socket.cargo.front', [3.8, 0, -4.3], ['cargo', 'storage']),
      socket('socket.cargo.hidden', [-4.2, 0, 3.2], ['cargo', 'secret-storage'], { enabledIn: ['active', 'collapsed'] }),
      socket('socket.hidden-cache', [-2.3, 0, 1.1], ['interaction', 'secret'], { enabledIn: ['active', 'collapsed'] }),
      socket('socket.secret-trigger', [4.1, 0.9, 2.0], ['interaction', 'secret-trigger'], { enabledIn: ['active', 'collapsed'] }),
      socket('socket.secret-exit', [5.2, 0, 3.4], ['interaction', 'secret-exit'], { enabledIn: ['active', 'collapsed'] }),
      socket('socket.lantern.hidden', [3.7, 2.3, 1.3], ['activity', 'lantern'], { enabledIn: ['active'] }),
      socket('socket.cover.crates', [-4.1, 0, -1.8], ['cover']),
      socket('socket.cart', [3.5, 0, 5.2], ['interaction', 'cart']),
      socket('placement.dynamic.front-bay', [-4.6, 0, -5.5], ['dynamic-placement'], { radius: 1.1 }),
      socket('placement.dynamic.back-bay', [-4.5, 0, 5.6], ['dynamic-placement'], { radius: 1.1 })
    ]),
    storyProps: Object.freeze(['story.false-dead-end', 'story.floor-cache', 'story.smugglers-code-marks']),
    animationChannels: Object.freeze(['cloth-sway', 'hidden-lamp-pulse', 'rope-drift', 'dust-breath']),
    detailBudget: 'hero',
    triangleBudget: 61000
  })
});

export const CENTRAL_MARKET_BUNDLE_IDS = Object.freeze(Object.keys(CENTRAL_MARKET_LANDMARK_RECIPES));

export function getCentralMarketLandmarkRecipe(bundleId) {
  return CENTRAL_MARKET_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listCentralMarketLandmarkRecipes() {
  return Object.values(CENTRAL_MARKET_LANDMARK_RECIPES);
}
