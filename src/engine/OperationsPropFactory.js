import { THREE } from './ThreeScene.js';

export class OperationsPropFactory {
  constructor() { this.materials = new Map(); }

  create(activity) {
    if (activity?.source !== 'operations') return null;
    const group = new THREE.Group();
    group.name = `operations-prop:${activity.prop ?? activity.type}`;
    if (activity.prop === 'cargo-unloading') this.addCargoUnload(group);
    else if (activity.prop === 'materials-stack') this.addMaterialStack(group);
    else if (activity.prop === 'worksite-tools') this.addWorksiteTools(group);
    else return null;
    return group;
  }

  addCargoUnload(group) {
    const wood = this.mat('cargo-wood', 0x6c4b31, { roughness: 0.94 });
    const iron = this.mat('cargo-iron', 0x777f82, { roughness: 0.5, metalness: 0.28 });
    const cloth = this.mat('cargo-cloth', 0x806448, { roughness: 0.92 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.44), wood);
    crate.name = 'operation-crate';
    crate.position.set(0.22, 0.22, 0.3);
    for (const z of [-0.16, 0.16]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.045, 0.05), iron);
      band.position.set(0.22, 0.22, 0.3 + z);
      group.add(band);
    }
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), cloth);
    sack.name = 'operation-sack';
    sack.scale.set(0.78, 1.08, 0.72);
    sack.position.set(-0.28, 0.24, 0.18);
    group.add(crate, sack);
  }

  addMaterialStack(group) {
    const wood = this.mat('material-wood', 0x755139, { roughness: 0.96 });
    const rope = this.mat('material-rope', 0xb09767, { roughness: 1 });
    for (let index = 0; index < 4; index += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.14), wood);
      plank.name = `operation-plank-${index}`;
      plank.position.set((index % 2) * 0.08 - 0.04, 0.08 + index * 0.075, 0.34);
      plank.rotation.y = (index % 2 ? 1 : -1) * 0.045;
      group.add(plank);
    }
    for (const x of [-0.2, 0.2]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 5, 12), rope);
      tie.rotation.x = Math.PI / 2;
      tie.position.set(x, 0.22, 0.34);
      group.add(tie);
    }
  }

  addWorksiteTools(group) {
    const wood = this.mat('tool-wood', 0x65452f, { roughness: 0.95 });
    const iron = this.mat('tool-iron', 0x858d90, { roughness: 0.44, metalness: 0.34 });
    const hammer = new THREE.Group();
    hammer.name = 'operation-hammer';
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.48, 7), wood);
    handle.rotation.z = 0.34;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.09), iron);
    head.position.set(-0.08, 0.22, 0);
    head.rotation.z = 0.34;
    hammer.position.set(0.18, 0.58, 0.18);
    hammer.add(handle, head);
    const trestle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.18), wood);
    trestle.name = 'operation-workpiece';
    trestle.position.set(0, 0.2, 0.4);
    trestle.rotation.y = -0.12;
    group.add(hammer, trestle);
  }

  animate(root, activity, time) {
    if (!root || activity?.source !== 'operations') return;
    const phase = time * 4.6 + hash01(activity.id) * Math.PI * 2;
    const crate = root.getObjectByName('operation-crate');
    if (crate) crate.rotation.y = Math.sin(phase * 0.32) * 0.025;
    const sack = root.getObjectByName('operation-sack');
    if (sack) sack.scale.y = 1.08 + Math.sin(phase * 0.45) * 0.025;
    const hammer = root.getObjectByName('operation-hammer');
    if (hammer) hammer.rotation.z = -0.12 - Math.max(0, Math.sin(phase)) * 0.9;
    root.traverse(child => {
      if (child.name.startsWith('operation-plank-')) child.position.y += Math.sin(phase * 0.22 + child.id) * 0.0008;
    });
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0) / 0xffffffff;
}
