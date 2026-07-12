import { WaystationLandmarkAssetFactory } from './WaystationLandmarkAssetFactory.js';
import { WaystationAssetAnimator } from './WaystationAssetAnimator.js';
import {
  getWaystationLandmarkRecipe,
  listWaystationLandmarkRecipes
} from './WaystationLandmarkRecipes.js';

export class WaystationAssetPack {
  constructor() {
    this.factory = new WaystationLandmarkAssetFactory();
    this.animator = new WaystationAssetAnimator();
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

  getRecipe(bundleId) {
    return getWaystationLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listWaystationLandmarkRecipes();
  }
}
