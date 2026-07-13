import { ObserveScreen as Phase8ObserveScreen } from './ObserveScreenPhase8.js';
import { CameraTargetResolver } from '../camera/CameraTargetResolver.js';
import { StrategyCameraController } from '../camera/StrategyCameraController.js';

export class ObserveScreen extends Phase8ObserveScreen {
  constructor(options) {
    super(options);
    this.cameraMode = 'free';
    this.cameraController = null;
    this.cameraResolver = null;
  }

  mount(root) {
    super.mount(root);
    this.cameraDirector?.destroy?.();
    this.cameraDirector = null;
    this.three?.setAutoOrbitEnabled?.(false);
    this.cameraResolver = new CameraTargetResolver({
      scenario: this.scenario,
      renderer: this.renderer,
      worldPicker: this.worldPicker,
      getViewModel: () => this.viewModel
    });
    this.cameraController = new StrategyCameraController({
      three: this.three,
      element: this.three.renderer?.domElement,
      scenario: this.scenario,
      resolver: this.cameraResolver,
      getSelection: () => this.selection,
      onModeChange: state => {
        this.cameraMode = state.mode;
        this.shell?.setCameraState?.(state);
      },
      onCycleSelection: (direction, heroesOnly) => this.cycleCameraTarget(direction, heroesOnly),
      onAnnounce: message => this.shell?.announce(message)
    });
    this.shell?.setCameraSettings?.(this.cameraController.getSettings());
    this.shell?.setCameraState?.({ mode: 'free', label: null });
  }

  rebindProductionCamera() {
    this.uninstallWorldInteraction();
    this.installWorldInteraction();
    if (this.cameraResolver) {
      this.cameraResolver.renderer = this.renderer;
      this.cameraResolver.setWorldPicker(this.worldPicker);
    }
  }

  selectEntity({ type, id, roomId = null, cameraIntent = 'move' }) {
    this.worldPicker?.setSelected(null);
    this.selection = { type, id };
    this.selectedAgentId = type === 'agent' ? id : null;
    if (type === 'agent') this.followAgentId = id;
    if (type === 'faction') {
      this.observerFactionId = id;
      this.shell?.announce(`Observing faction ${id}.`);
    }
    this.refreshViewModel(true);
    if (cameraIntent === 'none') return;
    queueMicrotask(() => {
      if (cameraIntent === 'focus') this.cameraController?.enterFocus(this.selection, { immediate: false });
      else this.cameraController?.moveToSelection(this.selection, { focus: false, immediate: false });
    });
  }

  selectWorldTarget(target) {
    if (!target) return;
    if (target.type === 'agent' || target.type === 'room' || target.type === 'settlement') {
      this.selectEntity({ type: target.type, id: target.id, roomId: null, cameraIntent: 'none' });
    } else {
      this.selection = {
        type: target.type,
        id: target.id,
        worldTarget: this.worldPicker?.publicTarget(target) ?? target
      };
      this.selectedAgentId = null;
      this.refreshViewModel(true);
    }
    this.worldPicker?.setSelected(target);
  }

  handleWorldPointerUp(event) {
    if (this.cameraController?.suppressesClick()) {
      this.worldPointerDown = null;
      return;
    }
    super.handleWorldPointerUp(event);
  }

  handleWorldDoubleClick(event) {
    const target = this.worldPicker?.pick(event.clientX, event.clientY) ?? null;
    if (!target) return;
    event.preventDefault();
    this.selectWorldTarget(target);
    queueMicrotask(() => this.cameraController?.enterFocus(this.selection, { immediate: false }));
  }

  focusTimelineEvent({ roomId = null, actorId = null, targetId = null }) {
    const roster = this.viewModel?.followRoster ?? [];
    const actor = roster.find(agent => agent.id === actorId) ?? roster.find(agent => agent.id === targetId);
    if (actor) {
      this.selectEntity({ type: 'agent', id: actor.id, cameraIntent: 'move' });
      this.shell?.announce(`Moved to ${actor.name}. Press F to follow.`);
      return;
    }
    if (roomId) {
      this.selectEntity({ type: 'room', id: roomId, cameraIntent: 'move' });
      this.shell?.announce('Moved to event location.');
    }
  }

  setCameraMode(mode) {
    if (mode === 'focus' || mode === 'follow') this.cameraController?.enterFocus(this.selection, { immediate: false });
    else this.cameraController?.leaveFocus({ restore: mode === 'free', reason: 'ui' });
  }

  handleCameraAction(action) {
    if (action === 'previous') this.cycleCameraTarget(-1, false);
    if (action === 'next') this.cycleCameraTarget(1, false);
    if (action === 'frame' || action === 'focus') this.cameraController?.frameSelection({ immediate: false });
    if (action === 'free') this.cameraController?.leaveFocus({ restore: false, reason: 'ui' });
  }

  cycleFollowTarget(direction) {
    this.cycleCameraTarget(direction, false);
  }

  cycleCameraTarget(direction, heroesOnly = false) {
    const roster = this.cameraResolver?.cycleRoster({ heroesOnly }) ?? [];
    if (!roster.length) {
      this.shell?.announce(heroesOnly ? 'No visible heroes.' : 'No visible units.');
      return null;
    }
    const currentId = this.selection?.type === 'agent' ? this.selection.id : this.followAgentId;
    const currentIndex = roster.findIndex(agent => String(agent.id) === String(currentId));
    const nextIndex = currentIndex < 0
      ? (direction < 0 ? roster.length - 1 : 0)
      : (currentIndex + direction + roster.length) % roster.length;
    const target = roster[nextIndex];
    this.selection = { type: 'agent', id: target.id };
    this.selectedAgentId = target.id;
    this.followAgentId = target.id;
    this.refreshViewModel(true);
    if (this.cameraController?.mode === 'focus') this.cameraController.enterFocus(this.selection, { immediate: false });
    else this.cameraController?.moveToSelection(this.selection, { focus: false, immediate: false });
    this.shell?.announce(`${target.name ?? target.id} selected.`);
    return target;
  }

  pushCameraToFollowTarget(immediate = false) {
    return this.cameraController?.enterFocus(this.selection, { immediate });
  }

  focusSelection(immediate = false) {
    return this.cameraController?.frameSelection({ immediate });
  }

  focusRoom(roomId, immediate = false, distance = null) {
    const selection = { type: 'room', id: roomId };
    const resolved = this.cameraResolver?.resolve(selection);
    if (!resolved) return false;
    if (distance !== null) resolved.distance = distance;
    return this.cameraController?.moveToSelection(selection, { focus: false, immediate });
  }

  resetCamera(immediate = false) {
    this.cameraController?.frameWorld({ immediate });
  }

  panCamera() {
    // Camera movement is continuous and camera-relative in StrategyCameraController.
  }

  handleShortcut(event) {
    if (this.cameraController?.handleKeyDown(event)) return;
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
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.cameraController?.frameSelection({ immediate: false });
    } else if (event.key === 'Escape') {
      this.clearSelection();
    }
  }

  loop() {
    if (!this.three || !this.renderer || !this.sim) return;
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    this.viewModelClock -= dt;
    this.runtime?.update(dt * 0.62);
    this.renderer.renderState(this.sim.snapshot());
    this.worldPicker?.refreshHighlights();
    this.refreshViewModel(false);
    this.cameraController?.update(dt);
    this.three.updateCamera(0);
    this.three.render();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.cameraController?.destroy();
    this.cameraController = null;
    this.cameraResolver = null;
    super.destroy();
  }
}
