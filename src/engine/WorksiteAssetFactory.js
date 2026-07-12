import { THREE } from './ThreeScene.js';

export class WorksiteAssetFactory {
  createScaffold(prop) {
    const group = new THREE.Group();
    group.name = `worksite-scaffold:${prop.id}`;
    group.userData.structureType = prop.type;

    const timber = this.mat(0x67462f, { roughness: 0.96 });
    const lightTimber = this.mat(0x8a6742, { roughness: 0.94 });
    const rope = this.mat(0xb49a68, { roughness: 1 });
    const iron = this.mat(0x747c7f, { roughness: 0.48, metalness: 0.3 });
    const cloth = this.mat(0xb89b63, { roughness: 0.92 });

    for (const x of [-0.78, 0.78]) for (const z of [-0.62, 0.62]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.65, 7), timber);
      post.name = 'worksite-post';
      post.position.set(x, 0.84, z);
      group.add(post);
    }

    for (const z of [-0.62, 0.62]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.08), lightTimber);
      rail.name = 'worksite-rail';
      rail.position.set(0, 1.2, z);
      group.add(rail);
    }

    for (const x of [-0.78, 0.78]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.32), lightTimber);
      rail.name = 'worksite-rail';
      rail.position.set(x, 1.2, 0);
      group.add(rail);
    }

    for (const side of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.85, 6), timber);
      brace.name = 'worksite-brace';
      brace.rotation.z = side * 0.72;
      brace.position.set(side * 0.36, 0.78, 0.65);
      group.add(brace);
    }

    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 0.72), lightTimber);
    platform.name = 'worksite-platform';
    platform.position.set(0, 0.76, -0.38);
    group.add(platform);

    for (let index = 0; index < 5; index += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.14), lightTimber);
      plank.name = 'worksite-material';
      plank.position.set(-0.78 + (index % 2) * 0.08, 0.08 + index * 0.065, 0.92);
      plank.rotation.y = (index % 2 ? 1 : -1) * 0.05;
      group.add(plank);
    }

    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 7, 16), iron);
    pulley.name = 'worksite-pulley';
    pulley.rotation.y = Math.PI / 2;
    pulley.position.set(0.64, 1.48, -0.58);
    group.add(pulley);

    const ropeLine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.08, 5), rope);
    ropeLine.name = 'worksite-rope';
    ropeLine.position.set(0.64, 0.92, -0.58);
    group.add(ropeLine);

    const load = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.3), timber);
    load.name = 'worksite-lift-load';
    load.position.set(0.64, 0.38, -0.58);
    group.add(load);

    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.025), cloth);
    pennant.name = 'worksite-pennant';
    pennant.position.set(-0.55, 1.58, 0.62);
    group.add(pennant);

    return group;
  }

  animateScaffold(root, prop, time) {
    const progress = clamp(prop.buildProgress ?? 0, 0, 1);
    const lift = root.getObjectByName('worksite-lift-load');
    if (lift) lift.position.y = 0.28 + progress * 0.78 + Math.sin(time * 2.3 + hash01(prop.id) * 5) * 0.025;
    const pulley = root.getObjectByName('worksite-pulley');
    if (pulley) pulley.rotation.x = time * 1.8;
    const pennant = root.getObjectByName('worksite-pennant');
    if (pennant) pennant.rotation.y = Math.sin(time * 2 + hash01(prop.id) * 7) * 0.08;
    root.traverse(child => {
      if (child.name === 'worksite-material') child.visible = progress < 0.82;
      if (child.name === 'worksite-platform') child.scale.x = 0.35 + progress * 0.65;
    });
  }

  mat(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.8,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1
    });
  }
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0) / 0xffffffff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
