import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase2 } from './AssetRegistryPhase2.js';

export class AssetRegistryPhase3 extends AssetRegistryPhase2 {
  makeEffect(effect) {
    if (effect.type === 'arrow-impact') return arrowImpact();
    if (effect.type === 'magic-impact') return magicImpact();
    if (effect.type === 'web-impact') return webImpact();
    if (effect.type === 'downed') return downedMarker();
    return super.makeEffect(effect);
  }
}

function arrowImpact() {
  const group = new THREE.Group();
  const metal = new THREE.MeshBasicMaterial({ color: 0xd7e0e6, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 18), metal);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  for (let i = 0; i < 5; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.28, 4), metal);
    shard.rotation.z = Math.PI / 2;
    shard.rotation.y = i * Math.PI * 0.4;
    shard.position.set(Math.cos(i * Math.PI * 0.4) * 0.24, 0.12, Math.sin(i * Math.PI * 0.4) * 0.24);
    group.add(shard);
  }
  return group;
}

function magicImpact() {
  const group = new THREE.Group();
  const core = new THREE.MeshBasicMaterial({ color: 0x83cfff, transparent: true, opacity: 0.88 });
  group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), core));
  for (const angle of [0, Math.PI / 2, Math.PI / 4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 22), core);
    ring.rotation.x = angle;
    group.add(ring);
  }
  return group;
}

function webImpact() {
  const group = new THREE.Group();
  const silk = new THREE.MeshBasicMaterial({ color: 0xe2edf2, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22 + i * 0.12, 0.016, 5, 20), silk);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  for (let i = 0; i < 6; i += 1) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.82), silk);
    thread.rotation.y = i * Math.PI / 3;
    group.add(thread);
  }
  return group;
}

function downedMarker() {
  const group = new THREE.Group();
  const red = new THREE.MeshBasicMaterial({ color: 0xe25f5f, transparent: true, opacity: 0.82 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 7, 26), red);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.58), red);
  const crossB = crossA.clone();
  crossB.rotation.y = Math.PI / 2;
  group.add(crossA, crossB);
  return group;
}
