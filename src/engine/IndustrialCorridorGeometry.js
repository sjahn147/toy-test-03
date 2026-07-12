import { THREE } from './ThreeScene.js';

export const INDUSTRIAL_COLORS = Object.freeze({
  iron: 0x4b4f54, ironDark: 0x282b2f, rust: 0x874a2f, brass: 0xb98a42,
  copper: 0x9f663c, wood: 0x65452f, stone: 0x4c4945, stoneDark: 0x2f2e2d,
  oil: 0x191a1d, canvas: 0x9f936f, ember: 0xff7d3c, flame: 0xffc45d,
  powder: 0x333237, warning: 0xa83f35, blue: 0x4b7688, green: 0x5d8053, white: 0xc9c4b5
});

export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: INDUSTRIAL_COLORS[name] ?? INDUSTRIAL_COLORS.iron,
    roughness: options.roughness ?? 0.74,
    metalness: options.metalness ?? 0.08,
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

export function industrialFloor(width, depth) {
  const root = group('industrial-floor');
  root.add(box(width, 0.3, depth, 'stone', 'floor-slab', [0, -0.15, 0]));
  for (let x = -width / 2 + 1.5; x < width / 2; x += 3) root.add(box(0.06, 0.04, depth * 0.96, 'stoneDark', 'floor-joint', [x, 0.02, 0]));
  for (let z = -depth / 2 + 1.5; z < depth / 2; z += 3) root.add(box(width * 0.96, 0.04, 0.06, 'stoneDark', 'floor-joint', [0, 0.02, z]));
  return root;
}

export function industrialFlame(x, y, z, scale = 1) {
  const root = group('industrial-flame');
  root.position.set(x, y, z);
  const flame = sphere(0.24 * scale, 'flame', 'flame-core', [0, 0.35 * scale, 0], [0.75, 1.6, 0.75], {
    emissive: INDUSTRIAL_COLORS.flame,
    emissiveIntensity: 1.6
  });
  flame.userData = { animation: 'flame-flicker', phase: x + z };
  root.add(flame);
  return root;
}

export function gear(radius, toothSize, materialName, name, position) {
  const root = group(name);
  root.position.set(...position);
  root.add(cylinder(radius, 0.24, materialName, 'gear-wheel', [0, 0, 0], 18, [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const tooth = box(toothSize, 0.28, toothSize * 1.5, materialName, 'gear-tooth', [Math.cos(angle) * (radius + 0.15), Math.sin(angle) * (radius + 0.15), 0]);
    tooth.rotation.z = angle;
    root.add(tooth);
  }
  root.userData = { animation: 'gear-turn', phase: radius };
  return root;
}

export function powderBarrel(x, z, name = 'powder-barrel') {
  const root = group(name);
  root.position.set(x, 0, z);
  root.add(cylinder(0.48, 1.25, 'wood', `${name}-body`, [0, 0.63, 0], 14));
  for (const y of [0.15, 0.63, 1.1]) root.add(cylinder(0.51, 0.08, 'iron', `${name}-hoop`, [0, y, 0], 14));
  return root;
}

export function traversalLane(name, width, depth, position = [0, 0.025, 0]) {
  return box(width, 0.035, depth, 'white', name, position, { transparent: true, opacity: 0.08 });
}

export function hoistChain(start, end) {
  const root = group('hoist-chain');
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    root.add(cylinder(0.06, 0.28, 'iron', 'chain-link', [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t], 8, [Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0]));
  }
  return root;
}
