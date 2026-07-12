import {
  addRecipeSockets,
  arch,
  banner,
  barracksFloor,
  barrel,
  beam,
  box,
  brazier,
  cauldron,
  chain,
  clothPanel,
  crate,
  cylinder,
  group,
  instanceBoxes,
  instanceCylinders,
  meatBundle,
  parasiteCluster,
  rationScale,
  saltBin,
  signBoard,
  sphere,
  torus,
  wallFragment
} from './OrcBarracksGeometry.js';

export function buildOrcMeatStoreDiorama(recipe, state) {
  const root = group('orc-meat-store');
  root.add(barracksFloor(15, 12, { name: 'meat-store-drained-floor', jointSpacing: 2.0 }));
  addArchitecture(root);
  addDrainage(root, state);
  addRationBeam(root, state);
  addPermanentWorkstations(root, state);

  if (state === 'stocked') addStockedState(root);
  if (state === 'starved') addStarvedState(root);
  if (state === 'infested') addInfestedState(root);

  addRecipeSockets(root, recipe, state);
  root.userData.visualNarrative = {
    premise: 'A military ration room where preservation, accounting and contamination control matter as much as appetite.',
    state,
    focalPoint: 'story.ration-scar-beam',
    clearAxes: ['north-south food cargo', 'east-west ogre feed']
  };
  return root;
}

function addArchitecture(root) {
  root.add(
    wallFragment(4.8, 3.3, 0.5, [-5.0, 0, -5.5], 0, { name: 'meat-store-wall-northwest' }),
    wallFragment(4.8, 3.2, 0.5, [5.0, 0, -5.5], 0, { name: 'meat-store-wall-northeast' }),
    wallFragment(4.5, 3.0, 0.5, [-5.2, 0, 5.5], Math.PI, { name: 'meat-store-wall-southwest' }),
    wallFragment(4.4, 3.3, 0.5, [5.25, 0, 5.5], Math.PI, { name: 'meat-store-wall-southeast' }),
    arch(3.6, 4.0, 0.55, 'stone', 'meat-store-armory-arch', [0, 0, -5.5]),
    arch(3.8, 4.2, 0.55, 'stone', 'meat-store-yard-arch', [0, 0, 5.5], { rotationY: Math.PI }),
    arch(3.0, 3.7, 0.55, 'stone', 'meat-store-service-arch', [-7.25, 0, 0], { rotationY: Math.PI / 2 })
  );
}

function addDrainage(root, state) {
  root.add(
    box(0.34, 0.04, 10.6, 'ironDark', 'meat-store-main-drain', [0, 0.035, 0]),
    box(13.6, 0.04, 0.28, state === 'infested' ? 'parasite' : 'stoneDark', 'meat-store-cross-drain', [0, 0.038, 0])
  );
  const grates = [];
  for (let index = 0; index < 9; index += 1) grates.push({ position: [0, 0.07, -4.8 + index * 1.2], scale: [0.52, 0.04, 0.08] });
  root.add(instanceBoxes('meat-store-drain-grates', grates, state === 'infested' ? 'rust' : 'iron'));
}

function addRationBeam(root, state) {
  const beamRoot = group('story.ration-scar-beam');
  beamRoot.position.set(0, 0, -4.2);
  beamRoot.add(
    beam([-5.5, 3.8, 0], [5.5, 3.8, 0], 0.18, 'woodDark', 'ration-scar-bearing-beam', { role: 'story-prop', blocksTraversal: false }),
    beam([-5.4, 0, 0], [-5.4, 4.0, 0], 0.14, 'wood', 'ration-beam-left-support', { role: 'structure', blocksTraversal: true }),
    beam([5.4, 0, 0], [5.4, 4.0, 0], 0.14, 'wood', 'ration-beam-right-support', { role: 'structure', blocksTraversal: true })
  );
  const scars = [];
  const scarCount = state === 'starved' ? 22 : 16;
  for (let index = 0; index < scarCount; index += 1) {
    const deep = state === 'starved' && index > 12;
    scars.push({
      position: [-4.8 + index * (9.6 / Math.max(1, scarCount - 1)), 3.95, 0.12],
      rotation: [0, 0, deep ? -0.55 : -0.25 + (index % 3) * 0.18],
      scale: [deep ? 0.05 : 0.035, deep ? 0.46 : 0.28, 0.04]
    });
  }
  beamRoot.add(instanceBoxes('ration-beam-scar-marks', scars, state === 'infested' ? 'parasite' : 'ochre'));
  const tokens = [];
  for (let index = 0; index < (state === 'starved' ? 4 : 10); index += 1) tokens.push({ position: [-4.2 + index * 0.9, 3.35, 0.12], rotation: [Math.PI / 2, 0, index * 0.4], scale: [0.11, 0.035, index % 3 === 0 ? 0.22 : 0.16] });
  beamRoot.add(instanceCylinders('ration-beam-unit-tokens', tokens, 'bone'));
  if (state === 'infested') beamRoot.add(clothPanel(1.3, 0.8, 'clanRed', 'ration-beam-quarantine-cloth', [3.8, 3.2, 0.18], [0, 0, -0.2], { folds: 4, animation: 'banner-sway', phase: 0.9 }));
  root.add(beamRoot);
}

function addPermanentWorkstations(root, state) {
  const table = group('meat-store-cutting-table');
  table.position.set(4.7, 0, -1.8);
  table.add(
    box(3.2, 0.34, 1.65, 'woodDark', 'meat-store-cutting-slab', [0, 1.05, 0], { role: 'structure', blocksTraversal: true }),
    beam([-1.25, 0, -0.55], [-1.25, 1.0, -0.55], 0.08, 'wood', 'cutting-table-leg'),
    beam([1.25, 0, -0.55], [1.25, 1.0, -0.55], 0.08, 'wood', 'cutting-table-leg'),
    beam([-1.25, 0, 0.55], [-1.25, 1.0, 0.55], 0.08, 'wood', 'cutting-table-leg'),
    beam([1.25, 0, 0.55], [1.25, 1.0, 0.55], 0.08, 'wood', 'cutting-table-leg')
  );
  const tools = [];
  for (let index = 0; index < 5; index += 1) tools.push({ position: [-1.05 + index * 0.5, 1.28, index % 2 ? 0.35 : -0.25], rotation: [0, index % 2 ? 0.3 : -0.25, 0], scale: [0.42 + (index % 3) * 0.15, 0.055, 0.09] });
  table.add(instanceBoxes('meat-store-cutting-tools', tools, 'iron'));
  root.add(table);

  const bowl = group('story.last-stew-bowl');
  bowl.position.set(-2.6, 1.35, 3.7);
  bowl.add(
    cylinder(0.38, 0.16, 'ironDark', 'last-stew-bowl-body', [0, 0, 0], 14),
    sphere(0.28, state === 'starved' ? 'soot' : 'meatDark', 'last-stew-bowl-contents', [0, 0.1, 0], [1, 0.25, 1])
  );
  root.add(bowl);

  const ledger = group('story.quarantine-ledger');
  ledger.position.set(5.6, 0, 3.8);
  ledger.rotation.y = -0.2;
  ledger.add(
    box(1.3, 0.12, 0.9, 'parchment', 'quarantine-ledger-pages', [0, 0.95, 0]),
    box(1.42, 0.08, 1.0, state === 'infested' ? 'clanRed' : 'leatherDark', 'quarantine-ledger-cover', [0, 0.86, 0])
  );
  if (state === 'infested') ledger.add(cylinder(0.09, 0.03, 'parasite', 'quarantine-ledger-warning-seal', [0.42, 1.04, 0.28], 10));
  root.add(ledger);

  root.add(
    saltBin('store.salt-bin', [-5.1, 0, -3.6], { empty: state === 'starved' }),
    rationScale('store.ration-scale', [4.6, 0, -3.7], { precise: state === 'starved' }),
    cauldron('store.cauldron', [-2.6, 0, 3.7], { phase: 0.4, steam: state !== 'infested' }),
    brazier('store.smoke-hearth', [-5.0, 0, 2.8], { phase: 1.0, smoke: true }),
    barrel('store-cleaning-water', [-5.7, 0, 0.2], 0.78),
    crate('store-food-cargo-frame', [-5.5, 0, 4.2], 0.82, { material: state === 'infested' ? 'woodDark' : 'wood' })
  );
}

function addStockedState(root) {
  addMeatRail(root, 'stocked-meat-rail', 9, false);
  root.add(
    saltBin('stocked-secondary-salt-bin', [-5.2, 0, -1.5], { empty: false }),
    banner('stocked-ration-ready-marker', [6.2, 0, 1.4], { width: 1.1, clothHeight: 1.5, phase: 0.3, material: 'ochre' }),
    signBoard('FIRST-IN-FIRST-OUT', [5.7, 2.8, 3.9], -0.18, { name: 'stocked-store-rotation-rule', width: 2.3, material: 'wood', inlay: 'brass', animation: 'banner-sway' })
  );
  const drying = [];
  for (let index = 0; index < 9; index += 1) drying.push({ position: [-4.8 + (index % 3) * 0.65, 1.1 + Math.floor(index / 3) * 0.45, 1.1], scale: [0.45, 0.16, 0.22] });
  root.add(instanceBoxes('stocked-store-drying-rations', drying, 'meatDry'));
}

function addStarvedState(root) {
  addMeatRail(root, 'starved-empty-rail', 2, true);
  root.add(
    signBoard('HALF-RATION-UNTIL-RETURN', [5.8, 2.9, 3.8], -0.18, { name: 'starved-store-ration-order', width: 2.6, material: 'repairWood', inlay: 'clanRed', animation: 'banner-sway' }),
    box(2.4, 0.5, 1.2, 'woodDark', 'starved-store-bone-boiling-tray', [-1.0, 0.25, 3.6], { blocksTraversal: true })
  );
  const bones = [];
  for (let index = 0; index < 12; index += 1) bones.push({ position: [-1.9 + (index % 6) * 0.38, 0.58 + Math.floor(index / 6) * 0.12, 3.6 + (index % 2 ? 0.18 : -0.15)], rotation: [0, index * 0.45, index % 2 ? 0.2 : -0.2], scale: [0.34 + (index % 3) * 0.1, 0.05, 0.05] });
  root.add(instanceBoxes('starved-store-reboiled-bones', bones, 'bone'));
  const scrapedShelves = [];
  for (let index = 0; index < 4; index += 1) scrapedShelves.push({ position: [-5.2, 0.65 + (index % 4) * 0.55, -1.2 + Math.floor(index / 4) * 1.2], scale: [1.5, 0.08, 0.5] });
  root.add(instanceBoxes('starved-store-scraped-shelves', scrapedShelves, 'woodDark'));
}

function addInfestedState(root) {
  addMeatRail(root, 'infested-quarantine-rail', 5, false, true);
  root.add(
    clothPanel(4.0, 2.8, 'clanRed', 'infested-store-quarantine-curtain', [4.2, 2.5, 1.6], [0, Math.PI / 2, 0], { folds: 7, animation: 'banner-sway', phase: 0.7 }),
    signBoard('QUARANTINE-BURN-WITHOUT-OPENING', [5.7, 2.8, 4.0], -0.18, { name: 'infested-store-warning', width: 2.8, material: 'woodDark', inlay: 'parasite', animation: 'banner-sway' }),
    parasiteCluster('infested-store-swollen-sack', [5.0, 0.8, 2.5], { count: 5, phase: 0.4 }),
    parasiteCluster('infested-store-drain-nest', [1.2, 0.12, 0], { count: 4, phase: 1.3 })
  );
  for (let index = 0; index < 2; index += 1) {
    const fly = sphere(0.045, 'parasite', 'infested-store-fly', [3.2 + (index % 4) * 0.55, 1.7 + Math.floor(index / 4) * 0.45, 1.3 + (index % 3) * 0.25], [1, 1, 1], { emissive: 0xaec65f, emissiveIntensity: 0.18 });
    fly.userData.animation = 'fly-orbit';
    fly.userData.phase = index * 0.74;
    fly.userData.orbitRadius = 0.28 + (index % 3) * 0.09;
    root.add(fly);
  }
  const limeMarks = [];
  for (let index = 0; index < 7; index += 1) limeMarks.push({ position: [3.0 + (index % 4) * 0.75, 0.06, 2.2 + Math.floor(index / 4) * 0.8], rotation: [0, index * 0.4, 0], scale: [0.5, 0.03, 0.12] });
  root.add(instanceBoxes('infested-store-lime-quarantine-marks', limeMarks, 'salt'));
}

function addMeatRail(root, name, count, mostlyEmpty = false, infested = false) {
  const rail = group(name);
  rail.add(
    beam([-5.2, 4.2, 0], [5.2, 4.2, 0], 0.11, 'iron', 'store.meat-rail', { role: 'structure', blocksTraversal: false }),
    beam([-5.2, 0, 0], [-5.2, 4.25, 0], 0.12, 'ironDark', `${name}:support-left`, { role: 'structure', blocksTraversal: true }),
    beam([5.2, 0, 0], [5.2, 4.25, 0], 0.12, 'ironDark', `${name}:support-right`, { role: 'structure', blocksTraversal: true })
  );
  const hooks = mostlyEmpty ? 8 : count;
  for (let index = 0; index < hooks; index += 1) {
    const x = -4.4 + index * (8.8 / Math.max(1, hooks - 1));
    const hookChain = chain([x, 4.15, 0], [x, 3.35 - (index % 2) * 0.2, 0], 5, `${name}:hook-chain`, { animation: 'chain-sway', phase: index * 0.41 });
    delete hookChain.userData.animation;
    rail.add(hookChain);
    rail.add(torus(0.16, 0.035, 'iron', `${name}:hook`, [x, 3.18 - (index % 2) * 0.2, 0], [0, 0, Math.PI / 2]));
    if (!mostlyEmpty || index < count) {
      const bundle = meatBundle(`${name}:ration-bundle`, [x, 2.25 - (index % 2) * 0.2, 0], { dry: index % 3 === 0, phase: index * 0.57, radius: 0.42, length: 1.25 + (index % 3) * 0.15 });
      delete bundle.userData.animation;
      rail.add(bundle);
      if (infested && index % 2 === 0) {
        const cluster = parasiteCluster(`${name}:parasite-cluster`, [x + 0.18, 2.2, 0.2], { count: 3, phase: index * 0.6 });
        delete cluster.userData.animation;
        rail.add(cluster);
      }
    }
  }
  rail.userData.animation = 'hook-sway';
  rail.userData.phase = 0.35;
  root.add(rail);
}
