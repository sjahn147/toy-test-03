const channel = (joint, property, keys, easing = 'smooth') => Object.freeze({ joint, property, keys: Object.freeze(keys.map(key => Object.freeze([...key]))), easing });
const clip = (id, duration, channels, options = {}) => Object.freeze({
  id,
  duration,
  loop: options.loop ?? false,
  channels: Object.freeze(channels),
  events: Object.freeze((options.events ?? []).map(event => Object.freeze({ ...event })))
});

export const HERO_ANIMATION_CLIPS = Object.freeze({
  nibble: Object.freeze({
    'idle-primary': clip('nibble.idle-primary', 3.4, [
      channel('head', 'rotation.y', [[0, -0.08], [0.35, 0.14], [0.62, -0.04], [1, -0.08]]),
      channel('handL', 'rotation.x', [[0, 0], [0.42, -0.45], [0.58, -0.45], [1, 0]]),
      channel('coatLeft', 'rotation.z', [[0, 0.02], [0.5, -0.035], [1, 0.02]])
    ], { loop: true }),
    'idle-secondary': clip('nibble.idle-secondary', 2.8, [
      channel('staff', 'rotation.z', [[0, 0.04], [0.5, -0.06], [1, 0.04]]),
      channel('keyRing', 'rotation.y', [[0, 0], [1, 0.62]], 'linear'),
      channel('coatRight', 'rotation.z', [[0, -0.02], [0.5, 0.045], [1, -0.02]])
    ], { loop: true }),
    'skill:nibble-lock-the-ways': clip('nibble.lock-the-ways', 1.55, [
      channel('chest', 'rotation.y', [[0, 0], [0.32, -0.35], [0.64, 0.22], [1, 0]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.28, -1.15], [0.64, 0.48], [1, 0]]),
      channel('staff', 'rotation.z', [[0, 0], [0.3, -0.5], [0.64, 0.78], [1, 0]]),
      channel('coatLeft', 'rotation.z', [[0, 0], [0.55, 0.42], [1, 0.08]]),
      channel('coatRight', 'rotation.z', [[0, 0], [0.55, -0.42], [1, -0.08]])
    ], { events: [{ at: 0.64, type: 'impact' }] }),
    'skill:nibble-master-key': clip('nibble.master-key', 1.25, [
      channel('head', 'rotation.x', [[0, 0], [0.3, 0.18], [0.74, -0.12], [1, 0]]),
      channel('handL', 'rotation.z', [[0, 0], [0.24, -0.85], [0.48, 0.65], [0.72, -0.5], [1, 0]]),
      channel('keyRing', 'rotation.y', [[0, 0], [1, 3.2]], 'linear')
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    'skill:nibble-everyone-out': clip('nibble.everyone-out', 1.9, [
      channel('motionRoot', 'position.y', [[0, 0], [0.38, -0.08], [0.7, 0.1], [1, 0]]),
      channel('shoulderL', 'rotation.z', [[0, 0], [0.55, -1.05], [1, -0.25]]),
      channel('shoulderR', 'rotation.z', [[0, 0], [0.55, 1.05], [1, 0.25]]),
      channel('coatLeft', 'rotation.z', [[0, 0], [0.55, 0.85], [1, 0.2]]),
      channel('coatRight', 'rotation.z', [[0, 0], [0.55, -0.85], [1, -0.2]])
    ], { events: [{ at: 0.58, type: 'impact' }] }),
    death: clip('nibble.death', 1.8, [
      channel('motionRoot', 'rotation.z', [[0, 0], [0.6, 1.2], [1, 1.45]]),
      channel('staff', 'rotation.z', [[0, 0], [1, -1.8]]),
      channel('coatBack', 'rotation.x', [[0, 0], [1, -0.8]])
    ])
  }),

  'kirik-tripod': Object.freeze({
    'idle-primary': clip('kirik.idle-primary', 2.6, [
      channel('pilotHead', 'rotation.y', [[0, -0.12], [0.45, 0.18], [1, -0.12]]),
      channel('toolArmL', 'rotation.z', [[0, 0.1], [0.5, -0.2], [1, 0.1]]),
      channel('gear', 'rotation.y', [[0, 0], [1, 0.55]], 'linear')
    ], { loop: true }),
    'idle-secondary': clip('kirik.idle-secondary', 3.2, [
      channel('toolArmR', 'rotation.x', [[0, -0.1], [0.38, -0.7], [0.62, -0.2], [1, -0.1]]),
      channel('lens', 'rotation.z', [[0, 0], [1, 1.2]], 'linear')
    ], { loop: true }),
    'skill:kirik-gear-lockfield': clip('kirik.gear-lockfield', 1.8, [
      channel('chassis', 'position.y', [[0, 0], [0.45, -0.18], [1, -0.08]]),
      channel('toolArmL', 'rotation.x', [[0, 0], [0.48, -1.15], [0.78, 0.55], [1, 0]]),
      channel('toolArmR', 'rotation.x', [[0, 0], [0.48, -1.15], [0.78, 0.55], [1, 0]]),
      channel('gear', 'rotation.y', [[0, 0], [1, 5.6]], 'linear')
    ], { events: [{ at: 0.76, type: 'impact' }] }),
    'skill:kirik-reconfigure-trap': clip('kirik.reconfigure', 1.45, [
      channel('toolArmL', 'rotation.z', [[0, 0], [0.25, -0.65], [0.5, 0.58], [0.75, -0.46], [1, 0]]),
      channel('toolArmR', 'rotation.z', [[0, 0], [0.25, 0.65], [0.5, -0.58], [0.75, 0.46], [1, 0]]),
      channel('pilotHead', 'rotation.x', [[0, 0], [0.55, 0.26], [1, 0]])
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    'skill:kirik-triangle-bastion': clip('kirik.triangle-bastion', 2.3, [
      channel('chassis', 'position.y', [[0, 0], [0.52, -0.32], [1, -0.24]]),
      channel('leg0', 'rotation.z', [[0, 0], [0.62, -0.38], [1, -0.28]]),
      channel('leg1', 'rotation.z', [[0, 0], [0.62, 0.38], [1, 0.28]]),
      channel('leg2', 'rotation.x', [[0, 0], [0.62, -0.32], [1, -0.22]]),
      channel('stabilizer0', 'rotation.x', [[0, 0], [0.68, -1.0], [1, -0.9]]),
      channel('stabilizer1', 'rotation.x', [[0, 0], [0.68, -1.0], [1, -0.9]]),
      channel('stabilizer2', 'rotation.x', [[0, 0], [0.68, -1.0], [1, -0.9]]),
      channel('gear', 'rotation.y', [[0, 0], [1, 7.2]], 'linear')
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    death: clip('kirik.death', 2.1, [
      channel('chassis', 'rotation.z', [[0, 0], [0.7, 0.62], [1, 1.18]]),
      channel('leg0', 'rotation.z', [[0, 0], [1, 0.8]]),
      channel('leg1', 'rotation.z', [[0, 0], [1, -0.85]]),
      channel('gear', 'rotation.y', [[0, 0], [1, 10]], 'linear')
    ])
  }),

  'karg-heavy': Object.freeze({
    'idle-primary': clip('karg.idle-primary', 3.1, [
      channel('chest', 'rotation.y', [[0, -0.04], [0.5, 0.05], [1, -0.04]]),
      channel('weaponRoot', 'rotation.z', [[0, 0.06], [0.5, -0.05], [1, 0.06]]),
      channel('head', 'rotation.y', [[0, -0.08], [0.6, 0.1], [1, -0.08]])
    ], { loop: true }),
    'idle-secondary': clip('karg.idle-secondary', 3.8, [
      channel('bannerL', 'rotation.z', [[0, 0.08], [0.5, -0.09], [1, 0.08]]),
      channel('bannerR', 'rotation.z', [[0, -0.08], [0.5, 0.09], [1, -0.08]])
    ], { loop: true }),
    'skill:karg-declare-duel': clip('karg.declare-duel', 1.35, [
      channel('chest', 'rotation.x', [[0, 0], [0.35, 0.12], [0.72, -0.08], [1, 0]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.42, -0.95], [0.72, 0.12], [1, 0]]),
      channel('weaponRoot', 'rotation.z', [[0, 0], [0.42, -1.1], [0.72, -0.05], [1, 0]])
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    'skill:karg-broken-blade-circle': clip('karg.blade-circle', 1.15, [
      channel('motionRoot', 'rotation.y', [[0, 0], [1, 6.283]], 'linear'),
      channel('weaponRoot', 'rotation.x', [[0, 0], [0.25, -0.55], [0.78, 0.35], [1, 0]]),
      channel('chest', 'rotation.z', [[0, 0], [0.42, -0.2], [0.76, 0.22], [1, 0]])
    ], { events: [{ at: 0.68, type: 'impact' }] }),
    'skill:karg-remember-second-defeat': clip('karg.second-defeat', 2.05, [
      channel('motionRoot', 'position.y', [[0, 0], [0.45, -0.12], [0.72, 0.14], [1, 0]]),
      channel('shoulderL', 'rotation.z', [[0, 0], [0.55, -0.7], [1, -0.15]]),
      channel('shoulderR', 'rotation.z', [[0, 0], [0.55, 0.7], [1, 0.15]]),
      channel('chest', 'rotation.x', [[0, 0], [0.55, -0.3], [0.76, 0.25], [1, 0]])
    ], { events: [{ at: 0.68, type: 'armor-release' }, { at: 0.76, type: 'impact' }] }),
    death: clip('karg.death', 2.4, [
      channel('motionRoot', 'rotation.z', [[0, 0], [0.72, -0.86], [1, -1.34]]),
      channel('weaponRoot', 'rotation.z', [[0, 0], [1, 1.7]]),
      channel('head', 'rotation.x', [[0, 0], [1, -0.5]])
    ])
  })
});

export function getHeroAnimationClip(profile, clipId) {
  return HERO_ANIMATION_CLIPS[profile]?.[clipId] ?? null;
}
