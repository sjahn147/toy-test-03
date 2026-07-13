import { ObserveScreen as Phase8ObserveScreen } from './ObserveScreenCameraPhase10.js';
import { StrategyDungeonRenderer } from '../engine/StrategyDungeonRenderer.js';
import { StrategyAssetRegistry } from '../engine/StrategyAssetRegistry.js';

export class StrategyObserverScreen extends Phase8ObserveScreen {
  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.assets = new StrategyAssetRegistry();
    this.assets.loadManifest();
    this.renderer = new StrategyDungeonRenderer(this.three, this.scenario, this.assets);
    this.renderer.renderState(this.sim.snapshot());
    this.rebindProductionCamera?.();
  }
}

export { StrategyObserverScreen as ObserveScreen };
