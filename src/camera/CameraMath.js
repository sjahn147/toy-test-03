export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function normalizeYaw(value) {
  let result = Number(value) || 0;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
}

// Exact critically damped spring step. The result is stable across frame rates
// and does not require a fixed render timestep.
export function springScalar(current, velocity, target, frequency, dt) {
  const safeDt = clamp(dt, 0, 0.1);
  const omega = Math.max(0.001, frequency) * TAU;
  const offset = current - target;
  const decay = Math.exp(-omega * safeDt);
  const temp = (velocity + omega * offset) * safeDt;
  return {
    value: target + (offset + temp) * decay,
    velocity: (velocity - omega * temp) * decay
  };
}

export function springPoint(current, velocity, target, frequency, dt) {
  const x = springScalar(current.x, velocity.x, target.x, frequency, dt);
  const y = springScalar(current.y, velocity.y, target.y, frequency, dt);
  const z = springScalar(current.z, velocity.z, target.z, frequency, dt);
  return {
    value: { x: x.value, y: y.value, z: z.value },
    velocity: { x: x.velocity, y: y.velocity, z: z.velocity }
  };
}

export function computeMapBounds(rooms = [], marginRatio = 0.2, minimumMargin = 8) {
  const valid = rooms.filter(room => Number.isFinite(room?.x) && Number.isFinite(room?.z));
  if (!valid.length) return { minX: -40, maxX: 40, minZ: -40, maxZ: 40, centerX: 0, centerZ: 0 };
  const minX = Math.min(...valid.map(room => room.x - Math.max(1, room.w ?? 1) / 2));
  const maxX = Math.max(...valid.map(room => room.x + Math.max(1, room.w ?? 1) / 2));
  const minZ = Math.min(...valid.map(room => room.z - Math.max(1, room.d ?? 1) / 2));
  const maxZ = Math.max(...valid.map(room => room.z + Math.max(1, room.d ?? 1) / 2));
  const span = Math.max(maxX - minX, maxZ - minZ);
  const margin = Math.max(minimumMargin, span * marginRatio);
  return {
    minX: minX - margin,
    maxX: maxX + margin,
    minZ: minZ - margin,
    maxZ: maxZ + margin,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

export function clampPointToBounds(point, bounds, distance = 30) {
  if (!bounds) return { ...point };
  const extra = clamp(distance * 0.08, 0, 8);
  return {
    x: clamp(point.x, bounds.minX - extra, bounds.maxX + extra),
    y: point.y,
    z: clamp(point.z, bounds.minZ - extra, bounds.maxZ + extra)
  };
}

export function cameraPlanarBasis(yaw) {
  const forward = { x: -Math.cos(yaw), z: -Math.sin(yaw) };
  const right = { x: Math.cos(yaw + Math.PI / 2), z: Math.sin(yaw + Math.PI / 2) };
  return { forward, right };
}

export function length2(x, z) {
  return Math.hypot(x, z);
}

export function copyPoint(point = {}) {
  return { x: Number(point.x) || 0, y: Number(point.y) || 0, z: Number(point.z) || 0 };
}
