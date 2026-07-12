import { THREE } from './ThreeScene.js';

// Zone A — Gate & Waystation palette, keyed by semantic material name.
// Rain-wet slate flagstone, brass expedition lanterns, red banners, drifting fog.
export const WAYSTATION_COLORS = Object.freeze({
  stone: 0x3a4048, stoneLight: 0x565d66, stoneDark: 0x272c33, edge: 0x6b727c,
  flag: 0x8f3f3f, flagWorn: 0x5f3a3a, canvas: 0xc7bb98, canvasDark: 0x9a8f6f,
  brass: 0xc79a4a, brassDark: 0x846327, lamp: 0xffcf82, lampDead: 0x2c2a26,
  wood: 0x6b4a30, woodDark: 0x45301e, iron: 0x4b4c52, ironDark: 0x2f3035,
  rope: 0xb08a5a, water: 0x3a6d78, waterFoam: 0x9fc6ca, mist: 0xb7c0c8,
  parchment: 0xd8c79a, gold: 0xd8b15e, rune: 0x63b7d6, moss: 0x4a5c3a,
  royal: 0x6a3d7a, sand: 0x8f8672, blood: 0x5a2530, ember: 0xff8d46,
  fire: 0xffc46b, marble: 0xd7d2c4, shadow: 0x24282e, rust: 0x7a4a2e
});

export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: WAYSTATION_COLORS[name] ?? WAYSTATION_COLORS.stone,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.04,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide
  });
}

export function box(w, h, d, mat, name, position = [0, 0, 0], options = {}) {
  const node = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(mat, options));
  node.name = name;
  node.position.set(...position);
  return node;
}

export function cylinder(r, h, mat, name, position = [0, 0, 0], segments = 16, rotation = null, options = {}) {
  const node = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material(mat, options));
  node.name = name;
  node.position.set(...position);
  if (rotation) node.rotation.set(...rotation);
  return node;
}

export function cone(r, h, mat, name, position = [0, 0, 0], segments = 12, options = {}) {
  const node = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material(mat, options));
  node.name = name;
  node.position.set(...position);
  return node;
}

export function sphere(r, mat, name, position = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const node = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), material(mat, options));
  node.name = name;
  node.position.set(...position);
  node.scale.set(...scale);
  return node;
}

export function torus(r, tube, mat, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const node = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28), material(mat, options));
  node.name = name;
  node.position.set(...position);
  node.rotation.set(...rotation);
  return node;
}

export function beam(start, end, radius, mat, name, options = {}) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const node = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material(mat, options));
  node.name = name;
  node.position.copy(a).add(b).multiplyScalar(0.5);
  node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return node;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Wet flagstone plaza floor with subtle raised seams.
export function flagstoneFloor(width, depth, mat = 'stone') {
  const node = group('flagstone-floor');
  node.add(box(width, 0.35, depth, mat, 'flagstone-slab', [0, -0.18, 0]));
  const cols = Math.max(2, Math.round(width / 3));
  const rows = Math.max(2, Math.round(depth / 3));
  for (let i = 1; i < cols; i += 1) {
    node.add(box(0.08, 0.05, depth * 0.96, 'stoneDark', 'flagstone-seam', [-width / 2 + i * (width / cols), 0.01, 0]));
  }
  for (let j = 1; j < rows; j += 1) {
    node.add(box(width * 0.96, 0.05, 0.08, 'stoneDark', 'flagstone-seam', [0, 0.01, -depth / 2 + j * (depth / rows)]));
  }
  return node;
}

// Articulated brass expedition lantern: post -> swing arm -> caged glowing core.
export function brassLantern(x, y, z, scale = 1, lit = true) {
  const node = group('brass-lantern');
  node.position.set(x, 0, z);
  const postTop = y;
  node.add(
    cylinder(0.12 * scale, postTop, 'brassDark', 'lantern-post', [0, postTop / 2, 0], 10),
    box(0.5 * scale, 0.14 * scale, 0.5 * scale, 'stoneDark', 'lantern-post-base', [0, 0.07, 0]),
    beam([0, postTop, 0], [0.7 * scale, postTop + 0.35 * scale, 0], 0.05 * scale, 'brass', 'lantern-arm'),
    beam([0.7 * scale, postTop + 0.35 * scale, 0], [0.7 * scale, postTop - 0.05 * scale, 0], 0.035 * scale, 'brass', 'lantern-hanger')
  );
  const cage = group('lantern-cage');
  cage.position.set(0.7 * scale, postTop - 0.45 * scale, 0);
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2;
    cage.add(beam([Math.cos(a) * 0.22 * scale, 0.32 * scale, Math.sin(a) * 0.22 * scale], [Math.cos(a) * 0.22 * scale, -0.32 * scale, Math.sin(a) * 0.22 * scale], 0.02 * scale, 'brass', 'lantern-cage-rib'));
  }
  cage.add(cone(0.34 * scale, 0.34 * scale, 'brassDark', 'lantern-cap', [0, 0.5 * scale, 0], 8));
  const core = sphere(0.2 * scale, lit ? 'lamp' : 'lampDead', 'lantern-core', [0, 0, 0], [1, 1.2, 1], {
    emissive: lit ? WAYSTATION_COLORS.lamp : 0,
    emissiveIntensity: lit ? 1.1 : 0
  });
  if (lit) core.userData = { animation: 'lantern-flicker', phase: (x * 2.7 + z * 1.9) };
  cage.add(core);
  node.add(cage);
  return node;
}

// Expedition banner: pole + waving cloth with a stitched insignia bar.
export function expeditionBanner(x, y, z, height = 3.2, color = 'flag') {
  const node = group('expedition-banner');
  node.position.set(x, 0, z);
  node.add(cylinder(0.09, height, 'woodDark', 'banner-pole', [0, height / 2, 0], 8));
  const cloth = box(1.4, 2.0, 0.06, color, 'banner-cloth', [0.75, height - 1.2, 0]);
  cloth.userData = { animation: 'banner-wave', phase: x * 1.3 + z * 0.7 };
  node.add(cloth);
  node.add(box(1.4, 0.24, 0.08, 'gold', 'banner-insignia', [0.75, height - 0.55, 0.01]));
  node.add(cone(0.16, 0.4, 'gold', 'banner-finial', [0, height + 0.2, 0], 8));
  return node;
}

// A single crate with plank framing; optional stencilled number face.
export function crate(x, y, z, w, h, d, mat = 'wood', name = 'supply-crate') {
  const node = group(name);
  node.position.set(x, y, z);
  node.add(box(w, h, d, mat, `${name}-body`, [0, 0, 0]));
  node.add(
    box(w * 1.02, 0.06, 0.06, 'woodDark', `${name}-edge`, [0, h / 2 - 0.05, d / 2 - 0.05]),
    box(w * 1.02, 0.06, 0.06, 'woodDark', `${name}-edge`, [0, -h / 2 + 0.05, d / 2 - 0.05]),
    box(0.06, h, 0.06, 'woodDark', `${name}-edge`, [w / 2 - 0.05, 0, d / 2 - 0.05]),
    box(0.06, h, 0.06, 'woodDark', `${name}-edge`, [-w / 2 + 0.05, 0, d / 2 - 0.05])
  );
  return node;
}

// A sagging ration/grain sack.
export function sack(x, y, z, scale = 1, mat = 'canvas') {
  const node = sphere(0.42 * scale, mat, 'ration-sack-body', [x, y, z], [0.9, 1.2, 0.9]);
  return node;
}

// Half-round voussoir arch built from wedge blocks over a span.
export function voussoirArch(span, rise, mat, name, thickness = 0.9, blocks = 11) {
  const node = group(name);
  const radius = span / 2;
  for (let i = 0; i < blocks; i += 1) {
    const t = (i + 0.5) / blocks;
    const angle = Math.PI * t;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * (radius + (rise - radius));
    const wedge = box(span / blocks * 1.12, 1.0, thickness, i % 2 ? 'stone' : 'stoneLight', 'voussoir', [cx, cy, 0]);
    wedge.rotation.z = angle - Math.PI / 2;
    node.add(wedge);
  }
  // keystone
  node.add(box(span / blocks * 1.3, 1.35, thickness * 1.1, 'stoneLight', 'arch-keystone', [0, rise + 0.15, 0]));
  return node;
}

// Drifting fog motes (each carries a mist-drift orbit tag).
export function mistBank(name, count, spread, y = 0.6) {
  const node = group(name);
  for (let i = 0; i < count; i += 1) {
    const angle = i * Math.PI * 2 / count;
    const radius = spread * (0.4 + (i % 5) * 0.14);
    const mote = sphere(0.55 + (i % 3) * 0.22, 'mist', 'mist-mote', [Math.cos(angle) * radius, y + (i % 4) * 0.3, Math.sin(angle) * radius], [1.4, 0.5, 1.4], {
      opacity: 0.16 + (i % 3) * 0.04, transparent: true
    });
    mote.userData = { animation: 'mist-drift', phase: i * 0.4 };
    node.add(mote);
  }
  return node;
}

// Falling brazier ember helper for warning fires.
export function brazierFlame(x, y, z, scale = 1) {
  const node = group('brazier-flame');
  node.position.set(x, y, z);
  const outer = cone(0.34 * scale, 1.15 * scale, 'ember', 'flame-outer', [0, 0.58 * scale, 0], 7, { emissive: WAYSTATION_COLORS.ember, emissiveIntensity: 1.15, opacity: 0.78, transparent: true });
  const inner = cone(0.18 * scale, 0.68 * scale, 'fire', 'flame-inner', [0, 0.42 * scale, 0], 6, { emissive: WAYSTATION_COLORS.fire, emissiveIntensity: 1.7 });
  node.add(outer, inner);
  node.userData = { animation: 'flame-flicker', phase: x + z };
  return node;
}
