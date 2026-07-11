import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
import { DungeonSim } from '../sim/DungeonSimPhase8.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../data/applyPhase8SpatialScale.js';
import { applyPhase8PropLayout } from '../data/applyPhase8PropLayout.js';
import { createLegacyGameRuntime } from '../application/GameRuntimeFactory.js';
import { StrategyObserverShell } from '../ui/StrategyObserverShell.js';
import { renderStrategyInspector } from '../ui/renderStrategyInspector.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario = applyPhase8PropLayout(applyPhase7Territories(applyPhase8SpatialScale(this.scenario)));
    this.runtime = null;
    this.runtimeUnsubscribe = null;
    this.shell = null;
    this.selection = null;
    this.observerFactionId = null;
    this.timelineFilter = 'all';
    this.viewModel = null;
    this.viewModelClock = 0;
  }

  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.runtimeUnsubscribe?.();
    this.runtime?.destroy();

    this.assets = new AssetRegistryPhase8();
    this.assets.loadManifest();
    this.renderer = new DungeonRendererPhase8(this.three, this.scenario, this.assets);
    this.sim = new DungeonSim(this.scenario);
    this.runtime = createLegacyGameRuntime({ sim: this.sim });
    this.runtimeUnsubscribe = this.runtime.subscribe(() => { this.viewModelClock = 0; });

    this.shell = new StrategyObserverShell({
      onPauseToggle: paused => this.runtime.dispatch({ type: paused ? 'clock.pause' : 'clock.resume' }),
      onSpeedChange: speed => this.runtime.dispatch({ type: 'clock.set-speed', speed }),
      onBack: this.onBack,
      onSelect: payload => this.selectEntity(payload),
      onCameraMode: mode => this.setCameraMode(mode),
      onTimelineFilter: filter => { this.timelineFilter = filter; this.refreshViewModel(true); }
    });
    this.shell.mount({ screenEl: this.el, viewport: this.viewport, inspectEl: this.inspectEl });
    this.refreshViewModel(true);
  }

  selectEntity({ type, id, roomId = null }) {
    this.selection = { type, id };
    this.selectedAgentId = type === 'agent' ? id : null;
    if (roomId) this.focusRoom(roomId, true);
    this.refreshViewModel(true);
  }

  selectionContext() {
    if (!this.selection) return {};
    const { type, id } = this.selection;
    return {
      agentId: type === 'agent' ? id : null,
      roomId: type === 'room' ? id : null,
      settlementId: type === 'settlement' ? id : null,
      partyId: type === 'party' ? id : null
    };
  }

  refreshViewModel(force = false) {
    if (!this.runtime || (!force && this.viewModelClock > 0)) return;
    this.viewModelClock = 0.2;
    this.viewModel = this.runtime.getViewModel({
      ...this.selectionContext(),
      observerFactionId: this.observerFactionId,
      timelineFilter: this.timelineFilter,
      timelineLimit: 80
    });
    this.shell?.render(this.viewModel, {
      worldTitle: this.scenario.name,
      selectionType: this.viewModel.selection?.type ?? 'none'
    });
    renderStrategyInspector(this.inspectEl, this.viewModel.selection, {
      onClear: () => { this.selection = null; this.selectedAgentId = null; this.refreshViewModel(true); },
      onSelectAgent: id => this.selectEntity({ type: 'agent', id })
    });
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, false);
    if (mode === 'follow') {
      this.ensureFollowTarget();
      this.pushCameraToFollowTarget(true);
    }
  }

  ensureFollowTarget() {
    const roster = this.viewModel?.followRoster ?? [];
    const current = roster.find(agent => agent.id === this.selectedAgentId);
    if (current) return current;
    const fallback = roster.find(agent => agent.factionId === 'adventurer-expedition') ?? roster[0] ?? null;
    if (fallback) {
      this.selectedAgentId = fallback.id;
      this.selection = { type: 'agent', id: fallback.id };
      this.refreshViewModel(true);
    }
    return fallback;
  }

  pushCameraToFollowTarget(immediate = false) {
    const agent = this.ensureFollowTarget();
    if (!agent) return;
    const world = this.renderer.getAgentWorldPosition(agent.id);
    if (world) {
      this.three.setCameraTarget(world.x, world.y + 1.7, world.z, agent.role === 'ogre' ? 30 : 25, immediate);
      return;
    }
    this.focusRoom(agent.roomId, immediate);
  }

  focusRoom(roomId, immediate = false) {
    const room = this.scenario.rooms.find(candidate => candidate.id === roomId);
    if (room) this.three.setCameraTarget(room.x, (room.floor ?? 0) * 2.85 + 3, room.z, 26, immediate);
  }

  renderInspectPanel() {
    this.refreshViewModel(true);
  }

  pushEvent() {
    this.viewModelClock = 0;
  }

  updateMetrics() {
    this.refreshViewModel(false);
  }

  loop() {
    if (!this.three || !this.renderer || !this.sim) return;
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    this.viewModelClock -= dt;
    this.runtime?.update(dt * 0.62);
    this.renderer.renderState(this.sim.snapshot());
    this.refreshViewModel(false);
    if (this.cameraMode === 'follow') this.pushCameraToFollowTarget(false);
    if (this.cameraMode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, false);
    this.three.updateCamera();
    this.three.render();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.shell?.destroy();
    this.shell = null;
    this.runtimeUnsubscribe?.();
    this.runtimeUnsubscribe = null;
    this.runtime?.destroy();
    this.runtime = null;
    super.destroy();
  }
}
