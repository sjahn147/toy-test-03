import { OrcBarracksLandmarkAssetFactory } from './OrcBarracksLandmarkAssetFactory.js';
import { OrcBarracksAssetAnimator } from './OrcBarracksAssetAnimator.js';
import {
  getOrcBarracksLandmarkRecipe,
  listOrcBarracksLandmarkRecipes
} from './OrcBarracksLandmarkRecipes.js';

export class OrcBarracksAssetPack {
  constructor() {
    this.id = 'campaign.red-tusk-barracks';
    this.factory = new OrcBarracksLandmarkAssetFactory();
    this.animator = new OrcBarracksAssetAnimator();
  }

  canCreate(bundleId) {
    return this.factory.canCreate(bundleId);
  }

  create(bundleId, context = {}) {
    const root = this.factory.create(bundleId, context);
    return root ? this.animator.prepare(root) : null;
  }

  update(root, elapsedSeconds) {
    this.animator.update(root, elapsedSeconds);
  }

  dispose(root) {
    this.animator.dispose(root);
  }

  getRecipe(bundleId) {
    return getOrcBarracksLandmarkRecipe(bundleId);
  }

  listRecipes() {
    return listOrcBarracksLandmarkRecipes();
  }
}
