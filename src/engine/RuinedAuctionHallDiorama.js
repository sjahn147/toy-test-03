import {
  addRecipeSockets,
  arch,
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
  lantern,
  marketFloor,
  scatterPaper,
  signBoard,
  sphere,
  torus,
  wallFragment
} from './CentralMarketGeometry.js';

export function buildRuinedAuctionHallDiorama(recipe, state) {
  const root = group('central-market-ruined-auction-hall');
  root.add(marketFloor(19.2, 14.2, { name: 'auction-hall-floor', jointSpacing: 2.0 }));
  addHallShell(root, state);
  addAuctionPlatform(root, state);
  addAudienceGeometry(root, state);
  addDisplayAndHoldingArea(root, state);
  addHiddenConsignmentCache(root, state);
  addLastLotStory(root);

  if (state === 'ruined') addRuinedState(root);
  if (state === 'auction-active') addActiveAuctionState(root);
  if (state === 'orc-spoils-hall') addOrcSpoilsState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'Public bidding performed legitimacy while private consignments moved beneath the stage.',
    state,
    focalPoint: 'story.auctioneer-platform'
  };
  return root;
}

function addHallShell(root, state) {
  root.add(
    wallFragment(7.2, state === 'ruined' ? 4.1 : 5.4, 0.58, [-5.9, 0, 6.7], Math.PI, { name: 'auction-back-wall-left' }),
    wallFragment(7.2, 5.1, 0.58, [5.9, 0, 6.7], Math.PI, { name: 'auction-back-wall-right' }),
    wallFragment(4.8, 4.2, 0.52, [-9.3, 0, 3.4], Math.PI / 2, { name: 'auction-side-wall-left' }),
    wallFragment(4.8, 4.5, 0.52, [9.3, 0, 3.4], -Math.PI / 2, { name: 'auction-side-wall-right' }),
    arch(4.2, 5.2, 0.62, 'stone', 'auction-main-arch', [0, 0, -6.65]),
    arch(2.8, 4.2, 0.52, 'stoneDark', 'auction-cargo-arch', [-8.5, 0, 5.5], { rotationY: Math.PI / 2 }),
    arch(2.8, 4.2, 0.52, 'stoneDark', 'auction-backstage-arch', [8.5, 0, 5.5], { rotationY: -Math.PI / 2 })
  );

  const overhead = group('auction-overhead-truss');
  overhead.add(
    beam([-7.4, 6.0, 4.8], [7.4, 6.0, 4.8], 0.11, 'ironDark', 'auction-truss-main'),
    beam([-6.4, 4.1, 4.8], [-6.4, 6.0, 4.8], 0.08, 'iron', 'auction-truss-drop-left'),
    beam([6.4, 4.1, 4.8], [6.4, 6.0, 4.8], 0.08, 'iron', 'auction-truss-drop-right')
  );
  const centralChain = chain([0, 6.0, 4.8], [0, 4.4, 4.8], 8, 'auction-chandelier-chain', { phase: 0.7 });
  overhead.add(centralChain);
  const ring = torus(1.05, 0.08, 'bronze', 'auction-chandelier-ring', [0, 4.25, 4.8], [Math.PI / 2, 0, 0], { metalness: 0.32 });
  ring.userData.animation = 'chain-tremble';
  ring.userData.phase = 1.4;
  overhead.add(ring);
  root.add(overhead);
}

function addAuctionPlatform(root, state) {
  const stage = group('story.auctioneer-platform');
  stage.position.set(0, 0, 3.1);
  stage.add(
    box(7.4, 0.78, 3.2, 'woodDark', 'auction-platform-base', [0, 0.39, 0], { role: 'story-prop', blocksTraversal: true }),
    box(7.8, 0.16, 3.55, state === 'orc-spoils-hall' ? 'ironDark' : 'wood', 'auction-platform-deck', [0, 0.86, 0], { role: 'story-prop', blocksTraversal: true }),
    box(1.8, 1.38, 0.95, 'woodDark', 'auctioneer-lectern', [0, 1.55, -0.2], { blocksTraversal: true }),
    box(2.0, 0.12, 1.08, 'brass', 'auctioneer-lectern-top', [0, 2.26, -0.2], { metalness: 0.28 }),
    cylinder(0.12, 0.62, 'wood', 'auction-hammer-handle', [0.68, 2.48, -0.12], 8, [0, 0, Math.PI / 2.7]),
    box(0.42, 0.18, 0.2, 'woodDark', 'auction-hammer-head', [0.88, 2.64, -0.12], { rotation: [0, 0, Math.PI / 2.7] }),
    cylinder(0.32, 0.08, 'brass', 'auction-hammer-block', [0.3, 2.34, -0.12], 16, null, { metalness: 0.26 })
  );
  const numberRail = group('auction-lot-number-rail');
  numberRail.position.set(0, 1.25, -1.45);
  for (let index = 0; index < 9; index += 1) {
    numberRail.add(box(0.48, 0.58, 0.08, index === 7 ? 'waxRed' : 'parchmentDark', 'auction-lot-number-card', [-2.2 + index * 0.55, 0, 0], { rotation: [0, 0, (index - 4) * 0.01] }));
  }
  stage.add(numberRail);
  root.add(stage);
}

function addAudienceGeometry(root, state) {
  const audience = group('auction-audience-bays');
  const rows = [
    { z: -2.0, spread: 6.4, count: 5 },
    { z: -4.1, spread: 7.8, count: 6 }
  ];
  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < row.count; index += 1) {
      const x = -row.spread / 2 + index * (row.spread / (row.count - 1));
      const rotation = (x / row.spread) * -0.18;
      const bench = box(1.05, 0.46, 0.72, rowIndex ? 'woodDark' : 'wood', 'auction-audience-seat', [x, 0.42, row.z], {
        rotation: [0, rotation, state === 'ruined' && (index + rowIndex) % 3 === 0 ? 0.18 : 0],
        blocksTraversal: true
      });
      audience.add(bench);
    }
  });
  root.add(audience);
}

function addDisplayAndHoldingArea(root, state) {
  const display = group('auction-display-cases');
  display.position.set(-6.7, 0, 1.8);
  display.add(
    box(2.6, 0.9, 1.35, 'woodDark', 'auction-display-plinth', [0, 0.45, 0], { blocksTraversal: true }),
    box(2.3, 1.1, 1.12, 'clothBlack', 'auction-display-empty-case', [0, 1.45, 0], { transparent: true, opacity: 0.16 }),
    torus(0.42, 0.03, 'brass', 'auction-display-necklace-empty', [0, 1.55, 0.58], [0, 0, 0], { metalness: 0.4 })
  );
  root.add(display);

  const cage = group('auction.display-cage');
  cage.position.set(-7.0, 0, 4.9);
  cage.add(box(2.5, 0.18, 1.8, 'ironDark', 'auction-cage-base', [0, 0.09, 0], { blocksTraversal: true }));
  for (const x of [-1.12, -0.56, 0, 0.56, 1.12]) {
    cage.add(beam([x, 0.15, -0.82], [x, 2.5, -0.82], 0.035, 'iron', 'auction-cage-bar'));
    cage.add(beam([x, 0.15, 0.82], [x, 2.5, 0.82], 0.035, 'iron', 'auction-cage-bar'));
  }
  for (const z of [-0.82, 0.82]) cage.add(beam([-1.15, 2.45, z], [1.15, 2.45, z], 0.045, 'iron', 'auction-cage-top'));
  if (state === 'orc-spoils-hall') cage.add(clothPanel(2.2, 1.5, 'orc', 'orc-spoils-cage-cloth', [0, 2.2, 0.88], [0, 0, 0], { folds: 5, phase: 0.7 }));
  root.add(cage);
}

function addHiddenConsignmentCache(root, state) {
  const cache = group('story.hidden-consignment-cache');
  cache.position.set(0, 0, 4.3);
  const open = state !== 'ruined';
  cache.add(
    box(3.0, 0.12, 1.55, 'woodDark', 'consignment-cache-frame', [0, 0.06, 0], { role: 'story-prop', blocksTraversal: true }),
    box(2.75, 0.12, 1.32, 'wood', 'consignment-cache-lid', [open ? -1.1 : 0, open ? 0.72 : 0.14, 0], {
      rotation: [0, 0, open ? -1.05 : 0],
      role: 'story-prop'
    })
  );
  if (open) {
    cache.add(
      crate('hidden-consignment-jewel-box', [0.55, 0.18, 0.1], 0.38, { material: 'woodDark' }),
      box(0.8, 0.28, 0.52, 'clothRed', 'hidden-consignment-wrapped-relic', [-0.45, 0.28, 0.1], { rotation: [0, 0.18, 0] }),
      coinPile('hidden-consignment-coin-pouch', [0, 0.42, -0.35], 11)
    );
  }
  root.add(cache);
}

function addLastLotStory(root) {
  const story = group('story.last-lot-number');
  story.position.set(2.7, 0.93, 3.85);
  story.rotation.set(-0.08, 0.2, 0.04);
  story.add(
    box(0.72, 0.04, 0.52, 'parchment', 'last-lot-number-card', [0, 0.03, 0]),
    cylinder(0.08, 0.025, 'waxRed', 'last-lot-blood-red-seal', [0.22, 0.07, 0.12], 10, [Math.PI / 2, 0, 0])
  );
  story.userData.lotNumber = '63';
  root.add(story);
}

function addRuinedState(root) {
  root.add(
    brokenPlanks('auction-ruin-stage-debris', [4.8, 0, 2.8], 9),
    clothPanel(5.6, 3.4, 'clothRed', 'auction-ruined-torn-banner', [-4.8, 6.2, 5.8], [0, 0.2, 0.14], { folds: 8, phase: 1.1 }),
    brazier('auction-ruin-cold-brazier', [7.3, 0, -4.6], { smoke: false, phase: 1.9 })
  );
  scatterPaper(root, 'auction-ruined-records', [[-2.4, 0.05, -4.8], [2.6, 0.05, -4.1], [5.7, 0.05, 1.1], [-6.2, 0.05, -1.3], [0.7, 0.95, 2.2]]);
  addDust(root, [[-6.8, 0.2, -4.9], [6.5, 0.22, -3.4], [5.4, 0.24, 4.3], [-4.0, 0.2, 5.2]]);
}

function addActiveAuctionState(root) {
  root.add(
    clothPanel(6.0, 2.6, 'clothRed', 'auction-active-stage-drape', [0, 5.9, 6.15], [0, 0, 0], { folds: 9, phase: 0.5 }),
    lantern('auction-active-stage-lantern-left', [-3.1, 4.2, 4.7], { phase: 0.2 }),
    lantern('auction-active-stage-lantern-right', [3.1, 4.2, 4.7], { phase: 1.0 }),
    crate('auction-active-lot-crate', [-5.7, 0, 1.4], 0.85),
    crate('auction-active-private-lot', [6.6, 0, 3.9], 0.64, { material: 'woodDark' }),
    coinPile('auction-active-deposit-coins', [1.25, 2.38, 2.92], 16)
  );
  const board = signBoard('TONIGHT-ONLY-RECOVERED-RELICS', [6.8, 3.2, -2.7], -Math.PI / 2, { name: 'auction-active-lot-board', width: 3.3, material: 'woodDark', inlay: 'brass', phase: 1.7 });
  root.add(board);
}

function addOrcSpoilsState(root) {
  root.add(
    clothPanel(7.0, 3.3, 'orc', 'orc-spoils-hall-war-banner', [0, 6.15, 6.2], [0, 0, 0], { folds: 10, phase: 0.8 }),
    brazier('orc-spoils-hall-brazier-left', [-6.4, 0, -3.8], { phase: 0.2 }),
    brazier('orc-spoils-hall-brazier-right', [6.4, 0, -3.8], { phase: 1.0 }),
    crate('orc-spoils-weapon-crate', [-5.5, 0, 1.3], 1.05, { material: 'woodDark' }),
    crate('orc-spoils-tribute-crate', [5.6, 0, 1.4], 0.92, { material: 'woodDark' })
  );
  const trophies = group('orc-spoils-hall-trophy-line');
  trophies.position.set(0, 3.7, 5.8);
  for (let index = 0; index < 7; index += 1) {
    const x = -3.2 + index * 1.05;
    trophies.add(chain([x, 1.4, 0], [x, 0.55 - (index % 2) * 0.18, 0], 4, 'orc-spoils-trophy-chain', { phase: index * 0.3 }));
    trophies.add(sphere(0.22, index % 3 === 0 ? 'bone' : 'iron', 'orc-spoils-trophy', [x, 0.38 - (index % 2) * 0.18, 0], [1, 0.72, 1], { metalness: index % 3 ? 0.2 : 0 }));
  }
  root.add(trophies);
}

function addDust(root, points) {
  points.forEach((point, index) => {
    const dust = sphere(0.2 + index * 0.025, 'stoneDust', 'auction-dust-mote', point, [1, 0.75, 1], { transparent: true, opacity: 0.1, depthWrite: false });
    dust.userData.animation = 'dust-breath';
    dust.userData.phase = index * 0.8;
    root.add(dust);
  });
}
