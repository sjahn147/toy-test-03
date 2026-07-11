import { THREE } from './ThreeScene.js';

export class AdvancedLairAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  create(prop) {
    if (prop.type === 'plague_mortuary') return this.plagueMortuary();
    if (prop.type === 'orc_tribe_camp') return this.orcCamp();
    if (prop.type === 'fungal_garden') return this.fungalGarden();
    if (prop.type === 'blood_roost') return this.bloodRoost();
    if (prop.type === 'carrion_pit') return this.carrionPit();
    if (prop.type === 'kobold_workshop') return this.koboldWorkshop();
    if (prop.type === 'cursed_chapel') return this.cursedChapel();
    if (prop.type === 'parasite_pool') return this.parasitePool();
    return null;
  }

  plagueMortuary() {
    const group = new THREE.Group();
    const stone = this.mat('mortuary-stone', 0x53545c, { roughness: 0.94 });
    const cloth = this.mat('mortuary-cloth', 0x615b54, { roughness: 0.97 });
    const flesh = this.mat('mortuary-flesh', 0x8d6a68, { roughness: 0.86 });
    const glass = this.mat('mortuary-glass', 0x8cc0ad, { transparent: true, opacity: 0.62, roughness: 0.2, emissive: 0x18392f });
    const iron = this.mat('mortuary-iron', 0x6d7074, { roughness: 0.5, metalness: 0.22 });
    const wax = this.mat('mortuary-wax', 0xe3d3a1, { roughness: 0.7, emissive: 0x4f3910 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.0), stone);
    base.position.y = 0.06;
    group.add(base);
    for (const z of [-0.58, 0.58]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.52), stone);
      slab.position.set(-0.18, 0.28, z);
      group.add(slab);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.82, 4, 7), flesh);
      body.rotation.z = Math.PI / 2;
      body.position.set(-0.16, 0.46, z);
      group.add(body);
      for (let i = 0; i < 5; i += 1) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.58), cloth);
        strap.position.set(-0.58 + i * 0.22, 0.55, z);
        group.add(strap);
      }
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 1.5), iron);
    shelf.position.set(1.0, 0.65, 0);
    group.add(shelf);
    for (let i = 0; i < 6; i += 1) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.28, 8), glass);
      bottle.position.set(0.84 + (i % 2) * 0.22, 0.27 + Math.floor(i / 2) * 0.34, -0.42 + (i % 3) * 0.4);
      group.add(bottle);
    }
    for (const x of [-1.15, 1.18]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.28, 8), wax);
      candle.position.set(x, 0.2, 0.82);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), wax);
      flame.position.set(x, 0.4, 0.82);
      flame.name = 'advanced-flame';
      group.add(candle, flame);
    }
    const chain = this.chain(iron, 7);
    chain.position.set(-1.05, 0.65, -0.72);
    group.add(chain);
    return group;
  }

  orcCamp() {
    const group = new THREE.Group();
    const hide = this.mat('orc-camp-hide', 0x6d4b37, { roughness: 0.97 });
    const wood = this.mat('orc-camp-wood', 0x5b3926, { roughness: 0.94 });
    const iron = this.mat('orc-camp-iron', 0x676d6a, { roughness: 0.56, metalness: 0.22 });
    const red = this.mat('orc-camp-red', 0x963d35, { roughness: 0.88 });
    const fire = this.mat('orc-camp-fire', 0xf17c3f, { roughness: 0.18, emissive: 0x732307 });
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.68, 0.08, 12), hide);
    mat.scale.z = 0.75;
    group.add(mat);
    for (let i = 0; i < 10; i += 1) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), iron);
      stone.position.set(Math.cos(i * Math.PI / 5) * 0.52, 0.12, Math.sin(i * Math.PI / 5) * 0.52);
      group.add(stone);
    }
    for (const angle of [-0.55, 0.55, 0]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.78, 7), wood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = angle;
      log.position.y = 0.15;
      group.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.68, 7), fire);
    flame.position.y = 0.48;
    flame.name = 'advanced-flame';
    group.add(flame);
    const totemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.7, 8), wood);
    totemPost.position.set(-1.05, 0.85, -0.55);
    group.add(totemPost);
    for (const y of [0.55, 0.9, 1.22]) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), this.mat('orc-camp-bone', 0xd5c9aa, { roughness: 0.72 }));
      skull.position.set(-1.05, y, -0.45);
      group.add(skull);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.05), red);
    banner.position.set(-0.75, 1.32, -0.55);
    banner.rotation.y = -0.2;
    group.add(banner);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.12), wood);
    rack.position.set(0.95, 0.75, 0.48);
    group.add(rack);
    for (const x of [0.65, 0.95, 1.25]) {
      const axe = this.axe(iron, wood);
      axe.position.set(x, 0.58, 0.48);
      axe.rotation.z = 0.2 - x * 0.08;
      group.add(axe);
    }
    for (const z of [-0.65, 0.65]) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), iron);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(1.05, 0.36, z);
      group.add(shield);
    }
    return group;
  }

  fungalGarden() {
    const group = new THREE.Group();
    const dirt = this.mat('fungal-dirt', 0x4a4339, { roughness: 0.99 });
    const blue = this.mat('fungal-blue', 0x4f8db5, { roughness: 0.66, emissive: 0x17394f });
    const pale = this.mat('fungal-pale', 0xd0c7a8, { roughness: 0.84 });
    const green = this.mat('fungal-green', 0x5b8c69, { roughness: 0.86 });
    const glow = this.mat('fungal-glow', 0x91d7c5, { transparent: true, opacity: 0.74, roughness: 0.2, emissive: 0x285d50 });
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.1, 14), dirt);
    bed.scale.z = 0.76;
    group.add(bed);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.0, 9), this.mat('fungal-log', 0x5a3c2c, { roughness: 0.96 }));
    log.rotation.z = Math.PI / 2;
    log.position.set(-0.1, 0.27, -0.42);
    group.add(log);
    const clusters = [[-0.9, -0.2, 0.32], [-0.35, 0.55, 0.26], [0.48, -0.25, 0.38], [0.92, 0.5, 0.28]];
    for (const [x, z, s] of clusters) {
      for (let i = 0; i < 4; i += 1) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, s * (0.8 + i * 0.18), 7), pale);
        stem.position.set(x + (i - 1.5) * 0.11, 0.18 + s * 0.4, z + (i % 2) * 0.09);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(s * (0.32 + i * 0.035), 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? blue : green);
        cap.scale.y = 0.45;
        cap.position.set(stem.position.x, stem.position.y + s * 0.45, stem.position.z);
        cap.name = 'advanced-spore-cap';
        group.add(stem, cap);
      }
    }
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.045, 24), glow);
    puddle.position.set(0.55, 0.04, -0.65);
    puddle.scale.z = 0.55;
    puddle.name = 'advanced-fluid';
    group.add(puddle);
    for (let i = 0; i < 10; i += 1) {
      const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + (i % 3) * 0.01, 0), glow);
      mote.position.set(-0.9 + (i % 5) * 0.42, 0.45 + (i % 4) * 0.18, -0.5 + Math.floor(i / 5) * 0.7);
      mote.name = 'advanced-spore';
      group.add(mote);
    }
    return group;
  }

  bloodRoost() {
    const group = new THREE.Group();
    const rock = this.mat('roost-rock', 0x37333e, { roughness: 0.95 });
    const membrane = this.mat('roost-membrane', 0x8e3f52, { roughness: 0.62, transparent: true, opacity: 0.78 });
    const blood = this.mat('roost-blood', 0x6f202c, { roughness: 0.45, transparent: true, opacity: 0.78, emissive: 0x2b0710 });
    const bone = this.mat('roost-bone', 0xd2c7aa, { roughness: 0.72 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.58, 0.09, 12), rock);
    floor.scale.z = 0.75;
    group.add(floor);
    for (let i = 0; i < 7; i += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.45, 7), rock);
      spike.position.set(Math.cos(i * Math.PI * 2 / 7) * 1.05, 0.72, Math.sin(i * Math.PI * 2 / 7) * 0.72);
      spike.rotation.z = Math.sin(i) * 0.16;
      group.add(spike);
    }
    for (const [x, z] of [[-0.72, -0.18], [0.55, -0.45], [0.2, 0.55]]) {
      const sac = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 6), membrane);
      sac.scale.y = 1.4;
      sac.position.set(x, 0.42, z);
      sac.name = 'advanced-sac';
      group.add(sac);
    }
    for (const x of [-0.75, 0, 0.75]) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 12), bone);
      bowl.position.set(x, 0.12, 0.72);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 12), blood);
      liquid.position.set(x, 0.19, 0.72);
      liquid.name = 'advanced-fluid';
      group.add(bowl, liquid);
    }
    for (let i = 0; i < 6; i += 1) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), membrane);
      cord.position.set(-1.0 + i * 0.4, 0.95, -0.72 + (i % 2) * 0.2);
      group.add(cord);
    }
    return group;
  }

  carrionPit() {
    const group = new THREE.Group();
    const stone = this.mat('carrion-stone', 0x4a4542, { roughness: 0.96 });
    const refuse = this.mat('carrion-refuse', 0x665244, { roughness: 0.98 });
    const bone = this.mat('carrion-bone', 0xd2c6a8, { roughness: 0.74 });
    const larva = this.mat('carrion-larva', 0xb49d75, { roughness: 0.82 });
    for (let i = 0; i < 14; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.3), stone);
      block.position.set(Math.cos(i * Math.PI * 2 / 14) * 1.15, 0.12, Math.sin(i * Math.PI * 2 / 14) * 0.82);
      block.rotation.y = -i * Math.PI * 2 / 14;
      group.add(block);
    }
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.08, 0.12, 24), refuse);
    pit.position.y = 0.03;
    pit.scale.z = 0.72;
    group.add(pit);
    for (let i = 0; i < 12; i += 1) {
      const bonePart = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.44, 6), bone);
      bonePart.rotation.z = Math.PI / 2 + (i % 4 - 1.5) * 0.2;
      bonePart.position.set(-0.7 + (i % 6) * 0.28, 0.15 + Math.floor(i / 6) * 0.08, -0.35 + (i % 3) * 0.32);
      group.add(bonePart);
    }
    for (let i = 0; i < 8; i += 1) {
      const worm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 6), larva);
      worm.rotation.z = Math.PI / 2;
      worm.position.set(-0.62 + (i % 4) * 0.4, 0.23 + (i % 2) * 0.04, -0.48 + Math.floor(i / 4) * 0.7);
      worm.name = 'advanced-larva';
      group.add(worm);
    }
    const ribs = new THREE.Group();
    for (let i = 0; i < 6; i += 1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.28 + i * 0.025, 0.022, 5, 14, Math.PI), bone);
      rib.rotation.z = Math.PI / 2;
      rib.position.set(0.7, 0.35 + i * 0.05, 0.2);
      ribs.add(rib);
    }
    group.add(ribs);
    return group;
  }

  koboldWorkshop() {
    const group = new THREE.Group();
    const wood = this.mat('kobold-work-wood', 0x6b4931, { roughness: 0.94 });
    const copper = this.mat('kobold-work-copper', 0xb97742, { roughness: 0.45, metalness: 0.28 });
    const iron = this.mat('kobold-work-iron', 0x656b6d, { roughness: 0.54, metalness: 0.2 });
    const cloth = this.mat('kobold-work-cloth', 0x6b5844, { roughness: 0.95 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 2.0), cloth);
    base.position.y = 0.05;
    group.add(base);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.62), wood);
    bench.position.set(-0.35, 0.66, -0.48);
    group.add(bench);
    for (const x of [-1.0, 0.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), wood);
      leg.position.set(x, 0.34, -0.48);
      group.add(leg);
    }
    for (let i = 0; i < 6; i += 1) {
      const gear = new THREE.Mesh(new THREE.TorusGeometry(0.12 + (i % 3) * 0.04, 0.035, 6, 12), i % 2 ? copper : iron);
      gear.position.set(-1.0 + i * 0.28, 0.8 + (i % 2) * 0.12, -0.46);
      gear.rotation.x = Math.PI / 2;
      gear.name = 'advanced-gear';
      group.add(gear);
    }
    for (const z of [-0.55, 0.55]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), copper);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0.55, 0.32, z);
      group.add(pipe);
    }
    const jaw = this.springJaw(iron, copper);
    jaw.position.set(0.85, 0.12, 0.2);
    group.add(jaw);
    const crate = this.crate(wood, iron, 0.58);
    crate.position.set(1.0, 0.32, -0.62);
    group.add(crate);
    for (let i = 0; i < 5; i += 1) {
      const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.48, 6), i % 2 ? copper : iron);
      tool.position.set(-0.95 + i * 0.3, 0.98, -0.45);
      tool.rotation.z = -0.65 + i * 0.3;
      group.add(tool);
    }
    return group;
  }

  cursedChapel() {
    const group = new THREE.Group();
    const stone = this.mat('chapel-stone', 0x4b4858, { roughness: 0.94 });
    const wood = this.mat('chapel-wood', 0x503b32, { roughness: 0.95 });
    const silver = this.mat('chapel-silver', 0xaaa7c5, { roughness: 0.36, metalness: 0.18, emissive: 0x2e294c });
    const wax = this.mat('chapel-wax', 0xe2d5aa, { roughness: 0.68, emissive: 0x4d3710 });
    const violet = this.mat('chapel-violet', 0x7669a8, { transparent: true, opacity: 0.58, roughness: 0.2, emissive: 0x352866 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.0), stone);
    floor.position.y = 0.06;
    group.add(floor);
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 0.58), stone);
    altar.position.set(0, 0.4, -0.62);
    group.add(altar);
    for (const z of [-0.18, 0.42]) {
      for (const x of [-0.8, 0, 0.8]) {
        const pew = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.28), wood);
        pew.position.set(x, 0.28, z);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.08), wood);
        back.position.set(x, 0.5, z + 0.12);
        group.add(pew, back);
      }
    }
    for (let i = 0; i < 7; i += 1) {
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.04), silver);
      plaque.position.set(-0.9 + (i % 4) * 0.6, 0.16 + Math.floor(i / 4) * 0.18, -0.88);
      group.add(plaque);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 8, 24, Math.PI), stone);
    arch.position.set(0, 1.05, -0.78);
    arch.rotation.z = Math.PI;
    group.add(arch);
    const veil = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), violet);
    veil.position.set(0, 1.0, -0.76);
    veil.name = 'advanced-veil';
    group.add(veil);
    for (const x of [-0.48, 0.48]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8), wax);
      candle.position.set(x, 0.92, -0.58);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 6), wax);
      flame.position.set(x, 1.13, -0.58);
      flame.name = 'advanced-flame';
      group.add(candle, flame);
    }
    return group;
  }

  parasitePool() {
    const group = new THREE.Group();
    const stone = this.mat('parasite-stone', 0x565752, { roughness: 0.95 });
    const fluid = this.mat('parasite-fluid', 0xc7c9a9, { transparent: true, opacity: 0.7, roughness: 0.18, emissive: 0x3f4431 });
    const flesh = this.mat('parasite-flesh', 0xb47b78, { roughness: 0.76 });
    const iron = this.mat('parasite-iron', 0x676a68, { roughness: 0.52, metalness: 0.2 });
    for (let i = 0; i < 14; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.28), stone);
      block.position.set(Math.cos(i * Math.PI * 2 / 14) * 1.1, 0.11, Math.sin(i * Math.PI * 2 / 14) * 0.78);
      block.rotation.y = -i * Math.PI * 2 / 14;
      group.add(block);
    }
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.08, 0.08, 28), fluid);
    pool.position.y = 0.04;
    pool.scale.z = 0.72;
    pool.name = 'advanced-fluid';
    group.add(pool);
    for (let i = 0; i < 9; i += 1) {
      const larva = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 6), flesh);
      larva.rotation.z = Math.PI / 2;
      larva.position.set(-0.65 + (i % 3) * 0.55, 0.16 + (i % 2) * 0.05, -0.45 + Math.floor(i / 3) * 0.42);
      larva.name = 'advanced-larva';
      group.add(larva);
    }
    for (const x of [-0.95, 0.95]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.12), iron);
      frame.position.set(x, 0.72, 0.55);
      group.add(frame);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 7), flesh);
      tube.position.set(x * 0.82, 0.68, 0.55);
      tube.rotation.z = x > 0 ? -0.35 : 0.35;
      group.add(tube);
    }
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.35), iron);
    cradle.position.set(0, 0.34, 0.78);
    group.add(cradle);
    return group;
  }

  createTrap() {
    const iron = this.mat('trap-iron', 0x686d6d, { roughness: 0.5, metalness: 0.22 });
    const copper = this.mat('trap-copper', 0xb87943, { roughness: 0.45, metalness: 0.25 });
    return this.springJaw(iron, copper);
  }

  createInfectionMarker() {
    const group = new THREE.Group();
    const pale = this.mat('infection-pale', 0xd6d1b5, { transparent: true, opacity: 0.72, roughness: 0.2, emissive: 0x454731 });
    for (let i = 0; i < 6; i += 1) {
      const larva = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.16, 4, 6), pale);
      larva.rotation.z = Math.PI / 2;
      larva.position.set(Math.cos(i * Math.PI / 3) * 0.28, 0.1 + (i % 2) * 0.08, Math.sin(i * Math.PI / 3) * 0.28);
      group.add(larva);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 5, 22), pale);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return group;
  }

  createSpawnOmen(spawn) {
    const group = new THREE.Group();
    const pale = this.mat('advanced-omen-pale', 0xc9d5c5, { transparent: true, opacity: 0.78, roughness: 0.25, emissive: 0x334b3d });
    const dark = this.mat('advanced-omen-dark', 0x534b55, { roughness: 0.86 });
    const core = new THREE.Mesh(
      spawn.species === 'wraith' ? new THREE.TorusKnotGeometry(0.2, 0.045, 32, 6) : new THREE.IcosahedronGeometry(0.22, 1),
      pale
    );
    core.position.y = 0.24;
    group.add(core);
    for (const radius of [0.3, 0.45]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.02, 5, 20), pale);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);
    }
    for (let i = 0; i < 5; i += 1) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 5), dark);
      shard.position.set(Math.cos(i * Math.PI * 2 / 5) * 0.36, 0.16, Math.sin(i * Math.PI * 2 / 5) * 0.36);
      group.add(shard);
    }
    return group;
  }

  springJaw(iron, copper) {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.08, 14), copper);
    plate.position.y = 0.04;
    group.add(plate);
    for (const side of [-1, 1]) {
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.12), iron);
      jaw.position.set(0, 0.18, side * 0.24);
      jaw.rotation.x = side * 0.5;
      group.add(jaw);
      for (let i = 0; i < 5; i += 1) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), iron);
        tooth.position.set(-0.24 + i * 0.12, 0.26, side * 0.2);
        tooth.rotation.x = side * Math.PI / 2;
        group.add(tooth);
      }
    }
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 16), copper);
    spring.rotation.x = Math.PI / 2;
    spring.position.y = 0.12;
    group.add(spring);
    return group;
  }

  axe(iron, wood) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.75, 7), wood);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), iron);
    blade.rotation.z = -Math.PI / 2;
    blade.position.set(0.13, 0.34, 0);
    group.add(shaft, blade);
    return group;
  }

  chain(material, count) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i += 1) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 5, 10), material);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      link.position.y = i * 0.12;
      group.add(link);
    }
    return group;
  }

  crate(wood, iron, scale) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(scale, scale * 0.72, scale), wood);
    group.add(box);
    for (const y of [-0.25, 0.25]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(scale * 1.05, 0.06, scale * 1.05), iron);
      band.position.y = y * scale;
      group.add(band);
    }
    return group;
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.68,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.55 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}
