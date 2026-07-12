import { THREE } from './ThreeScene.js';

export const OSSUARY_COLORS = Object.freeze({
  bone: 0xc6bea5,
  oldBone: 0x8f8771,
  marrow: 0x6b3c43,
  stone: 0x4c494b,
  stoneDark: 0x27262a,
  ash: 0x5b5757,
  iron: 0x494b50,
  brass: 0x9b773f,
  wax: 0xd0c39b,
  parchment: 0xc9b889,
  choirRed: 0x6f2636,
  graveBlue: 0x536f86,
  deathGreen: 0x6b8c74,
  void: 0x17161b,
  holy: 0x9fc8d4,
  blood: 0x6d1f28,
  ghost: 0xa7c8bf
});

export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: OSSUARY_COLORS[name] ?? OSSUARY_COLORS.stone,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.04,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide
  });
}

export function box(width, height, depth, materialName, name, position = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  return mesh;
}

export function cylinder(radius, height, materialName, name, position = [0, 0, 0], segments = 14, rotation = null, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
}

export function sphere(radius, materialName, name, position = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

export function cone(radius, height, materialName, name, position = [0, 0, 0], segments = 10, options = {}) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  return mesh;
}

export function torus(radius, tube, materialName, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 28), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export function plane(width, height, materialName, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material(materialName, { ...options, side: THREE.DoubleSide }));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export function beam(start, end, radius, materialName, name, options = {}) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material(materialName, options));
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

export function ossuaryFloor(width, depth, variant = 'stone') {
  const root = group('ossuary-floor');
  root.add(box(width, 0.3, depth, variant, 'ossuary-floor-slab', [0, -0.15, 0]));
  for (let x = -width / 2 + 1.4; x < width / 2; x += 2.8) root.add(box(0.045, 0.035, depth * 0.96, 'stoneDark', 'floor-joint', [x, 0.02, 0]));
  for (let z = -depth / 2 + 1.4; z < depth / 2; z += 2.8) root.add(box(width * 0.96, 0.035, 0.045, 'stoneDark', 'floor-joint', [0, 0.02, z]));
  return root;
}

export function candle(x, y, z, lit = true, scale = 1) {
  const root = group('funeral-candle');
  root.add(cylinder(0.07 * scale, 0.5 * scale, 'wax', 'candle-wax', [x, y, z], 10));
  if (lit) {
    const flame = sphere(0.12 * scale, 'ghost', 'corpse-flame', [x, y + 0.36 * scale, z], [0.7, 1.4, 0.7], {
      emissive: OSSUARY_COLORS.ghost,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9
    });
    flame.userData = { animation: 'corpse-flame', phase: x * 1.3 + z * 0.7 };
    root.add(flame);
  }
  return root;
}

export function boneColumn(x, z, height = 4.8) {
  const root = group('bone-column');
  root.position.set(x, 0, z);
  root.add(cylinder(0.62, height, 'oldBone', 'vertebra-column', [0, height / 2, 0], 12));
  for (let y = 0.4; y < height; y += 0.48) root.add(torus(0.68, 0.11, 'bone', 'vertebra-ring', [0, y, 0], [Math.PI / 2, 0, 0]));
  return root;
}

export function skullNiche(x, y, z, facing = 0) {
  const root = group('skull-niche');
  root.position.set(x, y, z);
  root.rotation.y = facing;
  root.add(box(1.05, 0.92, 0.42, 'stoneDark', 'niche-shadow'));
  root.add(sphere(0.31, 'bone', 'catalogued-skull', [0, 0.04, 0.25], [1, 0.88, 0.92]));
  root.add(box(0.12, 0.08, 0.05, 'void', 'left-eye-socket', [-0.12, 0.1, 0.52]));
  root.add(box(0.12, 0.08, 0.05, 'void', 'right-eye-socket', [0.12, 0.1, 0.52]));
  return root;
}

export function bonePile(name, x, z, count = 18) {
  const root = group(name);
  root.position.set(x, 0, z);
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.17;
    const radius = 0.25 + (i % 5) * 0.24;
    const bone = cylinder(0.055 + (i % 2) * 0.025, 0.7 + (i % 4) * 0.18, i % 4 === 0 ? 'marrow' : 'bone', 'loose-bone', [Math.cos(angle) * radius, 0.16 + (i % 3) * 0.08, Math.sin(angle) * radius], 7, [Math.PI / 2, angle, 0]);
    root.add(bone);
  }
  return root;
}

export function soulMist(name, x, y, z, count = 8, scale = 1) {
  const root = group(name);
  for (let i = 0; i < count; i += 1) {
    const mist = sphere((0.12 + (i % 3) * 0.05) * scale, 'ghost', 'soul-mote', [x + Math.sin(i * 2.1) * 0.8, y + (i % 4) * 0.45, z + Math.cos(i * 1.7) * 0.8], [1, 1.6, 1], {
      transparent: true,
      opacity: 0.36,
      emissive: OSSUARY_COLORS.ghost,
      emissiveIntensity: 0.8
    });
    mist.userData = { animation: 'soul-rise', phase: i * 0.71 };
    root.add(mist);
  }
  return root;
}

export function traversalLane(name, width, depth, position = [0, 0.025, 0]) {
  return box(width, 0.035, depth, 'holy', name, position, { transparent: true, opacity: 0.045 });
}
