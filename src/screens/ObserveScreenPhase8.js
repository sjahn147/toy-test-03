import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { StrategyDungeonRenderer } from '../engine/StrategyDungeonRenderer.js';
import { StrategyAssetRegistry } from '../engine/StrategyAssetRegistry.js';
import { DungeonSimulation } from '../sim/DungeonSimulation.js';
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
    this.followAgentId = null;
    this.observerFactionId = null;
    this.timelineFilter = 'all';
    this.pinnedEventIds = new Set();
    this.viewModel = null;
    this.viewModelClock = 0;
    this.onKeyDown = event => this.handleShortcut(event);
  }

  mount(root) {
    super.mount(root);
    this.renderer?.destroy();
    this.runtimeUnsubscribe?.();
    this.runtime?.destroy();

    this.assets = new StrategyAssetRegistry();
    this.assets.loadManifest();
    this.renderer = new StrategyDungeonRenderer(this.three, this.scenario, this.assets);
    this.sim = new DungeonSimulation(this.scenario);
    this.runtime = createLegacyGameRuntime({ sim: this.sim });
    this.runtimeUnsubscribe = this.runtime.subscribe(() => { this.viewModelClock = 0; });

    this.shell = new StrategyObserverShell({
      onPauseToggle: paused => this.runtime.dispatch({ type: paused ? 'clock.pause' : 'clock.resume' }),
      onSpeedChange: speed => this.runtime.dispatch({ type: 'clock.set-speed', speed }),
      onBack: this.onBack,
      onSelect: payload => this.selectEntity(payload),
      onCameraMode: mode => this.setCameraMode(mode),
      onCameraAction: action => this.handleCameraAction(action),
      onTimelineFilter: filter => { this.timelineFilter = filter; this.refreshViewModel(true); },
      onTimelineEvent: event => this.focusTimelineEvent(event),
      onTogglePin: eventId => this.togglePinnedEvent(eventId),
      onAlertOpen: () => this.shell?.announce('Showing major, critical and historic events.')
    });
    this.shell.mount({ screenEl: this.el, viewport: this.viewport, inspectEl: this.inspectEl });
    window.addEventListener('keydown', this.onKeyDown);
    this.refreshViewModel(true);
  }

  selectEntity({ type, id, roomId = null }) {
    this.selection = { type, id };
    this.selectedAgentId = type === 'agent' ? id : null;
    if (type === 'agent') this.followAgentId = id;
    if (type === 'faction') {
      this.observerFactionId = id;
      this.shell?.announce(`Observing faction ${id}.`);
    }
    if (roomId) this.focusRoom(roomId, true, 28);
    this.refreshViewModel(true);
  }

  selectionContext() {
    if (!this.selection) return {};
    const { type, id } = this.selection;
    return {
      agentId: type === 'agent' ? id : null,
      roomId: type === 'room' ? id : null,
      settlementId: type === 'settlement' ? id : null,
      partyId: type === 'party' ? id : null,
      factionId: type === 'faction' ? id : null
    };
  }

  refreshViewModel(force = false) {
    if (!this.runtime || !this.shell) return;
    if (!force && this.viewModelClock > 0) return;
    this.viewModelClock = 0.16;
    this.viewModel = this.runtime.getViewModel({
      observerFactionId: this.observerFactionId,
      timelineFilter: this.timelineFilter,
      pinnedEventIds: this.pinnedEventIds,
      ...this.selectionContext()
    });
    this.shell.render(this.viewModel);
    renderStrategyInspector(this.inspectEl, this.viewModel.inspector);
  }

  update(delta) {
    if (!this.runtime) return;
    this.viewModelClock -= delta;
    this.runtime.tick(delta);
    this.renderer.renderState(this.runtime.getSnapshot());
    this.updateFollowCamera();
    this.refreshViewModel();
  }

  togglePinnedEvent(eventId) {
    if (this.pinnedEventIds.has(eventId)) this.pinnedEventIds.delete(eventId);
    else this.pinnedEventIds.add(eventId);
    this.refreshViewModel(true);
  }

  focusTimelineEvent(event) {
    if (event.roomId) this.focusRoom(event.roomId, true, 30);
    if (event.agentId) this.selectEntity({ type: 'agent', id: event.agentId, roomId: event.roomId });
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.shell?.setCameraMode(mode);
    if (mode !== 'follow') this.followAgentId = null;
  }

  handleCameraAction(action) {
    if (action === 'zoom-in') this.camera.position.y = Math.max(9, this.camera.position.y - 3);
    if (action === 'zoom-out') this.camera.position.y = Math.min(60, this.camera.position.y + 3);
    if (action === 'reset') this.resetCamera();
  }

  handleShortcut(event) {
    if (event.target?.matches?.('input, textarea, select')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.runtime?.dispatch({ type: this.runtime.isPaused() ? 'clock.resume' : 'clock.pause' });
    }
    if (event.key === '1') this.runtime?.dispatch({ type: 'clock.set-speed', speed: 1 });
    if (event.key === '2') this.runtime?.dispatch({ type: 'clock.set-speed', speed: 2 });
    if (event.key === '3') this.runtime?.dispatch({ type: 'clock.set-speed', speed: 4 });
    if (event.key.toLowerCase() === 'f' && this.selectedAgentId) this.setCameraMode('follow');
    if (event.key === 'Escape') {
      this.selection = null;
      this.selectedAgentId = null;
      this.followAgentId = null;
      this.refreshViewModel(true);
    }
  }

  updateFollowCamera() {
    if (!this.followAgentId || this.cameraMode !== 'follow') return;
    const mesh = this.renderer.agentMeshes.get(this.followAgentId);
    if (!mesh) return;
    this.cameraTarget.lerp(mesh.position, 0.12);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.runtimeUnsubscribe?.();
    this.runtime?.destroy();
    this.shell?.destroy();
    super.destroy();
  }
}
