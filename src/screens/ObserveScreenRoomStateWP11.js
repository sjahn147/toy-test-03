import { ObserveScreen as ProductionObserveScreen } from './ObserveScreenCameraPhase10.js';
import { RoomStatusLayer } from '../ui/RoomStatusLayer.js';

export class ObserveScreen extends ProductionObserveScreen {
  constructor(options) {
    super(options);
    this.roomOverlayMode = 'world';
    this.roomStatusLayer = null;
  }

  mount(root) {
    super.mount(root);
    this.shell?.setRoomOverlayMode?.(this.roomOverlayMode);
    this.renderer?.setOverlayMode?.(this.roomOverlayMode);
  }

  rebindRoomStatePresentation() {
    this.uninstallWorldInteraction?.();
    this.installWorldInteraction?.();
    this.roomStatusLayer?.destroy();
    this.roomStatusLayer = new RoomStatusLayer({
      viewport: this.viewport,
      three: this.three,
      localeProvider: () => this.shell?.timelineLocale ?? 'en',
      onSelectRoom: roomId => {
        this.selectEntity({ type: 'room', id: roomId, cameraIntent: 'none' });
        this.refreshViewModel(true);
      },
      onFocusRoom: roomId => {
        this.selectEntity({ type: 'room', id: roomId, cameraIntent: 'none' });
        if (this.cameraController?.moveToSelection) {
          this.cameraController.moveToSelection({ type: 'room', id: roomId }, { focus: false, immediate: false });
        } else {
          this.focusRoom?.(roomId, false, 28);
        }
      }
    });
    this.renderer?.setOverlayMode?.(this.roomOverlayMode);
    this.refreshViewModel(true);
  }

  setRoomOverlayMode(mode) {
    const allowed = new Set(['world', 'control', 'population', 'supply', 'danger', 'resources', 'activity']);
    this.roomOverlayMode = allowed.has(mode) ? mode : 'world';
    this.renderer?.setOverlayMode?.(this.roomOverlayMode);
    this.shell?.setRoomOverlayMode?.(this.roomOverlayMode);
    this.roomStatusLayer?.render(this.viewModel?.roomStates ?? {}, {
      overlayMode: this.roomOverlayMode,
      selectedRoomId: this.selection?.type === 'room' ? this.selection.id : null
    });
    return this.roomOverlayMode;
  }

  refreshViewModel(force = false) {
    super.refreshViewModel(force);
    if (!this.viewModel) return;
    this.renderer?.setCanonicalRoomStates?.(this.viewModel.roomStates ?? {});
    if (!this.roomStatusLayer) return;
    this.roomStatusLayer.render(this.viewModel.roomStates ?? {}, {
      overlayMode: this.roomOverlayMode,
      selectedRoomId: this.selection?.type === 'room' ? this.selection.id : null
    });
  }

  clearSelection() {
    super.clearSelection();
    this.roomStatusLayer?.render(this.viewModel?.roomStates ?? {}, { overlayMode: this.roomOverlayMode, selectedRoomId: null });
  }

  destroy() {
    this.roomStatusLayer?.destroy();
    this.roomStatusLayer = null;
    super.destroy();
  }
}
