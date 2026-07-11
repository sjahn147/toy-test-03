import { THREE } from './ThreeScene.js';

export const SPIDER_COLORS = Object.freeze({
  stone: 0x272633, edge: 0x514c5e, silk: 0xd8d3cc, shadow: 0x8c8695,
  burned: 0x353039, chitin: 0x3b1d35, chitin2: 0x7d315e,
  venom: 0x77dca2, ember: 0xff8d46, fire: 0xffc46b,
  rope: 0x765943, wood: 0x674937, iron: 0x58545d,
  royal: 0xb1374d, gold: 0xd8b15e, egg: 0xe6ddd1,
  vein: 0xb7678c, blood: 0x7a2335, void: 0x08070d,
  parchment: 0xcdbd91
});

export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: SPIDER_COLORS[name] ?? SPIDER_COLORS.stone,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.03,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide
  });
}

export function box(w, h, d, mat, name, position = [0, 0, 0]) {
  const node = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(mat));
  node.name = name;
  node.position.set(...position);
  return node;
}

export function cylinder(r, h, mat, name, position = [0, 0, 0], segments = 16, rotation = null) {
  const node = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material(mat));
  node.name = name;
  node.position.set(...position);
  if (rotation) node.rotation.set(...rotation);
  return node;
}

export function sphere(r, mat, name, position = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const node = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), material(mat, options));
  node.name = name;
  node.position.set(...position);
  node.scale.set(...scale);
  return node;
}

export function torus(r, tube, mat, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const node = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 32), material(mat));
  node.name = name;
  node.position.set(...position);
  node.rotation.set(...rotation);
  return node;
}

export function beam(start, end, radius, mat, name) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const node = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material(mat));
  node.name = name;
  node.position.copy(a).add(b).multiplyScalar(0.5);
  node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return node;
}

export function stoneFloor(width, depth) {
  return box(width, 0.35, depth, 'stone', 'stone-floor', [0, -0.18, 0]);
}

export function webDisk(x, z, radius, mat = 'silk') {
  const node = group('sticky-web');
  node.position.set(x, 0.09, z);
  for (let ring = 1; ring <= 3; ring += 1) {
    node.add(torus(radius * ring / 3, 0.025, mat, 'sticky-web-ring', [0, 0, 0], [Math.PI / 2, 0, 0]));
  }
  for (let i = 0; i < 10; i += 1) {
    const angle = i * Math.PI * 2 / 10;
    node.add(beam([0, 0, 0], [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], 0.025, mat, 'sticky-web-spoke'));
  }
  return node;
}

export function cocoon(x, y, z, scale = 1) {
  const node = group('hanging-cocoon');
  node.position.set(x, y, z);
  node.add(
    beam([0, 1.8, 0], [0, 0.8, 0], 0.045, 'shadow', 'cocoon-tether'),
    sphere(0.55 * scale, 'silk', 'silk-cocoon-shell', [0, 0, 0], [0.82, 1.65, 0.82])
  );
  node.userData.animation = 'silk-sway';
  return node;
}

export function spider(scale = 1, queen = false) {
  const node = group(queen ? 'spider-queen' : 'spider');
  node.add(
    sphere(0.72 * scale, queen ? 'chitin2' : 'chitin', queen ? 'queen-abdomen' : 'spider-abdomen', [0, 0.34 * scale, 0.65 * scale], [1.2, 0.86, queen ? 1.55 : 1.25]),
    sphere(0.46 * scale, 'chitin', 'spider-thorax', [0, 0.3 * scale, -0.35 * scale], [1, 0.85, 1]),
    sphere(0.3 * scale, 'chitin2', 'spider-head', [0, 0.34 * scale, -0.85 * scale], [1, 0.8, 0.75])
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      const z = -0.55 + i * 0.38;
      const hip = [side * 0.32 * scale, 0.32 * scale, z * scale];
      const knee = [side * (0.9 + i * 0.11) * scale, (0.7 + (i % 2) * 0.22) * scale, (z + (i - 1.5) * 0.28) * scale];
      const foot = [side * (1.45 + i * 0.15) * scale, 0, (z + (i - 1.5) * 0.55) * scale];
      node.add(
        beam(hip, knee, 0.09 * scale, queen ? 'chitin2' : 'chitin', queen ? 'queen-leg-upper' : 'spider-leg-upper'),
        beam(knee, foot, 0.065 * scale, 'chitin', queen ? 'queen-leg-lower' : 'spider-leg-lower')
      );
    }
  }
  return node;
}

export function flame() {
  const node = group('landmark-flame');
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.2, 7), material('ember', { emissive: SPIDER_COLORS.ember, emissiveIntensity: 1.2, opacity: 0.78, transparent: true }));
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.72, 6), material('fire', { emissive: SPIDER_COLORS.fire, emissiveIntensity: 1.7 }));
  outer.position.y = 0.6;
  inner.position.y = 0.42;
  node.add(outer, inner);
  node.userData.animation = 'flame-flicker';
  return node;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
