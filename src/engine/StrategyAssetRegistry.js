import { AssetRegistryPhase8 } from './AssetRegistryPhase8.js';
import { ForwardOutpostAssetFactory } from './ForwardOutpostAssetFactory.js';
import { WorksiteAssetFactory } from './WorksiteAssetFactory.js';
import { isForwardOutpostProp } from '../domain/OutpostProfiles.js';

export class StrategyAssetRegistry extends AssetRegistryPhase8 {
  constructor() {
    super();
    this.forwardOutposts = new ForwardOutpostAssetFactory();
    this.worksites = new WorksiteAssetFactory();
  }

  makeProp(prop) {
    if (isForwardOutpost(prop)) return this.forwardOutposts.create(prop);
    return super.makeProp(prop);
  }

  animateForwardOutpost(root, prop, time) {
    this.forwardOutposts.animate(root, prop, time);
  }

  makeWorksiteScaffold(prop) {
    return this.worksites.createScaffold(prop);
  }

  animateWorksiteScaffold(root, prop, time) {
    this.worksites.animateScaffold(root, prop, time);
  }
}

export function isForwardOutpost(prop) {
  return isForwardOutpostProp(prop);
}
