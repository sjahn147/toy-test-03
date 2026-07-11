export const ADVANCED_PROFILES = {
  zombie: { hp: 18, attack: 4, courage: 12, spawnDuration: 12, capacity: 5, maturity: 1 },
  orc: { hp: 22, attack: 6, courage: 10, hungerRate: 1.1, hungryAt: 48, spawnDuration: 18, capacity: 4, maturity: 74 },
  myconid: { hp: 15, attack: 3, courage: 8, spawnDuration: 16, capacity: 5, maturity: 48 },
  stirge: { hp: 6, attack: 2, courage: 7, hungerRate: 1.8, hungryAt: 38, spawnDuration: 9, capacity: 7, maturity: 24 },
  carrion: { hp: 20, attack: 4, courage: 9, hungerRate: 0.9, hungryAt: 44, spawnDuration: 14, capacity: 4, maturity: 54 },
  kobold: { hp: 9, attack: 3, courage: 5, spawnDuration: 13, capacity: 5, maturity: 42 },
  wraith: { hp: 14, attack: 5, courage: 14, spawnDuration: 17, capacity: 3, maturity: 1 },
  parasite: { hp: 4, attack: 1, courage: 6, spawnDuration: 8, capacity: 6, maturity: 20 }
};

export const ADVANCED_FACTION_COLORS = {
  'undead-host': 0x9c8fc8,
  'red-tusk-tribe': 0xc85247,
  'goblin-clan': 0x8daa54,
  'copper-tail-clutch': 0xd59a45,
  'bluecap-colony': 0x5fa9c8,
  'red-wing-brood': 0xb64c68,
  'carrion-brood': 0x9f8060,
  'pale-brood': 0xd6d1b6,
  'slime-bloom': 0x58bea0,
  'ogre-solitary': 0x8b765a,
  'warren-vermin': 0x7d6b61
};

export const ADVANCED_LAIR_TYPES = new Set([
  'plague_mortuary',
  'orc_tribe_camp',
  'fungal_garden',
  'blood_roost',
  'carrion_pit',
  'kobold_workshop',
  'cursed_chapel',
  'parasite_pool'
]);

export const ADVANCED_LAIR_RADII = {
  plague_mortuary: 1.12,
  orc_tribe_camp: 1.22,
  fungal_garden: 1.08,
  blood_roost: 1.02,
  carrion_pit: 1.1,
  kobold_workshop: 1.08,
  cursed_chapel: 1.02,
  parasite_pool: 0.98
};

export function advancedDisplayName(role) {
  const names = {
    zombie: 'Zombie',
    orc: 'Orc',
    myconid: 'Myconid',
    stirge: 'Stirge',
    carrion: 'Carrion Crawler',
    kobold: 'Kobold',
    wraith: 'Wraith',
    parasite: 'Pale Parasite'
  };
  return names[role] ?? role;
}
