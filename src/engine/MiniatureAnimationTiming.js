const DEFAULT_DT = 1 / 60;

export function beginAnimationFrame(mesh, time) {
  const previous = mesh?.userData?.lastAnimationTime;
  const safeTime = Number.isFinite(time) ? time : 0;
  const dt = Number.isFinite(previous) ? clampDt(safeTime - previous) : DEFAULT_DT;
  if (mesh?.userData) {
    mesh.userData.lastAnimationTime = safeTime;
    mesh.userData.animationDeltaSeconds = dt;
  }
  return dt;
}

export function getAnimationDelta(mesh) {
  return clampDt(mesh?.userData?.animationDeltaSeconds ?? DEFAULT_DT);
}

export function smoothingAlpha(speed, dt) {
  return 1 - Math.exp(-Math.max(0, speed) * clampDt(dt));
}

export function resolveAttack