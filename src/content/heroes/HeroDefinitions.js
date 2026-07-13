const skill = (id, name, options = {}) => Object.freeze({
  id,
  name,
  cooldown: options.cooldown ?? 10,
  windup: options.windup ?? 1,
  impactDuration: options.impactDuration ?? 0.08,
  recovery: options.recovery ?? 0.7,
  interruptDamageRatio: options.interruptDamageRatio ?? 0.18,
  targetPolicy: options.targetPolicy ?? 'self',
  telegraph: Object.freeze({
    shape: options.telegraph?.shape ?? 'circle',
    radius: options.telegraph?.radius ?? 2,
    length: options.telegraph?.length ?? 0,
    width: options.telegraph?.width ?? 0,
    colorRole: options.telegraph?.colorRole ?? 'hero',
    cue: options.telegraph?.cue ?? id
  }),
  effects: Object.freeze((options.effects ?? []).map(effect => Object.freeze({ ...effect }))),
  ai: Object.freeze({ priority: options.ai?.priority ?? 1, ...options.ai })
});

const hero = source => Object.freeze({
  ...source,
  unique: true,
  rank: 'faction-hero',
  relationship: Object.freeze({ initial: 0, minimum: -100, maximum: 100, ...source.relationship }),
  baseStats: Object.freeze({ hp: 60, attack: 8, courage: 14, armor: 1, speed: 1, ...source.baseStats }),
  visual: Object.freeze({
    articulated: true,
    lodDistance: 32,
    ...source.visual,
    damageThresholds: Object.freeze([...(source.visual.damageThresholds ?? [0.65, 0.3])]),
    palette: Object.freeze({ ...source.visual.palette }),
    silhouette: Object.freeze([...(source.visual.silhouette ?? [])]),
    dedicatedParts: Object.freeze([...(source.visual.dedicatedParts ?? [])])
  }),
  passive: Object.freeze({ ...source.passive }),
  leadership: Object.freeze({ ...source.leadership }),
  runtimeDefaults: Object.freeze({ ...(source.runtimeDefaults ?? {}) }),
  skills: Object.freeze(source.skills)
});

export const HERO_DEFINITIONS = Object.freeze({
  'hero.nibble': hero({
    id: 'hero.nibble',
    role: 'hero-nibble',
    displayName: 'Nibble Hundred-Button',
    localizedName: '니블 백단추',
    factionId: 'goblin-clan',
    species: 'goblin',
    size: 'small',
    initialRoomId: 'D19',
    encounterRoomId: 'D19',
    baseStats: { hp: 68, attack: 7, courage: 16, armor: 2, speed: 1.12 },
    relationship: { initial: -5 },
    visual: {
      bodyPlan: 'hero-goblin-coat',
      animationProfile: 'nibble',
      scale: 0.82,
      palette: {
        skin: 0x78974a,
        cloth: 0x3f2d26,
        clothInner: 0x2f6a66,
        leather: 0x4b3428,
        metal: 0x8d8172,
        brass: 0xd3a64f,
        accent: 0x8bd2c9,
        dark: 0x1d1b1b
      },
      silhouette: ['oversized-triangular-coat', 'key-staff', 'short-legs'],
      dedicatedParts: ['layered-command-coat', 'hundred-button-front', 'master-key-staff', 'key-ring-secondary-rig', 'hidden-pocket-array', 'torn-ear']
    },
    passive: {
      id: 'nibble-market-network',
      name: 'Market Network',
      description: 'Retreating goblins move faster and active goblin logistics preserve more cargo while Nibble remains active.'
    },
    leadership: {
      radius: 'same-room-and-adjacent',
      attackBonus: 0,
      courageBonus: 1,
      retreatSpeedMultiplier: 1.22,
      cargoRecoveryBonus: 0.3
    },
    skills: [
      skill('nibble-lock-the-ways', 'Lock the Ways', {
        cooldown: 14,
        windup: 1.55,
        recovery: 0.8,
        targetPolicy: 'room-routes',
        telegraph: { shape: 'route-wall', radius: 4.5, colorRole: 'goblin-brass', cue: 'keys-strike-stone' },
        effects: [
          { type: 'temporary-route-lock', maximum: 2, duration: 8, allowFaction: 'goblin-clan' },
          { type: 'emit-command', command: 'hold-the-exits' }
        ],
        ai: { priority: 5, minimumHostiles: 2 }
      }),
      skill('nibble-master-key', 'Master Key', {
        cooldown: 11,
        windup: 1.25,
        recovery: 0.65,
        targetPolicy: 'locked-route-or-trap',
        telegraph: { shape: 'key-sigil', radius: 1.6, colorRole: 'goblin-brass', cue: 'key-chatter' },
        effects: [
          { type: 'unlock-nearest-route' },
          { type: 'hijack-nearest-trap', charges: 1 }
        ],
        ai: { priority: 4 }
      }),
      skill('nibble-everyone-out', 'Everyone Out First', {
        cooldown: 28,
        windup: 1.9,
        recovery: 1,
        interruptDamageRatio: 0.24,
        targetPolicy: 'allied-room',
        telegraph: { shape: 'outward-arrows', radius: 6, colorRole: 'goblin-teal', cue: 'coat-flare' },
        effects: [
          { type: 'order-faction-retreat', factionId: 'goblin-clan', preserveCargo: true },
          { type: 'self-retreat-last' }
        ],
        ai: { priority: 10, healthBelow: 0.38, losingStrengthRatio: 0.62 }
      })
    ]
  }),

  'hero.kirik': hero({
    id: 'hero.kirik',
    role: 'hero-kirik',
    displayName: 'Kirik, Third Gear',
    localizedName: '세 번째 톱니 키릭',
    factionId: 'copper-tail-clutch',
    species: 'kobold',
    size: 'medium',
    initialRoomId: 'D18',
    encounterRoomId: 'D18',
    baseStats: { hp: 82, attack: 8, courage: 17, armor: 4, speed: 0.9 },
    relationship: { initial: 0 },
    visual: {
      bodyPlan: 'hero-kobold-tripod',
      animationProfile: 'kirik-tripod',
      scale: 0.98,
      palette: {
        skin: 0xb57948,
        cloth: 0x66503a,
        clothInner: 0x355c69,
        leather: 0x493326,
        metal: 0x736a5d,
        brass: 0xba7f35,
        accent: 0x7ac7d1,
        dark: 0x24211e
      },
      silhouette: ['three-long-mechanical-legs', 'small-suspended-pilot', 'large-wind-key'],
      dedicatedParts: ['tripod-leg-set', 'suspended-pilot-harness', 'dual-work-arms', 'third-gear-back-wheel', 'multi-lens-eye', 'ceramic-insulators']
    },
    passive: {
      id: 'kirik-field-maintenance',
      name: 'Field Maintenance',
      description: 'Kirik repairs friendly structures and refreshes Copper-Tail traps in his room.'
    },
    leadership: {
      radius: 'same-room',
      constructArmorBonus: 1,
      repairPerSecond: 0.7,
      trapRefreshSeconds: 8
    },
    skills: [
      skill('kirik-gear-lockfield', 'Gear Lockfield', {
        cooldown: 13,
        windup: 1.8,
        recovery: 0.8,
        targetPolicy: 'room-center',
        telegraph: { shape: 'three-gear-circle', radius: 3.4, colorRole: 'kobold-copper', cue: 'gear-teeth-ratchet' },
        effects: [
          { type: 'deploy-slow-zone', duration: 8, radius: 3.4, multiplier: 0.62 },
          { type: 'stagger-large-on-entry', duration: 1.2 }
        ],
        ai: { priority: 5, minimumHostiles: 2 }
      }),
      skill('kirik-reconfigure-trap', 'Reconfigure Trap', {
        cooldown: 9,
        windup: 1.45,
        recovery: 0.6,
        targetPolicy: 'friendly-trap-or-structure',
        telegraph: { shape: 'wrench-arc', radius: 2.2, colorRole: 'kobold-copper', cue: 'rapid-tool-clicks' },
        effects: [
          { type: 'cycle-trap-mode', modes: ['damage', 'slow', 'alarm', 'capture'], addCharges: 1 },
          { type: 'repair-nearest-structure', amount: 12 }
        ],
        ai: { priority: 4 }
      }),
      skill('kirik-triangle-bastion', 'Triangle Bastion', {
        cooldown: 30,
        windup: 2.3,
        recovery: 0.9,
        targetPolicy: 'self',
        telegraph: { shape: 'triangle', radius: 4.5, colorRole: 'kobold-blue', cue: 'stabilizers-hammer-down' },
        effects: [
          { type: 'enter-bastion', duration: 12, armorBonus: 5, rooted: true },
          { type: 'repair-aura', duration: 12, radius: 5, amountPerSecond: 1.2 },
          { type: 'trap-overclock-aura', duration: 12, radius: 5 }
        ],
        ai: { priority: 9, minimumHostiles: 3, healthBelow: 0.58 }
      })
    ]
  }),

  'hero.karg': hero({
    id: 'hero.karg',
    role: 'hero-karg',
    displayName: 'Karg Twice-Defeated',
    localizedName: '카르그 두 번 패한 자',
    factionId: 'red-tusk-tribe',
    species: 'orc',
    size: 'medium',
    initialRoomId: 'J49',
    encounterRoomId: 'J49',
    baseStats: { hp: 118, attack: 13, courage: 22, armor: 5, speed: 0.94 },
    relationship: { initial: -25 },
    visual: {
      bodyPlan: 'hero-orc-heavy',
      animationProfile: 'karg-heavy',
      scale: 1.08,
      palette: {
        skin: 0x68774b,
        cloth: 0x5a2926,
        clothInner: 0x8e3b32,
        leather: 0x3f2d24,
        metal: 0x666b69,
        brass: 0xa9814c,
        accent: 0xc44c43,
        dark: 0x20211e
      },
      silhouette: ['low-wide-shoulders', 'joined-broken-double-blade', 'asymmetric-armor'],
      dedicatedParts: ['joined-broken-blade', 'cut-tusk-head', 'partial-black-cuirass', 'single-heavy-knee', 'defeated-banner-strips', 'removable-armor-shell']
    },
    passive: {
      id: 'karg-lessons-of-defeat',
      name: 'Lessons of Defeat',
      description: 'Large hits teach Karg; he gains stagger resistance and prepares a stronger counterattack.'
    },
    leadership: {
      radius: 'same-room',
      orcAttackBonus: 1,
      orcCourageBonus: 2,
      duelMoraleBonus: 2
    },
    skills: [
      skill('karg-declare-duel', 'Declare Duel', {
        cooldown: 16,
        windup: 1.35,
        recovery: 0.65,
        targetPolicy: 'strongest-hostile',
        telegraph: { shape: 'duel-ring', radius: 2.8, colorRole: 'orc-red', cue: 'blade-planted' },
        effects: [
          { type: 'declare-duel', duration: 11, damageBonus: 0.25, offTargetPenalty: 0.35 },
          { type: 'morale-on-flee', factionId: 'red-tusk-tribe', amount: 2 }
        ],
        ai: { priority: 5 }
      }),
      skill('karg-broken-blade-circle', 'Broken Blade Circle', {
        cooldown: 10,
        windup: 1.15,
        recovery: 0.95,
        targetPolicy: 'hostiles-in-room',
        telegraph: { shape: 'ring', radius: 3.2, colorRole: 'orc-red', cue: 'blade-scrape-circle' },
        effects: [
          { type: 'room-area-damage', amount: 12, radius: 3.2 },
          { type: 'room-stagger', duration: 1.1 },
          { type: 'armor-break', amount: 1 }
        ],
        ai: { priority: 6, minimumHostiles: 2 }
      }),
      skill('karg-remember-second-defeat', 'Remember the Second Defeat', {
        cooldown: 45,
        windup: 2.05,
        recovery: 0.75,
        interruptDamageRatio: 0.28,
        targetPolicy: 'self',
        telegraph: { shape: 'shattering-armor', radius: 2.5, colorRole: 'orc-bright-red', cue: 'cuirass-unbuckled' },
        effects: [
          { type: 'second-defeat-stance', duration: 16, attackBonus: 4, speedMultiplier: 1.24, armorPenalty: 4, staggerImmune: true, noRetreat: true },
          { type: 'drop-armor-prop' }
        ],
        ai: { priority: 10, healthBelow: 0.36 }
      })
    ]
  }),

  'hero.isara': hero({
    id: 'hero.isara',
    role: 'hero-isara',
    displayName: 'Isara of the Black Veil',
    localizedName: '검은 베일의 이사라',
    factionId: 'undead-host',
    species: 'wraith',
    size: 'medium',
    initialRoomId: 'E25',
    encounterRoomId: 'E25',
    baseStats: { hp: 96, attack: 11, courage: 25, armor: 1, speed: 1.08 },
    relationship: { initial: -35 },
    runtimeDefaults: { heroStance: 'veiled', spectral: true },
    visual: {
      bodyPlan: 'hero-spectral-veil',
      animationProfile: 'isara-spectral',
      scale: 1.08,
      indicatorRadius: 0.67,
      markerHeight: 2.75,
      palette: {
        skin: 0xa9dbea,
        cloth: 0x131827,
        clothInner: 0x243a57,
        leather: 0x26303c,
        metal: 0x647b86,
        brass: 0x8ca5aa,
        accent: 0xc8f3ff,
        dark: 0x080c14
      },
      silhouette: ['floating-crown', 'empty-inverted-veil', 'detached-hands'],
      dedicatedParts: ['six-segment-funeral-veil', 'verdigris-crown', 'detached-spectral-hands', 'vertical-face-void', 'shadow-tail-chain', 'inner-memory-faces', 'torn-veil-stage', 'crown-fracture-stage']
    },
    passive: {
      id: 'isara-incorporeal',
      name: 'Incorporeal Sovereign',
      description: 'Isara ignores traps and temporary barricades, resists ordinary physical attacks, and is vulnerable to holy damage.'
    },
    leadership: {
      radius: 'same-room-and-adjacent',
      wraithSpeedMultiplier: 1.16,
      wraithCourageBonus: 3,
      veilDamageMultiplier: 0.82
    },
    skills: [
      skill('isara-mourning-veil', 'Mourning Veil', {
        cooldown: 14,
        windup: 1.75,
        recovery: 0.8,
        targetPolicy: 'room-center',
        telegraph: { shape: 'mourning-veil', radius: 4.6, colorRole: 'undead-veil', cue: 'veil-unfurls' },
        effects: [
          { type: 'deploy-mourning-veil', duration: 10, radius: 4.6, slowMultiplier: 0.78, attackPenalty: 2 },
          { type: 'grant-veil-concealment', duration: 10 }
        ],
        ai: { priority: 6, minimumHostiles: 2 }
      }),
      skill('isara-soul-procession', 'Procession of Souls', {
        cooldown: 18,
        windup: 2.0,
        recovery: 1.0,
        targetPolicy: 'adjacent-wraiths',
        telegraph: { shape: 'soul-procession', radius: 4.2, colorRole: 'undead-crown', cue: 'distant-funeral-steps' },
        effects: [
          { type: 'call-adjacent-wraiths', maximum: 3 },
          { type: 'raise-temporary-shades', maximum: 2, duration: 9 }
        ],
        ai: { priority: 7, minimumHostiles: 1 }
      }),
      skill('isara-unburied-queen', 'Queen of the Unburied', {
        cooldown: 34,
        windup: 2.35,
        recovery: 1.1,
        interruptDamageRatio: 0.26,
        targetPolicy: 'room-center',
        telegraph: { shape: 'ethereal-domain', radius: 6, colorRole: 'undead-crown', cue: 'crown-rises' },
        effects: [
          { type: 'deploy-ethereal-domain', duration: 12, radius: 6, projectileSlow: 0.62 },
          { type: 'raise-temporary-shades', maximum: 3, duration: 12 }
        ],
        ai: { priority: 10, healthBelow: 0.55, minimumHostiles: 3 }
      })
    ]
  }),

  'hero.orum-bell': hero({
    id: 'hero.orum-bell',
    role: 'hero-orum-bell',
    displayName: 'Orum-Bell, Bluecap Knight',
    localizedName: '푸른갓 기사 오룸-벨',
    factionId: 'bluecap-colony',
    species: 'myconid',
    size: 'medium',
    initialRoomId: 'F28',
    encounterRoomId: 'F28',
    baseStats: { hp: 94, attack: 10, courage: 20, armor: 3, speed: 0.96 },
    relationship: { initial: 5 },
    runtimeDefaults: { heroStance: 'communion', communionEnabled: true },
    visual: {
      bodyPlan: 'hero-fungal-knight',
      animationProfile: 'orum-fungal',
      scale: 1.06,
      indicatorRadius: 0.66,
      markerHeight: 2.8,
      palette: {
        skin: 0x9c8d6c,
        cloth: 0x263f52,
        clothInner: 0xc79f63,
        leather: 0x5c4832,
        metal: 0x6e817b,
        brass: 0xc7a35d,
        accent: 0xe5c884,
        dark: 0x24302d
      },
      silhouette: ['wide-blue-bell-cap', 'long-root-legs', 'living-mycelial-lance'],
      dedicatedParts: ['gilled-bell-cap', 'three-root-feet', 'growing-lance-arm', 'branch-hand', 'four-strand-mycelial-mantle', 'spore-sac-collar', 'under-cap-memory-lights', 'cap-crack-stage']
    },
    passive: {
      id: 'orum-spore-communion',
      name: 'Spore Communion',
      description: 'Nearby myconids share courage, minor regeneration, and shortened fear effects while Orum-Bell remains linked to the colony.'
    },
    leadership: {
      radius: 'same-room',
      myconidCourageBonus: 2,
      regenerationPerSecond: 0.22,
      statusDurationMultiplier: 0.68
    },
    skills: [
      skill('orum-mycelial-lance', 'Mycelial Lance', {
        cooldown: 9,
        windup: 1.25,
        recovery: 0.72,
        targetPolicy: 'strongest-hostile',
        telegraph: { shape: 'fungal-lance', radius: 1.2, length: 5.2, width: 0.8, colorRole: 'fungal-gold', cue: 'lance-grows' },
        effects: [
          { type: 'line-damage-root', amount: 14, maximum: 3, rootDuration: 3.2 },
          { type: 'grow-lance-variant', duration: 1.6 }
        ],
        ai: { priority: 6 }
      }),
      skill('orum-memory-bloom', 'Memory Bloom', {
        cooldown: 15,
        windup: 1.8,
        recovery: 0.9,
        targetPolicy: 'room-center',
        telegraph: { shape: 'memory-flower', radius: 4.4, colorRole: 'fungal-blue', cue: 'spore-chime' },
        effects: [
          { type: 'deploy-memory-bloom', duration: 9, radius: 4.4, attackPenalty: 2 },
          { type: 'cleanse-fungal-allies' }
        ],
        ai: { priority: 7, minimumHostiles: 2 }
      }),
      skill('orum-solitary-bloom', 'Solitary Bloom', {
        cooldown: 36,
        windup: 2.2,
        recovery: 0.9,
        interruptDamageRatio: 0.27,
        targetPolicy: 'self',
        telegraph: { shape: 'solitary-bloom', radius: 3.2, colorRole: 'fungal-gold', cue: 'mycelium-snaps' },
        effects: [
          { type: 'enter-solitary-bloom', duration: 14, attackBonus: 4, speedMultiplier: 1.22, interruptResistance: 0.35, endingHealthCostRatio: 0.12 }
        ],
        ai: { priority: 10, healthBelow: 0.46 }
      })
    ]
  }),

  'hero.glop': hero({
    id: 'hero.glop',
    role: 'hero-glop',
    displayName: 'Glop XVII, the Crown-Swallowed',
    localizedName: '왕관을 삼킨 글롭 17세',
    factionId: 'slime-bloom',
    species: 'slime',
    size: 'large',
    initialRoomId: 'L57',
    encounterRoomId: 'L57',
    baseStats: { hp: 146, attack: 11, courage: 22, armor: 3, speed: 0.84 },
    relationship: { initial: -10 },
    runtimeDefaults: { heroStance: 'crown', regaliaStances: ['crown', 'key', 'chalice', 'throne'] },
    visual: {
      bodyPlan: 'hero-regal-slime',
      animationProfile: 'glop-regal',
      scale: 1.12,
      indicatorRadius: 0.82,
      markerHeight: 2.55,
      damageThresholds: [0.7, 0.32],
      palette: {
        skin: 0x4f9f99,
        cloth: 0x6ab9ad,
        clothInner: 0xd4c36e,
        leather: 0x655037,
        metal: 0xa6a9a0,
        brass: 0xe0bd55,
        accent: 0xffe59a,
        dark: 0x183c3b
      },
      silhouette: ['large-transparent-regal-blob', 'level-floating-crown', 'internal-artifact-court'],
      dedicatedParts: ['volume-preserving-slime-shell', 'floating-crown', 'royal-seal', 'key-ring-artifact', 'golden-chalice', 'throne-fragment', 'bone-hand-scepter', 'scribe-pen', 'inner-gold-core', 'damage-clouding-stage']
    },
    passive: {
      id: 'glop-royal-regalia',
      name: 'Royal Regalia',
      description: 'The foremost artifact inside Glop determines his stance and the bonuses granted to nearby slimes.'
    },
    leadership: {
      radius: 'same-room',
      crownAttackBonus: 2,
      keySpeedMultiplier: 1.16,
      chaliceRegenerationPerSecond: 0.28,
      throneArmorBonus: 2
    },
    skills: [
      skill('glop-royal-command', 'Royal Command', {
        cooldown: 11,
        windup: 1.45,
        recovery: 0.75,
        targetPolicy: 'hostiles-in-room',
        telegraph: { shape: 'royal-sigil', radius: 4.2, colorRole: 'slime-gold', cue: 'many-voices-command' },
        effects: [
          { type: 'royal-command', modes: ['kneel', 'approach'], slowDuration: 3.5, staggerDuration: 0.8 }
        ],
        ai: { priority: 6, minimumHostiles: 1 }
      }),
      skill('glop-digest-evidence', 'Digest the Evidence', {
        cooldown: 13,
        windup: 1.9,
        recovery: 0.8,
        targetPolicy: 'digestible-object',
        telegraph: { shape: 'digest-spiral', radius: 2.6, colorRole: 'slime-teal', cue: 'artifacts-churn' },
        effects: [
          { type: 'digest-evidence', heal: 24, stanceByType: { corpse: 'crown', cargo: 'key', potion: 'chalice', structure: 'throne', prop: 'crown' } }
        ],
        ai: { priority: 7, healthBelow: 0.78 }
      }),
      skill('glop-one-court', 'The One and Only Court', {
        cooldown: 40,
        windup: 2.4,
        recovery: 1.1,
        interruptDamageRatio: 0.3,
        targetPolicy: 'self',
        telegraph: { shape: 'triune-court', radius: 5, colorRole: 'slime-gold', cue: 'court-divides' },
        effects: [
          { type: 'split-hero-court', duration: 11, aspects: ['king', 'guard', 'scribe'] }
        ],
        ai: { priority: 10, healthBelow: 0.48, minimumHostiles: 2 }
      })
    ]
  })

});

export const HERO_BY_ROLE = Object.freeze(Object.fromEntries(Object.values(HERO_DEFINITIONS).map(definition => [definition.role, definition])));

export function getHeroDefinition(idOrRole) {
  return HERO_DEFINITIONS[idOrRole] ?? HERO_BY_ROLE[idOrRole] ?? null;
}

export function listHeroDefinitions() {
  return Object.values(HERO_DEFINITIONS);
}

export function isHeroRole(role) {
  return Boolean(HERO_BY_ROLE[role]);
}

export function validateHeroDefinitions() {
  const errors = [];
  const heroIds = new Set();
  const roles = new Set();
  const skillIds = new Set();
  for (const definition of listHeroDefinitions()) {
    if (heroIds.has(definition.id)) errors.push(`duplicate hero id ${definition.id}`);
    if (roles.has(definition.role)) errors.push(`duplicate hero role ${definition.role}`);
    heroIds.add(definition.id);
    roles.add(definition.role);
    if (!definition.initialRoomId) errors.push(`${definition.id} missing initialRoomId`);
    if (definition.visual.dedicatedParts.length < 6) errors.push(`${definition.id} needs at least six dedicated visual parts`);
    if (definition.visual.silhouette.length < 3) errors.push(`${definition.id} needs three silhouette anchors`);
    if (definition.skills.length !== 3) errors.push(`${definition.id} must have exactly three active skills`);
    for (const action of definition.skills) {
      if (skillIds.has(action.id)) errors.push(`duplicate skill id ${action.id}`);
      skillIds.add(action.id);
      if (!(action.windup > 0) || !(action.recovery >= 0) || !(action.cooldown > 0)) errors.push(`${action.id} invalid timing`);
      if (!action.telegraph?.shape || !action.effects?.length) errors.push(`${action.id} missing telegraph or effects`);
    }
  }
  return errors;
}
