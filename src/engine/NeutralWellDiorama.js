import {
  addRecipeSockets,
  beam,
  box,
  brazier,
  clothPanel,
  coinPile,
  cylinder,
  group,
  lantern,
  marketFloor,
  rope,
  signBoard,
  sphere,
  torus,
  wallFragment,
  waterSurface
} from './CentralMarketGeometry.js';

export function buildNeutralWellDiorama(recipe, state) {
  const root = group('central-market-neutral-well');
  root.add(marketFloor(15.2, 13.2, { name: 'neutral-well-court-floor', jointSpacing: 1.85 }));
  addCourtShell(root);
  addWell(root, state);
  addNeutralityMarker(root, state);
  addBenchesAndSharedShelf(root, state);

  if (state === 'neutral') addNeutralState(root);
  if (state === 'claimed') addClaimedState(root);
  if (state === 'poisoned') addPoisonedState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'The only law everyone obeyed was that water came before faction.',
    state,
    focalPoint: 'story.neutrality-marker'
  };
  return root;
}

function addCourtShell(root) {
  root.add(
    wallFragment(4.3, 3.2, 0.48, [-5.2, 0, -6.15], 0, { name: 'well-wall-northwest' }),
    wallFragment(4.3, 3.2, 0.48, [5.2, 0, -6.15], 0, { name: 'well-wall-northeast' }),
    wallFragment(4.3, 3.0, 0.48, [-5.2, 0, 6.15], Math.PI, { name: 'well-wall-southwest' }),
    wallFragment(4.3, 3.0, 0.48, [5.2, 0, 6.15], Math.PI, { name: 'well-wall-southeast' })
  );
  for (const [x, z] of [[-6.75, -4.8], [6.75, -4.8], [-6.75, 4.8], [6.75, 4.8]]) {
    root.add(cylinder(0.36, 3.7, 'stoneDark', 'well-court-column', [x, 1.85, z], 10, null, { role: 'structure', blocksTraversal: true }));
  }
}

function addWell(root, state) {
  const well = group('neutral-well-main');
  well.add(
    cylinder(2.05, 0.8, 'stoneDark', 'neutral-well-foundation', [0, 0.4, 0], 20, null, { role: 'structure', blocksTraversal: true }),
    torus(1.72, 0.38, 'stone', 'neutral-well-rim', [0, 0.88, 0], [Math.PI / 2, 0, 0], { role: 'structure', blocksTraversal: true }),
    cylinder(1.42, 0.15, 'soot', 'neutral-well-shaft-darkness', [0, 0.68, 0], 28)
  );
  const surface = waterSurface(1.36, 'well.water-surface', [0, 0.71, 0], { poisoned: state === 'poisoned', opacity: state === 'poisoned' ? 0.8 : 0.68, phase: 0.4 });
  well.add(surface);

  const frame = group('story.repaired-pulley');
  frame.add(
    beam([-1.65, 0.9, 0], [-1.65, 4.25, 0], 0.11, 'woodDark', 'well-pulley-post-left', { role: 'structure', blocksTraversal: true }),
    beam([1.65, 0.9, 0], [1.65, state === 'claimed' ? 4.55 : 4.25, 0], 0.11, state === 'claimed' ? 'repairWood' : 'woodDark', 'well-pulley-post-right', { role: 'structure', blocksTraversal: true }),
    beam([-1.72, 4.08, 0], [1.72, 4.08, 0], 0.12, 'repairWood', 'well-pulley-crossbeam'),
    cylinder(0.45, 0.38, 'wood', 'well-pulley-wheel', [0, 3.65, 0], 14, [0, 0, Math.PI / 2], { role: 'story-prop' }),
    torus(0.48, 0.035, 'iron', 'well-pulley-iron-rim', [0, 3.65, 0], [0, Math.PI / 2, 0], { metalness: 0.28 })
  );
  const hangingRope = rope([0, 3.65, 0], [0, 1.45, 0], 0.045, 'well-bucket-rope', { material: 'wood' });
  hangingRope.userData.animation = 'rope-drift';
  hangingRope.userData.phase = 0.7;
  const bucket = group('well.bucket');
  bucket.position.set(0, 1.25, 0);
  bucket.add(
    cylinder(0.32, 0.48, 'wood', 'well-bucket-body', [0, 0.25, 0], 12),
    torus(0.35, 0.025, 'iron', 'well-bucket-hoop', [0, 0.45, 0], [Math.PI / 2, 0, 0]),
    torus(0.42, 0.025, 'iron', 'well-bucket-handle', [0, 0.58, 0], [0, 0, 0])
  );
  bucket.userData.animation = 'bucket-sway';
  bucket.userData.phase = 1.1;
  frame.add(hangingRope, bucket);
  well.add(frame);
  root.add(well);
}

function addNeutralityMarker(root, state) {
  const marker = group('story.neutrality-marker');
  marker.position.set(2.85, 0, 2.35);
  marker.rotation.y = -0.22;
  marker.add(
    cylinder(0.58, 2.55, 'stoneDust', 'neutrality-marker-stone', [0, 1.28, 0], 8, null, { role: 'story-prop', blocksTraversal: true }),
    torus(0.42, 0.06, 'brass', 'neutrality-marker-oath-ring', [0, 1.82, 0.56], [0, 0, 0], { metalness: 0.28 }),
    box(0.84, 0.1, 0.05, 'waxRed', 'neutrality-mark-first-faction', [-0.03, 1.3, 0.58], { rotation: [0, 0, -0.17] }),
    box(0.7, 0.1, 0.05, 'brass', 'neutrality-mark-second-faction', [0.02, 1.08, 0.58], { rotation: [0, 0, 0.1] }),
    box(0.76, 0.1, 0.05, 'iron', 'neutrality-mark-third-faction', [0.06, 0.86, 0.58], { rotation: [0, 0, -0.06] })
  );
  marker.userData.inscription = 'WATER BEFORE BANNER';
  if (state === 'claimed') marker.add(clothPanel(1.4, 1.8, 'clothRed', 'claimed-well-faction-cloth', [0, 2.55, 0.38], [0, 0, 0], { folds: 5, phase: 0.6 }));
  if (state === 'poisoned') marker.rotation.z = -0.16;
  root.add(marker, coinPile('neutral-well-offerings', [2.45, 0.06, 1.8], 12));
}

function addBenchesAndSharedShelf(root, state) {
  for (const [x, z, rotation, name] of [
    [-4.7, 2.8, 0.05, 'left'], [4.7, 2.8, -0.05, 'right']
  ]) {
    const bench = group(`well-rest-bench-${name}`);
    bench.position.set(x, 0, z);
    bench.rotation.y = rotation;
    bench.add(
      box(3.2, 0.28, 0.72, 'stone', 'well-bench-seat', [0, 0.68, 0], { blocksTraversal: true }),
      box(0.28, 0.68, 0.62, 'stoneDark', 'well-bench-leg', [-1.2, 0.34, 0], { blocksTraversal: true }),
      box(0.28, 0.68, 0.62, 'stoneDark', 'well-bench-leg', [1.2, 0.34, 0], { blocksTraversal: true })
    );
    if (state !== 'poisoned') bench.add(box(1.55, 0.12, 0.62, 'clothBlue', 'well-bench-blanket', [0.38, 0.88, 0], { rotation: [0, 0.05, 0] }));
    root.add(bench);
  }

  const shelf = group('story.shared-cup-shelf');
  shelf.position.set(5.8, 0, -3.7);
  shelf.rotation.y = -0.35;
  shelf.add(
    box(2.2, 0.15, 0.55, 'woodDark', 'shared-cup-shelf-plank', [0, 1.4, 0], { blocksTraversal: true }),
    beam([-0.9, 0.2, 0], [-0.9, 1.6, 0], 0.06, 'wood', 'shared-cup-shelf-post'),
    beam([0.9, 0.2, 0], [0.9, 1.6, 0], 0.06, 'wood', 'shared-cup-shelf-post')
  );
  for (let index = 0; index < 6; index += 1) {
    shelf.add(cylinder(0.11, 0.22, index % 2 ? 'iron' : 'bronze', 'shared-water-cup', [-0.72 + index * 0.3, 1.58, 0], 10));
  }
  root.add(shelf);
}

function addNeutralState(root) {
  root.add(
    brazier('neutral-well-tea-fire', [-5.1, 0, 3.9], { phase: 0.4, smoke: false }),
    lantern('neutral-well-evening-lantern', [5.4, 3.0, -4.7], { phase: 1.2 }),
    box(0.7, 0.55, 0.7, 'bronze', 'neutral-well-kettle', [-4.45, 0.62, 3.85], { rotation: [0, 0.25, 0] }),
    clothPanel(2.4, 1.1, 'clothBlue', 'neutral-well-drying-cloth', [-5.6, 2.6, -4.9], [0, 0.2, 0], { folds: 6, phase: 1.7 })
  );
  addWaterJars(root, 'neutral-water-jars', [[-3.6, 0, -2.6], [3.7, 0, -2.4], [4.3, 0, -1.7]], false);
}

function addClaimedState(root) {
  root.add(
    signBoard('WATER-BY-PERMISSION', [5.8, 2.8, -4.6], -0.28, { name: 'claimed-well-ration-board', width: 2.8, material: 'woodDark', inlay: 'waxRed', phase: 0.9 }),
    lantern('claimed-well-guard-lantern', [4.8, 3.2, -3.6], { phase: 0.4 }),
    box(3.1, 0.75, 0.72, 'woodDark', 'claimed-well-low-barricade', [5.2, 0.48, 0.3], { rotation: [0, -0.15, 0], blocksTraversal: true })
  );
  for (let index = 0; index < 5; index += 1) {
    root.add(beam([3.9 + index * 0.58, 0.8, 0.2], [4.0 + index * 0.58, 1.8 + (index % 2) * 0.25, 0.15], 0.045, index % 2 ? 'iron' : 'woodDark', 'claimed-well-barricade-spike'));
  }
  addWaterJars(root, 'claimed-water-rations', [[-4.5, 0, -3.4], [-3.8, 0, -3.2], [-3.1, 0, -3.5], [-2.4, 0, -3.2]], true);
}

function addPoisonedState(root) {
  root.add(
    signBoard('DO-NOT-DRAW', [5.7, 2.7, -4.5], -0.28, { name: 'poisoned-well-warning', width: 2.5, material: 'woodDark', inlay: 'poison', phase: 1.4 }),
    box(1.9, 0.12, 0.75, 'clothBlack', 'poisoned-well-covered-cups', [5.8, 1.7, -3.7], { rotation: [0, -0.35, 0] })
  );
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 2 / 8;
    const bubble = sphere(0.08 + (index % 3) * 0.025, 'poison', 'poisoned-well-bubble', [Math.cos(angle) * (0.5 + (index % 2) * 0.38), 0.82, Math.sin(angle) * (0.5 + (index % 2) * 0.38)], [1, 0.65, 1], { emissive: 0x334d1e, emissiveIntensity: 0.18, transparent: true, opacity: 0.65 });
    bubble.userData.animation = 'poison-ripple';
    bubble.userData.phase = index * 0.45;
    root.add(bubble);
  }
  addWaterJars(root, 'poisoned-abandoned-jars', [[-4.1, 0, -3.0], [4.2, 0, 3.7]], false, true);
}

function addWaterJars(root, prefix, positions, ordered, tipped = false) {
  positions.forEach((position, index) => {
    const jar = group(`${prefix}:${index}`);
    jar.position.set(...position);
    jar.rotation.set(tipped && index === 0 ? Math.PI / 2 : 0, ordered ? 0 : index * 0.42, tipped && index === 0 ? 0.2 : 0);
    jar.add(
      cylinder(0.28, 0.62, index % 2 ? 'bronze' : 'wood', 'water-jar-body', [0, 0.34, 0], 12),
      torus(0.19, 0.025, 'iron', 'water-jar-neck-ring', [0, 0.7, 0], [Math.PI / 2, 0, 0])
    );
    root.add(jar);
  });
}
