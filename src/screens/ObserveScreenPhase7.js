import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase7 } from '../engine/DungeonRendererPhase7.js';
import { AssetRegistryPhase7 } from '../engine/AssetRegistryPhase7.js';
import { DungeonSim } from '../sim/DungeonSimPhase7.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario = applyPhase7Territories(this.scenario);
  }

  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.assets = new AssetRegistryPhase7();
    this.assets.loadManifest();
    this.renderer = new DungeonRendererPhase7(this.three, this.scenario, this.assets);
    this.sim = new DungeonSim(this.scenario, { onEvent: event => this.pushEvent(event.text) });
    this.addTerritoryMetrics();
    const legend = this.el.querySelector('.legend span');
    if (legend) legend.textContent = 'Territory control, resource supply, raids and constructed fortifications are active.';
  }

  addTerritoryMetrics() {
    const metrics = this.el.querySelector('.metrics');
    if (!metrics || metrics.querySelector('[data-metric="territories"]')) return;
    metrics.insertAdjacentHTML('afterbegin', `
      <div class="metric"><b data-metric="territories">0</b><span>controlled rooms</span></div>
      <div class="metric"><b data-metric="contested">0</b><span>contested rooms</span></div>
      <div class="metric"><b data-metric="fortifications">0</b><span>fortifications</span></div>
    `);
  }
}
