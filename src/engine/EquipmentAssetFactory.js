import { THREE } from './ThreeScene.js';

export class EquipmentAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  createItem(item) {
    if (!item?.visualId) return null;
    const id = item.visualId;
    let group;
    if (id.startsWith('sword_') || id === 'blade_bone') group = this.makeSword(id);
    else if (id.startsWith('dagger_')) group = this.makeDagger(id);
    else if (id.startsWith('axe_')) group = this.makeAxe(id);
    else if (id.startsWith('bow_')) group = this.makeBow(id);
    else if (id.startsWith('staff_')) group = this.makeStaff(id);
    else if (id.startsWith('mace_')) group = this.makeMace(id);
    else if (id.startsWith('shield_') || id.startsWith('buckler_')) group = this.makeShield(id);
    else if (id.startsWith('book_')) group = this.makeBook(id);
    else if (id.startsWith('helm_') || id.startsWith('hood_') || id.startsWith('cap_') || id.startsWith('circlet_')) group = this.makeHeadgear(id);
    else if (id.startsWith('armor_') || id.startsWith('robe_') || id.startsWith('coat_')) group = this.makeBodyArmor(id);
    else group = this.makeAccessory(id);
    if (!group) return null;
    group.name = `equipment-visual:${item.instanceId}`;
    group.userData.equipmentVisual = true;
    group.userData.itemId = item.instanceId;
    if (item.broken) this.markBroken(group);
    return group;
  }

  createLootPile(drop) {
    const group = new THREE.Group();
    group.name = `loot-pile:${drop.id}`;
    const cloth = this.mat('loot-cloth', 0x5d4653, { roughness: 0.94 });
    const gold = this.mat('loot-gold', 0xe8c46a, { roughness: 0.3, metalness: 0.3, emissive: 0x4d3508 });
    const shadow = this.mat('loot-shadow', 0x211c26, { roughness: 1 });

    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.06, 8), cloth);
    mat.scale.z = 0.72;
    mat.position.y = 0.03;
    group.add(mat);

    const item = this.createItem(drop.item);
    if (item) {
      item.scale.setScalar(0.56);
      item.rotation.set(0.18, -0.55, Math.PI / 2.6);
      item.position.set(0, 0.28, 0);
      group.add(item);
    }

    for (let i = 0; i < 3; i += 1) {
      const fitting = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 9), gold);
      fitting.rotation.x = Math.PI / 2;
      fitting.position.set(-0.2 + i * 0.18, 0.11, 0.2 - (i % 2) * 0.12);
      group.add(fitting);
    }

    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.025, 6, 28), gold);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.045;
    glow.name = 'loot-glow';
    group.add(glow);

    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), shadow);
    peg.position.set(0.42, 0.24, -0.18);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.035), cloth);
    tag.position.set(0.42, 0.45, -0.18);
    tag.rotation.y = -0.25;
    group.add(peg, tag);
    return group;
  }

  makeSword(id) {
    const group = new THREE.Group();
    const bone = id === 'blade_bone';
    const rusty = id === 'sword_rusty';
    const metal = this.mat(bone ? 'bone-blade' : rusty ? 'rusted-steel' : 'clean-steel', bone ? 0xd8d0b5 : rusty ? 0x8d7163 : 0xcbd6dc, { roughness: bone ? 0.62 : rusty ? 0.76 : 0.28, metalness: bone ? 0 : 0.34 });
    const edge = this.mat('blade-edge', 0xe8edf0, { roughness: 0.22, metalness: 0.4 });
    const leather = this.mat('weapon-grip', 0x4a2f25, { roughness: 0.92 });
    const brass = this.mat('weapon-brass', 0xb68b45, { roughness: 0.42, metalness: 0.24 });

    const blade = new THREE.Mesh(new THREE.ConeGeometry(bone ? 0.12 : 0.1, 0.92, bone ? 6 : 4), metal);
    blade.position.y = 0.55;
    if (bone) blade.rotation.y = 0.2;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.58, 0.025), edge);
    fuller.position.set(0, 0.48, 0.08);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(bone ? 0.34 : 0.42, 0.075, 0.09), brass);
    guard.position.y = 0.06;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 8), leather);
    grip.position.y = -0.15;
    const pommel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), brass);
    pommel.position.y = -0.36;
    group.add(blade, fuller, guard, grip, pommel);

    if (rusty) {
      for (const [x, y] of [[0.05, 0.32], [-0.04, 0.58], [0.03, 0.75]]) {
        const rust = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), this.mat('rust-patch', 0x8b4932, { roughness: 0.96 }));
        rust.scale.set(1, 0.35, 0.22);
        rust.position.set(x, y, 0.09);
        group.add(rust);
      }
    }
    group.rotation.z = -0.16;
    return group;
  }

  makeDagger(id) {
    const group = this.makeSword(id === 'dagger_goblin' ? 'sword_rusty' : 'sword_iron');
    group.scale.setScalar(0.58);
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), this.mat('goblin-tooth', 0xd6c99d, { roughness: 0.7 }));
    tooth.position.set(0.16, -0.12, 0);
    tooth.rotation.z = Math.PI / 2;
    group.add(tooth);
    return group;
  }

  makeAxe() {
    const group = new THREE.Group();
    const wood = this.mat('axe-wood', 0x63412b, { roughness: 0.92 });
    const iron = this.mat('axe-iron', 0x858d8f, { roughness: 0.44, metalness: 0.3 });
    const leather = this.mat('axe-wrap', 0x34231d, { roughness: 0.94 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.18, 8), wood);
    shaft.position.y = 0.25;
    const bladeA = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.58, 4), iron);
    bladeA.rotation.z = -Math.PI / 2;
    bladeA.position.set(0.23, 0.77, 0);
    const bladeB = bladeA.clone();
    bladeB.rotation.z = Math.PI / 2;
    bladeB.position.x = -0.18;
    bladeB.scale.set(0.72, 0.72, 0.72);
    group.add(shaft, bladeA, bladeB);
    for (let i = 0; i < 4; i += 1) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.073, 0.012, 5, 12), leather);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.y = -0.2 + i * 0.07;
      group.add(wrap);
    }
    group.rotation.z = -0.18;
    return group;
  }

  makeBow(id) {
    const group = new THREE.Group();
    const yew = id === 'bow_yew';
    const wood = this.mat(yew ? 'yew-bow' : 'ash-bow', yew ? 0x745238 : 0x8d6a43, { roughness: 0.86 });
    const string = this.mat('bow-string', 0xd9d4c6, { roughness: 0.7 });
    const gripMat = this.mat('bow-grip', 0x3d2b23, { roughness: 0.94 });
    for (const side of [-1, 1]) {
      const limb = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 6, 22, Math.PI * 0.82), wood);
      limb.rotation.z = side > 0 ? -0.55 : Math.PI - 0.55;
      limb.position.y = side * 0.47;
      limb.scale.x = 0.55;
      group.add(limb);
    }
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8), gripMat);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.65, 5), string);
    cord.position.x = -0.33;
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 5), string);
    arrow.rotation.z = Math.PI / 2;
    arrow.position.x = 0.15;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), this.mat('arrow-head', 0xaeb7bb, { metalness: 0.3, roughness: 0.35 }));
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.79;
    group.add(grip, cord, arrow, head);
    group.rotation.z = -0.2;
    return group;
  }

  makeStaff(id) {
    const group = new THREE.Group();
    const crystal = id === 'staff_crystal';
    const wood = this.mat('staff-wood', 0x5f402d, { roughness: 0.9 });
    const metal = this.mat('staff-ring', 0xbba660, { metalness: 0.22, roughness: 0.4 });
    const gem = this.mat(crystal ? 'staff-prism' : 'staff-blue-gem', crystal ? 0xc5a8ff : 0x74cfff, { roughness: 0.12, transparent: true, opacity: 0.88, emissive: crystal ? 0x553a88 : 0x1d5577 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.42, 9), wood);
    shaft.position.y = 0.25;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 18), metal);
    crown.position.y = 0.98;
    const core = new THREE.Mesh(crystal ? new THREE.OctahedronGeometry(0.18, 0) : new THREE.DodecahedronGeometry(0.15, 0), gem);
    core.position.y = 0.98;
    group.add(shaft, crown, core);
    for (const angle of [-0.55, 0.55]) {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 5), metal);
      prong.position.set(Math.sin(angle) * 0.17, 0.88, 0);
      prong.rotation.z = angle;
      group.add(prong);
    }
    group.rotation.z = -0.12;
    return group;
  }

  makeMace(id) {
    const group = new THREE.Group();
    const saint = id === 'mace_saint';
    const wood = this.mat('mace-wood', 0x60402b, { roughness: 0.9 });
    const metal = this.mat(saint ? 'saint-brass' : 'pilgrim-brass', saint ? 0xe0c15e : 0xa8864f, { roughness: 0.38, metalness: 0.28, emissive: saint ? 0x493608 : 0 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), wood);
    shaft.position.y = 0.18;
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), metal);
    core.position.y = 0.72;
    group.add(shaft, core);
    for (let i = 0; i < 6; i += 1) {
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.12), metal);
      flange.position.y = 0.72;
      flange.rotation.y = i * Math.PI / 3;
      group.add(flange);
    }
    if (saint) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 20), metal);
      halo.position.y = 0.73;
      halo.rotation.x = Math.PI / 2;
      group.add(halo);
    }
    group.rotation.z = -0.16;
    return group;
  }

  makeShield(id) {
    const group = new THREE.Group();
    const plank = id === 'shield_plank';
    const buckler = id === 'buckler_quiet';
    const wood = this.mat('shield-wood', 0x765035, { roughness: 0.9 });
    const metal = this.mat('shield-metal', buckler ? 0x5f6268 : 0x9aa3a8, { roughness: 0.45, metalness: 0.3 });
    const radius = buckler ? 0.25 : 0.36;
    const face = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.09, plank ? 10 : 18), plank ? wood : metal);
    face.rotation.x = Math.PI / 2;
    group.add(face);
    if (plank) {
      for (const x of [-0.18, 0, 0.18]) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.7, 0.035), wood);
        board.position.set(x, 0, 0.065);
        group.add(board);
      }
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 22), metal);
    rim.position.z = 0.08;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(buckler ? 0.1 : 0.12, 9, 6), metal);
    boss.scale.z = 0.45;
    boss.position.z = 0.11;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, 0.025, 6, 16, Math.PI), this.mat('shield-strap', 0x3b281f, { roughness: 0.95 }));
    strap.position.z = -0.08;
    group.add(rim, boss, strap);
    group.rotation.y = Math.PI / 2;
    return group;
  }

  makeBook(id) {
    const group = new THREE.Group();
    const reliquary = id === 'book_reliquary';
    const cover = this.mat(reliquary ? 'book-white-cover' : 'book-blue-cover', reliquary ? 0xd8d6ca : 0x3f5278, { roughness: 0.75 });
    const page = this.mat('book-pages', 0xe5dcc2, { roughness: 0.92 });
    const metal = this.mat('book-clasp', 0xc19b50, { metalness: 0.22, roughness: 0.42 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.14), cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.15), page);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), cover);
    spine.position.x = -0.2;
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), metal);
    clasp.position.x = 0.2;
    group.add(body, pages, spine, clasp);
    if (reliquary) {
      const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.025), metal);
      crossA.position.z = 0.09;
      const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.025), metal);
      crossB.position.z = 0.09;
      group.add(crossA, crossB);
    }
    group.rotation.z = 0.18;
    return group;
  }

  makeHeadgear(id) {
    const group = new THREE.Group();
    if (id === 'hood_leather' || id === 'cap_spider_silk') {
      const silk = id === 'cap_spider_silk';
      const material = this.mat(silk ? 'silk-cap' : 'leather-hood', silk ? 0xbfcbd5 : 0x4a352b, { roughness: silk ? 0.58 : 0.9 });
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.39, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), material);
      hood.position.y = -0.05;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 7), material);
      tail.position.set(0, 0.05, -0.28);
      tail.rotation.x = -0.48;
      group.add(hood, tail);
      if (silk) {
        for (let i = 0; i < 3; i += 1) {
          const thread = new THREE.Mesh(new THREE.TorusGeometry(0.23 + i * 0.04, 0.01, 5, 18, Math.PI), this.mat('silk-thread', 0xe7eff4, { transparent: true, opacity: 0.72 }));
          thread.rotation.x = Math.PI / 2;
          thread.position.y = -0.02 + i * 0.06;
          group.add(thread);
        }
      }
      return group;
    }
    if (id === 'circlet_bone') {
      const bone = this.mat('circlet-bone', 0xd9d0b6, { roughness: 0.68 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 22), bone);
      band.rotation.x = Math.PI / 2;
      for (const x of [-0.2, 0, 0.2]) {
        const tine = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 5), bone);
        tine.position.set(x, 0.16, 0.2);
        group.add(tine);
      }
      group.add(band);
      return group;
    }
    const iron = this.mat('helmet-iron', 0x9ba3a5, { roughness: 0.42, metalness: 0.32 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), iron);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.34, 0.08), iron);
    nose.position.set(0, -0.12, 0.34);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 22), iron);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.04;
    group.add(dome, nose, rim);
    return group;
  }

  makeBodyArmor(id) {
    const group = new THREE.Group();
    const chain = id === 'armor_chain';
    const bone = id === 'armor_bone';
    const silk = id === 'robe_spider_silk';
    const slime = id === 'coat_slime';
    const leather = id === 'armor_leather';
    const material = this.mat(id, bone ? 0xd1c6aa : chain ? 0x9ba4a8 : silk ? 0xaebbc8 : slime ? 0x5ba68f : 0x6d4933, {
      roughness: slime ? 0.25 : chain ? 0.48 : 0.78,
      metalness: chain ? 0.28 : 0,
      transparent: slime,
      opacity: slime ? 0.72 : 1
    });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.46), material);
    chest.position.y = -0.03;
    group.add(chest);

    if (chain) {
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10), material);
          ring.position.set(x * 0.12, y * 0.12, 0.25);
          group.add(ring);
        }
      }
    }
    if (bone) {
      for (const side of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), material);
        plate.position.set(side * 0.22, 0, 0.28);
        plate.rotation.z = side * 0.25;
        group.add(plate);
      }
      const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.1), material);
      sternum.position.z = 0.31;
      group.add(sternum);
    }
    if (silk) {
      for (let i = 0; i < 4; i += 1) {
        const sash = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 5, 18, Math.PI), this.mat('robe-silk-thread', 0xe1e8ed, { transparent: true, opacity: 0.7 }));
        sash.rotation.z = Math.PI / 2;
        sash.position.y = -0.24 + i * 0.16;
        group.add(sash);
      }
    }
    if (leather || slime) {
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.04), this.mat('armor-strap', 0x3d2b22, { roughness: 0.94 }));
        strap.position.set(side * 0.18, 0, 0.25);
        strap.rotation.z = side * 0.22;
        group.add(strap);
      }
    }
    return group;
  }

  makeAccessory(id) {
    const group = new THREE.Group();
    if (id === 'core_slime') {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), this.mat('slime-core-item', 0x7de0bd, { transparent: true, opacity: 0.78, emissive: 0x1e6553 }));
      const cage = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 20), this.mat('accessory-brass', 0xc09d53, { metalness: 0.22, roughness: 0.42 }));
      cage.rotation.x = Math.PI / 2;
      group.add(core, cage);
    } else if (id === 'trophy_ogre') {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.54, 7), this.mat('ogre-tooth-item', 0xd8c6a2, { roughness: 0.72 }));
      tooth.rotation.z = 0.3;
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 5, 18, Math.PI), this.mat('accessory-cord', 0x422c23, { roughness: 0.95 }));
      group.add(tooth, cord);
    } else {
      const dark = id === 'locket_necrotic';
      const metal = this.mat(dark ? 'necrotic-silver' : 'goblin-brass', dark ? 0x7e8292 : 0xb89248, { metalness: 0.24, roughness: 0.42, emissive: dark ? 0x241d38 : 0 });
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 5, 20, Math.PI), this.mat('accessory-cord', 0x422c23, { roughness: 0.95 }));
      const pendant = new THREE.Mesh(dark ? new THREE.OctahedronGeometry(0.12, 0) : new THREE.CylinderGeometry(0.11, 0.11, 0.035, 9), metal);
      pendant.rotation.x = Math.PI / 2;
      pendant.position.y = -0.2;
      group.add(cord, pendant);
      if (!dark) {
        for (let i = 0; i < 3; i += 1) {
          const button = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), metal);
          button.rotation.x = Math.PI / 2;
          button.position.set(-0.1 + i * 0.1, -0.12 - i * 0.05, 0);
          group.add(button);
        }
      }
    }
    return group;
  }

  markBroken(group) {
    group.rotation.z += 0.22;
    group.scale.multiplyScalar(0.94);
    group.traverse(child => {
      if (child.material?.color) child.material = child.material.clone();
      if (child.material?.color) child.material.color.multiplyScalar(0.58);
    });
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.65,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.58 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}
