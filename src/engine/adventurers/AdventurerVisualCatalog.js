export const ADVENTURER_PALETTES = Object.freeze({
  'red-iron': palette(0x7a2f2b, 0x313841, 0x4c3024, 0xb6bdc3, 0xd2a84d),
  'blue-steel': palette(0x304f71, 0x303742, 0x4b372b, 0xaebac4, 0xc5a35b),
  'brown-mercenary': palette(0x5c4635, 0x34312d, 0x513323, 0x9b9994, 0xb9834d),
  'white-tabard': palette(0xd2cec1, 0x5b2630, 0x4e3426, 0xb9c0c4, 0xd5aa54),
  moss: palette(0x46533b, 0x2d302b, 0x433225, 0x8b9290, 0xb19a53),
  charcoal: palette(0x353536, 0x202225, 0x3c2c24, 0x8d9296, 0x8f7b57),
  rust: palette(0x7c4530, 0x332d2a, 0x4a3023, 0x8f8b85, 0xc09251),
  'muted-violet': palette(0x51435e, 0x2d2933, 0x403027, 0x8d8f9b, 0xb69b62),
  'ivory-gold': palette(0xd6d0bd, 0x6f655e, 0x5b4130, 0xbac2c4, 0xd9b65d),
  'blue-silver': palette(0x526b80, 0x343e4b, 0x513a2d, 0xb8c1c7, 0xd0d8dc),
  'ash-red': palette(0x78504f, 0x4a4545, 0x513729, 0xa6a8a7, 0xc79a5c),
  'green-bronze': palette(0x4c6553, 0x303b36, 0x4f392a, 0x927c58, 0xc2a05c),
  violet: palette(0x5f4aa3, 0x272139, 0x4e3526, 0x8d98aa, 0x91d2df),
  'midnight-blue': palette(0x263f64, 0x1c2434, 0x473326, 0x8c99a8, 0x72bdd2),
  ochre: palette(0x9a7135, 0x45372a, 0x4b3224, 0xa19a89, 0xe0b756),
  'black-teal': palette(0x243a3b, 0x181d24, 0x3f3026, 0x82979a, 0x52c0b2),
  forest: palette(0x39533d, 0x2b332d, 0x4a3526, 0x8c9691, 0xb39a55),
  'weathered-blue': palette(0x4e6575, 0x343b40, 0x4d3627, 0x8d979d, 0xb59c62),
  'ochre-leather': palette(0x81633b, 0x433a2d, 0x5c3e28, 0x96958c, 0xc5a45a),
  'ash-green': palette(0x536057, 0x343937, 0x48352a, 0x909692, 0xa7b06b)
});

export const SKIN_TONES = Object.freeze({
  'warm-01': 0xe1b08c,
  'warm-02': 0xcb916e,
  'warm-03': 0xad755b,
  'neutral-01': 0xd7b09a,
  'neutral-02': 0xb98b78,
  'deep-01': 0x7c5144
});

export const HAIR_COLORS = Object.freeze({
  black: 0x171517,
  'brown-dark': 0x34241e,
  'brown-warm': 0x5c3825,
  auburn: 0x733a28,
  'blond-dark': 0x9e865e,
  grey: 0x858486
});

export const BODY_BUILD_PROFILE = Object.freeze({
  compact: { height: 0.93, shoulder: 1.02, torso: 1.03, limb: 0.92, volume: 1.02 },
  lean: { height: 1.02, shoulder: 0.92, torso: 0.94, limb: 1.04, volume: 0.9 },
  average: { height: 1, shoulder: 1, torso: 1, limb: 1, volume: 1 },
  broad: { height: 1, shoulder: 1.15, torso: 1.08, limb: 0.98, volume: 1.13 },
  tall: { height: 1.1, shoulder: 0.98, torso: 1.04, limb: 1.1, volume: 0.98 },
  heavy: { height: 1.01, shoulder: 1.13, torso: 1.12, limb: 0.96, volume: 1.2 }
});

export const STATURE_SCALE = Object.freeze({ short: 0.94, medium: 1, tall: 1.07 });

export const ROLE_EQUIPMENT = Object.freeze({
  fighter: {
    recruit: { helmet: 'nasal', armor: 'gambeson', weapon: 'sword', offhand: 'round-shield' },
    seasoned: { helmet: 'kettle', armor: 'brigandine', weapon: 'sword', offhand: 'heater-shield' },
    veteran: { helmet: 'sallet', armor: 'half-plate', weapon: 'long-sword', offhand: 'heater-shield' },
    renowned: { helmet: 'sallet-crested', armor: 'veteran-plate', weapon: 'long-sword', offhand: 'heraldic-shield' }
  },
  rogue: {
    recruit: { helmet: 'hood', armor: 'leather', weapon: 'dagger', offhand: 'dagger' },
    seasoned: { helmet: 'hood-mask', armor: 'reinforced-leather', weapon: 'dagger', offhand: 'dagger' },
    veteran: { helmet: 'hood-cowl', armor: 'shadow-coat', weapon: 'short-sword', offhand: 'dagger' },
    renowned: { helmet: 'hood-cowl', armor: 'masterwork-shadow', weapon: 'short-sword', offhand: 'dagger' }
  },
  cleric: {
    recruit: { helmet: 'circlet', armor: 'travel-robes', weapon: 'mace', offhand: 'book' },
    seasoned: { helmet: 'coif', armor: 'mail-robes', weapon: 'mace', offhand: 'relic' },
    veteran: { helmet: 'chaplain-helm', armor: 'chaplain-plate', weapon: 'war-mace', offhand: 'relic' },
    renowned: { helmet: 'reliquary-crown', armor: 'saintly-plate', weapon: 'war-mace', offhand: 'relic' }
  },
  wizard: {
    recruit: { helmet: 'travel-hat', armor: 'scholar-robes', weapon: 'staff', offhand: 'focus' },
    seasoned: { helmet: 'hood-focus', armor: 'warded-robes', weapon: 'staff', offhand: 'focus' },
    veteran: { helmet: 'ritual-hat', armor: 'battle-robes', weapon: 'staff', offhand: 'focus' },
    renowned: { helmet: 'arcane-crown', armor: 'master-robes', weapon: 'staff', offhand: 'focus' }
  },
  archer: {
    recruit: { helmet: 'headband', armor: 'leather', weapon: 'bow', offhand: null },
    seasoned: { helmet: 'hood', armor: 'ranger-leather', weapon: 'bow', offhand: null },
    veteran: { helmet: 'ranger-cowl', armor: 'marksman-coat', weapon: 'longbow', offhand: null },
    renowned: { helmet: 'ranger-cowl', armor: 'master-marksman', weapon: 'longbow', offhand: null }
  }
});

export function resolvePalette(name) {
  return ADVENTURER_PALETTES[name] ?? ADVENTURER_PALETTES['brown-mercenary'];
}

export function resolveEquipment(role, tier) {
  const table = ROLE_EQUIPMENT[role] ?? ROLE_EQUIPMENT.fighter;
  return table[tier] ?? table.recruit;
}

function palette(primary, secondary, leather, metal, accent) {
  return Object.freeze({ primary, secondary, leather, metal, accent, dark: 0x232329 });
}
