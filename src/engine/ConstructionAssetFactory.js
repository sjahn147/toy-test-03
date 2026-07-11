import { THREE } from './ThreeScene.js';
import { SETTLEMENT_FACTION_COLORS } from '../data/settlementConfig.js';

export class ConstructionAssetFactory {
  create(prop) {
    if (prop.type === 'supply_depot') return this.supplyDepot(prop);
    if (prop.type === 'gatehouse') return this.gatehouse(prop);
    if (prop.type === 'siege_workshop') return this.siegeWorkshop(prop);
    if (prop.type === 'ambush_post') return this.ambushPost(prop);
    return this.generic(prop);
  }

  supplyDepot(prop) {
    const group = base(prop);
    const wood = mat(0x745038);
    const iron = mat(0x585b62);
    for (let i = 0; i < 3; i += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.58), wood);
      crate.position.set((i - 1) * 0.62, 0.34 + (i === 1 ? 0.18 : 0), 0.05);
      group.add(crate);
      for (const z of [-0.24, 0.24]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.07), iron);
        band.position.set(crate.position.x, crate.position.y, z);
        group.add(band);
      }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 1.25), mat(0x8d6a43));
    roof.position.y = 0.92;
    roof.rotation.z = -0.05;
    group.add(roof);
    return group;
  }

  gatehouse(prop) {
    const group = base(prop);
    const stone = mat(0x77747b);
    const timber = mat(0x674632);
    for (const x of [-0.95, 0.95]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.55, 0.9), stone);
      tower.position.set(x, 0.78, 0);
      group.add(tower);
      for (let i = -1; i <= 1; i += 2) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.22), stone);
        merlon.position.set(x + i * 0.2, 1.68, 0);
        group.add(merlon);
      }
    }
    for (let i = -3; i <= 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.16), timber);
      bar.position.set(i * 0.22, 0.65, 0.05);
      group.add(bar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.22), timber);
    beam.position.set(0, 1.28, 0.05);
    group.add(beam);
    return group;
  }

  siegeWorkshop(prop) {
    const group = base(prop);
    const wood = mat(0x76533a);
    const iron = mat(0x4c5058);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.35), wood);
    frame.position.y = 0.18;
    group.add(frame);
    for (const x of [-0.8, 0.8]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), wood);
      support.position.set(x, 0.72, 0);
      group.add(support);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.8), wood);
    arm.position.set(0, 1.12, -0.2);
    arm.rotation.x = -0.45;
    group.add(arm);
    for (const x of [-0.65, 0.65]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 8, 20), iron);
      wheel.position.set(x, 0.38, 0.45);
      wheel.rotation.y = Math.PI / 2;
      group.add(wheel);
    }
    return group;
  }

  ambushPost(prop) {
    const group = base(prop);
    const wood = mat(0x5f4431);
    const cloth = mat(colorFor(prop), 0.86);
    for (const x of [-0.6, 0.6]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.35, 6), wood);
      stake.position.set(x, 0.68, 0);
      group.add(stake);
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.82), cloth);
    screen.position.set(0, 0.9, 0.02);
    group.add(screen);
    for (let i = 0; i < 5; i += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 5), wood);
      spike.position.set(-0.72 + i * 0.36, 0.27, -0.45);
      spike.rotation.x = -0.7;
      group.add(spike);
    }
    return group;
  }

  generic(prop) {
    const group = base(prop);
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1), mat(colorFor(prop)));
    core.position.y = 0.48;
    group.add(core);
    return group;
  }
}

function base(prop) {
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.12, 12), mat(0x514b4f));
  slab.position.y = 0.06;
  group.add(slab);
  group.userData.structureIntegrity = prop.integrity ?? 100;
  return group;
}

function colorFor(prop) {
  return SETTLEMENT_FACTION_COLORS[prop.structureFaction ?? prop.ecologyFaction] ?? 0x8b765a;
}

function mat(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: color === 0x4c5058 || color === 0x585b62 ? 0.45 : 0.05, transparent: opacity < 1, opacity });
}
