import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
import { DungeonSim } from '../sim/DungeonSimPhase8.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../data/applyPhase8SpatialScale.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario = applyPhase7Territories(applyPhase8SpatialScale(this.scenario));
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
    this.addPhase8Metrics();
    const legend = this.el.querySelector('.legend span');
    if (legend) legend.textContent = 'Spacious rooms, habitat capacity, expedition endurance and physical supply logistics are active.';
  }

  addPhase8Metrics() {
    const metrics = this.el.querySelector('.metrics');
    if (!metrics || metrics.querySelector('[data-metric="settlements"]')) return;
    metrics.insertAdjacentHTML('afterbegin', `
      <div class="metric"><b data-metric="cargoInTransit">0</b><span>cargo in transit</span></div>
      <div class="metric"><b data-metric="cargoDropped">0</b><span>dropped cargo</span></div>
      <div class="metric"><b data-metric="cargoRaided">0</b><span>raided cargo</span></div>
      <div class="metric"><b data-room-area>${Math.round(this.scenario.spatialScale?.averageArea ?? 0)}</b><span>avg room area</span></div>
      <div class="metric"><b data-metric="fieldCamps">0</b><span>field camps</span></div>
      <div class="metric"><b data-metric="retreatingParties">0</b><span>retreating parties</span></div>
      <div class="metric"><b data-metric="lowSupplyParties">0</b><span>low supply parties</span></div>
      <div class="metric"><b data-metric="expeditionEndurance">0</b><span>avg endurance</span></div>
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
    const home = agent.homeSettlementId ? this.sim.settlementSystem.settlements.get(agent.homeSettlementId) : null;
    const anchor = home?.anchorPropId ? this.sim.props.find(prop => prop.id === home.anchorPropId) : null;
    const insertionPoint = this.inspectEl.querySelector('.memory-list');
    if (!insertionPoint) return;
    const homeName = home ? anchor?.label ?? home.type.replaceAll('-', ' ') : agent.displaced ? 'No viable habitat' : 'Unassigned';
    insertionPoint.insertAdjacentHTML('beforebegin', `
      <section class="equipment-panel settlement-panel">
        <strong>Home & Habitat</strong>
        <div class="equipment-row"><span>home</span><b>${escapeHtml(homeName)}</b><em>${escapeHtml(home?.state ?? (agent.displaced ? 'displaced' : 'none'))}</em></div>
        <div class="equipment-row"><span>residents</span><b>${home ? `${home.population}/${home.capacity}` : '—'}</b><em>${home?.overcrowded ? `+${home.overcrowded} overcrowded` : 'within capacity'}</em></div>
        <div class="equipment-row"><span>integrity</span><b>${home?.indestructible ? 'protected' : home ? `${Math.round(home.structuralIntegrity)}%` : '—'}</b><em>${agent.cargoId ? 'carrying cargo' : 'no cargo'}</em></div>
      </section>
    `);
    if (agent.faction === 'party') this.renderExpeditionPanel(agent, insertionPoint);
  }

  renderExpeditionPanel(agent, insertionPoint) {
    const party = this.sim.partySystem.getParty(agent);
    if (!party) return;
    const base = this.sim.settlementSystem.settlements.get(party.baseSettlementId);
    insertionPoint.insertAdjacentHTML('beforebegin', `
      <section class="equipment-panel expedition-panel">
        <strong>Expedition Supply</strong>
        <div class="equipment-row"><span>state</span><b>${escapeHtml(party.expeditionState ?? 'exploring')}</b><em>${escapeHtml(base ? this.sim.settlementSystem.label(base) : 'No active base')}</em></div>
        <div class="equipment-row"><span>provisions</span><b>${formatSupply(party.provisions)}/${party.maxProvisions}</b><em>water ${formatSupply(party.water)}/${party.maxWater}</em></div>
        <div class="equipment-row"><span>medicine</span><b>${formatSupply(party.medicine)}/${party.maxMedicine}</b><em>materials ${formatSupply(party.materials)}/${party.maxMaterials}</em></div>
        <div class="equipment-row"><span>endurance</span><b>${Math.round(party.endurance ?? 0)}/${party.maxExpeditionTime ?? 0}</b><em>${Math.round(party.expeditionTime ?? 0)} elapsed</em></div>
      </section>
    `);
  }
}

function formatSupply(value) { return Math.round((value ?? 0) * 10) / 10; }
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}