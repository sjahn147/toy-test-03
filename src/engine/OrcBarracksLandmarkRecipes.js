function socket(id, position, tags, options = {}) {
  return Object.freeze({
    id,
    position: Object.freeze([...position]),
    rotation: Object.freeze([...(options.rotation ?? [0, 0, 0])]),
    radius: options.radius ?? 0.8,
    tags: Object.freeze([...tags]),
    enabledIn: options.enabledIn ? Object.freeze([...options.enabledIn]) : null
  });
}

export const ORC_BARRACKS_LANDMARK_RECIPES = Object.freeze({
  'orc.drill-yard': Object.freeze({
    id: 'orc.drill-yard',
    roomId: 'J46',
    factory: 'orc-drill-yard',
    displayName: 'Drill Yard',
    defaultState: 'training',
    states: Object.freeze(['training', 'war-muster', 'captured']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 21, depth: 16, height: 8.5 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.drill-east-west', width: 3.4, from: Object.freeze([-10.5, 0]), to: Object.freeze([10.5, 0]) }),
      Object.freeze({ id: 'lane.drill-arena-muster', width: 3.6, from: Object.freeze([0, -8]), to: Object.freeze([0, 8]) })
    ]),
    placementZones: Object.freeze([
      Object.freeze({ id: 'placement.dynamic.northwest', type: 'camp-or-supply', center: Object.freeze([-7.5, -5.6]), radius: 1.35 }),
      Object.freeze({ id: 'placement.dynamic.southeast', type: 'worksite-or-standard', center: Object.freeze([7.5, 5.6]), radius: 1.35 })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.main', [0, 0, -7.7], ['entry', 'traversal'], { radius: 1.7 }),
      socket('entry.arena', [0, 0, 7.7], ['entry', 'traversal', 'large-unit'], { radius: 1.8, rotation: [0, Math.PI, 0] }),
      socket('entry.armory', [9.7, 0, 0], ['entry', 'traversal', 'cargo'], { radius: 1.6, rotation: [0, -Math.PI / 2, 0] }),
      socket('staging.formation.center', [0, 0, 0], ['staging', 'formation'], { radius: 2.3 }),
      socket('staging.formation.left', [-4.3, 0, 0], ['staging', 'formation']),
      socket('staging.formation.right', [4.3, 0, 0], ['staging', 'formation']),
      socket('staging.instructor', [-7.9, 0.7, -4.8], ['staging', 'instructor']),
      socket('staging.ogre', [6.2, 0, 4.3], ['staging', 'large-unit'], { radius: 2.4 }),
      socket('staging.rest', [-7.4, 0, 5.4], ['staging', 'rest']),
      socket('socket.training.duel-ring', [0, 0, 0], ['interaction', 'training']),
      socket('socket.training.spear-target', [-6.5, 0, 1.0], ['interaction', 'training']),
      socket('socket.training.axe-post', [6.4, 0, -1.2], ['interaction', 'training']),
      socket('socket.training.charge-log', [5.9, 0, 4.7], ['interaction', 'training', 'large-unit']),
      socket('socket.weapon-return', [8.1, 0, -4.7], ['interaction', 'equipment']),
      socket('socket.water', [-7.8, 0, 4.9], ['interaction', 'water']),
      socket('socket.war-drum', [-7.8, 0, -4.8], ['interaction', 'muster'], { enabledIn: ['war-muster'] }),
      socket('socket.capture-standard', [-7.9, 0, -4.7], ['interaction', 'faction-standard'], { enabledIn: ['captured'] }),
      socket('socket.fire', [-8.1, 0, 5.5], ['activity', 'fire']),
      socket('placement.dynamic.northwest', [-7.5, 0, -5.6], ['dynamic-placement'], { radius: 1.35 }),
      socket('placement.dynamic.southeast', [7.5, 0, 5.6], ['dynamic-placement'], { radius: 1.35 })
    ]),
    storyProps: Object.freeze(['story.veterans-oath-post', 'story.recruit-score-board', 'story.worn-duel-ring']),
    systemConnections: Object.freeze(['training-readiness', 'war-muster', 'morale', 'large-unit-staging', 'equipment-return']),
    animationChannels: Object.freeze(['banner-sway', 'target-swing', 'drum-pulse', 'weapon-tremble', 'chain-sway', 'forge-flicker']),
    detailBudget: 'hero',
    triangleBudget: 72000
  }),

  'orc.armory.war': Object.freeze({
    id: 'orc.armory.war',
    roomId: 'J47',
    factory: 'orc-war-armory',
    displayName: 'War Armory',
    defaultState: 'stocked',
    states: Object.freeze(['stocked', 'looted', 'exploded']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 17, depth: 13, height: 8 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.armory-cargo', width: 2.8, from: Object.freeze([0, -6.5]), to: Object.freeze([0, 6.5]) }),
      Object.freeze({ id: 'lane.armory-heavy-issue', width: 3.2, from: Object.freeze([-8.5, 0]), to: Object.freeze([8.5, 0]) })
    ]),
    placementZones: Object.freeze([
      Object.freeze({ id: 'placement.dynamic.cargo', type: 'cargo', center: Object.freeze([-6.1, 4.4]), radius: 1.15 }),
      Object.freeze({ id: 'placement.dynamic.worksite', type: 'worksite', center: Object.freeze([6.0, 4.2]), radius: 1.15 })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.yard', [0, 0, -6.1], ['entry', 'traversal', 'cargo'], { radius: 1.5 }),
      socket('entry.hall', [0, 0, 6.1], ['entry', 'traversal'], { radius: 1.5, rotation: [0, Math.PI, 0] }),
      socket('entry.service', [-8.0, 0, 0], ['entry', 'traversal', 'cargo'], { radius: 1.5, rotation: [0, Math.PI / 2, 0] }),
      socket('staging.issue-counter', [0, 0, -3.0], ['staging', 'equipment']),
      socket('staging.armorer', [5.7, 0, 2.5], ['staging', 'work']),
      socket('staging.guard', [-6.4, 0, -3.4], ['staging', 'guard']),
      socket('staging.heavy-equipment', [5.5, 0, -2.8], ['staging', 'large-unit'], { radius: 1.6 }),
      socket('staging.repair', [5.3, 0, 3.0], ['staging', 'work']),
      socket('socket.weapon.spears', [-6.5, 0, -3.8], ['equipment', 'weapon']),
      socket('socket.weapon.axes', [-6.5, 0, 0], ['equipment', 'weapon']),
      socket('socket.weapon.blades', [-6.5, 0, 3.7], ['equipment', 'weapon']),
      socket('socket.shield-rack', [5.8, 0, -4.0], ['equipment', 'shield']),
      socket('socket.armor.light', [5.9, 0, -0.5], ['equipment', 'armor']),
      socket('socket.armor.heavy', [5.9, 0, 2.0], ['equipment', 'armor']),
      socket('socket.repair-bench', [3.0, 0, 4.3], ['interaction', 'repair']),
      socket('socket.forge', [-3.0, 0, 4.5], ['activity', 'forge']),
      socket('socket.whetstone', [0.3, 0, 4.4], ['activity', 'repair']),
      socket('socket.hidden-reserve', [-6.9, 0, 4.7], ['interaction', 'secret-storage']),
      socket('socket.cargo', [-5.8, 0, 4.4], ['cargo', 'storage']),
      socket('socket.explosion-origin', [-3.0, 0, 4.5], ['hazard', 'explosion'], { enabledIn: ['exploded'] }),
      socket('placement.dynamic.cargo', [-6.1, 0, 4.4], ['dynamic-placement'], { radius: 1.15 }),
      socket('placement.dynamic.worksite', [6.0, 0, 4.2], ['dynamic-placement'], { radius: 1.15 })
    ]),
    storyProps: Object.freeze(['story.issue-token-rack', 'story.last-unreturned-blade', 'story.armorer-tea-cup']),
    systemConnections: Object.freeze(['equipment-inventory', 'repair-work', 'construction-materials', 'siege-supply', 'cargo-handling']),
    animationChannels: Object.freeze(['forge-flicker', 'bellows-pulse', 'whetstone-turn', 'weapon-tremble', 'chain-sway', 'ember-rise', 'smoke-drift']),
    detailBudget: 'hero',
    triangleBudget: 66000
  }),

  'orc.store.meat': Object.freeze({
    id: 'orc.store.meat',
    roomId: 'J48',
    factory: 'orc-meat-store',
    displayName: 'Meat Store',
    defaultState: 'stocked',
    states: Object.freeze(['stocked', 'starved', 'infested']),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 1 }),
    footprint: Object.freeze({ width: 15, depth: 12, height: 7.5 }),
    reservedLanes: Object.freeze([
      Object.freeze({ id: 'lane.meat-store-cargo', width: 2.8, from: Object.freeze([0, -6]), to: Object.freeze([0, 6]) }),
      Object.freeze({ id: 'lane.ogre-feed', width: 3.2, from: Object.freeze([-7.5, 0]), to: Object.freeze([7.5, 0]) })
    ]),
    placementZones: Object.freeze([
      Object.freeze({ id: 'placement.dynamic.cargo', type: 'food-cargo', center: Object.freeze([-5.4, 4.1]), radius: 1.1 }),
      Object.freeze({ id: 'placement.dynamic.quarantine', type: 'quarantine', center: Object.freeze([5.4, 4.0]), radius: 1.1 })
    ]),
    semanticSockets: Object.freeze([
      socket('entry.armory', [0, 0, -5.6], ['entry', 'traversal', 'cargo'], { radius: 1.5 }),
      socket('entry.yard', [0, 0, 5.6], ['entry', 'traversal', 'large-unit'], { radius: 1.6, rotation: [0, Math.PI, 0] }),
      socket('entry.service', [-7.0, 0, 0], ['entry', 'traversal', 'cargo'], { radius: 1.5, rotation: [0, Math.PI / 2, 0] }),
      socket('staging.butcher', [4.8, 0, -2.1], ['staging', 'work']),
      socket('staging.ration-queue', [0, 0, -2.8], ['staging', 'queue']),
      socket('staging.cook', [-4.7, 0, 2.7], ['staging', 'work']),
      socket('staging.inspection', [4.8, 0, 2.7], ['staging', 'inspection']),
      socket('staging.ogre-feed', [0, 0, 3.7], ['staging', 'large-unit'], { radius: 1.8 }),
      socket('staging.quarantine', [5.2, 0, 3.9], ['staging', 'quarantine'], { enabledIn: ['infested'] }),
      socket('socket.meat-rail', [0, 3.8, 0], ['interaction', 'food-storage']),
      socket('socket.salt-bin', [-5.0, 0, -3.8], ['interaction', 'preservation']),
      socket('socket.smoke-hearth', [-4.8, 0, 2.8], ['activity', 'fire']),
      socket('socket.cauldron', [-2.5, 0, 3.7], ['activity', 'cooking']),
      socket('socket.ration-scale', [4.6, 0, -3.8], ['interaction', 'rationing']),
      socket('socket.cold-store', [5.1, 0, 0.6], ['storage', 'cold']),
      socket('socket.waste', [5.2, 0, 3.7], ['storage', 'waste']),
      socket('socket.cargo.food', [-5.2, 0, 4.0], ['cargo', 'food']),
      socket('socket.parasite-inspection', [5.0, 0, 2.8], ['interaction', 'infection'], { enabledIn: ['infested'] }),
      socket('socket.quarantine-marker', [5.8, 1.2, 3.7], ['interaction', 'quarantine'], { enabledIn: ['infested'] }),
      socket('socket.water-cleaning', [-5.5, 0, 0.2], ['interaction', 'water']),
      socket('placement.dynamic.cargo', [-5.4, 0, 4.1], ['dynamic-placement'], { radius: 1.1 }),
      socket('placement.dynamic.quarantine', [5.4, 0, 4.0], ['dynamic-placement'], { radius: 1.1, enabledIn: ['infested'] })
    ]),
    storyProps: Object.freeze(['story.ration-scar-beam', 'story.last-stew-bowl', 'story.quarantine-ledger']),
    systemConnections: Object.freeze(['food-storage', 'ration-distribution', 'ogre-supply', 'infection-control', 'cargo-handling']),
    animationChannels: Object.freeze(['hook-sway', 'smoke-drift', 'cauldron-steam', 'forge-flicker', 'fly-orbit', 'parasite-pulse']),
    detailBudget: 'hero',
    triangleBudget: 62000
  })
});

export const ORC_BARRACKS_BUNDLE_IDS = Object.freeze(Object.keys(ORC_BARRACKS_LANDMARK_RECIPES));

export function getOrcBarracksLandmarkRecipe(bundleId) {
  return ORC_BARRACKS_LANDMARK_RECIPES[bundleId] ?? null;
}

export function listOrcBarracksLandmarkRecipes() {
  return Object.values(ORC_BARRACKS_LANDMARK_RECIPES);
}
