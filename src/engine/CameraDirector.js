const DEG15 = Math.PI / 12;

export class CameraDirector {
  constructor(three, { element = null, onChange = () => {} } = {}) {
    if (!three) throw new Error('CameraDirector requires a ThreeScene instance');
    this.three = three;
    this.element = element ?? three.renderer?.domElement ?? null;
    this.onChange = onChange;
    this.pointers = new Map();
    this.gesture = null;
    this.enabled = true;
    this.onPointerDown = event => this.handlePointerDown(event);
    this.onPointerMove = event => this.handlePointerMove(event);
    this.onPointerUp = event => this.handlePointerUp(event);
    this.install();
  }

  install() {
    if (!this.element) return;
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
  }

  rotate(direction = 1, amount = DEG15) {
    const delta = Math.sign(direction || 1) * amount;
    if (typeof this.three.orbitBy === 'function') this.three.orbitBy(delta, 0);
    else this.three.azimuth += delta;
    this.emit('rotate');
    return this.three.azimuth;
  }

  tilt(direction = 1, amount = 0.1) {
    const delta = Math.sign(direction || 1) * amount;
    if (typeof this.three.orbitBy === 'function') this.three.orbitBy(0, delta);
    else this.three.elevation = clamp(this.three.elevation + delta, 0.28, 1.26);
    this.emit('tilt');
    return this.three.elevation;
  }

  zoom(direction = 1, factor = 0.82) {
    this.three.noteInteraction?.();
    const current = Number(this.three.desiredDistance ?? this.three.distance ?? 52);
    const next = direction > 0 ? current * factor : current / factor;
    this.three.desiredDistance = clamp(next, this.three.minDistance ?? 12, this.three.maxDistance ?? 120);
    this.three.distance = this.three.desiredDistance;
    this.emit('zoom');
    return this.three.desiredDistance;
  }

  fit({ x, y = 2.8, z, distance, immediate = true } = {}) {
    if (![x, y, z].every(Number.isFinite)) return false;
    this.three.setCameraTarget(x, y, z, Number.isFinite(distance) ? distance : null, immediate);
    this.emit('fit');
    return true;
  }

  state() {
    return {
      azimuth: this.three.azimuth,
      elevation: this.three.elevation,
      distance: this.three.desiredDistance ?? this.three.distance,
      target: this.three.desiredTarget ? {
        x: this.three.desiredTarget.x,
        y: this.three.desiredTarget.y,
        z: this.three.desiredTarget.z
      } : null
    };
  }

  handlePointerDown(event) {
    if (!this.enabled) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) this.captureGesture();
  }

  handlePointerMove(event) {
    if (!this.enabled || !this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size !== 2) return;
    if (!this.gesture) this.captureGesture();
    const current = pairMetrics([...this.pointers.values()]);
    if (!current || !this.gesture) return;

    const angleDelta = normalizeAngle(current.angle - this.gesture.angle);
    const spanRatio = this.gesture.span / Math.max(1, current.span);
    const verticalDelta = current.centerY - this.gesture.centerY;

    this.three.noteInteraction?.();
    this.three.azimuth = this.gesture.azimuth - angleDelta;
    this.three.elevation = clamp(this.gesture.elevation + verticalDelta * 0.0032, 0.28, 1.26);
    const distance = clamp(this.gesture.distance * spanRatio, this.three.minDistance ?? 12, this.three.maxDistance ?? 120);
    this.three.distance = distance;
    this.three.desiredDistance = distance;
    this.emit('gesture');
  }

  handlePointerUp(event) {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.gesture = null;
  }

  captureGesture() {
    const metrics = pairMetrics([...this.pointers.values()]);
    if (!metrics) return;
    this.gesture = {
      ...metrics,
      azimuth: this.three.azimuth,
      elevation: this.three.elevation,
      distance: this.three.desiredDistance ?? this.three.distance
    };
  }

  emit(reason) {
    this.onChange({ reason, ...this.state() });
  }

  destroy() {
    if (this.element) {
      this.element.removeEventListener('pointerdown', this.onPointerDown);
      this.element.removeEventListener('pointermove', this.onPointerMove);
      this.element.removeEventListener('pointerup', this.onPointerUp);
      this.element.removeEventListener('pointercancel', this.onPointerUp);
    }
    this.pointers.clear();
    this.gesture = null;
  }
}

function pairMetrics(points) {
  if (points.length !== 2) return null;
  const [a, b] = points;
  return {
    span: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    centerX: (a.x + b.x) / 2,
    centerY: (a.y + b.y) / 2
  };
}

function normalizeAngle(value) {
  let result = value;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
