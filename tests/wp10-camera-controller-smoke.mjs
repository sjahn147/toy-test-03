import assert from 'node:assert/strict';
import { StrategyCameraController } from '../src/camera/StrategyCameraController.js';

class FakeElement {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 }; }
}
class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; }
}
const element = new FakeElement();
const three = {
  renderer: { domElement: element },
  target: new Vec3(0, 2.8, 0),
  desiredTarget: new Vec3(0, 2.8, 0),
  azimuth: 0.7,
  elevation: 0.72,
  distance: 42,
  desiredDistance: 42,
  minDistance: 12,
  maxDistance: 100,
  screenToGround: () => ({ x: 10, y: 2.8, z: 8 })
};
let focusPoint = { x: 4, y: 2, z: 5 };
const resolver = {
  resolve(selection) {
    if (!selection) return null;
    return { selection: { ...selection }, point: { ...focusPoint }, distance: 24, dynamic: true, label: 'Nibble' };
  }
};
const storageData = new Map();
const storage = { getItem: key => storageData.get(key) ?? null, setItem: (key, value) => storageData.set(key, value) };
const modes = [];
let selection = { type: 'agent', id: 'nibble' };
let cycle = null;
const controller = new StrategyCameraController({
  three,
  element,
  scenario: { rooms: [{ id: 'r', x: 0, z: 0, w: 50, d: 40 }] },
  resolver,
  getSelection: () => selection,
  onModeChange: state => modes.push(state.mode),
  onCycleSelection: (direction, heroesOnly) => { cycle = { direction, heroesOnly }; },
  storage,
  windowRef: { addEventListener() {}, removeEventListener() {} }
});
assert.equal(controller.mode, 'free');
assert.equal(controller.enterFocus(selection), true);
assert.equal(controller.mode, 'focus');
for (let i = 0; i < 60; i += 1) controller.update(1 / 60);
assert.ok(Math.abs(three.target.x - 4) < 0.2);
focusPoint = { x: 9, y: 2, z: 6 };
for (let i = 0; i < 30; i += 1) controller.update(1 / 60);
assert.ok(three.target.x > 5);

controller.handlePointerDown({ button: 2, pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
controller.handlePointerMove({ pointerId: 1, clientX: 150, clientY: 120, preventDefault() {} });
assert.equal(controller.mode, 'free');
controller.handlePointerUp({ pointerId: 1 });

const beforeZoom = controller.desiredDistance;
controller.handleWheel({ clientX: 400, clientY: 300, deltaY: -100, preventDefault() {} });
assert.ok(controller.desiredDistance < beforeZoom);

const keyEvent = (code, extra = {}) => ({ code, key: '', repeat: false, preventDefault() {}, target: null, ...extra });
controller.handleKeyDown(keyEvent('KeyF'));
assert.equal(controller.mode, 'focus');
controller.handleKeyDown(keyEvent('ArrowRight', { shiftKey: true }));
assert.deepEqual(cycle, { direction: 1, heroesOnly: true });
controller.handleKeyDown(keyEvent('KeyF'));
assert.equal(controller.mode, 'free');
controller.handleKeyDown(keyEvent('KeyW'));
const beforeMove = { ...controller.desiredPivot };
controller.update(0.2);
assert.notDeepEqual(controller.desiredPivot, beforeMove);
controller.onKeyUp({ code: 'KeyW' });

controller.applySettings({ invertY: true, edgeScroll: true, rotateSensitivity: 1.3 });
assert.equal(controller.getSettings().invertY, true);
assert.equal(controller.getSettings().edgeScroll, true);
assert.ok(modes.includes('focus') && modes.includes('free'));
controller.destroy();
assert.equal(controller.destroyed, true);
console.log('WP10 camera controller smoke passed');
