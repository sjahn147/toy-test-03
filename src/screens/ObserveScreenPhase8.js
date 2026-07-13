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
import { WorldInteractionPicker } from '../engine/WorldInteractionPicker.js';
import { WorldInteractionTooltip } from '../ui/WorldInteractionTooltip.js';

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
    this.worldPicker = null;
    this.worldTooltip = null;
    this.worldPointerDown = null;
    this.worldHoverFrame = null;
    this.pendingWorldHover = null;
    this.onWorldPointerDown = event => this.handleWorldPointerDown(event);
    this.onWorldPointerMove = event => this.handleWorldPointerMove(event);
    this.onWorldPointerUp = event => this.handleWorldPointerUp(event);
    this.onWorldPointerLeave = () => this.handleWorldPointerLeave();
    this.onWorldDoubleClick = event => this.handleWorldDoubleClick(event);
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
    this.installWorldInteraction();
    window.addEventListener('keydown', this.onKeyDown);
    this.refreshViewModel(true);
  }

  selectEntity({ type, id, roomId = null }) {
    this.worldPicker?.setSelected(null);
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
      factionId: type === 'faction' ? id : null,
      worldTarget: this.selection.worldTarget ?? null
    };
  }

  installWorldInteraction() {
    this.uninstallWorldInteraction();
    this.worldPicker = new WorldInteractionPicker({ renderer: this.renderer, three: this.three });
    this.worldTooltip = new WorldInteractionTooltip(this.viewport);
    this.viewport.addEventListener('pointerdown', this.onWorldPointerDown, true);
    this.viewport.addEventListener('pointermove', this.onWorldPointerMove);
    this.viewport.addEventListener('pointerup', this.onWorldPointerUp, true);
    this.viewport.addEventListener('pointerleave', this.onWorldPointerLeave);
    this.viewport.addEventListener('dblclick', this.onWorldDoubleClick, true);
  }

  uninstallWorldInteraction() {
    if (this.viewport) {
      this.viewport.removeEventListener('pointerdown', this.onWorldPointerDown, true);
      this.viewport.removeEventListener('pointermove', this.onWorldPointerMove);
      this.viewport.removeEventListener('pointerup', this.onWorldPointerUp, true);
      this.viewport.removeEventListener('pointerleave', this.onWorldPointerLeave);
      this.viewport.removeEventListener('dblclick', this.onWorldDoubleClick, true);
    }
    if (this.worldHoverFrame !== null) cancelAnimationFrame(this.worldHoverFrame);
    this.worldHoverFrame = null;
    this.pendingWorldHover = null;
    this.worldPointerDown = null;
    this.worldTooltip?.destroy();
    this.worldPicker?.dispose();
    this.worldTooltip = null;
    this.worldPicker = null;
  }

  handleWorldPointerDown(event) {
    if (event.button !== 0) return;
    this.worldPointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
  }

  handleWorldPointerMove(event) {
    if (this.worldPointerDown && Math.hypot(event.clientX - this.worldPointerDown.x, event.clientY - this.worldPointerDown.y) > 7) {
      this.worldTooltip?.hide();
      this.worldPicker?.setHovered(null);
      return;
    }
    this.pendingWorldHover = { x: event.clientX, y: event.clientY };
    if (this.worldHoverFrame !== null) return;
    this.worldHoverFrame = requestAnimationFrame(() => {
      this.worldHoverFrame = null;
      const point = this.pendingWorldHover;
      this.pendingWorldHover = null;
      if (!point || !this.worldPicker) return;
      const target = this.worldPicker.pick(point.x, point.y);
      this.worldPicker.setHovered(target);
      if (target) this.worldTooltip?.show(target, point.x, point.y);
      else this.worldTooltip?.hide();
    });
  }

  handleWorldPointerUp(event) {
    const start = this.worldPointerDown;
    this.worldPointerDown = null;
    if (!start || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const elapsed = performance.now() - start.time;
    if (moved > 10 || elapsed > 450) return;
    const target = this.worldPicker?.pick(event.clientX, event.clientY) ?? null;
    if (!target) return;
    queueMicrotask(() => this.selectWorldTarget(target));
  }

  handleWorldPointerLeave() {
    this.worldTooltip?.hide();
    this.worldPicker?.setHovered(null);
  }

  handleWorldDoubleClick(event) {
    const target = this.worldPicker?.pick(event.clientX, event.clientY) ?? null;
    const point = this.worldPicker?.focusPoint(target);
    if (!target || !point) return;
    event.preventDefault();
    this.selectWorldTarget(target);
    this.cameraMode = 'free';
    this.shell?.setCameraMode('free');
    this.three.setCameraTarget(point.x, point.y + 1.5, point.z, 24, true);
  }

  selectWorldTarget(target) {
    if (!target) return;
    if (target.type === 'agent') {
      this.selectEntity({ type: 'agent', id: target.id, roomId: target.roomId });
      this.worldPicker?.setSelected(target);
      return;
    }
    if (target.type === 'room' || target.type === 'settlement') {
      this.selectEntity({ type: target.type, id: target.id, roomId: null });
      this.worldPicker?.setSelected(target);
      return;
    }
    this.selection = {
      type: target.type,
      id: target.id,
      worldTarget: {
        ...(this.worldPicker?.publicTarget(target) ?? target),
        worldPoint: (() => {
          const point = this.worldPicker?.focusPoint(target);
          return point ? { x: point.x, y: point.y, z: point.z } : null;
        })()
      }
    };
    this.selectedAgentId = null;
    this.worldPicker?.setSelected(target);
    this.refreshViewModel(true);
  }

  refreshViewModel(force = false) {
    if (!this.runtime || (!force && this.viewModelClock > 0)) return;
    this.viewModelClock = 0.2;
    this.viewModel = this.runtime.getViewModel({
      ...this.selectionContext(),
      observerFactionId: this.observerFactionId,
      timelineFilter: this.timelineFilter,
      timelineLimit: 120
    });
    this.shell?.render(this.viewModel, {
      worldTitle: this.scenario.name,
      selectionType: this.viewModel.selection?.type ?? 'none',
      selectionId: this.viewModel.selection?.id ?? null,
      cameraMode: this.cameraMode,
      pinnedEventIds: [...this.pinnedEventIds]
    });
    renderStrategyInspector(this.inspectEl, this.viewModel.selection, {
      onClear: () => this.clearSelection(),
      onSelectAgent: id => this.selectEntity({ type: 'agent', id }),
      onWorldAction: actionId => this.performWorldAction(actionId),
      onCancelTask: taskId => this.cancelWorldTask(taskId)
    });
  }

  performWorldAction(actionId) {
    if (!this.selection || !actionId) return;
    const type = this.selection.type;
    const id = this.selection.id;
    const target = this.selection.worldTarget ?? {
      type, id,
      roomId: type === 'room' ? id : null,
      label: this.viewModel?.selection?.inspector?.identity?.name ?? id
    };
    const result = this.runtime.dispatch({ type: 'world.perform-action', actionId, target });
    this.shell?.announce(result.ok ? `${result.result?.label ?? actionId} assigned.` : `Order failed: ${result.error}`);
    this.refreshViewModel(true);
  }

  cancelWorldTask(taskId) {
    const result = this.runtime.dispatch({ type: 'world.cancel-task', taskId });
    this.shell?.announce(result.ok ? 'Task cancelled.' : `Cancel failed: ${result.error}`);
    this.refreshViewModel(true);
  }

  togglePinnedEvent(eventId) {
    const id = String(eventId);
    if (this.pinnedEventIds.has(id)) this.pinnedEventIds.delete(id);
    else this.pinnedEventIds.add(id);
    this.shell?.announce(this.pinnedEventIds.has(id) ? 'Event pinned.' : 'Event unpinned.');
    this.refreshViewModel(true);
  }

  focusTimelineEvent({ roomId = null, actorId = null, targetId = null }) {
    const roster = this.viewModel?.followRoster ?? [];
    const actor = roster.find(agent => agent.id === actorId) ?? roster.find(agent => agent.id === targetId);
    if (actor) {
      this.selection = { type: 'agent', id: actor.id };
      this.selectedAgentId = actor.id;
      this.followAgentId = actor.id;
      this.cameraMode = 'follow';
      this.shell?.setCameraMode('follow');
      this.refreshViewModel(true);
      this.pushCameraToFollowTarget(true);
      this.shell?.announce(`Following ${actor.name}.`);
      return;
    }
    if (roomId) {
      this.selection = { type: 'room', id: roomId };
      this.selectedAgentId = null;
      this.cameraMode = 'free';
      this.shell?.setCameraMode('free');
      this.focusRoom(roomId, true, 28);
      this.refreshViewModel(true);
      this.shell?.announce('Focused event location.');
    }
  }

  clearSelection() {
    this.selection = null;
    this.selectedAgentId = null;
    this.worldPicker?.setSelected(null);
    this.refreshViewModel(true);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.shell?.setCameraMode(mode);
    this.three?.setInteractionMode(mode === 'follow' ? 'orbit' : 'pan');
    if (mode === 'fixed') this.resetCamera(false);
    if (mode === 'follow') {
      this.ensureFollowTarget();
      this.pushCameraToFollowTarget(true);
    }
  }

  handleCameraAction(action) {
    if (action === 'previous') this.cycleFollowTarget(-1);
    if (action === 'next') this.cycleFollowTarget(1);
    if (action === 'focus') this.focusSelection(true);
    if (action === 'reset') this.resetCamera(true);
  }

  ensureFollowTarget() {
    const roster = this.viewModel?.followRoster ?? [];
    const current = roster.find(agent => agent.id === this.followAgentId);
    if (current) return current;
    const fallback = roster.find(agent => agent.factionId === 'adventurer-expedition') ?? roster[0] ?? null;
    if (fallback) {
      this.followAgentId = fallback.id;
      if (!this.selection) {
        this.selection = { type: 'agent', id: fallback.id };
        this.refreshViewModel(true);
      }
    }
    return fallback;
  }

  cycleFollowTarget(direction) {
    const roster = this.viewModel?.followRoster ?? [];
    if (!roster.length) return;
    const currentIndex = Math.max(0, roster.findIndex(agent => agent.id === this.followAgentId));
    const target = roster[(currentIndex + direction + roster.length) % roster.length];
    this.selection = { type: 'agent', id: target.id };
    this.selectedAgentId = target.id;
    this.followAgentId = target.id;
    this.cameraMode = 'follow';
    this.shell?.setCameraMode('follow');
    this.refreshViewModel(true);
    this.pushCameraToFollowTarget(true);
  }

  pushCameraToFollowTarget(immediate = false) {
    const agent = this.ensureFollowTarget();
    if (!agent) return;
    const world = this.renderer.getAgentWorldPosition(agent.id);
    if (world) {
      this.three.setCameraTarget(world.x, world.y + 1.7, world.z, immediate ? followDistance(agent.role) : null, immediate);
      return;
    }
    this.focusRoom(agent.roomId, immediate, immediate ? 26 : null);
  }

  focusSelection(immediate = false) {
    const selection = this.viewModel?.selection;
    if (!selection?.inspector) return;
    const worldPoint = this.selection?.worldTarget ? this.worldPicker?.focusPoint() : null;
    if (worldPoint) {
      this.cameraMode = 'free';
      this.shell?.setCameraMode('free');
      this.three.setCameraTarget(worldPoint.x, worldPoint.y + 1.5, worldPoint.z, 24, immediate);
      return;
    }
    if (selection.type === 'agent') {
      this.selectedAgentId = selection.id;
      this.followAgentId = selection.id;
      this.cameraMode = 'follow';
      this.shell?.setCameraMode('follow');
      this.pushCameraToFollowTarget(immediate);
      return;
    }
    const inspector = selection.inspector;
    const roomId = selection.type === 'room' ? selection.id
      : selection.type === 'settlement' ? inspector.roomId
        : selection.type === 'party' ? inspector.target?.roomId ?? inspector.base?.roomId
          : inspector.roomId ?? inspector.location?.roomId ?? null;
    if (roomId) {
      this.cameraMode = 'free';
      this.shell?.setCameraMode('free');
      this.focusRoom(roomId, immediate, 28);
    }
  }

  focusRoom(roomId, immediate = false, distance = null) {
    const room = this.scenario.rooms.find(candidate => candidate.id === roomId);
    if (room) this.three.setCameraTarget(room.x, (room.floor ?? 0) * 2.85 + 3, room.z, distance, immediate);
  }

  resetCamera(immediate = false) {
    this.cameraMode = 'fixed';
    this.shell?.setCameraMode('fixed');
    this.three?.setInteractionMode('pan');
    this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, immediate);
  }

  panCamera(dx, dz, immediate = false) {
    if (!this.three || this.cameraMode === 'follow') return;
    this.three.panTarget(dx, dz, immediate);
  }

  handleShortcut(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      const paused = this.shell ? !this.shell.paused : false;
      this.shell.paused = paused;
      this.runtime.dispatch({ type: paused ? 'clock.pause' : 'clock.resume' });
      const button = this.el?.querySelector('[data-shell-action="pause"]');
      if (button) { button.textContent = paused ? '▶' : 'Ⅱ'; button.setAttribute('aria-pressed', String(paused)); }
    } else if (['Digit1', 'Digit2', 'Digit4'].includes(event.code)) {
      const speed = Number(event.code.replace('Digit', ''));
      this.runtime.dispatch({ type: 'clock.set-speed', speed });
      this.el?.querySelectorAll('[data-shell-speed]').forEach(button => {
        const active = Number(button.dataset.shellSpeed) === speed;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    } else if (event.key === '/') {
      event.preventDefault();
      this.shell?.focusNavigatorSearch();
    } else if (event.key.toLowerCase() === 'f') this.setCameraMode('follow');
    else if (event.key.toLowerCase() === 'r') this.resetCamera(true);
    else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') { event.preventDefault(); this.panCamera(0, -3.4, true); }
    else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') { event.preventDefault(); this.panCamera(0, 3.4, true); }
    else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); this.panCamera(-3.4, 0, true); }
    else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); this.panCamera(3.4, 0, true); }
    else if (event.key === '[') this.cycleFollowTarget(-1);
    else if (event.key === ']') this.cycleFollowTarget(1);
    else if (event.key === 'Escape') this.clearSelection();
    else if (event.key === 'Enter') this.focusSelection(true);
  }

  renderInspectPanel() {
    if (this.selectedAgentId) {
      this.followAgentId = this.selectedAgentId;
      this.selection = { type: 'agent', id: this.selectedAgentId };
      this.selectedAgentId = null;
    }
    this.refreshViewModel(true);
  }

  pushEvent() { this.viewModelClock = 0; }
  updateMetrics() { this.refreshViewModel(false); }

  loop() {
    if (!this.three || !this.renderer || !this.sim) return;
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    this.viewModelClock -= dt;
    this.runtime?.update(dt * 0.62);
    this.renderer.renderState(this.sim.snapshot());
    this.worldPicker?.refreshHighlights();
    this.refreshViewModel(false);
    if (this.cameraMode === 'follow') this.pushCameraToFollowTarget(false);
    if (this.cameraMode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, null, false);
    this.three.updateCamera();
    this.three.render();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.uninstallWorldInteraction();
    window.removeEventListener('keydown', this.onKeyDown);
    this.shell?.destroy();
    this.shell = null;
    this.pinnedEventIds.clear();
    this.runtimeUnsubscribe?.();
    this.runtimeUnsubscribe = null;
    this.runtime?.destroy();
    this.runtime = null;
    super.destroy();
  }
}

function followDistance(role) {
  if (role === 'ogre') return 30;
  if (['stirge', 'rat', 'parasite'].includes(role)) return 22;
  return 25;
}
