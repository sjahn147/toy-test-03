import { THREE } from './ThreeScene.js';

export class AdvancedCreatureAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  create(agent) {
    if (agent.role === 'zombie') return this.zombie(agent);
    if (agent.role === 'orc') return this.orc(agent);
    if (agent.role === 'myconid') return this.myconid(agent);
    if (agent.role === 'stirge') return this.stirge(agent);
    if (agent.role === 'carrion') return this.carrion(agent);
    if (agent.role === 'kobold') return this.kobold(agent);
    if (agent.role === 'wraith') return this.wraith(agent);
    if (agent.role === 'parasite') return this.parasite(agent);
    return null;
  }

  zombie(agent) {
    const root = this.root(agent, 1.05);
    const model = root.getObjectByName('miniature-model');
    const flesh = this.mat('zombie-flesh', 0x82907c, { roughness: 0.95 });
    const cloth = this.mat('zombie-cloth', 0x51494d, { roughness: 0.98 });
    const bone = this.mat('zombie-bone', 0xd1c7ab, { roughness: 0.72 });
    const blood = this.mat('zombie-blood', 0x6d2529, { roughness: 0.82 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.55, 4, 8), cloth);
    torso.position.y = 0.76;
    torso.rotation.z = -0.08;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), flesh);
    head.position.set(0.08, 1.34, 0);
    head.scale.y = 0.92;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.18), bone);
    jaw.position.set(0.11, 1.19, 0.08);
    model.add(torso, head, jaw);

    for (const [side, angle] of [[-1, -0.55], [1, 0.25]]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 7), flesh);
      arm.position.set(side * 0.34, 0.88, 0);
      arm.rotation.z = side * angle;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), flesh);
      hand.position.set(side * (side < 0 ? 0.56 : 0.5), side < 0 ? 0.65 : 0.53, 0.03);
      model.add(arm, hand);
    }
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.58, 7), side < 0 ? bone : flesh);
      leg.position.set(side * 0.14, 0.28, 0);
      leg.rotation.z = side * 0.08;
      model.add(leg);
    }
    for (const [x, y] of [[-0.12, 0.85], [0.13, 0.62], [0.08, 1.38]]) {
      const wound = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), blood);
      wound.scale.set(1.5, 0.35, 0.25);
      wound.position.set(x, y, 0.23);
      model.add(wound);
    }
    return root;
  }

  orc(agent) {
    const root = this.root(agent, 1.18);
    const model = root.getObjectByName('miniature-model');
    const skin = this.mat('orc-skin', 0x75834e, { roughness: 0.9 });
    const leather = this.mat('orc-leather', 0x503226, { roughness: 0.96 });
    const iron = this.mat('orc-iron', 0x727b79, { roughness: 0.55, metalness: 0.22 });
    const bone = this.mat('orc-tusk', 0xe0d1ac, { roughness: 0.68 });
    const red = this.mat('orc-red', 0x9d4038, { roughness: 0.85 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.48), leather);
    torso.position.y = 0.83;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 11, 8), skin);
    head.position.y = 1.38;
    head.scale.set(1.08, 0.9, 0.98);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.28), skin);
    jaw.position.set(0, 1.2, 0.09);
    model.add(torso, head, jaw);
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 6), bone);
      tusk.position.set(side * 0.14, 1.21, 0.25);
      tusk.rotation.x = -0.28;
      model.add(tusk);
      const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), iron);
      shoulder.position.set(side * 0.45, 1.02, 0);
      model.add(shoulder);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.72, 8), skin);
      arm.position.set(side * 0.48, 0.68, 0);
      arm.rotation.z = side * 0.12;
      model.add(arm);
    }
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.5), iron);
    belt.position.y = 0.49;
    const loin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.08), red);
    loin.position.set(0, 0.31, 0.28);
    model.add(belt, loin);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.58, 8), skin);
      leg.position.set(side * 0.2, 0.22, 0);
      model.add(leg);
    }
    const axe = this.axe(iron, leather);
    axe.position.set(0.62, 0.66, 0.05);
    axe.rotation.z = -0.28;
    model.add(axe);
    return root;
  }

  myconid(agent) {
    const root = this.root(agent, 1.02);
    const model = root.getObjectByName('miniature-model');
    const stem = this.mat('myconid-stem', 0xc5c0a4, { roughness: 0.86 });
    const cap = this.mat('myconid-cap', 0x4c83a9, { roughness: 0.7, emissive: 0x17364a });
    const gill = this.mat('myconid-gill', 0xd7e6d8, { roughness: 0.62, transparent: true, opacity: 0.85 });
    const spore = this.mat('myconid-spore', 0x91d5c3, { roughness: 0.25, transparent: true, opacity: 0.72, emissive: 0x1c584c });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.62, 5, 9), stem);
    body.position.y = 0.67;
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap);
    capTop.scale.y = 0.55;
    capTop.position.y = 1.34;
    const gills = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.18, 0.12, 16), gill);
    gills.position.y = 1.25;
    model.add(body, capTop, gills);
    for (let i = 0; i < 8; i += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.34), gill);
      line.position.set(0, 1.22, 0.17);
      line.rotation.y = i * Math.PI / 4;
      model.add(line);
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.55, 7), stem);
      arm.position.set(side * 0.28, 0.7, 0);
      arm.rotation.z = side * 0.35;
      model.add(arm);
    }
    for (let i = 0; i < 6; i += 1) {
      const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), spore);
      mote.position.set(Math.cos(i * Math.PI / 3) * 0.5, 0.9 + (i % 3) * 0.2, Math.sin(i * Math.PI / 3) * 0.35);
      mote.name = 'advanced-spore';
      model.add(mote);
    }
    return root;
  }

  stirge(agent) {
    const root = this.root(agent, 0.78);
    const model = root.getObjectByName('miniature-model');
    const hide = this.mat('stirge-hide', 0x7d3545, { roughness: 0.78 });
    const wing = this.mat('stirge-wing', 0xc87883, { roughness: 0.34, transparent: true, opacity: 0.68 });
    const dark = this.mat('stirge-dark', 0x28202a, { roughness: 0.88 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), hide);
    body.scale.set(0.8, 1.15, 0.8);
    body.position.y = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 6), hide);
    head.position.set(0, 0.94, 0.1);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.48, 7), dark);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.92, 0.38);
    model.add(body, head, beak);
    for (const side of [-1, 1]) {
      const membrane = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8, 0, Math.PI), wing);
      membrane.position.set(side * 0.27, 0.78, 0);
      membrane.rotation.y = side * 0.55;
      membrane.rotation.z = side * 0.5;
      membrane.name = 'advanced-wing';
      model.add(membrane);
      for (let i = 0; i < 3; i += 1) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.38, 5), dark);
        leg.position.set(side * (0.15 + i * 0.05), 0.52 - i * 0.04, -0.06 + i * 0.08);
        leg.rotation.z = side * (0.7 + i * 0.16);
        model.add(leg);
      }
    }
    return root;
  }

  carrion(agent) {
    const root = this.root(agent, 0.94);
    const model = root.getObjectByName('miniature-model');
    const shell = this.mat('carrion-shell', 0x80694d, { roughness: 0.88 });
    const belly = this.mat('carrion-belly', 0xb69b70, { roughness: 0.82 });
    const tentacle = this.mat('carrion-tentacle', 0xb58a79, { roughness: 0.78 });
    const dark = this.mat('carrion-eye', 0x151317, { roughness: 0.9 });
    for (let i = 0; i < 6; i += 1) {
      const segment = new THREE.Mesh(new THREE.SphereGeometry(0.23 - i * 0.012, 10, 7), i % 2 ? belly : shell);
      segment.scale.set(1.2, 0.7, 0.9);
      segment.position.set(-0.48 + i * 0.2, 0.35 + Math.sin(i) * 0.03, 0);
      model.add(segment);
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.38, 5), shell);
        leg.position.set(-0.48 + i * 0.2, 0.22, side * 0.21);
        leg.rotation.x = side * 0.8;
        model.add(leg);
      }
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 11, 7), shell);
    head.position.set(0.75, 0.42, 0);
    model.add(head);
    for (const z of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), dark);
      eye.position.set(0.96, 0.5, z);
      model.add(eye);
      const feeler = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.72, 5), tentacle);
      feeler.position.set(1.0, 0.65, z * 1.4);
      feeler.rotation.z = -1.1;
      feeler.rotation.x = z * 2.1;
      model.add(feeler);
    }
    return root;
  }

  kobold(agent) {
    const root = this.root(agent, 0.8);
    const model = root.getObjectByName('miniature-model');
    const scale = this.mat('kobold-scale', 0xb66e45, { roughness: 0.88 });
    const leather = this.mat('kobold-leather', 0x4b3428, { roughness: 0.95 });
    const copper = this.mat('kobold-copper', 0xb97842, { roughness: 0.48, metalness: 0.25 });
    const bone = this.mat('kobold-horn', 0xe0d0ac, { roughness: 0.72 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.48, 4, 8), leather);
    body.position.y = 0.62;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.48, 8), scale);
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.18, 1.06, 0);
    model.add(body, head);
    for (const z of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), bone);
      horn.position.set(0.02, 1.18, z);
      horn.rotation.z = -0.55;
      model.add(horn);
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.46, 6), scale);
      arm.position.set(side * 0.24, 0.63, 0);
      arm.rotation.z = side * 0.3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), scale);
      leg.position.set(side * 0.12, 0.22, 0);
      model.add(arm, leg);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.75, 8), scale);
    tail.rotation.z = Math.PI / 2.4;
    tail.position.set(-0.35, 0.45, -0.05);
    const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 5, 12), copper);
    goggles.rotation.y = Math.PI / 2;
    goggles.position.set(0.39, 1.08, 0);
    model.add(tail, goggles);
    const wrench = this.wrench(copper, leather);
    wrench.position.set(0.35, 0.48, 0.05);
    wrench.rotation.z = -0.35;
    model.add(wrench);
    return root;
  }

  wraith(agent) {
    const root = this.root(agent, 1.0);
    const model = root.getObjectByName('miniature-model');
    const robe = this.mat('wraith-robe', 0x4c466b, { roughness: 0.45, transparent: true, opacity: 0.72, emissive: 0x19152d });
    const glow = this.mat('wraith-glow', 0xb9b2ff, { roughness: 0.12, transparent: true, opacity: 0.76, emissive: 0x4f4288 });
    const dark = this.mat('wraith-dark', 0x121019, { roughness: 0.9 });
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 12, 1, true), robe);
    skirt.position.y = 0.57;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 11, 8, 0, Math.PI * 2, 0, Math.PI * 0.72), robe);
    hood.position.y = 1.25;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark);
    face.position.set(0, 1.22, 0.17);
    model.add(skirt, hood, face);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), glow);
      eye.position.set(side * 0.055, 1.25, 0.315);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 0.8, 7), robe);
      arm.position.set(side * 0.37, 0.82, 0);
      arm.rotation.z = side * 0.65;
      model.add(eye, arm);
    }
    for (const radius of [0.44, 0.58]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, 24), glow);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.35;
      ring.name = 'advanced-aura';
      model.add(ring);
    }
    return root;
  }

  parasite(agent) {
    const root = this.root(agent, 0.62);
    const model = root.getObjectByName('miniature-model');
    const pale = this.mat('parasite-pale', 0xd7d2b9, { roughness: 0.72, transparent: true, opacity: 0.88 });
    const red = this.mat('parasite-red', 0x984f55, { roughness: 0.75 });
    const dark = this.mat('parasite-dark', 0x272127, { roughness: 0.9 });
    for (let i = 0; i < 5; i += 1) {
      const segment = new THREE.Mesh(new THREE.SphereGeometry(0.13 - i * 0.012, 8, 6), pale);
      segment.scale.set(1.25, 0.78, 0.8);
      segment.position.set(-0.28 + i * 0.13, 0.25 + Math.sin(i) * 0.015, 0);
      model.add(segment);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), red);
    mouth.rotation.y = Math.PI / 2;
    mouth.position.set(0.42, 0.27, 0);
    model.add(mouth);
    for (let i = 0; i < 6; i += 1) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 5), dark);
      tooth.position.set(0.45, 0.27 + Math.sin(i * Math.PI / 3) * 0.08, Math.cos(i * Math.PI / 3) * 0.08);
      tooth.rotation.z = -Math.PI / 2;
      model.add(tooth);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 5), red);
        leg.position.set(-0.1 + i * 0.14, 0.16, side * 0.11);
        leg.rotation.x = side * 0.85;
        model.add(leg);
      }
    }
    return root;
  }

  createAttachedStirge() {
    const fake = { id: 'attached-stirge', role: 'stirge', hp: 1, maxHp: 1 };
    const root = this.stirge(fake);
    root.scale.setScalar(0.7);
    const hp = root.getObjectByName('hp');
    if (hp?.parent) hp.parent.visible = false;
    return root;
  }

  root(agent, indicatorY) {
    const root = new THREE.Group();
    const model = new THREE.Group();
    model.name = 'miniature-model';
    root.add(model);
    this.addIndicators(root, agent, indicatorY);
    return root;
  }

  addIndicators(root, agent, y) {
    const holder = new THREE.Group();
    holder.name = 'indicators';
    holder.position.y = y + 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.035), this.mat('hp-back', 0x251f25, { roughness: 1 }));
    const hp = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.045, 0.04), this.mat('hp-fill', 0xc85f5f, { roughness: 0.8 }));
    hp.name = 'hp';
    hp.position.z = 0.025;
    holder.add(back, hp);
    root.add(holder);
  }

  axe(iron, wood) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.95, 7), wood);
    shaft.position.y = 0.1;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), iron);
    blade.rotation.z = -Math.PI / 2;
    blade.position.set(0.17, 0.47, 0);
    group.add(shaft, blade);
    return group;
  }

  wrench(copper, grip) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.62, 7), grip);
    const jawA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.06), copper);
    jawA.position.set(-0.06, 0.34, 0);
    jawA.rotation.z = 0.35;
    const jawB = jawA.clone();
    jawB.position.x = 0.06;
    jawB.rotation.z = -0.35;
    group.add(shaft, jawA, jawB);
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
