import {
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
  lantern,
  marketFloor,
  scatterPaper,
  signBoard,
  sphere,
  torus,
  wallFragment
} from './CentralMarketGeometry.js';

export function buildDeadCustomsHouseDiorama(recipe, state) {
  const root = group('central-market-dead-customs-house');
  root.add(marketFloor(15.2, 12.2, { name: 'customs-house-floor', jointSpacing: 1.9 }));
  addShell(root);
  addInspectionLane(root);
  addClerkCounter(root);
  addScale(root, state);
  addBurnedLedgerChest(root, state);
  addConfiscationShelves(root, state);

  if (state === 'abandoned') addAbandonedState(root);
  if (state === 'tax-office') addTaxOfficeState(root);
  if (state === 'smuggler-held') addSmugglerHeldState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'Every wagon once stopped here to be weighed, sealed, and made legible to power.',
    state,
    focalPoint: 'story.burned-ledger-chest'
  };
  return root;
}

function addShell(root) {
  root.add(
    wallFragment(5.3, 4.7, 0.52, [-4.9, 0, 5.75], Math.PI, { name: 'customs-back-wall-left' }),
    wallFragment(5.3, 4.2, 0.52, [4.9, 0, 5.75], Math.PI, { name: 'customs-back-wall-right' }),
    wallFragment(4.1, 3.8, 0.52, [-7.35, 0, 2.7], Math.PI / 2, { name: 'customs-side-wall-left' }),
    wallFragment(4.1, 4.0, 0.52, [7.35, 0, 2.7], -Math.PI / 2, { name: 'customs-side-wall-right' }),
    arch(3.4, 4.4, 0.58, 'stone', 'customs-market-gate', [0, 0, -5.75]),
    arch(3.0, 4.0, 0.58, 'stoneDark', 'customs-service-gate', [0, 0, 5.75], { rotationY: Math.PI })
  );
  for (const [x, z] of [[-6.2, -4.8], [6.2, -4.8]]) {
    root.add(cylinder(0.38, 4.0, 'stoneDark', 'customs-gate-column', [x, 2.0, z], 10, null, { role: 'structure', blocksTraversal: true }));
  }
}

function addInspectionLane(root) {
  const lane = group('customs.inspection-table');
  lane.position.set(-1.7, 0, -0.7);
  lane.add(
    box(4.3, 0.24, 1.25, 'woodDark', 'inspection-table-top', [0, 1.1, 0], { role: 'story-prop', blocksTraversal: true }),
    box(0.24, 1.08, 1.0, 'wood', 'inspection-table-leg-left', [-1.7, 0.54, 0], { blocksTraversal: true }),
    box(0.24, 1.08, 1.0, 'wood', 'inspection-table-leg-right', [1.7, 0.54, 0], { blocksTraversal: true }),
    box(0.14, 0.5, 0.95, 'ironDark', 'inspection-hook-board', [-1.1, 1.5, 0], { metalness: 0.24 })
  );
  for (let index = 0; index < 4; index += 1) {
    lane.add(beam([-1.55 + index * 0.55, 1.42, 0.1], [-1.55 + index * 0.55, 1.1, 0.35], 0.025, 'iron', 'inspection-hook'));
  }
  root.add(lane);

  const gate = group('customs-inspection-barrier');
  gate.position.set(0, 0, -3.2);
  gate.add(
    beam([-2.7, 0.15, 0], [-2.7, 2.5, 0], 0.09, 'woodDark', 'barrier-post'),
    beam([2.7, 0.15, 0], [2.7, 2.5, 0], 0.09, 'woodDark', 'barrier-post'),
    beam([-2.7, 1.55, 0], [2.7, 1.55, 0], 0.08, 'repairWood', 'barrier-arm')
  );
  root.add(gate);
}

function addClerkCounter(root) {
  const counter = group('customs-clerk-counter');
  counter.position.set(4.3, 0, 0.9);
  counter.rotation.y = -0.08;
  counter.add(
    box(3.5, 1.22, 1.25, 'woodDark', 'customs-counter-body', [0, 0.61, 0], { blocksTraversal: true }),
    box(3.75, 0.14, 1.45, 'wood', 'customs-counter-top', [0, 1.29, 0], { blocksTraversal: true }),
    box(1.2, 0.08, 0.75, 'parchmentDark', 'customs-writing-mat', [0.42, 1.39, 0], { rotation: [0, -0.08, 0] }),
    cylinder(0.08, 0.3, 'ironDark', 'customs-ink-pot', [1.2, 1.54, 0.08], 10),
    beam([1.18, 1.58, 0], [1.45, 2.0, 0], 0.02, 'bone', 'customs-quill')
  );
  root.add(counter);
}

function addScale(root, state) {
  const scale = group('customs.scale');
  scale.position.set(-4.8, 0, 1.3);
  scale.add(
    cylinder(0.42, 0.2, 'ironDark', 'customs-scale-base', [0, 0.1, 0], 12, null, { metalness: 0.3, blocksTraversal: true }),
    beam([0, 0.2, 0], [0, 2.4, 0], 0.06, 'iron', 'customs-scale-standard'),
    beam([-1.3, 2.25, 0], [1.3, 2.25, 0], 0.05, 'brass', 'customs-scale-beam', { metalness: 0.38 })
  );
  const leftChain = chain([-1.0, 2.22, 0], [-1.0, 1.2, 0], 5, 'customs-scale-chain-left', { phase: 0.3 });
  const rightChain = chain([1.0, 2.22, 0], [1.0, state === 'smuggler-held' ? 0.95 : 1.42, 0], 5, 'customs-scale-chain-right', { phase: 1.1 });
  scale.add(
    leftChain,
    rightChain,
    cylinder(0.62, 0.08, 'brass', 'customs-scale-pan-left', [-1.0, 1.15, 0], 18, null, { metalness: 0.28 }),
    cylinder(0.62, 0.08, 'brass', 'customs-scale-pan-right', [1.0, state === 'smuggler-held' ? 0.9 : 1.37, 0], 18, null, { metalness: 0.28 })
  );
  root.add(scale);
}

function addBurnedLedgerChest(root, state) {
  const chest = group('story.burned-ledger-chest');
  chest.position.set(4.9, 0, 3.8);
  chest.rotation.y = -0.28;
  chest.add(
    box(2.0, 0.85, 1.15, 'woodDark', 'burned-ledger-chest-body', [0, 0.43, 0], { role: 'story-prop', blocksTraversal: true }),
    box(2.04, 0.18, 1.18, 'soot', 'burned-ledger-chest-char', [0, 0.9, 0]),
    box(1.98, 0.12, 1.12, 'wood', 'burned-ledger-chest-lid', [0, 1.25, -0.38], { rotation: [-0.78, 0, 0] }),
    torus(0.16, 0.025, 'iron', 'burned-ledger-chest-lock', [0, 0.76, -0.6], [0, 0, 0], { metalness: 0.22 })
  );
  for (let index = 0; index < 6; index += 1) {
    chest.add(box(0.72, 0.05, 0.46, index < 2 ? 'ash' : 'parchmentDark', 'burned-customs-ledger', [-0.45 + (index % 3) * 0.42, 0.95 + Math.floor(index / 3) * 0.07, -0.02], { rotation: [0, (index - 2) * 0.13, 0] }));
  }
  for (let index = 0; index < 5; index += 1) {
    chest.add(cylinder(0.07, 0.025, 'waxRed', 'story.confiscation-seals', [-0.5 + index * 0.26, 0.98, 0.44], 10, [Math.PI / 2, 0, 0]));
  }
  if (state === 'tax-office') chest.add(signBoard('REVIEWED-BY-ACTING-CUSTOMS', [0, 1.5, 0.18], 0, { name: 'tax-office-reopened-ledger-tag', width: 1.8, height: 0.3, material: 'repairWood', inlay: 'waxRed', phase: 0.7 }));
  root.add(chest);
}

function addConfiscationShelves(root, state) {
  const shelves = group('customs-confiscation-shelves');
  shelves.position.set(-5.2, 0, 4.2);
  shelves.add(
    box(3.0, 0.14, 0.65, 'woodDark', 'confiscation-shelf-low', [0, 0.7, 0], { blocksTraversal: true }),
    box(3.0, 0.14, 0.65, 'woodDark', 'confiscation-shelf-high', [0, 1.65, 0], { blocksTraversal: true }),
    beam([-1.35, 0.1, 0], [-1.35, 2.4, 0], 0.07, 'wood', 'confiscation-shelf-post'),
    beam([1.35, 0.1, 0], [1.35, 2.4, 0], 0.07, 'wood', 'confiscation-shelf-post')
  );
  shelves.add(
    crate('customs-seized-box', [-0.8, 0.76, 0], 0.55),
    barrel('customs-seized-jar', [0.55, 0.75, 0], 0.48),
    box(0.8, 0.35, 0.5, state === 'smuggler-held' ? 'clothBlack' : 'clothRed', 'customs-seized-parcel', [0.65, 1.88, 0], { rotation: [0, 0.12, 0] })
  );
  root.add(shelves);
}

function addAbandonedState(root) {
  scatterPaper(root, 'abandoned-customs-papers', [[-3.4, 0.04, -3.5], [-1.6, 0.04, 3.6], [2.4, 0.04, 4.2], [5.3, 0.04, -2.8], [3.9, 0.04, -4.0]]);
  root.add(
    brokenPlanks('abandoned-customs-broken-furniture', [-5.7, 0, -3.8], 6),
    signBoard('CUSTOMS-CLOSED', [5.5, 2.7, -4.7], -0.1, { name: 'abandoned-customs-sign', width: 2.1, material: 'woodDark', inlay: 'parchmentDark', phase: 0.9 })
  );
}

function addTaxOfficeState(root) {
  root.add(
    lantern('tax-office-counter-lantern', [4.7, 2.6, 0.6], { phase: 0.4 }),
    lantern('tax-office-gate-lantern', [-1.7, 3.2, -4.5], { phase: 1.1 }),
    crate('tax-office-current-duty-box', [-5.3, 0, 3.5], 0.72),
    coinPile('tax-office-collected-duty', [4.5, 1.42, 0.8], 14),
    signBoard('TEMPORARY-DUTY-SCHEDULE', [5.8, 2.7, 2.8], -0.12, { name: 'story.false-duty-table', width: 2.5, material: 'repairWood', inlay: 'brass', phase: 0.1 })
  );
  const stamps = group('tax-office-stamp-rack');
  stamps.position.set(3.2, 1.45, 0.8);
  for (let index = 0; index < 5; index += 1) {
    stamps.add(cylinder(0.08, 0.32, index % 2 ? 'bronze' : 'wood', 'tax-office-stamp', [index * 0.22, 0.16, 0], 10));
  }
  root.add(stamps);
}

function addSmugglerHeldState(root) {
  root.add(
    clothPanel(3.6, 2.3, 'clothBlack', 'smuggler-customs-curtain', [-0.1, 3.2, 5.25], [0, 0, 0], { folds: 7, phase: 0.7 }),
    lantern('smuggler-customs-hidden-lantern', [-5.7, 2.7, 3.9], { phase: 1.9, pulse: true }),
    crate('smuggler-customs-false-seizure-box', [-4.1, 0, -3.5], 0.9, { rotationY: 0.2 }),
    crate('smuggler-customs-false-seizure-box-small', [-5.2, 0, -2.8], 0.65, { rotationY: -0.3 }),
    brazier('smuggler-customs-low-brazier', [5.5, 0, -3.8], { phase: 1.2, smoke: false })
  );
  const falseDuty = group('story.false-duty-table');
  falseDuty.position.set(2.8, 1.45, 0.7);
  falseDuty.add(
    box(1.2, 0.06, 0.78, 'parchment', 'forged-duty-sheet', [0, 0, 0], { rotation: [0, -0.1, 0] }),
    cylinder(0.09, 0.03, 'waxRed', 'forged-duty-seal', [0.38, 0.06, 0.18], 10, [Math.PI / 2, 0, 0])
  );
  root.add(falseDuty);
}
