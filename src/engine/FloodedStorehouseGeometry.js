import { THREE } from './ThreeScene.js';

export const FLOODED_COLORS = Object.freeze({
  water: 0x286a78, waterLight: 0x64b7bd, deep: 0x153b48, iron: 0x4f575d, rust: 0x925a3d,
  brass: 0xb68b45, wood: 0x6b4d36, rope: 0x90785d, warning: 0xe7b85f, slime: 0x7ca579, ember: 0xff9852
});

export function createFloodedMaterials() {
  const standard = (color, roughness = 0.7, metalness = 0.05, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  return Object.freeze({
    water: standard(FLOODED_COLORS.water, 0.18, 0.06, { transparent: true, opacity: 0.72, depthWrite: false }),
    waterLight: standard(FLOODED_COLORS.waterLight, 0.12, 0.04, { transparent: true, opacity: 0.42, depthWrite: false, emissive: 0x173a40, emissiveIntensity: 0.35 }),
    deep: standard(FLOODED_COLORS.deep, 0.25), iron: standard(FLOODED_COLORS.iron, 0.45, 0.66),
    rust: standard(FLOODED_COLORS.rust, 0.8, 0.28), brass: standard(FLOODED_COLORS.brass, 0.4, 0.62),
    wood: standard(FLOODED_COLORS.wood, 0.88), rope: standard(FLOODED_COLORS.rope, 0.96),
    warning: standard(FLOODED_COLORS.warning, 0.6, 0.25, { emissive: 0x4b2f0d, emissiveIntensity: 0.3 }),
    slime: standard(FLOODED_COLORS.slime, 0.48, 0, { transparent: true, opacity: 0.64 }),
    ember: standard(FLOODED_COLORS.ember, 0.3, 0, { emissive: FLOODED_COLORS.ember, emissiveIntensity: 1.5 })
  });
}

export function box(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.fromArray(position); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent, args, position, material, name = '', rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(...args), material);
  mesh.position.fromArray(position); mesh.rotation.set(...rotation); mesh.name = name; mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function createWaterSurface(parent, width, depth, y, material, name = 'water-surface') {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, 16, 16), material.clone());
  water.rotation.x = -Math.PI / 2; water.position.y = y; water.name = name;
  water.userData.baseY = y; water.userData.waveAmplitude = 0.025; water.userData.waveSpeed = 0.7;
  parent.add(water); return water;
}
export function pipeBetween(parent, start, end, radius, material, name = 'pipe-segment') {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), material);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  mesh.name = name; mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function createValveWheel(parent, position, radius, material, name = 'valve-wheel') {
  const group = new THREE.Group(); group.position.fromArray(position); group.name = name;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 8, 28), material); group.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.65, 0.07, 0.07), material); spoke.rotation.z = i * Math.PI / 4; group.add(spoke);
  }
  cylinder(group, [0.14, 0.14, 0.34, 10], [0, 0, 0], material, 'valve-hub', [Math.PI / 2, 0, 0]);
  parent.add(group); return group;
}
export function createGear(parent, position, radius, teeth, material, name = 'gear-wheel') {
  const group = new THREE.Group(); group.position.fromArray(position); group.name = name;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.24, 20), material); core.rotation.x = Math.PI / 2; group.add(core);
  for (let i = 0; i < teeth; i += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.23, 0.28, radius * 0.11), material);
    const angle = i * Math.PI * 2 / teeth; tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0); tooth.rotation.z = angle; group.add(tooth);
  }
  group.userData.baseRotationZ = group.rotation.z; parent.add(group); return group;
}
export function createChain(parent, start, links, spacing, material, name = 'hanging-chain') {
  const group = new THREE.Group(); group.position.fromArray(start); group.name = name;
  for (let i = 0; i < links; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 14), material); link.position.y = -i * spacing; link.rotation.y = i % 2 ? Math.PI / 2 : 0; group.add(link);
  }
  group.userData.baseRotationZ = 0; parent.add(group); return group;
}
export function createBarrel(parent, position, material, bandMaterial, name = 'floating-barrel') {
  const group = new THREE.Group(); group.position.fromArray(position); group.name = name;
  cylinder(group, [0.42, 0.48, 1.05, 12], [0, 0, 0], material, 'barrel-body', [0, 0, Math.PI / 2]);
  for (const x of [-0.38, 0, 0.38]) cylinder(group, [0.49, 0.49, 0.07, 12], [x, 0, 0], bandMaterial, 'barrel-band', [0, 0, Math.PI / 2]);
  group.userData.baseY = position[1]; parent.add(group); return group;
}
