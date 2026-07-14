import { ObserveScreen as Phase8ObserveScreen } from './ObserveScreenFloorWP13.js';
import { StrategyDungeonRendererWP13 } from '../engine/StrategyDungeonRendererWP13.js';
import { StrategyAssetRegistry } from '../engine/StrategyAssetRegistry.js';

export class StrategyObserverScreen extends Phase8ObserveScreen {
  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.assets = new StrategyAssetRegistry();
    this.assets.loadManifest();
    this.renderer = new StrategyDungeonRendererWP13(this.three, this.scenario, this.assets);
    this.renderer.renderState(this.sim.snapshot());
    this.rebindProductionCamera?.();
    this.rebindRoomStatePresentation?.();
    this.rebindFloorPresentation?.();
  }
}

export { StrategyObserverScreen as ObserveScreen };
