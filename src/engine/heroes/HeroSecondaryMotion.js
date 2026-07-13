const MAX_FRAME = 1 / 20;
const FIXED_STEP = 1 / 60;
const TAU = Math.PI * 2;

/**
 * Applies deterministic, volume-safe secondary motion to articulated hero rigs.
 * The factory provides config records in mesh.userData.secondaryMotionConfig.
 * State is stored on the mesh and therefore never leaks between unique heroes.
 */
export function updateHeroSecondaryMotion(mesh, agent, time = 0) {
  const configs = mesh?.userData?.secondaryMotionConfig ?? [];
  const joints = mesh?.userData?.joints ?? {};
  if (!configs.length || !joints) return false;

  const state = mesh.userData.secondaryMotionState ??= {
    lastTime: time,
    channels: Object.create(null)
  };
  let delta = Number.isFinite(time - state.lastTime) ? time - state.lastTime : FIXED_STEP;
  state.lastTime = time;
  delta = clamp(delta, 0, MAX_FRAME);
  if (delta <= 0) delta = FIXED_STEP;

  const moving = Boolean(agent?.travel) || agent?.mood === 'retreating';
  const castWeight = agent?.heroCast ? phaseWeight(agent.heroCast) : 0;
  const seedValue = seeded(agent?.id ?? agent?.heroId ?? 'hero');

  for (const config of configs) {
    const names = config.joints ?? [];
    for (let index = 0; index < names.length; index += 1) {
      const joint = joints[names[index]];
      const base = joint?.userData?.baseTransform;
      if (!joint || !base) continue;
      const key = `${config.id ?? config.mode}:${names[index]}`;
      const channel = state.channels[key] ??= createChannel();
      const target = targetFor(config, index, names.length, time, moving, castWeight, seedValue, agent);
      integrate(channel, target, delta, config.stiffness ?? 18, config.damping ?? 7);
      applyChannel(joint, base, channel, config);
    }
  }
  return true;
}

export function resetHeroSecondaryMotion(mesh) {
  if (!mesh?.userData) return;
  mesh.userData.secondaryMotionState = null;
}

export function secondaryMotionSnapshot(mesh) {
  const state = mesh?.userData?.secondaryMotionState;
  if (!state) return { lastTime: 0, channels: {} };
  return {
    lastTime: state.lastTime,
    channels: Object.fromEntries(Object.entries(state.channels).map(([key, value]) => [key, { ...value }]))
  };
}

export function applyVolumePreservingSquash(joint, compression = 0, lateralBias = 0) {
  if (!joint) return false;
  const c = clamp(compression, -0.45, 0.55);
  const y = Math.max(0.45, 1 - c);
  const lateral = Math.sqrt(1 / y);
  joint.scale.x *= lateral * (1 + lateralBias);
  joint.scale.y *= y;
  joint.scale.z *= lateral * (1 - lateralBias);
  return true;
}

function createChannel() {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
}

function integrate(channel, target, delta, stiffness, damping) {
  let remaining = delta;
  while (remaining > 0.000001) {
    const step = Math.min(FIXED_STEP, remaining);
    springAxis(channel, 'x', 'vx', target.x, step, stiffness, damping);
    springAxis(channel, 'y', 'vy', target.y, step, stiffness, damping);
    springAxis(channel, 'z', 'vz', target.z, step, stiffness, damping);
    remaining -= step;
  }
}

function springAxis(channel, valueKey, velocityKey, target, dt, stiffness, damping) {
  const acceleration = (target - channel[valueKey]) * stiffness;
  channel[velocityKey] += acceleration * dt;
  channel[velocityKey] *= Math.exp(-damping * dt);
  channel[valueKey] += channel[velocityKey] * dt;
  if (!Number.isFinite(channel[valueKey]) || !Number.isFinite(channel[velocityKey])) {
    channel[valueKey] = 0;
    channel[velocityKey] = 0;
  }
}

function targetFor(config, index, count, time, moving, castWeight, seedValue, agent) {
  const amplitude = config.amplitude ?? 0.12;
  const phase = time * (config.frequency ?? 1.4) + seedValue + index * (config.phaseStep ?? 0.42);
  const normalized = count <= 1 ? 0 : index / (count - 1);
  const motion = moving ? (config.movementMultiplier ?? 1.8) : 1;
  const cast = 1 + castWeight * (config.castMultiplier ?? 0.7);

  if (config.mode === 'veil-chain') {
    const trailing = normalized * normalized;
    return {
      x: Math.sin(phase * 0.73) * amplitude * (0.45 + trailing) * cast,
      y: Math.cos(phase * 0.41) * amplitude * 0.18,
      z: Math.sin(phase) * amplitude * (0.3 + trailing * motion)
    };
  }
  if (config.mode === 'floating-hands') {
    return {
      x: Math.sin(phase * 0.85) * amplitude * 0.45,
      y: Math.cos(phase * 0.64) * amplitude,
      z: Math.sin(phase * 0.58 + 1.2) * amplitude * 0.5
    };
  }
  if (config.mode === 'root-tendrils') {
    const planted = agent?.heroStatuses?.solitaryBloom ? 1.35 : 1;
    return {
      x: Math.sin(phase) * amplitude * (0.4 + normalized) * planted,
      y: Math.max(0, Math.sin(phase * 0.52)) * amplitude * 0.18,
      z: Math.cos(phase * 0.82) * amplitude * (0.35 + normalized * 0.65)
    };
  }
  if (config.mode === 'artifact-float') {
    const stanceIndex = stancePhase(agent?.heroStance);
    return {
      x: Math.sin(phase + stanceIndex) * amplitude * (0.65 + normalized * 0.25),
      y: Math.cos(phase * 0.73 + normalized * TAU) * amplitude * 0.7,
      z: Math.sin(phase * 0.61 + normalized * 1.7) * amplitude * 0.85
    };
  }
  if (config.mode === 'crown-stabilizer') {
    return {
      x: Math.sin(phase * 0.48) * amplitude * 0.12,
      y: Math.cos(phase * 0.62) * amplitude * 0.45,
      z: -Math.sin(phase * 0.48) * amplitude * 0.12
    };
  }
  return {
    x: Math.sin(phase) * amplitude,
    y: Math.cos(phase * 0.77) * amplitude * 0.5,
    z: Math.sin(phase * 0.53) * amplitude * 0.7
  };
}

function applyChannel(joint, base, channel, config) {
  const property = config.property ?? 'rotation';
  const scale = config.outputScale ?? 1;
  if (property === 'position') {
    joint.position.x += channel.x * scale;
    joint.position.y += channel.y * scale;
    joint.position.z += channel.z * scale;
  } else {
    joint.rotation.x += channel.x * scale;
    joint.rotation.y += channel.y * scale;
    joint.rotation.z += channel.z * scale;
  }
}

function phaseWeight(cast) {
  if (cast.phase === 'impact') return 1;
  if (cast.phase === 'windup') return clamp(cast.elapsed / Math.max(0.001, cast.duration), 0, 1);
  return 1 - clamp(cast.elapsed / Math.max(0.001, cast.duration), 0, 1);
}

function stancePhase(stance) {
  if (stance === 'key') return 0.9;
  if (stance === 'chalice') return 1.8;
  if (stance === 'throne') return 2.7;
  return 0;
}

function seeded(value) {
  let result = 2166136261;
  for (const character of String(value ?? '')) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return ((result >>> 0) % 10000) / 10000 * TAU;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
