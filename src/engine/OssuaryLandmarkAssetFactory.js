import { THREE } from './ThreeScene.js';

const BUNDLES = new Set([
  'ossuary.chapel.funeral',
  'ossuary.shelves.working',
  'ossuary.well.last-names'
]);

const C = Object.freeze({
  limestone: 0x77716b,
  oldStone: 0x4b474d,
  blackStone: 0x24242a,
  bone: 0xd0c4aa,
  oldBone: 0x9b8d72,
  iron: 0x42464e,
  silver: 0x9aa2ad,
  brass: 0xa57b39,
  blackCloth: 0x17161b,
  funeralPurple: 0x49344f,
  holyIvory: 0xd8cfb7,
  holyBlue: 0x8ec8d7,
  soulCyan: 0x65bfd1,
  soulViolet: 0x9a72d4,
  deathGreen: 0x5b927a,
  redWax: 0x8f3437,
  parchment: 0xc5aa77,
  glassBlue: 0x517fa8,
  glassRed: 0x8f3f47,
  glassGold: 0xc18b45,
  ash: 0x5e595c,
  void: 0x08090e
});

export class OssuaryLandmarkAssetFactory {
  create(bundleId, context = {}) {
    if (!BUNDLES.has(bundleId)) return null;
    const state = context.state ?? context.stateVariant ?? null;
    const root = new THREE.Group();
    root.name = `ossuary-landmark:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.state = state;

    if (bundleId === 'ossuary.chapel.funeral') buildFuneralChapel(root, state ?? 'dormant');
    if (bundleId === 'ossuary.shelves.working') buildOssuaryShelves(root, state ?? 'ordered');
    if (bundleId === 'ossuary.well.last-names') buildLastNamesWell(root, state ?? 'quiet');
    return root;
  }
}

function buildFuneralChapel(root, state) {
  const nave = box(14.8, 0.22, 9.6, C.oldStone, 0.94);
  nave.position.y = 0.11;
  root.add(nave);

  const centralRunner = box(2.35, 0.045, 8.8, state === 'purified' ? C.holyIvory : C.blackCloth, 0.96);
  centralRunner.position.y = 0.245;
  centralRunner.name = 'funeral-runner';
  root.add(centralRunner);

  buildChapelArcades(root, state);

  const altar = makeFuneralAltar(state);
  altar.position.set(0, 0, -3.7);
  altar.name = 'funeral-altar';
  root.add(altar);

  const catafalque = makeCatafalque(state);
  catafalque.position.set(0, 0, 0.15);
  catafalque.name = 'royal-catafalque';
  root.add(catafalque);

  const bell = makeFuneralBell(state);
  bell.position.set(-5.8, 0, -2.7);
  bell.name = 'funeral-bell';
  root.add(bell);

  const font = makeHolyWaterFont(state);
  font.position.set(5.8, 0, -2.55);
  font.name = 'holy-water-font';
  root.add(font);

  for (const side of [-1, 1]) {
    const stalls = makeChoirStalls(side, state);
    stalls.position.set(side * 4.7, 0, 0.9);
    stalls.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    stalls.name = 'choir-stalls';
    root.add(stalls);
  }

  const window = makeBrokenRoseWindow(state);
  window.position.set(0, 4.1, -4.75);
  window.name = 'broken-stained-glass';
  root.add(window);

  for (let index = 0; index < 10; index += 1) {
    const candle = makeFuneralCandle(state, index);
    const side = index % 2 ? -1 : 1;
    candle.position.set(side * (1.55 + Math.floor(index / 4) * 1.15), 0.28, -2.55 + (index % 5) * 1.35);
    root.add(candle);
  }

  if (state === 'dormant') addDormantChapelState(root);
  if (state === 'choir-active') addActiveChoirState(root);
  if (state === 'purified') addPurifiedChapelState(root);
}

function buildChapelArcades(root, state) {
  for (const side of [-1, 1]) {
    const wall = box(0.42, 5.25, 9.6, C.blackStone, 0.95);
    wall.position.set(side * 7.18, 2.62, 0);
    root.add(wall);
    for (let bay = 0; bay < 5; bay += 1) {
      const z = -3.65 + bay * 1.82;
      const column = makeBoneColumn(state === 'purified' ? C.holyIvory : C.oldBone, bay);
      column.position.set(side * 6.58, 0, z);
      root.add(column);
      const niche = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14, 0, Math.PI), standard(C.void, 1));
      niche.position.set(side * 6.94, 2.55, z);
      niche.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      niche.rotation.z = Math.PI / 2;
      root.add(niche);
    }
  }
  const apse = box(14.75, 5.4, 0.52, C.blackStone, 0.96);
  apse.position.set(0, 2.7, -4.78);
  root.add(apse);
}

function makeBoneColumn(color, seed) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.25, 10), standard(C.oldStone, 0.92));
  core.position.y = 2.25;
  group.add(core);
  for (let tier = 0; tier < 9; tier += 1) {
    const y = 0.42 + tier * 0.45;
    const skull = makeSkull(color, seed + tier);
    skull.scale.setScalar(0.58 + (tier % 2) * 0.05);
    skull.position.set(tier % 2 ? 0.22 : -0.22, y, 0);
    skull.rotation.y = tier % 2 ? 0.38 : -0.38;
    group.add(skull);
    const crossBone = makeCrossedBones(color, 0.48);
    crossBone.position.set(0, y - 0.05, tier % 2 ? 0.18 : -0.18);
    crossBone.rotation.y = tier * 0.62;
    group.add(crossBone);
  }
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.32, 0.34, 8), standard(C.limestone, 0.88));
  capital.position.y = 4.46;
  group.add(capital);
  return group;
}

function makeFuneralAltar(state) {
  const group = new THREE.Group();
  const steps = [[6.6, 0.28, 2.65, 0.14], [5.65, 0.3, 2.1, 0.43], [4.7, 0.35, 1.62, 0.75]];
  for (const [w, h, d, y] of steps) {
    const step = box(w, h, d, C.limestone, 0.9);
    step.position.y = y;
    group.add(step);
  }
  const altar = box(4.4, 1.25, 1.2, state === 'purified' ? C.holyIvory : C.oldStone, 0.86);
  altar.position.y = 1.48;
  group.add(altar);
  const slab = box(4.85, 0.2, 1.48, C.blackStone, 0.9);
  slab.position.y = 2.16;
  group.add(slab);
  const cloth = box(2.8, 0.07, 1.55, state === 'purified' ? C.holyBlue : C.blackCloth, 0.96);
  cloth.position.set(0, 2.31, 0.05);
  group.add(cloth);
  const reliquary = makeReliquary(state);
  reliquary.position.set(0, 2.34, -0.05);
  group.add(reliquary);
  for (const x of [-1.75, 1.75]) {
    const candle = makeFuneralCandle(state, x > 0 ? 2 : 1);
    candle.position.set(x, 2.25, 0.02);
    group.add(candle);
  }
  if (state === 'dormant') {
    const crack = box(3.8, 0.045, 0.1, C.void, 1);
    crack.position.set(0, 2.42, 0.22);
    crack.rotation.y = 0.14;
    group.add(crack);
  }
  return group;
}

function makeReliquary(state) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.26, 10), standard(C.brass, 0.5, 0.68));
  base.position.y = 0.13;
  group.add(base);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), emissive(state === 'purified' ? C.holyBlue : C.soulViolet, 0.7));
  crystal.position.y = 0.72;
  crystal.name = 'death-energy-reliquary';
  group.add(crystal);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 6, 18), standard(C.silver, 0.5, 0.72));
  cage.rotation.x = Math.PI / 2;
  cage.position.y = 0.72;
  group.add(cage);
  return group;
}

function makeCatafalque(state) {
  const group = new THREE.Group();
  const platform = box(5.3, 0.48, 2.7, C.blackStone, 0.92);
  platform.position.y = 0.3;
  group.add(platform);
  for (const x of [-2.2, 2.2]) {
    for (const z of [-1.05, 1.05]) {
      const bearer = makeSkull(state === 'purified' ? C.holyIvory : C.oldBone, x + z);
      bearer.scale.setScalar(0.78);
      bearer.position.set(x, 0.55, z);
      bearer.rotation.y = z > 0 ? Math.PI : 0;
      group.add(bearer);
    }
  }
  const coffin = box(3.95, 0.88, 1.62, state === 'purified' ? C.holyIvory : C.blackCloth, 0.9);
  coffin.position.y = 1.05;
  group.add(coffin);
  const lid = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.55, 5, 10), standard(state === 'purified' ? C.limestone : C.oldStone, 0.86));
  lid.rotation.z = Math.PI / 2;
  lid.scale.set(0.82, 1, 0.42);
  lid.position.y = 1.63;
  group.add(lid);
  const royalMark = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.48, 8), standard(C.brass, 0.48, 0.7));
  royalMark.rotation.x = -Math.PI / 2;
  royalMark.position.set(0, 1.99, 0);
  group.add(royalMark);
  for (let index = 0; index < 4; index += 1) {
    const chain = makeChain(7, 0.11);
    chain.position.set(-1.65 + index * 1.1, 2.9, index % 2 ? 0.72 : -0.72);
    chain.name = 'hanging-prop';
    group.add(chain);
  }
  return group;
}

function makeFuneralBell(state) {
  const group = new THREE.Group();
  for (const x of [-1.0, 1.0]) {
    const post = box(0.24, 4.15, 0.24, C.oldStone, 0.92);
    post.position.set(x, 2.08, 0);
    group.add(post);
  }
  const beam = box(2.4, 0.28, 0.32, C.iron, 0.66, 0.7);
  beam.position.y = 4.05;
  group.add(beam);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.02, 1.35, 16, 1, true), standard(state === 'purified' ? C.silver : C.brass, 0.44, 0.78));
  bell.position.y = 3.0;
  bell.name = 'hanging-prop';
  group.add(bell);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 7, 18), standard(C.brass, 0.45, 0.75));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 2.35;
  group.add(lip);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), standard(C.iron, 0.62, 0.72));
  clapper.position.y = 2.15;
  clapper.name = 'hanging-prop';
  group.add(clapper);
  const rope = makeChain(11, 0.08);
  rope.position.set(0.72, 2.8, 0.15);
  group.add(rope);
  return group;
}

function makeHolyWaterFont(state) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.0, 0.55, 10), standard(C.oldStone, 0.9));
  base.position.y = 0.28;
  group.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 1.35, 10), standard(C.limestone, 0.88));
  stem.position.y = 1.2;
  group.add(stem);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.72, 0.52, 14, 1, true), standard(C.brass, 0.5, 0.65));
  basin.position.y = 2.05;
  group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.08, 16), transparent(state === 'purified' ? C.holyBlue : C.soulViolet, state === 'dormant' ? 0.25 : 0.68));
  water.position.y = 2.0;
  water.name = 'water-surface';
  group.add(water);
  for (let index = 0; index < 6; index += 1) {
    const nameTile = box(0.35, 0.06, 0.2, C.parchment, 0.88);
    const angle = index * Math.PI / 3;
    nameTile.position.set(Math.cos(angle) * 1.35, 0.34, Math.sin(angle) * 1.35);
    nameTile.rotation.y = -angle;
    group.add(nameTile);
  }
  return group;
}

function makeChoirStalls(side, state) {
  const group = new THREE.Group();
  for (let seat = 0; seat < 6; seat += 1) {
    const chair = box(0.78, 1.25, 0.72, C.blackStone, 0.94);
    chair.position.set(-2.5 + seat, 0.62, 0);
    group.add(chair);
    const crest = makeSkull(state === 'purified' ? C.holyIvory : C.oldBone, side * seat);
    crest.scale.setScalar(0.38);
    crest.position.set(-2.5 + seat, 1.42, -0.32);
    group.add(crest);
  }
  const rail = box(6.3, 0.18, 0.28, C.brass, 0.5, 0.7);
  rail.position.set(0, 1.15, -0.55);
  group.add(rail);
  return group;
}

function makeBrokenRoseWindow(state) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.18, 8, 24), standard(C.blackStone, 0.94));
  group.add(frame);
  for (let index = 0; index < 12; index += 1) {
    const angle = index * Math.PI / 6;
    if (state === 'dormant' && index % 4 === 0) continue;
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.65, 3), transparent(index % 3 === 0 ? C.glassGold : index % 2 ? C.glassBlue : C.glassRed, state === 'purified' ? 0.72 : 0.42));
    pane.position.set(Math.cos(angle) * 1.28, Math.sin(angle) * 1.28, -0.08);
    pane.rotation.z = angle;
    group.add(pane);
    const spoke = box(0.12, 2.05, 0.12, C.iron, 0.65, 0.7);
    spoke.position.set(Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0);
    spoke.rotation.z = angle;
    group.add(spoke);
  }
  return group;
}

function makeFuneralCandle(state, seed) {
  const group = new THREE.Group();
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42 + (seed % 3) * 0.12, 7), standard(state === 'purified' ? C.holyIvory : C.oldBone, 0.95));
  wax.position.y = 0.22 + (seed % 3) * 0.06;
  group.add(wax);
  if (state !== 'dormant') {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 7), emissive(state === 'purified' ? C.holyBlue : C.soulViolet, 0.62));
    flame.position.y = 0.56 + (seed % 3) * 0.12;
    flame.name = 'landmark-flame';
    group.add(flame);
  }
  return group;
}

function addDormantChapelState(root) {
  for (let index = 0; index < 12; index += 1) {
    const shard = new THREE.Mesh(new THREE.CircleGeometry(0.22 + (index % 3) * 0.08, 3), transparent(index % 2 ? C.glassBlue : C.glassRed, 0.35));
    shard.rotation.x = -Math.PI / 2;
    shard.rotation.z = index * 0.48;
    shard.position.set(-5.5 + index * 0.95, 0.27, -2.4 + (index % 4) * 1.45);
    root.add(shard);
  }
  for (let index = 0; index < 8; index += 1) {
    const ash = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 3) * 0.04, 0), standard(C.ash, 1));
    ash.position.set(-3.2 + index * 0.85, 0.31, index % 2 ? 3.6 : -3.4);
    root.add(ash);
  }
}

function addActiveChoirState(root) {
  for (let index = 0; index < 12; index += 1) {
    const ghost = makeGhostChoirFigure(index);
    const side = index < 6 ? -1 : 1;
    ghost.position.set(side * (3.45 + (index % 2) * 0.5), 0.3, -2.9 + (index % 6) * 1.15);
    ghost.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    ghost.name = 'hanging-prop';
    root.add(ghost);
  }
  for (let index = 0; index < 7; index += 1) {
    const ribbon = makeSoulRibbon(index);
    ribbon.position.set(-3.2 + index * 1.05, 2.2 + (index % 3) * 0.42, -0.8 + (index % 2) * 1.5);
    ribbon.name = 'hanging-prop';
    root.add(ribbon);
  }
}

function makeGhostChoirFigure(seed) {
  const group = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.46 + (seed % 2) * 0.08, 1.65, 8), transparent(seed % 2 ? C.soulCyan : C.soulViolet, 0.36));
  robe.position.y = 0.82;
  group.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), transparent(C.holyIvory, 0.42));
  head.position.y = 1.78;
  group.add(head);
  const book = box(0.58, 0.08, 0.42, C.parchment, 0.9);
  book.position.set(0, 1.18, -0.42);
  book.rotation.x = -0.3;
  group.add(book);
  return group;
}

function makeSoulRibbon(seed) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(-0.1, 0.35 + seed % 2 * 0.12, 0.2),
    new THREE.Vector3(0.35, 0.65, -0.1),
    new THREE.Vector3(0.65, 1.0, 0.15)
  ]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 6, false), emissive(seed % 2 ? C.soulCyan : C.soulViolet, 0.48));
}

function addPurifiedChapelState(root) {
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const banner = makeMemorialBanner(index);
      banner.position.set(side * 6.55, 2.25, -3.1 + index * 2.05);
      banner.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      banner.name = 'hanging-prop';
      root.add(banner);
    }
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 8, 32), emissive(C.holyBlue, 0.55));
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.3, -3.65);
  root.add(halo);
}

function makeMemorialBanner(seed) {
  const group = new THREE.Group();
  const cloth = box(1.05, 1.9, 0.05, seed % 2 ? C.holyIvory : C.holyBlue, 0.96);
  cloth.position.y = 0.95;
  group.add(cloth);
  for (let index = 0; index < 5; index += 1) {
    const line = box(0.55 + (index % 2) * 0.18, 0.045, 0.025, C.brass, 0.48, 0.68);
    line.position.set(0, 0.45 + index * 0.25, -0.045);
    group.add(line);
  }
  return group;
}

function buildOssuaryShelves(root, state) {
  const floor = box(16.2, 0.22, 10.8, C.oldStone, 0.95);
  floor.position.y = 0.11;
  root.add(floor);
  const centerLane = box(4.0, 0.045, 10.2, C.blackStone, 0.97);
  centerLane.position.y = 0.245;
  root.add(centerLane);
  for (const side of [-1, 1]) {
    for (let section = 0; section < 4; section += 1) {
      const shelf = makeOssuaryShelf(section, state);
      shelf.position.set(side * 6.2, 0, -3.75 + section * 2.5);
      shelf.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      shelf.name = 'ossuary-shelf-wall';
      root.add(shelf);
    }
  }
  for (let island = 0; island < 3; island += 1) {
    const freestanding = makeFreestandingBoneRack(island, state);
    freestanding.position.set(-2.4 + island * 2.4, 0, -1.8 + island % 2 * 3.6);
    freestanding.rotation.y = island % 2 ? 0.12 : -0.14;
    root.add(freestanding);
  }
  const assembly = makeSkeletonAssemblyTable(state);
  assembly.position.set(0, 0, 3.55);
  assembly.name = 'skeleton-assembly-table';
  root.add(assembly);
  const cart = makeBoneCart(state);
  cart.position.set(-3.4, 0, 2.8);
  cart.rotation.y = 0.35;
  cart.name = 'bone-cart';
  root.add(cart);
  const ladder = makeRollingLadder();
  ladder.position.set(5.1, 0, 0.45);
  ladder.rotation.y = -Math.PI / 2;
  ladder.name = 'ladder-rail';
  root.add(ladder);
  const catalogDesk = makeOssuaryCatalogDesk(state);
  catalogDesk.position.set(3.25, 0, 3.55);
  catalogDesk.name = 'experiment-catalog';
  root.add(catalogDesk);
  if (state === 'ordered') addOrderedOssuaryState(root);
  if (state === 'spawning') addSpawningOssuaryState(root);
  if (state === 'collapsed') addCollapsedOssuaryState(root);
}

function makeOssuaryShelf(seed, state) {
  const group = new THREE.Group();
  const frame = box(5.0, 4.75, 0.72, C.blackStone, 0.96);
  frame.position.y = 2.38;
  group.add(frame);
  const back = box(4.7, 4.45, 0.18, C.oldStone, 0.94);
  back.position.set(0, 2.38, 0.34);
  group.add(back);
  for (let row = 0; row < 5; row += 1) {
    const shelfBoard = box(4.65, 0.12, 0.88, C.iron, 0.66, 0.68);
    shelfBoard.position.set(0, 0.45 + row * 0.88, -0.08);
    group.add(shelfBoard);
    for (let col = 0; col < 7; col += 1) {
      if (state === 'collapsed' && (row + col + seed) % 5 === 0) continue;
      const compartment = box(0.56, 0.7, 0.55, C.oldStone, 0.94);
      compartment.position.set(-1.92 + col * 0.64, 0.82 + row * 0.88, -0.02);
      group.add(compartment);
      const contents = makeShelfContents(seed, row, col, state);
      contents.position.set(compartment.position.x, compartment.position.y, -0.36);
      group.add(contents);
    }
  }
  for (const x of [-2.28, 2.28]) {
    const pilaster = makeBoneColumn(C.oldBone, seed + x);
    pilaster.scale.setScalar(0.54);
    pilaster.position.set(x, 0, -0.48);
    group.add(pilaster);
  }
  return group;
}

function makeShelfContents(seed, row, col, state) {
  const group = new THREE.Group();
  const selector = (seed + row * 3 + col) % 4;
  if (selector === 0) {
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.48, 8), standard(C.oldBone, 0.9));
    group.add(urn);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 8), standard(C.brass, 0.5, 0.65));
    lid.position.y = 0.3;
    group.add(lid);
    const tag = box(0.24, 0.1, 0.035, state === 'spawning' ? C.redWax : C.parchment, 0.86);
    tag.position.set(0, -0.08, -0.22);
    tag.name = 'experiment-number-urn';
    group.add(tag);
  } else if (selector === 1) {
    const skull = makeSkull(C.bone, seed + row + col);
    skull.scale.setScalar(0.52);
    group.add(skull);
  } else if (selector === 2) {
    const bundle = makeCrossedBones(C.oldBone, 0.54);
    bundle.rotation.z = row % 2 ? 0.2 : -0.16;
    group.add(bundle);
  } else {
    for (let index = 0; index < 3; index += 1) {
      const vertebra = new THREE.Mesh(new THREE.TorusGeometry(0.11 + index * 0.015, 0.035, 5, 9), standard(C.oldBone, 0.9));
      vertebra.rotation.x = Math.PI / 2;
      vertebra.position.y = -0.16 + index * 0.16;
      group.add(vertebra);
    }
  }
  return group;
}

function makeFreestandingBoneRack(seed, state) {
  const group = new THREE.Group();
  for (const x of [-1.0, 1.0]) {
    const post = box(0.18, 3.55, 0.18, C.iron, 0.65, 0.7);
    post.position.set(x, 1.78, 0);
    group.add(post);
  }
  for (let row = 0; row < 4; row += 1) {
    const rail = box(2.2, 0.12, 0.72, C.blackStone, 0.96);
    rail.position.set(0, 0.52 + row * 0.82, 0);
    group.add(rail);
    for (let col = 0; col < 4; col += 1) {
      const skull = makeSkull(state === 'spawning' ? C.bone : C.oldBone, seed + row + col);
      skull.scale.setScalar(0.46);
      skull.position.set(-0.72 + col * 0.48, 0.76 + row * 0.82, -0.22);
      group.add(skull);
    }
  }
  return group;
}

function makeSkeletonAssemblyTable(state) {
  const group = new THREE.Group();
  const table = box(4.3, 0.24, 1.75, C.blackStone, 0.95);
  table.position.y = 1.05;
  group.add(table);
  for (const x of [-1.75, 1.75]) {
    for (const z of [-0.62, 0.62]) {
      const leg = box(0.2, 1.0, 0.2, C.iron, 0.65, 0.7);
      leg.position.set(x, 0.5, z);
      group.add(leg);
    }
  }
  const spine = makeSpine(8, state === 'spawning' ? C.bone : C.oldBone);
  spine.rotation.z = Math.PI / 2;
  spine.position.set(-0.5, 1.3, 0);
  group.add(spine);
  const skull = makeSkull(C.bone, 4);
  skull.scale.setScalar(0.8);
  skull.position.set(1.25, 1.38, 0);
  skull.rotation.y = -0.4;
  group.add(skull);
  for (let index = 0; index < 6; index += 1) {
    const tool = box(0.05, 0.05, 0.65 + (index % 3) * 0.2, index % 2 ? C.silver : C.brass, 0.52, 0.72);
    tool.position.set(-1.6 + index * 0.55, 1.22, -0.55 + (index % 2) * 1.1);
    tool.rotation.y = index * 0.32;
    group.add(tool);
  }
  if (state === 'spawning') {
    const rune = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 16), emissive(C.soulViolet, 0.52));
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.25;
    group.add(rune);
  }
  return group;
}

function makeBoneCart(state) {
  const group = new THREE.Group();
  const bed = box(2.2, 0.72, 1.35, C.iron, 0.7, 0.65);
  bed.position.y = 0.68;
  group.add(bed);
  for (const x of [-0.88, 0.88]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.075, 7, 16), standard(C.iron, 0.62, 0.72));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.35, 0);
    group.add(wheel);
  }
  for (let index = 0; index < 12; index += 1) {
    const bone = makeBone(0.7 + (index % 4) * 0.13, state === 'spawning' ? C.bone : C.oldBone);
    bone.position.set(-0.78 + (index % 4) * 0.5, 1.05 + Math.floor(index / 4) * 0.14, -0.45 + (index % 3) * 0.42);
    bone.rotation.set(index * 0.13, index * 0.36, index % 2 ? 0.42 : -0.38);
    group.add(bone);
  }
  const handle = box(1.85, 0.14, 0.14, C.iron, 0.65, 0.7);
  handle.position.set(1.85, 0.95, 0);
  handle.rotation.z = -0.14;
  group.add(handle);
  return group;
}

function makeRollingLadder() {
  const group = new THREE.Group();
  for (const x of [-0.48, 0.48]) {
    const rail = box(0.14, 4.25, 0.14, C.iron, 0.65, 0.7);
    rail.position.set(x, 2.12, 0);
    rail.rotation.z = x > 0 ? 0.1 : -0.1;
    group.add(rail);
  }
  for (let rung = 0; rung < 9; rung += 1) {
    const step = box(0.92, 0.1, 0.24, C.oldStone, 0.9);
    step.position.set(0, 0.42 + rung * 0.43, 0);
    group.add(step);
  }
  const topRail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), standard(C.iron, 0.65, 0.7));
  topRail.rotation.y = Math.PI / 2;
  topRail.position.y = 4.25;
  group.add(topRail);
  return group;
}

function makeOssuaryCatalogDesk(state) {
  const group = new THREE.Group();
  const desk = box(2.6, 0.2, 1.25, C.blackStone, 0.96);
  desk.position.y = 0.92;
  group.add(desk);
  for (const x of [-1.0, 1.0]) {
    const pedestal = box(0.46, 0.9, 1.0, C.oldStone, 0.94);
    pedestal.position.set(x, 0.45, 0);
    group.add(pedestal);
  }
  const ledger = box(1.25, 0.08, 0.78, C.parchment, 0.88);
  ledger.position.set(-0.35, 1.08, 0);
  ledger.rotation.y = -0.18;
  group.add(ledger);
  for (let index = 0; index < 8; index += 1) {
    const tag = box(0.28, 0.055, 0.16, state === 'spawning' ? C.redWax : C.parchment, 0.88);
    tag.position.set(0.55 + (index % 2) * 0.38, 1.05 + Math.floor(index / 2) * 0.08, -0.3 + (index % 3) * 0.28);
    tag.rotation.y = index * 0.21;
    group.add(tag);
  }
  return group;
}

function addOrderedOssuaryState(root) {
  for (let index = 0; index < 12; index += 1) {
    const marker = box(0.34, 0.07, 0.18, C.parchment, 0.88);
    marker.position.set(-5.4 + (index % 6) * 2.15, 0.28, index < 6 ? -4.25 : 4.25);
    marker.rotation.y = index < 6 ? 0 : Math.PI;
    root.add(marker);
  }
}

function addSpawningOssuaryState(root) {
  for (let index = 0; index < 9; index += 1) {
    const skeleton = makeRisingSkeleton(index);
    const angle = index * Math.PI * 2 / 9;
    skeleton.position.set(Math.cos(angle) * (2.5 + index % 3 * 0.55), 0.22, Math.sin(angle) * (2.3 + index % 2 * 0.7));
    skeleton.rotation.y = -angle;
    skeleton.name = 'spawning-skeleton';
    root.add(skeleton);
  }
  for (let index = 0; index < 6; index += 1) {
    const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 + index % 3 * 0.025, 0), emissive(index % 2 ? C.soulCyan : C.soulViolet, 0.58));
    mote.position.set(-2.5 + index, 1.5 + index % 3 * 0.55, -0.8 + index % 2 * 1.6);
    mote.name = 'hanging-prop';
    root.add(mote);
  }
}

function makeRisingSkeleton(seed) {
  const group = new THREE.Group();
  const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 5, 10), standard(C.bone, 0.88));
  pelvis.rotation.x = Math.PI / 2;
  pelvis.position.y = 0.75;
  group.add(pelvis);
  const spine = makeSpine(5, C.bone);
  spine.position.y = 0.9;
  group.add(spine);
  const skull = makeSkull(C.bone, seed);
  skull.scale.setScalar(0.62);
  skull.position.y = 1.75;
  group.add(skull);
  for (const side of [-1, 1]) {
    const arm = makeBone(0.9, C.bone);
    arm.position.set(side * 0.48, 1.35, 0);
    arm.rotation.z = side * (0.55 + seed % 2 * 0.15);
    group.add(arm);
  }
  return group;
}

function addCollapsedOssuaryState(root) {
  for (let index = 0; index < 26; index += 1) {
    const angle = deterministic(`ossuary-collapse:${index}`) * Math.PI * 2;
    const radius = 1.8 + deterministic(`ossuary-collapse-radius:${index}`) * 6.7;
    const debris = index % 4 === 0
      ? box(0.2, 1.2 + (index % 5) * 0.35, 0.22, C.iron, 0.68, 0.68)
      : index % 3 === 0
        ? makeSkull(C.oldBone, index)
        : makeBone(0.65 + (index % 4) * 0.22, C.oldBone);
    debris.position.set(Math.cos(angle) * radius, 0.36 + (index % 3) * 0.08, Math.sin(angle) * radius * 0.7);
    debris.rotation.set(index * 0.15, angle, index % 2 ? 0.75 : -0.62);
    root.add(debris);
  }
  for (let index = 0; index < 5; index += 1) {
    const brokenShelf = box(3.0 + index * 0.2, 0.22, 0.65, C.blackStone, 0.96);
    brokenShelf.position.set(-4.5 + index * 2.25, 0.45 + index % 2 * 0.32, -1.8 + index % 3 * 1.7);
    brokenShelf.rotation.set(index * 0.08, index * 0.47, index % 2 ? 0.28 : -0.25);
    root.add(brokenShelf);
  }
}

function buildLastNamesWell(root, state) {
  const floor = box(13.6, 0.22, 13.6, C.blackStone, 0.98);
  floor.position.y = 0.11;
  root.add(floor);
  for (let ring = 0; ring < 4; ring += 1) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(5.45 - ring * 0.72, 5.7 - ring * 0.72, 0.28, 16), standard(ring % 2 ? C.oldStone : C.limestone, 0.92));
    step.position.y = 0.28 + ring * 0.24;
    root.add(step);
  }
  const well = makeDeathWell(state);
  well.position.y = 0.92;
  well.name = 'death-well';
  root.add(well);
  const pulley = makeBonePulley(state);
  pulley.position.set(0, 0.75, 0);
  pulley.name = 'bone-pulley';
  root.add(pulley);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const crystal = makeDeathCrystal(state, index);
    crystal.position.set(Math.cos(angle) * 4.25, 0.9, Math.sin(angle) * 4.25);
    crystal.rotation.y = -angle;
    crystal.name = 'death-crystal';
    root.add(crystal);
  }
  for (let ring = 0; ring < 5; ring += 1) {
    const soulRing = new THREE.Mesh(new THREE.TorusGeometry(1.25 + ring * 0.55, 0.055 + ring * 0.006, 7, 28), emissive(state === 'sealed' ? C.silver : ring % 2 ? C.soulViolet : C.soulCyan, state === 'sealed' ? 0.18 : 0.5));
    soulRing.rotation.x = Math.PI / 2;
    soulRing.position.y = 2.15 + ring * 0.54;
    soulRing.name = 'soul-ring';
    root.add(soulRing);
  }
  const conduit = makeRoyalConduit(state);
  conduit.position.set(0, 0.45, -5.0);
  conduit.name = 'royal-conduit';
  root.add(conduit);
  const nameArchive = makeLastNamesArchive(state);
  nameArchive.position.set(4.7, 0, 3.2);
  nameArchive.rotation.y = -0.72;
  nameArchive.name = 'last-names-archive';
  root.add(nameArchive);
  if (state === 'quiet') addQuietWellState(root);
  if (state === 'overflowing') addOverflowingWellState(root);
  if (state === 'sealed') addSealedWellState(root);
}

function makeDeathWell(state) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.45, 1.5, 16, 1, true), standard(C.oldStone, 0.94));
  outer.position.y = 0.75;
  group.add(outer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.28, 8, 24), standard(C.limestone, 0.88));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.48;
  group.add(rim);
  const voidDisk = new THREE.Mesh(new THREE.CircleGeometry(2.82, 24), transparent(state === 'sealed' ? C.iron : C.void, state === 'sealed' ? 0.9 : 0.98));
  voidDisk.rotation.x = -Math.PI / 2;
  voidDisk.position.y = 1.37;
  voidDisk.name = 'water-surface';
  group.add(voidDisk);
  for (let index = 0; index < 16; index += 1) {
    const angle = index * Math.PI / 8;
    const namePlate = box(0.72, 0.08, 0.28, index % 3 === 0 ? C.brass : C.parchment, 0.84, index % 3 === 0 ? 0.58 : 0.02);
    namePlate.position.set(Math.cos(angle) * 3.65, 1.62, Math.sin(angle) * 3.65);
    namePlate.rotation.y = -angle;
    group.add(namePlate);
  }
  return group;
}

function makeBonePulley(state) {
  const group = new THREE.Group();
  for (const x of [-2.25, 2.25]) {
    const tower = makeBoneColumn(state === 'sealed' ? C.silver : C.oldBone, x);
    tower.scale.setScalar(0.92);
    tower.position.set(x, 0, 0);
    group.add(tower);
  }
  const beam = box(5.4, 0.34, 0.4, C.iron, 0.62, 0.72);
  beam.position.y = 4.55;
  group.add(beam);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.12, 8, 22), standard(C.brass, 0.45, 0.75));
  wheel.rotation.y = Math.PI / 2;
  wheel.position.y = 4.35;
  group.add(wheel);
  for (let index = 0; index < 10; index += 1) {
    const spoke = box(0.055, 0.055, 1.6, C.brass, 0.48, 0.72);
    spoke.position.y = 4.35;
    spoke.rotation.x = index * Math.PI / 5;
    group.add(spoke);
  }
  const chain = makeChain(21, 0.13);
  chain.position.set(0, 4.2, 0);
  chain.name = 'hanging-prop';
  group.add(chain);
  const cage = makeSoulCage(state);
  cage.position.set(0, -0.1, 0);
  cage.name = 'hanging-prop';
  chain.add(cage);
  return group;
}

function makeSoulCage(state) {
  const group = new THREE.Group();
  for (let ring = 0; ring < 3; ring += 1) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.62 - ring * 0.1, 0.055, 6, 16), standard(C.iron, 0.62, 0.72));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = ring * 0.42;
    group.add(hoop);
  }
  for (let index = 0; index < 8; index += 1) {
    const bar = box(0.05, 1.05, 0.05, C.iron, 0.62, 0.72);
    const angle = index * Math.PI / 4;
    bar.position.set(Math.cos(angle) * 0.5, 0.42, Math.sin(angle) * 0.5);
    group.add(bar);
  }
  const soul = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), emissive(state === 'sealed' ? C.silver : C.soulCyan, state === 'sealed' ? 0.2 : 0.68));
  soul.position.y = 0.42;
  group.add(soul);
  return group;
}

function makeDeathCrystal(state, seed) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.68, 0.55, 8), standard(C.oldStone, 0.94));
  plinth.position.y = 0.28;
  group.add(plinth);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42 + (seed % 3) * 0.07, 0), emissive(state === 'sealed' ? C.silver : seed % 2 ? C.soulViolet : C.deathGreen, state === 'sealed' ? 0.16 : 0.62));
  crystal.position.y = 1.05;
  crystal.rotation.y = seed * 0.42;
  group.add(crystal);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 6, 16), standard(C.brass, 0.48, 0.7));
  cage.rotation.x = Math.PI / 2;
  cage.position.y = 1.05;
  group.add(cage);
  return group;
}

function makeRoyalConduit(state) {
  const group = new THREE.Group();
  const trench = box(3.1, 0.42, 2.2, C.blackStone, 0.98);
  trench.position.y = 0.21;
  group.add(trench);
  for (let index = 0; index < 5; index += 1) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12 + index * 0.02, 0.12 + index * 0.02, 4.2, 8), standard(index % 2 ? C.brass : C.iron, 0.55, 0.72));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(-1.05 + index * 0.52, 0.45, -0.8);
    group.add(pipe);
  }
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 7, 18), standard(C.brass, 0.48, 0.72));
  valve.position.set(0, 1.25, 0.2);
  valve.name = 'royal-conduit-valve';
  group.add(valve);
  if (state !== 'sealed') {
    const flow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.25, 0.9),
      new THREE.Vector3(0, 0.45, 0),
      new THREE.Vector3(0, 0.65, -1.2)
    ]), 12, 0.13, 7, false), emissive(C.soulCyan, 0.42));
    group.add(flow);
  }
  return group;
}

function makeLastNamesArchive(state) {
  const group = new THREE.Group();
  const desk = box(2.7, 0.2, 1.2, C.blackStone, 0.96);
  desk.position.y = 0.92;
  group.add(desk);
  for (const x of [-1.05, 1.05]) {
    const base = box(0.38, 0.9, 0.95, C.oldStone, 0.94);
    base.position.set(x, 0.45, 0);
    group.add(base);
  }
  const ledger = box(1.35, 0.08, 0.78, state === 'sealed' ? C.silver : C.parchment, 0.86);
  ledger.position.set(-0.35, 1.08, 0);
  ledger.rotation.y = -0.2;
  group.add(ledger);
  for (let index = 0; index < 9; index += 1) {
    const tag = box(0.34 + (index % 3) * 0.07, 0.05, 0.18, index % 3 === 0 ? C.redWax : C.parchment, 0.88);
    tag.position.set(0.3 + (index % 3) * 0.35, 1.05 + Math.floor(index / 3) * 0.08, -0.38 + (index % 2) * 0.36);
    tag.rotation.y = index * 0.24;
    group.add(tag);
  }
  const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 8), standard(C.void, 0.7));
  ink.position.set(0.62, 1.14, 0.3);
  group.add(ink);
  return group;
}

function addQuietWellState(root) {
  for (let index = 0; index < 10; index += 1) {
    const candle = makeFuneralCandle('choir-active', index);
    const angle = index * Math.PI / 5;
    candle.position.set(Math.cos(angle) * 5.1, 0.26, Math.sin(angle) * 5.1);
    root.add(candle);
  }
}

function addOverflowingWellState(root) {
  for (let index = 0; index < 14; index += 1) {
    const wraith = makeWraith(index);
    const angle = index * Math.PI * 2 / 14;
    const radius = 1.2 + (index % 4) * 0.58;
    wraith.position.set(Math.cos(angle) * radius, 1.55 + (index % 5) * 0.52, Math.sin(angle) * radius);
    wraith.rotation.y = -angle;
    wraith.name = 'hanging-prop';
    root.add(wraith);
  }
  for (let index = 0; index < 9; index += 1) {
    const stream = makeSoulRibbon(index);
    const angle = index * Math.PI * 2 / 9;
    stream.position.set(Math.cos(angle) * 2.6, 1.15 + index % 3 * 0.42, Math.sin(angle) * 2.6);
    stream.rotation.y = -angle;
    stream.name = 'hanging-prop';
    root.add(stream);
  }
}

function makeWraith(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42 + seed % 3 * 0.06, 1.3, 8), transparent(seed % 2 ? C.soulCyan : C.soulViolet, 0.32));
  body.position.y = 0.62;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), emissive(C.holyIvory, 0.34));
  head.position.y = 1.42;
  group.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.85, 6), transparent(C.soulCyan, 0.25));
    arm.position.set(side * 0.34, 0.98, 0);
    arm.rotation.z = side * 0.72;
    group.add(arm);
  }
  return group;
}

function addSealedWellState(root) {
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.38, 16), standard(C.iron, 0.6, 0.75));
  seal.position.y = 2.42;
  root.add(seal);
  for (let index = 0; index < 8; index += 1) {
    const chain = makeChain(10, 0.12);
    const angle = index * Math.PI / 4;
    chain.position.set(Math.cos(angle) * 2.85, 3.65, Math.sin(angle) * 2.85);
    chain.rotation.z = -0.45;
    chain.rotation.y = -angle;
    root.add(chain);
    const lock = box(0.36, 0.5, 0.18, C.brass, 0.46, 0.72);
    lock.position.set(Math.cos(angle) * 3.0, 2.65, Math.sin(angle) * 3.0);
    lock.rotation.y = -angle;
    root.add(lock);
  }
  const sealRune = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.25, 16), emissive(C.silver, 0.24));
  sealRune.rotation.x = -Math.PI / 2;
  sealRune.position.y = 2.64;
  root.add(sealRune);
}

function makeSkull(color, seed) {
  const group = new THREE.Group();
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 7), standard(color, 0.88));
  cranium.scale.set(0.88, 1, 0.78);
  group.add(cranium);
  const jaw = box(0.34, 0.15, 0.25, color, 0.9);
  jaw.position.set(0, -0.26, -0.02);
  group.add(jaw);
  for (const x of [-0.1, 0.1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), standard(C.void, 1));
    socket.position.set(x, 0.03, -0.22);
    group.add(socket);
  }
  const nasal = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 5), standard(C.void, 1));
  nasal.rotation.x = Math.PI;
  nasal.position.set(0, -0.09, -0.25);
  group.add(nasal);
  group.rotation.z = seed % 2 ? 0.04 : -0.035;
  return group;
}

function makeCrossedBones(color, scale) {
  const group = new THREE.Group();
  for (const direction of [-1, 1]) {
    const bone = makeBone(1.05 * scale, color);
    bone.rotation.z = direction * Math.PI / 4;
    group.add(bone);
  }
  return group;
}

function makeBone(length, color) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, length, 7), standard(color, 0.9));
  group.add(shaft);
  for (const y of [-length / 2, length / 2]) {
    for (const x of [-0.055, 0.055]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), standard(color, 0.9));
      knob.position.set(x, y, 0);
      group.add(knob);
    }
  }
  return group;
}

function makeSpine(count, color) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const vertebra = new THREE.Mesh(new THREE.TorusGeometry(0.12 - index * 0.004, 0.035, 5, 9), standard(color, 0.9));
    vertebra.rotation.x = Math.PI / 2;
    vertebra.position.y = index * 0.14;
    group.add(vertebra);
  }
  return group;
}

function makeChain(count, radius) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.24, 5, 10), standard(C.iron, 0.62, 0.72));
    link.rotation.y = index % 2 ? Math.PI / 2 : 0;
    link.position.y = -index * radius * 1.75;
    group.add(link);
  }
  return group;
}

function box(width, height, depth, color, roughness = 0.86, metalness = 0.03) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), standard(color, roughness, metalness));
}

function standard(color, roughness = 0.86, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function transparent(color, opacity) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.28, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function emissive(color, intensity) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.24, emissive: color, emissiveIntensity: intensity, transparent: intensity < 0.4, opacity: intensity < 0.4 ? 0.62 : 1 });
}

function deterministic(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
