import { ResidentialQuarterLandmarkAssetFactory } from './ResidentialQuarterLandmarkAssetFactory.js';
import { ResidentialQuarterAssetAnimator } from './ResidentialQuarterAssetAnimator.js';
import {
  getResidentialQuarterLandmarkRecipe,
  listResidentialQuarterLandmarkRecipes
} from './ResidentialQuarterLandmarkRecipes.js';

export class ResidentialQuarterAssetPack {
  constructor() {
    this.factory = new ResidentialQuarterLandmarkAssetFactory();
    this.animator = new ResidentialQuarterAssetAnimator();
    this.id = 'campaign.residential-quarter';
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
    return getResidentialQuarterLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listResidentialQuarterLandmarkRecipes();
  }
}
