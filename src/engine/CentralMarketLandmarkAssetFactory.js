import { THREE } from './ThreeScene.js';

const BUNDLE_ID = 'market.crossroads.grand';

const COLORS = Object.freeze({
  oldStone: 0x514b50,
  paleStone: 0x8a8177,
  blackStone: 0x27272d,
  brass: 0xb1843f,
  iron: 0x484c52,
  timber: 0x5b3927,
  darkTimber: 0x32231c,
  parchment: 0xc8ae7b,
  goblinGreen: 0x4e6d3d,
  goblinRed: 0x8c3c35,
  adventurerBlue: 0x365c7d,
  adventurerGold: 0xc79a45,
  orcRed: 0x7f2729,
  orcBlack: 0x211f22,
  ash: 0x38353a,
  water: 0x4d899b,
  ember: 0xe5743e,
  glass: 0x7ba7ae
});

export class CentralMarketLandmarkAssetFactory {
  create(bundleId, context = {}) {
    if (bundleId !== BUNDLE_ID) return null;
    const state = context.state ?? context.stateVariant ?? 'neutral-ruin';
    const root = new THREE.Group();
    root.name = `central-market:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.state = state;

    buildCrossroadsFloor(root);
    buildCardinalArches(root, state);
    buildCentralMonument(root, state);
    buildTrafficFurniture(root, state);
    applyMarketState(root, state);
    return root;
  }
}

function buildCrossroadsFloor(root) {
  const plaza = box(17.4, 0.22, 13.4, COLORS.oldStone, 0.92);
  plaza.position.y = 0.11;
  root.add(plaza);

  const eastWest = box(20.8, 0.18, 4.6, COLORS.paleStone, 0.86);
  eastWest.position.y = 0.22;
  root.add(eastWest);
  const northSouth = box(5.2, 0.2, 16.8, COLORS.paleStone, 0.86);
  northSouth.position.y = 0.23;
  root.add(northSouth);

  for (let ring = 0; ring < 4; ring += 1) {
    const mosaic = new THREE.Mesh(
      new THREE.RingGeometry(1.45 + ring * 0.52, 1.75 + ring * 0.52, 26),
      standard(ring % 2 ? COLORS.brass : COLORS.blackStone, 0.62, ring % 2 ? 0.58 : 0.05)
    );
    mosaic.rotation.x = -Math.PI / 2;
    mosaic.position.y = 0.35 + ring * 0.002;
    root.add(mosaic);
  }

  for (let sector = 0; sector < 13; sector += 1) {
    const angle = sector * Math.PI * 2 / 13;
    const tile = box(0.64, 0.035, 1.48, sector % 3 === 0 ? COLORS.brass : COLORS.blackStone, 0.7);
    tile.position.set(Math.cos(angle) * 3.75, 0.37, Math.sin(angle) * 3.75);
    tile.rotation.y = -angle;
    tile.name = 'district-mosaic';
    tile.userData.districtIndex = sector;
    root.add(tile);
  }

  for (let index = 0; index < 42; index += 1) {
    const angle = deterministic(`paving:${index}`) * Math.PI * 2;
    const radius = 4.8 + deterministic(`radius:${index}`) * 4.6;
    const inset = box(0.34 + index % 4 * 0.08, 0.03, 0.52 + index % 3 * 0.1, index % 5 === 0 ? COLORS.brass : COLORS.blackStone, 0.82);
    inset.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius * 0.72);
    inset.rotation.y = angle + index * 0.17;
    root.add(inset);
  }
}

function buildCardinalArches(root, state) {
  const directions = [
    { x: 0, z: -7.35, rotation: 0, name: 'north-arch' },
    { x: 0, z: 7.35, rotation: Math.PI, name: 'south-arch' },
    { x: -9.55, z: 0, rotation: Math.PI / 2, name: 'west-arch' },
    { x: 9.55, z: 0, rotation: -Math.PI / 2, name: 'east-arch' }
  ];

  directions.forEach((direction, index) => {
    const arch = makeGrandArch(index, state);
    arch.position.set(direction.x, 0, direction.z);
    arch.rotation.y = direction.rotation;
    arch.name = direction.name;
    root.add(arch);
  });
}

function makeGrandArch(index, state) {
  const group = new THREE.Group();
  for (const x of [-1.9, 1.9]) {
    const pier = box(1.02, 4.9, 1.22, index % 2 ? COLORS.oldStone : COLORS.blackStone, 0.9);
    pier.position.set(x, 2.45, 0);
    group.add(pier);
    const base = box(1.38, 0.48, 1.55, COLORS.paleStone, 0.82);
    base.position.set(x, 0.24, 0);
    group.add(base);
    const capital = box(1.44, 0.42, 1.52, COLORS.brass, 0.55, 0.62);
    capital.position.set(x, 4.58, 0);
    group.add(capital);
  }

  const lintel = box(4.9, 0.85, 1.35, COLORS.blackStone, 0.92);
  lintel.position.y = 4.72;
  group.add(lintel);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.42, 16, 1, false, 0, Math.PI), standard(COLORS.oldStone, 0.9));
  crown.rotation.z = Math.PI / 2;
  crown.rotation.y = Math.PI / 2;
  crown.position.y = 5.05;
  group.add(crown);

  const routePlaque = box(2.45, 0.72, 0.14, COLORS.parchment, 0.78);
  routePlaque.position.set(0, 3.65, -0.76);
  routePlaque.name = 'route-sign';
  group.add(routePlaque);

  for (let rune = 0; rune < 3; rune += 1) {
    const mark = box(0.16, 0.38 + rune * 0.08, 0.04, COLORS.brass, 0.48, 0.7);
    mark.position.set(-0.65 + rune * 0.65, 3.65, -0.86);
    mark.rotation.z = -0.25 + rune * 0.25;
    group.add(mark);
  }

  if (state === 'battlefield') {
    lintel.rotation.z = index % 2 ? 0.07 : -0.05;
    for (let shard = 0; shard < 5; shard += 1) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 + shard * 0.035, 0), standard(shard % 2 ? COLORS.oldStone : COLORS.blackStone, 0.95));
      rubble.position.set(-2.4 + shard * 1.15, 0.22, -0.3 + shard % 2 * 0.5);
      group.add(rubble);
    }
  }
  return group;
}

function buildCentralMonument(root, state) {
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.55, 0.55, 16), standard(COLORS.blackStone, 0.88));
  dais.position.y = 0.62;
  root.add(dais);

  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.05, 0.72, 16, 1, true), standard(COLORS.paleStone, 0.82));
  fountain.position.y = 1.1;
  fountain.name = 'central-fountain-ruin';
  root.add(fountain);

  if (state !== 'neutral-ruin' && state !== 'battlefield') {
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.08, 18), transparent(COLORS.water, 0.68));
    water.position.y = 1.04;
    water.name = 'water-surface';
    root.add(water);
  }

  const wayfinder = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 5.8, 8), standard(COLORS.brass, 0.5, 0.7));
  mast.position.y = 3.85;
  wayfinder.add(mast);
  for (let tier = 0; tier < 4; tier += 1) {
    const arm = box(3.5 - tier * 0.42, 0.22, 0.25, tier % 2 ? COLORS.darkTimber : COLORS.brass, 0.62, tier % 2 ? 0.03 : 0.68);
    arm.position.set(tier % 2 ? 0.58 : -0.58, 2.2 + tier * 0.72, 0);
    arm.rotation.y = tier * Math.PI / 4;
    wayfinder.add(arm);
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.64, 5), standard(COLORS.brass, 0.52, 0.7));
    pointer.rotation.z = -Math.PI / 2;
    pointer.position.set((3.5 - tier * 0.42) / 2 + (tier % 2 ? 0.58 : -0.58), 2.2 + tier * 0.72, 0);
    wayfinder.add(pointer);
  }
  const crown = makeMarketLantern(0.9);
  crown.position.y = 6.85;
  crown.name = 'landmark-flame';
  wayfinder.add(crown);
  wayfinder.name = 'central-wayfinder';
  root.add(wayfinder);

  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.1, 7), standard(COLORS.iron, 0.66, 0.72));
    bollard.position.set(Math.cos(angle) * 3.1, 1.2, Math.sin(angle) * 3.1);
    root.add(bollard);
    const chain = makeChain(4);
    chain.position.set(Math.cos(angle) * 3.1, 1.54, Math.sin(angle) * 3.1);
    chain.rotation.y = -angle;
    root.add(chain);
  }
}

function buildTrafficFurniture(root, state) {
  const scale = makeCargoScale();
  scale.position.set(-6.25, 0, -3.35);
  scale.rotation.y = 0.35;
  scale.name = 'cargo-scale';
  root.add(scale);

  const dispatchBoard = makeDispatchBoard();
  dispatchBoard.position.set(6.15, 0, 3.35);
  dispatchBoard.rotation.y = -0.45;
  dispatchBoard.name = 'market-notice-board';
  root.add(dispatchBoard);

  for (let index = 0; index < 6; index += 1) {
    const crate = makeCargoStack(index);
    const angle = index * Math.PI / 3 + 0.35;
    crate.position.set(Math.cos(angle) * 7.25, 0, Math.sin(angle) * 5.15);
    crate.rotation.y = -angle;
    crate.name = 'supply-lane';
    root.add(crate);
  }

  for (let index = 0; index < 4; index += 1) {
    const lantern = makeMarketLantern(0.5);
    lantern.position.set(index < 2 ? -7.7 : 7.7, 2.55, index % 2 ? -4.75 : 4.75);
    lantern.name = 'landmark-flame';
    root.add(lantern);
  }

  if (state === 'neutral-ruin') addNeutralRuin(root);
  if (state === 'goblin-market') addGoblinMarket(root);
  if (state === 'adventurer-market') addAdventurerMarket(root);
  if (state === 'orc-checkpoint') addOrcCheckpoint(root);
  if (state === 'battlefield') addBattlefield(root);
}

function applyMarketState(root, state) {
  root.userData.marketState = state;
  if (state === 'battlefield') {
    root.traverse(node => {
      if (node.isMesh && node.material?.color && node.name !== 'landmark-flame') node.material.color.multiplyScalar(0.72);
    });
  }
}

function addNeutralRuin(root) {
  for (let index = 0; index < 18; index += 1) {
    const angle = deterministic(`ruin-angle:${index}`) * Math.PI * 2;
    const radius = 3.2 + deterministic(`ruin-radius:${index}`) * 6.1;
    const rubble = index % 4 === 0
      ? box(1.1 + index % 3 * 0.28, 0.2, 0.34, COLORS.darkTimber, 0.94)
      : new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + index % 5 * 0.045, 0), standard(index % 2 ? COLORS.oldStone : COLORS.blackStone, 0.95));
    rubble.position.set(Math.cos(angle) * radius, 0.42 + index % 3 * 0.05, Math.sin(angle) * radius * 0.72);
    rubble.rotation.set(index * 0.11, angle, index % 2 ? 0.28 : -0.2);
    root.add(rubble);
  }
  for (let index = 0; index < 3; index += 1) {
    const deadStall = makeMarketStall(index, COLORS.ash, COLORS.darkTimber, false);
    deadStall.position.set(-5.4 + index * 5.3, 0, index % 2 ? 4.65 : -4.5);
    deadStall.rotation.z = index % 2 ? 0.06 : -0.09;
    root.add(deadStall);
  }
}

function addGoblinMarket(root) {
  const positions = [[-5.8,-4.3],[-2.3,-5.2],[2.1,-5.1],[5.7,-4.1],[-5.6,4.2],[-1.8,5.1],[2.5,5.0],[5.8,4.0]];
  positions.forEach((position, index) => {
    const stall = makeMarketStall(index, index % 2 ? COLORS.goblinGreen : COLORS.goblinRed, COLORS.darkTimber, true);
    stall.position.set(position[0], 0, position[1]);
    stall.rotation.y = position[1] > 0 ? Math.PI : 0;
    stall.name = 'goblin-stall';
    root.add(stall);
  });
  for (let index = 0; index < 12; index += 1) {
    const junk = index % 3 === 0
      ? new THREE.Mesh(new THREE.TorusGeometry(0.18 + index % 4 * 0.04, 0.035, 5, 10), standard(COLORS.iron, 0.7, 0.65))
      : box(0.35 + index % 3 * 0.16, 0.2, 0.28, index % 2 ? COLORS.brass : COLORS.timber, 0.72, index % 2 ? 0.55 : 0.04);
    const angle = index * 0.91;
    junk.position.set(Math.cos(angle) * 5.0, 0.48 + index % 3 * 0.08, Math.sin(angle) * 3.5);
    junk.rotation.y = angle;
    root.add(junk);
  }
  addFactionBanners(root, COLORS.goblinGreen, COLORS.goblinRed, 'goblin-market-banner');
}

function addAdventurerMarket(root) {
  const positions = [[-5.8,-4.4],[-1.9,-5.1],[2.0,-5.1],[5.8,-4.4],[-5.8,4.4],[-1.9,5.1],[2.0,5.1],[5.8,4.4]];
  positions.forEach((position, index) => {
    const stall = makeMarketStall(index, index % 2 ? COLORS.adventurerBlue : COLORS.adventurerGold, COLORS.timber, true);
    stall.position.set(position[0], 0, position[1]);
    stall.rotation.y = position[1] > 0 ? Math.PI : 0;
    stall.name = 'adventurer-stall';
    root.add(stall);
  });
  const guildBoard = makeDispatchBoard();
  guildBoard.position.set(5.8, 0, -3.2);
  guildBoard.name = 'party-registry';
  root.add(guildBoard);
  const supplyTent = makeSupplyTent();
  supplyTent.position.set(-5.65, 0, 0.2);
  supplyTent.rotation.y = Math.PI / 2;
  supplyTent.name = 'adventurer-supply';
  root.add(supplyTent);
  addFactionBanners(root, COLORS.adventurerBlue, COLORS.adventurerGold, 'adventurer-market-banner');
}

function addOrcCheckpoint(root) {
  for (const z of [-5.35, 5.35]) {
    const gate = makeCheckpointGate();
    gate.position.set(0, 0, z);
    gate.rotation.y = z > 0 ? Math.PI : 0;
    gate.name = 'orc-toll-gate';
    root.add(gate);
  }
  for (let index = 0; index < 10; index += 1) {
    const barricade = makeSpikedBarricade(index);
    const side = index < 5 ? -1 : 1;
    barricade.position.set(side * (5.0 + index % 5 * 0.75), 0, -3.0 + index % 5 * 1.5);
    barricade.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(barricade);
  }
  const drum = makeWarDrum();
  drum.position.set(-4.0, 0, 2.6);
  drum.name = 'checkpoint-drum';
  root.add(drum);
  const rack = makeWeaponRack();
  rack.position.set(4.0, 0, -2.6);
  rack.name = 'checkpoint-weapons';
  root.add(rack);
  addFactionBanners(root, COLORS.orcRed, COLORS.orcBlack, 'orc-checkpoint-banner');
}

function addBattlefield(root) {
  for (let index = 0; index < 20; index += 1) {
    const angle = deterministic(`battle-angle:${index}`) * Math.PI * 2;
    const radius = 2.7 + deterministic(`battle-radius:${index}`) * 7.2;
    const debris = index % 5 === 0
      ? makeBrokenCart(index)
      : index % 3 === 0
        ? makeSpikedBarricade(index)
        : box(0.18, 1.0 + index % 4 * 0.28, 0.2, index % 2 ? COLORS.iron : COLORS.darkTimber, 0.84, index % 2 ? 0.68 : 0.04);
    debris.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.7);
    debris.rotation.set(0, angle, index % 2 ? 0.28 : -0.25);
    root.add(debris);
  }
  for (let index = 0; index < 7; index += 1) {
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.6 + index * 0.12, 12), transparent(index % 2 ? COLORS.ash : COLORS.ember, 0.5));
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.set(-5.4 + index * 1.8, 0.37, index % 2 ? 2.7 : -2.5);
    root.add(scorch);
  }
  for (let index = 0; index < 5; index += 1) {
    const torn = makeBanner(index % 2 ? COLORS.orcRed : COLORS.adventurerBlue, COLORS.ash, true);
    torn.position.set(-6.4 + index * 3.2, 0, index % 2 ? 4.5 : -4.5);
    torn.rotation.z = index % 2 ? 0.16 : -0.2;
    root.add(torn);
  }
}

function makeMarketStall(seed, canopyColor, timberColor, stocked) {
  const group = new THREE.Group();
  const counter = box(2.65, 0.78, 1.05, timberColor, 0.9);
  counter.position.y = 0.39;
  group.add(counter);
  for (const x of [-1.15, 1.15]) {
    const post = box(0.14, 2.8, 0.14, COLORS.darkTimber, 0.94);
    post.position.set(x, 1.4, 0);
    group.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.72, 4), standard(canopyColor, 0.94));
  canopy.rotation.y = Math.PI / 4;
  canopy.scale.z = 0.7;
  canopy.position.y = 2.75;
  canopy.name = 'market-canopy';
  group.add(canopy);
  if (stocked) {
    for (let index = 0; index < 9; index += 1) {
      const wares = index % 3 === 0
        ? new THREE.Mesh(new THREE.SphereGeometry(0.13 + index % 2 * 0.05, 7, 5), standard(index % 2 ? COLORS.goblinGreen : COLORS.parchment, 0.88))
        : index % 3 === 1
          ? box(0.28, 0.18, 0.22, index % 2 ? COLORS.brass : COLORS.timber, 0.72, index % 2 ? 0.55 : 0.04)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.38, 7), transparent(COLORS.glass, 0.58));
      wares.position.set(-1.02 + index % 5 * 0.5, 0.88 + Math.floor(index / 5) * 0.25, -0.32 + index % 2 * 0.55);
      wares.rotation.y = seed * 0.23 + index * 0.18;
      group.add(wares);
    }
  }
  return group;
}

function makeCargoScale() {
  const group = new THREE.Group();
  const base = box(2.8, 0.3, 2.3, COLORS.oldStone, 0.9);
  base.position.y = 0.15;
  group.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.0, 8), standard(COLORS.iron, 0.62, 0.72));
  post.position.y = 1.7;
  group.add(post);
  const beam = box(3.5, 0.14, 0.16, COLORS.brass, 0.5, 0.7);
  beam.position.y = 3.1;
  group.add(beam);
  for (const x of [-1.42, 1.42]) {
    const chains = makeChain(5);
    chains.position.set(x, 3.0, 0);
    group.add(chains);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.62, 0.15, 12), standard(COLORS.brass, 0.5, 0.65));
    pan.position.set(x, 1.72, 0);
    group.add(pan);
  }
  return group;
}

function makeDispatchBoard() {
  const group = new THREE.Group();
  for (const x of [-1.2, 1.2]) {
    const post = box(0.17, 2.7, 0.17, COLORS.darkTimber, 0.94);
    post.position.set(x, 1.35, 0);
    group.add(post);
  }
  const board = box(2.9, 1.65, 0.18, COLORS.timber, 0.9);
  board.position.y = 1.85;
  group.add(board);
  for (let index = 0; index < 12; index += 1) {
    const note = box(0.42 + index % 3 * 0.12, 0.38 + index % 2 * 0.1, 0.025, index % 4 === 0 ? COLORS.adventurerBlue : COLORS.parchment, 0.9);
    note.position.set(-1.0 + index % 4 * 0.66, 1.32 + Math.floor(index / 4) * 0.48, -0.12);
    note.rotation.z = index % 2 ? 0.06 : -0.08;
    group.add(note);
  }
  return group;
}

function makeCargoStack(seed) {
  const group = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const item = index % 3 === 0
      ? new THREE.Mesh(new THREE.SphereGeometry(0.34 + index % 2 * 0.08, 8, 6), standard(index % 2 ? COLORS.parchment : COLORS.goblinRed, 0.92))
      : box(0.72 + index % 2 * 0.18, 0.5, 0.58, index % 2 ? COLORS.timber : COLORS.darkTimber, 0.9);
    item.position.set(-0.42 + index % 3 * 0.48, 0.32 + Math.floor(index / 3) * 0.48, index % 2 * 0.26);
    item.rotation.y = seed * 0.25 + index * 0.18;
    group.add(item);
  }
  return group;
}

function makeSupplyTent() {
  const group = new THREE.Group();
  const canvas = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.5, 4), standard(COLORS.adventurerBlue, 0.94));
  canvas.rotation.y = Math.PI / 4;
  canvas.scale.z = 0.72;
  canvas.position.y = 1.25;
  group.add(canvas);
  for (const x of [-1.3, 1.3]) {
    const crate = box(0.85, 0.55, 0.72, COLORS.timber, 0.9);
    crate.position.set(x, 0.28, 0.6);
    group.add(crate);
  }
  return group;
}

function makeCheckpointGate() {
  const group = new THREE.Group();
  for (const x of [-2.2, 2.2]) {
    const tower = box(1.15, 3.9, 1.15, COLORS.orcBlack, 0.92);
    tower.position.set(x, 1.95, 0);
    group.add(tower);
    for (let spike = 0; spike < 4; spike += 1) {
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 5), standard(COLORS.iron, 0.62, 0.72));
      point.position.set(x - 0.42 + spike * 0.28, 4.25, 0);
      group.add(point);
    }
  }
  const barrier = box(4.2, 0.26, 0.34, COLORS.orcRed, 0.86);
  barrier.position.y = 1.15;
  barrier.rotation.z = -0.08;
  group.add(barrier);
  return group;
}

function makeSpikedBarricade(seed) {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const beam = box(1.9, 0.2, 0.24, index % 2 ? COLORS.darkTimber : COLORS.timber, 0.92);
    beam.position.set(0, 0.45 + index * 0.35, 0);
    beam.rotation.z = index % 2 ? 0.14 : -0.11;
    group.add(beam);
  }
  for (let index = 0; index < 4; index += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.72, 5), standard(COLORS.iron, 0.62, 0.7));
    spike.position.set(-0.72 + index * 0.48, 1.28, 0);
    spike.rotation.z = seed % 2 ? 0.1 : -0.1;
    group.add(spike);
  }
  return group;
}

function makeWarDrum() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.3, 14), standard(COLORS.orcRed, 0.82));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.95;
  group.add(body);
  for (const x of [-0.65, 0.65]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 6, 16), standard(COLORS.iron, 0.62, 0.72));
    rim.rotation.y = Math.PI / 2;
    rim.position.set(x, 0.95, 0);
    group.add(rim);
  }
  return group;
}

function makeWeaponRack() {
  const group = new THREE.Group();
  const rack = box(3.1, 1.8, 0.55, COLORS.darkTimber, 0.94);
  rack.position.y = 0.9;
  group.add(rack);
  for (let index = 0; index < 7; index += 1) {
    const shaft = box(0.08, 2.4, 0.08, COLORS.timber, 0.9);
    shaft.position.set(-1.2 + index * 0.4, 1.4, -0.35);
    shaft.rotation.z = index % 2 ? 0.08 : -0.06;
    group.add(shaft);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.14 + index % 3 * 0.03, 0.48, 5), standard(COLORS.iron, 0.62, 0.72));
    blade.position.set(shaft.position.x, 2.72, -0.35);
    group.add(blade);
  }
  return group;
}

function makeBrokenCart(seed) {
  const group = new THREE.Group();
  const bed = box(2.2, 0.28, 1.2, COLORS.darkTimber, 0.94);
  bed.position.y = 0.62;
  bed.rotation.z = seed % 2 ? 0.16 : -0.12;
  group.add(bed);
  for (const x of [-0.85, 0.85]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 7, 16), standard(COLORS.iron, 0.65, 0.7));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.35, seed % 2 ? 0.35 : -0.35);
    group.add(wheel);
  }
  const shaft = box(2.6, 0.14, 0.14, COLORS.timber, 0.9);
  shaft.position.set(1.75, 0.45, 0);
  shaft.rotation.z = -0.14;
  group.add(shaft);
  return group;
}

function addFactionBanners(root, primary, secondary, name) {
  const positions = [[-8.0,-5.5],[8.0,-5.5],[-8.0,5.5],[8.0,5.5]];
  positions.forEach((position, index) => {
    const banner = makeBanner(index % 2 ? primary : secondary, index % 2 ? secondary : primary, false);
    banner.position.set(position[0], 0, position[1]);
    banner.name = name;
    root.add(banner);
  });
}

function makeBanner(primary, secondary, torn) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.0, 7), standard(COLORS.iron, 0.62, 0.72));
  pole.position.y = 2.0;
  group.add(pole);
  const cloth = box(1.35, torn ? 1.15 : 1.75, 0.055, primary, 0.95);
  cloth.position.set(0.72, torn ? 2.45 : 2.7, 0);
  cloth.rotation.z = torn ? -0.18 : 0;
  cloth.name = 'hanging-prop';
  group.add(cloth);
  const emblem = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.36, 7), standard(secondary, 0.7, 0.25));
  emblem.position.set(0.72, torn ? 2.45 : 2.72, -0.05);
  group.add(emblem);
  return group;
}

function makeMarketLantern(scale) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.23 * scale, 0.31 * scale, 0.62 * scale, 6, 1, true), standard(COLORS.brass, 0.48, 0.68));
  frame.position.y = 0.32 * scale;
  group.add(frame);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 7, 5), emissive(COLORS.ember));
  glow.position.y = 0.34 * scale;
  glow.name = 'landmark-flame';
  group.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36 * scale, 0.24 * scale, 6), standard(COLORS.blackStone, 0.9));
  cap.position.y = 0.72 * scale;
  group.add(cap);
  return group;
}

function makeChain(count) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 5, 10), standard(COLORS.iron, 0.62, 0.72));
    link.rotation.y = index % 2 ? Math.PI / 2 : 0;
    link.position.y = -index * 0.2;
    group.add(link);
  }
  return group;
}

function box(width, height, depth, color, roughness = 0.85, metalness = 0.03) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), standard(color, roughness, metalness));
}

function standard(color, roughness = 0.82, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function transparent(color, opacity) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function emissive(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.24,
    emissive: color,
    emissiveIntensity: 0.72
  });
}

function deterministic(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
