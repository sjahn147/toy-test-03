import { ObserveScreen as Phase8ObserveScreen } from './ObserveScreenRoomStateWP11.js';
import { StrategyDungeonRendererWP11 } from '../engine/StrategyDungeonRendererWP11.js';
import { StrategyAssetRegistry } from '../engine/StrategyAssetRegistry.js';

export class StrategyObserverScreen extends Phase8ObserveScreen {
  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.assets = new StrategyAssetRegistry();
    this.assets.loadManifest();
    this.renderer = new StrategyDungeonRendererWP11(this.three, this.scenario, this.assets);
    this.renderer.renderState(this.sim.snapshot());
    this.rebindProductionCamera?.();
    this.rebindRoomStatePresentation?.();
  }
}

export { StrategyObserverScreen as ObserveScreen };
