import { THREE } from './ThreeScene.js';

const RESOURCE_COLORS = {
  food: 0xb8874d,
  meat: 0x9c4f49,
  water: 0x5fa9d7,
  scrap: 0x7c8188,
  bones: 0xd7cfb6,
  biomass: 0x68b68a,
  deathEnergy: 0x9b7ad1
};

export class LogisticsAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  createCargo(cargo) {
    const group = new THREE.Group();
    group.name = `cargo:${cargo.id}`;
    const resource = cargo.resourceType ?? 'scrap';
    const color = RESOURCE_COLORS[resource] ?? 0xa58f6d;
    const wood = this.mat('cargo-wood', 0x5c402e, 0.92);
    const dark = this.mat('cargo-dark', 0x302824, 0.96);
    const metal = this.mat('cargo-metal', 0x777d85, 0.48, 0.35);
    const primary = this.mat(`cargo-${resource}`, color, 0.72, resource === 'deathEnergy' ? 0.08 : 0);

    if (resource === 'water') this.addWaterBarrel(group, wood, metal, primary);
    else if (resource === 'bones') this.addBoneBundle(group, primary, dark);
    else if (resource === 'deathEnergy' || resource === 'biomass') this.addArcaneVessel(group, metal, primary, color);
    else if (resource === 'food' || resource === 'meat') this.addProvisionCrate(group, wood, dark, primary, resource === 'meat');
    else this.addScrapCrate(group, wood, metal, primary);

    const strapA = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 18, Math.PI), dark);
    strapA.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    strapA.position.y = 0.36;
    const strapB = strapA.clone();
    strapB.rotation.z = 0;
    group.add(strapA, strapB);
    return group;
  }

  addProvisionCrate(group, wood, dark, primary, meat) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.56), wood);
    box.position.y = 0.26;
    group.add(box);
    for (const x of [-0.3, 0.3]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.6), dark);
      brace.position.set(x, 0.26, 0);
      group.add(brace);
    }
    for (let i = 0; i < 4; i += 1) {
      const item = new THREE.Mesh(meat ? new THREE.CapsuleGeometry(0.075, 0.22, 4, 7) : new THREE.SphereGeometry(0.095, 8, 6), primary);
      item.position.set(-0.23 + i * 0.15, 0.57 + (i % 2) * 0.04, (i % 2 ? 1 : -1) * 0.11);
      item.rotation.z = meat ? Math.PI / 2 : 0;
      group.add(item);
    }
  }

  addWaterBarrel(group, wood, metal, water) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.62, 12), wood);
    barrel.position.y = 0.34;
    group.add(barrel);
    for (const y of [0.1, 0.34, 0.58]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 18), metal);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      group.add(band);
    }
    const surface = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 16), water);
    surface.position.y = 0.66;
    group.add(surface);
  }

  addBoneBundle(group, bone, dark) {
    for (let i = 0; i < 6; i += 1) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.58, 6), bone);
      shaft.position.set((i % 3 - 1) * 0.12, 0.28 + Math.floor(i / 3) * 0.09, (i % 2 ? 1 : -1) * 0.1);
      shaft.rotation.z = Math.PI / 2 + (i - 3) * 0.06;
      group.add(shaft);
    }
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 18), dark);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.31;
    group.add(cord);
  }

  addArcaneVessel(group, metal, fluid, color) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.16, 10), metal);
    base.position.y = 0.08;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.48, 12), fluid);
    jar.position.y = 0.38;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.18, 10), metal);
    neck.position.y = 0.69;
    group.add(base, jar, neck);
    for (let i = 0; i < 5; i += 1) {
      const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + i * 0.006, 0), this.mat(`cargo-glow-${color}`, color, 0.25, 0));
      mote.name = 'cargo-mote';
      mote.position.set(Math.cos(i * 2.1) * 0.12, 0.28 + i * 0.08, Math.sin(i * 2.1) * 0.12);
      group.add(mote);
    }
  }

  addScrapCrate(group, wood, metal, scrap) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.54), wood);
    base.position.y = 0.12;
    group.add(base);
    for (let i = 0; i < 7; i += 1) {
      const part = new THREE.Mesh(i % 2 ? new THREE.BoxGeometry(0.08, 0.08, 0.46) : new THREE.CylinderGeometry(0.045, 0.055, 0.5, 7), i % 3 === 0 ? scrap : metal);
      part.position.set((i % 3 - 1) * 0.16, 0.28 + (i % 2) * 0.11, (i % 2 ? 1 : -1) * 0.12);
      part.rotation.set(i * 0.17, i * 0.41, Math.PI / 2 + i * 0.09);
      group.add(part);
    }
  }

  mat(key, color, roughness, metalness = 0) {
    const cacheKey = `${key}:${color}:${roughness}:${metalness}`;
    if (!this.materials.has(cacheKey)) {
      this.materials.set(cacheKey, new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive: key.includes('glow') || key.includes('deathEnergy') ? color : 0x000000,
        emissiveIntensity: key.includes('glow') ? 0.55 : 0
      }));
    }
    return this.materials.get(cacheKey);
  }
}