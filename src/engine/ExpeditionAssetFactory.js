import { THREE } from './ThreeScene.js';

export class ExpeditionAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  createFieldCamp(prop) {
    const group = new THREE.Group();
    group.name = `field-camp:${prop.id}`;
    const wood = this.mat('field-camp-wood', 0x67462f, { roughness: 0.94 });
    const darkWood = this.mat('field-camp-dark-wood', 0x38271f, { roughness: 0.97 });
    const canvas = this.mat('field-camp-canvas', 0x718095, { roughness: 0.9 });
    const blanket = this.mat('field-camp-blanket', 0x486078, { roughness: 0.88 });
    const iron = this.mat('field-camp-iron', 0x8e9698, { roughness: 0.5, metalness: 0.22 });
    const ember = this.mat('field-camp-ember', 0xf08b4c, { roughness: 0.2, emissive: 0x9b3514 });
    const water = this.mat('field-camp-water', 0x6eb7d0, { roughness: 0.18, transparent: true, opacity: 0.78, emissive: 0x18445b });
    const food = this.mat('field-camp-food', 0xa87846, { roughness: 0.86 });
    const gold = this.mat('field-camp-mark', 0xd8bd68, { roughness: 0.4, metalness: 0.12, emissive: 0x49370d });

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.32, 0.07, 12), this.mat('field-camp-ground', 0x50483e, { roughness: 1 }));
    ground.position.y = 0.035;
    ground.scale.z = 0.78;
    group.add(ground);

    const tent = new THREE.Group();
    const tentLeft = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 1.05), canvas);
    tentLeft.rotation.z = 0.63;
    tentLeft.position.set(-0.28, 0.58, -0.22);
    const tentRight = tentLeft.clone();
    tentRight.rotation.z = -0.63;
    tentRight.position.x = 0.28;
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.18, 7), wood);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(0, 0.9, -0.22);
    for (const x of [-0.48, 0.48]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 7), wood);
      pole.position.set(x, 0.48, -0.22);
      tent.add(pole);
    }
    tent.add(tentLeft, tentRight, ridge);
    tent.position.set(-0.34, 0.04, -0.22);
    tent.scale.setScalar(0.88);
    group.add(tent);

    const fire = new THREE.Group();
    for (const rotation of [-0.72, 0.72]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.58, 7), darkWood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rotation;
      log.position.y = 0.12;
      fire.add(log);
    }
    for (let i = 0; i < 7; i += 1) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.095, 0), this.mat('field-camp-stone', 0x777178, { roughness: 0.95 }));
      const angle = i * Math.PI * 2 / 7;
      stone.position.set(Math.cos(angle) * 0.3, 0.08, Math.sin(angle) * 0.3);
      fire.add(stone);
    }
    const flameA = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.46, 7), ember);
    flameA.position.y = 0.34;
    const flameB = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.33, 6), this.mat('field-camp-flame', 0xffcc6b, { emissive: 0xb45a17, roughness: 0.16 }));
    flameB.position.set(0.07, 0.38, 0.02);
    fire.add(flameA, flameB);
    fire.position.set(0.56, 0, 0.22);
    group.add(fire);

    for (const [x, z, r] of [[-0.74, 0.54, -0.2], [-0.16, 0.68, 0.12], [0.46, 0.67, -0.08]]) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.25), wood);
      bed.position.set(x, 0.13, z);
      bed.rotation.y = r;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.22), blanket);
      cloth.position.set(x, 0.21, z);
      cloth.rotation.y = r;
      group.add(bed, cloth);
    }

    const crate = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.4, 0.42), wood);
    crate.add(box);
    for (const y of [-0.16, 0.16]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.46), iron);
      band.position.y = y;
      crate.add(band);
    }
    crate.position.set(0.82, 0.24, -0.42);
    crate.scale.setScalar(0.72);
    group.add(crate);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.52, 10), wood);
    barrel.position.set(0.86, 0.28, 0.46);
    for (const y of [-0.16, 0.16]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.02, 5, 16), iron);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0.86, 0.28 + y, 0.46);
      group.add(ring);
    }
    const waterTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 12), water);
    waterTop.position.set(0.86, 0.55, 0.46);
    group.add(barrel, waterTop);

    const table = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.36), wood);
    table.position.set(-0.88, 0.48, -0.45);
    for (const x of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), darkWood);
      leg.position.set(-0.88 + x, 0.25, -0.45);
      group.add(leg);
    }
    const loaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), food);
    loaf.rotation.z = Math.PI / 2;
    loaf.position.set(-0.98, 0.58, -0.45);
    const knife = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.055), iron);
    knife.position.set(-0.68, 0.57, -0.45);
    knife.rotation.y = 0.25;
    group.add(table, loaf, knife);

    const markerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.28, 7), wood);
    markerPole.position.set(-1.0, 0.66, 0.28);
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 3), blanket);
    pennant.rotation.z = -Math.PI / 2;
    pennant.rotation.y = Math.PI / 2;
    pennant.position.set(-0.78, 1.05, 0.28);
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 14), gold);
    crest.position.set(-0.76, 1.05, 0.12);
    group.add(markerPole, pennant, crest);

    return group;
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.7,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0,
      emissiveIntensity: options.emissive ? 0.5 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}
