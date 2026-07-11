import { THREE } from './ThreeScene.js';
import { SETTLEMENT_FACTION_COLORS } from '../data/settlementConfig.js';

export class SettlementAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  create(settlement) {
    if (settlement.state === 'ruined') return this.ruin(settlement);
    if (settlement.indestructible) return this.safeHub(settlement);

    const group = new THREE.Group();
    group.name = `settlement:${settlement.id}`;
    const factionColor = SETTLEMENT_FACTION_COLORS[settlement.factionId] ?? 0x9b8c77;
    const wood = this.mat('settlement-wood', 0x5d3d2b, { roughness: 0.94 });
    const darkWood = this.mat('settlement-dark-wood', 0x34251f, { roughness: 0.96 });
    const stone = this.mat('settlement-stone', 0x55515d, { roughness: 0.92 });
    const cloth = this.mat(`settlement-cloth-${settlement.factionId}`, factionColor, { roughness: 0.84 });
    const glow = this.mat(`settlement-glow-${settlement.factionId}`, lighten(factionColor, 0.22), { roughness: 0.18, emissive: factionColor });

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 1.04, 0.08, 10), stone);
    platform.position.y = 0.04;
    platform.scale.z = 0.82;
    group.add(platform);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.35, 8), wood);
    post.position.set(-0.42, 0.72, -0.12);
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.09), wood);
    crossbeam.position.set(-0.05, 1.28, -0.12);
    const roofA = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.58), cloth);
    roofA.rotation.z = 0.32;
    roofA.position.set(0.05, 1.18, -0.08);
    const roofB = roofA.clone();
    roofB.rotation.z = -0.32;
    roofB.position.x = 0.47;
    group.add(post, crossbeam, roofA, roofB);

    const crate = this.crate(wood, darkWood);
    crate.position.set(0.48, 0.25, -0.28);
    crate.scale.setScalar(0.62);
    group.add(crate);

    const lantern = this.lantern(wood, glow);
    lantern.position.set(-0.02, 0.88, -0.12);
    group.add(lantern);

    this.addSpeciesMotif(group, settlement, wood, stone, cloth, glow);
    this.addCapacitySlots(group, settlement, darkWood, cloth, glow);
    this.addIntegrityGauge(group, settlement, factionColor);

    if (settlement.state === 'threatened' || settlement.state === 'damaged' || settlement.state === 'collapsing') {
      this.addDamage(group, settlement, darkWood, stone);
    }
    return group;
  }

  safeHub(settlement) {
    const group = new THREE.Group();
    group.name = `settlement:${settlement.id}`;
    const blue = this.mat('waystation-blue', 0x6fa9d4, { roughness: 0.8 });
    const gold = this.mat('waystation-gold', 0xe0bd65, { roughness: 0.4, metalness: 0.18, emissive: 0x3c2d08 });
    const wood = this.mat('waystation-wood', 0x6c4932, { roughness: 0.92 });
    const stone = this.mat('waystation-stone', 0x777381, { roughness: 0.88 });
    const cloth = this.mat('waystation-cloth', 0x3e5872, { roughness: 0.86 });

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.28, 0.1, 12), stone);
    floor.position.y = 0.05;
    floor.scale.z = 0.78;
    group.add(floor);

    for (const x of [-0.62, 0.62]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.35, 0.16), wood);
      pillar.position.set(x, 0.72, -0.12);
      group.add(pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.18), wood);
    beam.position.set(0, 1.34, -0.12);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.86), blue);
    canopy.position.set(0, 1.45, -0.04);
    canopy.rotation.z = 0.04;
    group.add(beam, canopy);

    const registry = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.58, 0.08), cloth);
    registry.position.set(0, 0.96, 0.23);
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 18), gold);
    crest.position.set(0, 1.0, 0.29);
    group.add(registry, crest);

    for (const side of [-1, 1]) {
      const bunk = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.36), wood);
      bunk.position.set(side * 0.58, 0.18, 0.5);
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.055, 0.31), blue);
      blanket.position.set(side * 0.58, 0.27, 0.5);
      group.add(bunk, blanket);
    }

    const chest = this.crate(wood, gold);
    chest.position.set(-0.78, 0.3, -0.48);
    chest.scale.setScalar(0.72);
    const lantern = this.lantern(wood, gold);
    lantern.position.set(0.78, 0.82, -0.45);
    group.add(chest, lantern);

    this.addCapacitySlots(group, settlement, wood, blue, gold);
    this.addIntegrityGauge(group, settlement, 0x6fa9d4);
    return group;
  }

  ruin(settlement) {
    const group = new THREE.Group();
    group.name = `settlement:${settlement.id}`;
    const ash = this.mat('settlement-ash', 0x3c373d, { roughness: 1 });
    const wood = this.mat('settlement-broken-wood', 0x493127, { roughness: 0.98 });
    const stone = this.mat('settlement-broken-stone', 0x5a5560, { roughness: 0.96 });
    const stain = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.05, 0.04, 10), ash);
    stain.position.y = 0.02;
    stain.scale.z = 0.72;
    group.add(stain);
    for (let i = 0; i < 8; i += 1) {
      const material = i % 3 === 0 ? stone : wood;
      const debris = new THREE.Mesh(
        i % 3 === 0 ? new THREE.DodecahedronGeometry(0.12 + (i % 2) * 0.05, 0) : new THREE.BoxGeometry(0.08, 0.08, 0.58 + (i % 2) * 0.18),
        material
      );
      debris.position.set(Math.cos(i * 0.9) * (0.2 + i * 0.055), 0.1 + (i % 2) * 0.06, Math.sin(i * 0.9) * (0.18 + i * 0.05));
      debris.rotation.set(i * 0.21, i * 0.39, i * 0.27);
      group.add(debris);
    }
    const brokenPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.8, 7), wood);
    brokenPost.position.set(-0.28, 0.35, -0.12);
    brokenPost.rotation.z = 0.8;
    group.add(brokenPost);
    return group;
  }

  addSpeciesMotif(group, settlement, wood, stone, cloth, glow) {
    const species = settlement.species;
    if (species === 'skeleton' || species === 'zombie' || species === 'wraith') {
      for (const x of [-0.22, 0.22]) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.62, 6), this.mat('settlement-bone', 0xd6cdb5, { roughness: 0.72 }));
        bone.position.set(x, 0.32, 0.48);
        bone.rotation.z = x < 0 ? 0.75 : -0.75;
        group.add(bone);
      }
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), this.mat('settlement-bone', 0xd6cdb5, { roughness: 0.72 }));
      skull.position.set(0, 0.28, 0.49);
      group.add(skull);
      return;
    }
    if (species === 'spider' || species === 'stirge' || species === 'parasite') {
      for (let i = 0; i < 4; i += 1) {
        const web = new THREE.Mesh(new THREE.TorusGeometry(0.28 + i * 0.055, 0.01, 5, 18, Math.PI), this.mat('settlement-silk', 0xe1e9ed, { transparent: true, opacity: 0.7, roughness: 0.5 }));
        web.rotation.x = Math.PI / 2;
        web.position.set(0.34, 0.18 + i * 0.055, 0.42);
        group.add(web);
      }
      return;
    }
    if (species === 'slime' || species === 'myconid') {
      const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.28, 10), stone);
      vat.position.set(0.34, 0.16, 0.42);
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 12), glow);
      fluid.position.set(0.34, 0.31, 0.42);
      group.add(vat, fluid);
      return;
    }
    if (species === 'rat') {
      for (const x of [0.18, 0.48]) {
        const hole = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 18), stone);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(x, 0.08, 0.48);
        group.add(hole);
      }
      return;
    }
    if (species === 'ogre' || species === 'orc' || species === 'carrion') {
      const rackA = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 7), wood);
      rackA.position.set(0.2, 0.42, 0.44);
      const rackB = rackA.clone();
      rackB.position.x = 0.55;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 7), wood);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0.38, 0.72, 0.44);
      const bundle = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 7), cloth);
      bundle.rotation.z = Math.PI / 2;
      bundle.position.set(0.38, 0.5, 0.44);
      group.add(rackA, rackB, bar, bundle);
      return;
    }

    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 4), cloth);
    tent.rotation.y = Math.PI / 4;
    tent.position.set(0.3, 0.32, 0.43);
    group.add(tent);
  }

  addCapacitySlots(group, settlement, baseMaterial, occupiedMaterial, emptyMaterial) {
    const visibleSlots = Math.min(8, Math.max(1, settlement.capacity));
    for (let i = 0; i < visibleSlots; i += 1) {
      const angle = -0.25 + i / Math.max(1, visibleSlots - 1) * (Math.PI + 0.5);
      const occupied = i < settlement.population;
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.16), occupied ? occupiedMaterial : baseMaterial);
      bed.name = `settlement-slot-${i}`;
      bed.userData.occupied = occupied;
      bed.position.set(Math.cos(angle) * 0.77, 0.11, Math.sin(angle) * 0.6);
      bed.rotation.y = -angle + Math.PI / 2;
      group.add(bed);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.13), occupied ? emptyMaterial : baseMaterial);
      pillow.position.copy(bed.position);
      pillow.position.y += 0.05;
      pillow.position.x += Math.cos(angle) * 0.06;
      pillow.position.z += Math.sin(angle) * 0.05;
      pillow.rotation.y = bed.rotation.y;
      group.add(pillow);
    }
  }

  addIntegrityGauge(group, settlement, factionColor) {
    const background = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.025, 6, 34), this.mat('settlement-gauge-dark', 0x28242d, { roughness: 0.95 }));
    background.rotation.x = Math.PI / 2;
    background.position.y = 0.045;
    const gauge = new THREE.Mesh(
      new THREE.TorusGeometry(1.035, 0.032, 6, 40, Math.PI * 2 * clamp(settlement.structuralIntegrity / 100, 0.02, 1)),
      this.mat(`settlement-gauge-${factionColor}`, factionColor, { emissive: darken(factionColor, 0.55), roughness: 0.3 })
    );
    gauge.name = 'settlement-integrity-gauge';
    gauge.rotation.x = Math.PI / 2;
    gauge.position.y = 0.052;
    group.add(background, gauge);
  }

  addDamage(group, settlement, wood, stone) {
    const amount = settlement.state === 'collapsing' ? 7 : settlement.state === 'damaged' ? 4 : 2;
    for (let i = 0; i < amount; i += 1) {
      const shard = new THREE.Mesh(i % 2 ? new THREE.BoxGeometry(0.055, 0.055, 0.36) : new THREE.DodecahedronGeometry(0.08, 0), i % 2 ? wood : stone);
      shard.position.set(Math.cos(i * 1.7) * 0.72, 0.11 + (i % 2) * 0.06, Math.sin(i * 1.7) * 0.5);
      shard.rotation.set(i * 0.2, i * 0.4, i * 0.31);
      group.add(shard);
    }
  }

  crate(wood, trim) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.5), wood);
    group.add(box);
    for (const y of [-0.2, 0.2]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.54), trim);
      band.position.y = y;
      group.add(band);
    }
    for (const x of [-0.26, 0.26]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.54), trim);
      brace.position.x = x;
      group.add(brace);
    }
    return group;
  }

  lantern(frame, glow) {
    const group = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.3, 8), frame);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), glow);
    light.name = 'settlement-light';
    light.position.y = 0.01;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 5, 14, Math.PI), frame);
    hook.position.y = 0.22;
    group.add(cage, light, hook);
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
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.48 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}

function lighten(hex, amount) {
  const r = Math.min(255, ((hex >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((hex >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (hex & 255) + Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}

function darken(hex, factor) {
  const r = Math.floor(((hex >> 16) & 255) * factor);
  const g = Math.floor(((hex >> 8) & 255) * factor);
  const b = Math.floor((hex & 255) * factor);
  return (r << 16) | (g << 8) | b;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
