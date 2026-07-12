import {
  CENTRAL_MARKET_COLORS,
  addRecipeSockets,
  arch,
  beam,
  box,
  brokenPlanks,
  chain,
  clothPanel,
  crate,
  cylinder,
  group,
  lantern,
  marketFloor,
  rope,
  sphere,
  torus,
  wallFragment
} from './CentralMarketGeometry.js';

export function buildSmugglersWayDiorama(recipe, state) {
  const root = group('central-market-smugglers-way');
  root.add(marketFloor(12.4, 16.2, { name: 'smugglers-way-floor', jointSpacing: 1.65, material: 'stoneDark' }));
  addPassageShell(root, state);
  addCargoLife(root, state);
  addFalseDeadEnd(root, state);
  addFloorCache(root, state);
  addCodeMarks(root, state);

  if (state === 'hidden') addHiddenState(root);
  if (state === 'active') addActiveState(root);
  if (state === 'collapsed') addCollapsedState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'The market had a second circulation system, built from silence, habit, and deniable walls.',
    state,
    focalPoint: 'story.false-dead-end'
  };
  return root;
}

function addPassageShell(root, state) {
  root.add(
    wallFragment(15.2, 4.5, 0.55, [-5.85, 0, 0], Math.PI / 2, { name: 'smuggler-long-wall-west' }),
    wallFragment(state === 'collapsed' ? 8.2 : 15.2, 4.4, 0.55, [5.85, 0, state === 'collapsed' ? -3.3 : 0], -Math.PI / 2, { name: 'smuggler-long-wall-east' }),
    arch(3.2, 4.0, 0.55, 'stoneDark', 'smuggler-market-arch', [0, 0, -7.65]),
    arch(3.0, 3.8, 0.55, 'stoneDark', 'smuggler-back-arch', [0, 0, 7.65], { rotationY: Math.PI })
  );
  for (let z = -5.8; z <= 5.8; z += 2.9) {
    root.add(
      beam([-5.5, 4.3, z], [5.5, 4.3, z], 0.09, z % 2 ? 'woodDark' : 'ironDark', 'smuggler-roof-beam', { role: 'structure', blocksTraversal: false }),
      beam([-5.2, 4.1, z], [-4.6, 3.2, z], 0.06, 'repairWood', 'smuggler-roof-brace'),
      beam([5.2, 4.1, z], [4.6, 3.2, z], 0.06, 'repairWood', 'smuggler-roof-brace')
    );
  }
}

function addCargoLife(root, state) {
  root.add(
    crate('smuggler-front-crate-large', [3.9, 0, -4.6], 1.0, { rotationY: -0.18, material: 'woodDark' }),
    crate('smuggler-front-crate-small', [4.6, 0, -3.6], 0.68, { rotationY: 0.22 }),
    crate('smuggler-west-hidden-crate', [-4.35, 0, 2.9], 0.82, { rotationY: -0.12, material: 'woodDark' }),
    box(1.65, 0.8, 1.2, 'clothBlack', 'smuggler-covered-parcel', [-4.2, 0.58, -1.8], { rotation: [0, 0.18, 0], blocksTraversal: true }),
    clothPanel(3.2, 2.4, 'clothBlack', 'smuggler-cargo-screen', [-4.85, 3.1, -0.6], [0, Math.PI / 2, 0], { folds: 7, phase: 0.7 })
  );
  const cart = group('smuggler-handcart');
  cart.position.set(3.55, 0, 5.2);
  cart.rotation.y = -0.15;
  cart.add(
    box(2.0, 0.34, 1.1, 'woodDark', 'smuggler-cart-bed', [0, 0.68, 0], { blocksTraversal: true }),
    torus(0.5, 0.07, 'ironDark', 'smuggler-cart-wheel', [0.6, 0.5, -0.62], [0, Math.PI / 2, 0]),
    torus(0.5, 0.07, 'ironDark', 'smuggler-cart-wheel', [-0.6, 0.5, -0.62], [0, Math.PI / 2, 0]),
    beam([-1.7, 0.65, -0.25], [-0.9, 0.65, -0.25], 0.045, 'wood', 'smuggler-cart-handle'),
    beam([-1.7, 0.65, 0.25], [-0.9, 0.65, 0.25], 0.045, 'wood', 'smuggler-cart-handle')
  );
  if (state === 'active') cart.add(box(1.4, 0.65, 0.82, 'clothRed', 'smuggler-cart-live-cargo', [0.1, 1.05, 0], { rotation: [0, 0.12, 0] }));
  root.add(cart);
}

function addFalseDeadEnd(root, state) {
  const falseWall = group('story.false-dead-end');
  falseWall.position.set(4.95, 0, 3.4);
  falseWall.rotation.y = -Math.PI / 2;
  const openAngle = state === 'active' ? -0.92 : state === 'collapsed' ? -0.45 : 0;
  const panel = group('smuggler-false-wall-panel');
  panel.rotation.y = openAngle;
  panel.position.x = state === 'active' ? -0.22 : 0;
  panel.add(
    box(3.2, 3.85, 0.42, 'stone', 'false-wall-masonry-face', [0, 1.93, 0], { role: 'story-prop', blocksTraversal: state === 'hidden' }),
    box(2.8, 0.15, 0.46, 'stoneDark', 'false-wall-mortar-line', [0, 1.1, 0.02]),
    box(2.7, 0.12, 0.46, 'stoneDust', 'false-wall-mortar-line', [0.1, 2.4, 0.02]),
    torus(0.12, 0.025, 'ironDark', 'socket.secret-trigger', [-1.28, 1.05, -0.25], [0, 0, 0], { metalness: 0.24 })
  );
  falseWall.add(panel);
  if (state !== 'hidden') {
    const revealed = group('smuggler-secret-opening');
    revealed.add(
      box(0.5, 4.0, 2.7, 'stoneDark', 'secret-opening-left-jamb', [-1.48, 2.0, 0], { role: 'structure', blocksTraversal: true }),
      box(0.5, 4.0, 2.7, 'stoneDark', 'secret-opening-right-jamb', [1.48, 2.0, 0], { role: 'structure', blocksTraversal: true }),
      box(3.4, 0.5, 2.7, 'stoneDark', 'secret-opening-lintel', [0, 3.75, 0], { role: 'structure', blocksTraversal: true })
    );
    falseWall.add(revealed);
  }
  root.add(falseWall);
}

function addFloorCache(root, state) {
  const cache = group('story.floor-cache');
  cache.position.set(-2.4, 0, 1.0);
  const open = state !== 'hidden';
  cache.add(
    box(2.1, 0.12, 1.35, 'stoneDark', 'floor-cache-frame', [0, 0.06, 0], { role: 'story-prop', blocksTraversal: true }),
    box(1.95, 0.14, 1.18, 'stone', 'floor-cache-lid', [open ? -0.68 : 0, open ? 0.52 : 0.14, 0], { rotation: [0, 0, open ? -0.92 : 0], role: 'story-prop' })
  );
  if (open) {
    cache.add(
      box(0.65, 0.32, 0.45, 'clothRed', 'floor-cache-sealed-parcel', [0.35, 0.3, 0.2]),
      box(0.78, 0.1, 0.5, 'parchmentDark', 'floor-cache-ledger-wrap', [-0.32, 0.26, -0.18]),
      cylinder(0.08, 0.03, 'waxRed', 'floor-cache-seal', [-0.02, 0.36, -0.16], 10, [Math.PI / 2, 0, 0])
    );
  }
  root.add(cache);
}

function addCodeMarks(root, state) {
  const marks = group('story.smugglers-code-marks');
  marks.position.set(-5.58, 0, 1.2);
  marks.rotation.y = Math.PI / 2;
  for (let index = 0; index < 7; index += 1) {
    const y = 0.85 + index * 0.34;
    marks.add(box(0.12 + (index % 3) * 0.12, 0.055, 0.035, state === 'active' ? 'waxRed' : 'stoneDust', 'smuggler-code-scratch', [-0.3 + (index % 2) * 0.45, y, 0], { rotation: [0, 0, (index - 3) * 0.12] }));
  }
  root.add(marks);
}

function addHiddenState(root) {
  root.add(
    box(2.4, 0.12, 0.55, 'stoneDust', 'hidden-route-dust-line', [0, 0.06, 3.4], { rotation: [0, 0.1, 0] }),
    clothPanel(2.6, 1.8, 'clothBlack', 'hidden-way-unused-screen', [-4.9, 2.8, 4.7], [0, Math.PI / 2, 0], { folds: 6, phase: 1.4 })
  );
  addDust(root, [[-3.8, 0.2, -5.3], [4.0, 0.18, 0.5], [-4.2, 0.22, 5.0]]);
}

function addActiveState(root) {
  const hiddenLantern = lantern('smuggler-hidden-lantern', [3.8, 2.65, 1.3], { phase: 0.5, pulse: true, intensity: 0.9 });
  hiddenLantern.traverse(node => {
    if (node.name.endsWith(':glow')) node.userData.animation = 'hidden-lamp-pulse';
  });
  root.add(
    hiddenLantern,
    clothPanel(3.0, 2.2, 'clothBlack', 'active-smuggler-privacy-screen', [-4.9, 3.1, 4.7], [0, Math.PI / 2, 0], { folds: 7, phase: 0.2 }),
    crate('active-smuggler-outgoing-box', [-4.3, 0, 5.2], 0.72, { material: 'woodDark' })
  );
  const lookout = group('active-smuggler-lookout-seat');
  lookout.position.set(-4.2, 0, -5.0);
  lookout.add(
    box(1.1, 0.48, 0.8, 'woodDark', 'smuggler-lookout-stool', [0, 0.24, 0], { blocksTraversal: true }),
    rope([-0.4, 1.4, 0], [0.5, 2.6, 0], 0.025, 'smuggler-warning-line', { material: 'clothOchre' })
  );
  root.add(lookout);
}

function addCollapsedState(root) {
  root.add(
    brokenPlanks('smuggler-collapse-timbers', [3.7, 0, 0.3], 10),
    box(3.8, 1.8, 2.6, 'stoneDark', 'smuggler-collapse-rubble-mass', [4.2, 0.9, 0.3], { rotation: [0.1, -0.22, 0.12], blocksTraversal: true }),
    clothPanel(2.7, 2.0, 'clothBlack', 'smuggler-collapsed-screen', [-4.8, 2.6, 4.8], [0, Math.PI / 2, 0.2], { folds: 6, phase: 1.7 })
  );
  for (let index = 0; index < 8; index += 1) {
    root.add(box(0.45 + (index % 3) * 0.2, 0.22 + (index % 2) * 0.12, 0.42, index % 2 ? 'stoneDust' : 'stone', 'smuggler-collapse-stone', [2.8 + (index % 4) * 0.62, 0.15 + Math.floor(index / 4) * 0.18, -0.8 + Math.floor(index / 4) * 1.4], { rotation: [index * 0.08, index * 0.23, index * 0.04] }));
  }
  addDust(root, [[3.0, 0.3, -0.5], [4.5, 0.4, 0.8], [-2.0, 0.2, 3.1], [0.8, 0.22, 5.0]]);
}

function addDust(root, points) {
  points.forEach((point, index) => {
    const dust = sphere(0.18 + index * 0.025, 'stoneDust', 'smuggler-dust-mote', point, [1, 0.72, 1], { transparent: true, opacity: 0.09, depthWrite: false });
    dust.userData.animation = 'dust-breath';
    dust.userData.phase = index * 0.73;
    root.add(dust);
  });
}
