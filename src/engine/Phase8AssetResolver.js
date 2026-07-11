import { THREE } from './ThreeScene.js';
import { createCommonDungeonArchitectureAssetPack } from './CommonDungeonArchitectureAssetPack.js';
import { createFungalGardenAssetPack } from './FungalGardenAssetPack.js';
import { FungalGardenAssetAnimator } from './FungalGardenAssetAnimator.js';
import { SpiderColonyAssetPack } from './SpiderColonyAssetPack.js';
import { createFloodedStorehouseAssetPack } from './FloodedStorehouseAssetPack.js';
import { createLaboratoryAssetPack } from './LaboratoryAssetPack.js';
import { LaboratoryAssetAnimator } from './LaboratoryAssetAnimator.js';
import { createRoyalSanctumAssetPack } from './RoyalSanctumAssetPack.js';
import { RoyalSanctumAssetAnimator } from './RoyalSanctumAssetAnimator.js';

export class Phase8AssetResolver {
  constructor({ diagnosticFallback = true