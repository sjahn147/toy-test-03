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
  costs: Object.freeze({ ...(options.costs ?? {}) }),
  interruptRefund: options.interruptRefund ?? 0.5,
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
  }),

  'hero.jijik': hero({
    id: 'hero.jijik',
    role: 'hero-jijik',
    displayName: 'Jijik Soot-Hand',
    localizedName: '찌직 검댕손',
    factionId: 'goblin-clan',
    species: 'goblin',
    size: 'small',
    initialRoomId: 'D20',
    encounterRoomId: 'D20',
    baseStats: { hp: 76, attack: 8, courage: 15, armor: 2, speed: 1.02 },
    relationship: { initial: -10 },
    visual: {
      bodyPlan: 'hero-goblin-bombardier',
      animationProfile: 'jijik-mechanical-arm',
      scale: 0.88,
      palette: {
        skin: 0x718f47,
        cloth: 0x5f2f2a,
        clothInner: 0x322927,
        leather: 0x453127,
        metal: 0x6f7470,
        brass: 0xc48635,
        accent: 0xff8c3e,
        dark: 0x211c1a
      },
      silhouette: ['oversized-transforming-right-arm', 'asymmetric-powder-pack', 'fuse-crown-helmet'],
      dedicatedParts: ['tool-rotor-arm', 'hammer-tool', 'air-cannon-nozzle', 'mortar-cup', 'powder-backpack', 'fuse-crown', 'pressure-gauge', 'recoil-brace']
    },
    passive: {
      id: 'jijik-calculated-blast',
      name: 'Calculated Blast',
      description: 'Jijik prevents friendly blast damage while preserving the physical impulse that throws goblins clear.'
    },
    leadership: {
      radius: 'same-room',
      demolitionSpeedMultiplier: 1.25,
      structureDamageBonus: 0.2,
      friendlyBlastDamageMultiplier: 0,
      friendlyBlastImpulseMultiplier: 0.72
    },
    skills: [
      skill('jijik-breach-charge', 'Breach Charge', {
        cooldown: 12,
        windup: 1.8,
        recovery: 0.7,
        targetPolicy: 'structure-or-ground',
        costs: { powder: 2, scrap: 1 },
        telegraph: { shape: 'charge-cross', radius: 3.4, colorRole: 'goblin-orange', cue: 'arm-hammer-three-count' },
        effects: [
          { type: 'deploy-breach-charge', arming: 1.2, fuse: 2.2, damage: 9, structureDamage: 36, radius: 3.4, impulse: 4.8, friendlyDamage: false },
          { type: 'emit-command', command: 'clear-the-charge' }
        ],
        ai: { priority: 6, preferStructure: true, minimumHostiles: 2 }
      }),
      skill('jijik-air-cannon', 'Compressed-Air Cannon', {
        cooldown: 9,
        windup: 1.05,
        recovery: 0.9,
        targetPolicy: 'hostile-direction',
        telegraph: { shape: 'pressure-cone', radius: 5.2, length: 5.2, width: 2.8, colorRole: 'goblin-air', cue: 'pressure-gauge-whine' },
        effects: [
          { type: 'directional-blast', damage: 4, impulse: 6, length: 5.2, width: 2.8 },
          { type: 'clear-environment', kinds: ['fire', 'spore', 'smoke'], radius: 5.2 },
          { type: 'dilute-slime', duration: 5, attackMultiplier: 0.72 }
        ],
        ai: { priority: 7, minimumHostiles: 1 }
      }),
      skill('jijik-three-point-barrage', 'Three-Point Barrage', {
        cooldown: 30,
        windup: 2.25,
        recovery: 1.15,
        interruptDamageRatio: 0.22,
        targetPolicy: 'three-room-points',
        costs: { powder: 5 },
        telegraph: { shape: 'three-impact-rings', radius: 5.8, colorRole: 'goblin-orange', cue: 'mortar-ratchet-three' },
        effects: [
          { type: 'launch-barrage', count: 3, interval: 0.55, flightDuration: 1.15, arcHeight: 3.6, damage: [8, 12, 16], structureDamage: [8, 14, 24], impulse: [3, 4.5, 6], radius: [2.6, 2.2, 1.8] }
        ],
        ai: { priority: 10, minimumHostiles: 3 }
      })
    ]
  }),

  'hero.tissa': hero({
    id: 'hero.tissa',
    role: 'hero-tissa',
    displayName: 'Tissa Water-Scale',
    localizedName: '물비늘 티사',
    factionId: 'copper-tail-clutch',
    species: 'kobold',
    size: 'small',
    initialRoomId: 'C14',
    encounterRoomId: 'C14',
    baseStats: { hp: 74, attack: 7, courage: 16, armor: 2, speed: 0.96 },
    relationship: { initial: 5 },
    visual: {
      bodyPlan: 'hero-kobold-diver',
      animationProfile: 'tissa-diver',
      scale: 0.9,
      palette: {
        skin: 0x6c8e79,
        cloth: 0x3e5961,
        clothInner: 0x2b454b,
        leather: 0x48382d,
        metal: 0x6d7777,
        brass: 0xa9783d,
        accent: 0x7fd7e6,
        dark: 0x1d282d
      },
      silhouette: ['large-bell-diving-helmet', 'twin-air-tanks', 'long-fin-tail'],
      dedicatedParts: ['glass-dive-helmet', 'twin-air-tanks', 'pressure-hose-set', 'valve-wrench', 'short-harpoon', 'broad-tail-fin', 'webbed-feet', 'pressure-gauge']
    },
    passive: {
      id: 'tissa-flood-adaptation',
      name: 'Flood Adaptation',
      description: 'Tissa ignores flooded movement penalties, reveals submerged access points and resists fire.'
    },
    leadership: {
      radius: 'same-room-and-routes',
      floodedMoveMultiplier: 1.25,
      routeInspectionMultiplier: 1.8,
      fireDamageMultiplier: 0.7,
      waterHazardSuppression: 0.35
    },
    skills: [
      skill('tissa-pressure-jet', 'Pressure Jet', {
        cooldown: 8,
        windup: 1.1,
        recovery: 0.75,
        targetPolicy: 'hostile-direction',
        telegraph: { shape: 'water-cone', radius: 5, length: 5, width: 3.2, colorRole: 'kobold-water', cue: 'tank-valve-open' },
        effects: [
          { type: 'directional-water-jet', damage: 3, impulse: 5.6, length: 5, width: 3.2 },
          { type: 'clear-environment', kinds: ['fire', 'smoke'], radius: 5 },
          { type: 'dilute-slime', duration: 6, attackMultiplier: 0.66, splitChance: 0.25 }
        ],
        ai: { priority: 7, minimumHostiles: 1 }
      }),
      skill('tissa-pressure-seal', 'Pressure Seal', {
        cooldown: 14,
        windup: 1.65,
        recovery: 0.65,
        targetPolicy: 'water-route',
        costs: { scrap: 1 },
        telegraph: { shape: 'route-seal', radius: 3, colorRole: 'kobold-water', cue: 'seal-clamp-turn' },
        effects: [
          { type: 'deploy-pressure-seal', duration: 12, hp: 24, suppressWater: true, suppressAquaticSpawns: true },
          { type: 'reveal-submerged-socket' }
        ],
        ai: { priority: 5, preferHazardRoute: true }
      }),
      skill('tissa-emergency-drain', 'Emergency Drain', {
        cooldown: 32,
        windup: 2.4,
        recovery: 1,
        interruptDamageRatio: 0.24,
        targetPolicy: 'current-room',
        telegraph: { shape: 'drain-spiral', radius: 6, colorRole: 'kobold-water', cue: 'cistern-roar' },
        effects: [
          { type: 'emergency-drain-field', duration: 16, waterLevelDelta: -1, alliedSpeedMultiplier: 1.12, aquaticEnemyMultiplier: 0.72 },
          { type: 'reveal-submerged-socket' }
        ],
        ai: { priority: 10, floodedRoom: true, minimumAllies: 1 }
      })
    ]
  }),

  'hero.murga': hero({
    id: 'hero.murga',
    role: 'hero-murga',
    displayName: 'Murga Blood-Pot',
    localizedName: '무르가 피솥',
    factionId: 'red-tusk-tribe',
    species: 'orc',
    size: 'medium',
    initialRoomId: 'J48',
    encounterRoomId: 'J48',
    baseStats: { hp: 104, attack: 10, courage: 20, armor: 3, speed: 0.86 },
    relationship: { initial: -30 },
    visual: {
      bodyPlan: 'hero-orc-war-kitchen',
      animationProfile: 'murga-cauldron',
      scale: 1.05,
      palette: {
        skin: 0x69784d,
        cloth: 0x4f2926,
        clothInner: 0x7f3c31,
        leather: 0x3d2c23,
        metal: 0x565b59,
        brass: 0x9b784a,
        accent: 0xd65a3d,
        dark: 0x1f1d1a
      },
      silhouette: ['towering-black-cauldron-backpack', 'long-butchers-hook', 'broad-war-cleaver'],
      dedicatedParts: ['black-war-cauldron', 'rib-frame-harness', 'cauldron-lid-shield', 'long-meat-hook', 'broad-cleaver', 'broken-spoon-necklace', 'spice-pouches', 'ember-brazier']
    },
    passive: {
      id: 'murga-army-eats-first',
      name: 'The Army Eats First',
      description: 'Red-Tusk hunger rises more slowly and wounded warriors recover morale around Murga.'
    },
    leadership: {
      radius: 'same-room',
      hungerRateMultiplier: 0.55,
      orcCourageBonus: 2,
      corpseMeatYieldBonus: 0.5,
      fearRecoveryPerSecond: 0.4
    },
    skills: [
      skill('murga-blood-root-broth', 'Blood-and-Root Broth', {
        cooldown: 16,
        windup: 2.1,
        recovery: 0.8,
        targetPolicy: 'room-center',
        costs: { meat: 2 },
        telegraph: { shape: 'cauldron-hearth', radius: 4.2, colorRole: 'orc-ember', cue: 'cauldron-set-down' },
        effects: [
          { type: 'deploy-healing-cauldron', duration: 9, hp: 36, radius: 4.2, healPerSecond: 2.1, fearRecoveryPerSecond: 0.8 }
        ],
        ai: { priority: 7, woundedAllies: 2 }
      }),
      skill('murga-butchers-hook', "Butcher's Hook", {
        cooldown: 10,
        windup: 1.2,
        recovery: 0.9,
        targetPolicy: 'corpse-or-downed-hostile',
        telegraph: { shape: 'hook-line', radius: 5.5, length: 5.5, colorRole: 'orc-ember', cue: 'chain-hook-cast' },
        effects: [
          { type: 'hook-corpse-or-downed', pullDuration: 1.5, butcherDuration: 2, meatYield: 2, maximumDistance: 5.5 }
        ],
        ai: { priority: 6, requireCorpseOrDowned: true }
      }),
      skill('murga-war-feast', 'War Feast', {
        cooldown: 36,
        windup: 2.5,
        recovery: 1.05,
        interruptDamageRatio: 0.25,
        targetPolicy: 'allied-room',
        costs: { meat: 6 },
        telegraph: { shape: 'feast-ring', radius: 6, colorRole: 'orc-ember', cue: 'lid-struck-like-gong' },
        effects: [
          { type: 'war-feast-field', duration: 12, radius: 6, attackMultiplier: 1.24, lifesteal: 0.12, noRetreat: true },
          { type: 'emit-command', command: 'eat-then-fight' }
        ],
        ai: { priority: 10, minimumAllies: 3, minimumHostiles: 2 }
      })
    ]
  }),


  'hero.aldren': hero({
    id: 'hero.aldren',
    role: 'hero-aldren',
    displayName: 'Ser Aldren Vale',
    localizedName: '세르 알드렌 베일',
    factionId: 'undead-host',
    species: 'skeleton',
    size: 'medium',
    initialRoomId: 'E22',
    encounterRoomId: 'E22',
    baseStats: { hp: 112, attack: 11, courage: 24, armor: 7, speed: 0.82 },
    relationship: { initial: -20 },
    visual: {
      bodyPlan: 'hero-skeleton-royal-guard',
      animationProfile: 'aldren-royal-guard',
      scale: 1.02,
      indicatorRadius: 0.68,
      markerHeight: 2.65,
      palette: {
        skin: 0xd9d4c0,
        cloth: 0x283a59,
        clothInner: 0x1a2439,
        leather: 0x41362f,
        metal: 0x535e68,
        brass: 0xc2a862,
        accent: 0xa9e3ff,
        dark: 0x14191e
      },
      silhouette: ['tall-royal-helm', 'broad-empty-heraldic-shield', 'straight-command-sword'],
      dedicatedParts: ['hollow-breastplate', 'royal-crested-helm', 'empty-heraldic-shield', 'command-sword', 'half-rotted-blue-cloak', 'soul-flame-rib-cavity', 'command-chain', 'ossuary-spurs']
    },
    passive: {
      id: 'aldren-unfinished-watch',
      name: 'The Watch Is Not Ended',
      description: 'Skeletons holding Aldren\'s line gain frontal protection, courage, and resistance to forced movement.'
    },
    leadership: {
      radius: 'formation-and-same-room',
      skeletonArmorBonus: 2,
      skeletonCourageBonus: 3,
      frontalDamageMultiplier: 0.76,
      knockbackResistanceBonus: 0.25
    },
    runtimeDefaults: { royalOrders: 1 },
    skills: [
      skill('aldren-royal-line', 'Royal Battle Line', {
        cooldown: 15,
        windup: 1.65,
        recovery: 0.8,
        targetPolicy: 'allied-room',
        telegraph: { shape: 'command-line', radius: 5.2, length: 5.2, width: 0.8, colorRole: 'royal-blue', cue: 'sword-scrapes-stone' },
        effects: [
          { type: 'create-royal-formation', duration: 12, maximumAllies: 4, span: 5.2, frontalDamageMultiplier: 0.72, crossingStagger: 1.1 },
          { type: 'emit-command', command: 'hold-the-royal-line' }
        ],
        ai: { priority: 8, minimumAllies: 2, minimumHostiles: 1 }
      }),
      skill('aldren-shield-judgment', 'Shield Judgment', {
        cooldown: 9,
        windup: 0.95,
        recovery: 0.75,
        targetPolicy: 'hostile-direction',
        telegraph: { shape: 'shield-wedge', radius: 3.6, length: 3.6, width: 2.4, colorRole: 'royal-blue', cue: 'shield-rim-rings' },
        effects: [
          { type: 'royal-shield-bash', damage: 6, impulse: 5.2, length: 3.6, width: 2.4, interrupt: true, armorBreak: { amount: 2, duration: 5 } }
        ],
        ai: { priority: 7, minimumHostiles: 1 }
      }),
      skill('aldren-unrevoked-order', 'The Unrevoked Order', {
        cooldown: 34,
        windup: 2.35,
        recovery: 1.05,
        interruptDamageRatio: 0.24,
        targetPolicy: 'room-corpses',
        costs: { bone: 3, deathEnergy: 1 },
        telegraph: { shape: 'three-grave-sigils', radius: 5.5, colorRole: 'royal-soul', cue: 'sword-command-three-knocks' },
        effects: [
          { type: 'reassemble-royal-skeletons', maximum: 3, duration: 24, role: 'skeleton' },
          { type: 'emit-command', command: 'resume-your-posts' }
        ],
        ai: { priority: 10, minimumHostiles: 2 }
      })
    ]
  }),

  'hero.malcor': hero({
    id: 'hero.malcor',
    role: 'hero-malcor',
    displayName: 'Malcor Rotten-Tooth',
    localizedName: '구린이빨 말코르',
    factionId: 'undead-host',
    species: 'ghast',
    size: 'medium',
    initialRoomId: 'E24',
    encounterRoomId: 'E24',
    baseStats: { hp: 96, attack: 12, courage: 19, armor: 2, speed: 1.08 },
    relationship: { initial: -55 },
    visual: {
      bodyPlan: 'hero-ghast-noble',
      animationProfile: 'malcor-ghast-lord',
      scale: 1.0,
      indicatorRadius: 0.62,
      markerHeight: 2.45,
      palette: {
        skin: 0x878b72,
        cloth: 0x211d23,
        clothInner: 0x4b2630,
        leather: 0x3a2b25,
        metal: 0x8d8a82,
        brass: 0xb4975c,
        accent: 0xb3d99e,
        dark: 0x151316
      },
      silhouette: ['long-arms-below-knees', 'forward-hunched-neck', 'dragging-noble-coattails'],
      dedicatedParts: ['silver-stitched-jaw', 'rotted-banquet-coat', 'noble-ring-array', 'silver-cutlery-belt', 'elongated-claw-hands', 'ghast-spine-ridge', 'stained-tablecloth-cravat', 'scent-vapor-rig']
    },
    passive: {
      id: 'malcor-ghast-stench',
      name: 'Ghast Stench',
      description: 'Living enemies near Malcor lose accuracy and healing efficiency and may retch when exposed too long.'
    },
    leadership: {
      radius: 'same-room',
      ghoulAttackBonus: 2,
      ghoulSpeedMultiplier: 1.12,
      corpseDetectionRadius: 2,
      fearImmunity: true
    },
    runtimeDefaults: { appetite: 0, memoryBuff: null },
    skills: [
      skill('malcor-predators-cry', "Predator's Cry", {
        cooldown: 11,
        windup: 1.7,
        recovery: 0.95,
        targetPolicy: 'hostile-direction',
        telegraph: { shape: 'ghast-scream-cone', radius: 5.2, length: 5.2, width: 3.5, colorRole: 'ghast-green', cue: 'silver-jaw-stitches-snap' },
        effects: [
          { type: 'ghast-fear-cone', length: 5.2, width: 3.5, fearDuration: 4, paralyzeDuration: 1.35 },
          { type: 'emit-command', command: 'feed-the-pack' }
        ],
        ai: { priority: 8, minimumHostiles: 2 }
      }),
      skill('malcor-memory-flesh', 'Memory in the Flesh', {
        cooldown: 13,
        windup: 1.45,
        recovery: 0.85,
        targetPolicy: 'room-corpse',
        telegraph: { shape: 'corpse-grasp', radius: 2.2, colorRole: 'ghast-green', cue: 'cutlery-on-bone' },
        effects: [
          { type: 'consume-memory-corpse', heal: 24, buffDuration: 14 },
          { type: 'increase-appetite', amount: 1 }
        ],
        ai: { priority: 7, healthBelow: 0.78, requireCorpse: true }
      }),
      skill('malcor-hungry-feast', 'The Hungry Feast', {
        cooldown: 36,
        windup: 2.5,
        recovery: 1.1,
        interruptDamageRatio: 0.23,
        targetPolicy: 'room-corpses',
        costs: { corpse: 1, deathEnergy: 2 },
        telegraph: { shape: 'carrion-banquet-ring', radius: 6, colorRole: 'ghast-green', cue: 'banquet-bell-under-earth' },
        effects: [
          { type: 'raise-ghoul-pack', maximum: 3, duration: 28 },
          { type: 'ghoul-frenzy-aura', duration: 12, attackMultiplier: 1.18, speedMultiplier: 1.12 }
        ],
        ai: { priority: 10, minimumHostiles: 2, requireCorpse: true }
      })
    ]
  }),

  'hero.arvek': hero({
    id: 'hero.arvek',
    role: 'hero-arvek',
    displayName: 'Arvek, Who Closed the Gate',
    localizedName: '아르벡, 성문을 닫은 자',
    factionId: 'undead-host',
    species: 'death-knight',
    size: 'large',
    initialRoomId: 'L59',
    encounterRoomId: 'L59',
    baseStats: { hp: 146, attack: 15, courage: 26, armor: 8, speed: 0.72 },
    relationship: { initial: -45 },
    visual: {
      bodyPlan: 'hero-death-knight-gate',
      animationProfile: 'arvek-black-gate',
      scale: 1.12,
      indicatorRadius: 0.82,
      markerHeight: 3.0,
      palette: {
        skin: 0xb7b19e,
        cloth: 0x202731,
        clothInner: 0x3c2631,
        leather: 0x312a27,
        metal: 0x343d43,
        brass: 0x7f7356,
        accent: 0x86b4d0,
        dark: 0x101417
      },
      silhouette: ['gate-tower-pauldrons', 'horizontal-breastplate-bolt', 'full-door-slab-shield'],
      dedicatedParts: ['gate-tower-shoulders', 'breastplate-crossbar', 'door-slab-shield', 'city-key-back-ring', 'black-execution-sword', 'outer-city-crest', 'royal-crest', 'threshold-chain-cloak']
    },
    passive: {
      id: 'arvek-gatekeeper',
      name: 'Gatekeeper',
      description: 'Arvek becomes harder to stagger and harm while defending a closed route or one of his spectral gates.'
    },
    leadership: {
      radius: 'same-room-and-barriers',
      undeadArmorBonus: 2,
      barrierArmorBonus: 0.2,
      routeDefenseBonus: 0.25,
      retreatLock: true
    },
    runtimeDefaults: { gateGuilt: 1 },
    skills: [
      skill('arvek-black-gate', 'The Black Gate', {
        cooldown: 15,
        windup: 2.05,
        recovery: 1.0,
        targetPolicy: 'room-route',
        costs: { deathEnergy: 2 },
        telegraph: { shape: 'spectral-gate-wall', radius: 4.5, width: 2.6, colorRole: 'death-knight-blue', cue: 'breastplate-bolt-closes' },
        effects: [
          { type: 'create-spectral-gate', duration: 12, hp: 48, allowFaction: 'undead-host' },
          { type: 'emit-command', command: 'the-gate-remains-shut' }
        ],
        ai: { priority: 8, minimumHostiles: 1 }
      }),
      skill('arvek-banishment-sentence', 'Sentence of Banishment', {
        cooldown: 10,
        windup: 1.15,
        recovery: 0.9,
        targetPolicy: 'single-hostile',
        telegraph: { shape: 'door-shield-charge', radius: 4.2, length: 4.2, width: 1.6, colorRole: 'death-knight-blue', cue: 'door-shield-drags-stone' },
        effects: [
          { type: 'banishment-shield-charge', damage: 9, impulse: 7.2, barrierCollisionDamage: 12, stagger: 1.4 },
          { type: 'emit-command', command: 'outside-the-walls' }
        ],
        ai: { priority: 7, minimumHostiles: 1 }
      }),
      skill('arvek-close-the-city', 'Close the City', {
        cooldown: 42,
        windup: 2.85,
        recovery: 1.25,
        interruptDamageRatio: 0.27,
        targetPolicy: 'all-room-routes',
        costs: { deathEnergy: 6 },
        telegraph: { shape: 'all-gates-closing', radius: 7, colorRole: 'death-knight-blue', cue: 'hundred-keys-fall' },
        effects: [
          { type: 'seal-all-room-routes', duration: 10, hp: 34, allowFaction: 'undead-host' },
          { type: 'raise-spectral-guards', count: 2, duration: 20 },
          { type: 'root-self', duration: 10 }
        ],
        ai: { priority: 10, minimumHostiles: 3, healthBelow: 0.68 }
      })
    ]
  }),


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
