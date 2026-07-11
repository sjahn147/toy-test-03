import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase6 } from './AssetRegistryPhase6.js';
import { TerritoryAssetFactory } from './TerritoryAssetFactory.js';

export const TERRITORY_PROP_TYPES = new Set(['territory_resource', 'territory_banner', 'barricade', 'watch_post']);

export class AssetRegistryPhase7 extends AssetRegistryPhase6 {
  constructor() {
    super();
    this.territory = new TerritoryAssetFactory();
  }

  makeProp(prop) {
    if (TERRITORY_PROP_TYPES.has(prop.type)) return this.territory.createProp(prop);
    return super.makeProp(prop);
  }

  makeEffect(effect) {
    if (effect.type === 'territory-build') return territoryBuild();
    if (effect.type === 'territory-break') return territoryBreak();
    return super.makeEffect(effect);
  }
}

function territoryBuild() {
  const group = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xe8c46a, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 8; i += 1) {
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.34), gold);
    spark.rotation.y = i * Math.PI / 4;
    spark.position.set(Math.cos(i * Math.PI / 4) * 0.52, 0.2 + (i % 2) * 0.18, Math.sin(i * Math.PI / 4) * 0.52);
    group.add(spark);
  }
  return group;
}

function territoryBreak() {
  const group = new THREE.Group();
  const red = new THREE.MeshBasicMaterial({ color: 0xd66b5d, transparent: true, opacity: 0.82 });
  for (let i = 0; i < 7; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 4), red);
    shard.rotation.z = Math.PI / 2;
    shard.rotation.y = i * Math.PI * 2 / 7;
    shard.position.set(Math.cos(i * Math.PI * 2 / 7) * 0.4, 0.16, Math.sin(i * Math.PI * 2 / 7) * 0.4);
    group.add(shard);
  }
  return group;
}
