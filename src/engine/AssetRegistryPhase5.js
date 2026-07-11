import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase4 } from './AssetRegistryPhase4.js';
import { EcologyAssetFactory } from './EcologyAssetFactory.js';

export const ECOLOGY_PROP_TYPES = new Set([
  'goblin_lair',
  'ossuary_lair',
  'spider_lair',
  'slime_pool',
  'rat_warren',
  'ogre_lair'
]);

export class AssetRegistryPhase5 extends AssetRegistryPhase4 {
  constructor() {
    super();
    this.ecology = new EcologyAssetFactory();
  }

  makeAgent(agent) {
    if (agent.role === 'rat') return this.ecology.createRat(agent);
    if (agent.role === 'spider') return this.ecology.createSpider(agent);
    return super.makeAgent(agent);
  }

  makeProp(prop) {
    if (ECOLOGY_PROP_TYPES.has(prop.type)) return this.ecology.createLair(prop);
    return super.makeProp(prop);
  }

  makeEffect(effect) {
    if (effect.type === 'feeding') return feedingEffect();
    if (effect.type === 'birth') return birthEffect();
    if (effect.type === 'cocoon') return cocoonEffect();
    return super.makeEffect(effect);
  }
}

function feedingEffect() {
  const group = new THREE.Group();
  const green = new THREE.MeshBasicMaterial({ color: 0xa7d46f, transparent: true, opacity: 0.82 });
  const red = new THREE.MeshBasicMaterial({ color: 0xb84e52, transparent: true, opacity: 0.76 });
  for (let i = 0; i < 7; i += 1) {
    const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + (i % 3) * 0.015, 0), i % 2 ? green : red);
    mote.position.set(Math.cos(i * Math.PI * 2 / 7) * 0.42, 0.18 + (i % 3) * 0.12, Math.sin(i * Math.PI * 2 / 7) * 0.42);
    group.add(mote);
  }
  return group;
}

function birthEffect() {
  const group = new THREE.Group();
  const pale = new THREE.MeshBasicMaterial({ color: 0xd9f0d2, transparent: true, opacity: 0.84 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xe6b76d, transparent: true, opacity: 0.78 });
  for (const radius of [0.28, 0.46, 0.66]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 24), radius === 0.46 ? amber : pale);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = radius * 0.28;
    group.add(ring);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), pale);
  core.position.y = 0.36;
  group.add(core);
  return group;
}

function cocoonEffect() {
  const group = new THREE.Group();
  const silk = new THREE.MeshBasicMaterial({ color: 0xe5eef2, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34 + i * 0.04, 0.018, 5, 20), silk);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 0.13;
    group.add(ring);
  }
  return group;
}
