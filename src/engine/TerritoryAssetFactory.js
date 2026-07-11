import { THREE } from './ThreeScene.js';

const FACTION_COLORS = {
  'undead-host': 0x9a8fc2,
  'goblin-clan': 0x8fae58,
  'red-tusk-tribe': 0xb85f4d,
  'copper-tail-clutch': 0xc98b46,
  'bluecap-colony': 0x6f9cc4,
  'red-wing-brood': 0xa64e68,
  'carrion-brood': 0x9c8c4f,
  'pale-brood': 0xd4c9ad,
  'slime-bloom': 0x64c6a5,
  'ogre-solitary': 0x7e6a55,
  'warren-vermin': 0x8b7666
};

export class TerritoryAssetFactory {
  createProp(prop) {
    if (prop.type === 'territory_resource') return this.resource(prop);
    if (prop.type === 'territory_banner') return this.banner(prop);
    if (prop.type === 'barricade') return this.barricade(prop);
    if (prop.type === 'watch_post') return this.watchPost(prop);
    return null;
  }

  createControlRing(state) {
    const color = factionColor(state.owner);
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: state.contested ? 0.72 : 0.42 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 7, 32), material);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'territory-ring';
    group.add(ring);
    for (let i = 0; i < 4; i += 1) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.32), material);
      mark.position.set(Math.cos(i * Math.PI / 2) * 0.72, 0, Math.sin(i * Math.PI / 2) * 0.72);
      mark.rotation.y = i * Math.PI / 2;
      group.add(mark);
    }
    return group;
  }

  resource(prop) {
    const group = new THREE.Group();
    const dark = mat(0x2e2b2b, 0.96);
    const metal = mat(0x8f9698, 0.48, 0.3);
    const bone = mat(0xd4cbb3, 0.72);
    const food = mat(0x9a7146, 0.9);
    const glow = new THREE.MeshStandardMaterial({ color: 0x78cdb0, emissive: 0x225c4c, emissiveIntensity: 0.6, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.08, 10), dark);
    base.position.y = 0.04;
    group.add(base);
    const type = prop.visualType;
    for (let i = 0; i < 7; i += 1) {
      let piece;
      if (type === 'bone_quarry') piece = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6), bone);
      else if (type === 'scrap_heap') piece = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.48), metal);
      else if (type === 'biomass_patch') piece = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow);
      else if (type === 'death_font') piece = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), new THREE.MeshStandardMaterial({ color: 0x9b8ed0, emissive: 0x3d315f, emissiveIntensity: 0.7, roughness: 0.25 }));
      else piece = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), food);
      piece.position.set(Math.cos(i * 1.9) * (0.18 + (i % 3) * 0.1), 0.13 + (i % 2) * 0.12, Math.sin(i * 1.9) * (0.18 + (i % 3) * 0.1));
      piece.rotation.set(i * 0.3, i * 0.6, i * 0.22);
      group.add(piece);
    }
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 6, 26), new THREE.MeshBasicMaterial({ color: 0xd9c06d, transparent: true, opacity: 0.7 }));
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.07;
    marker.name = 'resource-glow';
    group.add(marker);
    return group;
  }

  banner(prop) {
    const group = new THREE.Group();
    const color = factionColor(prop.ecologyFaction);
    const wood = mat(0x5d402d, 0.92);
    const cloth = mat(color, 0.82);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.55, 8), wood);
    pole.position.y = 0.78;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.045), cloth);
    flag.position.set(0.36, 1.15, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 6), mat(0xb8a36a, 0.45, 0.2));
    tip.position.y = 1.66;
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.08), wood);
    brace.position.set(0.22, 0.32, 0);
    brace.rotation.z = -0.65;
    group.add(pole, flag, tip, brace);
    return group;
  }

  barricade(prop) {
    const group = new THREE.Group();
    const wood = mat(0x65452f, 0.94);
    const iron = mat(0x85898a, 0.54, 0.22);
    for (let i = -2; i <= 2; i += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9 + (i % 2) * 0.16, 0.14), wood);
      plank.position.set(i * 0.24, 0.48, 0);
      plank.rotation.z = i * 0.04;
      group.add(plank);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 5), iron);
      spike.position.set(i * 0.24, 1.02 + (i % 2) * 0.08, 0);
      group.add(spike);
    }
    for (const y of [0.28, 0.66]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.2), wood);
      beam.position.y = y;
      group.add(beam);
    }
    return group;
  }

  watchPost(prop) {
    const group = new THREE.Group();
    const wood = mat(0x60422f, 0.92);
    const rope = mat(0x9a7b52, 0.96);
    const color = factionColor(prop.ecologyFaction);
    for (const x of [-0.46, 0.46]) for (const z of [-0.38, 0.38]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 1.25, 7), wood);
      leg.position.set(x, 0.62, z);
      group.add(leg);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 1.05), wood);
    platform.position.y = 1.18;
    group.add(platform);
    for (let i = -2; i <= 2; i += 1) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.08), wood);
      rail.position.set(i * 0.24, 1.45, -0.48);
      group.add(rail);
    }
    const ladder = new THREE.Group();
    for (const x of [-0.18, 0.18]) {
      const side = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.2, 6), wood);
      side.position.set(x, 0.58, 0.57);
      ladder.add(side);
    }
    for (let i = 0; i < 5; i += 1) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 6), rope);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.18 + i * 0.22, 0.57);
      ladder.add(rung);
    }
    group.add(ladder);
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 3), mat(color, 0.82));
    pennant.rotation.z = -Math.PI / 2;
    pennant.position.set(0.36, 1.9, 0);
    group.add(pennant);
    return group;
  }
}

export function factionColor(faction) {
  return FACTION_COLORS[faction] ?? hashColor(faction ?? 'neutral');
}

function hashColor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 0x555555 + (hash % 0x777777);
}

function mat(color, roughness = 0.7, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
