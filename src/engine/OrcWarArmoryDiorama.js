import {
  addRecipeSockets,
  arch,
  armorStand,
  barracksFloor,
  barrel,
  beam,
  box,
  brokenPlanks,
  chain,
  clothPanel,
  crate,
  cylinder,
  forge,
  group,
  instanceBoxes,
  instanceCylinders,
  shieldRack,
  signBoard,
  sphere,
  torus,
  wallFragment,
  weaponRack,
  whetstone
} from './OrcBarracksGeometry.js';

export function buildOrcWarArmoryDiorama(recipe, state) {
  const root = group('orc-war-armory');
  root.add(barracksFloor(17, 13, { name: 'armory-oil-darkened-floor', jointSpacing: 2.1 }));
  addArchitecture(root);
  addIssueCounter(root, state);
  addTokenRack(root, state);
  addPermanentWorkLife(root, state);

  if (state === 'stocked') addStockedState(root);
  if (state === 'looted') addLootedState(root);
  if (state === 'exploded') addExplodedState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'Weapons are issued, repaired and accounted for here; Red-Tusk warfare depends on skilled labor and inventory discipline.',
    state,
    focalPoint: 'story.issue-token-rack',
    clearAxes: ['north-south cargo lane', 'east-west heavy issue lane']
  };
  return root;
}

function addArchitecture(root) {
  root.add(
    wallFragment(5.5, 3.5, 0.5, [-5.6, 0, -6.0], 0, { name: 'armory-wall-northwest' }),
    wallFragment(5.4, 3.4, 0.5, [5.6, 0, -6.0], 0, { name: 'armory-wall-northeast' }),
    wallFragment(5.1, 3.0, 0.5, [-5.8, 0, 6.0], Math.PI, { name: 'armory-wall-southwest' }),
    wallFragment(5.1, 3.3, 0.5, [5.8, 0, 6.0], Math.PI, { name: 'armory-wall-southeast' }),
    arch(3.8, 4.2, 0.55, 'stone', 'armory-yard-arch', [0, 0, -6.0]),
    arch(3.6, 4.0, 0.55, 'stone', 'armory-hall-arch', [0, 0, 6.0], { rotationY: Math.PI }),
    arch(3.2, 3.8, 0.55, 'stone', 'armory-service-arch', [-8.25, 0, 0], { rotationY: Math.PI / 2 })
  );
  root.add(
    box(16.0, 0.05, 0.16, 'clanRed', 'armory-heavy-issue-floor-line', [0, 0.04, 0]),
    box(0.16, 0.05, 11.3, 'ochre', 'armory-cargo-floor-line', [0, 0.045, 0])
  );
}

function addIssueCounter(root, state) {
  const counter = group('armory.issue-counter');
  counter.position.set(0, 0, -3.2);
  counter.add(
    box(6.0, 1.15, 1.0, 'woodDark', 'armory-issue-counter-body', [0, 0.58, 0], { role: 'structure', blocksTraversal: true }),
    box(6.35, 0.18, 1.15, 'iron', 'armory-issue-counter-top', [0, 1.2, 0]),
    box(1.25, 0.58, 0.12, state === 'looted' ? 'capturedCloth' : 'clanRed', 'armory-issue-status-panel', [1.75, 1.58, -0.45])
  );
  for (let index = 0; index < 4; index += 1) {
    counter.add(box(1.15, 0.5, 0.1, 'ironDark', 'armory-issue-slot', [-2.0 + index * 1.35, 0.62, -0.52]));
  }
  root.add(counter);
}

function addTokenRack(root, state) {
  const rack = group('story.issue-token-rack');
  rack.position.set(-5.9, 0, -3.8);
  rack.rotation.y = 0.08;
  rack.add(
    box(3.2, 2.4, 0.2, 'woodDark', 'issue-token-rack-board', [0, 1.65, 0], { role: 'story-prop', blocksTraversal: true }),
    box(2.8, 2.05, 0.12, 'wood', 'issue-token-rack-field', [0, 1.65, 0.12])
  );
  const slots = [];
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 5; col += 1) slots.push({ position: [-1.05 + col * 0.52, 0.95 + row * 0.45, 0.21], scale: [0.32, 0.08, 0.04] });
  rack.add(instanceBoxes('issue-token-rack-slots', slots, 'iron'));

  const tokenCount = state === 'stocked' ? 16 : state === 'looted' ? 5 : 9;
  const tokens = [];
  for (let index = 0; index < tokenCount; index += 1) {
    const col = index % 5;
    const row = Math.floor(index / 5);
    tokens.push({ position: [-1.05 + col * 0.52, 0.95 + row * 0.45, 0.27], rotation: [Math.PI / 2, 0, index * 0.3], scale: [0.11, 0.035, 0.16] });
  }
  rack.add(instanceCylinders('issue-token-rack-service-tokens', tokens, state === 'exploded' ? 'rust' : 'brass'));
  if (state !== 'stocked') rack.add(clothPanel(0.75, 0.55, 'clanRed', 'issue-token-rack-death-cord', [1.0, 2.15, 0.28], [0, 0, 0.35], { folds: 3, animation: 'banner-sway', phase: 0.7 }));
  root.add(rack);
}

function addPermanentWorkLife(root, state) {
  const blade = group('story.last-unreturned-blade');
  blade.position.set(-4.9, 0, 4.8);
  blade.rotation.z = -0.38;
  blade.add(
    beam([0, 0.35, 0], [0, 2.15, 0], 0.045, 'wood', 'last-unreturned-blade-grip'),
    taperedBlade('last-unreturned-blade-edge', [0, 2.55, 0], state === 'exploded' ? 'rust' : 'steelEdge')
  );
  root.add(blade);

  const cup = group('story.armorer-tea-cup');
  cup.position.set(4.4, 1.25, 4.6);
  cup.add(
    cylinder(0.18, 0.32, 'ironDark', 'armorer-tea-cup-body', [0, 0.16, 0], 10),
    torus(0.16, 0.035, 'iron', 'armorer-tea-cup-handle', [0.2, 0.2, 0], [0, Math.PI / 2, 0])
  );
  root.add(cup);

  root.add(
    box(4.2, 1.0, 1.5, 'woodDark', 'armory-repair-bench', [3.8, 0.5, 4.6], { role: 'structure', blocksTraversal: true }),
    crate('armory-rivet-bin', [6.8, 0, 4.3], 0.72),
    barrel('armory-oil-barrel', [-6.9, 0, 4.4], 0.72)
  );
  const tools = [];
  for (let index = 0; index < 7; index += 1) tools.push({ position: [2.55 + index * 0.38, 1.08, 4.6 + (index % 2 ? 0.18 : -0.12)], rotation: [0, 0, index % 2 ? 0.35 : -0.25], scale: [0.28 + (index % 3) * 0.1, 0.06, 0.06] });
  root.add(instanceBoxes('armory-repair-tools', tools, 'iron'));
}

function taperedBlade(name, position, materialName) {
  const root = group(name);
  root.position.set(...position);
  root.add(
    box(0.18, 1.0, 0.07, materialName, `${name}:blade`, [0, 0, 0]),
    box(0.48, 0.08, 0.12, 'ironDark', `${name}:guard`, [0, -0.53, 0])
  );
  return root;
}

function addStockedState(root) {
  root.add(
    weaponRack('armory.weapon-wall-spears', [-6.7, 0, -0.5], { width: 3.0, count: 6, rotationY: Math.PI / 2 }),
    weaponRack('armory.weapon-wall-axes', [-6.7, 0, 2.8], { width: 3.0, count: 5, rotationY: Math.PI / 2, bladeMaterial: 'steelEdge' }),
    shieldRack('armory.shield-wall', [6.3, 0, -4.2], { width: 3.5, count: 5, rotationY: Math.PI }),
    armorStand('armory.light-armor-stand', [5.8, 0, -0.8], { material: 'iron', cloth: 'leather', phase: 0.3 }),
    armorStand('armory.heavy-armor-stand', [5.8, 0, 2.0], { material: 'ironDark', cloth: 'clanRed', phase: 1.0 }),
    forge('armory.forge', [-3.2, 0, 4.5], { phase: 0.2 }),
    whetstone('armory.whetstone', [0.1, 0, 4.6], { phase: 0.6 }),
    crate('armory-hidden-reserve-closed', [-7.0, 0, 4.9], 0.82, { rotationY: 0.18 }),
    signBoard('RETURN-BEFORE-RATION', [6.4, 3.5, -3.8], Math.PI, { name: 'stocked-armory-issue-rule', width: 2.5, material: 'wood', inlay: 'brass', animation: 'banner-sway' })
  );
}

function addLootedState(root) {
  root.add(
    weaponRack('armory.weapon-wall-spears-empty', [-6.7, 0, -0.5], { width: 3.0, count: 6, rotationY: Math.PI / 2, empty: true }),
    weaponRack('armory.weapon-wall-axes-empty', [-6.7, 0, 2.8], { width: 3.0, count: 5, rotationY: Math.PI / 2, empty: true }),
    shieldRack('armory.shield-wall-stripped', [6.3, 0, -4.2], { width: 3.5, count: 5, rotationY: Math.PI, empty: true }),
    armorStand('armory.light-armor-stand-empty', [5.8, 0, -0.8], { empty: true }),
    armorStand('armory.heavy-armor-stand-empty', [5.8, 0, 2.0], { empty: true }),
    forge('armory.forge-cold', [-3.2, 0, 4.5], { lit: false }),
    crate('armory-hidden-reserve-open', [-7.0, 0, 4.9], 0.82, { rotationY: 0.18 })
  );
  const emptyHooks = [];
  for (let index = 0; index < 9; index += 1) emptyHooks.push({ position: [-6.85, 0.9 + (index % 3) * 0.7, -2.8 + Math.floor(index / 3) * 2.1], rotation: [0, 0, Math.PI / 2], scale: [0.12, 0.035, 0.12] });
  root.add(instanceCylinders('looted-armory-empty-hooks', emptyHooks, 'iron'));
  const scraps = [];
  for (let index = 0; index < 10; index += 1) scraps.push({ position: [-2.4 + (index % 5) * 1.0, 0.08, 2.1 + Math.floor(index / 5) * 0.55], rotation: [0, index * 0.38, index % 2 ? 0.12 : -0.1], scale: [0.65 + (index % 3) * 0.2, 0.07, 0.12] });
  root.add(instanceBoxes('looted-armory-rejected-scrap', scraps, 'rust'));
  root.add(signBoard('NOTHING-FIT-FOR-BATTLE', [4.7, 2.8, 4.6], 0.12, { name: 'looted-armory-sorting-note', width: 2.4, material: 'repairWood', inlay: 'capturedCloth', animation: 'banner-sway' }));
}

function addExplodedState(root) {
  const wreck = group('exploded-armory-blast-fan');
  wreck.position.set(-3.2, 0, 4.5);
  const shards = [];
  for (let index = 0; index < 15; index += 1) {
    const angle = -2.6 + index * 0.29;
    const radius = 1.2 + (index % 5) * 0.65;
    shards.push({ position: [Math.cos(angle) * radius, 0.12 + (index % 3) * 0.08, Math.sin(angle) * radius], rotation: [0, -angle, (index % 2 ? 1 : -1) * 0.25], scale: [0.35 + (index % 4) * 0.2, 0.08, 0.15] });
  }
  wreck.add(instanceBoxes('exploded-armory-metal-shards', shards, 'rust'));
  root.add(
    wreck,
    brokenPlanks('exploded-armory-shelving', [-5.6, 0, 2.8], 10, { material: 'woodDark' }),
    armorStand('exploded-armory-fallen-stand', [5.6, 0, 1.4], { empty: true, rotationY: 0.3 }),
    signBoard('FORGE-VENT-FAILED', [-1.2, 3.2, 5.1], 0.22, { name: 'exploded-armory-warning-plate', width: 2.2, material: 'ironDark', inlay: 'rust', animation: 'weapon-tremble' })
  );
  const bentRack = weaponRack('exploded-armory-bent-rack', [-6.2, 0, -1.0], { width: 3.0, count: 4, empty: true, rotationY: Math.PI / 2 });
  bentRack.rotation.z = -0.42;
  root.add(bentRack);
  for (let index = 0; index < 5; index += 1) {
    const ember = sphere(0.1 + index * 0.015, 'ember', 'exploded-armory-ember', [-3.8 + index * 0.35, 0.3 + index * 0.08, 4.2 + (index % 2) * 0.25], [1, 0.75, 1], { emissive: 0xff8640, emissiveIntensity: 1.1, transparent: true, opacity: 0.8 });
    ember.userData.animation = 'ember-rise';
    ember.userData.phase = index * 0.7;
    root.add(ember);
  }
  for (let index = 0; index < 3; index += 1) {
    const smoke = sphere(0.36 + index * 0.08, 'stoneDark', 'exploded-armory-smoke', [-3.2, 1.5 + index * 0.45, 4.5], [1.1, 0.75, 1], { transparent: true, opacity: 0.12, depthWrite: false });
    smoke.userData.animation = 'smoke-drift';
    smoke.userData.phase = index * 1.1;
    root.add(smoke);
  }
}
