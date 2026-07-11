import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
import { DungeonSim } from '../sim/DungeonSimPhase8.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../data/applyPhase8SpatialScale.js';
import { applyPhase8PropLayout } from '../data/applyPhase8PropLayout.js';
import { createLegacyGameRuntime } from '../application/GameRuntimeFactory.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario = applyPhase8PropLayout(
      applyPhase7Territories(applyPhase8SpatialScale(this.scenario))
    );
    this.runtime = null;
    this.runtimeUnsubscribe = null;
  }

  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.runtimeUnsubscribe?.();
    this.runtime?.destroy();
    this.events = [];
    if (this.logEl) this.logEl.innerHTML = '';

    this.assets = new AssetRegistryPhase8();
    this.assets.loadManifest();
    this.renderer = new DungeonRendererPhase8(this.three, this.scenario, this.assets);

    // The Three.js renderer still consumes the legacy render snapshot during migration.
    // UI state, commands, events and lifecycle pass through the facade.
    this.sim = new DungeonSim(this.scenario);
    this.runtime = createLegacyGameRuntime({ sim: this.sim });
    this.runtimeUnsubscribe = this.runtime.subscribe(event => {
      if (event.fallbackText) this.pushEvent(event.fallbackText);
    });
    this.bindRuntimeActions();

    this.addPhase8Metrics();
    const legend = this.el.querySelector('.legend span');
    if (legend) legend.textContent = 'Spacious rooms, physical logistics, construction, sieges, persistent personalities and targeted full-room interactions are active.';
  }

  bindRuntimeActions() {
    this.replaceActionHandler('pause', event => {
      const command = this.running ? 'clock.pause' : 'clock.resume';
      const result = this.runtime.dispatch({ type: command });
      if (!result.ok) return;
      this.running = !this.running;
      event.currentTarget.textContent = this.running ? '일시정지' : '재생';
    });
    this.replaceActionHandler('noise', () => {
      this.runtime.dispatch({
        type: 'sim.make-noise',
        roomId: this.pickRoom(['hall', 'crypt', 'lair', 'hatchery'])
      });
    });
    this.replaceActionHandler('coin', () => {
      this.runtime.dispatch({
        type: 'sim.drop-coin',
        roomId: this.pickRoom(['treasure', 'hall', 'lair', 'gate'])
      });
    });
  }

  replaceActionHandler(action, handler) {
    const current = this.el?.querySelector(`[data-action="${action}"]`);
    if (!current) return null;
    const replacement = current.cloneNode(true);
    current.replaceWith(replacement);
    replacement.addEventListener('click', handler);
    return replacement;
  }

  addPhase8Metrics() {
    const metrics = this.el.querySelector('.metrics');
    if (!metrics || metrics.querySelector('[data-metric="settlements"]')) return;
    metrics.insertAdjacentHTML('afterbegin', `
      <div class="metric"><b data-metric="activeMemories">0</b><span>active memories</span></div>
      <div class="metric"><b data-metric="strongBonds">0</b><span>strong bonds</span></div>
      <div class="metric"><b data-metric="activeGrudges">0</b><span>active grudges</span></div>
      <div class="metric"><b data-metric="deliberateWaiting">0</b><span>deliberate waiting</span></div>
      <div class="metric"><b data-metric="interactionOverflowLandings">0</b><span>targeted landings</span></div>
      <div class="metric"><b data-metric="blockedMovementRetries">0</b><span>blocked route retries</span></div>
      <div class="metric"><b data-metric="constructionJobs">0</b><span>building projects</span></div>
      <div class="metric"><b data-metric="completedStructures">0</b><span>defensive structures</span></div>
      <div class="metric"><b data-metric="activeSieges">0</b><span>active sieges</span></div>
      <div class="metric"><b data-metric="blockadedSettlements">0</b><span>blockaded habitats</span></div>
      <div class="metric"><b data-metric="threatenedSupply">0</b><span>threatened supply</span></div>
      <div class="metric"><b data-metric="guardedCargo">0</b><span>guarded cargo</span></div>
      <div class="metric"><b data-metric="highRiskCargo">0</b><span>high-risk routes</span></div>
      <div class="metric"><b data-metric="cargoInTransit">0</b><span>cargo in transit</span></div>
      <div class="metric"><b data-metric="cargoDropped">0</b><span>dropped cargo</span></div>
      <div class="metric"><b data-metric="cargoRaided">0</b><span>raided cargo</span></div>
      <div class="metric"><b data-room-area>${Math.round(this.scenario.spatialScale?.averageArea ?? 0)}</b><span>avg room area</span></div>
      <div class="metric"><b data-metric="fieldCamps">0</b><span>field camps</span></div>
      <div class="metric"><b data-metric="retreatingParties">0</b><span>retreating parties</span></div>
      <div class="metric"><b data-metric="lowSupplyParties">0</b><span>low supply parties</span></div>
      <div class="metric"><b data-metric="settlements">0</b><span>active habitats</span></div>
      <div class="metric"><b data-settlement-capacity>0/0</b><span>habitat population</span></div>
      <div class="metric"><b data-metric="threatenedSettlements">0</b><span>threatened habitats</span></div>
      <div class="metric"><b data-metric="displaced">0</b><span>displaced monsters</span></div>
    `);
  }

  updateMetrics() {
    const metrics = this.runtime?.getSnapshot().metrics ?? {};
    for (const [key, value] of Object.entries(metrics)) {
      const target = this.el?.querySelector(`[data-metric="${key}"]`);
      if (target) target.textContent = value;
    }
    const capacity = this.el?.querySelector('[data-settlement-capacity]');
    if (capacity) capacity.textContent = `${metrics.habitatPopulation ?? 0}/${metrics.habitatCapacity ?? 0}`;
  }

  renderInspectPanel() {
    if (!this.inspectEl) return;
    const viewModel = this.runtime?.getViewModel({ agentId: this.selectedAgentId });
    const inspector = viewModel?.selection?.type === 'agent' ? viewModel.selection.inspector : null;
    if (!inspector) {
      this.inspectEl.innerHTML = '<div class="inspect-empty">Tap a creature in the dungeon to inspect its tiny bad decisions.</div>';
      return;
    }

    const identity = inspector.identity;
    const vitals = inspector.vitals;
    const intent = inspector.intent;
    const resource = identity.faction === 'dungeon' ? vitals.hunger : vitals.gold;
    const resourceLabel = identity.faction === 'dungeon' ? 'hunger' : 'gold';
    const location = intent.travelPhase && intent.destinationRoomName
      ? `${intent.travelPhase === 'entering' ? 'Entering' : 'Corridor'}: ${intent.roomName ?? intent.roomId ?? 'unknown'} → ${intent.destinationRoomName}`
      : `Room: ${intent.roomName ?? intent.roomId ?? 'unknown'}`;

    this.inspectEl.innerHTML = `
      <div class="inspect-head"><div><strong>${escapeHtml(identity.name)}</strong><span>${escapeHtml(identity.role ?? 'unknown')} · ${escapeHtml(identity.faction ?? 'unaffiliated')} · ${escapeHtml(intent.status)}</span></div><button class="mini-btn" data-clear-inspect>×</button></div>
      <div class="inspect-grid">
        <div><b>${Math.max(0, vitals.hp)}/${vitals.maxHp}</b><span>HP</span></div>
        <div><b>${vitals.attack}</b><span>attack</span></div>
        <div><b>${vitals.defense}</b><span>defense</span></div>
        <div><b>${Math.round(resource)}</b><span>${resourceLabel}</span></div>
        <div><b>${Math.round(vitals.fatigue)}</b><span>fatigue</span></div>
        <div><b>${inspector.inventory.length}</b><span>inventory</span></div>
      </div>
      <div class="thought">“${escapeHtml(intent.thought)}”</div>
      <div class="inspect-room">${escapeHtml(location)}</div>
      ${renderHomeAndCargo(inspector)}
      ${renderPersonality(inspector)}
      ${renderParty(inspector)}
      ${renderEquipment(inspector)}
      ${renderMemories(inspector)}
    `;

    this.inspectEl.querySelector('[data-clear-inspect]')?.addEventListener('click', () => {
      this.selectedAgentId = null;
      this.renderInspectPanel();
    });
  }

  loop() {
    if (!this.three || !this.renderer || !this.sim) return;
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    if (this.runtime) this.runtime.update(dt * 0.62);
    else if (this.running) this.sim.update(dt * 0.62);
    // Explicit migration exception: the current renderer still requires the legacy snapshot.
    this.renderer.renderState(this.sim.snapshot());
    this.updateMetrics();
    if (this.selectedAgentId) this.renderInspectPanel();
    if (this.cameraMode === 'follow') this.pushCameraToFollowTarget(false);
    if (this.cameraMode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, false);
    this.three.updateCamera();
    this.three.render();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.runtimeUnsubscribe?.();
    this.runtimeUnsubscribe = null;
    this.runtime?.destroy();
    this.runtime = null;
    super.destroy();
  }
}

function renderHomeAndCargo(inspector) {
  const home = inspector.home;
  const cargo = inspector.cargo;
  const homeName = home?.name ?? (inspector.flags.displaced ? 'No viable habitat' : 'Unassigned');
  const homeState = home?.state ?? (inspector.flags.displaced ? 'displaced' : 'none');
  const integrity = home?.indestructible ? 'protected' : home?.structuralIntegrity == null ? '—' : `${Math.round(home.structuralIntegrity)}%`;
  const cargoState = cargo
    ? `${Math.round(cargo.routeRisk * 100)}% risk · ${cargo.escorted ? 'escorted' : 'unguarded'}`
    : 'available';
  return `
    <section class="equipment-panel settlement-panel">
      <strong>Home, Siege & Logistics</strong>
      <div class="equipment-row"><span>home</span><b>${escapeHtml(homeName)}</b><em>${escapeHtml(homeState)}</em></div>
      <div class="equipment-row"><span>supply</span><b>${escapeHtml(home?.supplyStatus ?? 'open')}</b><em>${Math.round((home?.supplyEfficiency ?? 1) * 100)}% efficiency</em></div>
      <div class="equipment-row"><span>integrity</span><b>${integrity}</b><em>${home ? `${home.population}/${home.capacity} residents` : 'no habitat'}</em></div>
      <div class="equipment-row"><span>cargo</span><b>${escapeHtml(cargo?.resourceType ?? 'none')}</b><em>${escapeHtml(cargoState)}</em></div>
    </section>`;
}

function renderPersonality(inspector) {
  const personality = inspector.personality;
  const strongest = personality.strongestTraits.length
    ? personality.strongestTraits.map(trait => `${trait.name} ${Math.round(trait.value * 100)}`).join(' · ')
    : 'unformed';
  return `
    <section class="equipment-panel personality-panel">
      <strong>Personality & Memory</strong>
      <div class="equipment-row"><span>state</span><b>${escapeHtml(personality.state)}</b><em>${escapeHtml(strongest)}</em></div>
      <div class="equipment-row"><span>relationships</span><b>${personality.bonds} bonds</b><em>${personality.grudges} grudges</em></div>
      <div class="equipment-row"><span>movement</span><b>${inspector.flags.overflowLanding ? 'targeted landing' : 'normal placement'}</b><em>${inspector.flags.blockedMoveCount} blocked retries</em></div>
    </section>`;
}

function renderParty(inspector) {
  const party = inspector.party;
  if (!party) return '';
  return `
    <section class="equipment-panel expedition-panel">
      <strong>Expedition Supply</strong>
      <div class="equipment-row"><span>state</span><b>${escapeHtml(party.state)}</b><em>${escapeHtml(party.baseName ?? 'No active base')}</em></div>
      <div class="equipment-row"><span>provisions</span><b>${formatSupply(party.provisions)}/${party.maxProvisions}</b><em>water ${formatSupply(party.water)}/${party.maxWater}</em></div>
      <div class="equipment-row"><span>endurance</span><b>${Math.round(party.endurance)}/${party.maxExpeditionTime}</b><em>${Math.round(party.expeditionTime)} elapsed</em></div>
    </section>`;
}

function renderEquipment(inspector) {
  if (!inspector.equipment.length && !inspector.inventory.length) return '';
  const equipmentRows = inspector.equipment.map(item => {
    const slot = item?.slot ?? 'item';
    const name = item?.name ?? item?.value ?? 'empty';
    const detail = item?.broken
      ? `${item.rarity ?? 'common'} · broken`
      : item?.maxDurability != null
        ? `${item.rarity ?? 'common'} · ${Math.ceil(item.durability ?? 0)}/${item.maxDurability}`
        : item?.rarity ?? '';
    return `<div class="equipment-row"><span>${escapeHtml(slot)}</span><b>${escapeHtml(name)}</b><em>${escapeHtml(detail)}</em></div>`;
  }).join('');
  const inventory = inspector.inventory.length
    ? inspector.inventory.map(item => `<span class="inventory-chip">${escapeHtml(item?.name ?? item)}</span>`).join('')
    : '<span class="inventory-chip is-empty">empty pack</span>';
  return `<section class="equipment-panel"><strong>Loadout</strong>${equipmentRows}<div class="inventory-line">${inventory}</div></section>`;
}

function renderMemories(inspector) {
  const memories = inspector.memories.slice(0, 3);
  return `<div class="memory-list">${memories.length
    ? memories.map(memory => `<div>${escapeHtml((memory?.type ?? 'memory').replaceAll('-', ' '))} · ${Math.round((memory?.currentIntensity ?? memory?.intensity ?? 0) * 100)}%</div>`).join('')
    : '<div>No recent memorable mistakes.</div>'}</div>`;
}

function formatSupply(value) {
  return Math.round((value ?? 0) * 10) / 10;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
