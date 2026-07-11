import { THREE } from './ThreeScene.js';
import { CommonDungeonArchitectureKit, createDungeonMaterials } from './CommonDungeonArchitectureKit.js';
import { box, createChain, createFloodedMaterials, createWaterSurface, cylinder } from './FloodedStorehouseGeometry.js';

export function createFloodedSluicePassageDiorama(context = {}) {
  const state = context.state ?? context.variant ?? 'open';
  const root = new THREE.Group(); root.name = 'flooded.sluice.passage';
  const common = new CommonDungeonArchitectureKit({ materials: createDungeonMaterials({ wet: 0x234b56 }), seed: context.seed ?? 419 });
  const m = createFloodedMaterials();
  common.addMasonryFloor(root, { width: 10.4, depth: 18, wetness: 0.95, damaged: state === 'flooded' ? 0.24 : 0.14, name: 'sluice-passage-floor' });
  common.addWallSegment(root, { width: 18, height: 5.4, position: [-5, 2.7, 0], rotationY: Math.PI / 2, wetness: 1, name: 'sluice-wall-left' });
  common.addWallSegment(root, { width: 18, height: 5.4, position: [5, 2.7, 0], rotationY: Math.PI / 2, wetness: 1, name: 'sluice-wall-right' });
  for (const z of [-7, 0, 7]) common.addArchway(root, { width: 9.7, height: 5.2, depth: 0.56, position: [0, 0, z], rotationY: Math.PI / 2, name: 'sluice-arch-rib' });

  const channel = new THREE.Group(); channel.name = 'sluice-channel'; root.add(channel);
  box(channel, [4.8, 0.3, 17.2], [0, -0.18, 0], m.deep, 'sluice-channel-bed');
  for (const side of [-1, 1]) box(channel, [0.34, 0.58, 17.4], [side * 2.56, 0.12, 0], common.materials.stoneDark, 'sluice-channel-curb');
  createWaterSurface(channel, 4.55, 17, state === 'flooded' ? 0.86 : 0.12, state === 'flooded' ? m.waterLight : m.water, 'water-surface');

  const catwalk = new THREE.Group(); catwalk.name = 'cargo-catwalk'; root.add(catwalk);
  for (const side of [-1, 1]) {
    box(catwalk, [2.1, 0.26, 17.2], [side * 3.7, 0.62, 0], common.materials.stone, 'cargo-walkway');
    for (let z = -8; z <= 8; z += 1.6) box(catwalk, [0.07, 0.92, 0.07], [side * 2.72, 1.1, z], m.iron, 'catwalk-post');
    box(catwalk, [0.08, 0.08, 16.4], [side * 2.72, 1.56, 0], m.iron, 'catwalk-rail');
  }

  for (const z of [-4.7, 4.7]) {
    const gate = new THREE.Group(); gate.name = 'lift-gate'; gate.position.set(0, 0, z); root.add(gate);
    const gateY = state === 'open' || state === 'fortified' ? 3.4 : 1.25;
    box(gate, [5.2, 3.4, 0.32], [0, gateY, 0], m.iron, 'lift-gate-leaf');
    for (let x = -2.2; x <= 2.2; x += 0.88) box(gate, [0.11, 3.15, 0.11], [x, gateY, 0.19], m.rust, 'gate-bar');
    cylinder(gate, [0.18, 0.18, 4.8, 10], [-1.8, 4.7, 0], m.brass, 'lift-screw');
    cylinder(gate, [0.18, 0.18, 4.8, 10], [1.8, 4.7, 0], m.brass, 'lift-screw');
    createChain(gate, [-1.8, 6.6, 0], 12, 0.22, m.iron, 'chain-hoist');
    createChain(gate, [1.8, 6.6, 0], 12, 0.22, m.iron, 'chain-hoist');
  }

  const warning = new THREE.Group(); warning.name = 'flood-warning'; warning.position.set(-4.3, 1.1, -7.2); root.add(warning);
  box(warning, [0.16, 2.8, 0.16], [0, 1.4, 0], m.iron, 'warning-post');
  box(warning, [1.15, 0.82, 0.12], [0.48, 2.55, 0], m.warning, 'warning-sign');

  if (state === 'flooded') {
    for (const z of [-7.2, 0, 7.2]) {
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.8), m.waterLight.clone()); spill.position.set(0, 1.05, z); spill.name = 'waterfall-sheet'; spill.userData.baseOpacity = spill.material.opacity; root.add(spill);
    }
    common.addRubble(root, { count: 18, radius: 4.1, position: [0, 0.6, 1], name: 'flood-borne-debris' });
  }

  if (state === 'fortified') {
    const fort = new THREE.Group(); fort.name = 'fortification-line'; fort.position.set(0, 0.6, -1.5); root.add(fort);
    for (let i = -3; i <= 3; i += 1) {
      const barricade = box(fort, [1.25, 1.2, 0.42], [i * 1.25, 0.6, Math.abs(i) * 0.13], i % 2 ? m.wood : m.iron, 'sluice-barricade'); barricade.rotation.y = i * 0.04;
      const spike = cylinder(fort, [0, 0.12, 1.6, 6], [i * 1.25, 1.35, -0.55], m.iron, 'defense-spike', [Math.PI / 2, 0, 0]); spike.rotation.x = Math.PI / 2;
    }
    box(fort, [2.5, 1.2, 1.8], [3.6, 0.6, 2.7], m.wood, 'cargo-check-post');
    box(fort, [1.7, 0.16, 1], [3.6, 1.28, 2.7], m.warning, 'checkpoint-table');
  }

  root.userData.state = state; return root;
}
