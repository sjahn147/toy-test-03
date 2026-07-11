import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
import { DungeonSim } from '../sim/DungeonSimPhase8.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario = applyPhase7Territories(this.scenario);
  }

  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.events = [];
    if (this.logEl) this.logEl.innerHTML = '';

    this.assets = new AssetRegistryPhase8();
    this.assets.loadManifest();
    this.renderer = new DungeonRendererPhase8(this.three, this.scenario, this.assets);
    this.sim = new DungeonSim(this.scenario, { onEvent: event => this.pushEvent(event.text) });
    this.addSettlementMetrics();

    const legend = this.el.querySelector('.legend span');
    if (legend) legend.textContent = 'Habitat capacity, home return, overcrowding, displacement and settlement collapse are active.';
  }

  addSettlementMetrics() {
    const metrics = this.el.querySelector('.metrics');
    if (!metrics || metrics.querySelector('[data-metric="settlements"]')) return;
    metrics.insertAdjacentHTML('afterbegin', `
      <div class="metric"><b data-metric="settlements">0</b><span>active habitats</span></div>
      <div class="metric"><b data-settlement-capacity>0/0</b><span>habitat population</span></div>
      <div class="metric"><b data-metric="threatenedSettlements">0</b><span>threatened habitats</span></div>
      <div class="metric"><b data-metric="overcrowdedSettlements">0</b><span>overcrowded habitats</span></div>
      <div class="metric"><b data-metric="displaced">0</b><span>displaced monsters</span></div>
    `);
  }

  updateMetrics() {
    super.updateMetrics();
    const metrics = this.sim?.metrics?.() ?? {};
    const capacity = this.el?.querySelector('[data-settlement-capacity]');
    if (capacity) capacity.textContent = `${metrics.habitatPopulation ?? 0}/${metrics.habitatCapacity ?? 0}`;
  }

  renderInspectPanel() {
    super.renderInspectPanel();
    const agent = this.sim?.agents?.find(candidate => candidate.id === this.selectedAgentId);
    if (!agent || !this.inspectEl || !this.sim?.settlementSystem) return;

    const home = agent.homeSettlementId
      ? this.sim.settlementSystem.settlements.get(agent.homeSettlementId)
      : null;
    const anchor = home?.anchorPropId
      ? this.sim.props.find(prop => prop.id === home.anchorPropId)
      : null;
    const insertionPoint = this.inspectEl.querySelector('.memory-list');
    if (!insertionPoint) return;

    const homeName = home
      ? anchor?.label ?? home.type.replaceAll('-', ' ')
      : agent.displaced
        ? 'No viable habitat'
        : 'Unassigned';
    const state = home?.state ?? (agent.displaced ? 'displaced' : 'none');
    const population = home ? `${home.population}/${home.capacity}` : '—';
    const integrity = home?.indestructible ? 'protected' : home ? `${Math.round(home.structuralIntegrity)}%` : '—';
    const control = home?.indestructible ? 'safe zone' : home ? `${Math.round(home.control)}%` : '—';

    insertionPoint.insertAdjacentHTML('beforebegin', `
      <section class="equipment-panel settlement-panel">
        <strong>Home & Habitat</strong>
        <div class="equipment-row"><span>home</span><b>${escapeHtml(homeName)}</b><em>${escapeHtml(state)}</em></div>
        <div class="equipment-row"><span>residents</span><b>${escapeHtml(population)}</b><em>${home?.overcrowded ? `+${home.overcrowded} overcrowded` : 'within capacity'}</em></div>
        <div class="equipment-row"><span>integrity</span><b>${escapeHtml(integrity)}</b><em>control ${escapeHtml(control)}</em></div>
        <div class="equipment-row"><span>attachment</span><b>${Math.round((agent.homeAttachment ?? 0) * 100)}%</b><em>range ${agent.roamingRange ?? '—'} rooms</em></div>
      </section>
    `);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
