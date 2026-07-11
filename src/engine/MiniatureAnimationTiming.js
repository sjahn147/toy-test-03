const DEFAULT_FRAME_SECONDS = 1 / 60;
const MIN_FRAME_SECONDS = 1 / 240;
const MAX_FRAME_SECONDS = 0.1;

export function beginAnimationFrame(mesh, time) {
  const previous = mesh?.userData?.lastAnimationTime;
  const safeTime = Number.isFinite(time) ? time : 0;
  const delta = Number.isFinite(previous)
    ? clampElapsed(safeTime - previous)
    : DEFAULT_FRAME_SECONDS;

  if (mesh?.userData) {
    mesh.userData.lastAnimationTime = safeTime;
    mesh.userData.animationDeltaSeconds = delta;
  }
  return delta;
}

export function getAnimationDelta(mesh) {
  const value = mesh?.userData?.animationDeltaSeconds;
  return Number.isFinite(value) ? clampElapsed(value) : DEFAULT_FRAME_SECONDS;
}

export function smoothingAlpha(speed, deltaSeconds) {
  const safeSpeed = Math.max(0, Number.isFinite(speed) ? speed : 0);
  const delta = Number.isFinite(deltaSeconds) ? clampElapsed(deltaSeconds) : DEFAULT_FRAME_SECONDS;
  if (safeSpeed === 0 || delta === 0) return 0;
  return 1 - Math.exp(-safeSpeed * delta);
}

export function resolveAttackTimeline(agent, time, seed, effects = []) {
  const sourceHit = latestSourceAttack(agent?.id, time, effects);
  if (sourceHit) {
    const duration = Math.max(0.18, sourceHit.duration ?? 0.58);
    const progress = clamp01((time - sourceHit.createdAt) / duration);
    const strike = 1 - smoothstep(Math.min(1, progress / 0.34));
    const recover = progress < 0.2 ? 0 : 1 - smoothstep((progress - 0.2) / 0.8);
    return {
      active: true,
      eventDriven: true,
      windup: 0,
      strike,
      recover,
      twist: strike * 0.52 + recover * 0.08,
      progress
    };
  }

  if (!agent?.combat) return idleAttackTimeline();
  const speed = attackCycleSpeed(agent.role);
  const cycle = positiveModulo(time * speed + seed * 0.37, 1);
  const windup = cycle < 0.34 ? smoothPulse(cycle / 0.34) : 0;
  const strike = cycle >= 0.34 && cycle < 0.5 ? smoothPulse((cycle - 0.34) / 0.16) : 0;
  const recover = cycle >= 0.5 ? 1 - smoothstep((cycle - 0.5) / 0.5) : 0;
  return {
    active: true,
    eventDriven: false,
    windup,
    strike,
    recover,
    twist: -windup * 0.34 + strike * 0.48 + recover * 0.1,
    progress: cycle
  };
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function latestSourceAttack(agentId, time, effects) {
  if (!agentId) return null;
  let latest = null;
  for (const effect of effects) {
    if (effect?.type !== 'attack' || effect.sourceAgentId !== agentId) continue;
    const createdAt = Number.isFinite(effect.createdAt) ? effect.createdAt : time;
    const duration = Math.max(0.18, effect.duration ?? 0.58);
    const age = time - createdAt;
    if (age < -0.001 || age > duration) continue;
    if (!latest || createdAt > latest.createdAt) latest = { ...effect, createdAt, duration };
  }
  return latest;
}

function idleAttackTimeline() {
  return { active: false, eventDriven: false, windup: 0, strike: 0, recover: 0, twist: 0, progress: 0 };
}

function attackCycleSpeed(role) {
  if (role === 'ogre') return 0.78;
  if (role === 'rogue' || role === 'goblin' || role === 'kobold') return 1.28;
  if (role === 'orc') return 0.9;
  return 1;
}

function smoothPulse(value) {
  return Math.sin(clamp01(value) * Math.PI / 2);
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function clampElapsed(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(MIN_FRAME_SECONDS, Math.min(MAX_FRAME_SECONDS, value));
}
