import { THREE } from './ThreeScene.js';

export class FacilityAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  create(prop) {
    switch (prop.type) {
      case 'dungeon_entrance': return this.makeDungeonEntrance();
      case 'water_fountain': return this.makeWaterFountain();
      case 'rest_site': return this.makeRestSite();
      case 'camp_site': return this.makeCampSite();
      case 'merchant_stall': return this.makeMerchantStall();
      case 'goddess_statue': return this.makeGoddessStatue();
      default: return null;
    }
  }

  makeDungeonEntrance() {
    const group = new THREE.Group();
    group.name = 'facility:dungeon-entrance';
    const stone = this.mat('stone', 0x5d5664, { roughness: 0.86 });
    const darkStone = this.mat('dark-stone', 0x312e39, { roughness: 0.92 });
    const wood = this.mat('wood', 0x744a2f, { roughness: 0.78 });
    const iron = this.mat('iron', 0x8d9298, { roughness: 0.42, metalness: 0.28 });
    const gold = this.mat('entrance-gold', 0xe3b955, { roughness: 0.38, metalness: 0.18 });

    const base = this.box(3.5, 0.16, 1.15, darkStone, [0, 0.08, 0]);
    group.add(base);
    for (const side of [-1, 1]) {
      const plinth = this.box(0.65, 0.28, 0.72, darkStone, [side * 1.28, 0.22, 0]);
      const pillar = this.box(0.48, 2.05, 0.52, stone, [side * 1.28, 1.36, 0]);
      const cap = this.box(0.68, 0.2, 0.68, darkStone, [side * 1.28, 2.42, 0]);
      group.add(plinth, pillar, cap);

      const lantern = this.makeLantern(gold);
      lantern.position.set(side * 1.28, 1.72, 0.42);
      lantern.name = 'facility-glow';
      group.add(lantern);

      const queuePost = this.cylinder(0.08, 0.08, 0.72, 8, iron, [side * 1.75, 0.44, 0.36]);
      const postTop = this.sphere(0.13, gold, [side * 1.75, 0.82, 0.36]);
      group.add(queuePost, postTop);
    }

    const lintel = this.box(3.05, 0.38, 0.58, stone, [0, 2.46, 0]);
    const crest = this.mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.09, 10), gold);
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 2.5, 0.34);
    group.add(lintel, crest);

    for (const side of [-1, 1]) {
      const door = this.box(1.05, 1.8, 0.15, wood, [side * 0.58, 1.08, side * -0.34]);
      door.rotation.y = side * 0.62;
      const brace = this.box(0.12, 1.45, 0.18, iron, [0, 0, 0.02]);
      door.add(brace);
      group.add(door);
    }

    const sign = this.box(1.45, 0.38, 0.12, wood, [0, 2.08, 0.4]);
    const signMark = this.mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 18), gold);
    signMark.rotation.x = Math.PI / 2;
    signMark.position.set(0, 0, 0.08);
    sign.add(signMark);
    group.add(sign);

    const rope = this.mesh(new THREE.TorusGeometry(1.75, 0.025, 5, 32, Math.PI), this.mat('rope', 0xa88455, { roughness: 0.9 }));
    rope.rotation.x = Math.PI / 2;
    rope.rotation.z = Math.PI;
    rope.position.set(0, 0.64, 0.36);
    group.add(rope);
    return group;
  }

  makeWaterFountain() {
    const group = new THREE.Group();
    group.name = 'facility:water-fountain';
    const stone = this.mat('fountain-stone', 0x7d8290, { roughness: 0.78 });
    const dark = this.mat('fountain-dark', 0x434854, { roughness: 0.88 });
    const water = this.mat('water', 0x5fc9dc, { roughness: 0.12, transparent: true, opacity: 0.76, emissive: 0x154b59 });
    const metal = this.mat('bucket-metal', 0xa6adb3, { roughness: 0.38, metalness: 0.3 });
    const wood = this.mat('bucket-wood', 0x7b5537, { roughness: 0.8 });

    const lower = this.cylinder(0.9, 1.02, 0.28, 16, dark, [0, 0.14, 0]);
    const basin = this.mesh(new THREE.CylinderGeometry(0.92, 0.72, 0.35, 18, 1, true), stone);
    basin.position.y = 0.43;
    const waterDisc = this.cylinder(0.73, 0.73, 0.035, 18, water, [0, 0.59, 0]);
    waterDisc.name = 'facility-water';
    const pedestal = this.cylinder(0.22, 0.34, 0.88, 10, stone, [0, 0.92, 0]);
    const bowl = this.mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stone);
    bowl.rotation.x = Math.PI;
    bowl.position.y = 1.36;
    const spout = this.mesh(new THREE.TorusGeometry(0.23, 0.055, 7, 18, Math.PI * 1.15), metal);
    spout.rotation.z = Math.PI / 2;
    spout.position.set(0.14, 1.58, 0);
    const stream = this.cylinder(0.035, 0.025, 0.62, 7, water, [0.37, 1.23, 0]);
    stream.name = 'facility-water';
    group.add(lower, basin, waterDisc, pedestal, bowl, spout, stream);

    const bucket = new THREE.Group();
    const bucketBody = this.mesh(new THREE.CylinderGeometry(0.23, 0.28, 0.42, 10, 1, true), wood);
    const bandA = this.mesh(new THREE.TorusGeometry(0.25, 0.025, 5, 16), metal);
    const bandB = bandA.clone();
    bandA.rotation.x = Math.PI / 2;
    bandB.rotation.x = Math.PI / 2;
    bandA.position.y = 0.14;
    bandB.position.y = -0.14;
    bucket.add(bucketBody, bandA, bandB);
    bucket.position.set(0.95, 0.25, 0.48);
    bucket.rotation.z = -0.12;
    group.add(bucket);
    return group;
  }

  makeRestSite() {
    const group = new THREE.Group();
    group.name = 'facility:rest-site';
    const wood = this.mat('rest-wood', 0x75533b, { roughness: 0.84 });
    const darkWood = this.mat('rest-dark-wood', 0x463126, { roughness: 0.9 });
    const cloth = this.mat('rest-cloth', 0x536a78, { roughness: 0.92 });
    const warm = this.mat('candle', 0xffd67b, { roughness: 0.3, emissive: 0x7a3e0a });
    const wax = this.mat('wax', 0xe8dfc8, { roughness: 0.8 });

    const rug = this.box(3.1, 0.035, 1.8, cloth, [0, 0.02, 0]);
    group.add(rug);
    for (const side of [-1, 1]) {
      const bench = new THREE.Group();
      const seat = this.box(1.15, 0.16, 0.42, wood, [0, 0.52, 0]);
      const back = this.box(1.15, 0.58, 0.12, darkWood, [0, 0.85, -0.18]);
      const legL = this.box(0.12, 0.5, 0.12, darkWood, [-0.42, 0.25, 0]);
      const legR = this.box(0.12, 0.5, 0.12, darkWood, [0.42, 0.25, 0]);
      bench.add(seat, back, legL, legR);
      bench.position.set(side * 1.05, 0, 0);
      bench.rotation.y = side * -0.18;
      group.add(bench);
    }

    const table = this.cylinder(0.42, 0.5, 0.1, 10, wood, [0, 0.48, 0.2]);
    const tableLeg = this.cylinder(0.09, 0.13, 0.45, 8, darkWood, [0, 0.24, 0.2]);
    group.add(table, tableLeg);
    for (const x of [-0.17, 0.17]) {
      const candle = this.cylinder(0.045, 0.05, 0.24, 8, wax, [x, 0.66, 0.2]);
      const flame = this.mesh(new THREE.ConeGeometry(0.055, 0.16, 7), warm);
      flame.position.set(x, 0.85, 0.2);
      flame.name = 'facility-flame';
      group.add(candle, flame);
    }
    return group;
  }

  makeCampSite() {
    const group = new THREE.Group();
    group.name = 'facility:camp-site';
    const ash = this.mat('camp-ash', 0x39343a, { roughness: 0.96 });
    const wood = this.mat('camp-log', 0x684126, { roughness: 0.9 });
    const iron = this.mat('camp-iron', 0x73777c, { roughness: 0.44, metalness: 0.28 });
    const clothA = this.mat('bedroll-a', 0x76574e, { roughness: 0.95 });
    const clothB = this.mat('bedroll-b', 0x465d69, { roughness: 0.95 });
    const ember = this.mat('ember', 0xf27736, { roughness: 0.25, emissive: 0x8c2405 });
    const flameMat = this.mat('flame', 0xffc45b, { roughness: 0.18, transparent: true, opacity: 0.86, emissive: 0xff6b12 });

    const fireRing = this.mesh(new THREE.TorusGeometry(0.58, 0.13, 7, 18), ash);
    fireRing.rotation.x = Math.PI / 2;
    fireRing.position.y = 0.12;
    group.add(fireRing);
    for (let i = 0; i < 4; i += 1) {
      const log = this.cylinder(0.09, 0.11, 1.0, 8, wood, [0, 0.18, 0]);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = i * Math.PI / 4;
      group.add(log);
    }
    const emberCore = this.sphere(0.28, ember, [0, 0.28, 0]);
    const flameA = this.mesh(new THREE.ConeGeometry(0.23, 0.78, 9), flameMat);
    flameA.position.y = 0.68;
    flameA.name = 'facility-flame';
    const flameB = this.mesh(new THREE.ConeGeometry(0.15, 0.52, 8), flameMat);
    flameB.position.set(0.12, 0.56, -0.04);
    flameB.rotation.z = -0.22;
    flameB.name = 'facility-flame';
    group.add(emberCore, flameA, flameB);

    const tripod = new THREE.Group();
    for (const side of [-1, 0, 1]) {
      const leg = this.cylinder(0.025, 0.035, 1.65, 6, iron, [side * 0.22, 0.84, -0.04]);
      leg.rotation.z = side * 0.24;
      tripod.add(leg);
    }
    const pot = this.mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), iron);
    pot.position.set(0, 0.84, 0);
    tripod.add(pot);
    group.add(tripod);

    const bedrollA = this.makeBedroll(clothA);
    bedrollA.position.set(-1.28, 0.13, 0.55);
    bedrollA.rotation.y = 0.32;
    const bedrollB = this.makeBedroll(clothB);
    bedrollB.position.set(1.22, 0.13, 0.64);
    bedrollB.rotation.y = -0.28;
    group.add(bedrollA, bedrollB);

    const crate = this.makeCrate();
    crate.position.set(1.35, 0.32, -0.75);
    crate.scale.setScalar(0.72);
    group.add(crate);
    const sack = this.mesh(new THREE.SphereGeometry(0.3, 9, 7), clothA);
    sack.scale.set(0.8, 1.2, 0.65);
    sack.position.set(-1.28, 0.34, -0.72);
    group.add(sack);
    return group;
  }

  makeMerchantStall() {
    const group = new THREE.Group();
    group.name = 'facility:merchant-stall';
    const wood = this.mat('stall-wood', 0x765039, { roughness: 0.82 });
    const darkWood = this.mat('stall-dark', 0x432d24, { roughness: 0.9 });
    const canopy = this.mat('stall-canopy', 0x7b3f54, { roughness: 0.92 });
    const trim = this.mat('stall-trim', 0xd6b56c, { roughness: 0.56 });
    const glass = this.mat('potion-glass', 0x83d7df, { roughness: 0.14, transparent: true, opacity: 0.68, emissive: 0x123c46 });
    const potionA = this.mat('potion-a', 0xb95576, { roughness: 0.22, transparent: true, opacity: 0.82, emissive: 0x421226 });
    const potionB = this.mat('potion-b', 0x72b966, { roughness: 0.22, transparent: true, opacity: 0.82, emissive: 0x173d12 });

    const floor = this.box(3.2, 0.12, 1.65, darkWood, [0, 0.06, 0]);
    const counter = this.box(2.55, 0.72, 0.48, wood, [0, 0.48, 0.38]);
    group.add(floor, counter);
    for (const x of [-1.35, 1.35]) {
      const post = this.box(0.13, 2.05, 0.13, darkWood, [x, 1.08, 0]);
      group.add(post);
    }
    const roof = this.box(3.25, 0.12, 1.82, canopy, [0, 2.1, 0]);
    roof.rotation.z = -0.03;
    const roofTrim = this.box(3.32, 0.12, 0.12, trim, [0, 2.03, 0.88]);
    group.add(roof, roofTrim);

    const shelf = this.box(2.45, 0.1, 0.34, darkWood, [0, 1.18, -0.55]);
    const shelfBack = this.box(2.45, 0.72, 0.1, wood, [0, 1.48, -0.7]);
    group.add(shelf, shelfBack);
    const colors = [potionA, potionB, glass, potionA, potionB, glass];
    colors.forEach((material, index) => {
      const bottle = this.makePotionBottle(material, glass);
      bottle.position.set(-0.95 + index * 0.38, 1.43, -0.42);
      bottle.scale.setScalar(index % 2 ? 0.9 : 1.08);
      group.add(bottle);
    });

    const crateA = this.makeCrate();
    crateA.position.set(-1.15, 0.36, -0.52);
    crateA.scale.setScalar(0.68);
    const crateB = this.makeCrate();
    crateB.position.set(1.12, 0.3, -0.5);
    crateB.scale.setScalar(0.56);
    crateB.rotation.y = 0.18;
    group.add(crateA, crateB);

    const lantern = this.makeLantern(trim);
    lantern.position.set(1.22, 1.68, 0.2);
    lantern.name = 'facility-glow';
    group.add(lantern);
    const banner = this.box(0.5, 0.82, 0.04, canopy, [-1.38, 1.55, 0.2]);
    const badge = this.mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 16), trim);
    badge.rotation.x = Math.PI / 2;
    badge.position.z = 0.04;
    banner.add(badge);
    group.add(banner);
    return group;
  }

  makeGoddessStatue() {
    const group = new THREE.Group();
    group.name = 'facility:goddess-statue';
    const marble = this.mat('marble', 0xcfd3df, { roughness: 0.54 });
    const pale = this.mat('pale-marble', 0xe8eaf2, { roughness: 0.5 });
    const gold = this.mat('divine-gold', 0xefd47d, { roughness: 0.32, metalness: 0.16, emissive: 0x55410a });
    const glow = this.mat('divine-glow', 0xbddcff, { roughness: 0.1, transparent: true, opacity: 0.58, emissive: 0x335c84 });

    const baseA = this.cylinder(1.05, 1.18, 0.28, 16, marble, [0, 0.14, 0]);
    const baseB = this.cylinder(0.78, 0.93, 0.34, 14, pale, [0, 0.45, 0]);
    const robe = this.mesh(new THREE.ConeGeometry(0.56, 1.48, 12), marble);
    robe.position.y = 1.33;
    const torso = this.mesh(new THREE.CapsuleGeometry(0.3, 0.44, 4, 9), pale);
    torso.position.y = 2.04;
    const head = this.sphere(0.27, pale, [0, 2.55, 0]);
    group.add(baseA, baseB, robe, torso, head);

    for (const side of [-1, 1]) {
      const arm = this.mesh(new THREE.CapsuleGeometry(0.075, 0.72, 3, 7), pale);
      arm.position.set(side * 0.42, 2.05, 0.08);
      arm.rotation.z = side * -0.82;
      const hand = this.sphere(0.1, pale, [side * 0.69, 1.82, 0.1]);
      group.add(arm, hand);

      const wing = this.mesh(new THREE.ConeGeometry(0.42, 1.35, 7), marble);
      wing.scale.z = 0.25;
      wing.position.set(side * 0.52, 2.02, -0.22);
      wing.rotation.z = side * -0.4;
      wing.rotation.x = -0.28;
      group.add(wing);
    }

    const halo = this.mesh(new THREE.TorusGeometry(0.48, 0.045, 8, 28), gold);
    halo.position.set(0, 2.62, -0.12);
    halo.name = 'facility-glow';
    const orb = this.sphere(0.2, glow, [0, 1.72, 0.42]);
    orb.name = 'facility-orb';
    const prayerRing = this.mesh(new THREE.TorusGeometry(1.25, 0.035, 8, 36), glow);
    prayerRing.rotation.x = Math.PI / 2;
    prayerRing.position.y = 0.05;
    prayerRing.name = 'facility-glow';
    group.add(halo, orb, prayerRing);

    for (let i = 0; i < 4; i += 1) {
      const candle = this.cylinder(0.04, 0.05, 0.2, 7, pale, [Math.cos(i * Math.PI / 2) * 0.82, 0.42, Math.sin(i * Math.PI / 2) * 0.82]);
      const flame = this.mesh(new THREE.ConeGeometry(0.045, 0.13, 7), gold);
      flame.position.set(candle.position.x, 0.59, candle.position.z);
      flame.name = 'facility-flame';
      group.add(candle, flame);
    }
    return group;
  }

  makeBedroll(material) {
    const group = new THREE.Group();
    const mattress = this.box(1.0, 0.16, 0.54, material, [0, 0, 0]);
    const roll = this.cylinder(0.16, 0.16, 0.54, 10, material, [-0.48, 0.13, 0]);
    roll.rotation.x = Math.PI / 2;
    const strap = this.mesh(new THREE.TorusGeometry(0.17, 0.025, 5, 12), this.mat('bedroll-strap', 0x4f3526, { roughness: 0.9 }));
    strap.rotation.x = Math.PI / 2;
    strap.position.set(-0.48, 0.13, 0);
    group.add(mattress, roll, strap);
    return group;
  }

  makeCrate() {
    const group = new THREE.Group();
    const wood = this.mat('crate-wood', 0x765037, { roughness: 0.86 });
    const dark = this.mat('crate-dark', 0x493124, { roughness: 0.9 });
    const box = this.box(0.82, 0.7, 0.72, wood, [0, 0, 0]);
    group.add(box);
    for (const x of [-0.35, 0.35]) group.add(this.box(0.08, 0.74, 0.76, dark, [x, 0, 0]));
    group.add(this.box(0.86, 0.08, 0.76, dark, [0, 0.28, 0]));
    return group;
  }

  makePotionBottle(liquid, glass) {
    const group = new THREE.Group();
    const bottle = this.mesh(new THREE.SphereGeometry(0.12, 10, 8), liquid);
    bottle.scale.y = 1.2;
    const neck = this.cylinder(0.045, 0.055, 0.18, 8, glass, [0, 0.17, 0]);
    const cork = this.cylinder(0.04, 0.045, 0.07, 7, this.mat('cork', 0x9c7447, { roughness: 0.95 }), [0, 0.29, 0]);
    group.add(bottle, neck, cork);
    return group;
  }

  makeLantern(metal) {
    const group = new THREE.Group();
    const frame = this.mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 6, 1, true), metal);
    const light = this.cylinder(0.08, 0.1, 0.26, 8, this.mat('lantern-light', 0xffca66, { roughness: 0.18, transparent: true, opacity: 0.82, emissive: 0xff7b18 }), [0, 0, 0]);
    const top = this.mesh(new THREE.ConeGeometry(0.17, 0.15, 6), metal);
    top.position.y = 0.24;
    group.add(frame, light, top);
    return group;
  }

  box(w, h, d, material, position = [0, 0, 0]) {
    const mesh = this.mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(...position);
    return mesh;
  }

  cylinder(rt, rb, h, segments, material, position = [0, 0, 0]) {
    const mesh = this.mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
    mesh.position.set(...position);
    return mesh;
  }

  sphere(radius, material, position = [0, 0, 0]) {
    const mesh = this.mesh(new THREE.SphereGeometry(radius, 12, 9), material);
    mesh.position.set(...position);
    return mesh;
  }

  mesh(geometry, material) {
    return new THREE.Mesh(geometry, material);
  }

  mat(key, color, options = {}) {
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.65,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissive ? 0.65 : 0
    });
    this.materials.set(key, material);
    return material;
  }
}
