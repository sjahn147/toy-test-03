import { THREE } from './ThreeScene.js';
import { CommonDungeonArchitectureKit, createDungeonMaterials } from './CommonDungeonArchitectureKit.js';
import { box, createFloodedMaterials, createGear, createValveWheel, createWaterSurface, cylinder, pipeBetween } from './FloodedStorehouseGeometry.js';

export function createFloodedDrainageEngineDiorama(context = {}) {
  const state = context.state ?? context.variant ?? 'stalled';
  const root = new THREE.Group(); root.name = 'flooded.drainage.engine';
  const common = new CommonDungeonArchitectureKit({ materials: createDungeonMaterials({ wet: 0x264852, iron: 0x545b61 }), seed: context.seed ?? 307 });
  const m = createFloodedMaterials();
  common.addMasonryFloor(root, { width: 16.4, depth: 12.6, wetness: 0.72, damaged: state === 'sabotaged' ? 0.3 : 0.16, name: 'engine-hall-floor' });
  common.addWallSegment(root, { width: 16.4, height: 6.6, position: [0, 3.3, -6.1], wetness: 0.7, damaged: state === 'sabotaged' ? 0.22 : 0.08, name: 'engine-back-wall' });
  for (const x of [-7.4, 7.4]) common.addColumn(root, { height: 6.8, radius: 0.6, position: [x, 0, -5.45], cracked: state === 'sabotaged', name: 'engine-hall-column' });
  common.addDrainChannel(root, { length: 11.4, width: 1.5, position: [0, 0.1, 0], name: 'engine-tailrace' });

  const wheel = new THREE.Group(); wheel.name = 'drainage-waterwheel'; wheel.position.set(-3.8, 3.1, -0.4); wheel.rotation.y = Math.PI / 2; wheel.userData.spinSpeed = state === 'operational' ? 0.46 : 0; root.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.18, 10, 36), state === 'sabotaged' ? m.rust : m.iron); wheel.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.11, 8, 32), m.rust); wheel.add(inner);
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const spoke = box(wheel, [5.7, 0.13, 0.13], [0, 0, 0], i % 3 ? m.iron : m.brass, 'waterwheel-spoke'); spoke.rotation.z = angle;
    const paddle = box(wheel, [0.52, 0.86, 0.32], [Math.cos(angle) * 2.85, Math.sin(angle) * 2.85, 0], m.wood, 'waterwheel-paddle'); paddle.rotation.z = angle;
  }
  cylinder(wheel, [0.32, 0.32, 2.2, 12], [0, 0, 0], m.iron, 'waterwheel-axle', [Math.PI / 2, 0, 0]);

  const gears = new THREE.Group(); gears.name = 'gear-train'; gears.position.set(1.5, 2.2, -1); root.add(gears);
  const g1 = createGear(gears, [0, 0, 0], 1.55, 16, m.brass, 'gear-wheel'); g1.userData.spinSpeed = state === 'operational' ? -0.72 : 0;
  const g2 = createGear(gears, [2.25, -0.35, 0.08], 1.05, 13, m.iron, 'gear-wheel'); g2.userData.spinSpeed = state === 'operational' ? 1.08 : 0;
  const g3 = createGear(gears, [3.8, 0.55, 0.16], 0.72, 10, m.rust, 'gear-wheel'); g3.userData.spinSpeed = state === 'operational' ? -1.55 : 0;

  const pumps = new THREE.Group(); pumps.name = 'pump-bank'; root.add(pumps);
  for (let i = 0; i < 3; i += 1) {
    const x = 2.1 + i * 2.15;
    cylinder(pumps, [0.58, 0.68, 2.35, 12], [x, 1.3, 3.2], i === 1 && state === 'sabotaged' ? m.rust : m.iron, 'pump-cylinder');
    pipeBetween(pumps, [x, 2.35, 3.2], [x, 3.5, 1.8], 0.18, m.rust, 'pressure-pipe');
    pipeBetween(pumps, [x, 0.55, 3.2], [x, 0.35, 0.9], 0.22, m.iron, 'intake-pipe');
  }

  const consoleGroup = new THREE.Group(); consoleGroup.name = 'pressure-console'; consoleGroup.position.set(-6.2, 0.4, 3.7); root.add(consoleGroup);
  box(consoleGroup, [2.4, 1.9, 0.8], [0, 0.95, 0], m.iron, 'console-housing');
  for (let i = 0; i < 3; i += 1) {
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 18), m.brass); gauge.rotation.x = Math.PI / 2; gauge.position.set(-0.72 + i * 0.72, 1.3, 0.43); gauge.name = 'pressure-gauge'; consoleGroup.add(gauge);
    const needle = box(consoleGroup, [0.28, 0.035, 0.035], [-0.72 + i * 0.72, 1.3, 0.49], state === 'operational' ? m.warning : m.rust, 'pressure-needle'); needle.userData.baseRotationZ = -0.8 + i * 0.3; needle.rotation.z = needle.userData.baseRotationZ;
  }
  createValveWheel(consoleGroup, [0, 0.45, 0.48], 0.52, m.rust, 'master-valve');

  const catwalk = new THREE.Group(); catwalk.name = 'maintenance-catwalk'; root.add(catwalk);
  box(catwalk, [15.2, 0.22, 1.3], [0, 4.25, -4.9], m.iron, 'catwalk-deck');
  for (let x = -7; x <= 7; x += 1.4) {
    box(catwalk, [0.07, 1.1, 0.07], [x, 4.82, -4.32], m.iron, 'catwalk-post');
    box(catwalk, [0.07, 1.1, 0.07], [x, 4.82, -5.48], m.iron, 'catwalk-post');
  }
  box(catwalk, [14.4, 0.08, 0.08], [0, 5.3, -4.32], m.iron, 'catwalk-rail');
  box(catwalk, [14.4, 0.08, 0.08], [0, 5.3, -5.48], m.iron, 'catwalk-rail');

  if (state === 'operational') {
    createWaterSurface(root, 1.2, 10.5, 0.04, m.waterLight, 'water-surface');
    for (let i = 0; i < 6; i += 1) {
      const lamp = cylinder(root, [0.1, 0.16, 0.3, 8], [-5 + i * 2, 5.55, -5], m.warning, 'status-lamp'); lamp.userData.baseEmissiveIntensity = lamp.material.emissiveIntensity;
    }
  }
  if (state === 'stalled') {
    common.addRubble(root, { count: 18, radius: 3.2, position: [-0.5, 0.1, -0.4], name: 'jammed-engine-debris' });
    box(root, [1.2, 0.7, 0.65], [-0.6, 0.5, -0.2], m.wood, 'wheel-jam-block');
  }
  if (state === 'sabotaged') {
    wheel.rotation.z = 0.18;
    box(root, [2.6, 0.28, 0.32], [-1.4, 1.2, 0.6], m.rust, 'broken-drive-shaft').rotation.z = -0.38;
    for (let i = 0; i < 14; i += 1) {
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + (i % 3) * 0.02, 0), m.ember); spark.position.set(0.4 + (i % 5) * 0.28, 1.1 + (i % 4) * 0.18, -0.3); spark.name = 'spark-mote'; spark.userData.baseY = spark.position.y; spark.userData.phase = i * 0.53; root.add(spark);
    }
    common.addRubble(root, { count: 20, radius: 4.3, position: [2.4, 0.12, -1], name: 'sabotage-rubble' });
  }

  root.userData.state = state; return root;
}
