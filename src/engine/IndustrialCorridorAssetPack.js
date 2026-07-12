import { IndustrialCorridorLandmarkAssetFactory } from './IndustrialCorridorLandmarkAssetFactory.js';
import { IndustrialCorridorAssetAnimator } from './IndustrialCorridorAssetAnimator.js';
import {
  getIndustrialCorridorLandmarkRecipe,
  listIndustrialCorridorLandmarkRecipes
} from './IndustrialCorridorLandmarkRecipes.js';

export class IndustrialCorridorAssetPack {
  constructor() {
    this.id = 'campaign.industrial-corridor';
    this.factory = new IndustrialCorridorLandmarkAssetFactory();
    this.animator = new IndustrialCorridorAssetAnimator();
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
    return getIndustrialCorridorLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listIndustrialCorridorLandmarkRecipes();
  }
}
