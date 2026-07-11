import { THREE } from './ThreeScene.js';
import { CommonDungeonArchitectureKit, createDungeonMaterials } from './CommonDungeonArchitectureKit.js';
import { box, createBarrel, createChain, createFloodedMaterials, createWaterSurface, cylinder } from './FloodedStorehouseGeometry.js';

export function createFloodedReservoirDiorama(context = {}) {
  const state = context.state ?? context.variant ?? 'shallow';
  const root = new THREE.Group(); root.name = 'flooded.reservoir.shallow';
  const common = new CommonDungeonArchitectureKit({ materials: createDungeonMaterials({ wet: 0x264d57 }), seed: context.seed ?? 211 });
  const m = createFloodedMaterials();
  common.addMasonryFloor(root, { width: 16.2, depth: 12.4, wetness: 0.9, damaged: 0.18, name: 'reservoir-masonry-floor' });
  common.addWallSegment(root, { width: 16.2, height: 3.8, position: [0, 1.9, -6.05], wetness: 0.9, damaged: 0.16, name: 'reservoir-back-wall' });
  common.addWallSegment(root, { width: 12.4, height: 3.8, position: [-7.85, 1.9, 0], rotationY: Math.PI / 2, wetness: 1, name: 'reservoir-side-wall-left' });
  common.addWallSegment(root, { width: 12.4, height: 3.8, position: [7.85, 1.9, 0], rotationY: Math.PI / 2, wetness: 1, name: 'reservoir-side-wall-right' });

  const basin = new THREE.Group(); basin.name = 'reservoir-basin'; root.add(basin);
  box(basin, [12.8, 0.35, 8.7], [0, -0.12, 0], m.deep, 'reservoir-bed');
  for (const side of [-1, 1]) box(basin, [0.42, 0.65, 9.1], [side * 6.55, 0.18, 0], common.materials.stoneDark, 'basin-curb');
  box(basin, [13.5, 0.65, 0.42], [0, 0.18, -4.55], common.materials.stoneDark, 'basin-curb');
  box(basin, [13.5, 0.65, 0.42], [0, 0.18, 4.55], common.materials.stoneDark, 'basin-curb');

  const waterY = state === 'overflowing' ? 0.72 : state === 'drained' ? -0.28 : 0.28;
  if (state !== 'drained') createWaterSurface(basin, 12.35, 8.25, waterY, m.water, 'water-surface');

  const walkway = new THREE.Group(); walkway.name = 'stone-walkway'; root.add(walkway);
  box(walkway, [2.1, 0.34, 10.4], [-5.6, 0.55, 0], common.materials.stone, 'walkway-left');
  box(walkway, [2.1, 0.34, 10.4], [5.6, 0.55, 0], common.materials.stone, 'walkway-right');
  box(walkway, [9.1, 0.34, 1.35], [0, 0.55, 3.65], common.materials.stoneLight, 'walkway-crossing');
  for (let i = 0; i < 5; i += 1) box(walkway, [1.2, 0.22, 0.9], [-2.4 + i * 1.2, 0.38, -1.25 + (i % 2) * 0.18], common.materials.stone, 'stepping-stone');

  const gate = new THREE.Group(); gate.name = 'sluice-gate'; gate.position.set(0, 0.2, -4.35); root.add(gate);
  box(gate, [4.4, 3.4, 0.32], [0, state === 'drained' ? 2.45 : 1.6, 0], m.iron, 'sluice-door');
  for (let i = -2; i <= 2; i += 1) box(gate, [0.12, 3.2, 0.12], [i * 0.82, state === 'drained' ? 2.45 : 1.6, 0.19], m.rust, 'sluice-reinforcement');
  createChain(gate, [-1.55, 4.25, 0], 12, 0.24, m.iron, 'hanging-chain');
  createChain(gate, [1.55, 4.25, 0], 12, 0.24, m.iron, 'hanging-chain');

  const gauge = new THREE.Group(); gauge.name = 'water-level-gauge'; gauge.position.set(7.45, 0.5, -3.2); root.add(gauge);
  box(gauge, [0.18, 3.2, 0.16], [0, 1.6, 0], m.brass, 'gauge-rail');
  for (let i = 0; i < 9; i += 1) box(gauge, [0.55, 0.045, 0.08], [-0.18, i * 0.36, 0.08], i > 6 ? m.warning : m.iron, 'gauge-mark');

  const intake = new THREE.Group(); intake.name = 'pump-intake'; intake.position.set(-5.4, 0.3, -2.9); root.add(intake);
  cylinder(intake, [0.7, 0.7, 1.9, 14], [0, 0.3, 0], m.rust, 'intake-pipe', [Math.PI / 2, 0, 0]);
  common.addMetalGrate(root, { width: 2.4, depth: 2, position: [-2.2, 0.35, 3.55], name: 'drain-grate' });

  if (state === 'drained') {
    for (let i = 0; i < 12; i += 1) {
      const crack = box(basin, [0.05, 0.03, 0.8 + (i % 3) * 0.35], [-4.5 + (i % 6) * 1.8, -0.01, -2.4 + Math.floor(i / 6) * 4.4], common.materials.mortar, 'revealed-worker-mark');
      crack.rotation.y = i * 0.71;
    }
    common.addRubble(root, { count: 14, radius: 3.6, position: [1, 0.05, 0], name: 'drained-basin-debris' });
  }

  if (state === 'overflowing') {
    for (const x of [-6.25, 0, 6.25]) {
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.2), m.waterLight.clone());
      spill.position.set(x, 0.25, 4.72); spill.rotation.x = -0.08; spill.name = 'waterfall-sheet'; spill.userData.baseOpacity = spill.material.opacity; root.add(spill);
    }
    createBarrel(root, [-1.8, 0.88, 0.9], m.wood, m.iron, 'floating-barrel');
    createBarrel(root, [2.3, 0.9, -1.2], m.wood, m.rust, 'floating-barrel');
  }

  root.userData.state = state; return root;
}
