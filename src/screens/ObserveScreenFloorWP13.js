import { ObserveScreen as RoomStateObserveScreen } from './ObserveScreenRoomStateWP11.js';
import { FloorRail, summarizeFloors } from '../ui/FloorRail.js';
import { normalizeFloorDefinitions, roomFloorId } from '../content/floors/SleepingCitadelFloorContract.js';
import { computeMapBounds } from '../camera/CameraMath.js';

export class ObserveScreen extends RoomStateObserveScreen {
  constructor(options) {
    super(options);
    this.floors = [];
    this.activeFloorId = 'F0';
    this.floorRail = null;
    this.floorCameraPoses = new Map();
    this.floorStorageKey = 'tldtc.wp13.floor-state.v1';
    this.floorKeyHandler = event => this.handleFloorShortcut(event);
  }

  mount(root) {
    super.mount(root);
    this.floors = normalizeFloorDefinitions(this.scenario?.floors ?? this.scenario?.meta?.floors ?? []);
    this.restoreFloorState();
    if (!this.floors.some(floor => floor.id === this.activeFloorId)) this.activeFloorId = this.floors[0]?.id ?? 'F0';
    this.floorRail?.destroy();
    this.floorRail = new FloorRail({
      root:this.viewport ?? root,
      floors:this.floors,
      activeFloorId:this.activeFloorId,
      onSelect:floorId => this.setActiveFloor(floorId, { focus:true, restorePose:false, source:'user' })
    });
    globalThis.addEventListener?.('keydown', this.floorKeyHandler);
    this.rebindFloorPresentation();
  }

  rebindFloorPresentation() {
    this.renderer?.setActiveFloor?.(this.activeFloorId);
    this.applyFloorCameraBounds(this.activeFloorId);
    this.floorRail?.setActiveFloor(this.activeFloorId);
    this.refreshFloorSummary();
    this.renderActiveFloorBadges();
  }

  setActiveFloor(floorId, { focus = false, announce = true, restorePose = true, source = 'system' } = {}) {
    if (!this.floors.some(floor => floor.id === floorId)) return false;
    const changed = floorId !== this.activeFloorId;
    if (changed) this.captureFloorCameraPose(this.activeFloorId);
    if (source === 'user' && this.cameraController?.mode === 'focus') {
      this.cameraController.leaveFocus({ restore:false, reason:'floor-select' });
    }
    this.activeFloorId = floorId;
    this.renderer?.setActiveFloor?.(floorId);
    this.applyFloorCameraBounds(floorId);
    this.floorRail?.setActiveFloor(floorId);
    this.renderActiveFloorBadges();
    this.refreshFloorSummary();
    const restored = changed && restorePose ? this.restoreFloorCameraPose(floorId) : false;
    if (focus && !restored) this.focusFloor(floorId);
    if (changed) this.persistFloorState();
    if (changed && announce) this.shell?.announce?.(`Floor ${floorId}.`);
    return changed;
  }

  stepFloor(direction) {
    const index = this.floors.findIndex(floor => floor.id === this.activeFloorId);
    const next = Math.max(0, Math.min(this.floors.length - 1, index + direction));
    if (next !== index) this.setActiveFloor(this.floors[next].id, { focus:true, source:'user' });
  }

  handleFloorShortcut(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'PageUp') { event.preventDefault(); this.stepFloor(-1); }
    if (event.code === 'PageDown') { event.preventDefault(); this.stepFloor(1); }
  }

  selectEntity(input) {
    const floorId = this.floorForSelection(input);
    if (floorId && floorId !== this.activeFloorId) this.setActiveFloor(floorId, { focus:false, announce:false });
    return super.selectEntity(input);
  }

  selectWorldTarget(target) {
    const floorId = this.floorForWorldTarget(target);
    if (floorId && floorId !== this.activeFloorId) this.setActiveFloor(floorId, { focus:false, announce:false });
    return super.selectWorldTarget(target);
  }

  refreshViewModel(force = false) {
    super.refreshViewModel(force);
    this.renderActiveFloorBadges();
    this.refreshFloorSummary();
    this.followFloorTransition();
  }

  renderActiveFloorBadges() {
    if (!this.roomStatusLayer || !this.viewModel?.roomStates) return;
    const filtered = Object.fromEntries(Object.entries(this.viewModel.roomStates).filter(([, state]) => (state.floorId ?? this.roomFloor(state.roomId)) === this.activeFloorId));
    this.roomStatusLayer.render(filtered, { overlayMode:this.roomOverlayMode, selectedRoomId:this.selection?.type === 'room' ? this.selection.id : null });
  }

  refreshFloorSummary() {
    if (!this.floorRail || !this.floors.length) return;
    const snapshot = this.sim?.snapshot?.() ?? {};
    this.floorRail.setSummary(summarizeFloors({ floors:this.floors, roomStates:this.viewModel?.roomStates ?? {}, agents:snapshot.agents ?? [], connectors:snapshot.verticalConnectors ?? this.scenario?.verticalConnectors ?? [], selection:this.selection }));
  }

  followFloorTransition() {
    if (this.cameraController?.mode !== 'focus') return;
    const followedId = this.followAgentId ?? this.selectedAgentId;
    if (!followedId) return;
    const agent = this.sim?.agents?.find?.(candidate => String(candidate.id) === String(followedId));
    if (!agent || agent.travel?.kind === 'vertical-connector') return;
    const floorId = this.roomFloor(agent.roomId);
    if (floorId && floorId !== this.activeFloorId) this.setActiveFloor(floorId, { focus:false, announce:false });
  }

  floorForSelection(input) {
    if (input?.type === 'room') return this.roomFloor(input.id);
    if (input?.type === 'agent') return this.roomFloor(this.sim?.agents?.find?.(agent => String(agent.id) === String(input.id))?.roomId);
    return this.roomFloor(input?.roomId);
  }
  floorForWorldTarget(target) { return target?.floorId ?? this.roomFloor(target?.roomId ?? target?.fromRoomId); }
  roomFloor(roomId) { const room=this.scenario?.rooms?.find?.(candidate=>candidate.id===roomId); return roomFloorId(room); }


  captureFloorCameraPose(floorId) {
    const camera = this.cameraController;
    if (!floorId || !camera) return;
    this.floorCameraPoses.set(floorId, {
      pivot:{ ...(camera.desiredPivot ?? camera.pivot ?? {x:0,y:0,z:0}) },
      yaw:Number(camera.desiredYaw ?? camera.yaw ?? 0),
      pitch:Number(camera.desiredPitch ?? camera.pitch ?? 0.72),
      distance:Number(camera.desiredDistance ?? camera.distance ?? 42)
    });
  }

  restoreFloorCameraPose(floorId) {
    const pose = this.floorCameraPoses.get(floorId);
    const camera = this.cameraController;
    if (!pose || !camera) return false;
    camera.pivot = { ...pose.pivot };
    camera.desiredPivot = { ...pose.pivot };
    camera.pivotVelocity = { x:0, y:0, z:0 };
    camera.yaw = camera.desiredYaw = pose.yaw;
    camera.pitch = camera.desiredPitch = pose.pitch;
    camera.distance = camera.desiredDistance = pose.distance;
    return true;
  }

  applyFloorCameraBounds(floorId) {
    if (!this.cameraController) return;
    const rooms = (this.scenario?.rooms ?? []).filter(room => roomFloorId(room) === floorId);
    if (rooms.length) this.cameraController.bounds = computeMapBounds(rooms);
  }

  restoreFloorState() {
    try {
      const raw = globalThis.localStorage?.getItem?.(this.floorStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.activeFloorId = saved.activeFloorId ?? this.activeFloorId;
      this.floorCameraPoses = new Map(Object.entries(saved.cameraPoses ?? {}));
    } catch {
      this.floorCameraPoses = new Map();
    }
  }

  persistFloorState() {
    try {
      this.captureFloorCameraPose(this.activeFloorId);
      globalThis.localStorage?.setItem?.(this.floorStorageKey, JSON.stringify({
        activeFloorId:this.activeFloorId,
        cameraPoses:Object.fromEntries(this.floorCameraPoses)
      }));
    } catch {}
  }

  focusFloor(floorId) {
    const landmark = this.scenario?.meta?.cameraLandmarks?.[floorId] ?? null;
    if (landmark && this.cameraController) {
      this.cameraController.desiredPivot = { x: landmark.x, y: 0, z: landmark.z };
      this.cameraController.pivot = { x: landmark.x, y: 0, z: landmark.z };
      this.cameraController.pivotVelocity = { x:0, y:0, z:0 };
      this.cameraController.desiredDistance = landmark.distance ?? this.cameraController.desiredDistance;
      this.cameraController.distance = landmark.distance ?? this.cameraController.distance;
      return;
    }
    const floor = this.floors.find(candidate => candidate.id === floorId);
    const roomId = floor?.roomIds?.find(id => this.viewModel?.roomStates?.[id]?.discovered) ?? floor?.roomIds?.[0];
    if (roomId) this.focusRoom?.(roomId, false, floorId === 'B3' ? 24 : 42);
  }

  destroy() {
    this.persistFloorState();
    globalThis.removeEventListener?.('keydown', this.floorKeyHandler);
    this.floorRail?.destroy();
    this.floorRail = null;
    super.destroy();
  }
}
