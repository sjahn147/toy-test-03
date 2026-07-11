import { THREE } from './ThreeScene.js';
import { getFungalGardenLandmarkRecipe } from './FungalGardenLandmarkRecipes.js';

const MATERIALS = Object.freeze({
  soil: Object.freeze({ color: 0x22282a, roughness: 0.98, metalness: 0.0 }),
  wetSoil: Object.freeze({ color: 0x182326, roughness: 0.68, metalness: 0.02 }),
  mycelium: Object.freeze({ color: 0xb9c3aa, roughness: 0.9, metalness: 0.0 }),
  paleMycelium: Object.freeze({ color: 0xd7d8bd, roughness: 0.82, metalness: 0.0 }),
  blueCap: Object.freeze({ color: 0x315f83, roughness: 0.55, metalness: 0.0 }),
  deepBlueCap: Object.freeze({ color: 0x1d3458, roughness: 0.62, metalness: 0.0 }),
  violetCap: Object.freeze({ color: 0x684b7f, roughness: 0.58, metalness: 0.0 }),
  amberCap: Object.freeze({ color: 0x9c6a38, roughness: 0.72, metalness: 0.0 }),
  gill: Object.freeze({ color: 0xb7b1c6, roughness: 0.88, metalness: 0.0 }),
  cyanGlow: Object.freeze({ color: 0x79d9de, roughness: 0.32, metalness: 0.0, emissive: 0x3aaeb8, emissiveIntensity: 0.88 }),
  blueGlow: Object.freeze({ color: 0x648ee8, roughness: 0.36, metalness: 0.0, emissive: 0x345bcc, emissiveIntensity: 0.74 }),
  violetGlow: Object.freeze({ color: 0xb080d1, roughness: 0.38, metalness: 0.0, emissive: 0x6c3b92, emissiveIntensity: 0.68 }),
  spore: Object.freeze({ color: 0xa6edf0, roughness: 0.3, transparent: true, opacity: 0.62, emissive: 0x5ccbd1, emissiveIntensity: 0.6, depthWrite: false }),
  memory: Object.freeze({ color: 0xc9e8ff, roughness: 0.24, transparent: true, opacity: 0.42, emissive: 0x74aee0, emissiveIntensity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
  moss: Object.freeze({ color: 0x536b4d, roughness: 0.96, metalness: 0.0 }),
  darkMoss: Object.freeze({ color: 0x304235, roughness: 0.98, metalness: 0.0 }),
  bark: Object.freeze({ color: 0x514737, roughness: 0.94, metalness: 0.0 }),
  wood: Object.freeze({ color: 0x6c4d32, roughness: 0.9, metalness: 0.0 }),
  rope: Object.freeze({ color: 0x9a7d56, roughness: 0.96, metalness: 0.0 }),
  cloth: Object.freeze({ color: 0x485f70, roughness: 0.94, metalness: 0.0 }),
  basket: Object.freeze({ color: 0x806441, roughness: 0.94, metalness: 0.0 }),
  char: Object.freeze({ color: 0x17191b, roughness: 1.0, metalness: 0.0 }),
  ash: Object.freeze({ color: 0x4b4e52, roughness: 1.0, metalness: 0.0 }),
  ember: Object.freeze({ color: 0xe16d3d, roughness: 0.42, metalness: 0.0, emissive: 0xa93e20, emissiveIntensity: 0.75 }),
  blight: Object.freeze({ color: 0x302744, roughness: 0.74, metalness: 0.0 }),
  blightGlow: Object.freeze({ color: 0x8f56a8, roughness: 0.44, metalness: 0.0, emissive: 0x54236b, emissiveIntensity: 0.68 }),
  ooze: Object.freeze({ color: 0x4f2e66, roughness: 0.28, transparent: true, opacity: 0.72, emissive: 0x321643, emissiveIntensity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
  sac: Object.freeze({ color: 0x8b8175, roughness: 0.62, metalness: 0.0 }),
  sacGlow: Object.freeze({ color: 0x9dc6a4, roughness: 0.48, metalness: 0.0, emissive: 0x4b8156, emissiveIntensity: 0.5 }),
  heartShell: Object.freeze({ color: 0x6f5a59, roughness: 0.7, metalness: 0.0 }),
  heartGlow: Object.freeze({ color: 0xd67d86, roughness: 0.34, metalness: 0.0, emissive: 0x9b3948, emissiveIntensity: 0.86 }),
  membrane: Object.freeze({ color: 0xb8a3a5, roughness: 0.48, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false }),
  stone: Object.freeze({ color: 0x4b4d50, roughness: 0.94, metalness: 0.0 })
});

const MATERIAL_CACHE = new Map();

export class FungalGardenLandmarkAssetFactory {
  create(bundleId, context = {}) {
    const recipe = getFungalGardenLandmarkRecipe(bundleId);
    if (!recipe) return null;

    const requestedState = context.state ?? context.stateVariant ?? recipe.defaultState;
    const state = recipe.states.includes(requestedState) ? requestedState : recipe.defaultState;
    const root = new THREE.Group();
    root.name = `fungal-garden:${bundleId}`;
    root.userData.assetId = bundleId;
    root.userData.roomId = recipe.roomId;
    root.userData.state = state;
    root.userData.detailBudget = recipe.detailBudget;
    root.userData.triangleBudget = recipe.triangleBudget;
    root.userData.animationChannels = ['organic-pulse', 'spore-mote', 'hanging-prop'];

    if (recipe.factory === 'blue-spore-field') buildBlueSporeField(root, state);
    if (recipe.factory === 'mushroom-pillar-forest') buildMushroomPillarForest(root, state);
    if (recipe.factory === 'mycelial-heart') buildMycelialHeart(root, state);

    root.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });
    return root;
  }
}

function buildBlueSporeField(root, state) {
  addFieldFloor(root, state);
  addFieldMycelialPaths(root, state);

  const clusterCenters = [
    [-6.4, -3.7], [-3.4, -4.7], [0.2, -4.4], [4.1, -4.0], [6.4, -1.5],
    [5.5, 3.7], [2.1, 4.8], [-1.8, 4.7], [-5.3, 3.3], [-6.8, 0.4]
  ];

  clusterCenters.forEach((position, clusterIndex) => {
    const density = state === 'burned' ? 2 : state === 'harvested' ? 3 : 6;
    const cluster = new THREE.Group();
    cluster.position.set(position[0], 0, position[1]);
    cluster.name = 'blue-spore-cluster';

    for (let index = 0; index < density; index += 1) {
      const seed = clusterIndex * 17 + index;
      const angle = deterministic(`field-angle:${seed}`) * Math.PI * 2;
      const radius = index === 0 ? 0 : 0.45 + deterministic(`field-radius:${seed}`) * 1.0;
      const height = 0.7 + deterministic(`field-height:${seed}`) * (state === 'burned' ? 1.0 : 2.1);
      const capRadius = 0.3 + deterministic(`field-cap:${seed}`) * 0.52;
      const mushroom = state === 'burned'
        ? makeBurnedMushroom(seed, height, capRadius)
        : makeMushroom(seed, height, capRadius, index % 3 === 0 ? 'cyanGlow' : index % 2 ? 'blueCap' : 'violetCap');
      mushroom.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      mushroom.rotation.y = angle;
      cluster.add(mushroom);
    }

    if (state === 'harvested') {
      for (let stumpIndex = 0; stumpIndex < 4; stumpIndex += 1) {
        const stump = makeCutMushroomStump(clusterIndex * 11 + stumpIndex);
        const angle = stumpIndex * Math.PI / 2 + clusterIndex * 0.23;
        stump.position.set(Math.cos(angle) * (0.65 + stumpIndex * 0.12), 0, Math.sin(angle) * (0.55 + stumpIndex * 0.12));
        cluster.add(stump);
      }
    }
    root.add(cluster);
  });

  const vents = [[-2.5, -0.7], [0.4, 1.0], [3.2, -0.4]];
  vents.forEach((position, index) => {
    const vent = makeSporeVent(index, state);
    vent.position.set(position[0], 0, position[1]);
    vent.name = 'spore-vent';
    root.add(vent);
  });

  if (state === 'blooming') {
    addSporeCloud(root, 64, 8.0, 5.3, 0.8, 4.8, 'sleep-spore-cloud');
    addMemoryBlooms(root);
  }

  if (state === 'harvested') addHarvestStation(root);
  if (state === 'burned') addBurnedFieldOverlay(root);
}

function addFieldFloor(root, state) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8.9, 9.25, 0.32, 18), material(state === 'burned' ? 'char' : 'soil'));
  base.scale.z = 0.74;
  base.position.y = 0.03;
  root.add(base);

  for (let index = 0; index < 13; index += 1) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(1.1 + deterministic(`patch-r:${index}`) * 1.8, 14),
      material(state === 'burned' ? index % 2 ? 'ash' : 'char' : index % 3 === 0 ? 'wetSoil' : 'darkMoss')
    );
    const angle = deterministic(`patch-a:${index}`) * Math.PI * 2;
    const radius = 1.8 + deterministic(`patch-d:${index}`) * 6.2;
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = angle;
    patch.scale.set(1.0, 0.55 + deterministic(`patch-s:${index}`) * 0.55, 1.0);
    patch.position.set(Math.cos(angle) * radius, 0.21 + index * 0.0005, Math.sin(angle) * radius * 0.68);
    root.add(patch);
  }
}

function addFieldMycelialPaths(root, state) {
  const endpoints = [
    [-7.7, -1.4], [-5.4, 4.5], [-0.8, 5.8], [4.8, 4.3], [7.8, 0.6], [4.6, -4.7], [-1.2, -5.7], [-6.2, -4.1]
  ];
  endpoints.forEach((end, index) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.25, 0),
      new THREE.Vector3(end[0] * 0.35, 0.29 + index % 2 * 0.04, end[1] * 0.28),
      new THREE.Vector3(end[0] * 0.7, 0.25, end[1] * 0.68),
      new THREE.Vector3(end[0], 0.23, end[1])
    ]);
    const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.11 + index % 3 * 0.025, 6, false), material(state === 'burned' ? 'char' : index % 2 ? 'mycelium' : 'paleMycelium'));
    path.name = 'mycelial-path';
    root.add(path);
    for (let branchIndex = 0; branchIndex < 3; branchIndex += 1) {
      const t = 0.35 + branchIndex * 0.2;
      const point = curve.getPoint(t);
      const branchEnd = new THREE.Vector3(point.x + (branchIndex - 1) * 1.2, 0.22, point.z + (index % 2 ? 0.85 : -0.85));
      const branchCurve = new THREE.CatmullRomCurve3([point, point.clone().lerp(branchEnd, 0.5).setY(0.27), branchEnd]);
      const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 8, 0.045, 5, false), material(state === 'burned' ? 'char' : 'mycelium'));
      branch.name = 'mycelial-path';
      root.add(branch);
    }
  });
}

function makeMushroom(seed, height, capRadius, capMaterialName) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(capRadius * 0.18, capRadius * 0.3, height, 8, 4),
    material(seed % 3 === 0 ? 'paleMycelium' : 'mycelium')
  );
  stem.position.y = height / 2;
  stem.rotation.z = (deterministic(`stem-lean:${seed}`) - 0.5) * 0.16;
  group.add(stem);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(capRadius, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    material(capMaterialName)
  );
  cap.scale.y = 0.62 + deterministic(`cap-flat:${seed}`) * 0.22;
  cap.position.y = height;
  cap.rotation.y = deterministic(`cap-rot:${seed}`) * Math.PI * 2;
  group.add(cap);

  const gillDisk = new THREE.Mesh(new THREE.CircleGeometry(capRadius * 0.88, 14), material('gill'));
  gillDisk.rotation.x = Math.PI / 2;
  gillDisk.position.y = height - capRadius * 0.025;
  group.add(gillDisk);

  for (let ribIndex = 0; ribIndex < 8; ribIndex += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, capRadius * 0.8), material(capMaterialName === 'cyanGlow' ? 'cyanGlow' : 'gill'));
    rib.position.y = height - capRadius * 0.045;
    rib.rotation.y = ribIndex * Math.PI / 4;
    group.add(rib);
  }

  if (capMaterialName === 'cyanGlow') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(capRadius * 0.68, 0.035, 6, 18), material('cyanGlow'));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = height + capRadius * 0.16;
    halo.name = 'organic-pulse';
    group.add(halo);
  }
  return group;
}

function makeBurnedMushroom(seed, height, capRadius) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(capRadius * 0.12, capRadius * 0.27, height, 7, 2), material('char'));
  stem.position.y = height / 2;
  stem.rotation.z = seed % 2 ? 0.14 : -0.18;
  group.add(stem);
  if (seed % 3 !== 0) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(capRadius, 9, 5, 0, Math.PI * 1.55, 0, Math.PI / 2), material(seed % 4 === 0 ? 'ember' : 'char'));
    cap.scale.y = 0.35;
    cap.position.y = height;
    cap.rotation.z = seed % 2 ? 0.28 : -0.24;
    group.add(cap);
  }
  return group;
}

function makeCutMushroomStump(seed) {
  const group = new THREE.Group();
  const height = 0.18 + deterministic(`stump-h:${seed}`) * 0.28;
  const radius = 0.12 + deterministic(`stump-r:${seed}`) * 0.16;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, height, 8), material('mycelium'));
  stem.position.y = height / 2;
  group.add(stem);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.82, 8), material('paleMycelium'));
  cut.rotation.x = -Math.PI / 2;
  cut.position.y = height + 0.006;
  group.add(cut);
  return group;
}

function makeSporeVent(seed, state) {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1.05 + seed * 0.08, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), material(state === 'burned' ? 'char' : 'darkMoss'));
  mound.scale.y = 0.55;
  group.add(mound);
  for (let index = 0; index < 7; index += 1) {
    const angle = index * Math.PI * 2 / 7;
    const trumpet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 + index % 2 * 0.05, 0.11, 0.8 + index % 3 * 0.14, 8, 1, true),
      material(state === 'burned' ? 'char' : index % 2 ? 'violetCap' : 'blueCap')
    );
    trumpet.position.set(Math.cos(angle) * 0.58, 0.48 + index % 3 * 0.08, Math.sin(angle) * 0.58);
    trumpet.rotation.z = Math.cos(angle) * 0.16;
    trumpet.rotation.x = Math.sin(angle) * 0.16;
    group.add(trumpet);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22 + index % 2 * 0.05, 0.035, 5, 12), material(state === 'burned' ? 'ember' : 'cyanGlow'));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(trumpet.position.x, trumpet.position.y + 0.4 + index % 3 * 0.07, trumpet.position.z);
    rim.name = state === 'burned' ? 'ember-rim' : 'organic-pulse';
    group.add(rim);
  }
  return group;
}

function addSporeCloud(root, count, radiusX, radiusZ, minY, maxY, groupName) {
  const group = new THREE.Group();
  group.name = groupName;
  for (let index = 0; index < count; index += 1) {
    const angle = deterministic(`spore-a:${groupName}:${index}`) * Math.PI * 2;
    const radial = Math.sqrt(deterministic(`spore-r:${groupName}:${index}`));
    const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + index % 4 * 0.012, 0), material(index % 5 === 0 ? 'blueGlow' : 'spore'));
    mote.position.set(
      Math.cos(angle) * radiusX * radial,
      minY + deterministic(`spore-y:${groupName}:${index}`) * (maxY - minY),
      Math.sin(angle) * radiusZ * radial
    );
    mote.name = 'spore-mote';
    mote.userData.phase = deterministic(`spore-phase:${groupName}:${index}`) * Math.PI * 2;
    group.add(mote);
  }
  root.add(group);
}

function addMemoryBlooms(root) {
  const positions = [[-4.6, 1.2], [-1.1, -2.5], [2.7, 2.8], [5.4, -2.1]];
  positions.forEach((position, index) => {
    const group = new THREE.Group();
    const flower = makeMushroom(200 + index, 1.6 + index * 0.18, 0.66 + index * 0.05, 'cyanGlow');
    group.add(flower);
    for (let layer = 0; layer < 3; layer += 1) {
      const memory = new THREE.Mesh(new THREE.RingGeometry(0.38 + layer * 0.26, 0.44 + layer * 0.26, 16), material('memory'));
      memory.position.y = 2.0 + layer * 0.45;
      memory.rotation.x = Math.PI / 2 + (layer - 1) * 0.12;
      memory.rotation.z = index * 0.4 + layer * 0.25;
      memory.name = 'hanging-prop';
      group.add(memory);
    }
    group.position.set(position[0], 0, position[1]);
    group.name = 'memory-bloom';
    root.add(group);
  });
}

function addHarvestStation(root) {
  const station = new THREE.Group();
  station.position.set(4.7, 0, 2.6);
  station.rotation.y = -0.35;
  station.name = 'harvest-station';
  const table = box(3.1, 0.18, 1.35, 'wood');
  table.position.y = 1.0;
  station.add(table);
  for (const x of [-1.25, 1.25]) {
    const leg = box(0.18, 0.95, 0.18, 'wood');
    leg.position.set(x, 0.48, 0);
    station.add(leg);
  }
  for (let index = 0; index < 12; index += 1) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18 + index % 3 * 0.04, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), material(index % 2 ? 'blueCap' : 'violetCap'));
    cap.scale.y = 0.42;
    cap.position.set(-1.2 + index % 6 * 0.48, 1.16, -0.38 + Math.floor(index / 6) * 0.7);
    station.add(cap);
  }
  const rack = makeDryingRack();
  rack.position.set(-2.5, 0, -0.25);
  station.add(rack);
  for (let basketIndex = 0; basketIndex < 3; basketIndex += 1) {
    const basket = makeBasket(basketIndex);
    basket.position.set(2.0 + basketIndex * 0.72, 0, -0.45 + basketIndex % 2 * 0.8);
    station.add(basket);
  }
  root.add(station);
}

function makeDryingRack() {
  const group = new THREE.Group();
  for (const x of [-0.75, 0.75]) {
    const post = box(0.12, 2.5, 0.12, 'wood');
    post.position.set(x, 1.25, 0);
    group.add(post);
  }
  for (let tier = 0; tier < 3; tier += 1) {
    const rail = box(1.7, 0.08, 0.08, 'rope');
    rail.position.y = 0.75 + tier * 0.65;
    group.add(rail);
    for (let index = 0; index < 5; index += 1) {
      const slice = new THREE.Mesh(new THREE.TorusGeometry(0.11 + index % 2 * 0.025, 0.025, 5, 10), material(index % 2 ? 'blueCap' : 'violetCap'));
      slice.position.set(-0.62 + index * 0.31, 0.56 + tier * 0.65, 0);
      slice.name = 'hanging-prop';
      group.add(slice);
    }
  }
  return group;
}

function makeBasket(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.55, 10, 1, true), material('basket'));
  body.position.y = 0.28;
  group.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 5, 12), material('rope'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.55;
  group.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 5, 12, Math.PI), material('rope'));
  handle.rotation.z = Math.PI / 2;
  handle.position.y = 0.58;
  group.add(handle);
  for (let index = 0; index < 5; index += 1) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11 + index % 2 * 0.025, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), material(index % 2 ? 'blueCap' : 'violetCap'));
    cap.position.set(-0.2 + index % 3 * 0.2, 0.54 + Math.floor(index / 3) * 0.12, -0.08 + index % 2 * 0.16);
    group.add(cap);
  }
  group.rotation.y = seed * 0.37;
  return group;
}

function addBurnedFieldOverlay(root) {
  for (let index = 0; index < 14; index += 1) {
    const angle = deterministic(`burn-a:${index}`) * Math.PI * 2;
    const radius = 1.2 + deterministic(`burn-r:${index}`) * 7.0;
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.55 + index % 4 * 0.25, 12), material(index % 3 === 0 ? 'ember' : 'ash'));
    scorch.rotation.x = -Math.PI / 2;
    scorch.scale.y = 0.55 + deterministic(`burn-s:${index}`) * 0.45;
    scorch.position.set(Math.cos(angle) * radius, 0.24, Math.sin(angle) * radius * 0.68);
    root.add(scorch);
  }
  for (let index = 0; index < 18; index += 1) {
    const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + index % 3 * 0.018, 0), material('ember'));
    ember.position.set(-6.5 + index * 0.72, 0.35 + index % 4 * 0.13, index % 2 ? 2.6 : -2.4);
    ember.name = 'spore-mote';
    root.add(ember);
  }
}

function buildMushroomPillarForest(root, state) {
  addForestFloor(root, state);

  const pillars = [
    { x: -6.2, z: -3.3, h: 8.2, r: 1.15 },
    { x: -2.6, z: -4.5, h: 10.1, r: 1.25 },
    { x: 2.0, z: -4.0, h: 7.4, r: 1.05 },
    { x: 6.1, z: -2.2, h: 9.5, r: 1.2 },
    { x: 5.0, z: 3.7, h: 7.8, r: 1.05 },
    { x: 0.4, z: 4.8, h: 10.6, r: 1.32 },
    { x: -4.6, z: 3.9, h: 8.8, r: 1.18 }
  ];

  pillars.forEach((spec, index) => {
    const pillar = makeColossalPillar(index, spec.h, spec.r, state);
    pillar.position.set(spec.x, 0, spec.z);
    pillar.name = 'colossal-pillar';
    pillar.userData.pillarIndex = index;
    root.add(pillar);
  });

  const bridgeLinks = [
    [0, 1, 5.4], [1, 2, 6.2], [2, 3, 5.0], [3, 4, 5.8], [4, 5, 5.3], [5, 6, 6.5], [6, 0, 5.1], [1, 5, 7.4]
  ];
  bridgeLinks.forEach((link, index) => {
    const start = pillars[link[0]];
    const end = pillars[link[1]];
    const bridge = makeMycelialBridge(start, end, link[2], index, state);
    bridge.name = 'mycelial-bridge';
    root.add(bridge);
  });

  for (let index = 0; index < 11; index += 1) {
    const pillar = pillars[index % pillars.length];
    const lantern = makeSporeLantern(index, state);
    const angle = index * 1.77;
    lantern.position.set(
      pillar.x + Math.cos(angle) * (pillar.r + 0.5),
      2.0 + index % 4 * 1.25,
      pillar.z + Math.sin(angle) * (pillar.r + 0.5)
    );
    lantern.name = 'spore-lantern';
    root.add(lantern);
  }

  if (state === 'wild') addForestUnderstory(root, 34, 'wild');
  if (state === 'communion') {
    addForestUnderstory(root, 18, 'communion');
    addCommunionCircle(root);
  }
  if (state === 'blighted') {
    addForestUnderstory(root, 14, 'blighted');
    addBlightOverlay(root, pillars);
  }
}

function addForestFloor(root, state) {
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.8, 0.42, 20), material(state === 'blighted' ? 'blight' : 'wetSoil'));
  floor.scale.z = 0.76;
  floor.position.y = 0.02;
  root.add(floor);

  for (let index = 0; index < 9; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 + index * 0.82, 0.05 + index % 2 * 0.02, 6, 32), material(state === 'blighted' ? 'blightGlow' : index % 2 ? 'mycelium' : 'darkMoss'));
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 0.72;
    ring.position.y = 0.28;
    root.add(ring);
  }
}

function makeColossalPillar(seed, height, radius, state) {
  const group = new THREE.Group();
  const stemMaterial = state === 'blighted' ? 'blight' : seed % 2 ? 'mycelium' : 'paleMycelium';
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius, height, 12, 6), material(stemMaterial));
  stem.position.y = height / 2;
  stem.rotation.z = (deterministic(`pillar-lean:${seed}`) - 0.5) * 0.09;
  group.add(stem);

  for (let buttressIndex = 0; buttressIndex < 7; buttressIndex += 1) {
    const angle = buttressIndex * Math.PI * 2 / 7;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * radius * 0.55, 1.6, Math.sin(angle) * radius * 0.55),
      new THREE.Vector3(Math.cos(angle) * radius * 1.15, 0.65, Math.sin(angle) * radius * 1.15),
      new THREE.Vector3(Math.cos(angle) * radius * 2.0, 0.24, Math.sin(angle) * radius * 2.0)
    ]);
    const buttress = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius * 0.12, 6, false), material(stemMaterial));
    buttress.name = 'radial-root';
    group.add(buttress);
  }

  for (let bandIndex = 0; bandIndex < 4; bandIndex += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * (0.66 - bandIndex * 0.035), 0.045, 6, 24), material(state === 'blighted' ? 'blightGlow' : 'gill'));
    band.rotation.x = Math.PI / 2;
    band.position.y = height * (0.22 + bandIndex * 0.16);
    group.add(band);
  }

  const capMaterial = state === 'blighted' ? 'blight' : seed % 3 === 0 ? 'violetCap' : seed % 2 ? 'deepBlueCap' : 'blueCap';
  const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.35, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), material(capMaterial));
  cap.scale.y = 0.48 + deterministic(`pillar-cap:${seed}`) * 0.12;
  cap.position.y = height;
  cap.rotation.y = seed * 0.64;
  if (state === 'blighted') cap.rotation.z = seed % 2 ? 0.12 : -0.1;
  group.add(cap);

  const gill = new THREE.Mesh(new THREE.CircleGeometry(radius * 2.1, 24), material(state === 'blighted' ? 'blightGlow' : 'gill'));
  gill.rotation.x = Math.PI / 2;
  gill.position.y = height - radius * 0.08;
  group.add(gill);

  for (let ribIndex = 0; ribIndex < 16; ribIndex += 1) {
    const rib = box(0.055, 0.035, radius * 1.95, state === 'blighted' ? 'blightGlow' : 'gill');
    rib.position.y = height - radius * 0.1;
    rib.rotation.y = ribIndex * Math.PI / 8;
    group.add(rib);
  }

  const topHalo = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.55, 0.07, 7, 28), material(state === 'blighted' ? 'blightGlow' : 'cyanGlow'));
  topHalo.rotation.x = Math.PI / 2;
  topHalo.position.y = height + radius * 0.42;
  topHalo.name = 'organic-pulse';
  group.add(topHalo);

  if (state === 'blighted') {
    for (let woundIndex = 0; woundIndex < 5; woundIndex += 1) {
      const wound = new THREE.Mesh(new THREE.SphereGeometry(0.18 + woundIndex * 0.04, 8, 5), material('blightGlow'));
      const angle = woundIndex * 1.37;
      wound.scale.set(1.0, 1.8, 0.45);
      wound.position.set(Math.cos(angle) * radius * 0.72, 1.5 + woundIndex * (height * 0.12), Math.sin(angle) * radius * 0.72);
      group.add(wound);
    }
  }
  return group;
}

function makeMycelialBridge(start, end, height, seed, state) {
  const group = new THREE.Group();
  const startPoint = new THREE.Vector3(start.x, height, start.z);
  const endPoint = new THREE.Vector3(end.x, height + (seed % 2 ? 0.4 : -0.25), end.z);
  const mid = startPoint.clone().lerp(endPoint, 0.5);
  mid.y -= 0.35 + deterministic(`bridge-sag:${seed}`) * 0.45;
  const curve = new THREE.CatmullRomCurve3([startPoint, mid, endPoint]);
  const bridgeBody = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.34, 8, false), material(state === 'blighted' ? 'blight' : 'mycelium'));
  group.add(bridgeBody);

  const samples = 14;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const step = box(0.82, 0.12, 0.55, state === 'blighted' ? 'char' : index % 3 === 0 ? 'moss' : 'bark');
    step.position.copy(point);
    step.position.y += 0.28;
    step.rotation.y = Math.atan2(tangent.x, tangent.z);
    step.rotation.z = (index % 2 ? 1 : -1) * 0.025;
    group.add(step);
  }

  for (const side of [-1, 1]) {
    const railPoints = [];
    for (let index = 0; index <= 8; index += 1) {
      const t = index / 8;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      railPoints.push(point.clone().addScaledVector(normal, side * 0.52).add(new THREE.Vector3(0, 0.82, 0)));
    }
    const railCurve = new THREE.CatmullRomCurve3(railPoints);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 20, 0.055, 5, false), material(state === 'blighted' ? 'blightGlow' : 'rope'));
    group.add(rail);
  }
  return group;
}

function makeSporeLantern(seed, state) {
  const group = new THREE.Group();
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.8 + seed % 3 * 0.18, 6), material(state === 'blighted' ? 'blight' : 'rope'));
  tether.position.y = 0.45;
  group.add(tether);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24 + seed % 3 * 0.035, 10, 7), material(state === 'blighted' ? 'blightGlow' : seed % 2 ? 'cyanGlow' : 'violetGlow'));
  bulb.scale.y = 1.35;
  bulb.position.y = -0.05;
  bulb.name = 'organic-pulse';
  group.add(bulb);
  for (let ribIndex = 0; ribIndex < 5; ribIndex += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.25 + seed % 3 * 0.035, 0.018, 5, 10), material(state === 'blighted' ? 'char' : 'mycelium'));
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = ribIndex * Math.PI / 5;
    rib.position.y = -0.05;
    group.add(rib);
  }
  group.name = 'hanging-prop';
  return group;
}

function addForestUnderstory(root, count, mode) {
  for (let index = 0; index < count; index += 1) {
    const angle = deterministic(`under-a:${mode}:${index}`) * Math.PI * 2;
    const radius = 1.4 + Math.sqrt(deterministic(`under-r:${mode}:${index}`)) * 8.5;
    const height = 0.45 + deterministic(`under-h:${mode}:${index}`) * 1.15;
    const capMaterial = mode === 'blighted' ? 'blight' : index % 5 === 0 ? 'cyanGlow' : index % 2 ? 'blueCap' : 'violetCap';
    const mushroom = mode === 'blighted' && index % 3 === 0
      ? makeBurnedMushroom(index + 500, height, 0.25 + index % 4 * 0.05)
      : makeMushroom(index + 500, height, 0.24 + index % 4 * 0.06, capMaterial);
    mushroom.position.set(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius * 0.7);
    root.add(mushroom);
  }
}

function addCommunionCircle(root) {
  const circle = new THREE.Group();
  circle.name = 'communion-circle';
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.75, 0.42, 18), material('darkMoss'));
  dais.position.y = 0.42;
  circle.add(dais);
  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + ringIndex * 0.78, 0.055, 6, 26), material(ringIndex % 2 ? 'violetGlow' : 'cyanGlow'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.66 + ringIndex * 0.01;
    ring.name = 'organic-pulse';
    circle.add(ring);
  }
  for (let index = 0; index < 10; index += 1) {
    const angle = index * Math.PI * 2 / 10;
    const witness = makeMyconidWitness(index);
    witness.position.set(Math.cos(angle) * 3.0, 0.58, Math.sin(angle) * 3.0);
    witness.rotation.y = -angle + Math.PI / 2;
    circle.add(witness);
  }
  const centralBloom = makeMushroom(900, 3.4, 1.35, 'cyanGlow');
  centralBloom.position.y = 0.55;
  circle.add(centralBloom);
  root.add(circle);
  addSporeCloud(root, 38, 3.8, 3.8, 1.2, 6.8, 'communion-spore-cloud');
}

function makeMyconidWitness(seed) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 5, 8), material(seed % 2 ? 'mycelium' : 'paleMycelium'));
  body.position.y = 0.65;
  body.rotation.z = seed % 2 ? 0.06 : -0.05;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), material(seed % 3 === 0 ? 'violetCap' : 'blueCap'));
  cap.scale.y = 0.5;
  cap.position.y = 1.32;
  group.add(cap);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.65, 6), material('mycelium'));
    arm.position.set(side * 0.33, 0.72, 0.05);
    arm.rotation.z = side * -0.75;
    group.add(arm);
  }
  return group;
}

function addBlightOverlay(root, pillars) {
  pillars.forEach((pillar, index) => {
    for (let growthIndex = 0; growthIndex < 3; growthIndex += 1) {
      const blister = new THREE.Mesh(new THREE.SphereGeometry(0.32 + growthIndex * 0.08, 9, 6), material('blightGlow'));
      const angle = index * 0.91 + growthIndex * 2.0;
      blister.scale.set(1.0, 1.45, 0.62);
      blister.position.set(
        pillar.x + Math.cos(angle) * (pillar.r * 0.88),
        1.3 + growthIndex * (pillar.h * 0.2),
        pillar.z + Math.sin(angle) * (pillar.r * 0.88)
      );
      blister.name = 'blight-overlay';
      root.add(blister);
    }
  });
  for (let index = 0; index < 11; index += 1) {
    const angle = deterministic(`ooze-a:${index}`) * Math.PI * 2;
    const radius = 1.0 + deterministic(`ooze-r:${index}`) * 8.8;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55 + index % 4 * 0.22, 14), material('ooze'));
    pool.rotation.x = -Math.PI / 2;
    pool.scale.y = 0.5 + deterministic(`ooze-s:${index}`) * 0.6;
    pool.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius * 0.7);
    pool.name = 'blight-overlay';
    root.add(pool);
  }
  addSporeCloud(root, 42, 8.8, 6.5, 0.8, 7.4, 'blight-spore-cloud');
}

function buildMycelialHeart(root, state) {
  addHeartFloor(root, state);
  addHeartRoots(root, state);
  addMycelialCore(root, state);
  addBiomassSacs(root, state);
  addDefensePods(root, state);

  if (state === 'stable') addStableHeartDetails(root);
  if (state === 'expanding') addExpandingHeartDetails(root);
  if (state === 'burned-out') addBurnedHeartDetails(root);
}

function addHeartFloor(root, state) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8.3, 8.7, 0.46, 20), material(state === 'burned-out' ? 'char' : 'wetSoil'));
  base.scale.z = 0.84;
  base.position.y = 0.02;
  root.add(base);
  for (let ringIndex = 0; ringIndex < 5; ringIndex += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + ringIndex * 1.2, 0.08 + ringIndex % 2 * 0.025, 6, 32), material(state === 'burned-out' ? ringIndex % 2 ? 'ash' : 'char' : ringIndex % 2 ? 'heartShell' : 'mycelium'));
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 0.84;
    ring.position.y = 0.31;
    root.add(ring);
  }
}

function addHeartRoots(root, state) {
  const rootCount = state === 'expanding' ? 14 : state === 'burned-out' ? 7 : 10;
  for (let index = 0; index < rootCount; index += 1) {
    const angle = index * Math.PI * 2 / rootCount + (index % 2) * 0.12;
    const length = state === 'expanding' ? 7.0 + index % 3 * 0.55 : 5.8 + index % 4 * 0.42;
    const points = [
      new THREE.Vector3(Math.cos(angle) * 1.15, 0.8, Math.sin(angle) * 1.15),
      new THREE.Vector3(Math.cos(angle + 0.15) * length * 0.38, 0.42 + index % 2 * 0.15, Math.sin(angle + 0.15) * length * 0.38),
      new THREE.Vector3(Math.cos(angle - 0.1) * length * 0.7, 0.28, Math.sin(angle - 0.1) * length * 0.7),
      new THREE.Vector3(Math.cos(angle) * length, 0.24, Math.sin(angle) * length)
    ];
    const rootCurve = new THREE.CatmullRomCurve3(points);
    const rootMesh = new THREE.Mesh(
      new THREE.TubeGeometry(rootCurve, 24, 0.19 + index % 3 * 0.045, 7, false),
      material(state === 'burned-out' ? index % 3 === 0 ? 'ember' : 'char' : index % 2 ? 'heartShell' : 'mycelium')
    );
    rootMesh.name = 'radial-root';
    rootMesh.userData.rootIndex = index;
    root.add(rootMesh);

    if (state !== 'burned-out') {
      for (let branchIndex = 0; branchIndex < 2; branchIndex += 1) {
        const t = 0.45 + branchIndex * 0.22;
        const point = rootCurve.getPoint(t);
        const side = branchIndex % 2 ? -1 : 1;
        const branchEnd = point.clone().add(new THREE.Vector3(Math.cos(angle + side * 1.1) * 1.5, -0.05, Math.sin(angle + side * 1.1) * 1.5));
        const branchCurve = new THREE.CatmullRomCurve3([point, point.clone().lerp(branchEnd, 0.5).setY(0.31), branchEnd]);
        const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 10, 0.07, 5, false), material(index % 2 ? 'mycelium' : 'heartShell'));
        branch.name = 'radial-root';
        root.add(branch);
      }
    }
  }
}

function addMycelialCore(root, state) {
  const core = new THREE.Group();
  core.name = 'mycelial-core';
  core.position.y = 0.45;

  if (state === 'burned-out') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.15, 16, 10, 0, Math.PI * 1.55, 0.25, Math.PI * 0.72), material('char'));
    shell.scale.set(1.0, 1.25, 0.92);
    shell.position.y = 2.2;
    shell.rotation.z = -0.22;
    core.add(shell);
    for (let shardIndex = 0; shardIndex < 7; shardIndex += 1) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.34 + shardIndex % 3 * 0.08, 1.1 + shardIndex % 2 * 0.45, 5), material(shardIndex % 3 === 0 ? 'ember' : 'char'));
      const angle = shardIndex * Math.PI * 2 / 7;
      shard.position.set(Math.cos(angle) * 1.8, 1.0 + shardIndex % 3 * 0.45, Math.sin(angle) * 1.5);
      shard.rotation.z = Math.cos(angle) * 0.65;
      core.add(shard);
    }
    const emberCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), material('ember'));
    emberCore.position.y = 1.6;
    emberCore.name = 'organic-pulse';
    core.add(emberCore);
    root.add(core);
    return;
  }

  const lobeSpecs = [
    { x: -0.85, y: 2.25, z: 0.1, sx: 1.25, sy: 1.7, sz: 1.05 },
    { x: 0.82, y: 2.3, z: 0.0, sx: 1.2, sy: 1.75, sz: 1.0 },
    { x: 0.0, y: 1.55, z: 0.4, sx: 1.35, sy: 1.45, sz: 1.18 }
  ];
  lobeSpecs.forEach((spec, index) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 11), material(index === 2 ? 'heartGlow' : 'heartShell'));
    lobe.position.set(spec.x, spec.y, spec.z);
    lobe.scale.set(spec.sx, spec.sy, spec.sz);
    lobe.rotation.z = index === 0 ? -0.18 : index === 1 ? 0.18 : 0;
    lobe.name = 'organic-pulse';
    lobe.userData.phase = index * 1.7;
    core.add(lobe);
  });

  for (let ribIndex = 0; ribIndex < 9; ribIndex += 1) {
    const angle = ribIndex * Math.PI * 2 / 9;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * 0.75, 0.45, Math.sin(angle) * 0.65),
      new THREE.Vector3(Math.cos(angle) * 1.45, 2.0, Math.sin(angle) * 1.15),
      new THREE.Vector3(Math.cos(angle) * 0.9, 4.0, Math.sin(angle) * 0.72)
    ]);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.11, 6, false), material(ribIndex % 3 === 0 ? 'cyanGlow' : 'paleMycelium'));
    rib.name = ribIndex % 3 === 0 ? 'organic-pulse' : 'heart-rib';
    core.add(rib);
  }

  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.12, 7, 28), material('cyanGlow'));
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 4.25;
  crown.name = 'organic-pulse';
  core.add(crown);

  for (let membraneIndex = 0; membraneIndex < 5; membraneIndex += 1) {
    const membrane = new THREE.Mesh(new THREE.CircleGeometry(0.7 + membraneIndex * 0.09, 14), material('membrane'));
    const angle = membraneIndex * Math.PI * 2 / 5;
    membrane.position.set(Math.cos(angle) * 1.75, 2.1 + membraneIndex % 2 * 0.45, Math.sin(angle) * 1.5);
    membrane.lookAt(0, 2.2, 0);
    membrane.name = 'hanging-prop';
    core.add(membrane);
  }
  root.add(core);
}

function addBiomassSacs(root, state) {
  const count = state === 'expanding' ? 12 : state === 'burned-out' ? 4 : 8;
  for (let index = 0; index < count; index += 1) {
    const angle = index * Math.PI * 2 / count + 0.3;
    const radius = state === 'expanding' ? 3.7 + index % 3 * 0.55 : 3.6 + index % 2 * 0.65;
    const sac = makeBiomassSac(index, state);
    sac.position.set(Math.cos(angle) * radius, 0.28, Math.sin(angle) * radius * 0.88);
    sac.rotation.y = -angle;
    sac.name = 'biomass-sac';
    root.add(sac);
  }
}

function makeBiomassSac(seed, state) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.58 + seed % 3 * 0.1, 12, 8), material(state === 'burned-out' ? 'char' : seed % 3 === 0 ? 'sacGlow' : 'sac'));
  body.scale.set(0.82, 1.55 + seed % 2 * 0.25, 0.9);
  body.position.y = 0.85;
  body.name = state === 'burned-out' ? 'burned-sac' : 'organic-pulse';
  body.userData.phase = seed * 0.63;
  group.add(body);
  for (let veinIndex = 0; veinIndex < 5; veinIndex += 1) {
    const vein = new THREE.Mesh(new THREE.TorusGeometry(0.43 + seed % 3 * 0.07, 0.025, 5, 12), material(state === 'burned-out' ? 'ember' : 'heartShell'));
    vein.rotation.x = Math.PI / 2;
    vein.position.y = 0.45 + veinIndex * 0.22;
    group.add(vein);
  }
  const tetherCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(-0.35, 0.12, 0.15),
    new THREE.Vector3(-0.78, 0.05, 0.25)
  ]);
  const tether = new THREE.Mesh(new THREE.TubeGeometry(tetherCurve, 8, 0.06, 5, false), material(state === 'burned-out' ? 'char' : 'mycelium'));
  group.add(tether);
  return group;
}

function addDefensePods(root, state) {
  const count = state === 'burned-out' ? 3 : 7;
  for (let index = 0; index < count; index += 1) {
    const angle = index * Math.PI * 2 / count + 0.65;
    const pod = makeDefensePod(index, state);
    pod.position.set(Math.cos(angle) * 6.1, 0.25, Math.sin(angle) * 5.1);
    pod.rotation.y = -angle + Math.PI / 2;
    pod.name = 'defense-spore-pod';
    root.add(pod);
  }
}

function makeDefensePod(seed, state) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.72, 11, 7, 0, Math.PI * 2, 0, Math.PI / 2), material(state === 'burned-out' ? 'char' : 'darkMoss'));
  base.scale.y = 0.55;
  group.add(base);
  for (let petalIndex = 0; petalIndex < 6; petalIndex += 1) {
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.05, 5), material(state === 'burned-out' ? 'char' : petalIndex % 2 ? 'blueCap' : 'violetCap'));
    const angle = petalIndex * Math.PI * 2 / 6;
    petal.position.set(Math.cos(angle) * 0.42, 0.65, Math.sin(angle) * 0.42);
    petal.rotation.z = Math.PI + Math.cos(angle) * 0.32;
    petal.rotation.x = Math.sin(angle) * 0.32;
    group.add(petal);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28 + seed % 2 * 0.05, 9, 6), material(state === 'burned-out' ? 'ember' : 'violetGlow'));
  orb.position.y = 0.72;
  orb.name = 'organic-pulse';
  group.add(orb);
  return group;
}

function addStableHeartDetails(root) {
  addSporeCloud(root, 52, 6.5, 5.6, 0.8, 7.2, 'heart-spore-cloud');
  const shrine = makeObservationShrine();
  shrine.position.set(5.7, 0.28, 3.5);
  shrine.rotation.y = -0.65;
  root.add(shrine);
}

function makeObservationShrine() {
  const group = new THREE.Group();
  group.name = 'growth-observation-shrine';
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.36, 12), material('stone'));
  base.position.y = 0.18;
  group.add(base);
  const lectern = box(1.4, 1.2, 0.75, 'wood');
  lectern.position.y = 0.9;
  lectern.rotation.x = -0.12;
  group.add(lectern);
  const membrane = new THREE.Mesh(new THREE.CircleGeometry(0.52, 14), material('memory'));
  membrane.position.set(0, 1.32, -0.42);
  membrane.rotation.x = -0.22;
  group.add(membrane);
  for (let index = 0; index < 6; index += 1) {
    const sample = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.42, 7), material(index % 2 ? 'cyanGlow' : 'violetGlow'));
    sample.position.set(-0.55 + index * 0.22, 1.4, 0.18);
    group.add(sample);
  }
  return group;
}

function addExpandingHeartDetails(root) {
  const frontierAngles = [0.2, 1.0, 1.8, 2.8, 3.7, 4.6, 5.5];
  frontierAngles.forEach((angle, index) => {
    const frontier = new THREE.Group();
    frontier.name = 'growth-frontier';
    frontier.position.set(Math.cos(angle) * 7.4, 0.25, Math.sin(angle) * 6.2);
    for (let sproutIndex = 0; sproutIndex < 5; sproutIndex += 1) {
      const sprout = makeMushroom(1200 + index * 7 + sproutIndex, 0.65 + sproutIndex * 0.28, 0.28 + sproutIndex * 0.07, sproutIndex % 2 ? 'cyanGlow' : 'violetCap');
      const localAngle = sproutIndex * Math.PI * 2 / 5;
      sprout.position.set(Math.cos(localAngle) * 0.65, 0, Math.sin(localAngle) * 0.65);
      frontier.add(sprout);
    }
    root.add(frontier);
  });
  addSporeCloud(root, 76, 7.6, 6.4, 0.7, 8.0, 'expanding-heart-spore-cloud');
}

function addBurnedHeartDetails(root) {
  for (let index = 0; index < 17; index += 1) {
    const angle = deterministic(`heart-ash-a:${index}`) * Math.PI * 2;
    const radius = 1.0 + deterministic(`heart-ash-r:${index}`) * 6.7;
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.4 + index % 4 * 0.2, 12), material(index % 4 === 0 ? 'ember' : 'ash'));
    ash.rotation.x = -Math.PI / 2;
    ash.scale.y = 0.45 + deterministic(`heart-ash-s:${index}`) * 0.55;
    ash.position.set(Math.cos(angle) * radius, 0.27, Math.sin(angle) * radius * 0.82);
    root.add(ash);
  }
  for (let index = 0; index < 28; index += 1) {
    const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 + index % 3 * 0.012, 0), material(index % 5 === 0 ? 'ember' : 'ash'));
    mote.position.set(-6.0 + index * 0.45, 0.5 + index % 5 * 0.28, index % 2 ? 3.2 : -3.0);
    mote.name = 'spore-mote';
    root.add(mote);
  }
}

function box(width, height, depth, materialName) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(materialName));
}

function material(name) {
  if (!MATERIAL_CACHE.has(name)) {
    const options = MATERIALS[name] ?? MATERIALS.soil;
    MATERIAL_CACHE.set(name, new THREE.MeshStandardMaterial({ ...options }));
  }
  return MATERIAL_CACHE.get(name);
}

function deterministic(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
