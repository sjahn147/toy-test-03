import assert from 'node:assert/strict';
import { clampPointToBounds, computeMapBounds, normalizeYaw, springScalar } from '../src/camera/CameraMath.js';

const rooms = [
  { x: -10, z: 4, w: 8, d: 6 },
  { x: 18, z: -12, w: 12, d: 10 }
];
const bounds = computeMapBounds(rooms);
assert.ok(bounds.minX < -14 && bounds.maxX > 24);
assert.ok(bounds.minZ < -17 && bounds.maxZ > 7);
const clamped = clampPointToBounds({ x: 999, y: 3, z: -999 }, bounds, 20);
assert.ok(clamped.x <= bounds.maxX + 8);
assert.ok(clamped.z >= bounds.minZ - 8);
assert.ok(Math.abs(normalizeYaw(Math.PI * 9) - Math.PI) < 1e-9 || Math.abs(normalizeYaw(Math.PI * 9) + Math.PI) < 1e-9);

function simulate(dt, seconds) {
  let value = 0;
  let velocity = 0;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    const step = springScalar(value, velocity, 10, 3, Math.min(dt, seconds - t));
    value = step.value;
    velocity = step.velocity;
  }
  return value;
}
const at30 = simulate(1 / 30, 1);
const at60 = simulate(1 / 60, 1);
const at120 = simulate(1 / 120, 1);
assert.ok(Math.abs(at30 - at60) < 0.003, `${at30} vs ${at60}`);
assert.ok(Math.abs(at60 - at120) < 0.003, `${at60} vs ${at120}`);
console.log('WP10 camera math smoke passed');
