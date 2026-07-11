import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase3 } from './AssetRegistryPhase3.js';

export class AssetRegistryPhase4 extends AssetRegistryPhase3 {
  makeEffect(effect) {
    if (effect.type === 'equipment-upgrade') return equipmentUpgrade();
    if (effect.type === 'equipment-break') return equipmentBreak();
    return super.makeEffect(effect);
  }
}

function equipmentUpgrade() {
  const group = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xf1d477, transparent: true, opacity: 0.9 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.76 });
  for (const radius of [0.32, 0.48, 0.64]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.026, 6, 26), radius === 0.48 ? blue : gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (radius - 0.32) * 0.55;
    group.add(ring);
  }
  for (let i = 0; i < 6; i += 1) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), i % 2 ? blue : gold);
    spark.position.set(Math.cos(i * Math.PI / 3) * 0.48, 0.25 + (i % 2) * 0.18, Math.sin(i * Math.PI / 3) * 0.48);
    group.add(spark);
  }
  return group;
}

function equipmentBreak() {
  const group = new THREE.Group();
  const iron = new THREE.MeshBasicMaterial({ color: 0xb2a69d, transparent: true, opacity: 0.88 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xe26f45, transparent: true, opacity: 0.82 });
  const crackA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.72), iron);
  crackA.rotation.y = 0.6;
  const crackB = crackA.clone();
  crackB.rotation.y = -0.6;
  group.add(crackA, crackB);
  for (let i = 0; i < 7; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 4), i % 2 ? ember : iron);
    shard.rotation.z = Math.PI / 2;
    shard.rotation.y = i * Math.PI * 2 / 7;
    shard.position.set(Math.cos(i * Math.PI * 2 / 7) * 0.34, 0.14, Math.sin(i * Math.PI * 2 / 7) * 0.34);
    group.add(shard);
  }
  return group;
}
