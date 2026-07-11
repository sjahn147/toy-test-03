import { SpiderColonyLandmarkAssetFactory } from './SpiderColonyLandmarkAssetFactory.js';
import { SpiderColonyAssetAnimator } from './SpiderColonyAssetAnimator.js';
import {
  getSpiderColonyLandmarkRecipe,
  listSpiderColonyLandmarkRecipes
} from './SpiderColonyLandmarkRecipes.js';

export class SpiderColonyAssetPack {
  constructor() {
    this.factory = new SpiderColonyLandmarkAssetFactory();
    this.animator = new SpiderColonyAssetAnimator();
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
    return getSpiderColonyLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listSpiderColonyLandmarkRecipes();
  }
}
