import { AssetRegistryPhase8 } from './AssetRegistryPhase8.js';
import { ForwardOutpostAssetFactory } from './ForwardOutpostAssetFactory.js';

export class StrategyAssetRegistry extends AssetRegistryPhase8 {
  constructor() {
    super();
    this.forwardOutposts = new ForwardOutpostAssetFactory();
  }

  makeProp(prop) {
    if (isForwardOutpost(prop)) return this.forwardOutposts.create(prop);
    return super.makeProp(prop);
  }

  animateForwardOutpost(root, prop, time) {
    this.forwardOutposts.animate(root, prop, time);
  }
}

export function isForwardOutpost(prop) {
  return Boolean(prop && (
    prop.type === 'forward