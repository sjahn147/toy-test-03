import { THREE } from './ThreeScene.js';

export const RESIDENTIAL_COLORS = Object.freeze({
  stone: 0x4b4845, stoneLight: 0x6b6660, stoneDark: 0x2d2c2c,
  plaster: 0x8a7b67, plasterPale: 0xb0a18b, soot: 0x292729,
  timber: 0x65452f, timberDark: 0x3b291f, charred: 0x251d1a,
  brick: 0x71433a, brickDark: 0x482d2a, copper: 0x9b6b3b, copperGreen: 0x47766d,
  iron: 0x4f5155, rust: 0x7a4630, rope: 0xa8875c,
  linen: 0xb7aa8c, linenDirty: 0x766c5c, redCloth: 0x7b3d3e, blueCloth: 0x40546a,
  water: 0x356b76, waterLight: 0x77aeb5, steam: 0xc4c5bc,
  fungus: 0x668253, fungusGlow: 0x9fcf75, slime: 0x5e805c,
  candle: 0xffcf7d, ember: 0xff8c42, sacred: 0x8bc7d8, profane: 0x6f315a,
  bone: 0xc1b79f, parchment: 0xd3c49d, chalk: 0xbec6c8, shadow: 0x1c1b1d
});

export function group(name) {
  const root = new THREE.Group();
  root.name = name;
  return root;
}

export function material(name, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: RESIDENTIAL_COLORS[name] ?? RESIDENTIAL_COLORS.stone,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.03,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide
  });
}

export function box(w, h, d, mat, name, position = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(mat, options));
  mesh.name = name;
  mesh.position.set(...position);
  return mesh;
}

export function cylinder(r, h, mat, name, position = [0, 0, 0], segments = 14, rotation = null, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material(mat, options));
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
}

export function sphere(r, mat, name, position = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material(mat, options));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

export function cone(r, h, mat, name, position = [0, 0, 0], segments = 10, options = {}) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material(mat, options));
  mesh.name = name;
  mesh.position.set(...position);
  return mesh;
}

export function torus(r, tube, mat, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28), material(mat, options));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export function plane(w, h, mat, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material(mat, { ...options, side: THREE.DoubleSide }));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export function beam(start, end, radius, mat, name, options = {}) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material(mat, options));
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

export function wornTileFloor(width, depth, variant = 'stone') {
  const floor = group('residential-worn-floor');
  floor.add(box(width, 0.28, depth, variant, 'residential-floor-slab', [0, -0.14, 0]));
  const cols = Math.max(4, Math.round(width / 2.1));
  const rows = Math.max(4, Math.round(depth / 2.1));
  for (let x = 1; x < cols; x += 1) {
    floor.add(box(0.045, 0.025, depth * 0.97, 'stoneDark', 'floor-joint', [-width / 2 + x * width / cols, 0.01, 0]));
  }
  for (let z = 1; z < rows; z += 1) {
    floor.add(box(width * 0.97, 0.025, 0.045, 'stoneDark', 'floor-joint', [0, 0.01, -depth / 2 + z * depth / rows]));
  }
  return floor;
}

export function bunkBed(x, z, rotation = 0, damaged = false) {
  const bunk = group('double-bunk-row');
  bunk.position.set(x, 0, z);
  bunk.rotation.y = rotation;
  const tilt = damaged ? 0.13 : 0;
  for (const y of [0.48, 1.82]) {
    const frame = box(2.55, 0.15, 1.05, damaged ? 'charred' : 'timberDark', 'bunk-frame', [0, y, 0]);
    frame.rotation.z = tilt;
    bunk.add(frame);
    const mattress = box(2.25, 0.18, 0.88, damaged ? 'linenDirty' : 'linen', 'bunk-mattress', [0, y + 0.17, 0]);
    mattress.rotation.z = tilt;
    bunk.add(mattress);
    bunk.add(box(0.62, 0.16, 0.72, 'linenDirty', 'bunk-pillow', [-0.72, y + 0.32, 0]));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bunk.add(box(0.14, 2.45, 0.14, damaged ? 'charred' : 'timber', 'bunk-post', [sx * 1.18, 1.22, sz * 0.43]));
  }
  for (let i = 0; i < 5; i += 1) bunk.add(box(0.48, 0.08, 0.12, 'timber', 'bunk-ladder-rung', [1.36, 0.5 + i * 0.38, 0.52]));
  return bunk;
}

export function lockerBank(x, z, count = 4, rotation = 0) {
  const bank = group('salvage-lockers');
  bank.position.set(x, 0, z);
  bank.rotation.y = rotation;
  for (let i = 0; i < count; i += 1) {
    const lx = (i - (count - 1) / 2) * 0.72;
    bank.add(box(0.64, 1.75, 0.55, i % 2 ? 'iron' : 'rust', 'locker-body', [lx, 0.88, 0]));
    bank.add(box(0.4, 0.02, 0.03, 'shadow', 'locker-vent', [lx, 1.38, 0.29]));
    bank.add(sphere(0.04, 'copper', 'locker-handle', [lx + 0.2, 0.86, 0.3]));
  }
  return bank;
}

export function cookRange(x, z, rotation = 0, lit = false) {
  const range = group('communal-range');
  range.position.set(x, 0, z);
  range.rotation.y = rotation;
  range.add(box(5.4, 1.35, 1.6, 'brickDark', 'range-masonry', [0, 0.68, 0]));
  range.add(box(5.7, 0.22, 1.8, 'stoneLight', 'range-capstone', [0, 1.46, 0]));
  for (let i = 0; i < 3; i += 1) {
    const ox = -1.7 + i * 1.7;
    range.add(torus(0.46, 0.12, 'iron', 'range-firebox', [ox, 0.72, 0.82], [Math.PI / 2, 0, 0]));
    range.add(box(0.74, 0.6, 0.08, 'soot', 'range-firebox-mouth', [ox, 0.7, 0.82]));
    if (lit) range.add(flame(ox, 0.65, 0.68, 0.72));
  }
  return range;
}

export function workTable(name, x, z, w = 3.2, d = 1.5, rotation = 0) {
  const table = group(name);
  table.position.set(x, 0, z);
  table.rotation.y = rotation;
  table.add(box(w, 0.22, d, 'timber', `${name}-top`, [0, 1.02, 0]));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(box(0.18, 1.0, 0.18, 'timberDark', `${name}-leg`, [sx * (w / 2 - 0.22), 0.5, sz * (d / 2 - 0.22)]));
  return table;
}

export function washTrough(name, x, z, w = 3.2, d = 1.25, water = true) {
  const trough = group(name);
  trough.position.set(x, 0, z);
  trough.add(box(w, 0.75, d, 'stoneLight', `${name}-body`, [0, 0.38, 0]));
  trough.add(box(w - 0.34, 0.48, d - 0.34, 'stoneDark', `${name}-hollow`, [0, 0.58, 0]));
  if (water) {
    const surface = box(w - 0.42, 0.06, d - 0.42, 'water', `${name}-water`, [0, 0.83, 0], {
      roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.86,
      emissive: RESIDENTIAL_COLORS.water, emissiveIntensity: 0.12
    });
    surface.userData = { animation: 'water-ripple', phase: x * 0.7 + z * 0.4 };
    trough.add(surface);
  }
  return trough;
}

export function laundryLine(start, end, clothCount = 5) {
  const line = group('laundry-lines');
  line.add(beam(start, end, 0.025, 'rope', 'laundry-rope'));
  for (let i = 0; i < clothCount; i += 1) {
    const t = (i + 1) / (clothCount + 1);
    const x = start[0] + (end[0] - start[0]) * t;
    const y = start[1] + (end[1] - start[1]) * t - 0.55;
    const z = start[2] + (end[2] - start[2]) * t;
    const cloth = plane(0.72 + (i % 2) * 0.2, 1.1, i % 3 === 0 ? 'blueCloth' : i % 3 === 1 ? 'linen' : 'redCloth', 'hanging-laundry', [x, y, z]);
    cloth.userData = { animation: 'laundry-sway', phase: i * 0.8 + x };
    line.add(cloth);
  }
  return line;
}

export function balconySection(x, z, rotation = 0, width = 4.4) {
  const section = group('tenement-balcony');
  section.position.set(x, 0, z);
  section.rotation.y = rotation;
  section.add(box(width, 4.8, 0.45, 'plaster', 'tenement-wall', [0, 2.4, 0]));
  section.add(box(width, 0.25, 1.55, 'timberDark', 'tenement-balcony-deck', [0, 3.0, 0.72]));
  for (let i = 0; i < 6; i += 1) section.add(box(0.08, 1.0, 0.08, 'iron', 'tenement-balcony-rail', [-width / 2 + 0.4 + i * ((width - 0.8) / 5), 3.55, 1.35]));
  section.add(box(width - 0.3, 0.08, 0.08, 'iron', 'tenement-balcony-rail', [0, 4.0, 1.35]));
  section.add(box(1.2, 2.0, 0.14, 'timberDark', 'tenement-door', [0, 1.02, 0.28]));
  section.add(box(1.0, 1.0, 0.12, 'shadow', 'tenement-window', [-1.45, 3.95, 0.25]));
  return section;
}

export function deadTree() {
  const tree = group('dead-courtyard-tree');
  tree.add(cylinder(0.5, 3.6, 'timberDark', 'dead-tree-trunk', [0, 1.8, 0], 10));
  for (const branch of [
    [[0, 3.0, 0], [-1.8, 5.1, 0.4]], [[0, 2.9, 0], [1.7, 4.8, -0.5]],
    [[0.1, 3.5, 0], [0.7, 5.7, 1.1]], [[-0.2, 4.0, 0], [-0.7, 5.8, -1.2]]
  ]) tree.add(beam(branch[0], branch[1], 0.16, 'timberDark', 'dead-tree-branch'));
  tree.add(torus(1.35, 0.18, 'stoneLight', 'tree-seat-ring', [0, 0.45, 0], [Math.PI / 2, 0, 0]));
  return tree;
}

export function chapelBench(x, z, rotation = 0) {
  const bench = group('prayer-benches');
  bench.position.set(x, 0, z);
  bench.rotation.y = rotation;
  bench.add(box(2.4, 0.18, 0.62, 'timber', 'chapel-bench-seat', [0, 0.72, 0]));
  bench.add(box(2.4, 1.35, 0.16, 'timberDark', 'chapel-bench-back', [0, 1.25, -0.28]));
  bench.add(box(0.18, 0.72, 0.55, 'timberDark', 'chapel-bench-leg', [-1.0, 0.36, 0]));
  bench.add(box(0.18, 0.72, 0.55, 'timberDark', 'chapel-bench-leg', [1.0, 0.36, 0]));
  return bench;
}

export function candle(x, y, z, lit = true, scale = 1) {
  const node = group('chapel-candle');
  node.add(cylinder(0.07 * scale, 0.48 * scale, 'linen', 'candle-wax', [x, y, z], 10));
  if (lit) {
    const glow = sphere(0.12 * scale, 'candle', 'candle-flame', [x, y + 0.34 * scale, z], [0.75, 1.35, 0.75], {
      emissive: RESIDENTIAL_COLORS.candle, emissiveIntensity: 1.45
    });
    glow.userData = { animation: 'candle-flicker', phase: x * 1.7 + z * 0.9 };
    node.add(glow);
  }
  return node;
}

export function flame(x, y, z, scale = 1) {
  const node = group('residential-flame');
  node.position.set(x, y, z);
  const outer = cone(0.28 * scale, 0.9 * scale, 'ember', 'flame-outer', [0, 0.45 * scale, 0], 7, {
    emissive: RESIDENTIAL_COLORS.ember, emissiveIntensity: 1.2, transparent: true, opacity: 0.82
  });
  const inner = cone(0.15 * scale, 0.55 * scale, 'candle', 'flame-inner', [0, 0.34 * scale, 0], 6, {
    emissive: RESIDENTIAL_COLORS.candle, emissiveIntensity: 1.7
  });
  node.add(outer, inner);
  node.userData = { animation: 'flame-flicker', phase: x + z };
  return node;
}

export function fungusCluster(x, z, count = 7, scale = 1) {
  const cluster = group('fungal-contamination');
  cluster.position.set(x, 0, z);
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.39;
    const radius = 0.25 + (i % 4) * 0.18;
    const h = (0.35 + (i % 3) * 0.2) * scale;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    cluster.add(cylinder(0.08 * scale, h, 'fungus', 'fungus-stem', [px, h / 2, pz], 8));
    const cap = sphere(0.2 * scale, 'fungusGlow', 'fungus-cap', [px, h, pz], [1.25, 0.45, 1.25], {
      emissive: RESIDENTIAL_COLORS.fungusGlow, emissiveIntensity: 0.35
    });
    cap.userData = { animation: 'fungus-pulse', phase: i * 0.7 + x };
    cluster.add(cap);
  }
  return cluster;
}

export function rubblePile(name, x, z, count = 14, mat = 'stoneDark') {
  const rubble = group(name);
  rubble.position.set(x, 0, z);
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.17;
    const radius = 0.3 + (i % 5) * 0.25;
    const block = box(0.35 + (i % 3) * 0.18, 0.18 + (i % 4) * 0.1, 0.3 + ((i + 1) % 3) * 0.17, mat, 'rubble-block', [Math.cos(angle) * radius, 0.15 + (i % 3) * 0.08, Math.sin(angle) * radius]);
    block.rotation.set((i % 4) * 0.13, angle, (i % 5) * 0.1);
    rubble.add(block);
  }
  return rubble;
}
