import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase7 } from './AssetRegistryPhase7.js';
import { SettlementAssetFactory } from './SettlementAssetFactory.js';

export class AssetRegistryPhase8 extends AssetRegistryPhase7 {
  constructor() {
    super();
    this.settlement = new SettlementAssetFactory();
  }

  makeEffect(effect) {
    if (effect.type === 'settlement-threat') return settlementThreat();
    if (effect.type === 'settlement-collapse') return settlementCollapse();
    if (effect.type === 'settlement-ruin') return settlementRuin();
    if (effect.type === 'settlement-rehome') return settlementRehome();
    return super.makeEffect(effect);
  }
}

function settlementThreat() {
  const group = new THREE.Group();
  const amber = material(0xf0b35d, 0.9);
  const red = material(0xd86958, 0.82);

  for (const radius of [0.38, 0.58, 0.78]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 28), radius === 0.58 ? red : amber);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (radius - 0.3) * 0.25;
    group.add(ring);
  }

  for (let i = 0; i < 5; i += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 5), i % 2 ? red : amber);
    const angle = i * Math.PI * 2 / 5;
    spike.position.set(Math.cos(angle) * 0.58, 0.28, Math.sin(angle) * 0.58);
    spike.rotation.z = -Math.cos(angle) * 0.36;
    spike.rotation.x = Math.sin(angle) * 0.36;
    group.add(spike);
  }
  return group;
}

function settlementCollapse() {
  const group = new THREE.Group();
  const wood = material(0x79523a, 0.88);
  const stone = material(0x8d8792, 0.8);
  const ember = material(0xe27c4d, 0.78);

  for (let i = 0; i < 10; i += 1) {
    const shard = new THREE.Mesh(
      i % 3 === 0
        ? new THREE.DodecahedronGeometry(0.08 + (i % 2) * 0.035, 0)
        : new THREE.BoxGeometry(0.055, 0.055, 0.34 + (i % 4) * 0.08),
      i % 3 === 0 ? stone : wood
    );
    const angle = i * Math.PI * 2 / 10;
    shard.position.set(Math.cos(angle) * 0.48, 0.16 + (i % 3) * 0.14, Math.sin(angle) * 0.48);
    shard.rotation.set(i * 0.31, angle, i * 0.23);
    group.add(shard);
  }

  const warning = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 6, 28), ember);
  warning.rotation.x = Math.PI / 2;
  warning.position.y = 0.06;
  group.add(warning);
  return group;
}

function settlementRuin() {
  const group = new THREE.Group();
  const ash = material(0x746d78, 0.64);
  const dark = material(0x332e36, 0.72);

  for (let i = 0; i < 14; i += 1) {
    const mote = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 + (i % 3) * 0.018, 0), i % 3 === 0 ? dark : ash);
    const angle = i * 2.399;
    const radius = 0.18 + (i % 5) * 0.12;
    mote.position.set(Math.cos(angle) * radius, 0.1 + (i % 4) * 0.16, Math.sin(angle) * radius);
    group.add(mote);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 6, 32), dark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);
  return group;
}

function settlementRehome() {
  const group = new THREE.Group();
  const blue = material(0x84c4ef, 0.86);
  const green = material(0x9dd58b, 0.82);

  for (const [radius, y] of [[0.3, 0.08], [0.5, 0.22], [0.7, 0.38]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 26), radius === 0.5 ? green : blue);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.48, 6), green);
  marker.position.y = 0.62;
  group.add(marker);
  return group;
}

function material(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}
