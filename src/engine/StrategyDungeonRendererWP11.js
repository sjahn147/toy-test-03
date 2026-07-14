import { StrategyDungeonRenderer } from './StrategyDungeonRenderer.js';
import { RoomVisualStateComposer } from './RoomVisualStateComposer.js';
import { RoomStrategicOverlayRenderer } from './RoomStrategicOverlayRenderer.js';
import { RoomStateVisualRenderer } from './RoomStateVisualRenderer.js';

const NULL_OVERLAY = Object.freeze({ setMode(mode) { return mode ?? 'world'; }, setContext() {}, render() {}, getSummary() { return null; }, destroy() {} });

export class StrategyDungeonRendererWP11 extends StrategyDungeonRenderer {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.strategicOverlay?.destroy?.();
    this.worldStatusOverlay?.destroy?.();
    this.strategicOverlay = NULL_OVERLAY;
    this.worldStatusOverlay = NULL_OVERLAY;
    this.roomVisualStateComposer = new RoomVisualStateComposer();
    this.wp11Overlay = new RoomStrategicOverlayRenderer({ parent: this.group, roomY: room => this.roomY(room) });
    this.wp11RoomVisuals = new RoomStateVisualRenderer({ parent: this.group, roomY: room => this.roomY(room) });
    this.overlayMode = 'world';
    this.overlayContext = {};
    this.lastRoomVisualStates = [];
    this.canonicalRoomStates = null;
  }
  renderState(snapshot) {
    const roomStates = this.roomVisualStateComposer.compose(snapshot, this.canonicalRoomStates);
    this.lastRoomVisualStates = roomStates;
    super.renderState({ ...snapshot, wp11RoomStates: roomStates });
    this.wp11Overlay.setMode(this.overlayMode);
    this.wp11Overlay.setContext(this.overlayContext);
    this.wp11Overlay.render(snapshot, roomStates, snapshot.time ?? 0);
    this.wp11RoomVisuals.render(roomStates, snapshot.rooms ?? [], snapshot.time ?? 0);
  }
  setCanonicalRoomStates(roomStates = null) { this.canonicalRoomStates = roomStates && typeof roomStates === 'object' ? roomStates : null; }
  setOverlayMode(mode = 'world') { this.overlayMode = this.wp11Overlay.setMode(mode); return this.overlayMode; }
  setOverlayContext(context = {}) { this.overlayContext = context ?? {}; this.wp11Overlay.setContext(this.overlayContext); }
  getOverlaySummary() { return this.wp11Overlay.getSummary(); }
  destroy() { this.wp11Overlay?.destroy(); this.wp11RoomVisuals?.destroy(); super.destroy(); }
}
