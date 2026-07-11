import { THREE } from './ThreeScene.js';

const SUPPORTED = new Set([
  'inn.old-lantern.guest-wing',
  'inn.old-lantern.cellar',
  'inn.old-lantern.secret-office'
]);

const PALETTE = Object.freeze({
  stone: [0x4c4850, 0.88, 0.04],
  paleStone: [0x817a70, 0.78, 0.03],
  timber: [0x5b3825, 0.9, 0.02],
  darkTimber: [0x30221b, 0.96, 0.01],
  iron: [0x42464d, 0.7, 0.7],
  brass: [0xa97838, 0.48, 0.68],
  leather: [0x704431, 0.9, 0.02],
  linen: [0xc4b9a1, 0.95, 0.01],
  redCloth: [0x692c38, 0.96, 0.01],
  blueCloth: [0x354a63, 0.94, 0.01],
  parchment: [0xc9ae79, 0.9, 0.01],
  wax: [0x8f2c35, 0.8, 0.02],
  glass: [0x6e9ca3, 0.22, 0.08],
  water: [0x3f7f90, 0.3, 0.05],
  fungus: [0x66794b, 0.92, 0.01],
  spore: [0x8ecf9d, 0.76, 0.02, 0x4c9a68],
  web: [0xd7d4cc, 0.84, 0.01],
  soot: [0x17161a, 1, 0]
});

export class OldLanternAnnexAssetFactory {
  create(bundleId, context = {}) {
    if (!SUPPORTED.has(bundleId)) return null;
    const root = new THREE.Group();
    const state = context.state ?? context.stateVariant ?? null;
    root.name = `old-lantern-annex:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.state = state;

    if (bundleId === 'inn.old-lantern.guest-wing') buildGuestWing(root, state);
    if (bundleId === 'inn.old-lantern.cellar') buildCellar(root, state);
    if (bundleId === 'inn.old-lantern.secret-office') buildSecretOffice(root, state);

    return root;
  }
}

function buildGuestWing(root, state) {
  const corridor = box(10.2, 0.18, 3.4, 'darkTimber');
  corridor.position.y = 0.09;
  root.add(corridor);

  for (const side of [-1, 1]) {
    const gallery = box(10.4, 0.14, 0.72, 'timber');
    gallery.position.set(0, 0.12, side * 3.15);
    root.add(gallery);

    for (let index = 0; index < 4; index += 1) {
      const room = makeGuestRoom(index, side, state);
      room.position.set(-3.75 + index * 2.5, 0, side * 2.28);
      room.rotation.y = side < 0 ? Math.PI : 0;
      root.add(room);
    }
  }

  for (let index = 0; index < 5; index += 1) {
    const arch = makeTimberArch();
    arch.position.x = -5 + index * 2.5;
    root.add(arch);
  }

  const linenCart = makeLinenCart();
  linenCart.position.set(-4.3, 0, 0.7);
  linenCart.rotation.y = 0.28;
  linenCart.name = 'linen-service';
  root.add(linenCart);

  const residentDesk = makeResidentDesk();
  residentDesk.position.set(4.35, 0, -0.65);
  residentDesk.name = 'resident-profession';
  root.add(residentDesk);

  for (let index = 0; index < 4; index += 1) {
    const lamp = makeWallLamp();
    lamp.position.set(-3.75 + index * 2.5, 2.55, 0);
    lamp.name = 'landmark-flame';
    root.add(lamp);
  }

  if (state === 'partitioned-camp') addCampPartitions(root);
  if (state === 'collapsed') addCollapsedWing(root);
  if (state === 'webbed') addWebInfestation(root);
}

function makeGuestRoom(index, side, state) {
  const group = new THREE.Group();
  const frame = box(2.15, 2.7, 0.18, 'darkTimber');
  frame.position.y = 1.35;
  group.add(frame);

  const door = box(1.35, 2.28, 0.15, index % 2 ? 'timber' : 'darkTimber');
  door.position.set(0, 1.14, -0.16);
  door.rotation.y = state === 'collapsed' && index % 2 ? 0.22 * side : 0;
  group.add(door);

  for (const x of [-0.48, 0, 0.48]) {
    const brace = box(0.08, 2.05, 0.07, 'iron');
    brace.position.set(x, 1.15, -0.26);
    group.add(brace);
  }

  const threshold = box(1.75, 0.12, 0.52, 'paleStone');
  threshold.position.set(0, 0.06, -0.25);
  group.add(threshold);

  const chamber = new THREE.Group();
  chamber.position.z = 1.35;
  const bed = makeBed(index, state);
  bed.position.set(-0.42, 0, 0.15);
  chamber.add(bed);
  const chest = makeTravelChest(index);
  chest.position.set(0.62, 0, 0.7);
  chamber.add(chest);
  const rug = box(1.7, 0.035, 1.05, index % 2 ? 'redCloth' : 'blueCloth');
  rug.position.set(0, 0.03, 0.25);
  chamber.add(rug);
  group.add(chamber);
  return group;
}

function makeBed(seed, state) {
  const group = new THREE.Group();
  const frame = box(1.25, 0.22, 2.05, 'darkTimber');
  frame.position.y = 0.34;
  group.add(frame);
  const mattress = box(1.12, 0.24, 1.88, 'linen');
  mattress.position.y = 0.56;
  mattress.rotation.z = state === 'collapsed' && seed % 2 ? 0.12 : 0;
  group.add(mattress);
  const blanket = box(1.15, 0.08, 1.05, seed % 2 ? 'redCloth' : 'blueCloth');
  blanket.position.set(0, 0.72, 0.33);
  group.add(blanket);
  const pillow = box(0.78, 0.16, 0.38, 'linen');
  pillow.position.set(0, 0.75, -0.65);
  group.add(pillow);
  for (const z of [-0.9, 0.9]) {
    for (const x of [-0.48, 0.48]) {
      const post = pillar(0.055, 1.02, 'timber');
      post.position.set(x, 0.51, z);
      group.add(post);
    }
  }
  return group;
}

function makeTravelChest(seed) {
  const group = new THREE.Group();
  const body = box(0.82, 0.52, 0.58, seed % 2 ? 'leather' : 'timber');
  body.position.y = 0.26;
  group.add(body);
  for (const x of [-0.28, 0.28]) {
    const band = box(0.08, 0.56, 0.62, 'iron');
    band.position.set(x, 0.28, 0);
    group.add(band);
  }
  const latch = box(0.18, 0.22, 0.08, 'brass');
  latch.position.set(0, 0.34, -0.34);
  group.add(latch);
  return group;
}

function makeTimberArch() {
  const group = new THREE.Group();
  for (const z of [-1.5, 1.5]) {
    const post = box(0.18, 3.15, 0.18, 'darkTimber');
    post.position.set(0, 1.58, z);
    group.add(post);
  }
  const beam = box(0.22, 0.22, 3.3, 'timber');
  beam.position.y = 3.08;
  group.add(beam);
  return group;
}

function makeLinenCart() {
  const group = new THREE.Group();
  const cart = box(1.55, 0.72, 0.85, 'timber');
  cart.position.y = 0.58;
  group.add(cart);
  for (const x of [-0.62, 0.62]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 6, 14), material('iron'));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.3, 0);
    group.add(wheel);
  }
  for (let index = 0; index < 6; index += 1) {
    const folded = box(0.62, 0.1, 0.48, index % 2 ? 'linen' : 'blueCloth');
    folded.position.set(-0.35 + (index % 2) * 0.68, 0.98 + Math.floor(index / 2) * 0.11, 0);
    group.add(folded);
  }
  return group;
}

function makeResidentDesk() {
  const group = new THREE.Group();
  const desk = box(1.8, 0.18, 0.92, 'timber');
  desk.position.y = 0.94;
  group.add(desk);
  for (const x of [-0.72, 0.72]) {
    const leg = box(0.15, 0.9, 0.15, 'darkTimber');
    leg.position.set(x, 0.45, 0);
    group.add(leg);
  }
  const ledger = box(0.72, 0.08, 0.5, 'parchment');
  ledger.position.set(-0.35, 1.08, 0);
  ledger.rotation.y = -0.18;
  group.add(ledger);
  const keyBoard = box(0.55, 0.8, 0.1, 'darkTimber');
  keyBoard.position.set(0.55, 1.42, 0.34);
  group.add(keyBoard);
  for (let index = 0; index < 8; index += 1) {
    const key = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 5, 10), material('brass'));
    key.position.set(0.34 + (index % 4) * 0.14, 1.58 - Math.floor(index / 4) * 0.28, 0.26);
    group.add(key);
  }
  return group;
}

function addCampPartitions(root) {
  for (let index = 0; index < 5; index += 1) {
    const partition = box(0.12, 1.75, 2.15, index % 2 ? 'redCloth' : 'linen');
    partition.position.set(-4 + index * 2, 0.88, index % 2 ? 0.85 : -0.85);
    partition.rotation.y = index % 2 ? 0.18 : -0.18;
    root.add(partition);
    const bedroll = box(1.45, 0.12, 0.58, index % 2 ? 'blueCloth' : 'redCloth');
    bedroll.position.set(-4 + index * 2, 0.08, index % 2 ? -0.9 : 0.9);
    root.add(bedroll);
  }
}

function addCollapsedWing(root) {
  for (let index = 0; index < 14; index += 1) {
    const debris = index % 3 === 0
      ? box(0.22, 1.5 + (index % 4) * 0.3, 0.22, 'darkTimber')
      : box(0.55 + (index % 3) * 0.28, 0.16, 0.42, index % 2 ? 'stone' : 'timber');
    const angle = hash(`collapsed:${index}`) * Math.PI * 2;
    debris.position.set(Math.cos(angle) * (2.2 + index * 0.19), 0.18 + (index % 3) * 0.07, Math.sin(angle) * (1.2 + index * 0.11));
    debris.rotation.set(index * 0.08, angle, index % 2 ? 0.22 : -0.18);
    root.add(debris);
  }
}

function addWebInfestation(root) {
  for (let index = 0; index < 8; index += 1) {
    const web = new THREE.Mesh(new THREE.CircleGeometry(0.55 + (index % 3) * 0.22, 10), webMaterial());
    web.position.set(-4.1 + index * 1.18, 1.55 + (index % 2) * 0.82, index % 2 ? 2.4 : -2.4);
    web.rotation.y = index % 2 ? Math.PI : 0;
    web.name = 'web-infiltration';
    root.add(web);
  }
  for (let index = 0; index < 4; index += 1) {
    const cocoon = makeCocoon(index);
    cocoon.position.set(-3.3 + index * 2.2, 2.2 + (index % 2) * 0.35, index % 2 ? 2.15 : -2.15);
    cocoon.name = 'hanging-prop';
    root.add(cocoon);
  }
}

function buildCellar(root, state) {
  const floor = box(11.4, 0.2, 7.8, 'stone');
  floor.position.y = 0.1;
  root.add(floor);

  const channel = box(10.8, 0.22, 1.15, 'darkStone');
  channel.position.set(0, 0.12, 0);
  root.add(channel);
  const water = box(10.4, 0.06, 0.82, 'water');
  water.position.set(0, 0.27, 0);
  water.name = 'water-surface';
  root.add(water);

  for (const side of [-1, 1]) {
    const rack = makeBarrelRack(5, side);
    rack.position.set(0, 0, side * 2.65);
    root.add(rack);
  }

  const brewery = makeBreweryCluster();
  brewery.position.set(-3.65, 0, 1.05);
  brewery.name = 'brewery-equipment';
  root.add(brewery);

  const provisions = makeCellarProvisions();
  provisions.position.set(3.85, 0, -1.25);
  provisions.name = 'food-storage';
  root.add(provisions);

  const hiddenDoor = makeHiddenCellarDoor(state);
  hiddenDoor.position.set(5.55, 0, 2.8);
  hiddenDoor.rotation.y = -Math.PI / 2;
  hiddenDoor.name = 'smuggling-door';
  root.add(hiddenDoor);

  const ratSocket = makeRatWarren();
  ratSocket.position.set(-5.1, 0, -3.25);
  ratSocket.name = 'rat-warren';
  root.add(ratSocket);

  for (let index = 0; index < 5; index += 1) {
    const lamp = makeWallLamp();
    lamp.position.set(-4.4 + index * 2.2, 2.25, index % 2 ? 3.25 : -3.25);
    lamp.name = 'landmark-flame';
    root.add(lamp);
  }

  if (state === 'flooded') addFloodedState(root);
  if (state === 'fungal-brewery') addFungalBrewery(root);
  if (state === 'raided') addRaidedCellar(root);
}

function makeBarrelRack(count, side) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const x = -4.35 + index * 2.15;
    for (let tier = 0; tier < 2; tier += 1) {
      const barrel = makeBarrel(index + tier);
      barrel.position.set(x, 0.58 + tier * 1.02, 0);
      barrel.rotation.z = Math.PI / 2;
      group.add(barrel);
    }
  }
  const rail = box(10.9, 0.18, 0.32, 'darkTimber');
  rail.position.set(0, 0.35, side * 0.18);
  group.add(rail);
  return group;
}

function makeBarrel(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 1.22, 12), material(seed % 3 ? 'timber' : 'darkTimber'));
  group.add(body);
  for (const y of [-0.42, 0, 0.42]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.035, 5, 14), material('iron'));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    group.add(band);
  }
  const tap = box(0.08, 0.08, 0.34, 'brass');
  tap.position.set(0, 0, -0.62);
  group.add(tap);
  return group;
}

function makeBreweryCluster() {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.72 + index * 0.08, 0.78, 1.6 + index * 0.2, 14), material(index === 1 ? 'brass' : 'iron'));
    vat.position.set(index * 1.45, 0.82 + index * 0.1, 0);
    group.add(vat);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.75 + index * 0.08, 0.45, 14), material('brass'));
    lid.position.set(index * 1.45, 1.85 + index * 0.18, 0);
    group.add(lid);
  }
  for (let index = 0; index < 4; index += 1) {
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.58 + index * 0.09, 0.055, 6, 16, Math.PI), material('brass'));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.7 + index * 0.45, 2.25 + index * 0.16, 0);
    group.add(pipe);
  }
  return group;
}

function makeCellarProvisions() {
  const group = new THREE.Group();
  const shelf = box(3.2, 2.4, 0.45, 'darkTimber');
  shelf.position.y = 1.2;
  group.add(shelf);
  for (let row = 0; row < 3; row += 1) {
    const rail = box(3.05, 0.12, 0.68, 'timber');
    rail.position.set(0, 0.45 + row * 0.78, -0.04);
    group.add(rail);
    for (let column = 0; column < 5; column += 1) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.42 + (column % 2) * 0.1, 8), material(column % 2 ? 'glass' : 'leather'));
      jar.position.set(-1.2 + column * 0.6, 0.73 + row * 0.78, -0.32);
      group.add(jar);
    }
  }
  for (let index = 0; index < 6; index += 1) {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.34 + (index % 2) * 0.08, 8, 6), material(index % 3 ? 'linen' : 'redCloth'));
    sack.scale.y = 1.3;
    sack.position.set(-1.35 + (index % 3) * 0.72, 0.38 + Math.floor(index / 3) * 0.45, 0.95);
    group.add(sack);
  }
  return group;
}

function makeHiddenCellarDoor(state) {
  const group = new THREE.Group();
  const frame = box(2.45, 2.75, 0.34, 'darkStone');
  frame.position.y = 1.38;
  group.add(frame);
  const door = box(1.78, 2.2, 0.22, 'darkTimber');
  door.position.set(0, 1.12, -0.28);
  door.rotation.y = state === 'raided' ? 0.42 : 0;
  group.add(door);
  for (let index = 0; index < 5; index += 1) {
    const falseBarrel = makeBarrel(index);
    falseBarrel.scale.setScalar(0.42);
    falseBarrel.rotation.z = Math.PI / 2;
    falseBarrel.position.set(-0.68 + index * 0.34, 0.75 + (index % 2) * 0.48, -0.45);
    group.add(falseBarrel);
  }
  const latch = box(0.2, 0.38, 0.1, 'brass');
  latch.position.set(0.62, 1.1, -0.45);
  group.add(latch);
  return group;
}

function makeRatWarren() {
  const group = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (index % 2) * 0.12, 0), material('stone'));
    stone.position.set(-0.6 + index * 0.3, 0.22, (index % 2) * 0.22);
    group.add(stone);
  }
  const opening = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), material('soot'));
  opening.rotation.x = -Math.PI / 2;
  opening.position.y = 0.03;
  group.add(opening);
  for (let index = 0; index < 7; index += 1) {
    const grain = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), material('parchment'));
    grain.position.set(-0.4 + index * 0.13, 0.05, 0.4 + (index % 2) * 0.12);
    group.add(grain);
  }
  return group;
}

function addFloodedState(root) {
  const flood = box(11.1, 0.08, 7.35, 'water');
  flood.position.y = 0.38;
  flood.name = 'water-surface';
  root.add(flood);
  for (let index = 0; index < 7; index += 1) {
    const floating = box(0.48 + (index % 3) * 0.22, 0.1, 0.32, index % 2 ? 'timber' : 'darkTimber');
    floating.position.set(-4.5 + index * 1.42, 0.48, index % 2 ? 1.5 : -1.3);
    floating.rotation.y = index * 0.44;
    root.add(floating);
  }
}

function addFungalBrewery(root) {
  for (let index = 0; index < 18; index += 1) {
    const mushroom = makeMushroom(index);
    const angle = hash(`fungus:${index}`) * Math.PI * 2;
    mushroom.position.set(Math.cos(angle) * (2.1 + (index % 5) * 0.6), 0, Math.sin(angle) * (1.3 + (index % 4) * 0.55));
    root.add(mushroom);
  }
  for (let index = 0; index < 8; index += 1) {
    const spore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + (index % 3) * 0.025, 0), material('spore'));
    spore.position.set(-2.6 + index * 0.75, 1.1 + (index % 3) * 0.4, index % 2 ? 1.8 : -1.8);
    spore.name = 'hanging-prop';
    root.add(spore);
  }
}

function addRaidedCellar(root) {
  for (let index = 0; index < 11; index += 1) {
    const stave = box(0.12, 1.15 + (index % 3) * 0.3, 0.18, index % 2 ? 'timber' : 'darkTimber');
    const angle = index * 0.71;
    stave.position.set(Math.cos(angle) * (2.2 + index * 0.28), 0.18, Math.sin(angle) * (1.4 + index * 0.16));
    stave.rotation.set(0.2, angle, index % 2 ? 1.05 : -0.75);
    root.add(stave);
  }
  for (let index = 0; index < 4; index += 1) {
    const spill = new THREE.Mesh(new THREE.CircleGeometry(0.65 + index * 0.12, 14), waterMaterial(0x6d3328, 0.58));
    spill.rotation.x = -Math.PI / 2;
    spill.position.set(-3 + index * 2, 0.225, index % 2 ? 1.2 : -1.1);
    root.add(spill);
  }
}

function buildSecretOffice(root, state) {
  const floor = box(7.3, 0.18, 6.1, 'darkTimber');
  floor.position.y = 0.09;
  root.add(floor);

  const mapWall = makeMapWall(state);
  mapWall.position.set(0, 0, -2.65);
  mapWall.name = 'route-map-wall';
  root.add(mapWall);

  const desk = makeInnkeeperDesk(state);
  desk.position.set(0, 0, 0.25);
  desk.name = 'ledger-desk';
  root.add(desk);

  const safe = makeSafe(state);
  safe.position.set(-2.55, 0, -1.45);
  safe.rotation.y = 0.16;
  safe.name = 'hidden-safe';
  root.add(safe);

  const cabinet = makeWeaponCabinet(state);
  cabinet.position.set(2.5, 0, -1.45);
  cabinet.name = 'weapon-cache';
  root.add(cabinet);

  const peephole = makePeephole();
  peephole.position.set(3.42, 1.75, 0.6);
  peephole.rotation.y = -Math.PI / 2;
  peephole.name = 'surveillance-hole';
  root.add(peephole);

  const filing = makeDocumentCabinet();
  filing.position.set(-2.45, 0, 1.75);
  filing.name = 'rumor-ledger';
  root.add(filing);

  for (const x of [-1.45, 1.45]) {
    const lamp = makeDeskLamp();
    lamp.position.set(x, 1.65, -2.15);
    lamp.name = 'landmark-flame';
    root.add(lamp);
  }

  if (state === 'sealed') addSealedOffice(root);
  if (state === 'operations-room') addOperationsRoom(root);
}

function makeMapWall(state) {
  const group = new THREE.Group();
  const wall = box(6.55, 3.25, 0.3, 'darkStone');
  wall.position.y = 1.63;
  group.add(wall);
  const map = box(4.85, 2.35, 0.05, 'parchment');
  map.position.set(0, 1.65, -0.19);
  group.add(map);
  for (let index = 0; index < 15; index += 1) {
    const route = box(0.05, 0.04, 0.68 + (index % 4) * 0.22, index % 3 ? 'wax' : 'brass');
    route.position.set(-2 + (index % 5) * 0.95, 0.85 + Math.floor(index / 5) * 0.75, -0.27);
    route.rotation.z = -0.7 + index * 0.21;
    group.add(route);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), material(index % 3 ? 'wax' : 'brass'));
    pin.position.set(route.position.x, route.position.y, -0.34);
    group.add(pin);
  }
  if (state === 'sealed') {
    const cloth = box(5.2, 2.65, 0.08, 'redCloth');
    cloth.position.set(0, 1.65, -0.4);
    group.add(cloth);
  }
  return group;
}

function makeInnkeeperDesk(state) {
  const group = new THREE.Group();
  const top = box(3.35, 0.2, 1.45, 'timber');
  top.position.y = 1.02;
  group.add(top);
  for (const x of [-1.35, 1.35]) {
    const pedestal = box(0.6, 1.0, 1.18, 'darkTimber');
    pedestal.position.set(x, 0.5, 0);
    group.add(pedestal);
  }
  const ledger = box(1.12, 0.1, 0.82, 'parchment');
  ledger.position.set(-0.52, 1.18, -0.05);
  ledger.rotation.y = -0.22;
  group.add(ledger);
  for (let index = 0; index < 4; index += 1) {
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 8), material(index % 2 ? 'wax' : 'brass'));
    seal.position.set(0.55 + index * 0.24, 1.18, -0.18 + (index % 2) * 0.3);
    group.add(seal);
  }
  const quill = box(0.045, 0.045, 0.75, 'linen');
  quill.position.set(0.25, 1.28, 0.35);
  quill.rotation.y = 0.65;
  quill.rotation.z = 0.25;
  group.add(quill);
  if (state === 'operations-room') {
    const dispatch = box(0.9, 0.08, 0.62, 'redCloth');
    dispatch.position.set(0.35, 1.21, -0.3);
    group.add(dispatch);
  }
  return group;
}

function makeSafe(state) {
  const group = new THREE.Group();
  const body = box(1.55, 1.65, 1.2, 'iron');
  body.position.y = 0.83;
  group.add(body);
  const door = box(1.28, 1.38, 0.18, 'darkStone');
  door.position.set(0, 0.84, -0.68);
  door.rotation.y = state === 'discovered' || state === 'operations-room' ? -0.45 : 0;
  group.add(door);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 6, 16), material('brass'));
  wheel.position.set(0, 0.88, -0.8);
  group.add(wheel);
  for (let index = 0; index < 6; index += 1) {
    const spoke = box(0.04, 0.04, 0.62, 'brass');
    spoke.position.set(0, 0.88, -0.82);
    spoke.rotation.z = index * Math.PI / 3;
    group.add(spoke);
  }
  return group;
}

function makeWeaponCabinet(state) {
  const group = new THREE.Group();
  const cabinet = box(1.85, 2.65, 0.62, 'darkTimber');
  cabinet.position.y = 1.33;
  group.add(cabinet);
  const open = state === 'discovered' || state === 'operations-room';
  for (const side of [-1, 1]) {
    const door = box(0.82, 2.35, 0.12, 'timber');
    door.position.set(side * 0.46, 1.34, -0.38);
    door.rotation.y = open ? side * 0.62 : 0;
    group.add(door);
  }
  for (let index = 0; index < 5; index += 1) {
    const weapon = index % 2
      ? box(0.08, 1.85, 0.08, 'iron')
      : new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), material('iron'));
    weapon.position.set(-0.62 + index * 0.31, 1.2 + (index % 2) * 0.2, -0.22);
    weapon.rotation.z = index % 2 ? -0.08 : Math.PI;
    group.add(weapon);
  }
  return group;
}

function makePeephole() {
  const group = new THREE.Group();
  const plate = box(0.65, 0.78, 0.16, 'iron');
  group.add(plate);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.24, 12), material('glass'));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -0.18;
  group.add(lens);
  const shutter = box(0.42, 0.18, 0.08, 'brass');
  shutter.position.set(0, 0.34, -0.16);
  group.add(shutter);
  return group;
}

function makeDocumentCabinet() {
  const group = new THREE.Group();
  const cabinet = box(2.05, 2.1, 0.72, 'darkTimber');
  cabinet.position.y = 1.05;
  group.add(cabinet);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const drawer = box(0.54, 0.38, 0.12, 'timber');
      drawer.position.set(-0.62 + column * 0.62, 0.38 + row * 0.47, -0.42);
      group.add(drawer);
      const pull = box(0.18, 0.06, 0.08, 'brass');
      pull.position.set(drawer.position.x, drawer.position.y, -0.51);
      group.add(pull);
    }
  }
  return group;
}

function addSealedOffice(root) {
  const falseShelf = box(6.4, 3.05, 0.55, 'darkTimber');
  falseShelf.position.set(0, 1.53, -2.9);
  root.add(falseShelf);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      const book = box(0.18 + (column % 3) * 0.04, 0.48 + (column % 2) * 0.08, 0.32, column % 2 ? 'redCloth' : 'leather');
      book.position.set(-2.75 + column * 0.68, 0.46 + row * 0.7, -3.24);
      root.add(book);
    }
  }
  for (let index = 0; index < 6; index += 1) {
    const dust = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025 + index * 0.004, 0), material('parchment'));
    dust.position.set(-1.3 + index * 0.52, 1.45 + (index % 3) * 0.42, -1.2 + (index % 2) * 0.8);
    dust.name = 'hanging-prop';
    root.add(dust);
  }
}

function addOperationsRoom(root) {
  for (let index = 0; index < 4; index += 1) {
    const stool = pillar(0.23, 0.7, 'timber');
    stool.position.set(-1.8 + index * 1.2, 0.35, 1.55);
    root.add(stool);
  }
  for (let index = 0; index < 7; index += 1) {
    const dispatch = box(0.52 + (index % 3) * 0.18, 0.04, 0.36, index % 2 ? 'parchment' : 'redCloth');
    dispatch.position.set(-2.4 + index * 0.8, 0.24 + (index % 2) * 0.02, 2.3);
    dispatch.rotation.y = -0.35 + index * 0.12;
    root.add(dispatch);
  }
  const routeTable = box(5.2, 0.16, 1.45, 'darkTimber');
  routeTable.position.set(0, 0.92, 2.25);
  root.add(routeTable);
  for (let index = 0; index < 12; index += 1) {
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), material(index % 3 ? 'brass' : 'wax'));
    marker.position.set(-2.05 + (index % 6) * 0.82, 1.14, 1.9 + Math.floor(index / 6) * 0.45);
    root.add(marker);
  }
}

function makeWallLamp() {
  const group = new THREE.Group();
  const bracket = box(0.08, 0.52, 0.42, 'iron');
  bracket.position.z = 0.18;
  bracket.rotation.x = 0.2;
  group.add(bracket);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 7), material('spore'));
  flame.position.set(0, 0.12, 0.44);
  flame.name = 'landmark-flame';
  group.add(flame);
  return group;
}

function makeDeskLamp() {
  const group = new THREE.Group();
  const stem = pillar(0.06, 0.85, 'brass');
  stem.position.y = 0.42;
  group.add(stem);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 8), material('redCloth'));
  shade.position.y = 0.78;
  group.add(shade);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), material('spore'));
  flame.position.y = 0.72;
  flame.name = 'landmark-flame';
  group.add(flame);
  return group;
}

function makeCocoon(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24 + (seed % 2) * 0.05, 0.9, 5, 8), webMaterial());
  body.rotation.z = seed % 2 ? 0.08 : -0.08;
  group.add(body);
  const tether = box(0.05, 0.65, 0.05, 'web');
  tether.position.y = 0.92;
  group.add(tether);
  return group;
}

function makeMushroom(seed) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + (seed % 3) * 0.03, 0.13, 0.45 + (seed % 4) * 0.12, 7), material('linen'));
  stem.position.y = 0.22 + (seed % 4) * 0.06;
  group.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.23 + (seed % 3) * 0.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), material(seed % 2 ? 'fungus' : 'spore'));
  cap.position.y = 0.48 + (seed % 4) * 0.12;
  group.add(cap);
  return group;
}

function box(width, height, depth, materialName) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(materialName));
}

function pillar(radius, height, materialName) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 8), material(materialName));
}

function material(name) {
  const [color, roughness, metalness, emissive = 0x000000] = PALETTE[name] ?? PALETTE.stone;
  const transparent = name === 'glass' || name === 'water' || name === 'web';
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.42 : 0,
    transparent,
    opacity: name === 'glass' ? 0.48 : name === 'water' ? 0.68 : name === 'web' ? 0.62 : 1,
    side: name === 'web' ? THREE.DoubleSide : THREE.FrontSide
  });
}

function webMaterial() {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.web[0],
    roughness: 0.8,
    transparent: true,
    opacity: 0.54,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

function waterMaterial(color, opacity) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 0xffffffff;
}
