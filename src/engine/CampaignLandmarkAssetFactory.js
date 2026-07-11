import { THREE } from './ThreeScene.js';
import { getCampaignLandmarkRecipe } from './CampaignLandmarkRecipes.js';

const MAT = Object.freeze({
  stone: [0x4b4650, 0.82, 0.95], darkStone: [0x282832, 0.9, 1], paleStone: [0x817b75, 0.72, 0.9],
  timber: [0x5a3625, 0.88, 0.9], darkTimber: [0x2f211b, 0.95, 1], iron: [0x41454d, 0.82, 0.86],
  brass: [0xb5843f, 0.68, 0.72], cloth: [0x6d2432, 0.9, 1], parchment: [0xc4aa7c, 0.86, 0.92],
  bottleGreen: [0x315743, 0.58, 0.48], bottleAmber: [0x8b572d, 0.62, 0.5], soot: [0x17161a, 0.98, 1],
  ember: [0xff9a43, 0.25, 0.25, 0xff7b24], flame: [0xffcf69, 0.18, 0.16, 0xffa33b],
  water: [0x4d91a1, 0.34, 0.34], moss: [0x43523c, 0.92, 1], flour: [0xd2c7ae, 0.9, 1]
});

export class CampaignLandmarkAssetFactory {
  create(bundleId, context = {}) {
    const recipe = getCampaignLandmarkRecipe(bundleId);
    if (!recipe) return null;
    const state = context.state ?? context.stateVariant ?? null;
    const root = new THREE.Group();
    root.name = `campaign-landmark:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.roomId = recipe.roomId;
    root.userData.state = state;

    if (recipe.factory === 'lantern-plaza') this.buildLanternPlaza(root, state);
    if (recipe.factory === 'sealed-citadel-gate') this.buildSealedGate(root, state);
    if (recipe.factory === 'old-lantern-common-room') this.buildCommonRoom(root, state);
    if (recipe.factory === 'blackened-kitchen') this.buildKitchen(root, state);

    applyState(root, state);
    return root;
  }

  buildLanternPlaza(root, state) {
    const dais = box(5.8, 0.28, 4.8, 'paleStone');
    dais.position.y = 0.14;
    root.add(dais);
    for (let ring = 0; ring < 3; ring += 1) {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(2.1 - ring * 0.38, 2.2 - ring * 0.38, 0.2, 12), mat('stone'));
      step.position.y = 0.3 + ring * 0.18;
      root.add(step);
    }
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.48, 14, 1, true), mat('brass'));
    basin.position.y = 0.86;
    root.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.08, 18), mat('water'));
    water.position.y = 0.84;
    water.name = 'water-surface';
    root.add(water);
    const lantern = makeLantern(1.2);
    lantern.position.y = 1.05;
    lantern.name = 'ritual-flame';
    root.add(lantern);

    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const bollard = pillar(0.18, 1.25, 'darkStone');
      bollard.position.set(Math.cos(angle) * 2.45, 0.62, Math.sin(angle) * 1.95);
      root.add(bollard);
      const lamp = makeLantern(0.5);
      lamp.position.set(Math.cos(angle) * 2.45, 1.34, Math.sin(angle) * 1.95);
      root.add(lamp);
    }

    const board = makeNoticeBoard();
    board.position.set(-3.3, 0, -1.4);
    board.rotation.y = 0.24;
    board.name = 'registry-board';
    root.add(board);
    const memorial = makeMemorialCluster();
    memorial.position.set(3.1, 0, 1.35);
    memorial.name = 'memorial-offerings';
    root.add(memorial);
    for (let i = 0; i < 5; i += 1) {
      const pack = makeTravelPack(i);
      pack.position.set(-2.8 + i * 1.12, 0.18, 2.5 + (i % 2) * 0.28);
      pack.rotation.y = i * 0.37;
      root.add(pack);
    }
    if (state === 'refugee-crowded') addBedrolls(root, 9, 3.8);
  }

  buildSealedGate(root, state) {
    const wall = new THREE.Group();
    for (const x of [-4.8, -3.6, -2.4, 2.4, 3.6, 4.8]) {
      const pier = box(1.05, 5.2, 1.45, 'darkStone');
      pier.position.set(x, 2.6, 0);
      wall.add(pier);
      for (let y = 0.65; y < 5; y += 0.72) {
        const seam = box(1.12, 0.035, 1.5, 'stone');
        seam.position.set(x, y, 0.02);
        wall.add(seam);
      }
    }
    const lintel = box(4.9, 1.05, 1.6, 'darkStone');
    lintel.position.set(0, 4.7, 0);
    wall.add(lintel);
    root.add(wall);

    for (const side of [-1, 1]) {
      const door = box(2.05, 4.25, 0.32, 'iron');
      door.position.set(side * 1.05, 2.2, 0.02);
      root.add(door);
      for (let y = 0.55; y < 4.1; y += 0.7) {
        const band = box(2.08, 0.1, 0.38, 'brass');
        band.position.set(side * 1.05, y, -0.02);
        root.add(band);
      }
      for (let x = -0.7; x <= 0.7; x += 0.7) {
        const rivets = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat('brass'));
        for (let y = 0.55; y < 4.1; y += 0.72) {
          const rivet = rivets.clone();
          rivet.position.set(side * 1.05 + x, y, -0.23);
          root.add(rivet);
        }
      }
    }
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 8, 28), mat('ember'));
    seal.position.set(0, 2.25, -0.34);
    seal.name = 'gate-seal';
    root.add(seal);
    for (let i = 0; i < 6; i += 1) {
      const rune = box(0.16, 0.56, 0.08, i % 2 ? 'flame' : 'ember');
      const angle = i * Math.PI / 3;
      rune.position.set(Math.cos(angle) * 0.68, 2.25 + Math.sin(angle) * 0.68, -0.42);
      rune.rotation.z = angle;
      root.add(rune);
    }
    for (const side of [-1, 1]) {
      const winch = makeWinch();
      winch.position.set(side * 3.8, 0, 2.1);
      winch.rotation.y = side * -0.34;
      winch.name = side < 0 ? 'winch-left' : 'winch-right';
      root.add(winch);
      const chain = makeChain(7);
      chain.position.set(side * 2.1, 3.9, 0.4);
      root.add(chain);
    }
    const barricades = makeBarricadeLine(state === 'pressured' ? 5 : 3);
    barricades.position.z = 3.2;
    root.add(barricades);
  }

  buildCommonRoom(root, state) {
    const hearth = makeGreatHearth();
    hearth.position.set(-5.3, 0, -1.4);
    hearth.name = 'hearth-fire';
    root.add(hearth);

    const bar = makeInnBar();
    bar.position.set(3.5, 0, -2.5);
    bar.rotation.y = -0.08;
    bar.name = 'bar-service';
    root.add(bar);

    const stage = makeMusicStage();
    stage.position.set(-3.9, 0, 3.35);
    stage.name = 'music-stage';
    root.add(stage);

    const tablePositions = [[-1.3,-1.1],[0.5,1.35],[3.45,1.7],[-0.9,3.1]];
    tablePositions.forEach((position, index) => {
      const dining = makeDiningCluster(index);
      dining.position.set(position[0], 0, position[1]);
      dining.rotation.y = index * 0.53;
      root.add(dining);
    });

    const stairs = makeStairsAndGallery();
    stairs.position.set(5.4, 0, 2.8);
    root.add(stairs);

    for (let i = 0; i < 3; i += 1) {
      const chandelier = makeChandelier();
      chandelier.position.set(-1.9 + i * 2.15, 3.45, 0.1 + (i % 2) * 1.4);
      root.add(chandelier);
    }

    const sign = makeInnSign();
    sign.position.set(0, 2.35, -4.3);
    sign.name = 'faction-banner';
    root.add(sign);

    addClutter(root, 'common-room', 24, 6.2, 4.4);
    if (['besieged', 'burned'].includes(state)) {
      const barricade = makeBarricadeLine(5);
      barricade.position.set(0, 0, 4.8);
      barricade.name = 'barricade-front';
      root.add(barricade);
    }
    if (state === 'bivouac') addBedrolls(root, 7, 4.6);
  }

  buildKitchen(root, state) {
    const oven = makeKitchenRange();
    oven.position.set(-4.2, 0, -2.6);
    oven.name = 'oven-fire';
    root.add(oven);

    const prep = makePrepIsland();
    prep.position.set(0.2, 0, -0.2);
    prep.name = 'chopping-board';
    root.add(prep);

    const wash = makeWashBasin();
    wash.position.set(4.1, 0, -2.6);
    wash.name = 'wash-basin';
    root.add(wash);

    const pantry = makePantryWall();
    pantry.position.set(3.9, 0, 2.35);
    pantry.name = 'pantry';
    root.add(pantry);

    const hanging = makeHangingCookware();
    hanging.position.set(-0.2, 2.65, -0.1);
    root.add(hanging);

    const sacks = makeFoodStorage();
    sacks.position.set(-3.6, 0, 2.5);
    root.add(sacks);
    addClutter(root, 'kitchen', 19, 4.7, 3.4);

    if (state === 'infested') {
      for (let i = 0; i < 7; i += 1) {
        const slime = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 3) * 0.08, 8, 5), mat('moss'));
        slime.scale.y = 0.28;
        slime.position.set(-3.8 + i * 1.25, 0.08, 1.8 + (i % 2) * 0.7);
        slime.name = 'infestation-overlay';
        root.add(slime);
      }
    }
  }
}

function mat(name) {
  const [color, roughness = 0.8, metalness = 0, emissive = 0x000000] = MAT[name] ?? MAT.stone;
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.55 : 0, transparent: name === 'water', opacity: name === 'water' ? 0.74 : 1 });
}
function box(w, h, d, material = 'stone') { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(material)); }
function pillar(radius, height, material = 'stone') { return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, height, 8), mat(material)); }
function makeLantern(scale = 1) {
  const g = new THREE.Group();
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, 0.58 * scale, 6, 1, true), mat('brass'));
  cage.position.y = 0.31 * scale; g.add(cage);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.42 * scale, 7), mat('flame'));
  flame.position.y = 0.38 * scale; g.add(flame);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38 * scale, 0.18 * scale, 6), mat('darkStone'));
  cap.position.y = 0.68 * scale; g.add(cap);
  return g;
}
function makeNoticeBoard() {
  const g = new THREE.Group();
  for (const x of [-1.05, 1.05]) { const post = box(0.16, 2.2, 0.18, 'timber'); post.position.set(x, 1.1, 0); g.add(post); }
  const board = box(2.55, 1.35, 0.16, 'darkTimber'); board.position.y = 1.55; g.add(board);
  for (let i = 0; i < 9; i += 1) { const paper = box(0.35 + (i % 3) * 0.13, 0.38 + (i % 2) * 0.12, 0.02, 'parchment'); paper.position.set(-0.86 + (i % 3) * 0.82, 1.2 + Math.floor(i / 3) * 0.38, -0.1); paper.rotation.z = (i % 2 ? 1 : -1) * 0.06; g.add(paper); }
  return g;
}
function makeMemorialCluster() {
  const g = new THREE.Group();
  const marker = box(1.4, 1.75, 0.34, 'paleStone'); marker.position.y = 0.88; g.add(marker);
  for (let i = 0; i < 7; i += 1) { const candle = pillar(0.045, 0.22 + (i % 3) * 0.08, 'parchment'); candle.position.set(-0.62 + i * 0.2, candle.geometry.parameters.height / 2, 0.28 + (i % 2) * 0.12); g.add(candle); }
  for (let i = 0; i < 5; i += 1) { const token = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, 12), mat('brass')); token.rotation.x = Math.PI / 2; token.position.set(-0.5 + i * 0.24, 0.03, 0.7); g.add(token); }
  return g;
}
function makeTravelPack(seed) { const g = new THREE.Group(); const pack = box(0.58, 0.72, 0.34, seed % 2 ? 'cloth' : 'timber'); pack.position.y = 0.36; g.add(pack); const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.62, 8), mat('parchment')); roll.rotation.z = Math.PI / 2; roll.position.y = 0.72; g.add(roll); return g; }
function makeWinch() { const g = new THREE.Group(); const frame = box(1.5, 0.18, 1.05, 'timber'); frame.position.y = 0.18; g.add(frame); for (const x of [-0.62, 0.62]) { const post = box(0.18, 1.45, 0.18, 'darkTimber'); post.position.set(x, 0.83, 0); g.add(post); } const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.35, 12), mat('iron')); drum.rotation.z = Math.PI / 2; drum.position.y = 1.05; g.add(drum); return g; }
function makeChain(count) { const g = new THREE.Group(); for (let i = 0; i < count; i += 1) { const link = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 5, 10), mat('iron')); link.rotation.y = i % 2 ? Math.PI / 2 : 0; link.position.y = -i * 0.24; g.add(link); } return g; }
function makeBarricadeLine(count) { const g = new THREE.Group(); for (let i = 0; i < count; i += 1) { const beam = box(2.1, 0.22, 0.28, i % 2 ? 'darkTimber' : 'timber'); beam.position.set((i - (count - 1) / 2) * 1.65, 0.58 + (i % 2) * 0.35, 0); beam.rotation.z = (i % 2 ? 1 : -1) * 0.16; g.add(beam); for (const x of [-0.72, 0.72]) { const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 5), mat('iron')); spike.position.set(beam.position.x + x, 1.15, 0); g.add(spike); } } return g; }
function makeGreatHearth() { const g = new THREE.Group(); const back = box(2.6, 3.25, 0.72, 'darkStone'); back.position.y = 1.62; g.add(back); const opening = box(1.75, 1.5, 0.78, 'soot'); opening.position.set(0, 0.85, -0.25); g.add(opening); const lintel = box(2.15, 0.28, 0.92, 'paleStone'); lintel.position.y = 1.72; g.add(lintel); for (let i = 0; i < 6; i += 1) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.2, 7), mat('timber')); log.rotation.z = Math.PI / 2; log.rotation.y = i * 0.41; log.position.set(0, 0.26 + (i % 2) * 0.12, -0.55 + (i % 3) * 0.17); g.add(log); } for (let i = 0; i < 5; i += 1) { const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13 + i * 0.018, 0.65 + (i % 2) * 0.28, 7), mat(i % 2 ? 'ember' : 'flame')); flame.position.set(-0.52 + i * 0.25, 0.65, -0.62); g.add(flame); } const chimney = box(1.25, 2.2, 1, 'darkStone'); chimney.position.y = 4.32; g.add(chimney); return g; }
function makeInnBar() { const g = new THREE.Group(); const counter = box(4.25, 1.12, 0.72, 'timber'); counter.position.y = 0.56; g.add(counter); const top = box(4.55, 0.16, 0.9, 'darkTimber'); top.position.y = 1.16; g.add(top); const shelf = box(4.15, 2.8, 0.36, 'darkTimber'); shelf.position.set(0, 1.55, -1.18); g.add(shelf); for (let row = 0; row < 3; row += 1) { const rail = box(4, 0.1, 0.5, 'timber'); rail.position.set(0, 0.58 + row * 0.76, -1.05); g.add(rail); } for (let i = 0; i < 18; i += 1) { const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.48 + (i % 3) * 0.08, 7), mat(i % 2 ? 'bottleGreen' : 'bottleAmber')); bottle.position.set(-1.75 + (i % 6) * 0.7, 0.88 + Math.floor(i / 6) * 0.76, -0.78); g.add(bottle); } for (let i = 0; i < 4; i += 1) { const stool = pillar(0.22, 0.68, 'timber'); stool.position.set(-1.55 + i * 1.05, 0.34, 0.98); g.add(stool); } return g; }
function makeMusicStage() { const g = new THREE.Group(); const stage = box(3.4, 0.42, 2.2, 'timber'); stage.position.y = 0.21; g.add(stage); const lute = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), mat('timber')); body.scale.set(0.75, 1, 0.28); body.position.y = 0.65; lute.add(body); const neck = box(0.12, 1.05, 0.1, 'darkTimber'); neck.position.y = 1.28; lute.add(neck); lute.rotation.z = -0.22; lute.position.set(-0.55, 0.2, 0); g.add(lute); const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.48, 12), mat('cloth')); drum.rotation.z = Math.PI / 2; drum.position.set(0.65, 0.72, 0.15); g.add(drum); return g; }
function makeDiningCluster(seed) { const g = new THREE.Group(); const table = seed % 2 ? box(2.1, 0.16, 1.2, 'timber') : new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.16, 12), mat('timber')); table.position.y = 0.88; g.add(table); for (let i = 0; i < 4; i += 1) { const angle = i * Math.PI / 2 + 0.3; const chair = box(0.42, 0.62, 0.42, 'darkTimber'); chair.position.set(Math.cos(angle) * 1.25, 0.31, Math.sin(angle) * 0.92); chair.rotation.y = -angle; g.add(chair); } for (let i = 0; i < 4; i += 1) { const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 7), mat('brass')); mug.position.set(-0.45 + i * 0.3, 1.06, (i % 2 ? 1 : -1) * 0.22); g.add(mug); } return g; }
function makeStairsAndGallery() { const g = new THREE.Group(); for (let i = 0; i < 7; i += 1) { const step = box(1.9, 0.22, 0.7, 'timber'); step.position.set(0, 0.11 + i * 0.2, -i * 0.42); g.add(step); } const landing = box(2.8, 0.2, 1.5, 'darkTimber'); landing.position.set(0, 1.5, -3.05); g.add(landing); for (const x of [-1.25, 1.25]) { const rail = box(0.12, 1.05, 4.3, 'timber'); rail.position.set(x, 1.3, -1.55); g.add(rail); } return g; }
function makeChandelier() { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 18), mat('iron')); ring.rotation.x = Math.PI / 2; g.add(ring); for (let i = 0; i < 6; i += 1) { const angle = i * Math.PI / 3; const candle = makeLantern(0.28); candle.position.set(Math.cos(angle) * 0.58, -0.05, Math.sin(angle) * 0.58); g.add(candle); } const chain = makeChain(5); chain.position.y = 1.2; g.add(chain); return g; }
function makeInnSign() { const g = new THREE.Group(); const beam = box(3.6, 0.2, 0.2, 'darkTimber'); g.add(beam); const sign = box(1.5, 1.05, 0.18, 'timber'); sign.position.y = -0.85; g.add(sign); const lantern = makeLantern(0.48); lantern.position.set(0, -0.82, -0.18); g.add(lantern); return g; }
function makeKitchenRange() { const g = new THREE.Group(); const body = box(3.25, 1.75, 1.45, 'darkStone'); body.position.y = 0.88; g.add(body); for (const x of [-0.92, 0, 0.92]) { const opening = box(0.58, 0.68, 1.52, 'soot'); opening.position.set(x, 0.58, -0.05); g.add(opening); const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 7), mat('flame')); flame.position.set(x, 0.55, -0.82); g.add(flame); } const hood = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.4, 4), mat('iron')); hood.rotation.y = Math.PI / 4; hood.position.y = 2.45; g.add(hood); const flue = box(0.72, 2.2, 0.72, 'iron'); flue.position.y = 4.15; g.add(flue); return g; }
function makePrepIsland() { const g = new THREE.Group(); const table = box(3.4, 0.22, 1.45, 'timber'); table.position.y = 1.02; g.add(table); for (const x of [-1.35, 1.35]) for (const z of [-0.5, 0.5]) { const leg = box(0.18, 1, 0.18, 'darkTimber'); leg.position.set(x, 0.5, z); g.add(leg); } const board = box(1.05, 0.06, 0.62, 'parchment'); board.position.set(-0.6, 1.17, 0); g.add(board); for (let i = 0; i < 4; i += 1) { const knife = box(0.06, 0.05, 0.56, 'iron'); knife.position.set(0.25 + i * 0.22, 1.2, -0.28 + i * 0.17); knife.rotation.y = 0.38 + i * 0.22; g.add(knife); } return g; }
function makeWashBasin() { const g = new THREE.Group(); const stand = box(2.4, 0.9, 1.3, 'stone'); stand.position.y = 0.45; g.add(stand); const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 0.42, 12, 1, true), mat('brass')); basin.position.y = 1.03; g.add(basin); const water = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.05, 14), mat('water')); water.position.y = 1; g.add(water); const pump = pillar(0.11, 1.75, 'iron'); pump.position.set(0.82, 1.45, 0); g.add(pump); return g; }
function makePantryWall() { const g = new THREE.Group(); const back = box(3.7, 2.8, 0.28, 'darkTimber'); back.position.y = 1.4; g.add(back); for (let row = 0; row < 4; row += 1) { const shelf = box(3.8, 0.12, 0.72, 'timber'); shelf.position.set(0, 0.42 + row * 0.7, -0.28); g.add(shelf); } for (let i = 0; i < 20; i += 1) { const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.34 + (i % 3) * 0.08, 8), mat(i % 3 ? 'bottleAmber' : 'bottleGreen')); jar.position.set(-1.55 + (i % 5) * 0.78, 0.65 + Math.floor(i / 5) * 0.7, -0.65); g.add(jar); } return g; }
function makeHangingCookware() { const g = new THREE.Group(); const rail = box(3.2, 0.1, 0.1, 'iron'); g.add(rail); for (let i = 0; i < 7; i += 1) { const hook = makeChain(2 + (i % 2)); hook.position.set(-1.35 + i * 0.45, -0.1, 0); g.add(hook); const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.19 + (i % 3) * 0.04, 0.19 + (i % 3) * 0.04, 0.08, 10), mat('iron')); pan.rotation.x = Math.PI / 2; pan.position.set(-1.35 + i * 0.45, -0.75 - (i % 2) * 0.22, 0); g.add(pan); } return g; }
function makeFoodStorage() { const g = new THREE.Group(); for (let i = 0; i < 8; i += 1) { const sack = new THREE.Mesh(new THREE.SphereGeometry(0.36 + (i % 2) * 0.08, 8, 6), mat(i % 3 ? 'flour' : 'cloth')); sack.scale.y = 1.3; sack.position.set((i % 4) * 0.68, 0.42 + Math.floor(i / 4) * 0.48, Math.floor(i / 4) * 0.28); sack.rotation.z = (i % 2 ? 1 : -1) * 0.08; g.add(sack); } const crate = box(1.4, 0.72, 1, 'timber'); crate.position.set(-1.2, 0.36, 0.25); g.add(crate); return g; }
function addClutter(root, family, count, radiusX, radiusZ) { for (let i = 0; i < count; i += 1) { const angle = hash(`${family}:${i}`) * Math.PI * 2; const r = 0.62 + hash(`${i}:${family}`) * 0.34; const kind = i % 5; let item; if (kind === 0) item = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 7), mat(i % 2 ? 'bottleGreen' : 'bottleAmber')); else if (kind === 1) item = box(0.28, 0.08, 0.2, 'parchment'); else if (kind === 2) item = box(0.42, 0.22, 0.32, 'timber'); else if (kind === 3) item = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), mat('flour')); else item = box(0.12, 0.04, 0.46, 'iron'); item.position.set(Math.cos(angle) * radiusX * r, 0.08 + (i % 3) * 0.02, Math.sin(angle) * radiusZ * r); item.rotation.y = angle * 1.7; root.add(item); } }
function addBedrolls(root, count, radius) { for (let i = 0; i < count; i += 1) { const angle = i * Math.PI * 2 / count + 0.35; const bed = box(1.15, 0.12, 0.52, i % 2 ? 'cloth' : 'parchment'); bed.position.set(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius); bed.rotation.y = -angle; root.add(bed); } }
function applyState(root, state) { if (!state) return; if (['burned', 'blackened', 'sacked'].includes(state)) { root.traverse(node => { if (node.isMesh && node.material?.color) node.material.color.multiplyScalar(0.58); }); for (let i = 0; i < 8; i += 1) { const char = box(0.35 + (i % 3) * 0.22, 0.06, 0.16, 'soot'); const angle = i * 0.83; char.position.set(Math.cos(angle) * (2.4 + i * 0.25), 0.04, Math.sin(angle) * (1.8 + i * 0.18)); char.rotation.y = angle; root.add(char); } } }
function hash(value) { let h = 2166136261; for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 0xffffffff; }
