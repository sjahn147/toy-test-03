import { OssuaryCathedralLandmarkAssetFactory } from './OssuaryCathedralLandmarkAssetFactory.js';
import { OssuaryCathedralAssetAnimator } from './OssuaryCathedralAssetAnimator.js';
import {
  getOssuaryCathedralLandmarkRecipe,
  listOssuaryCathedralLandmarkRecipes
} from './OssuaryCathedralLandmarkRecipes.js';

export class OssuaryCathedralAssetPack {
  constructor() {
    this.id = 'campaign.ossuary-cathedral';
    this.factory = new OssuaryCathedralLandmarkAssetFactory();
    this.animator = new OssuaryCathedralAssetAnimator();
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
    return getOssuaryCathedralLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listOssuaryCathedralLandmarkRecipes();
  }
}
