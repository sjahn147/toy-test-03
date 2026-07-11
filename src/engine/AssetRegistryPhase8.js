import { THREE } from './ThreeScene.js';
import { AssetRegistryPhase7 } from './AssetRegistryPhase7.js';
import { SettlementAssetFactory } from './SettlementAssetFactory.js';
import { ExpeditionAssetFactory } from './ExpeditionAssetFactory.js';
import { LogisticsAssetFactory } from './LogisticsAssetFactory.js';
import { ConstructionAssetFactory } from './ConstructionAssetFactory.js';
import { CampaignLandmarkAssetFactory } from './CampaignLandmarkAssetFactory.js';
import { OldLanternAnnexAssetFactory } from './OldLanternAnnexAssetFactory.js';

export const PHASE8D_STRUCTURE_TYPES = new Set(['supply_depot', 'gatehouse', 'siege_workshop', 'ambush_post']);

export class AssetRegistryPhase8 extends AssetRegistryPhase7 {
  constructor() {
    super();
    this.settlement = new SettlementAssetFactory();
    this.expedition = new ExpeditionAssetFactory();
    this.logistics = new LogisticsAssetFactory();
    this.construction = new ConstructionAssetFactory();
    this.campaignLandmarks = new CampaignLandmarkAssetFactory();
    this.oldLanternAnnex = new OldLanternAnnexAssetFactory();
  }

  makeProp(prop) {
    if (prop.type === 'adventurer_field_camp') return this.expedition.createFieldCamp(prop);
    if (PHASE8D_STRUCTURE_TYPES.has(prop.type)) return this.construction.create(prop);
    return super.makeProp(prop);
  }

  makeCampaignLandmark(bundleId, context = {}) {
    return this.campaignLandmarks.create(bundleId, context)
      ?? this.oldLanternAnnex.create(bundleId, context);
  }

  makeEffect(effect) {
    if (effect.type === 'settlement-threat') return ringEffect(0xf0b35d, 0xd86958, 3);
    if (effect.type === 'settlement-collapse') return shardEffect(0x79523a, 0x8d8792, 10);
    if (effect.type === 'settlement-ruin') return shardEffect(0x746d78, 0x332e36, 14);
    if (effect.type === 'settlement-rehome') return ringEffect(0x84c4ef, 0x9dd58b, 3);
    if (effect.type === 'expedition-camp-build') return ringEffect(0x7bb7e8, 0xe4c66b, 3);
    if (effect.type === 'cargo-pickup') return ringEffect(0xe3c66c, 0x7bb7e8, 2);
    if (effect.type === 'cargo-delivery') return ringEffect(0x8ed18a, 0xe3c66c, 3);
    if (effect.type === 'cargo-drop') return shardEffect(0xb8874d, 0x6e5040, 7);
    if (effect.type === 'cargo-raid') return shardEffect(0xd56a57, 0x332e36, 9);
    if (effect.type === 'construction-start') return ringEffect(0xd6b36a, 0x7d6b61, 3);
    if (effect.type === 'construction-complete') return ringEffect(0x8ed18a, 0xe3c66b, 4);
    if (effect.type === 'siege-hit') return shardEffect(0xd56a57, 0x6d4b3b, 8);
    if (effect.type === 'structure-break') return shardEffect(0x77747b, 0x3a3438, 14);
    return super.makeEffect(effect);
  }
}

function ringEffect(primary, secondary, count) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34 + i * 0.22, 0.03, 6, 28), material(i % 2 ? secondary : primary, 0.88));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08 + i * 0.14;
    group.add(ring);
  }
  return group;
}

function shardEffect(primary, secondary, count) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const shard = new THREE.Mesh(i % 3 === 0 ? new THREE.DodecahedronGeometry(0.07, 0) : new THREE.BoxGeometry(0.05, 0.05, 0.3), material(i % 2 ? secondary : primary, 0.82));
    const angle = i * Math.PI * 2 / count;
    shard.position.set(Math.cos(angle) * 0.48, 0.15 + (i % 3) * 0.13, Math.sin(angle) * 0.48);
    shard.rotation.set(i * 0.27, angle, i * 0.18);
    group.add(shard);
  }
  return group;
}

function material(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}
