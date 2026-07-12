import {
  addRecipeSockets,
  arch,
  banner,
  barrel,
  barracksFloor,
  beam,
  box,
  brazier,
  brokenPlanks,
  cylinder,
  group,
  instanceBoxes,
  instanceCylinders,
  shieldRack,
  signBoard,
  sphere,
  targetDummy,
  torus,
  trainingPost,
  warDrum,
  weaponRack,
  wallFragment
} from './OrcBarracksGeometry.js';

export function buildOrcDrillYardDiorama(recipe, state) {
  const root = group('orc-drill-yard');
  root.add(barracksFloor(21, 16, { name: 'drill-yard-worn-paving', jointSpacing: 2.4 }));
  addPerimeter(root);
  addTrainingMarks(root);
  addOathPost(root, state);
  addScoreBoard(root, state);
  addPermanentTrainingFixtures(root);

  if (state === 'training') addTrainingState(root);
  if (state === 'war-muster') addWarMusterState(root);
  if (state === 'captured') addCapturedState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'A disciplined military yard where repeated practice, public accounting and collective memory sustain Red-Tusk power.',
    state,
    focalPoint: 'story.veterans-oath-post',
    clearAxes: ['east-west heavy movement', 'north-south arena muster']
  };
  return root;
}

function addPerimeter(root) {
  root.add(
    wallFragment(6.6, 3.5, 0.5, [-6.9, 0, -7.55], 0, { name: 'drill-wall-northwest' }),
    wallFragment(6.4, 3.2, 0.5, [6.9, 0, -7.55], 0, { name: 'drill-wall-northeast' }),
    wallFragment(6.0, 3.1, 0.5, [-7.2, 0, 7.55], Math.PI, { name: 'drill-wall-southwest' }),
    wallFragment(5.5, 3.4, 0.5, [7.45, 0, 7.55], Math.PI, { name: 'drill-wall-southeast' }),
    arch(4.2, 4.4, 0.55, 'stone', 'drill-main-arch', [0, 0, -7.55]),
    arch(4.6, 4.6, 0.55, 'stone', 'drill-arena-arch', [0, 0, 7.55], { rotationY: Math.PI }),
    arch(3.7, 4.0, 0.55, 'stone', 'drill-armory-arch', [10.25, 0, 0], { rotationY: -Math.PI / 2 })
  );
}

function addTrainingMarks(root) {
  const inlay = group('story.worn-duel-ring');
  const outer = torus(3.15, 0.11, 'clanRed', 'drill.duel-ring-outer', [0, 0.045, 0], [Math.PI / 2, 0, 0]);
  const inner = torus(1.55, 0.065, 'ochre', 'drill.duel-ring-inner', [0, 0.05, 0], [Math.PI / 2, 0, 0]);
  inlay.add(outer, inner);
  const scuffs = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = index * Math.PI * 2 / 16;
    scuffs.push({
      position: [Math.cos(angle) * (2.25 + (index % 3) * 0.2), 0.055, Math.sin(angle) * (2.25 + (index % 2) * 0.25)],
      rotation: [0, -angle + (index % 2 ? 0.2 : -0.2), 0],
      scale: [0.55 + (index % 4) * 0.1, 0.025, 0.09]
    });
  }
  inlay.add(instanceBoxes('duel-ring-boot-scuffs', scuffs, 'stoneDark'));
  root.add(inlay);

  const formation = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      formation.push({ position: [-4.8 + col * 2.4, 0.04, -5.1 + row * 1.1], scale: [0.55, 0.025, 0.14] });
    }
  }
  root.add(instanceBoxes('drill-formation-marks', formation, 'clanRed'));
}

function addOathPost(root, state) {
  const post = group('story.veterans-oath-post');
  post.position.set(-8.2, 0, 4.3);
  post.add(
    cylinder(0.5, 4.6, 'woodDark', 'oath-post-core', [0, 2.3, 0], 12, null, { role: 'story-prop', blocksTraversal: true }),
    torus(0.55, 0.065, 'iron', 'oath-post-lower-band', [0, 0.8, 0], [Math.PI / 2, 0, 0]),
    torus(0.55, 0.065, 'iron', 'oath-post-upper-band', [0, 3.6, 0], [Math.PI / 2, 0, 0]),
    beam([-0.8, 1.0, 0], [0.8, 1.0, 0], 0.055, 'wood', 'oath-post-broken-training-blade')
  );
  const tokens = [];
  for (let index = 0; index < 18; index += 1) {
    const ring = index % 3;
    const angle = index * 1.61;
    tokens.push({
      position: [Math.cos(angle) * (0.63 + ring * 0.08), 1.25 + Math.floor(index / 6) * 0.85 + (index % 2) * 0.12, Math.sin(angle) * (0.63 + ring * 0.08)],
      rotation: [Math.PI / 2, 0, angle],
      scale: [0.11, 0.035, 0.18]
    });
  }
  post.add(instanceCylinders('oath-post-service-tokens', tokens, state === 'captured' ? 'capturedCloth' : 'brass'));
  const noviceCuts = [];
  for (let index = 0; index < 7; index += 1) noviceCuts.push({ position: [-0.28 + index * 0.09, 0.55 + (index % 3) * 0.08, 0.48], rotation: [0, 0, index % 2 ? 0.4 : -0.3], scale: [0.035, 0.22, 0.04] });
  post.add(instanceBoxes('oath-post-novice-cuts', noviceCuts, 'stoneDark'));
  if (state === 'captured') post.add(box(1.15, 0.45, 0.1, 'capturedCloth', 'captured-oath-post-seal', [0, 2.75, 0.54]));
  root.add(post);
}

function addScoreBoard(root, state) {
  const board = group('story.recruit-score-board');
  board.position.set(-8.4, 0, -4.2);
  board.rotation.y = 0.15;
  board.add(
    box(3.2, 1.9, 0.18, 'woodDark', 'drill.recruit-score-board', [0, 1.75, 0], { role: 'story-prop', blocksTraversal: true }),
    box(2.8, 1.5, 0.12, 'wood', 'drill.score-board-field', [0, 1.75, 0.11])
  );
  const rows = [];
  for (let index = 0; index < 7; index += 1) rows.push({ position: [0, 1.2 + index * 0.18, 0.19], scale: [2.25, 0.035, 0.03] });
  board.add(instanceBoxes('drill-score-board-lines', rows, 'ochre'));
  const marks = [];
  for (let index = 0; index < 12; index += 1) marks.push({ position: [-1.05 + (index % 4) * 0.65, 1.3 + Math.floor(index / 4) * 0.42, 0.2], scale: [0.18 + (index % 2) * 0.1, 0.06, 0.03] });
  board.add(instanceBoxes('drill-score-board-marks', marks, state === 'captured' ? 'capturedCloth' : 'clanRed'));
  root.add(board);
}

function addPermanentTrainingFixtures(root) {
  root.add(
    box(3.6, 0.6, 2.2, 'woodDark', 'drill.command-platform', [-7.8, 0.3, -4.8], { role: 'structure', blocksTraversal: true }),
    targetDummy('drill.spear-target', [-6.5, 0, 1.0], { phase: 0.2, rotationY: 0.18 }),
    trainingPost('drill.axe-post', [6.4, 0, -1.2], { height: 3.4, radius: 0.46 }),
    targetDummy('drill.heavy-dummy', [6.0, 0, 4.6], { phase: 1.1, material: 'leatherDark', rotationY: -0.4 }),
    barrel('drill-water-barrel', [-7.7, 0, 5.2], 0.95),
    box(3.0, 0.45, 0.8, 'woodDark', 'drill-rest-bench', [-6.4, 0.23, 5.8], { blocksTraversal: true }),
    brazier('drill-rest-brazier', [-8.8, 0, 6.0], { phase: 0.6, smoke: false })
  );

  const chargeLog = group('drill.charge-log');
  chargeLog.position.set(5.9, 0, 4.7);
  chargeLog.rotation.z = Math.PI / 2;
  chargeLog.add(
    cylinder(0.55, 3.4, 'woodDark', 'drill-charge-log-body', [0, 0, 0], 14),
    torus(0.58, 0.06, 'iron', 'drill-charge-log-band-left', [0, -1.3, 0], [Math.PI / 2, 0, 0]),
    torus(0.58, 0.06, 'iron', 'drill-charge-log-band-right', [0, 1.3, 0], [Math.PI / 2, 0, 0])
  );
  chargeLog.userData.animation = 'target-swing';
  chargeLog.userData.phase = 1.7;
  root.add(chargeLog);
}

function addTrainingState(root) {
  root.add(
    weaponRack('training-practice-weapon-return', [8.1, 0, -4.7], { width: 3.0, count: 5, bladeMaterial: 'iron' }),
    shieldRack('training-practice-shields', [8.0, 0, 4.4], { count: 4, material: 'leather' }),
    signBoard('THREE-ROUNDS-THEN-WATER', [-6.5, 3.2, 5.8], 0.1, { name: 'training-yard-rotation-rule', width: 2.6, material: 'wood', inlay: 'ochre', animation: 'banner-sway' })
  );
  const dice = [];
  for (let index = 0; index < 5; index += 1) dice.push({ position: [-7.2 + index * 0.18, 0.55, 5.8 + (index % 2) * 0.14], rotation: [0, index * 0.4, 0], scale: [0.12, 0.12, 0.12] });
  root.add(instanceBoxes('training-rest-dice', dice, 'bone'));
}

function addWarMusterState(root) {
  root.add(
    warDrum('drill.war-drum', [-7.7, 0, -4.8], { active: true, phase: 0.4 }),
    banner('drill-war-muster-standard-left', [-8.8, 0, -1.5], { phase: 0.3, width: 1.5, clothHeight: 2.4 }),
    banner('drill-war-muster-standard-right', [8.8, 0, 1.5], { phase: 1.2, width: 1.5, clothHeight: 2.4 }),
    weaponRack('war-muster-spear-cart', [7.8, 0, -4.5], { width: 3.1, count: 7, rotationY: -0.12 }),
    box(3.8, 0.42, 1.4, 'woodDark', 'war-muster-supply-sled', [-6.8, 0.22, 3.5], { blocksTraversal: true })
  );
  const rationCrates = [];
  for (let index = 0; index < 5; index += 1) rationCrates.push({ position: [-7.8 + (index % 3) * 0.75, 0.55 + Math.floor(index / 3) * 0.65, 3.5], scale: [0.65, 0.6, 0.65] });
  root.add(instanceBoxes('war-muster-ration-crates', rationCrates, 'wood'));
  const musterMarks = [];
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) musterMarks.push({ position: [-4.8 + col * 3.2, 0.07, -1.8 + row * 1.2], scale: [0.78, 0.028, 0.12] });
  root.add(instanceBoxes('war-muster-deployment-marks', musterMarks, 'clanRed'));
}

function addCapturedState(root) {
  const platform = group('captured-yard-relief-platform');
  platform.position.set(-7.7, 0, -4.8);
  platform.add(
    box(3.6, 0.55, 2.2, 'repairWood', 'captured-yard-platform', [0, 0.28, 0], { role: 'structure', blocksTraversal: true }),
    box(2.8, 0.95, 0.9, 'capturedCloth', 'captured-yard-supply-table', [0, 1.0, 0])
  );
  root.add(
    platform,
    banner('captured-yard-neutral-standard', [-8.8, 0, -1.0], { material: 'capturedCloth', phase: 0.8, width: 1.25, clothHeight: 1.8 }),
    brokenPlanks('captured-yard-dismantled-targets', [7.7, 0, 4.8], 8, { material: 'woodDark' }),
    weaponRack('captured-yard-confiscated-rack', [8.0, 0, -4.5], { width: 3.0, count: 5, empty: true }),
    signBoard('SAFE-PASSAGE-THROUGH-YARD', [-6.4, 3.0, 5.8], 0.12, { name: 'captured-yard-passage-notice', width: 2.7, material: 'repairWood', inlay: 'capturedCloth', animation: 'banner-sway' })
  );
  const bandageBundles = [];
  for (let index = 0; index < 6; index += 1) bandageBundles.push({ position: [-8.5 + (index % 3) * 0.55, 1.55 + Math.floor(index / 3) * 0.18, -4.8], scale: [0.4, 0.12, 0.28] });
  root.add(instanceBoxes('captured-yard-bandage-bundles', bandageBundles, 'parchment'));
}
