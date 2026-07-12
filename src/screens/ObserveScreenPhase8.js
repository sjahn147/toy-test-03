import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
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

    this.assets = new AssetRegistryPhase8();
    this.assets.loadManifest();
    this.renderer = new DungeonRendererPhase8(this.three, this.scenario, this.assets);
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
}
