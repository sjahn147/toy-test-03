import { CentralMarketLandmarkAssetFactory } from './CentralMarketLandmarkAssetFactory.js';
import { CentralMarketAssetAnimator } from './CentralMarketAssetAnimator.js';
import {
  getCentralMarketLandmarkRecipe,
  listCentralMarketLandmarkRecipes
} from './CentralMarketLandmarkRecipes.js';

export class CentralMarketAssetPack {
  constructor() {
    this.id = 'campaign.central-cross-market';
    this.factory = new CentralMarketLandmarkAssetFactory();
    this.animator = new CentralMarketAssetAnimator();
  }

  canCreate(bundleId) {
    return this.factory.canCreate(bundleId);
  }

  create(bundleId, context = {}) {
    return this.animator.prepare(this.factory.create(bundleId, context));
  }

  update(root, elapsedSeconds) {
    this.animator.update(root, elapsedSeconds);
  }

  dispose(root) {
    this.animator.dispose(root);
  }

  getRecipe(bundleId) {
    return getCentralMarketLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listCentralMarketLandmarkRecipes();
  }
}
