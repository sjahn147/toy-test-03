import assert from 'node:assert/strict';
import { CameraDirector } from '../src/engine/CameraDirector.js';

class FakeElement {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type, event) { for (const handler of this.listeners.get(type) ?? []) handler(event); }
}

const element = new FakeElement();
const target = { x: 0, y: 2.8, z: 0 };
const three = {
  azimuth: 0.78,
  elevation: 0.72,
  distance: 52,
  desiredDistance: 52,
  minDistance: 18,
  maxDistance: 88,
  desiredTarget: target,
  renderer: { domElement: element },
  setCameraTarget(x, y, z, distance) { target.x = x; target.y = y; target.z = z; if (distance != null) this.desiredDistance = distance; }
};

const changes = [];
const director = new CameraDirector(three, { element, onChange: event => changes.push(event.reason) });
const azimuth = three.azimuth;
director.rotate(1);
assert.ok(three.azimuth > azimuth);
const elevation = three.elevation;
director.tilt(-1);
assert.ok(three.elevation < elevation);
const distance = three.desiredDistance;
director.zoom(1);
assert.ok(three.desiredDistance < distance);
assert.equal(director.fit({ x: 4, y: 3, z: 9, distance: 30 }), true);
assert.deepEqual(target, { x: 4, y: 3, z: 9 });

const beforeGesture = director.state();
element.emit('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
element.emit('pointerdown', { pointerId: 2, clientX: 100, clientY: 0 });
element.emit('pointermove', { pointerId: 2, clientX: 70, clientY: 45 });
const afterGesture = director.state();
assert.notEqual(afterGesture.azimuth, beforeGesture.azimuth);
assert.notEqual(afterGesture.elevation, beforeGesture.elevation);
assert.notEqual(afterGesture.distance, beforeGesture.distance);
element.emit('pointerup', { pointerId: 1 });
element.emit('pointerup', { pointerId: 2 });
assert.ok(changes.includes('gesture'));
director.destroy();
assert.equal(element.listeners.get('pointermove')?.size ?? 0, 0);
console.log('WP6 camera director smoke: ok');
