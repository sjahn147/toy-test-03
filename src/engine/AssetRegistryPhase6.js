import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase5 } from './AssetRegistryPhase5.js';
import { AdvancedCreatureAssetFactory } from './AdvancedCreatureAssetFactory.js';
import { AdvancedLairAssetFactory } from './AdvancedLairAssetFactory.js';
import { ADVANCED_LAIR_TYPES } from '../sim/advancedEcologyConfig.js';

const ADVANCED_ROLES = new Set(['zombie', 'orc', 'myconid', 'stirge', 'carrion', 'kobold', 'wraith', 'parasite']);

export class AssetRegistryPhase6 extends AssetRegistryPhase5 {
  constructor() {
    super();
    this.advancedCreatures = new AdvancedCreatureAssetFactory();
    this.advancedLairs = new AdvancedLairAssetFactory();
  }

  makeAgent(agent) {
    if (ADVANCED_ROLES.has(agent.role)) return this.advancedCreatures.create(agent);
    return super.makeAgent(agent);
  }

  makeProp(prop) {
    if (ADVANCED_LAIR_TYPES.has(prop.type)) return this.advancedLairs.create(prop);
    return super.makeProp(prop);
  }

  makeEffect(effect) {
    if (effect.type === 'plague') return radialEffect(0x8ca17e, 0x504761, 'cross');
    if (effect.type === 'spore') return radialEffect(0x8bd4c0, 0x4d86ae, 'spore');
    if (effect.type === 'blood-attach') return radialEffect(0xb64a5d, 0x6b202d, 'drop');
    if (effect.type === 'soul-drain') return radialEffect(0xb7adff, 0x4c3d79, 'spiral');
    if (effect.type === 'infection') return radialEffect(0xd7d1b4, 0x984f55, 'larva');
    if (effect.type === 'infection-burst') return burstEffect(0xd7d1b4, 0x984f55);
    if (effect.type === 'trap-spring') return trapEffect();
    if (effect.type === 'advanced-birth') return radialEffect(0xd4d9bd, 0xd89551, 'birth');
    return super.makeEffect(effect);
  }
}

export { ADVANCED_LAIR_TYPES, ADVANCED_ROLES };

function radialEffect(primary, secondary, shape) {
  const group = new THREE.Group();
  const a = new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.82 });
  const b = new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.74 });
  for (const radius of [0.24, 0.4, 0.58]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 6, 24), radius === 0.4 ? b : a);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = radius * 0.28;
    group.add(ring);
  }
  for (let i = 0; i < 7; i += 1) {
    const geometry = shape === 'spore'
      ? new THREE.IcosahedronGeometry(0.055, 0)
      : shape === 'drop'
        ? new THREE.ConeGeometry(0.045, 0.18, 6)
        : shape === 'larva'
          ? new THREE.CapsuleGeometry(0.025, 0.12, 3, 5)
          : shape === 'spiral'
            ? new THREE.TorusKnotGeometry(0.055, 0.014, 18, 4)
            : shape === 'cross'
              ? new THREE.BoxGeometry(0.06, 0.2, 0.06)
              : new THREE.OctahedronGeometry(0.065, 0);
    const mote = new THREE.Mesh(geometry, i % 2 ? b : a);
    mote.position.set(Math.cos(i * Math.PI * 2 / 7) * 0.45, 0.18 + (i % 3) * 0.14, Math.sin(i * Math.PI * 2 / 7) * 0.45);
    mote.rotation.z = i * 0.37;
    group.add(mote);
  }
  return group;
}

function burstEffect(primary, secondary) {
  const group = radialEffect(primary, secondary, 'larva');
  const material = new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 9; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42, 5), material);
    shard.rotation.z = Math.PI / 2;
    shard.rotation.y = i * Math.PI * 2 / 9;
    shard.position.set(Math.cos(i * Math.PI * 2 / 9) * 0.3, 0.3, Math.sin(i * Math.PI * 2 / 9) * 0.3);
    group.add(shard);
  }
  return group;
}

function trapEffect() {
  const group = new THREE.Group();
  const iron = new THREE.MeshBasicMaterial({ color: 0x9aa0a0, transparent: true, opacity: 0.82 });
  const copper = new THREE.MeshBasicMaterial({ color: 0xd09155, transparent: true, opacity: 0.78 });
  for (const side of [-1, 1]) {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.1), iron);
    jaw.position.z = side * 0.2;
    jaw.rotation.x = side * 0.65;
    group.add(jaw);
  }
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 18), copper);
  spring.rotation.x = Math.PI / 2;
  group.add(spring);
  return group;
}
