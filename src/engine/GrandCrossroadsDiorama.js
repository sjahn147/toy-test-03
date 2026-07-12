import {
  CENTRAL_MARKET_COLORS,
  addRecipeSockets,
  arch,
  barrel,
  beam,
  box,
  brazier,
  brokenPlanks,
  clothPanel,
  coinPile,
  crate,
  cylinder,
  group,
  instanceBoxes,
  instanceCylinders,
  instanceSpheres,
  instanceTorus,
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
  addDistrictMosaicRing(root);
  addPerimeterArchitecture(root);
  addCrossroadInlay(root);
  addWayfinder(root, state);
  addPlazaBollards(root);
  addPermanentCornerLife(root);
  addCargoScale(root);

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

// A 13-sector radial mosaic ring marking the districts that meet at the crossroads,
// ported from the closed PR #3 factory's `buildCrossroadsFloor` district-tile loop.
function addDistrictMosaicRing(root) {
  const ring = group('district-mosaic-ring');
  const radius = 3.6;
  const accentTiles = [];
  const baseTiles = [];
  for (let sector = 0; sector < 13; sector += 1) {
    const angle = sector * Math.PI * 2 / 13;
    const item = {
      position: [Math.cos(angle) * radius, 0.021, Math.sin(angle) * radius],
      rotation: [0, -angle, 0],
      scale: [0.62, 0.03, 1.34]
    };
    (sector % 3 === 0 ? accentTiles : baseTiles).push(item);
  }
  ring.add(
    instanceBoxes('district-mosaic-accent-tiles', accentTiles, 'brass'),
    instanceBoxes('district-mosaic-base-tiles', baseTiles, 'stoneDark')
  );
  root.add(ring);
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

  const columnPositions = [[-9.6, -7.2], [9.6, -7.2], [-9.6, 7.2], [9.6, 7.2]];
  const shafts = columnPositions.map(([x, z]) => ({ position: [x, 2.2, z], scale: [0.48, 4.4, 0.48] }));
  const caps = columnPositions.map(([x, z]) => ({ position: [x, 4.23, z], rotation: [Math.PI / 2, 0, 0], scale: [0.54, 0.54, 0.54] }));
  root.add(
    instanceCylinders('market-columns', shafts, 'stoneDark', { role: 'structure', blocksTraversal: true }),
    instanceTorus('market-column-caps', caps, 'brass', { metalness: 0.24 })
  );
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
    cylinder(0.3, 4.6, 'woodDark', 'wayfinder-post', [0, 2.83, 0], 10, null, { role: 'story-prop', blocksTraversal: true }),
    torus(0.42, 0.07, 'brass', 'wayfinder-post-collar', [0, 1.0, 0], [Math.PI / 2, 0, 0], { metalness: 0.34 }),
    torus(0.36, 0.06, 'brass', 'wayfinder-post-collar-upper', [0, 3.9, 0], [Math.PI / 2, 0, 0], { metalness: 0.34 })
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
  const landmarkFlame = sphere(0.16, 'lantern', 'wayfinder-landmark-flame', [0, 5.58, 0], [1, 1.3, 1], {
    emissive: CENTRAL_MARKET_COLORS.lantern,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.86
  });
  landmarkFlame.userData.animation = 'flame-flicker';
  landmarkFlame.userData.phase = 0.4;
  wayfinder.add(landmarkFlame);
  if (state === 'goblin-market') wayfinder.add(clothPanel(1.2, 0.7, 'clothOlive', 'goblin-market-wayfinder-ribbon', [0.42, 3.2, 0.32], [0, 0.6, 0], { folds: 4, phase: 0.7 }));
  if (state === 'adventurer-market') wayfinder.add(clothPanel(1.0, 0.58, 'clothBlue', 'adventurer-market-wayfinder-ribbon', [-0.45, 3.05, 0.18], [0, -0.4, 0], { folds: 4, phase: 1.1 }));
  if (state === 'orc-checkpoint') wayfinder.add(clothPanel(1.5, 1.8, 'orc', 'orc-checkpoint-standard', [0, 4.15, 0.36], [0, 0, 0], { folds: 5, phase: 1.9 }));
  root.add(wayfinder);
}

// A ring of bollards with draped chains marking the plaza edge around the wayfinder,
// ported from the closed PR #3 factory's `buildCentralMonument` bollard loop.
function addPlazaBollards(root) {
  const count = 8;
  const radius = 6.35;
  const positions = [];
  const bollardItems = [];
  for (let index = 0; index < count; index += 1) {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push([x, z]);
    bollardItems.push({ position: [x, 0.5, z], scale: [0.16, 1.0, 0.16] });
  }
  const swagLinks = [];
  for (let index = 0; index < count; index += 1) {
    const [ax, az] = positions[index];
    const [bx, bz] = positions[(index + 1) % count];
    const segments = 5;
    for (let seg = 1; seg < segments; seg += 1) {
      const t = seg / segments;
      const sway = Math.sin(t * Math.PI) * 0.22;
      swagLinks.push({
        position: [ax + (bx - ax) * t, 0.92 - sway, az + (bz - az) * t],
        rotation: [Math.PI / 2, t * Math.PI * 2, 0],
        scale: [0.13, 0.13, 0.13]
      });
    }
  }
  const bollards = group('plaza-bollard-ring');
  bollards.add(
    instanceCylinders('plaza-bollards', bollardItems, 'iron', { role: 'decoration' }),
    instanceTorus('plaza-bollard-chains', swagLinks, 'iron', { role: 'decoration' })
  );
  bollards.userData.animation = 'chain-tremble';
  bollards.userData.phase = 0.2;
  root.add(bollards);
}

// A cargo/customs scale: a fixture crossroads markets always had and this room lacked entirely,
// ported from the closed PR #3 factory's `makeCargoScale`.
function addCargoScale(root) {
  const scale = group('crossroads-cargo-scale');
  scale.position.set(4.4, 0, -3.3);
  scale.rotation.y = 0.22;
  scale.add(
    box(1.7, 0.16, 1.4, 'stone', 'cargo-scale-base', [0, 0.08, 0], { role: 'decoration', blocksTraversal: true }),
    cylinder(0.1, 1.85, 'iron', 'cargo-scale-post', [0, 1.0, 0], 8),
    box(2.15, 0.09, 0.1, 'brass', 'cargo-scale-beam', [0, 1.92, 0], { metalness: 0.4 })
  );
  scale.add(instanceCylinders('cargo-scale-pans', [
    { position: [-0.95, 1.42, 0], scale: [0.42, 0.09, 0.42] },
    { position: [0.95, 1.42, 0], scale: [0.42, 0.09, 0.42] }
  ], 'brass', { metalness: 0.4 }));
  const chainLinks = [];
  for (const side of [-0.95, 0.95]) {
    for (let index = 0; index < 4; index += 1) {
      const t = index / 3;
      chainLinks.push({
        position: [side, 1.9 - t * 0.42, 0],
        rotation: [0, index % 2 ? Math.PI / 2 : 0, 0],
        scale: [0.09, 0.09, 0.09]
      });
    }
  }
  scale.add(instanceTorus('cargo-scale-chains', chainLinks, 'iron'));
  scale.userData.animation = 'chain-tremble';
  scale.userData.phase = 1.6;
  root.add(scale);
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
    instanceCylinders('handcart-handles', [
      { position: [-1.25, 0.72, -0.34], rotation: [0, 0, Math.PI / 2], scale: [0.055, 0.9, 0.055] },
      { position: [-1.25, 0.72, 0.34], rotation: [0, 0, Math.PI / 2], scale: [0.055, 0.9, 0.055] }
    ], 'woodDark'),
    instanceTorus('handcart-wheels', [
      { position: [0.65, 0.55, -0.72], rotation: [0, Math.PI / 2, 0], scale: [0.55, 0.55, 0.55] },
      { position: [1.45, 0.08, 0.66], rotation: [Math.PI / 2, 0.15, 0.2], scale: [0.55, 0.55, 0.55] }
    ], 'woodDark')
  );
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

  // Extra scatter: the crossroads' spilled strongbox, a second wreck pile, and a wider dust haze.
  root.add(
    coinPile('crossroads-spilled-strongbox', [-5.5, 0.04, -6.3], 14, { material: 'brass' }),
    brokenPlanks('crossroads-ruin-planks-secondary', [-3.2, 0, 7.0], 5)
  );
  addDust(root, 'crossroads-neutral-dust-extra', [[-1.6, 0.28, 2.3], [2.4, 0.22, -2.1]]);
}

function addGoblinMarket(root) {
  addMarketStall(root, 'goblin-button-stall', [-7.3, 0, -5.1], 0.16, 'clothOlive', 'goblin');
  addMarketStall(root, 'goblin-pot-stall', [7.4, 0, -5.0], -0.12, 'clothOchre', 'bronze');
  root.add(
    brazier('goblin-market-brazier', [-7.1, 0, 5.2], { phase: 0.3, smoke: false }),
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

  // A second hanging wind-chime over the pot stall, echoing the closed PR #3 goblin-market populate pass.
  const windChime = group('goblin-market-pot-stall-wind-chime');
  windChime.position.set(7.4, 2.55, -4.3);
  const chimeCords = [];
  const chimeBells = [];
  for (let index = 0; index < 5; index += 1) {
    const x = (index - 2) * 0.3;
    const length = 0.4 + (index % 2) * 0.12;
    chimeCords.push({ position: [x, -length / 2, 0], scale: [0.016, length, 0.016] });
    chimeBells.push({ position: [x, -length - 0.09, 0], scale: [0.07, 0.07, 0.07] });
  }
  windChime.add(
    instanceCylinders('goblin-pot-chime-cords', chimeCords, 'iron'),
    instanceSpheres('goblin-pot-chime-bells', chimeBells, 'brass')
  );
  windChime.userData.animation = 'chain-tremble';
  windChime.userData.phase = 1.3;
  root.add(windChime);
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
    sphere(0.42, 'clothOchre', 'adventurer-bandage-bundle', [7.0, 0.42, 6.2], [1.2, 0.82, 0.95], { role: 'decoration', blocksTraversal: true })
  );

  // A dispatch/guild board for posting bounties and party calls, ported from the closed PR #3
  // factory's `makeDispatchBoard` (this replaces the pair of ambient lanterns to stay in budget).
  const dispatch = group('adventurer-market-dispatch-board');
  dispatch.position.set(3.4, 0, -6.1);
  dispatch.rotation.y = -0.15;
  dispatch.add(
    box(2.6, 1.5, 0.16, 'woodDark', 'dispatch-board-frame', [0, 1.5, 0], { blocksTraversal: true }),
    box(2.3, 1.2, 0.1, 'wood', 'dispatch-board-field', [0, 1.5, 0.1])
  );
  scatterPaper(dispatch, 'dispatch-board-notes', [
    [-0.7, 1.75, 0.17, 0.06], [0.05, 1.35, 0.17, -0.08], [0.68, 1.7, 0.17, 0.09], [-0.35, 1.05, 0.17, 0.12]
  ], { width: 0.5, depth: 0.36 });
  root.add(dispatch, crate('adventurer-market-ledger-crate', [3.9, 0, -5.3], 0.8, { rotationY: 0.4 }));
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
    brazier('orc-checkpoint-brazier', [-7.4, 0, 5.3], { phase: 0.8, smoke: false })
  );

  // Flanking spiked toll-gate towers beside the existing barricades, turning the crossing into a
  // proper two-tower checkpoint gate as in the closed PR #3 factory's `makeCheckpointGate`.
  const towerItems = [
    { position: [-6.3, 1.85, 0], scale: [1.0, 3.7, 1.0] },
    { position: [6.3, 1.85, 0], scale: [1.0, 3.7, 1.0] }
  ];
  root.add(instanceBoxes('orc-checkpoint-gate-towers', towerItems, 'ironDark', { role: 'structure', blocksTraversal: true }));
  const spikeItems = [];
  for (const towerX of [-6.3, 6.3]) {
    for (let index = 0; index < 4; index += 1) {
      spikeItems.push({
        position: [towerX - 0.36 + index * 0.24, 3.85, 0],
        scale: [0.05, 0.42, 0.05]
      });
    }
  }
  root.add(instanceCylinders('orc-checkpoint-gate-spikes', spikeItems, 'iron'));
}

function addBattlefield(root) {
  root.add(
    makeSpikedBarricade('battlefield-barricade-northwest', [-5.9, 0, -3.1], 0.34),
    makeSpikedBarricade('battlefield-barricade-southeast', [6.0, 0, 3.0], -0.25),
    brokenPlanks('battlefield-shattered-stalls', [-7.0, 0, 5.4], 9),
    brazier('battlefield-smoldering-cart', [7.6, 0, -5.3], { phase: 2.2, smoke: false })
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

  // More scattered ruin: scorch decals underfoot and a second field of wreckage, ported from the
  // closed PR #3 factory's scorch-mark and debris-scatter loops.
  const scorchMarks = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * 1.15;
    const scorchRadius = 4.6 + (index % 3) * 0.8;
    scorchMarks.push({
      position: [Math.cos(angle) * scorchRadius, 0.028, Math.sin(angle) * scorchRadius * 0.72],
      rotation: [0, angle, 0],
      scale: [0.85 + (index % 3) * 0.14, 0.018, 0.85 + (index % 3) * 0.14]
    });
  }
  root.add(instanceBoxes('battlefield-scorch-marks', scorchMarks, 'stoneDark'));
  root.add(brokenPlanks('battlefield-extra-wreckage', [3.6, 0, 6.1], 6));
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
