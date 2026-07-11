import { THREE } from './ThreeScene.js';

export class ProjectileAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  create(projectile) {
    if (projectile.type === 'arrow') return this.makeArrow();
    if (projectile.type === 'magic') return this.makeMagicBolt();
    if (projectile.type === 'heal') return this.makeHealingBolt();
    if (projectile.type === 'web') return this.makeWebShot();
    return new THREE.Group();
  }

  makeArrow() {
    const group = new THREE.Group();
    const wood = this.mat('arrow-wood', 0x765033, { roughness: 0.82 });
    const metal = this.mat('arrow-metal', 0xc2cbd1, { metalness: 0.38, roughness: 0.3 });
    const feather = this.mat('arrow-feather', 0xb94e43, { roughness: 0.74 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 7), wood);
    shaft.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), metal);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.64;
    group.add(shaft, head);
    for (const side of [-1, 1]) {
      const fletching = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.28), feather);
      fletching.position.set(side * 0.055, 0, -0.48);
      fletching.rotation.z = side * 0.28;
      group.add(fletching);
    }
    return group;
  }

  makeMagicBolt() {
    const group = new THREE.Group();
    const coreMat = this.mat('magic-core', 0x83cfff, { emissive: 0x2b78a8, transparent: true, opacity: 0.92 });
    const ringMat = this.mat('magic-ring', 0xbda5ff, { emissive: 0x513693, transparent: true, opacity: 0.76 });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), coreMat);
    group.add(core);
    for (const angle of [0, Math.PI / 2]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.022, 6, 22), ringMat);
      ring.rotation.x = angle;
      group.add(ring);
    }
    for (let i = 0; i < 3; i += 1) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), coreMat);
      mote.position.set((i - 1) * 0.12, 0, -0.24 - i * 0.12);
      group.add(mote);
    }
    return group;
  }

  makeHealingBolt() {
    const group = new THREE.Group();
    const green = this.mat('heal-core', 0x9ee0a3, { emissive: 0x2f6b38, transparent: true, opacity: 0.9 });
    const gold = this.mat('heal-gold', 0xf1d77f, { emissive: 0x71530e, transparent: true, opacity: 0.84 });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), green));
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), gold);
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), gold);
    group.add(vertical, horizontal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 20), green);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return group;
  }

  makeWebShot() {
    const group = new THREE.Group();
    const silk = this.mat('web-silk', 0xdce8ed, { emissive: 0x52646c, transparent: true, opacity: 0.74 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), silk);
    group.add(core);
    for (let i = 0; i < 6; i += 1) {
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), silk);
      thread.rotation.z = Math.PI / 2;
      thread.rotation.y = i * Math.PI / 3;
      thread.position.set(Math.cos(i * Math.PI / 3) * 0.12, 0, Math.sin(i * Math.PI / 3) * 0.12);
      group.add(thread);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 5, 18), silk);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return group;
  }

  mat(key, color, options = {}) {
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.75 : 0
    });
    this.materials.set(key, material);
    return material;
  }
}
