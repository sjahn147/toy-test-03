import {
  cameraPlanarBasis,
  clamp,
  clampPointToBounds,
  computeMapBounds,
  copyPoint,
  length2,
  normalizeYaw,
  springPoint,
  springScalar
} from './CameraMath.js';
import { loadCameraSettings, saveCameraSettings } from './CameraPreferences.js';

const MIN_PITCH = 0.42;
const MAX_PITCH = 1.36;
const DRAG_THRESHOLD = 6;
const EDGE_SIZE = 12;

export class StrategyCameraController {
  constructor({
    three,
    element = null,
    scenario = null,
    resolver,
    getSelection = () => null,
    onModeChange = () => {},
    onCycleSelection = () => {},
    onAnnounce = () => {},
    storage = globalThis.localStorage,
    windowRef = globalThis.window
  } = {}) {
    if (!three) throw new Error('StrategyCameraController requires ThreeScene');
    if (!resolver) throw new Error('StrategyCameraController requires CameraTargetResolver');
    this.three = three;
    this.element = element ?? three.renderer?.domElement ?? null;
    this.scenario = scenario ?? { rooms: [] };
    this.resolver = resolver;
    this.getSelection = getSelection;
    this.onModeChange = onModeChange;
    this.onCycleSelection = onCycleSelection;
    this.onAnnounce = onAnnounce;
    this.storage = storage;
    this.windowRef = windowRef;
    this.settings = loadCameraSettings(storage);
    this.bounds = computeMapBounds(this.scenario.rooms ?? []);
    this.mode = 'free';
    this.focusSelection = null;
    this.focusLabel = null;
    this.lastFreePose = null;
    this.lastFocusPoint = null;
    this.focusVelocity = { x: 0, y: 0, z: 0 };
    this.keyState = new Set();
    this.pointer = null;
    this.hoverPoint = null;
    this.inside = false;
    this.lastDragAt = -Infinity;
    this.destroyed = false;

    this.pivot = copyPoint(three.target ?? three.desiredTarget ?? { x: 0, y: 2.8, z: 0 });
    this.desiredPivot = copyPoint(three.desiredTarget ?? this.pivot);
    this.pivotVelocity = { x: 0, y: 0, z: 0 };
    this.yaw = Number(three.azimuth) || 0.78;
    this.desiredYaw = this.yaw;
    this.yawVelocity = 0;
    this.pitch = clamp(Number(three.elevation) || 0.72, MIN_PITCH, MAX_PITCH);
    this.desiredPitch = this.pitch;
    this.pitchVelocity = 0;
    this.distance = clamp(Number(three.distance) || 52, three.minDistance ?? 14, three.maxDistance ?? 110);
    this.desiredDistance = clamp(Number(three.desiredDistance) || this.distance, three.minDistance ?? 14, three.maxDistance ?? 110);
    this.distanceVelocity = 0;

    this.onPointerDown = event => this.handlePointerDown(event);
    this.onPointerMove = event => this.handlePointerMove(event);
    this.onPointerUp = event => this.handlePointerUp(event);
    this.onWheel = event => this.handleWheel(event);
    this.onContextMenu = event => event.preventDefault();
    this.onPointerEnter = event => { this.inside = true; this.hoverPoint = { x: event.clientX, y: event.clientY }; };
    this.onPointerLeave = () => { this.inside = false; this.hoverPoint = null; if (!this.pointer) this.keyState.delete('edge'); };
    this.onKeyUp = event => this.keyState.delete(event.code);
    this.onBlur = () => this.keyState.clear();

    this.disableLegacyControls();
    this.install();
    this.emitMode();
  }

  install() {
    if (!this.element) return;
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
    this.element.addEventListener('pointerenter', this.onPointerEnter);
    this.element.addEventListener('pointerleave', this.onPointerLeave);
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.onContextMenu);
    this.windowRef?.addEventListener?.('keyup', this.onKeyUp);
    this.windowRef?.addEventListener?.('blur', this.onBlur);
  }

  disableLegacyControls() {
    const el = this.element;
    if (!el) return;
    if (this.three.onWheel) el.removeEventListener('wheel', this.three.onWheel);
    if (this.three.onPointerDown) el.removeEventListener('pointerdown', this.three.onPointerDown);
    if (this.three.onPointerMove) el.removeEventListener('pointermove', this.three.onPointerMove);
    if (this.three.onPointerUp) {
      el.removeEventListener('pointerup', this.three.onPointerUp);
      el.removeEventListener('pointercancel', this.three.onPointerUp);
    }
    if (this.three.onContextMenu) el.removeEventListener('contextmenu', this.three.onContextMenu);
  }

  applySettings(patch = {}) {
    this.settings = saveCameraSettings({ ...this.settings, ...patch }, this.storage);
    return { ...this.settings };
  }

  getSettings() {
    return { ...this.settings };
  }

  handlePointerDown(event) {
    if (this.destroyed || ![0, 1, 2].includes(event.button)) return;
    const kind = event.button === 0 ? 'orbit' : event.button === 1 ? 'dolly' : 'pan';
    this.element?.setPointerCapture?.(event.pointerId);
    this.pointer = {
      id: event.pointerId,
      kind,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      startYaw: this.desiredYaw,
      startPitch: this.desiredPitch,
      startDistance: this.desiredDistance,
      startPivot: copyPoint(this.desiredPivot),
      moved: false
    };
    this.hoverPoint = { x: event.clientX, y: event.clientY };
    if (kind !== 'orbit') event.preventDefault?.();
  }

  handlePointerMove(event) {
    this.hoverPoint = { x: event.clientX, y: event.clientY };
    const gesture = this.pointer;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) gesture.moved = true;
    if (gesture.kind === 'orbit') {
      this.desiredYaw = gesture.startYaw - dx * 0.0075 * this.settings.rotateSensitivity;
      const sign = this.settings.invertY ? -1 : 1;
      this.desiredPitch = clamp(gesture.startPitch + dy * 0.0042 * sign * this.settings.rotateSensitivity, MIN_PITCH, MAX_PITCH);
    } else if (gesture.kind === 'pan') {
      if (this.mode === 'focus') this.leaveFocus({ restore: false, reason: 'manual' });
      const scale = Math.max(0.025, gesture.startDistance * 0.00145) * this.settings.panSensitivity;
      const basis = cameraPlanarBasis(this.desiredYaw);
      this.desiredPivot = clampPointToBounds({
        x: gesture.startPivot.x - dx * scale * basis.right.x + dy * scale * basis.forward.x,
        y: gesture.startPivot.y,
        z: gesture.startPivot.z - dx * scale * basis.right.z + dy * scale * basis.forward.z
      }, this.bounds, this.desiredDistance);
    } else if (gesture.kind === 'dolly') {
      const next = gesture.startDistance * Math.exp(dy * 0.0065 * this.settings.zoomSensitivity);
      this.desiredDistance = clamp(next, this.minDistance(), this.maxDistance());
    }
    if (gesture.moved) {
      this.lastDragAt = performanceNow();
      event.preventDefault?.();
    }
  }

  handlePointerUp(event) {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    if (this.pointer.moved) this.lastDragAt = performanceNow();
    this.pointer = null;
    this.element?.releasePointerCapture?.(event.pointerId);
  }

  handleWheel(event) {
    if (this.destroyed) return;
    event.preventDefault?.();
    const before = this.three.screenToGround?.(event.clientX, event.clientY, this.desiredPivot.y) ?? null;
    const direction = Math.sign(event.deltaY || 0);
    const factor = Math.exp(direction * 0.12 * this.settings.zoomSensitivity);
    const previous = this.desiredDistance;
    const next = clamp(previous * factor, this.minDistance(), this.maxDistance());
    this.desiredDistance = next;
    if (before && this.mode === 'free' && previous > 0) {
      const ratio = next / previous;
      const pull = clamp(1 - ratio, -0.35, 0.35);
      this.desiredPivot = clampPointToBounds({
        x: this.desiredPivot.x + (before.x - this.desiredPivot.x) * pull,
        y: this.desiredPivot.y + (before.y - this.desiredPivot.y) * Math.abs(pull) * 0.4,
        z: this.desiredPivot.z + (before.z - this.desiredPivot.z) * pull
      }, this.bounds, next);
    }
  }

  handleKeyDown(event) {
    if (this.destroyed || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return false;
    const code = event.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(code)) {
      this.keyState.add(code);
      event.preventDefault?.();
      return true;
    }
    if (code === 'KeyF' && !event.repeat) {
      event.preventDefault?.();
      this.toggleFocus();
      return true;
    }
    if ((code === 'ArrowLeft' || code === 'ArrowRight') && !event.repeat) {
      event.preventDefault?.();
      this.onCycleSelection(code === 'ArrowLeft' ? -1 : 1, Boolean(event.shiftKey));
      return true;
    }
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault?.();
      return true;
    }
    if (code === 'Home' && !event.repeat) {
      event.preventDefault?.();
      this.frameSelection({ immediate: false });
      return true;
    }
    if (code === 'Escape' && this.mode === 'focus') {
      event.preventDefault?.();
      this.leaveFocus({ restore: false, reason: 'escape' });
      return true;
    }
    return false;
  }

  toggleFocus() {
    if (this.mode === 'focus') return this.leaveFocus({ restore: true, reason: 'toggle' });
    return this.enterFocus(this.getSelection(), { immediate: false });
  }

  enterFocus(selection = this.getSelection(), { immediate = false } = {}) {
    const target = this.resolver.resolve(selection);
    if (!target) {
      this.onAnnounce('No focusable selection.');
      return false;
    }
    if (this.mode !== 'focus') this.lastFreePose = this.capturePose();
    this.mode = 'focus';
    this.focusSelection = target.selection;
    this.focusLabel = target.label;
    this.lastFocusPoint = copyPoint(target.point);
    this.focusVelocity = { x: 0, y: 0, z: 0 };
    this.desiredPivot = copyPoint(target.point);
    this.desiredDistance = clamp(target.distance, this.minDistance(), this.maxDistance());
    if (immediate || this.settings.reducedMotion) this.snapToDesired();
    this.emitMode();
    return true;
  }

  leaveFocus({ restore = false, reason = 'manual' } = {}) {
    if (this.mode !== 'focus') return false;
    this.mode = 'free';
    this.focusSelection = null;
    this.focusLabel = null;
    this.focusVelocity = { x: 0, y: 0, z: 0 };
    if (restore && this.lastFreePose) this.applyPose(this.lastFreePose, this.settings.reducedMotion);
    this.emitMode(reason);
    return true;
  }

  moveToSelection(selection = this.getSelection(), { focus = false, immediate = false } = {}) {
    if (focus) return this.enterFocus(selection, { immediate });
    const target = this.resolver.resolve(selection);
    if (!target) return false;
    if (this.mode === 'focus') this.leaveFocus({ restore: false, reason: 'selection' });
    this.desiredPivot = copyPoint(target.point);
    this.desiredDistance = clamp(target.distance, this.minDistance(), this.maxDistance());
    if (immediate || this.settings.reducedMotion) this.snapToDesired();
    this.emitMode();
    return true;
  }

  frameSelection({ immediate = false } = {}) {
    const selection = this.getSelection();
    const target = this.resolver.resolve(selection);
    if (!target) return false;
    if (this.mode === 'focus') {
      this.focusSelection = target.selection;
      this.focusLabel = target.label;
      this.desiredPivot = copyPoint(target.point);
      this.desiredDistance = clamp(target.distance, this.minDistance(), this.maxDistance());
      if (immediate || this.settings.reducedMotion) this.snapToDesired();
      this.emitMode();
      return true;
    }
    return this.moveToSelection(selection, { focus: false, immediate });
  }

  frameWorld({ immediate = false } = {}) {
    if (this.mode === 'focus') this.leaveFocus({ restore: false, reason: 'frame-world' });
    this.desiredPivot = {
      x: this.bounds.centerX,
      y: 2.8,
      z: this.bounds.centerZ
    };
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    this.desiredDistance = clamp(span * 0.62, this.minDistance(), this.maxDistance());
    if (immediate || this.settings.reducedMotion) this.snapToDesired();
  }

  update(dt) {
    if (this.destroyed) return;
    const safeDt = clamp(dt, 0, 0.06);
    this.updateKeyboard(safeDt);
    this.updateEdgeScroll(safeDt);
    this.updateFocus(safeDt);
    this.desiredPivot = clampPointToBounds(this.desiredPivot, this.bounds, this.desiredDistance);

    if (this.settings.reducedMotion) {
      this.snapToDesired();
    } else {
      const pivotStep = springPoint(this.pivot, this.pivotVelocity, this.desiredPivot, this.mode === 'focus' ? 2.5 : 2.9, safeDt);
      this.pivot = pivotStep.value;
      this.pivotVelocity = pivotStep.velocity;
      const yawTarget = this.yaw + normalizeYaw(this.desiredYaw - this.yaw);
      const yawStep = springScalar(this.yaw, this.yawVelocity, yawTarget, 3.2, safeDt);
      this.yaw = yawStep.value;
      this.yawVelocity = yawStep.velocity;
      const pitchStep = springScalar(this.pitch, this.pitchVelocity, this.desiredPitch, 3.4, safeDt);
      this.pitch = pitchStep.value;
      this.pitchVelocity = pitchStep.velocity;
      const distanceStep = springScalar(this.distance, this.distanceVelocity, this.desiredDistance, 3.8, safeDt);
      this.distance = distanceStep.value;
      this.distanceVelocity = distanceStep.velocity;
    }

    if (Math.abs(this.yaw) > Math.PI * 64) {
      this.yaw = normalizeYaw(this.yaw);
      this.desiredYaw = normalizeYaw(this.desiredYaw);
    }
    this.applyToThree();
  }

  updateKeyboard(dt) {
    const moveX = (this.keyState.has('KeyD') ? 1 : 0) - (this.keyState.has('KeyA') ? 1 : 0);
    const moveZ = (this.keyState.has('KeyW') ? 1 : 0) - (this.keyState.has('KeyS') ? 1 : 0);
    const rotate = (this.keyState.has('KeyE') ? 1 : 0) - (this.keyState.has('KeyQ') ? 1 : 0);
    if (rotate) this.desiredYaw += rotate * dt * 1.45 * this.settings.rotateSensitivity;
    if (!moveX && !moveZ) return;
    if (this.mode === 'focus') this.leaveFocus({ restore: false, reason: 'keyboard' });
    const magnitude = Math.max(1, length2(moveX, moveZ));
    const basis = cameraPlanarBasis(this.desiredYaw);
    const speed = clamp(this.desiredDistance * 0.72, 10, 54) * this.settings.panSensitivity;
    this.desiredPivot.x += ((basis.right.x * moveX + basis.forward.x * moveZ) / magnitude) * speed * dt;
    this.desiredPivot.z += ((basis.right.z * moveX + basis.forward.z * moveZ) / magnitude) * speed * dt;
  }

  updateEdgeScroll(dt) {
    if (!this.settings.edgeScroll || !this.inside || this.mode === 'focus' || !this.hoverPoint || this.pointer) return;
    const rect = this.element?.getBoundingClientRect?.();
    if (!rect) return;
    let x = 0; let z = 0;
    if (this.hoverPoint.x - rect.left < EDGE_SIZE) x -= 1;
    if (rect.right - this.hoverPoint.x < EDGE_SIZE) x += 1;
    if (this.hoverPoint.y - rect.top < EDGE_SIZE) z += 1;
    if (rect.bottom - this.hoverPoint.y < EDGE_SIZE) z -= 1;
    if (!x && !z) return;
    const basis = cameraPlanarBasis(this.desiredYaw);
    const speed = clamp(this.desiredDistance * 0.54, 8, 42) * this.settings.panSensitivity;
    this.desiredPivot.x += (basis.right.x * x + basis.forward.x * z) * speed * dt;
    this.desiredPivot.z += (basis.right.z * x + basis.forward.z * z) * speed * dt;
  }

  updateFocus(dt) {
    if (this.mode !== 'focus' || !this.focusSelection) return;
    const target = this.resolver.resolve(this.focusSelection);
    if (!target) {
      this.onAnnounce('Focus target lost.');
      this.leaveFocus({ restore: false, reason: 'lost' });
      return;
    }
    const current = copyPoint(target.point);
    if (this.lastFocusPoint) {
      const inv = 1 / Math.max(0.001, dt);
      const vx = (current.x - this.lastFocusPoint.x) * inv;
      const vy = (current.y - this.lastFocusPoint.y) * inv;
      const vz = (current.z - this.lastFocusPoint.z) * inv;
      this.focusVelocity.x += (vx - this.focusVelocity.x) * clamp(dt * 5, 0, 1);
      this.focusVelocity.y += (vy - this.focusVelocity.y) * clamp(dt * 5, 0, 1);
      this.focusVelocity.z += (vz - this.focusVelocity.z) * clamp(dt * 5, 0, 1);
    }
    this.lastFocusPoint = current;
    const lookAhead = target.dynamic ? 0.28 : 0;
    const predicted = {
      x: current.x + clamp(this.focusVelocity.x * lookAhead, -4, 4),
      y: current.y + clamp(this.focusVelocity.y * lookAhead, -1.5, 1.5),
      z: current.z + clamp(this.focusVelocity.z * lookAhead, -4, 4)
    };
    const delta = Math.hypot(predicted.x - this.desiredPivot.x, predicted.y - this.desiredPivot.y, predicted.z - this.desiredPivot.z);
    if (delta > Math.max(0.12, this.desiredDistance * 0.006)) this.desiredPivot = predicted;
    this.focusLabel = target.label;
  }

  capturePose() {
    return {
      pivot: copyPoint(this.desiredPivot),
      yaw: this.desiredYaw,
      pitch: this.desiredPitch,
      distance: this.desiredDistance
    };
  }

  applyPose(pose, immediate = false) {
    if (!pose) return;
    this.desiredPivot = copyPoint(pose.pivot);
    this.desiredYaw = Number(pose.yaw) || this.desiredYaw;
    this.desiredPitch = clamp(pose.pitch, MIN_PITCH, MAX_PITCH);
    this.desiredDistance = clamp(pose.distance, this.minDistance(), this.maxDistance());
    if (immediate) this.snapToDesired();
  }

  snapToDesired() {
    this.pivot = copyPoint(this.desiredPivot);
    this.pivotVelocity = { x: 0, y: 0, z: 0 };
    this.yaw = this.desiredYaw;
    this.yawVelocity = 0;
    this.pitch = this.desiredPitch;
    this.pitchVelocity = 0;
    this.distance = this.desiredDistance;
    this.distanceVelocity = 0;
    this.applyToThree();
  }

  applyToThree() {
    this.three.target?.set?.(this.pivot.x, this.pivot.y, this.pivot.z);
    this.three.desiredTarget?.set?.(this.pivot.x, this.pivot.y, this.pivot.z);
    this.three.azimuth = this.yaw;
    this.three.elevation = this.pitch;
    this.three.distance = this.distance;
    this.three.desiredDistance = this.distance;
  }

  emitMode(reason = null) {
    this.onModeChange({
      mode: this.mode,
      label: this.focusLabel,
      reason,
      settings: this.getSettings()
    });
  }

  suppressesClick() {
    return performanceNow() - this.lastDragAt < 80;
  }

  minDistance() { return this.three.minDistance ?? 14; }
  maxDistance() { return this.three.maxDistance ?? 110; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const el = this.element;
    if (el) {
      el.removeEventListener('pointerdown', this.onPointerDown);
      el.removeEventListener('pointermove', this.onPointerMove);
      el.removeEventListener('pointerup', this.onPointerUp);
      el.removeEventListener('pointercancel', this.onPointerUp);
      el.removeEventListener('pointerenter', this.onPointerEnter);
      el.removeEventListener('pointerleave', this.onPointerLeave);
      el.removeEventListener('wheel', this.onWheel);
      el.removeEventListener('contextmenu', this.onContextMenu);
    }
    this.windowRef?.removeEventListener?.('keyup', this.onKeyUp);
    this.windowRef?.removeEventListener?.('blur', this.onBlur);
    this.keyState.clear();
    this.pointer = null;
  }
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
