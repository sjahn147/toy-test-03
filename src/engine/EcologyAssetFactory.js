import { THREE } from './ThreeScene.js';

export class EcologyAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  createLair(prop) {
    if (prop.type === 'goblin_lair') return this.goblinLair();
    if (prop.type === 'ossuary_lair') return this.ossuaryLair();
    if (prop.type === 'spider_lair') return this.spiderLair();
    if (prop.type === 'slime_pool') return this.slimePool();
    if (prop.type === 'rat_warren') return this.ratWarren();
    if (prop.type === 'ogre_lair') return this.ogreLair();
    return null;
  }

  createCorpse(corpse) {
    const group = new THREE.Group();
    const cloth = this.mat(`corpse-cloth-${corpse.sourceRole}`, corpse.sourceRole === 'rat' ? 0x75675d : corpse.sourceRole === 'slime' ? 0x4c9f86 : 0x5a4850, { roughness: 0.9, transparent: corpse.sourceRole === 'slime', opacity: corpse.sourceRole === 'slime' ? 0.68 : 1 });
    const bone = this.mat('corpse-bone', 0xd5ccb5, { roughness: 0.72 });
    const blood = this.mat('corpse-blood', 0x5e1e24, { roughness: 0.8, transparent: true, opacity: 0.66 });
    const scale = corpse.sourceRole === 'ogre' ? 1.45 : corpse.sourceRole === 'rat' ? 0.42 : 0.78;

    const stain = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.64 * scale, 0.025, 10), blood);
    stain.position.y = 0.012;
    stain.scale.z = 0.72;
    group.add(stain);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * scale, 0.48 * scale, 4, 7), cloth);
    torso.rotation.z = Math.PI / 2;
    torso.position.set(0, 0.18 * scale, 0);
    group.add(torso);

    for (const side of [-1, 1]) {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.055 * scale, 0.48 * scale, 6), bone);
      limb.rotation.z = Math.PI / 2 + side * 0.26;
      limb.position.set(side * 0.3 * scale, 0.16 * scale, side * 0.12 * scale);
      group.add(limb);
    }

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 9, 6), bone);
    skull.position.set(0.38 * scale, 0.19 * scale, 0.06 * scale);
    group.add(skull);
    return group;
  }

  createHost(host) {
    const group = new THREE.Group();
    const silk = this.mat('host-silk', 0xe3edf2, { roughness: 0.5, transparent: true, opacity: 0.78 });
    const shadow = this.mat('host-shadow', 0x4b4651, { roughness: 0.88 });
    const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 5, 8), shadow);
    core.rotation.z = Math.PI / 2;
    group.add(core);
    for (let i = 0; i < 7; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27 + (i % 2) * 0.025, 0.018, 5, 18), silk);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = -0.33 + i * 0.11;
      group.add(ring);
    }
    for (const angle of [-0.45, 0, 0.45]) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5), silk);
      strand.rotation.z = Math.PI / 2;
      strand.rotation.x = angle;
      group.add(strand);
    }
    group.name = `host-cocoon:${host.id}`;
    return group;
  }

  createSpawnOmen(spawn) {
    if (spawn.species === 'skeleton') return this.boneOmen();
    if (spawn.species === 'spider') return this.eggOmen();
    if (spawn.species === 'slime') return this.slimeOmen();
    if (spawn.species === 'rat') return this.ratOmen();
    if (spawn.species === 'ogre') return this.ogreOmen();
    return this.goblinOmen();
  }

  createRat(agent) {
    const root = new THREE.Group();
    const model = new THREE.Group();
    model.name = 'miniature-model';
    const fur = this.mat('rat-fur', 0x77665c, { roughness: 0.95 });
    const pink = this.mat('rat-pink', 0xc9938e, { roughness: 0.8 });
    const dark = this.mat('rat-dark', 0x17151a, { roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), fur);
    body.scale.set(1.3, 0.75, 0.78);
    body.position.y = 0.28;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 9), fur);
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.42, 0.31, 0);
    model.add(body, head);
    for (const z of [-0.13, 0.13]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 5), pink);
      ear.scale.set(0.35, 1, 1);
      ear.position.set(0.23, 0.48, z);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), dark);
      eye.position.set(0.48, 0.38, z * 0.75);
      model.add(ear, eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), pink);
    nose.position.set(0.64, 0.31, 0);
    model.add(nose);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 5, 22, Math.PI * 1.15), pink);
    tail.rotation.set(Math.PI / 2, 0, -0.4);
    tail.position.set(-0.35, 0.27, 0);
    model.add(tail);
    for (const side of [-1, 1]) {
      for (const x of [-0.13, 0.22]) {
        const paw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.13), pink);
        paw.position.set(x, 0.05, side * 0.18);
        model.add(paw);
      }
    }
    root.add(model);
    this.addIndicators(root, agent, 0.34, 0.95);
    return root;
  }

  createSpider(agent) {
    const root = new THREE.Group();
    const model = new THREE.Group();
    model.name = 'miniature-model';
    const shell = this.mat('spider-shell', 0x332936, { roughness: 0.72 });
    const abdomenMat = this.mat('spider-abdomen', 0x684052, { roughness: 0.68 });
    const eyeMat = this.mat('spider-eyes', 0xd45162, { roughness: 0.2, emissive: 0x5c1018 });
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.34, 11, 8), abdomenMat);
    abdomen.scale.set(1.15, 0.9, 1.1);
    abdomen.position.set(-0.24, 0.36, 0);
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), shell);
    thorax.position.set(0.18, 0.34, 0);
    model.add(abdomen, thorax);
    for (let i = 0; i < 4; i += 1) {
      for (const side of [-1, 1]) {
        const angle = -0.65 + i * 0.43;
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.46, 6), shell);
        upper.position.set(0.02 + i * 0.04, 0.28, side * 0.28);
        upper.rotation.x = side * (0.8 + i * 0.08);
        upper.rotation.z = angle;
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.44, 6), shell);
        lower.position.set(0.05 + Math.cos(angle) * 0.22, 0.08, side * (0.48 + i * 0.05));
        lower.rotation.x = side * 1.22;
        lower.rotation.z = angle * 0.4;
        model.add(upper, lower);
      }
    }
    for (const z of [-0.11, -0.04, 0.04, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
      eye.position.set(0.37, 0.41, z);
      model.add(eye);
    }
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), this.mat('spider-fang', 0xc9c2aa, { roughness: 0.55 }));
      fang.rotation.z = Math.PI;
      fang.position.set(0.39, 0.23, side * 0.09);
      model.add(fang);
    }
    root.add(model);
    this.addIndicators(root, agent, 0.48, 1.12);
    return root;
  }

  goblinLair() {
    const group = new THREE.Group();
    const hide = this.mat('goblin-hide', 0x67513e, { roughness: 0.95 });
    const wood = this.mat('goblin-wood', 0x5f3d29, { roughness: 0.92 });
    const iron = this.mat('goblin-iron', 0x696c68, { roughness: 0.62, metalness: 0.18 });
    const fire = this.mat('goblin-fire', 0xf08743, { roughness: 0.2, emissive: 0x7b2608 });
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.07, 10), hide);
    mat.scale.z = 0.78;
    group.add(mat);
    for (let i = 0; i < 8; i += 1) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), iron);
      stone.position.set(Math.cos(i * Math.PI / 4) * 0.5, 0.12, Math.sin(i * Math.PI / 4) * 0.5);
      group.add(stone);
    }
    for (const angle of [-0.45, 0.45]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 7), wood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = angle;
      log.position.y = 0.15;
      group.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 7), fire);
    flame.position.y = 0.48;
    flame.name = 'ecology-flame';
    group.add(flame);
    for (const z of [-0.82, 0.82]) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.42), hide);
      bed.position.set(-0.55, 0.11, z);
      bed.rotation.y = z * 0.22;
      group.add(bed);
    }
    const crate = this.crate(wood, iron, 0.62);
    crate.position.set(0.92, 0.34, -0.62);
    group.add(crate);
    const tripod = this.tripod(iron, wood);
    tripod.position.set(0.1, 0.1, 0.05);
    group.add(tripod);
    const banner = this.banner(wood, this.mat('goblin-banner', 0x8c3f35, { roughness: 0.88 }));
    banner.position.set(1.0, 0, 0.72);
    group.add(banner);
    return group;
  }

  ossuaryLair() {
    const group = new THREE.Group();
    const stone = this.mat('ossuary-stone', 0x4d4d5c, { roughness: 0.92 });
    const bone = this.mat('ossuary-bone', 0xd7cfb8, { roughness: 0.68 });
    const wax = this.mat('ossuary-wax', 0xe7d7a3, { roughness: 0.64, emissive: 0x594310 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.9), stone);
    base.position.y = 0.06;
    group.add(base);
    for (const z of [-0.72, 0.72]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 0.28), stone);
      shelf.position.set(0, 0.55, z);
      group.add(shelf);
      for (let i = -3; i <= 3; i += 1) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bone);
        skull.position.set(i * 0.3, 0.72, z);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.055, 0.1), bone);
        jaw.position.set(i * 0.3, 0.62, z + 0.04);
        group.add(skull, jaw);
      }
    }
    for (let i = 0; i < 9; i += 1) {
      const longBone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.48, 6), bone);
      longBone.rotation.z = Math.PI / 2 + (i % 3 - 1) * 0.18;
      longBone.position.set(-0.8 + (i % 5) * 0.36, 0.18 + Math.floor(i / 5) * 0.08, -0.18 + (i % 2) * 0.32);
      group.add(longBone);
    }
    for (const x of [-1.05, 1.05]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 8), wax);
      candle.position.set(x, 0.29, 0);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), wax);
      flame.position.set(x, 0.51, 0);
      flame.name = 'ecology-flame';
      group.add(candle, flame);
    }
    return group;
  }

  spiderLair() {
    const group = new THREE.Group();
    const rock = this.mat('spider-rock', 0x34323d, { roughness: 0.94 });
    const silk = this.mat('spider-silk', 0xe4edf2, { roughness: 0.48, transparent: true, opacity: 0.7 });
    const egg = this.mat('spider-egg', 0xc9d6d7, { roughness: 0.62, transparent: true, opacity: 0.84 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.08, 12), rock);
    floor.scale.z = 0.76;
    group.add(floor);
    for (let i = 0; i < 6; i += 1) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.5, 7), rock);
      post.position.set(Math.cos(i * Math.PI / 3) * 1.05, 0.75, Math.sin(i * Math.PI / 3) * 0.72);
      post.rotation.z = Math.sin(i * Math.PI / 3) * 0.18;
      group.add(post);
    }
    for (const radius of [0.38, 0.7, 1.02]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, 28), silk);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.78 + radius * 0.1;
      group.add(ring);
    }
    for (let i = 0; i < 8; i += 1) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.0, 5), silk);
      strand.rotation.z = Math.PI / 2;
      strand.rotation.y = i * Math.PI / 4;
      strand.position.y = 0.82;
      group.add(strand);
    }
    for (const [x, z, s] of [[-0.72, -0.35, 0.32], [0.68, -0.18, 0.38], [0.25, 0.52, 0.28]]) {
      const sac = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 7), egg);
      sac.scale.y = 1.35;
      sac.position.set(x, s + 0.12, z);
      sac.name = 'ecology-egg';
      group.add(sac);
      for (let i = 0; i < 3; i += 1) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(s * (0.62 + i * 0.12), 0.01, 5, 16), silk);
        wrap.rotation.x = Math.PI / 2;
        wrap.position.set(x, s + 0.05 + i * 0.11, z);
        group.add(wrap);
      }
    }
    return group;
  }

  slimePool() {
    const group = new THREE.Group();
    const stone = this.mat('slime-stone', 0x454f50, { roughness: 0.92 });
    const fluid = this.mat('slime-fluid', 0x55b99d, { roughness: 0.18, transparent: true, opacity: 0.76, emissive: 0x123f36 });
    const pipe = this.mat('slime-pipe', 0x6d7776, { roughness: 0.48, metalness: 0.22 });
    for (let i = 0; i < 14; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.28), stone);
      block.position.set(Math.cos(i * Math.PI * 2 / 14) * 1.15, 0.11, Math.sin(i * Math.PI * 2 / 14) * 0.8);
      block.rotation.y = -i * Math.PI * 2 / 14;
      group.add(block);
    }
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.14, 0.09, 28), fluid);
    pool.position.y = 0.05;
    pool.scale.z = 0.72;
    pool.name = 'ecology-fluid';
    group.add(pool);
    for (let i = 0; i < 8; i += 1) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (i % 3) * 0.025, 8, 6), fluid);
      bubble.position.set(-0.7 + (i % 4) * 0.45, 0.16 + (i % 2) * 0.08, -0.32 + Math.floor(i / 4) * 0.55);
      bubble.name = 'ecology-bubble';
      group.add(bubble);
    }
    for (const side of [-1, 1]) {
      const vertical = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 8), pipe);
      vertical.position.set(side * 0.92, 0.56, 0.55);
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 7, 14, Math.PI / 2), pipe);
      elbow.rotation.z = side > 0 ? 0 : Math.PI;
      elbow.position.set(side * 0.72, 0.96, 0.55);
      group.add(vertical, elbow);
    }
    return group;
  }

  ratWarren() {
    const group = new THREE.Group();
    const dirt = this.mat('rat-dirt', 0x5d4938, { roughness: 0.98 });
    const sack = this.mat('rat-sack', 0xa58b62, { roughness: 0.94 });
    const wood = this.mat('rat-crate', 0x715037, { roughness: 0.94 });
    const grain = this.mat('rat-grain', 0xd2b45d, { roughness: 0.76 });
    const iron = this.mat('rat-crate-iron', 0x66655f, { roughness: 0.58, metalness: 0.12 });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 7), dirt);
    mound.scale.set(1.1, 0.38, 0.78);
    mound.position.y = 0.18;
    group.add(mound);
    for (const [x, z] of [[-0.62, -0.15], [0.5, -0.34], [0.12, 0.44]]) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.08, 12), this.mat('rat-hole', 0x171311, { roughness: 1 }));
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, 0.22, z);
      group.add(hole);
    }
    for (const [x, z, r] of [[-0.95, 0.55, -0.2], [0.92, 0.42, 0.18], [0.58, -0.78, -0.1]]) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 6), sack);
      bag.scale.set(0.78, 1.2, 0.72);
      bag.position.set(x, 0.34, z);
      bag.rotation.z = r;
      group.add(bag);
    }
    const crate = this.crate(wood, iron, 0.58);
    crate.position.set(-0.55, 0.33, -0.72);
    crate.rotation.y = 0.28;
    group.add(crate);
    for (let i = 0; i < 18; i += 1) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.027, 5, 4), grain);
      seed.scale.set(1.6, 0.7, 0.8);
      seed.position.set(-0.15 + (i % 6) * 0.12, 0.08 + (i % 3) * 0.018, -0.05 + Math.floor(i / 6) * 0.13);
      group.add(seed);
    }
    return group;
  }

  ogreLair() {
    const group = new THREE.Group();
    const hide = this.mat('ogre-hide', 0x6b4c39, { roughness: 0.96 });
    const wood = this.mat('ogre-wood', 0x5a3825, { roughness: 0.94 });
    const iron = this.mat('ogre-iron', 0x686b68, { roughness: 0.58, metalness: 0.18 });
    const bone = this.mat('ogre-bone', 0xd1c6a7, { roughness: 0.72 });
    const fire = this.mat('ogre-fire', 0xeb7840, { emissive: 0x6f2208, roughness: 0.18 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.92), hide);
    bed.position.set(-0.65, 0.18, 0.58);
    bed.rotation.y = -0.18;
    group.add(bed);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.72), wood);
    table.position.set(0.52, 0.72, -0.5);
    group.add(table);
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.22, 0.22]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.15), wood);
        leg.position.set(0.52 + x, 0.36, -0.5 + z);
        group.add(leg);
      }
    }
    const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.72), iron);
    cauldron.position.set(0.88, 0.42, 0.55);
    cauldron.rotation.x = Math.PI;
    group.add(cauldron);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), fire);
    flame.position.set(0.88, 0.32, 0.55);
    flame.name = 'ecology-flame';
    group.add(flame);
    for (let i = 0; i < 4; i += 1) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14, Math.PI * 1.25), iron);
      hook.position.set(-1.0 + i * 0.38, 1.25, -0.58);
      hook.rotation.z = Math.PI;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 5), iron);
      chain.position.set(-1.0 + i * 0.38, 1.58, -0.58);
      group.add(hook, chain);
    }
    for (let i = 0; i < 5; i += 1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.23 + i * 0.02, 0.025, 5, 14, Math.PI), bone);
      rib.position.set(-0.8 + i * 0.22, 0.2, -0.3 + (i % 2) * 0.12);
      rib.rotation.x = Math.PI / 2;
      group.add(rib);
    }
    return group;
  }

  goblinOmen() {
    const group = new THREE.Group();
    const cloth = this.mat('goblin-omen-cloth', 0x8a4d36, { roughness: 0.88 });
    const bundle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), cloth);
    bundle.scale.y = 0.72;
    group.add(bundle);
    for (let i = 0; i < 4; i += 1) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 5), this.mat('omen-stick', 0x60402d, { roughness: 0.94 }));
      stick.rotation.z = Math.PI / 2;
      stick.rotation.y = i * Math.PI / 4;
      group.add(stick);
    }
    return group;
  }

  boneOmen() {
    const group = new THREE.Group();
    const bone = this.mat('bone-omen', 0xd7cfb8, { roughness: 0.68 });
    for (let i = 0; i < 10; i += 1) {
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6), bone);
      piece.rotation.z = Math.PI / 2 + (i % 5 - 2) * 0.15;
      piece.position.set((i % 5 - 2) * 0.12, 0.08 + Math.floor(i / 5) * 0.08, (i % 2 - 0.5) * 0.16);
      group.add(piece);
    }
    return group;
  }

  eggOmen() {
    const group = new THREE.Group();
    const egg = this.mat('egg-omen', 0xd5e0e2, { transparent: true, opacity: 0.84, roughness: 0.55 });
    for (const [x, z, s] of [[-0.2, 0, 0.22], [0.18, 0.08, 0.28], [0, -0.18, 0.19]]) {
      const sac = new THREE.Mesh(new THREE.SphereGeometry(s, 9, 6), egg);
      sac.scale.y = 1.4;
      sac.position.set(x, s, z);
      group.add(sac);
    }
    return group;
  }

  slimeOmen() {
    const group = new THREE.Group();
    const fluid = this.mat('slime-omen', 0x6cd2b1, { transparent: true, opacity: 0.76, emissive: 0x173f35, roughness: 0.2 });
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.06, 18), fluid);
    group.add(pool);
    for (let i = 0; i < 5; i += 1) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.015, 7, 5), fluid);
      bubble.position.set(-0.28 + i * 0.14, 0.12 + (i % 2) * 0.08, (i % 3 - 1) * 0.13);
      group.add(bubble);
    }
    return group;
  }

  ratOmen() {
    const group = new THREE.Group();
    const straw = this.mat('rat-omen-straw', 0xb59b55, { roughness: 0.92 });
    const fur = this.mat('rat-omen-fur', 0x77665c, { roughness: 0.96 });
    for (let i = 0; i < 12; i += 1) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.58, 5), straw);
      stalk.rotation.z = Math.PI / 2;
      stalk.rotation.y = i * Math.PI / 6;
      stalk.position.y = 0.06;
      group.add(stalk);
    }
    for (const x of [-0.18, 0.02, 0.2]) {
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), fur);
      pup.scale.set(1.2, 0.7, 0.8);
      pup.position.set(x, 0.13, x * 0.4);
      group.add(pup);
    }
    return group;
  }

  ogreOmen() {
    const group = new THREE.Group();
    const meat = this.mat('ogre-omen-meat', 0x7e2f35, { roughness: 0.8 });
    const bone = this.mat('ogre-omen-bone', 0xd4c7a6, { roughness: 0.7 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.58), meat);
    slab.position.y = 0.18;
    group.add(slab);
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 6), bone);
      rib.rotation.z = Math.PI / 2;
      rib.position.set(side * 0.32, 0.26, 0);
      group.add(rib);
    }
    return group;
  }

  crate(wood, metal, size = 0.6) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.72, size * 0.62), wood);
    group.add(box);
    for (const y of [-0.23, 0.23]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(size + 0.04, 0.06, size * 0.66), metal);
      band.position.y = y * size;
      group.add(band);
    }
    return group;
  }

  tripod(metal, wood) {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.9, 5), wood);
      leg.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.22, 0.45, Math.sin(i * Math.PI * 2 / 3) * 0.22);
      leg.rotation.z = Math.cos(i * Math.PI * 2 / 3) * 0.22;
      group.add(leg);
    }
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), metal);
    pot.rotation.x = Math.PI;
    pot.position.y = 0.48;
    group.add(pot);
    return group;
  }

  banner(wood, cloth) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.35, 6), wood);
    pole.position.y = 0.68;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.035), cloth);
    flag.position.set(0.28, 1.02, 0);
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 5), this.mat('banner-tooth', 0xd7c99e, { roughness: 0.7 }));
    tooth.position.set(0.28, 1.02, 0.03);
    tooth.rotation.z = Math.PI;
    group.add(pole, flag, tooth);
    return group;
  }

  addIndicators(root, agent, radius, hpY) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.028, 6, 22), new THREE.MeshBasicMaterial({ color: agent.faction === 'party' ? 0x88c7ff : 0xff8e73 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.035), new THREE.MeshBasicMaterial({ color: 0x330b0b }));
    back.position.set(0, hpY, 0);
    const hp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.055, 0.04), new THREE.MeshBasicMaterial({ color: 0x9ee0a3 }));
    hp.name = 'hp';
    hp.position.set(0, hpY, 0.01);
    root.add(back, hp);
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.62 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}
