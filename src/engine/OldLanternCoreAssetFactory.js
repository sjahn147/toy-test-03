import { THREE } from './ThreeScene.js';

const SUPPORTED = new Set([
  'inn.old-lantern.common-room',
  'inn.old-lantern.kitchen'
]);

const PALETTE = Object.freeze({
  limestone: [0x746d66, 0.9, 0.02],
  paleStone: [0x9a9083, 0.82, 0.02],
  sootStone: [0x262328, 0.98, 0],
  oak: [0x6b4229, 0.88, 0.03],
  darkOak: [0x34231b, 0.96, 0.01],
  charredWood: [0x1d1817, 1, 0],
  iron: [0x454950, 0.66, 0.72],
  brass: [0xb48742, 0.48, 0.65],
  copper: [0xa85f38, 0.55, 0.58],
  linen: [0xd0c4aa, 0.96, 0],
  redCloth: [0x74333d, 0.96, 0],
  greenCloth: [0x425f4a, 0.96, 0],
  blueCloth: [0x3d526c, 0.96, 0],
  parchment: [0xd1b982, 0.92, 0],
  leather: [0x70462f, 0.92, 0.01],
  bottleGreen: [0x315d49, 0.4, 0.1],
  bottleAmber: [0x925a2e, 0.45, 0.08],
  bottleBlue: [0x365c75, 0.42, 0.08],
  ceramic: [0xc5bca9, 0.74, 0.04],
  bread: [0xc59152, 0.92, 0],
  meat: [0x7b3430, 0.96, 0],
  herb: [0x60744d, 0.95, 0],
  ash: [0x555157, 1, 0],
  water: [0x4f8997, 0.26, 0.04],
  slime: [0x63956a, 0.62, 0.01, 0x35683d],
  flame: [0xffc15e, 0.2, 0.02, 0xff8b2b],
  ember: [0xd95d2c, 0.28, 0.02, 0xa92c18]
});

export class OldLanternCoreAssetFactory {
  create(bundleId, context = {}) {
    if (!SUPPORTED.has(bundleId)) return null;
    const state = context.state ?? context.stateVariant ?? null;
    const root = new THREE.Group();
    root.name = `old-lantern-core:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.state = state;
    root.userData.roomId = context.room?.id ?? null;

    if (bundleId === 'inn.old-lantern.common-room') buildCommonRoom(root, state);
    if (bundleId === 'inn.old-lantern.kitchen') buildKitchen(root, state);
    return root;
  }
}

function buildCommonRoom(root, state) {
  const repaired = ['repaired', 'prosperous', 'besieged'].includes(state);
  const prosperous = state === 'prosperous';
  const bivouac = state === 'bivouac';
  const besieged = state === 'besieged';
  const burned = state === 'burned';
  const ruined = state === 'ruined' || !state;

  root.add(makePlankFloor(14.8, 11.2, burned ? 'charredWood' : repaired ? 'oak' : 'darkOak'));
  addPerimeterWainscot(root, burned);

  const hearth = makeHeroHearth({ lit: repaired || bivouac || besieged, damaged: ruined || burned, burned });
  hearth.position.set(-5.6, 0, -1.5);
  hearth.name = 'hearth-fire';
  root.add(hearth);

  const bar = makeHeroBar({ stocked: repaired, prosperous, damaged: ruined || burned, shuttered: besieged });
  bar.position.set(3.55, 0, -3.0);
  bar.name = 'bar-service';
  root.add(bar);

  const stage = makePerformanceCorner({ restored: repaired, damaged: ruined || burned });
  stage.position.set(-4.4, 0, 3.55);
  stage.name = 'music-stage';
  root.add(stage);

  const diningLayouts = [
    [-1.55, -1.45, 0.1],
    [0.7, 1.25, -0.28],
    [3.65, 1.55, 0.38],
    [-0.75, 3.55, -0.12]
  ];
  diningLayouts.forEach((layout, index) => {
    const cluster = makeDiningCluster(index, {
      setTable: prosperous,
      damaged: burned || (ruined && index % 2 === 0),
      occupied: bivouac && index < 2
    });
    cluster.position.set(layout[0], 0, layout[1]);
    cluster.rotation.y = layout[2];
    root.add(cluster);
  });

  const gallery = makeGalleryAndStairs({ repaired, damaged: ruined || burned, fortified: besieged });
  gallery.position.set(5.4, 0, 3.25);
  root.add(gallery);

  for (let index = 0; index < 3; index += 1) {
    const chandelier = makeChandelier({ lit: repaired || besieged, damaged: burned && index !== 2 });
    chandelier.position.set(-2.2 + index * 2.35, 3.7, 0.15 + (index % 2) * 1.45);
    chandelier.name = 'hanging-prop';
    root.add(chandelier);
  }

  const sign = makeInnIdentity({ prosperous, burned, besieged });
  sign.position.set(0, 2.55, -5.15);
  sign.name = 'faction-banner';
  root.add(sign);

  const reservation = makeReservationLedger();
  reservation.position.set(-4.15, 1.95, -2.0);
  reservation.rotation.y = Math.PI / 2;
  reservation.name = 'reservation-ledger';
  root.add(reservation);

  if (bivouac) addBivouacLayer(root);
  if (repaired) addServiceLayer(root, prosperous);
  if (besieged) addSiegeLayer(root);
  if (ruined) addRuinLayer(root, false);
  if (burned) addRuinLayer(root, true);

  addAmbientClutter(root, state ?? 'ruined', prosperous ? 34 : repaired ? 25 : 19, 6.5, 4.7);
}

function buildKitchen(root, state) {
  const working = state === 'working';
  const camp = state === 'camp-kitchen';
  const infested = state === 'infested';
  const blackened = state === 'blackened' || !state;

  root.add(makeStoneKitchenFloor());
  addKitchenWallLine(root, blackened || infested);

  const range = makeProfessionalRange({ working, camp, damaged: blackened || infested });
  range.position.set(-4.5, 0, -3.0);
  range.name = 'oven-fire';
  root.add(range);

  const prep = makeButcherIsland({ working, damaged: blackened, contaminated: infested });
  prep.position.set(0, 0, -0.25);
  prep.name = 'chopping-board';
  root.add(prep);

  const wash = makeWashStation({ working, contaminated: infested, dry: blackened });
  wash.position.set(4.55, 0, -2.8);
  wash.name = 'wash-basin';
  root.add(wash);

  const pantry = makePantry({ stocked: working, camp, spoiled: infested, empty: blackened });
  pantry.position.set(4.3, 0, 2.55);
  pantry.name = 'pantry';
  root.add(pantry);

  const cookware = makeCookwareRack({ full: working, scattered: blackened || infested });
  cookware.position.set(-0.15, 2.85, -0.25);
  cookware.name = 'hanging-prop';
  root.add(cookware);

  const coldTable = makeColdTable({ working, infested });
  coldTable.position.set(-3.6, 0, 2.65);
  root.add(coldTable);

  if (camp) addCampKitchenLayer(root);
  if (working) addWorkingKitchenLayer(root);
  if (blackened) addBlackenedKitchenLayer(root);
  if (infested) addInfestationLayer(root);

  addAmbientClutter(root, `kitchen:${state ?? 'blackened'}`, working ? 28 : 22, 5.1, 3.8);
}

function makePlankFloor(width, depth, materialName) {
  const group = new THREE.Group();
  const boardWidth = 0.48;
  const count = Math.floor(width / boardWidth);
  for (let index = 0; index < count; index += 1) {
    const board = box(boardWidth - 0.025, 0.12, depth, index % 5 === 0 ? 'darkOak' : materialName);
    board.position.set(-width / 2 + boardWidth / 2 + index * boardWidth, 0.06, 0);
    board.rotation.y = (hash(`floor:${index}`) - 0.5) * 0.008;
    group.add(board);
  }
  for (let index = 0; index < 9; index += 1) {
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 7), material('iron'));
    nail.position.set(-6.4 + index * 1.55, 0.13, index % 2 ? 4.7 : -4.7);
    group.add(nail);
  }
  return group;
}

function addPerimeterWainscot(root, burned) {
  const back = box(14.6, 2.6, 0.24, burned ? 'charredWood' : 'darkOak');
  back.position.set(0, 1.3, -5.35);
  root.add(back);
  for (let index = 0; index < 10; index += 1) {
    const post = box(0.16, 2.85, 0.32, index % 3 === 0 && burned ? 'charredWood' : 'oak');
    post.position.set(-6.65 + index * 1.48, 1.42, -5.18);
    root.add(post);
  }
  for (const side of [-1, 1]) {
    const rail = box(0.22, 1.1, 10.6, burned ? 'charredWood' : 'darkOak');
    rail.position.set(side * 7.25, 0.55, 0);
    root.add(rail);
  }
}

function makeHeroHearth({ lit, damaged, burned }) {
  const group = new THREE.Group();
  const base = box(3.3, 0.38, 1.65, 'paleStone');
  base.position.y = 0.19;
  group.add(base);
  for (let index = 0; index < 5; index += 1) {
    const block = box(0.64, 0.52, 1.05, index % 2 ? 'limestone' : 'paleStone');
    block.position.set(-1.3 + index * 0.65, 0.58, 0.1 + (index % 2) * 0.08);
    block.rotation.z = damaged && index === 4 ? -0.16 : 0;
    group.add(block);
  }
  for (const side of [-1, 1]) {
    const jamb = box(0.62, 2.65, 0.95, damaged && side > 0 ? 'sootStone' : 'limestone');
    jamb.position.set(side * 1.28, 1.62, 0.18);
    jamb.rotation.z = damaged && side > 0 ? -0.035 : 0;
    group.add(jamb);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.34, 8, 24, Math.PI), material('paleStone'));
  arch.rotation.z = Math.PI;
  arch.position.set(0, 2.48, 0.2);
  group.add(arch);
  const firebox = box(2.1, 1.5, 0.82, 'sootStone');
  firebox.position.set(0, 1.08, -0.18);
  group.add(firebox);
  const mantle = box(3.35, 0.28, 1.15, burned ? 'charredWood' : 'darkOak');
  mantle.position.y = 2.76;
  mantle.rotation.z = damaged ? -0.035 : 0;
  group.add(mantle);
  const chimney = box(1.45, 3.0, 1.15, burned ? 'sootStone' : 'limestone');
  chimney.position.y = 4.35;
  group.add(chimney);
  for (let index = 0; index < 7; index += 1) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.35, 8), material(burned ? 'charredWood' : 'oak'));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = index * 0.37;
    log.position.set(-0.25 + (index % 3) * 0.2, 0.38 + (index % 2) * 0.13, -0.72 + Math.floor(index / 3) * 0.17);
    group.add(log);
  }
  if (lit) {
    for (let index = 0; index < 7; index += 1) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12 + (index % 3) * 0.035, 0.55 + (index % 2) * 0.35, 7), material(index % 2 ? 'ember' : 'flame'));
      flame.position.set(-0.7 + index * 0.23, 0.75 + (index % 3) * 0.07, -0.82);
      flame.name = 'landmark-flame';
      group.add(flame);
    }
  } else {
    for (let index = 0; index < 9; index += 1) {
      const ash = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + (index % 3) * 0.03, 0), material(index % 2 ? 'ash' : 'sootStone'));
      ash.position.set(-0.8 + index * 0.2, 0.3, -0.74 + (index % 2) * 0.12);
      group.add(ash);
    }
  }
  const ledger = box(1.28, 0.08, 0.72, 'parchment');
  ledger.position.set(0.52, 3.0, -0.05);
  ledger.rotation.y = -0.18;
  group.add(ledger);
  return group;
}

function makeHeroBar({ stocked, prosperous, damaged, shuttered }) {
  const group = new THREE.Group();
  for (let segment = 0; segment < 3; segment += 1) {
    const body = box(1.55, 1.08, 0.72, damaged && segment === 1 ? 'charredWood' : 'oak');
    body.position.set(-1.55 + segment * 1.55, 0.54, 0);
    body.rotation.z = damaged && segment === 1 ? 0.08 : 0;
    group.add(body);
    const panel = box(1.28, 0.66, 0.08, 'darkOak');
    panel.position.set(body.position.x, 0.55, -0.4);
    group.add(panel);
  }
  const top = box(5.05, 0.18, 0.94, damaged ? 'charredWood' : 'darkOak');
  top.position.y = 1.16;
  top.rotation.z = damaged ? -0.025 : 0;
  group.add(top);

  const back = box(4.75, 3.15, 0.28, damaged ? 'charredWood' : 'darkOak');
  back.position.set(0, 1.6, -1.22);
  group.add(back);
  for (let row = 0; row < 4; row += 1) {
    const shelf = box(4.6, 0.12, 0.52, damaged && row === 2 ? 'charredWood' : 'oak');
    shelf.position.set(0, 0.45 + row * 0.72, -1.02);
    shelf.rotation.z = damaged && row === 2 ? 0.06 : 0;
    group.add(shelf);
  }
  if (stocked) {
    for (let index = 0; index < (prosperous ? 32 : 22); index += 1) {
      const bottle = makeBottle(index);
      bottle.position.set(-2.0 + (index % 8) * 0.57, 0.7 + Math.floor(index / 8) * 0.72, -0.83);
      bottle.rotation.y = hash(`bottle:${index}`) * Math.PI;
      group.add(bottle);
    }
  } else {
    for (let index = 0; index < 7; index += 1) {
      const bottle = makeBottle(index);
      bottle.position.set(-1.8 + index * 0.58, 0.72 + (index % 2) * 0.72, -0.84);
      bottle.rotation.z = damaged && index % 3 === 0 ? Math.PI / 2 : 0;
      group.add(bottle);
    }
  }
  for (let index = 0; index < 5; index += 1) {
    const stool = makeBarStool(index, damaged);
    stool.position.set(-1.8 + index * 0.9, 0, 1.08 + (index % 2) * 0.1);
    group.add(stool);
  }
  if (shuttered) {
    for (let index = 0; index < 4; index += 1) {
      const shutter = box(1.1, 0.2, 2.55, index % 2 ? 'darkOak' : 'oak');
      shutter.position.set(-1.7 + index * 1.12, 1.55, -0.58);
      shutter.rotation.z = Math.PI / 2 + (index % 2 ? 0.04 : -0.04);
      group.add(shutter);
    }
  }
  return group;
}

function makeBottle(seed) {
  const group = new THREE.Group();
  const palette = ['bottleGreen', 'bottleAmber', 'bottleBlue'];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075 + (seed % 3) * 0.012, 0.115, 0.38 + (seed % 4) * 0.055, 8), material(palette[seed % palette.length]));
  body.position.y = 0.22;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.18, 8), material(palette[seed % palette.length]));
  neck.position.y = 0.48 + (seed % 4) * 0.025;
  group.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 7), material('oak'));
  cork.position.y = 0.59 + (seed % 4) * 0.025;
  group.add(cork);
  return group;
}

function makeBarStool(seed, damaged) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 10), material(seed % 2 ? 'oak' : 'darkOak'));
  seat.position.y = 0.72;
  seat.rotation.z = damaged && seed === 2 ? 0.2 : 0;
  group.add(seat);
  for (let index = 0; index < 3; index += 1) {
    const angle = index * Math.PI * 2 / 3;
    const leg = box(0.08, damaged && seed === 2 && index === 1 ? 0.38 : 0.68, 0.08, 'darkOak');
    leg.position.set(Math.cos(angle) * 0.19, 0.34, Math.sin(angle) * 0.19);
    leg.rotation.z = Math.cos(angle) * 0.08;
    group.add(leg);
  }
  return group;
}

function makePerformanceCorner({ restored, damaged }) {
  const group = new THREE.Group();
  const stage = box(3.7, 0.42, 2.45, damaged ? 'charredWood' : 'oak');
  stage.position.y = 0.21;
  stage.rotation.z = damaged ? -0.025 : 0;
  group.add(stage);
  const curtain = box(3.35, 2.3, 0.1, damaged ? 'ash' : 'redCloth');
  curtain.position.set(0, 1.65, 1.05);
  group.add(curtain);
  for (let index = 0; index < 7; index += 1) {
    const fold = box(0.1, 2.15, 0.12, damaged ? 'charredWood' : 'darkOak');
    fold.position.set(-1.45 + index * 0.48, 1.62, 0.96);
    group.add(fold);
  }
  const lute = makeLute(damaged);
  lute.position.set(-0.65, 0.38, -0.2);
  lute.rotation.z = damaged ? 1.1 : -0.22;
  group.add(lute);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.58, 12), material(damaged ? 'charredWood' : 'redCloth'));
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0.75, 0.78, -0.05);
  group.add(drum);
  if (restored) {
    const musicStand = box(0.12, 1.25, 0.12, 'iron');
    musicStand.position.set(0, 0.62, -0.72);
    group.add(musicStand);
    const score = box(0.82, 0.08, 0.58, 'parchment');
    score.position.set(0, 1.22, -0.72);
    score.rotation.x = -0.35;
    group.add(score);
  }
  return group;
}

function makeLute(damaged) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), material(damaged ? 'charredWood' : 'oak'));
  body.scale.set(0.78, 1, 0.3);
  body.position.y = 0.48;
  group.add(body);
  const neck = box(0.13, damaged ? 0.72 : 1.15, 0.1, 'darkOak');
  neck.position.y = damaged ? 0.94 : 1.22;
  group.add(neck);
  for (let index = 0; index < 4; index += 1) {
    const string = box(0.008, damaged && index > 1 ? 0.38 : 1.05, 0.008, 'brass');
    string.position.set(-0.045 + index * 0.03, 0.85, -0.31);
    group.add(string);
  }
  return group;
}

function makeDiningCluster(seed, { setTable, damaged, occupied }) {
  const group = new THREE.Group();
  const round = seed % 2 === 0;
  const tabletop = round
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.16, 14), material(damaged ? 'charredWood' : 'oak'))
    : box(2.15, 0.16, 1.25, damaged ? 'charredWood' : 'oak');
  tabletop.position.y = 0.92;
  tabletop.rotation.z = damaged ? 0.08 : 0;
  group.add(tabletop);
  const pedestal = pillar(0.16, damaged ? 0.58 : 0.84, 'darkOak');
  pedestal.position.y = 0.45;
  group.add(pedestal);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2 + 0.25;
    const chair = makeChair(seed + index, damaged && index === 1);
    chair.position.set(Math.cos(angle) * 1.35, 0, Math.sin(angle) * (round ? 1.25 : 1.0));
    chair.rotation.y = -angle + Math.PI / 2;
    group.add(chair);
  }
  if (setTable) {
    for (let index = 0; index < 5; index += 1) {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.2, 8), material(index % 2 ? 'brass' : 'ceramic'));
      mug.position.set(-0.55 + index * 0.28, 1.11, (index % 2 ? 1 : -1) * 0.25);
      group.add(mug);
    }
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.06, 12), material('ceramic'));
    platter.position.y = 1.05;
    group.add(platter);
    for (let index = 0; index < 3; index += 1) {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 5), material('bread'));
      loaf.scale.set(1.5, 0.65, 0.8);
      loaf.position.set(-0.24 + index * 0.24, 1.17, 0.02);
      group.add(loaf);
    }
  }
  if (occupied) {
    const pack = box(0.52, 0.62, 0.3, seed % 2 ? 'greenCloth' : 'blueCloth');
    pack.position.set(0.9, 0.32, 0.55);
    group.add(pack);
  }
  return group;
}

function makeChair(seed, damaged) {
  const group = new THREE.Group();
  const seat = box(0.48, 0.12, 0.48, damaged ? 'charredWood' : seed % 2 ? 'oak' : 'darkOak');
  seat.position.y = 0.48;
  seat.rotation.z = damaged ? 0.22 : 0;
  group.add(seat);
  for (const x of [-0.18, 0.18]) {
    for (const z of [-0.18, 0.18]) {
      if (damaged && x > 0 && z > 0) continue;
      const leg = box(0.07, 0.48, 0.07, 'darkOak');
      leg.position.set(x, 0.24, z);
      group.add(leg);
    }
  }
  const back = box(0.46, damaged ? 0.5 : 0.82, 0.08, damaged ? 'charredWood' : 'oak');
  back.position.set(0, damaged ? 0.72 : 0.82, 0.22);
  back.rotation.x = -0.08;
  group.add(back);
  return group;
}

function makeGalleryAndStairs({ repaired, damaged, fortified }) {
  const group = new THREE.Group();
  for (let index = 0; index < 9; index += 1) {
    const step = box(2.1, 0.22, 0.68, damaged && index > 6 ? 'charredWood' : repaired ? 'oak' : 'darkOak');
    step.position.set(0, 0.11 + index * 0.2, -index * 0.42);
    step.rotation.z = damaged && index === 7 ? 0.08 : 0;
    group.add(step);
  }
  const landing = box(3.2, 0.2, 1.7, repaired ? 'darkOak' : 'charredWood');
  landing.position.set(0, 1.85, -3.65);
  group.add(landing);
  for (const x of [-1.42, 1.42]) {
    const rail = box(0.12, 1.08, 5.1, repaired ? 'oak' : 'darkOak');
    rail.position.set(x, 1.42, -1.75);
    rail.rotation.z = damaged && x > 0 ? -0.08 : 0;
    group.add(rail);
  }
  if (fortified) {
    const guard = makeGuardPost();
    guard.position.set(-0.2, 1.95, -3.55);
    group.add(guard);
  }
  return group;
}

function makeGuardPost() {
  const group = new THREE.Group();
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 8), material('iron'));
  shield.rotation.x = Math.PI / 2;
  shield.position.set(-0.55, 0.8, 0);
  group.add(shield);
  const spear = box(0.08, 2.35, 0.08, 'darkOak');
  spear.position.set(0.35, 1.18, 0);
  spear.rotation.z = -0.12;
  group.add(spear);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), material('iron'));
  tip.position.set(0.64, 2.32, 0);
  tip.rotation.z = -0.12;
  group.add(tip);
  return group;
}

function makeChandelier({ lit, damaged }) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.075, 7, 22), material(damaged ? 'ash' : 'iron'));
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = damaged ? 0.32 : 0;
  group.add(ring);
  for (let index = 0; index < 7; index += 1) {
    if (damaged && index > 3) continue;
    const angle = index * Math.PI * 2 / 7;
    const arm = box(0.06, 0.06, 0.55, 'iron');
    arm.position.set(Math.cos(angle) * 0.33, 0, Math.sin(angle) * 0.33);
    arm.rotation.y = -angle;
    group.add(arm);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.1, 7), material('brass'));
    cup.position.set(Math.cos(angle) * 0.66, 0.03, Math.sin(angle) * 0.66);
    group.add(cup);
    if (lit) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 7), material('flame'));
      flame.position.set(Math.cos(angle) * 0.66, 0.22, Math.sin(angle) * 0.66);
      flame.name = 'landmark-flame';
      group.add(flame);
    }
  }
  for (let index = 0; index < 7; index += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.026, 5, 10), material('iron'));
    link.rotation.y = index % 2 ? Math.PI / 2 : 0;
    link.position.y = 0.3 + index * 0.2;
    group.add(link);
  }
  return group;
}

function makeInnIdentity({ prosperous, burned, besieged }) {
  const group = new THREE.Group();
  const beam = box(4.6, 0.22, 0.24, burned ? 'charredWood' : 'darkOak');
  group.add(beam);
  const sign = box(1.85, 1.25, 0.18, burned ? 'charredWood' : 'oak');
  sign.position.y = -0.88;
  sign.rotation.z = burned ? 0.12 : 0;
  group.add(sign);
  const lantern = makeCagedLantern(!burned);
  lantern.position.set(0, -0.82, -0.18);
  group.add(lantern);
  const banner = box(1.18, prosperous ? 1.85 : 1.25, 0.08, besieged ? 'redCloth' : prosperous ? 'greenCloth' : 'blueCloth');
  banner.position.set(1.65, -1.0, 0);
  banner.rotation.z = burned ? -0.18 : 0;
  group.add(banner);
  return group;
}

function makeReservationLedger() {
  const group = new THREE.Group();
  const plaque = box(2.25, 1.55, 0.18, 'darkOak');
  plaque.position.y = 0.78;
  group.add(plaque);
  for (let row = 0; row < 5; row += 1) {
    const strip = box(1.86, 0.15, 0.035, row === 4 ? 'redCloth' : 'parchment');
    strip.position.set(0, 1.27 - row * 0.25, -0.12);
    strip.rotation.z = (row % 2 ? 1 : -1) * 0.025;
    group.add(strip);
  }
  for (let index = 0; index < 7; index += 1) {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 5, 10, Math.PI * 1.55), material('brass'));
    hook.position.set(-0.8 + index * 0.27, 0.2, -0.15);
    group.add(hook);
  }
  return group;
}

function addBivouacLayer(root) {
  for (let index = 0; index < 8; index += 1) {
    const bedroll = box(1.45, 0.12, 0.58, index % 3 === 0 ? 'redCloth' : index % 2 ? 'greenCloth' : 'blueCloth');
    bedroll.position.set(-2.8 + (index % 4) * 1.7, 0.14, -3.5 + Math.floor(index / 4) * 7.2);
    bedroll.rotation.y = (index % 2 ? 1 : -1) * 0.16;
    root.add(bedroll);
    const pack = box(0.42, 0.55, 0.3, 'leather');
    pack.position.set(bedroll.position.x + 0.62, 0.3, bedroll.position.z);
    root.add(pack);
  }
  const fire = makeCampBrazier();
  fire.position.set(0, 0, 0.1);
  root.add(fire);
  for (let index = 0; index < 4; index += 1) {
    const screen = box(0.1, 1.65, 2.1, index % 2 ? 'linen' : 'blueCloth');
    screen.position.set(-3.4 + index * 2.25, 0.84, index % 2 ? 2.8 : -2.65);
    screen.rotation.y = index % 2 ? 0.28 : -0.22;
    root.add(screen);
  }
}

function addServiceLayer(root, prosperous) {
  const board = makeRumorBoard(prosperous ? 14 : 8);
  board.position.set(5.75, 0, -0.8);
  board.rotation.y = -Math.PI / 2;
  board.name = 'rumor-board';
  root.add(board);
  const service = makeServingStation(prosperous);
  service.position.set(2.7, 0, 3.8);
  root.add(service);
  for (let index = 0; index < (prosperous ? 5 : 3); index += 1) {
    const lamp = makeWallLamp(true);
    lamp.position.set(-5.6 + index * 2.7, 2.45, -5.05);
    root.add(lamp);
  }
}

function addSiegeLayer(root) {
  for (const z of [-4.75, 4.85]) {
    for (let index = 0; index < 6; index += 1) {
      const plank = box(2.05, 0.2, 0.28, index % 2 ? 'darkOak' : 'oak');
      plank.position.set(-5.0 + index * 1.95, 0.55 + (index % 3) * 0.42, z);
      plank.rotation.z = (index % 2 ? 1 : -1) * 0.13;
      root.add(plank);
    }
  }
  const barricade = makeBarricade(7);
  barricade.position.set(0, 0, 5.0);
  barricade.name = 'barricade-front';
  root.add(barricade);
  for (let index = 0; index < 6; index += 1) {
    const crate = makeSupplyCrate(index);
    crate.position.set(-5.4 + (index % 3) * 1.2, 0, 3.7 + Math.floor(index / 3) * 0.8);
    root.add(crate);
  }
}

function addRuinLayer(root, burned) {
  for (let index = 0; index < 24; index += 1) {
    const seed = hash(`common-ruin:${burned}:${index}`);
    const debris = index % 4 === 0
      ? box(0.18, 1.45 + (index % 3) * 0.45, 0.2, burned ? 'charredWood' : 'darkOak')
      : box(0.45 + (index % 4) * 0.2, 0.14, 0.3 + (index % 3) * 0.13, index % 3 ? burned ? 'charredWood' : 'oak' : 'limestone');
    debris.position.set((seed - 0.5) * 12.2, 0.18 + (index % 3) * 0.05, (hash(`z:${index}`) - 0.5) * 8.6);
    debris.rotation.set(index * 0.07, seed * Math.PI * 2, index % 2 ? 0.42 : -0.26);
    root.add(debris);
  }
  if (burned) {
    for (let index = 0; index < 12; index += 1) {
      const ash = new THREE.Mesh(new THREE.CircleGeometry(0.35 + (index % 4) * 0.16, 10), transparentMaterial(index % 2 ? 0x302c31 : 0x51484a, 0.58));
      ash.rotation.x = -Math.PI / 2;
      ash.position.set(-5.2 + (index % 6) * 2.0, 0.14, -3.5 + Math.floor(index / 6) * 6.9);
      ash.rotation.z = index * 0.41;
      root.add(ash);
    }
    for (let index = 0; index < 9; index += 1) {
      const glass = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 3), transparentMaterial(index % 2 ? 0x598079 : 0x8b6a43, 0.62));
      glass.rotation.x = Math.PI / 2;
      glass.position.set(1.7 + (index % 3) * 0.46, 0.19, -1.7 + Math.floor(index / 3) * 0.38);
      root.add(glass);
    }
  }
}

function makeStoneKitchenFloor() {
  const group = new THREE.Group();
  for (let x = 0; x < 10; x += 1) {
    for (let z = 0; z < 7; z += 1) {
      const slab = box(1.05, 0.13, 1.05, (x + z) % 4 === 0 ? 'paleStone' : 'limestone');
      slab.position.set(-4.75 + x * 1.05, 0.065, -3.15 + z * 1.05);
      slab.rotation.y = (hash(`slab:${x}:${z}`) - 0.5) * 0.025;
      group.add(slab);
    }
  }
  return group;
}

function addKitchenWallLine(root, sooty) {
  const wall = box(10.8, 3.2, 0.25, sooty ? 'sootStone' : 'limestone');
  wall.position.set(0, 1.6, -4.0);
  root.add(wall);
  for (let index = 0; index < 8; index += 1) {
    const tile = box(1.12, 0.68, 0.08, index % 3 === 0 && sooty ? 'ash' : 'paleStone');
    tile.position.set(-4.3 + index * 1.23, 0.68 + (index % 2) * 0.7, -4.15);
    root.add(tile);
  }
}

function makeProfessionalRange({ working, camp, damaged }) {
  const group = new THREE.Group();
  const body = box(4.25, 1.85, 1.55, damaged ? 'sootStone' : 'limestone');
  body.position.y = 0.93;
  body.rotation.z = damaged ? -0.02 : 0;
  group.add(body);
  for (let index = 0; index < 4; index += 1) {
    const opening = box(0.72, 0.76, 1.64, 'sootStone');
    opening.position.set(-1.38 + index * 0.92, 0.62, -0.03);
    group.add(opening);
    const grate = box(0.58, 0.1, 0.22, 'iron');
    grate.position.set(opening.position.x, 0.44, -0.85);
    group.add(grate);
    if (working || camp) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1 + (index % 2) * 0.03, camp ? 0.35 : 0.52, 7), material(index % 2 ? 'ember' : 'flame'));
      flame.position.set(opening.position.x, 0.57, -0.88);
      flame.name = 'landmark-flame';
      group.add(flame);
    }
  }
  const cooktop = box(4.5, 0.18, 1.78, 'iron');
  cooktop.position.y = 1.92;
  group.add(cooktop);
  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 16), material('iron'));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-1.35 + index * 0.9, 2.04, 0);
    group.add(ring);
  }
  const hood = new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.5, 4), material(damaged ? 'ash' : 'copper'));
  hood.rotation.y = Math.PI / 4;
  hood.position.y = 2.82;
  hood.scale.z = 0.62;
  group.add(hood);
  const flue = box(0.82, 2.45, 0.82, damaged ? 'ash' : 'iron');
  flue.position.y = 4.65;
  flue.rotation.z = damaged ? -0.035 : 0;
  group.add(flue);
  return group;
}

function makeButcherIsland({ working, damaged, contaminated }) {
  const group = new THREE.Group();
  const slab = box(3.75, 0.24, 1.65, damaged ? 'charredWood' : 'oak');
  slab.position.y = 1.02;
  slab.rotation.z = damaged ? 0.025 : 0;
  group.add(slab);
  for (const x of [-1.48, 1.48]) {
    for (const z of [-0.62, 0.62]) {
      const leg = box(0.2, 1.0, 0.2, 'darkOak');
      leg.position.set(x, 0.5, z);
      group.add(leg);
    }
  }
  const board = box(1.25, 0.07, 0.72, contaminated ? 'herb' : 'paleStone');
  board.position.set(-0.68, 1.19, 0);
  board.rotation.y = -0.12;
  group.add(board);
  for (let index = 0; index < 5; index += 1) {
    const blade = box(0.06, 0.05, 0.58 - index * 0.035, 'iron');
    blade.position.set(0.25 + index * 0.25, 1.21, -0.35 + index * 0.16);
    blade.rotation.y = 0.42 + index * 0.18;
    group.add(blade);
  }
  if (working) {
    const ingredients = ['herb', 'bread', 'meat', 'herb', 'bread'];
    ingredients.forEach((name, index) => {
      const item = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (index % 2) * 0.04, 7, 5), material(name));
      item.scale.set(1.35, 0.75, 0.9);
      item.position.set(-0.95 + index * 0.38, 1.28, 0.42);
      group.add(item);
    });
  }
  return group;
}

function makeWashStation({ working, contaminated, dry }) {
  const group = new THREE.Group();
  const frame = box(2.85, 0.95, 1.3, 'limestone');
  frame.position.y = 0.48;
  group.add(frame);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.18, 0.5, 16, 1, true), material('copper'));
  basin.position.y = 1.02;
  group.add(basin);
  if (!dry) {
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.07, 18), contaminated ? transparentMaterial(0x66866a, 0.72) : material('water'));
    water.position.y = 1.13;
    water.name = 'water-surface';
    group.add(water);
  }
  const pump = box(0.24, 1.75, 0.24, 'iron');
  pump.position.set(1.05, 1.65, 0);
  group.add(pump);
  const spout = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 15, Math.PI), material('copper'));
  spout.rotation.z = Math.PI / 2;
  spout.position.set(0.72, 2.18, 0);
  group.add(spout);
  for (let index = 0; index < (working ? 8 : 3); index += 1) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 12), material('ceramic'));
    plate.rotation.x = Math.PI / 2;
    plate.position.set(-1.15 + (index % 4) * 0.28, 1.25 + Math.floor(index / 4) * 0.1, 0.55);
    group.add(plate);
  }
  return group;
}

function makePantry({ stocked, camp, spoiled, empty }) {
  const group = new THREE.Group();
  const back = box(3.7, 3.15, 0.35, 'darkOak');
  back.position.y = 1.58;
  group.add(back);
  for (let row = 0; row < 4; row += 1) {
    const shelf = box(3.55, 0.14, 0.72, spoiled && row === 1 ? 'charredWood' : 'oak');
    shelf.position.set(0, 0.42 + row * 0.78, -0.02);
    shelf.rotation.z = spoiled && row === 1 ? 0.055 : 0;
    group.add(shelf);
  }
  const count = empty ? 4 : stocked ? 28 : camp ? 15 : 9;
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / 7);
    const column = index % 7;
    const item = index % 4 === 0
      ? makeSpiceJar(index, spoiled)
      : index % 4 === 1
        ? makeLoaf(index, spoiled)
        : index % 4 === 2
          ? makeFoodSack(index, spoiled)
          : makeCeramicPot(index, spoiled);
    item.position.set(-1.45 + column * 0.48, 0.68 + row * 0.78, -0.42);
    group.add(item);
  }
  return group;
}

function makeCookwareRack({ full, scattered }) {
  const group = new THREE.Group();
  const beam = box(5.1, 0.16, 0.16, 'iron');
  group.add(beam);
  const count = full ? 13 : 7;
  for (let index = 0; index < count; index += 1) {
    const chain = box(0.035, 0.45 + (index % 3) * 0.14, 0.035, 'iron');
    chain.position.set(-2.2 + index * (4.4 / Math.max(1, count - 1)), -0.28, 0);
    group.add(chain);
    const pan = index % 3 === 0
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.11, 12), material(index % 2 ? 'copper' : 'iron'))
      : new THREE.Mesh(new THREE.TorusGeometry(0.23 + (index % 2) * 0.06, 0.045, 6, 14), material(index % 2 ? 'copper' : 'iron'));
    pan.rotation.x = Math.PI / 2;
    pan.position.set(chain.position.x, -0.62 - (index % 3) * 0.13, 0);
    pan.rotation.z = scattered ? (index % 2 ? 0.28 : -0.32) : 0;
    group.add(pan);
  }
  return group;
}

function makeColdTable({ working, infested }) {
  const group = new THREE.Group();
  const table = box(3.3, 0.2, 1.25, infested ? 'charredWood' : 'darkOak');
  table.position.y = 0.95;
  group.add(table);
  for (const x of [-1.35, 1.35]) {
    for (const z of [-0.48, 0.48]) {
      const leg = box(0.16, 0.94, 0.16, 'darkOak');
      leg.position.set(x, 0.47, z);
      group.add(leg);
    }
  }
  const rack = box(2.7, 1.6, 0.16, 'iron');
  rack.position.set(0, 1.82, 0.52);
  group.add(rack);
  const count = working ? 6 : 2;
  for (let index = 0; index < count; index += 1) {
    const cut = box(0.32, 0.52 + (index % 2) * 0.18, 0.18, infested ? 'slime' : 'meat');
    cut.position.set(-1.05 + index * 0.42, 1.38, 0.46);
    cut.rotation.z = index % 2 ? 0.12 : -0.08;
    group.add(cut);
  }
  return group;
}

function addCampKitchenLayer(root) {
  const brazier = makeCampBrazier();
  brazier.position.set(1.85, 0, 2.15);
  root.add(brazier);
  for (let index = 0; index < 9; index += 1) {
    const sack = makeFoodSack(index, false);
    sack.position.set(-4.3 + (index % 3) * 0.72, 0.2 + Math.floor(index / 3) * 0.34, 2.55 + (index % 2) * 0.3);
    root.add(sack);
  }
  for (let index = 0; index < 3; index += 1) {
    const barrel = makeWaterBarrel(index);
    barrel.position.set(3.6 + index * 0.52, 0.5, 0.45 + index * 0.45);
    barrel.scale.setScalar(0.78);
    root.add(barrel);
  }
}

function addWorkingKitchenLayer(root) {
  const breadRack = new THREE.Group();
  const shelf = box(2.65, 2.1, 0.42, 'darkOak');
  shelf.position.y = 1.05;
  breadRack.add(shelf);
  for (let row = 0; row < 3; row += 1) {
    const rail = box(2.5, 0.1, 0.62, 'oak');
    rail.position.set(0, 0.42 + row * 0.67, -0.02);
    breadRack.add(rail);
    for (let index = 0; index < 5; index += 1) {
      const loaf = makeLoaf(index + row, false);
      loaf.position.set(-0.95 + index * 0.48, 0.62 + row * 0.67, -0.28);
      breadRack.add(loaf);
    }
  }
  breadRack.position.set(0.2, 0, 3.1);
  root.add(breadRack);
  for (let index = 0; index < 7; index += 1) {
    const herb = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 7), material('herb'));
    herb.position.set(-2.15 + index * 0.7, 2.65 + (index % 2) * 0.24, 3.65);
    herb.rotation.x = Math.PI;
    herb.name = 'hanging-prop';
    root.add(herb);
  }
}

function addBlackenedKitchenLayer(root) {
  for (let index = 0; index < 16; index += 1) {
    const debris = index % 3 === 0
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (index % 4) * 0.06, 0), material('ash'))
      : box(0.35 + (index % 3) * 0.22, 0.12, 0.22, index % 2 ? 'charredWood' : 'iron');
    debris.position.set(-4.8 + (index % 8) * 1.25, 0.18, -2.2 + Math.floor(index / 8) * 4.9);
    debris.rotation.set(index * 0.12, index * 0.47, index % 2 ? 0.42 : -0.31);
    root.add(debris);
  }
  for (let index = 0; index < 7; index += 1) {
    const soot = new THREE.Mesh(new THREE.CircleGeometry(0.45 + index * 0.08, 12), transparentMaterial(0x19171a, 0.52));
    soot.rotation.x = -Math.PI / 2;
    soot.position.set(-4.2 + index * 1.35, 0.15, index % 2 ? 1.2 : -1.15);
    root.add(soot);
  }
}

function addInfestationLayer(root) {
  for (let index = 0; index < 18; index += 1) {
    const slime = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (index % 4) * 0.06, 9, 6), material('slime'));
    slime.scale.set(1.4, 0.22 + (index % 3) * 0.08, 1);
    const angle = hash(`slime:${index}`) * Math.PI * 2;
    slime.position.set(Math.cos(angle) * (1.7 + (index % 5) * 0.72), 0.18, Math.sin(angle) * (1.2 + (index % 4) * 0.63));
    slime.name = 'infestation-overlay';
    root.add(slime);
  }
  for (let index = 0; index < 9; index += 1) {
    const ratHole = new THREE.Mesh(new THREE.CircleGeometry(0.16 + (index % 3) * 0.04, 10), material('sootStone'));
    ratHole.rotation.x = -Math.PI / 2;
    ratHole.position.set(-4.6 + index * 1.08, 0.15, index % 2 ? 3.62 : -3.62);
    root.add(ratHole);
    const grain = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), material('bread'));
    grain.position.set(ratHole.position.x + 0.22, 0.18, ratHole.position.z - 0.12);
    root.add(grain);
  }
}

function makeCampBrazier() {
  const group = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.36, 0.22, 12), material('iron'));
  bowl.position.y = 0.58;
  group.add(bowl);
  for (let index = 0; index < 3; index += 1) {
    const leg = box(0.08, 0.58, 0.08, 'iron');
    const angle = index * Math.PI * 2 / 3;
    leg.position.set(Math.cos(angle) * 0.32, 0.29, Math.sin(angle) * 0.32);
    leg.rotation.z = Math.cos(angle) * 0.12;
    group.add(leg);
  }
  for (let index = 0; index < 5; index += 1) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08 + (index % 2) * 0.025, 0.42 + (index % 3) * 0.1, 7), material(index % 2 ? 'ember' : 'flame'));
    flame.position.set(-0.25 + index * 0.125, 0.92, (index % 2 ? 1 : -1) * 0.12);
    flame.name = 'landmark-flame';
    group.add(flame);
  }
  return group;
}

function makeRumorBoard(count) {
  const group = new THREE.Group();
  for (const x of [-1.1, 1.1]) {
    const post = box(0.16, 2.25, 0.16, 'darkOak');
    post.position.set(x, 1.12, 0);
    group.add(post);
  }
  const board = box(2.65, 1.45, 0.16, 'darkOak');
  board.position.y = 1.58;
  group.add(board);
  for (let index = 0; index < count; index += 1) {
    const paper = box(0.34 + (index % 3) * 0.12, 0.42 + (index % 2) * 0.1, 0.025, index % 6 === 0 ? 'redCloth' : 'parchment');
    paper.position.set(-0.9 + (index % 4) * 0.6, 1.12 + Math.floor(index / 4) * 0.34, -0.1);
    paper.rotation.z = (hash(`notice:${index}`) - 0.5) * 0.18;
    group.add(paper);
  }
  return group;
}

function makeServingStation(prosperous) {
  const group = new THREE.Group();
  const trolley = box(2.35, 0.72, 0.9, 'oak');
  trolley.position.y = 0.66;
  group.add(trolley);
  for (const x of [-0.9, 0.9]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 14), material('iron'));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.28, 0);
    group.add(wheel);
  }
  for (let index = 0; index < (prosperous ? 12 : 7); index += 1) {
    const dish = index % 3 === 0 ? makeLoaf(index, false) : new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 10), material('ceramic'));
    dish.position.set(-0.85 + (index % 5) * 0.43, 1.08 + Math.floor(index / 5) * 0.11, -0.18 + (index % 2) * 0.36);
    group.add(dish);
  }
  return group;
}

function makeBarricade(count) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const beam = box(2.3, 0.23, 0.32, index % 2 ? 'darkOak' : 'oak');
    beam.position.set((index - (count - 1) / 2) * 1.55, 0.52 + (index % 3) * 0.35, 0);
    beam.rotation.z = (index % 2 ? 1 : -1) * 0.15;
    group.add(beam);
    for (const offset of [-0.72, 0.72]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 5), material('iron'));
      spike.position.set(beam.position.x + offset, 1.22, 0);
      group.add(spike);
    }
  }
  return group;
}

function makeSupplyCrate(seed) {
  const group = new THREE.Group();
  const crate = box(0.95, 0.72, 0.78, seed % 2 ? 'oak' : 'darkOak');
  crate.position.y = 0.36;
  group.add(crate);
  for (const axis of [-0.33, 0.33]) {
    const band = box(0.08, 0.76, 0.82, 'iron');
    band.position.set(axis, 0.38, 0);
    group.add(band);
  }
  const mark = box(0.34, 0.28, 0.025, seed % 3 ? 'parchment' : 'redCloth');
  mark.position.set(0, 0.44, -0.41);
  group.add(mark);
  return group;
}

function makeCagedLantern(lit) {
  const group = new THREE.Group();
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.58, 6, 1, true), material('brass'));
  cage.position.y = 0.32;
  group.add(cage);
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    const bar = box(0.035, 0.62, 0.035, 'iron');
    bar.position.set(Math.cos(angle) * 0.25, 0.32, Math.sin(angle) * 0.25);
    group.add(bar);
  }
  if (lit) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 7), material('flame'));
    flame.position.y = 0.38;
    flame.name = 'landmark-flame';
    group.add(flame);
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.18, 6), material('darkOak'));
  cap.position.y = 0.7;
  group.add(cap);
  return group;
}

function makeWallLamp(lit) {
  const group = new THREE.Group();
  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 14, Math.PI), material('iron'));
  bracket.rotation.z = Math.PI / 2;
  bracket.position.y = 0.2;
  group.add(bracket);
  const lantern = makeCagedLantern(lit);
  lantern.scale.setScalar(0.55);
  lantern.position.set(0.38, -0.05, 0);
  group.add(lantern);
  return group;
}

function makeSpiceJar(seed, spoiled) {
  const group = new THREE.Group();
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.32 + (seed % 3) * 0.04, 8), material(spoiled ? 'slime' : seed % 2 ? 'ceramic' : 'bottleAmber'));
  jar.position.y = 0.17;
  group.add(jar);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 8), material('brass'));
  lid.position.y = 0.36;
  group.add(lid);
  return group;
}

function makeLoaf(seed, spoiled) {
  const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.17 + (seed % 2) * 0.035, 9, 6), material(spoiled ? 'herb' : 'bread'));
  loaf.scale.set(1.55, 0.62, 0.85);
  return loaf;
}

function makeFoodSack(seed, spoiled) {
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.25 + (seed % 2) * 0.035, 9, 6), material(spoiled ? 'herb' : seed % 3 === 0 ? 'redCloth' : 'linen'));
  sack.scale.set(0.9, 1.25, 0.8);
  return sack;
}

function makeCeramicPot(seed, spoiled) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.34 + (seed % 2) * 0.08, 9), material(spoiled ? 'slime' : 'ceramic'));
  pot.position.y = 0.18;
  group.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 5, 12), material('brass'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.37;
  group.add(rim);
  return group;
}

function makeWaterBarrel(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 1.2, 12), material(seed % 2 ? 'oak' : 'darkOak'));
  group.add(body);
  for (const y of [-0.42, 0, 0.42]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 5, 14), material('iron'));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    group.add(band);
  }
  return group;
}

function addAmbientClutter(root, seedKey, count, radiusX, radiusZ) {
  for (let index = 0; index < count; index += 1) {
    const xSeed = hash(`${seedKey}:x:${index}`);
    const zSeed = hash(`${seedKey}:z:${index}`);
    const x = (xSeed - 0.5) * radiusX * 2;
    const z = (zSeed - 0.5) * radiusZ * 2;
    if (Math.abs(x) < 1.15 && Math.abs(z) < 2.5) continue;
    let prop;
    if (index % 5 === 0) prop = makeBottle(index);
    else if (index % 5 === 1) prop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 7), material('ceramic'));
    else if (index % 5 === 2) prop = box(0.42, 0.08, 0.24, 'parchment');
    else if (index % 5 === 3) prop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), material('bread'));
    else prop = box(0.18, 0.06, 0.48, 'darkOak');
    prop.position.set(x, 0.17, z);
    prop.rotation.y = hash(`${seedKey}:r:${index}`) * Math.PI * 2;
    root.add(prop);
  }
}

function material(name) {
  const [color, roughness = 0.82, metalness = 0, emissive = 0x000000] = PALETTE[name] ?? PALETTE.limestone;
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.62 : 0,
    transparent: name === 'water' || name === 'slime',
    opacity: name === 'water' ? 0.72 : name === 'slime' ? 0.8 : 1,
    depthWrite: name !== 'water'
  });
}

function transparentMaterial(color, opacity) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.03, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function box(width, height, depth, materialName = 'limestone') {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(materialName));
}

function pillar(radius, height, materialName = 'limestone') {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 9), material(materialName));
}

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return ((result >>> 0) % 10000) / 10000;
}
