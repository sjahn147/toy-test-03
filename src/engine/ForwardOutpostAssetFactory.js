import { THREE } from './ThreeScene.js';
import { resolveOutpostProfile } from '../domain/OutpostProfiles.js';
import { factionColor } from './TerritoryAssetFactory.js';

export class ForwardOutpostAssetFactory {
  create(prop) {
    const profile = resolveOutpostProfile(prop.ecologyFaction, prop.species);
    const group = new THREE.Group();
    group.userData.outpostProfile = profile.id;
    group.add(this.base(prop));
    if (profile.id === 'bone-reliquary') this.addBoneReliquary(group, prop);
    else if (profile.id === 'scrap-palisade' || profile.id === 'scavenger-workyard') this.addScrapPalisade(group, prop);
    else if (profile.id === 'war-totem-camp' || profile.id === 'stone-cairn') this.addWarTotemCamp(group, prop);
    else if (profile.id === 'spore-garden') this.addSporeNest(group, prop);
    else if (profile.id === 'brood-nest') this.addSilkWatchpost(group, prop);
    else this.addFrontierCamp(group, prop);
    return group;
  }

  animate(root, prop, time) {
    const elapsed = Number.isFinite(time) ? time : 0;
    root.traverse(node => {
      if (node.name === 'outpost-flame') node.scale.y = 0.82 + Math.sin(elapsed * 8 + node.id) * 0.18;
      if (node.name === 'outpost-spore') node.position.y = node.userData.baseY + (elapsed * 0.12 + node.userData.phase) % 0.65;
      if (node.name === 'outpost-banner') node.rotation.y = Math.sin(elapsed * 2.1 + node.id) * 0.08;
      if (node.name === 'outpost-silk') node.rotation.z = node.userData.baseRotationZ + Math.sin(elapsed * 1.5 + node.id) * 0.035;
      if (node.name === 'soul-flame') node.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 4 + node.id) * 0.18;
      if (node.name === 'spore-cap') node.scale.y = node.userData.baseScaleY * (0.94 + Math.sin(elapsed * 1.7 + node.id) * 0.06);
    });
  }

  base(prop) {
    const group = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, 0.12, 12), mat(0x302d2b, 0.94));
    ground.position.y = 0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.035, 7, 30), basic(factionColor(prop.ecologyFaction), 0.48));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.13;
    group.add(ground, ring);
    return group;
  }

  addScrapPalisade(group, prop) {
    const wood = mat(0x5f402c, 0.9);
    const scrap = mat(0x777d7e, 0.55, 0.32);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.9 + (i % 3) * 0.13, 6), i % 2 ? wood : scrap);
      post.position.set(Math.cos(angle) * 0.83, 0.52, Math.sin(angle) * 0.83);
      post.rotation.z = Math.sin(angle) * 0.14;
      group.add(post);
    }
    this.addFire(group, -0.25, 0.25, 0xe58b42);
    this.addBanner(group, prop, 0.15, -0.45);
  }

  addBoneReliquary(group, prop) {
    const bone = mat(0xd0c5ab, 0.78);
    const stone = mat(0x4a4851, 0.96);
    for (const x of [-0.5, 0, 0.5]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72 + Math.abs(x) * 0.4, 0.18), stone);
      slab.position.set(x, 0.45, 0.15);
      group.add(slab);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), bone);
      skull.scale.set(1, 0.82, 0.88);
      skull.position.set(x, 0.94 + Math.abs(x) * 0.18, 0.15);
      group.add(skull);
    }
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0x9f94d3, emissive: 0x453969, emissiveIntensity: 0.7, roughness: 0.25 }));
    flame.name = 'soul-flame';
    flame.position.set(0, 0.42, -0.4);
    group.add(flame);
    this.addBanner(group, prop, 0.55, -0.4);
  }

  addWarTotemCamp(group, prop) {
    const dark = mat(0x4f3027, 0.9);
    const ivory = mat(0xd4c3a0, 0.72);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.55, 7), dark);
    pole.position.y = 0.84;
    group.add(pole);
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.72, 7), ivory);
      tusk.position.set(side * 0.28, 1.25, 0);
      tusk.rotation.z = side * 0.55;
      group.add(tusk);
    }
    for (let i = 0; i < 3; i += 1) this.addFire(group, -0.55 + i * 0.55, -0.52, 0xd75d38);
    this.addBanner(group, prop, 0.45, 0.42);
  }

  addSporeNest(group, prop) {
    const stem = mat(0x756d82, 0.92);
    const cap = new THREE.MeshStandardMaterial({ color: factionColor(prop.ecologyFaction), emissive: 0x24384a, emissiveIntensity: 0.28, roughness: 0.62 });
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      const height = 0.45 + (i % 3) * 0.16;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, height, 7), stem);
      stalk.position.set(Math.cos(angle) * 0.55, height / 2 + 0.12, Math.sin(angle) * 0.55);
      const mushroom = new THREE.Mesh(new THREE.SphereGeometry(0.2 + (i % 2) * 0.05, 9, 6), cap);
      mushroom.name = 'spore-cap';
      mushroom.scale.y = 0.48;
      mushroom.userData.baseScaleY = mushroom.scale.y;
      mushroom.position.set(stalk.position.x, height + 0.13, stalk.position.z);
      group.add(stalk, mushroom);
    }
    for (let i = 0; i < 7; i += 1) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), basic(0x9fd2ce, 0.72));
      mote.name = 'outpost-spore';
      mote.userData.baseY = 0.4;
      mote.userData.phase = i * 0.11;
      mote.position.set(Math.cos(i * 2.2) * 0.55, mote.userData.baseY, Math.sin(i * 2.2) * 0.55);
      group.add(mote);
    }
  }

  addSilkWatchpost(group, prop) {
    const wood = mat(0x554438, 0.92);
    const silk = basic(0xd9d3ca, 0.48);
    for (const x of [-0.46, 0.46]) for (const z of [-0.42, 0.42]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 7), wood);
      leg.position.set(x, 0.65, z);
      group.add(leg);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.98), wood);
    platform.position.y = 1.18;
    group.add(platform);
    const web = new THREE.Group();
    web.name = 'silk-web';
    for (let i = 0; i < 5; i += 1) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 5), silk);
      strand.name = 'outpost-silk';
      strand.rotation.z = Math.PI / 2;
      strand.userData.baseRotationZ = strand.rotation.z;
      strand.rotation.y = i * Math.PI / 5;
      strand.position.y = 0.62 + (i % 2) * 0.14;
      web.add(strand);
    }
    group.add(web);
    this.addBanner(group, prop, 0.35, -0.48);
  }

  addFrontierCamp(group, prop) {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.92, 4), mat(0x71594a, 0.95));
    tent.rotation.y = Math.PI / 4;
    tent.position.set(-0.28, 0.54, 0.15);
    group.add(tent);
    this.addFire(group, 0.48, -0.18, 0xe19a54);
    this.addBanner(group, prop, 0.52, 0.42);
  }

  addFire(group, x, z, color) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 7), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.65, roughness: 0.35 }));
    flame.name = 'outpost-flame';
    flame.position.set(x, 0.35, z);
    group.add(flame);
  }

  addBanner(group, prop, x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.4, 7), mat(0x4e392b, 0.9));
    pole.position.set(x, 0.78, z);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.035), mat(factionColor(prop.ecologyFaction), 0.78));
    flag.name = 'outpost-banner';
    flag.position.set(x + 0.25, 1.18, z);
    group.add(pole, flag);
  }
}

function mat(color, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function basic(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}
