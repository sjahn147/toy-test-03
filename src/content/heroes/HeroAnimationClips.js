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
  }),

  'isara-spectral': Object.freeze({
    'idle-primary': clip('isara.idle-primary', 4.2, [
      channel('crown', 'position.y', [[0, 0.03], [0.5, 0.12], [1, 0.03]]),
      channel('handL', 'position.y', [[0, -0.02], [0.5, 0.08], [1, -0.02]]),
      channel('handR', 'position.y', [[0, 0.04], [0.5, -0.05], [1, 0.04]]),
      channel('faceVoid', 'scale.y', [[0, 0], [0.5, 0.12], [1, 0]])
    ], { loop: true }),
    'idle-secondary': clip('isara.idle-secondary', 5.1, [
      channel('veilRoot', 'rotation.y', [[0, -0.03], [0.5, 0.05], [1, -0.03]]),
      channel('shadow0', 'rotation.z', [[0, 0.04], [0.5, -0.07], [1, 0.04]]),
      channel('shadow1', 'rotation.z', [[0, -0.03], [0.5, 0.08], [1, -0.03]])
    ], { loop: true }),
    'skill:isara-mourning-veil': clip('isara.mourning-veil', 1.75, [
      channel('crown', 'position.y', [[0, 0], [0.55, 0.28], [1, 0.14]]),
      channel('handL', 'rotation.z', [[0, 0], [0.52, -1.05], [1, -0.22]]),
      channel('handR', 'rotation.z', [[0, 0], [0.52, 1.05], [1, 0.22]]),
      channel('veilRoot', 'scale.x', [[0, 0], [0.62, 0.48], [1, 0.16]]),
      channel('veilRoot', 'scale.z', [[0, 0], [0.62, 0.42], [1, 0.14]])
    ], { events: [{ at: 0.64, type: 'impact' }] }),
    'skill:isara-soul-procession': clip('isara.soul-procession', 2.0, [
      channel('motionRoot', 'position.y', [[0, 0], [0.58, 0.22], [1, 0.08]]),
      channel('crown', 'rotation.y', [[0, 0], [1, 3.4]], 'linear'),
      channel('handL', 'rotation.x', [[0, 0], [0.58, -0.72], [1, -0.15]]),
      channel('handR', 'rotation.x', [[0, 0], [0.58, -0.72], [1, -0.15]]),
      channel('shadow2', 'scale.y', [[0, 0], [0.7, 0.65], [1, 0.15]])
    ], { events: [{ at: 0.68, type: 'impact' }] }),
    'skill:isara-unburied-queen': clip('isara.unburied-queen', 2.35, [
      channel('crown', 'position.y', [[0, 0], [0.64, 0.58], [1, 0.34]]),
      channel('crown', 'scale.x', [[0, 0], [0.64, 0.36], [1, 0.2]]),
      channel('veilRoot', 'scale.x', [[0, 0], [0.72, 0.7], [1, 0.38]]),
      channel('veilRoot', 'scale.z', [[0, 0], [0.72, 0.7], [1, 0.38]]),
      channel('faceVoid', 'scale.y', [[0, 0], [0.72, 0.9], [1, 0.42]]),
      channel('handL', 'position.x', [[0, 0], [0.72, -0.38], [1, -0.18]]),
      channel('handR', 'position.x', [[0, 0], [0.72, 0.38], [1, 0.18]])
    ], { events: [{ at: 0.73, type: 'impact' }] }),
    death: clip('isara.death', 2.8, [
      channel('crown', 'position.y', [[0, 0], [0.4, -0.2], [1, -1.3]]),
      channel('crown', 'rotation.z', [[0, 0], [1, 1.4]]),
      channel('veilRoot', 'scale.y', [[0, 0], [1, -0.75]]),
      channel('motionRoot', 'position.y', [[0, 0], [1, -0.9]])
    ])
  }),

  'orum-fungal': Object.freeze({
    'idle-primary': clip('orum.idle-primary', 4.6, [
      channel('capRoot', 'rotation.z', [[0, -0.025], [0.5, 0.035], [1, -0.025]]),
      channel('chest', 'scale.y', [[0, 0], [0.5, 0.045], [1, 0]]),
      channel('branchHand', 'rotation.y', [[0, -0.08], [0.5, 0.12], [1, -0.08]])
    ], { loop: true }),
    'idle-secondary': clip('orum.idle-secondary', 5.4, [
      channel('sporeSacL', 'scale.x', [[0, 0], [0.5, 0.16], [1, 0]]),
      channel('sporeSacR', 'scale.x', [[0, 0.12], [0.5, 0], [1, 0.12]]),
      channel('mantle0', 'rotation.z', [[0, 0.04], [0.5, -0.05], [1, 0.04]])
    ], { loop: true }),
    'skill:orum-mycelial-lance': clip('orum.mycelial-lance', 1.25, [
      channel('chest', 'rotation.y', [[0, 0], [0.35, -0.42], [0.7, 0.34], [1, 0]]),
      channel('spearRoot', 'rotation.x', [[0, 0], [0.35, -1.08], [0.72, 0.38], [1, 0]]),
      channel('spearShaft', 'scale.y', [[0, 0], [0.62, 1.15], [1, 0.25]]),
      channel('spearTip', 'position.y', [[0, 0], [0.62, 0.72], [1, 0.18]])
    ], { events: [{ at: 0.64, type: 'impact' }] }),
    'skill:orum-memory-bloom': clip('orum.memory-bloom', 1.8, [
      channel('capRoot', 'scale.x', [[0, 0], [0.62, 0.3], [1, 0.12]]),
      channel('capRoot', 'scale.z', [[0, 0], [0.62, 0.3], [1, 0.12]]),
      channel('capRim', 'rotation.y', [[0, 0], [1, 2.8]], 'linear'),
      channel('sporeSacL', 'scale.x', [[0, 0], [0.58, 0.7], [1, 0.15]]),
      channel('sporeSacR', 'scale.x', [[0, 0], [0.58, 0.7], [1, 0.15]])
    ], { events: [{ at: 0.68, type: 'impact' }] }),
    'skill:orum-solitary-bloom': clip('orum.solitary-bloom', 2.2, [
      channel('motionRoot', 'position.y', [[0, 0], [0.55, -0.14], [0.76, 0.2], [1, 0.08]]),
      channel('capRoot', 'scale.x', [[0, 0], [0.7, 0.48], [1, 0.28]]),
      channel('capRoot', 'scale.z', [[0, 0], [0.7, 0.48], [1, 0.28]]),
      channel('spearShaft', 'scale.y', [[0, 0], [0.7, 0.8], [1, 0.42]]),
      channel('mantleRoot', 'scale.y', [[0, 0], [0.7, -0.35], [1, -0.2]])
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    death: clip('orum.death', 2.6, [
      channel('stemLower', 'rotation.z', [[0, 0], [0.65, 0.62], [1, 1.25]]),
      channel('capRoot', 'rotation.z', [[0, 0], [1, -0.8]]),
      channel('rootCore', 'scale.y', [[0, 0], [1, -0.45]])
    ])
  }),

  'glop-regal': Object.freeze({
    'idle-primary': clip('glop.idle-primary', 4.0, [
      channel('crown', 'position.y', [[0, 0.02], [0.5, 0.12], [1, 0.02]]),
      channel('blobRoot', 'scale.y', [[0, 0], [0.5, 0.055], [1, 0]]),
      channel('core', 'scale.x', [[0, 0.04], [0.5, -0.04], [1, 0.04]])
    ], { loop: true }),
    'idle-secondary': clip('glop.idle-secondary', 5.2, [
      channel('pseudoArmL', 'rotation.z', [[0, 0.06], [0.5, -0.1], [1, 0.06]]),
      channel('pseudoArmR', 'rotation.z', [[0, -0.06], [0.5, 0.1], [1, -0.06]]),
      channel('artifactOrbit', 'rotation.y', [[0, 0], [1, 1.1]], 'linear')
    ], { loop: true }),
    'skill:glop-royal-command': clip('glop.royal-command', 1.45, [
      channel('crown', 'position.y', [[0, 0], [0.56, 0.32], [1, 0.12]]),
      channel('pseudoArmL', 'rotation.z', [[0, 0], [0.55, -1.0], [1, -0.2]]),
      channel('pseudoArmR', 'rotation.z', [[0, 0], [0.55, 1.0], [1, 0.2]]),
      channel('blobRoot', 'scale.y', [[0, 0], [0.45, -0.12], [0.72, 0.18], [1, 0]])
    ], { events: [{ at: 0.66, type: 'impact' }] }),
    'skill:glop-digest-evidence': clip('glop.digest-evidence', 1.9, [
      channel('shell', 'scale.x', [[0, 0], [0.45, 0.25], [0.7, -0.12], [1, 0]]),
      channel('shell', 'scale.z', [[0, 0], [0.45, 0.25], [0.7, -0.12], [1, 0]]),
      channel('core', 'scale.x', [[0, 0], [0.65, 0.55], [1, 0.15]]),
      channel('artifactOrbit', 'rotation.y', [[0, 0], [1, 5.8]], 'linear')
    ], { events: [{ at: 0.7, type: 'impact' }] }),
    'skill:glop-one-court': clip('glop.one-court', 2.4, [
      channel('blobRoot', 'scale.x', [[0, 0], [0.58, 0.62], [0.82, -0.35], [1, -0.15]]),
      channel('blobRoot', 'scale.z', [[0, 0], [0.58, 0.62], [0.82, -0.35], [1, -0.15]]),
      channel('crown', 'position.y', [[0, 0], [0.62, 0.55], [1, 0.3]]),
      channel('artifactOrbit', 'rotation.y', [[0, 0], [1, 7.4]], 'linear'),
      channel('core', 'scale.y', [[0, 0], [0.72, 0.8], [1, -0.25]])
    ], { events: [{ at: 0.74, type: 'impact' }] }),
    death: clip('glop.death', 2.8, [
      channel('crown', 'position.y', [[0, 0], [0.35, -0.15], [1, -1.0]]),
      channel('crown', 'rotation.z', [[0, 0], [1, 1.7]]),
      channel('blobRoot', 'scale.y', [[0, 0], [1, -0.72]]),
      channel('blobRoot', 'scale.x', [[0, 0], [1, 0.55]]),
      channel('blobRoot', 'scale.z', [[0, 0], [1, 0.55]])
    ])
  }),

  'jijik-mechanical-arm': Object.freeze({
    'idle-primary': clip('jijik.idle-primary', 2.9, [
      channel('head', 'rotation.y', [[0, -0.12], [0.42, 0.16], [0.7, -0.04], [1, -0.12]]),
      channel('toolRotor', 'rotation.y', [[0, 0], [0.48, 0.35], [0.52, 0.35], [1, 0]]),
      channel('gauge', 'rotation.z', [[0, -0.12], [0.5, 0.18], [1, -0.12]])
    ], { loop: true }),
    'idle-secondary': clip('jijik.idle-secondary', 3.6, [
      channel('mechanicalShoulder', 'rotation.z', [[0, 0.04], [0.5, -0.05], [1, 0.04]]),
      channel('powderPack', 'rotation.z', [[0, -0.025], [0.5, 0.035], [1, -0.025]]),
      channel('fuseRoot', 'rotation.y', [[0, 0], [1, 0.4]], 'linear')
    ], { loop: true }),
    'skill:jijik-breach-charge': clip('jijik.breach-charge', 1.8, [
      channel('motionRoot', 'position.y', [[0, 0], [0.38, -0.12], [0.72, -0.16], [1, 0]]),
      channel('mechanicalShoulder', 'rotation.x', [[0, 0], [0.28, -1.0], [0.58, 0.5], [0.78, -0.72], [1, 0]]),
      channel('mechanicalElbow', 'rotation.x', [[0, 0], [0.32, -0.55], [0.58, 0.85], [0.78, -0.4], [1, 0]]),
      channel('toolRotor', 'rotation.y', [[0, 0], [0.25, 1.57], [1, 1.57]], 'linear'),
      channel('recoilBrace', 'position.z', [[0, 0], [0.62, -0.16], [1, 0]])
    ], { events: [{ at: 0.34, type: 'tool-hammer' }, { at: 0.58, type: 'tool-hammer' }, { at: 0.78, type: 'impact' }] }),
    'skill:jijik-air-cannon': clip('jijik.air-cannon', 1.05, [
      channel('toolRotor', 'rotation.y', [[0, 0], [0.32, 3.14], [1, 3.14]], 'linear'),
      channel('mechanicalShoulder', 'rotation.x', [[0, 0], [0.45, -0.55], [0.7, 0.28], [1, 0]]),
      channel('mechanicalElbow', 'rotation.x', [[0, 0], [0.45, -0.32], [0.7, 0.74], [1, 0]]),
      channel('chest', 'rotation.z', [[0, 0], [0.62, -0.18], [0.78, 0.22], [1, 0]]),
      channel('recoilBrace', 'position.z', [[0, 0], [0.7, -0.28], [1, 0]])
    ], { events: [{ at: 0.67, type: 'pressure-release' }, { at: 0.7, type: 'impact' }] }),
    'skill:jijik-three-point-barrage': clip('jijik.three-point-barrage', 2.25, [
      channel('motionRoot', 'position.y', [[0, 0], [0.28, -0.14], [1, -0.08]]),
      channel('toolRotor', 'rotation.y', [[0, 0], [0.28, 4.71], [1, 4.71]], 'linear'),
      channel('mechanicalShoulder', 'rotation.x', [[0, 0], [0.32, -1.2], [0.52, -0.5], [0.66, -1.05], [0.8, -0.45], [0.92, -0.9], [1, 0]]),
      channel('chest', 'rotation.x', [[0, 0], [0.32, 0.18], [0.52, -0.14], [0.66, 0.18], [0.8, -0.14], [0.92, 0.18], [1, 0]]),
      channel('powderPack', 'rotation.x', [[0, 0], [0.52, -0.12], [0.66, 0.12], [0.8, -0.12], [0.92, 0.12], [1, 0]])
    ], { events: [{ at: 0.5, type: 'mortar-one' }, { at: 0.68, type: 'mortar-two' }, { at: 0.86, type: 'mortar-three' }, { at: 0.88, type: 'impact' }] }),
    death: clip('jijik.death', 2.0, [
      channel('motionRoot', 'rotation.z', [[0, 0], [0.65, -0.9], [1, -1.38]]),
      channel('mechanicalShoulder', 'rotation.x', [[0, 0], [1, 1.2]]),
      channel('toolRotor', 'rotation.y', [[0, 0], [1, 8]], 'linear'),
      channel('powderPack', 'rotation.z', [[0, 0], [1, 0.55]])
    ])
  }),

  'tissa-diver': Object.freeze({
    'idle-primary': clip('tissa.idle-primary', 3.1, [
      channel('head', 'rotation.y', [[0, -0.08], [0.46, 0.13], [1, -0.08]]),
      channel('helmet', 'rotation.z', [[0, 0.015], [0.5, -0.02], [1, 0.015]]),
      channel('gauge', 'rotation.z', [[0, -0.15], [0.42, 0.08], [0.7, -0.03], [1, -0.15]])
    ], { loop: true }),
    'idle-secondary': clip('tissa.idle-secondary', 2.7, [
      channel('tailBase', 'rotation.y', [[0, -0.1], [0.5, 0.12], [1, -0.1]]),
      channel('tailMid', 'rotation.y', [[0, 0.12], [0.5, -0.16], [1, 0.12]]),
      channel('hoseL', 'rotation.z', [[0, 0.04], [0.5, -0.055], [1, 0.04]]),
      channel('hoseR', 'rotation.z', [[0, -0.04], [0.5, 0.055], [1, -0.04]])
    ], { loop: true }),
    'skill:tissa-pressure-jet': clip('tissa.pressure-jet', 1.1, [
      channel('tailBase', 'rotation.y', [[0, 0], [0.5, -0.7], [1, -0.3]]),
      channel('tailMid', 'rotation.y', [[0, 0], [0.5, 0.95], [1, 0.35]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.5, -1.05], [0.72, 0.4], [1, 0]]),
      channel('wrench', 'rotation.z', [[0, 0], [0.5, -0.75], [0.72, 0.45], [1, 0]]),
      channel('chest', 'rotation.z', [[0, 0], [0.7, -0.16], [0.82, 0.2], [1, 0]])
    ], { events: [{ at: 0.68, type: 'water-release' }, { at: 0.72, type: 'impact' }] }),
    'skill:tissa-pressure-seal': clip('tissa.pressure-seal', 1.65, [
      channel('motionRoot', 'position.y', [[0, 0], [0.42, -0.18], [0.78, -0.2], [1, 0]]),
      channel('shoulderL', 'rotation.x', [[0, 0], [0.42, -0.9], [0.76, 0.5], [1, 0]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.42, -0.9], [0.76, 0.5], [1, 0]]),
      channel('wrench', 'rotation.y', [[0, 0], [1, 5.6]], 'linear'),
      channel('tailBase', 'rotation.y', [[0, 0], [0.55, -0.42], [1, 0]])
    ], { events: [{ at: 0.76, type: 'seal-lock' }, { at: 0.78, type: 'impact' }] }),
    'skill:tissa-emergency-drain': clip('tissa.emergency-drain', 2.4, [
      channel('motionRoot', 'position.y', [[0, 0], [0.38, -0.2], [1, -0.1]]),
      channel('shoulderL', 'rotation.z', [[0, 0], [0.52, -0.86], [0.78, -1.0], [1, -0.2]]),
      channel('shoulderR', 'rotation.z', [[0, 0], [0.52, 0.86], [0.78, 1.0], [1, 0.2]]),
      channel('tailBase', 'rotation.y', [[0, 0], [0.55, -0.9], [1, -0.35]]),
      channel('tailMid', 'rotation.y', [[0, 0], [0.55, 1.15], [1, 0.4]]),
      channel('gauge', 'rotation.z', [[0, 0], [0.72, 2.5], [1, 3.2]], 'linear')
    ], { events: [{ at: 0.72, type: 'drain-open' }, { at: 0.78, type: 'impact' }] }),
    death: clip('tissa.death', 2.1, [
      channel('motionRoot', 'rotation.z', [[0, 0], [0.65, 0.9], [1, 1.36]]),
      channel('tailBase', 'rotation.y', [[0, 0], [1, -1.1]]),
      channel('helmet', 'rotation.z', [[0, 0], [1, 0.5]]),
      channel('tankRoot', 'rotation.x', [[0, 0], [1, -0.7]])
    ])
  }),

  'murga-cauldron': Object.freeze({
    'idle-primary': clip('murga.idle-primary', 3.5, [
      channel('chest', 'rotation.y', [[0, -0.035], [0.5, 0.045], [1, -0.035]]),
      channel('head', 'rotation.y', [[0, -0.08], [0.62, 0.11], [1, -0.08]]),
      channel('cauldronRoot', 'rotation.z', [[0, -0.02], [0.5, 0.025], [1, -0.02]])
    ], { loop: true }),
    'idle-secondary': clip('murga.idle-secondary', 3.0, [
      channel('necklace', 'rotation.z', [[0, 0.05], [0.5, -0.065], [1, 0.05]]),
      channel('hookRoot', 'rotation.z', [[0, -0.04], [0.5, 0.055], [1, -0.04]]),
      channel('lid', 'rotation.x', [[0, 0.02], [0.5, -0.03], [1, 0.02]])
    ], { loop: true }),
    'skill:murga-blood-root-broth': clip('murga.broth', 2.1, [
      channel('motionRoot', 'position.y', [[0, 0], [0.48, -0.12], [0.76, -0.16], [1, 0]]),
      channel('cauldronRoot', 'rotation.x', [[0, 0], [0.45, -0.48], [0.72, 0.22], [1, 0]]),
      channel('shoulderL', 'rotation.x', [[0, 0], [0.52, -1.0], [0.76, 0.38], [1, 0]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.52, -0.86], [0.76, 0.32], [1, 0]]),
      channel('lid', 'rotation.x', [[0, 0], [0.58, -1.1], [1, -0.25]])
    ], { events: [{ at: 0.72, type: 'cauldron-ground' }, { at: 0.76, type: 'impact' }] }),
    'skill:murga-butchers-hook': clip('murga.hook', 1.2, [
      channel('chest', 'rotation.y', [[0, 0], [0.38, -0.46], [0.68, 0.55], [1, 0]]),
      channel('shoulderL', 'rotation.x', [[0, 0], [0.38, -1.22], [0.68, 0.62], [1, 0]]),
      channel('hookRoot', 'rotation.z', [[0, 0], [0.38, -0.78], [0.68, 1.05], [1, 0]]),
      channel('chainRoot', 'scale.y', [[0, 0], [0.68, 1.4], [1, 0.2]])
    ], { events: [{ at: 0.66, type: 'hook-release' }, { at: 0.7, type: 'impact' }] }),
    'skill:murga-war-feast': clip('murga.war-feast', 2.5, [
      channel('motionRoot', 'position.y', [[0, 0], [0.42, -0.1], [0.68, 0.12], [1, 0]]),
      channel('shoulderR', 'rotation.x', [[0, 0], [0.42, -1.25], [0.68, 0.55], [1, 0]]),
      channel('cleaverRoot', 'rotation.z', [[0, 0], [0.42, -0.7], [0.68, 0.9], [1, 0]]),
      channel('lid', 'rotation.z', [[0, 0], [0.68, 1.15], [1, 0.3]]),
      channel('cauldronRoot', 'rotation.z', [[0, 0], [0.68, -0.18], [0.8, 0.22], [1, 0]])
    ], { events: [{ at: 0.64, type: 'lid-gong' }, { at: 0.72, type: 'impact' }] }),
    death: clip('murga.death', 2.5, [
      channel('motionRoot', 'rotation.z', [[0, 0], [0.7, -0.75], [1, -1.28]]),
      channel('cauldronRoot', 'rotation.x', [[0, 0], [1, -1.15]]),
      channel('hookRoot', 'rotation.z', [[0, 0], [1, 1.5]]),
      channel('lid', 'rotation.x', [[0, 0], [1, -1.6]])
    ])
  }),


  'aldren-royal-guard': Object.freeze({
    'idle-primary': clip('aldren.idle-primary', 4.0, [
      channel('soulCore','scale.y',[[0,0.02],[0.5,0.18],[1,0.02]]),
      channel('head','rotation.y',[[0,-0.03],[0.5,0.04],[1,-0.03]]),
      channel('shieldRoot','rotation.z',[[0,0.02],[0.5,-0.025],[1,0.02]])
    ], { loop: true }),
    'idle-secondary': clip('aldren.idle-secondary', 5.2, [
      channel('cloakL','rotation.z',[[0,0.04],[0.5,-0.06],[1,0.04]]),
      channel('cloakR','rotation.z',[[0,-0.03],[0.5,0.05],[1,-0.03]]),
      channel('commandChain','rotation.y',[[0,0],[1,0.45]],'linear')
    ], { loop: true }),
    'skill:aldren-royal-line': clip('aldren.royal-line', 1.65, [
      channel('motionRoot','position.y',[[0,0],[0.45,-0.08],[1,0]]),
      channel('swordRoot','rotation.x',[[0,0],[0.36,-1.1],[0.72,0.75],[1,0]]),
      channel('swordRoot','rotation.z',[[0,0],[0.72,-0.35],[1,0]]),
      channel('shieldRoot','rotation.y',[[0,0],[0.72,0.3],[1,0.1]])
    ], { events: [{ at: 0.7, type: 'line-inscribed' }, { at: 0.74, type: 'impact' }] }),
    'skill:aldren-shield-judgment': clip('aldren.shield-judgment', 0.95, [
      channel('chest','rotation.y',[[0,0],[0.35,-0.42],[0.68,0.36],[1,0]]),
      channel('shoulderL','rotation.x',[[0,0],[0.35,-0.8],[0.7,0.42],[1,0]]),
      channel('shieldRoot','position.z',[[0,0],[0.7,0.5],[1,0.08]]),
      channel('shieldRoot','rotation.x',[[0,0],[0.7,-0.18],[1,0]])
    ], { events: [{ at: 0.68, type: 'impact' }] }),
    'skill:aldren-unrevoked-order': clip('aldren.unrevoked-order', 2.35, [
      channel('swordRoot','rotation.x',[[0,0],[0.4,-1.25],[0.75,0.2],[1,0]]),
      channel('motionRoot','position.y',[[0,0],[0.75,-0.1],[1,0]]),
      channel('soulCore','scale.x',[[0,0],[0.75,0.85],[1,0.2]]),
      channel('soulCore','scale.y',[[0,0],[0.75,1.15],[1,0.3]]),
      channel('cloakRoot','scale.x',[[0,0],[0.75,0.3],[1,0.08]])
    ], { events: [{ at: 0.42, type: 'sword-knock' }, { at: 0.58, type: 'sword-knock' }, { at: 0.74, type: 'impact' }] }),
    death: clip('aldren.death', 2.7, [
      channel('motionRoot','position.y',[[0,0],[0.55,-0.2],[1,-0.55]]),
      channel('motionRoot','rotation.z',[[0,0],[1,-1.2]]),
      channel('swordRoot','rotation.z',[[0,0],[1,1.6]]),
      channel('soulCore','scale.y',[[0,0],[1,-0.85]])
    ])
  }),

  'malcor-ghast-lord': Object.freeze({
    'idle-primary': clip('malcor.idle-primary', 3.1, [
      channel('spineLower','rotation.x',[[0,0.2],[0.5,0.28],[1,0.2]]),
      channel('head','rotation.y',[[0,-0.15],[0.6,0.18],[1,-0.15]]),
      channel('jaw','rotation.x',[[0,0.04],[0.5,-0.12],[1,0.04]])
    ], { loop: true }),
    'idle-secondary': clip('malcor.idle-secondary', 4.0, [
      channel('coatTailL','rotation.z',[[0,0.06],[0.5,-0.09],[1,0.06]]),
      channel('coatTailR','rotation.z',[[0,-0.05],[0.5,0.08],[1,-0.05]]),
      channel('vaporRoot','rotation.y',[[0,0],[1,0.8]],'linear')
    ], { loop: true }),
    'skill:malcor-predators-cry': clip('malcor.predators-cry', 1.7, [
      channel('spineLower','rotation.x',[[0,0],[0.55,-0.48],[0.75,0.32],[1,0]]),
      channel('neck','rotation.x',[[0,0],[0.55,-0.65],[0.75,0.45],[1,0]]),
      channel('jaw','rotation.x',[[0,0],[0.62,-1.1],[1,-0.18]]),
      channel('coatRoot','scale.x',[[0,0],[0.68,0.25],[1,0.05]])
    ], { events: [{ at: 0.62, type: 'stitches-snap' }, { at: 0.7, type: 'impact' }] }),
    'skill:malcor-memory-flesh': clip('malcor.memory-flesh', 1.45, [
      channel('motionRoot','position.y',[[0,0],[0.5,-0.2],[1,0]]),
      channel('shoulderL','rotation.x',[[0,0],[0.55,-1.05],[1,-0.1]]),
      channel('shoulderR','rotation.x',[[0,0],[0.55,-1.05],[1,-0.1]]),
      channel('jaw','rotation.x',[[0,0],[0.7,-0.85],[1,-0.15]])
    ], { events: [{ at: 0.7, type: 'impact' }] }),
    'skill:malcor-hungry-feast': clip('malcor.hungry-feast', 2.5, [
      channel('motionRoot','position.y',[[0,0],[0.45,-0.12],[0.72,0.18],[1,0]]),
      channel('shoulderL','rotation.z',[[0,0],[0.7,-0.95],[1,-0.2]]),
      channel('shoulderR','rotation.z',[[0,0],[0.7,0.95],[1,0.2]]),
      channel('jaw','rotation.x',[[0,0],[0.72,-1.0],[1,-0.22]]),
      channel('vaporRoot','scale.x',[[0,0],[0.72,0.8],[1,0.2]])
    ], { events: [{ at: 0.72, type: 'impact' }] }),
    death: clip('malcor.death', 2.2, [
      channel('motionRoot','rotation.x',[[0,0],[0.7,0.85],[1,1.35]]),
      channel('coatTailL','rotation.z',[[0,0],[1,-0.9]]),
      channel('coatTailR','rotation.z',[[0,0],[1,0.9]]),
      channel('jaw','rotation.x',[[0,0],[1,-1.2]])
    ])
  }),

  'arvek-black-gate': Object.freeze({
    'idle-primary': clip('arvek.idle-primary', 4.2, [
      channel('chest','rotation.y',[[0,-0.015],[0.5,0.02],[1,-0.015]]),
      channel('head','rotation.y',[[0,-0.04],[0.5,0.05],[1,-0.04]]),
      channel('crossbar','position.z',[[0,0],[0.5,0.025],[1,0]])
    ], { loop: true }),
    'idle-secondary': clip('arvek.idle-secondary', 5.0, [
      channel('keyRing','rotation.y',[[0,0],[1,0.55]],'linear'),
      channel('chainCloak','rotation.z',[[0,0.03],[0.5,-0.04],[1,0.03]]),
      channel('towerL','rotation.z',[[0,0.01],[0.5,-0.015],[1,0.01]]),
      channel('towerR','rotation.z',[[0,-0.01],[0.5,0.015],[1,-0.01]])
    ], { loop: true }),
    'skill:arvek-black-gate': clip('arvek.black-gate', 2.05, [
      channel('motionRoot','position.y',[[0,0],[0.5,-0.1],[1,0]]),
      channel('shieldRoot','rotation.x',[[0,0],[0.65,-0.4],[1,-0.08]]),
      channel('shieldRoot','position.z',[[0,0],[0.7,0.5],[1,0.12]]),
      channel('crossbar','position.z',[[0,0],[0.72,-0.34],[1,-0.08]])
    ], { events: [{ at: 0.68, type: 'crossbar-lock' }, { at: 0.74, type: 'impact' }] }),
    'skill:arvek-banishment-sentence': clip('arvek.banishment', 1.15, [
      channel('motionRoot','position.z',[[0,0],[0.45,-0.18],[0.72,0.72],[1,0.12]]),
      channel('shieldRoot','rotation.x',[[0,0],[0.4,-0.55],[0.72,0.28],[1,0]]),
      channel('shoulderL','rotation.x',[[0,0],[0.72,-0.8],[1,-0.1]]),
      channel('swordRoot','rotation.z',[[0,0],[0.72,0.4],[1,0]])
    ], { events: [{ at: 0.7, type: 'impact' }] }),
    'skill:arvek-close-the-city': clip('arvek.close-city', 2.85, [
      channel('motionRoot','position.y',[[0,0],[0.5,-0.16],[0.76,0.12],[1,0]]),
      channel('keyRing','rotation.y',[[0,0],[1,6.8]],'linear'),
      channel('towerL','scale.y',[[0,0],[0.75,0.35],[1,0.12]]),
      channel('towerR','scale.y',[[0,0],[0.75,0.35],[1,0.12]]),
      channel('crossbar','position.z',[[0,0],[0.75,-0.5],[1,-0.18]]),
      channel('shieldRoot','position.y',[[0,0],[0.75,-0.25],[1,-0.08]])
    ], { events: [{ at: 0.75, type: 'impact' }] }),
    death: clip('arvek.death', 3.0, [
      channel('motionRoot','position.y',[[0,0],[0.6,-0.2],[1,-0.65]]),
      channel('motionRoot','rotation.z',[[0,0],[1,1.1]]),
      channel('shieldRoot','rotation.z',[[0,0],[1,-1.45]]),
      channel('keyRing','position.y',[[0,0],[1,-1.2]])
    ])
  }),

});

export function getHeroAnimationClip(profile, clipId) {
  return HERO_ANIMATION_CLIPS[profile]?.[clipId] ?? null;
}

export function getHeroAnimationProfile(profile) {
  return HERO_ANIMATION_CLIPS[profile] ?? null;
}

export function listHeroAnimationProfiles() {
  return Object.entries(HERO_ANIMATION_CLIPS).map(([id, clips]) => ({ id, ...clips }));
}
