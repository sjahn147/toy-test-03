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

export function resolveAttackTimeline(agent, time, seed, effects = []) {
  const event = effects
    .filter(effect => effect.type === 'attack' && effect.sourceAgentId === agent?.id)
    .filter(effect => {
      const createdAt = effect.createdAt ?? time;
      const duration = Math.max(0.18, effect.duration ?? 0.58);
      return time >= createdAt && time <= createdAt + duration;
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];

  if (event) {
    const createdAt = event.createdAt ?? time;
    const duration = Math.max(0.18, event.duration ?? 0.58);
    const progress = clamp01((time - createdAt) / duration);
    const strike = 1 - smoothstep(progress / 0.34);
    return {
      active: true,
      eventDriven: true,
      windup: 0,
      strike,
      recover: progress < 0.2 ? 0 : 1 - smoothstep((progress - 0.2) / 0.8),
      twist: strike * 0.52,
      progress
    };
  }

  if (!agent?.combat) {
    return { active: false, eventDriven: false, windup: 0, strike: 0, recover: 0, twist: 0, progress: 0 };
  }

  const speed = attackSpeed(agent.role);
  const cycle = positiveModulo(time * speed + seed * 0.37, 1);
  const windup = cycle < 0.34 ? pulse(cycle / 0.34) : 0;
  const strike = cycle >= 0.34 && cycle < 0.5 ? pulse((cycle - 0.34) / 0.16) : 0;
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

export function corpseProgress(agent, time) {
  if (!agent?.corpse || !Number.isFinite(agent.deathAt)) return 0;
  return clamp01((time - agent.deathAt) / Math.max(0.01, agent.corpseLinger ?? 2.4));
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function attackSpeed(role) {
  if (role === 'ogre') return 0.78;
  if (role === 'orc') return 0.9;
  if (role === 'rogue' || role === 'goblin' || role === 'kobold') return 1.28;
  return 1;
}

function pulse(value) {
  return Math.sin(clamp01(value) * Math.PI / 2);
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function clampDt(value) {
  const safe = Number.isFinite(value) && value > 0 ? value : DEFAULT_DT;
  return Math.max(1 / 240, Math.min(0.1, safe));
}
