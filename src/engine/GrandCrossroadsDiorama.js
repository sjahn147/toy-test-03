import {
  CENTRAL_MARKET_COLORS,
  addRecipeSockets,
  arch,
  barrel,
  beam,
  box,
  brazier,
  brokenPlanks,
  chain,
  clothPanel,
  coinPile,
  crate,
  cylinder,
  group,
  instanceBoxes,
  instanceCylinders,
  instanceSpheres,
  lantern,
  marketFloor,
  scatterPaper,
  signBoard,
  sphere,
  torus,
  wallFragment
} from './CentralMarketGeometry.js';

export function buildGrandCrossroadsDiorama(recipe, state) {
  const root = group('central-market-grand-crossroads');
  root.add(marketFloor(22.8, 17.8, { name: 'grand-crossroads-paving', jointSpacing: 2.15 }));
  addPerimeterArchitecture(root);
  addCrossroadInlay(root);
  addWayfinder(root, state);
  addPermanentCornerLife(root);

  if (state === 'neutral-ruin') addNeutralRuin(root);
  if (state === 'goblin-market') addGoblinMarket(root);
  if (state === 'adventurer-market') addAdventurerMarket(root);
  if (state === 'orc-checkpoint') addOrcCheckpoint(root);
  if (state === 'battlefield') addBattlefield(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'The four market roads once met beneath a single civic wayfinder.',
    state,
    focalPoint: 'story.market-wayfinder',
    clearAxes: ['north-south', 'east-west']
  };
  return root;
}

function addPerimeterArchitecture(root) {
  root.add(
    wallFragment(6.4, 3.9, 0.48, [-7.9, 0, -8.25], 0, { name: 'crossroads-wall-northwest' }),
    wallFragment(6.4, 3.4, 0.48, [7.9, 0, -8.25], 0, { name: 'crossroads-wall-northeast' }),
    wallFragment(6.1, 3.2, 0.48, [-7.9, 0, 8.25], Math.PI, { name: 'crossroads-wall-southwest' }),
    wallFragment(6.1, 3.6, 0.48, [7.9, 0, 8.25], Math.PI, { name: 'crossroads-wall-southeast' })
  );

  for (const [x, z, rotation, name] of [
    [-10.9, -5.7, Math.PI / 2, 'west-north-arch'],
    [-10.9, 5.7, Math.PI / 2, 'west-south-arch'],
    [10.9, -5.7, -Math.PI / 2, 'east-north-arch'],
    [10.9, 5.7, -Math.PI / 2, 'east-south-arch']
  ]) root.add(arch(3.5, 4.0, 0.52, 'stone', `crossroads:${name}`, [x, 0, z], { rotationY: rotation }));

  for (const [x, z] of [[-9.6, -7.2], [9.6, -7.2], [-9.6, 7.2], [9.6, 7.2]]) {
    root.add(cylinder(0.48, 4.4, 'stoneDark', 'market-column', [x, 2.2, z], 12, null, { role: 'structure', blocksTraversal: true }));
    root.add(torus(0.54, 0.09, 'brass', 'market-column-cap', [x, 4.23, z], [Math.PI / 2, 0, 0], { metalness: 0.24 }));
  }
}

function addCrossroadInlay(root) {
  const inlay = group('story.guild-route-stone');
  inlay.add(
    box(3.1, 0.055, 0.22, 'brass', 'route-inlay-east-west', [0, 0.035, 0], { metalness: 0.26 }),
    box(0.22, 0.055, 3.1, 'brass', 'route-inlay-north-south', [0, 0.038, 0], { metalness: 0.26 }),
    torus(1.25, 0.12, 'bronze', 'route-inlay-ring', [0, 0.04, 0], [Math.PI / 2, 0, 0], { metalness: 0.2 })
  );
  const routeMarkers = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = index * Math.PI * 2 / 12;
    routeMarkers.push({ position: [Math.cos(angle) * 1.55, 0.04, Math.sin(angle) * 1.55], rotation: [0, -angle, 0], scale: [0.42, 0.05, 0.18] });
  }
  inlay.add(instanceBoxes('route-inlay-markers', routeMarkers, 'brass'));
  root.add(inlay);
}

function addWayfinder(root, state) {
  const wayfinder = group('story.market-wayfinder');
  wayfinder.add(
    cylinder(1.2, 0.38, 'stoneDark', 'wayfinder-octagonal-base', [0, 0.19, 0], 8, null, { role: 'story-prop', blocksTraversal: true }),
    cylinder(0.78, 0.34, 'stoneDust', 'wayfinder-upper-base', [0, 0.48, 0], 8, null, { role: 'story-prop', blocksTraversal: true }),
    cylinder(0.3, 4.25, 'woodDark', 'wayfinder-post', [0, 2.7, 0], 10, null, { role: 'story-prop', blocksTraversal: true }),
    torus(0.42, 0.07, 'brass', 'wayfinder-post-collar', [0, 1.0, 0], [Math.PI / 2, 0, 0], { metalness: 0.34 })
  );
  const signs = [
    ['customs-house', [1.35, 4.15, 0], 0, 'brass'],
    ['auction-hall', [-1.35, 3.62, 0], Math.PI, 'brass'],
    ['neutral-well', [0, 4.68, 1.35], -Math.PI / 2, 'iron'],
    ['smugglers-way-scratched-out', [0, 3.1, -1.35], Math.PI / 2, 'iron']
  ];
  signs.forEach(([key, position, rotation, accent], index) => {
    const sign = signBoard(key, position, rotation, {
      name: `wayfinder-sign:${key}`,
      width: index === 3 ? 2.55 : 2.25,
      material: 'wood',
      inlay: accent,
      phase: index * 0.91
    });
    if ((state === 'neutral-ruin' && index === 3) || (state === 'battlefield' && index < 2)) sign.rotation.z = index % 2 ? -0.28 : 0.34;
    wayfinder.add(sign);
  });
  const crown = sphere(0.34, 'brass', 'wayfinder-compass-crown', [0, 5.12, 0], [1, 0.58, 1], { metalness: 0.42, roughness: 0.38 });
  wayfinder.add(crown);
  if (state === 'goblin-market') wayfinder.add(clothPanel(1.2, 0.7, 'clothOlive', 'goblin-market-wayfinder-ribbon', [0.42, 3.2, 0.32], [0, 0.6, 0], { folds: 4, phase: 0.7 }));
  if (state === 'adventurer-market') wayfinder.add(clothPanel(1.0, 0.58, 'clothBlue', 'adventurer-market-wayfinder-ribbon', [-0.45, 3.05, 0.18], [0, -0.4, 0], { folds: 4, phase: 1.1 }));
  if (state === 'orc-checkpoint') wayfinder.add(clothPanel(1.5, 1.8, 'orc', 'orc-checkpoint-standard', [0, 4.15, 0.36], [0, 0, 0], { folds: 5, phase: 1.9 }));
  root.add(wayfinder);
}

function addPermanentCornerLife(root) {
  const notice = group('story.overwritten-notice-board');
  notice.position.set(-8.6, 0, -6.9);
  notice.rotation.y = 0.18;
  notice.add(
    box(3.0, 1.65, 0.18, 'woodDark', 'notice-board-frame', [0, 1.6, 0], { role: 'story-prop', blocksTraversal: true }),
    box(2.66, 1.35, 0.12, 'wood', 'notice-board-field', [0, 1.6, 0.11])
  );
  scatterPaper(notice, 'notice-layer', [
    [-0.82, 1.9, 0.19, 0.05], [0.0, 1.45, 0.19, -0.09], [0.76, 1.82, 0.19, 0.08], [-0.48, 1.15, 0.19, 0.14]
  ], { width: 0.58, depth: 0.42 });
  root.add(notice);

  const cart = group('crossroads-broken-handcart');
  cart.position.set(8.2, 0, 5.8);
  cart.rotation.y = -0.42;
  cart.add(
    box(2.2, 0.34, 1.25, 'wood', 'handcart-bed', [0, 0.72, 0], { blocksTraversal: true }),
    beam([-1.7, 0.72, -0.34], [-0.8, 0.72, -0.34], 0.055, 'woodDark', 'handcart-handle-left'),
    beam([-1.7, 0.72, 0.34], [-0.8, 0.72, 0.34], 0.055, 'woodDark', 'handcart-handle-right'),
    torus(0.55, 0.08, 'woodDark', 'handcart-wheel-intact', [0.65, 0.55, -0.72], [0, Math.PI / 2, 0])
  );
  cart.add(torus(0.55, 0.08, 'woodDark', 'handcart-wheel-detached', [1.45, 0.08, 0.66], [Math.PI / 2, 0.15, 0.2]));
  root.add(cart);
}

function addNeutralRuin(root) {
  const stall = group('neutral-ruin-collapsed-stall');
  stall.position.set(-7.1, 0, 4.9);
  stall.rotation.y = 0.26;
  stall.add(
    beam([-1.8, 0, -0.8], [-1.5, 2.2, -0.7], 0.08, 'woodDark', 'collapsed-stall-post-left'),
    beam([1.8, 0, -0.8], [1.3, 1.3, -0.5], 0.08, 'woodDark', 'collapsed-stall-post-right'),
    box(3.2, 0.15, 1.35, 'wood', 'collapsed-stall-counter', [0, 0.72, 0], { rotation: [0, 0, -0.12], blocksTraversal: true }),
    clothPanel(3.2, 1.1, 'clothOchre', 'collapsed-stall-awning', [0, 1.8, 0], [Math.PI / 2.45, 0, -0.12], { folds: 7, phase: 1.4 })
  );
  root.add(stall, brokenPlanks('crossroads-ruin-planks', [6.9, 0, -5.1], 7));
  scatterPaper(root, 'crossroads-lost-ledger', [[-3.8, 0.04, 4.0], [-4.5, 0.04, 4.7], [3.5, 0.04, -5.2], [5.0, 0.04, -4.5]]);
  addDust(root, 'crossroads-neutral-dust', [[-6.4, 0.3, -3.7], [6.3, 0.25, 3.5], [7.6, 0.2, -6.0]]);
}

function addGoblinMarket(root) {
  addMarketStall(root, 'goblin-button-stall', [-7.3, 0, -5.1], 0.16, 'clothOlive', 'goblin');
  addMarketStall(root, 'goblin-pot-stall', [7.4, 0, -5.0], -0.12, 'clothOchre', 'bronze');
  root.add(
    brazier('goblin-market-brazier', [-7.1, 0, 5.2], { phase: 0.3 }),
    crate('goblin-scrap-crate', [7.7, 0, 5.1], 0.9, { rotationY: -0.3 }),
    barrel('goblin-pickled-jar-barrel', [6.3, 0, 5.8], 0.82),
    coinPile('goblin-button-money', [-6.8, 1.15, -4.65], 18, { material: 'brass' })
  );
  const trinkets = group('goblin-market-hanging-trinkets');
  trinkets.position.set(-7.2, 2.7, -4.4);
  const cords = [];
  const brassTrinkets = [];
  const ironTrinkets = [];
  for (let index = 0; index < 7; index += 1) {
    const x = (index - 3) * 0.32;
    const length = 0.55 + (index % 3) * 0.14;
    cords.push({ position: [x, -length / 2, 0], scale: [0.018, length, 0.018] });
    const item = { position: [x, -length - 0.13, 0], scale: [0.09 + (index % 2) * 0.03, 0.09 + (index % 2) * 0.03, 0.09 + (index % 2) * 0.03] };
    (index % 2 ? brassTrinkets : ironTrinkets).push(item);
  }
  trinkets.add(instanceCylinders('goblin-trinket-cords', cords, 'iron'));
  trinkets.add(instanceSpheres('goblin-brass-trinkets', brassTrinkets, 'brass'));
  trinkets.add(instanceSpheres('goblin-iron-trinkets', ironTrinkets, 'iron'));
  trinkets.userData.animation = 'chain-tremble';
  trinkets.userData.phase = 0.6;
  root.add(trinkets);
}

function addAdventurerMarket(root) {
  addMarketStall(root, 'adventurer-supply-stall', [-7.3, 0, -5.1], 0.1, 'clothBlue', 'repairWood');
  addMarketStall(root, 'adventurer-map-stall', [7.3, 0, -5.1], -0.1, 'clothRed', 'wood');
  const rack = group('adventurer-market-weapon-rack');
  rack.position.set(7.4, 0, 5.1);
  rack.add(
    box(2.6, 0.15, 0.5, 'woodDark', 'weapon-rack-base', [0, 0.15, 0], { blocksTraversal: true }),
    instanceCylinders('weapon-rack-frame', [
      { position: [-1.0, 1.25, 0], scale: [0.06, 2.1, 0.06] },
      { position: [1.0, 1.25, 0], scale: [0.06, 2.1, 0.06] },
      { position: [0, 1.5, 0], rotation: [0, 0, Math.PI / 2], scale: [0.06, 2.0, 0.06] }
    ], 'wood')
  );
  const weapons = [];
  for (let index = 0; index < 4; index += 1) {
    const x = -0.72 + index * 0.48;
    weapons.push({
      position: [x + (index % 2 ? 0.06 : -0.06), 1.125, 0.08],
      rotation: [0, 0, index % 2 ? -0.077 : 0.077],
      scale: [0.035, 1.56, 0.035]
    });
  }
  rack.add(instanceCylinders('market-spears-and-tools', weapons, 'iron'));
  root.add(
    rack,
    brazier('adventurer-market-hearth', [-7.2, 0, 5.1], { phase: 1.4, smoke: false }),
    crate('adventurer-rations-crate', [5.9, 0, 6.0], 0.92),
    sphere(0.42, 'clothOchre', 'adventurer-bandage-bundle', [7.0, 0.42, 6.2], [1.2, 0.82, 0.95], { role: 'decoration', blocksTraversal: true }),
    lantern('adventurer-market-lantern-north', [-5.8, 3.1, -5.6], { phase: 0.2 }),
    lantern('adventurer-market-lantern-south', [5.8, 3.1, 5.6], { phase: 1.1 })
  );
}

function addOrcCheckpoint(root) {
  const west = makeSpikedBarricade('orc-checkpoint-west-barricade', [-5.2, 0, 0], Math.PI / 2);
  const east = makeSpikedBarricade('orc-checkpoint-east-barricade', [5.2, 0, 0], Math.PI / 2);
  const toll = group('orc-checkpoint-toll-desk');
  toll.position.set(7.4, 0, -4.8);
  toll.rotation.y = -0.18;
  toll.add(
    box(2.8, 1.0, 1.2, 'woodDark', 'orc-toll-desk', [0, 0.5, 0], { blocksTraversal: true }),
    box(2.5, 0.12, 1.0, 'ironDark', 'orc-toll-desk-plate', [0, 1.05, 0], { metalness: 0.2 }),
    cylinder(0.26, 0.48, 'bone', 'orc-toll-skull-token', [0.72, 1.34, 0], 8, null, { roughness: 0.9 })
  );
  root.add(
    west,
    east,
    toll,
    clothPanel(2.4, 3.2, 'orc', 'orc-checkpoint-banner-west', [-8.8, 4.1, -6.8], [0, 0, 0], { folds: 6, phase: 0.4 }),
    clothPanel(2.4, 3.2, 'orc', 'orc-checkpoint-banner-east', [8.8, 4.1, -6.8], [0, 0, 0], { folds: 6, phase: 1.2 }),
    brazier('orc-checkpoint-brazier', [-7.4, 0, 5.3], { phase: 0.8 })
  );
}

function addBattlefield(root) {
  root.add(
    makeSpikedBarricade('battlefield-barricade-northwest', [-5.9, 0, -3.1], 0.34),
    makeSpikedBarricade('battlefield-barricade-southeast', [6.0, 0, 3.0], -0.25),
    brokenPlanks('battlefield-shattered-stalls', [-7.0, 0, 5.4], 9),
    brazier('battlefield-smoldering-cart', [7.6, 0, -5.3], { phase: 2.2 })
  );
  const fallenCart = group('battlefield-overturned-cart');
  fallenCart.position.set(-7.7, 0, -5.1);
  fallenCart.rotation.set(0.28, 0.3, Math.PI / 2.6);
  fallenCart.add(
    box(2.4, 0.42, 1.35, 'woodDark', 'overturned-cart-bed', [0, 0.7, 0], { blocksTraversal: true }),
    torus(0.62, 0.08, 'woodDark', 'overturned-cart-wheel', [0.75, 0.7, -0.82], [0, Math.PI / 2, 0]),
    torus(0.62, 0.08, 'woodDark', 'overturned-cart-wheel', [-0.75, 0.7, -0.82], [0, Math.PI / 2, 0])
  );
  root.add(fallenCart);
  scatterPaper(root, 'battlefield-torn-contracts', [[-2.6, 0.05, -4.2], [3.2, 0.05, 4.8], [5.2, 0.05, -3.8], [-4.8, 0.05, 3.2]]);
  addDust(root, 'battlefield-dust', [[-4.0, 0.25, -5.5], [4.6, 0.2, 5.3], [7.3, 0.2, 1.8], [-7.1, 0.25, -1.9]]);
}

function addMarketStall(root, name, position, rotationY, clothMaterial, accentMaterial) {
  const stall = group(name);
  stall.position.set(...position);
  stall.rotation.y = rotationY;
  stall.add(
    box(3.4, 0.18, 1.5, 'wood', `${name}:counter`, [0, 0.92, 0], { blocksTraversal: true }),
    instanceCylinders(`${name}:frame`, [
      { position: [-1.45, 1.45, -0.62], scale: [0.07, 2.9, 0.07] },
      { position: [1.45, 1.45, -0.62], scale: [0.07, 2.9, 0.07] },
      { position: [0, 2.68, -0.62], rotation: [0, 0, Math.PI / 2], scale: [0.07, 2.9, 0.07] }
    ], 'woodDark'),
    clothPanel(3.3, 1.45, clothMaterial, `${name}:awning`, [0, 2.66, -0.08], [Math.PI / 2.75, 0, 0], { folds: 7, phase: Math.abs(position[0]) * 0.13 })
  );
  const wares = [];
  for (let index = 0; index < 5; index += 1) {
    wares.push({ position: [-1.0 + index * 0.5, 1.12, 0.02], rotation: [0, index * 0.18, 0], scale: [0.42, 0.18 + (index % 2) * 0.12, 0.38] });
  }
  stall.add(instanceBoxes(`${name}:wares`, wares, accentMaterial));
  root.add(stall);
}

function makeSpikedBarricade(name, position, rotationY) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = rotationY;
  root.add(
    box(3.2, 0.52, 0.78, 'woodDark', `${name}:body`, [0, 0.54, 0], { blocksTraversal: true }),
    box(2.9, 0.18, 0.92, 'ironDark', `${name}:band`, [0, 0.86, 0], { metalness: 0.22 })
  );
  const woodSpikes = [];
  const ironSpikes = [];
  for (let index = 0; index < 6; index += 1) {
    const x = -1.35 + index * 0.54;
    const spike = {
      position: [x + (index % 2 ? 0.09 : -0.09), 1.375, 0],
      rotation: [0, 0, index % 2 ? -0.143 : 0.143],
      scale: [0.06, 1.27, 0.06]
    };
    (index % 2 ? ironSpikes : woodSpikes).push(spike);
  }
  root.add(
    instanceCylinders(`${name}:wood-spikes`, woodSpikes, 'woodDark'),
    instanceCylinders(`${name}:iron-spikes`, ironSpikes, 'iron')
  );
  return root;
}

function addDust(root, prefix, points) {
  points.forEach((point, index) => {
    const dust = sphere(0.18 + index * 0.02, 'stoneDust', `${prefix}:mote`, point, [1, 0.72, 1], { transparent: true, opacity: 0.1, depthWrite: false });
    dust.userData.animation = 'dust-breath';
    dust.userData.phase = index * 0.7;
    root.add(dust);
  });
}
