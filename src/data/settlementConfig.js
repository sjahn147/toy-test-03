export const SETTLEMENT_PROP_TYPES = new Set([
  'goblin_lair',
  'ossuary_lair',
  'spider_lair',
  'slime_pool',
  'rat_warren',
  'ogre_lair',
  'plague_mortuary',
  'orc_tribe_camp',
  'fungal_garden',
  'blood_roost',
  'carrion_pit',
  'kobold_workshop',
  'cursed_chapel',
  'parasite_pool'
]);

export const SETTLEMENT_PROFILES = {
  rat: profile('warren', 8, 2, 0.58, 2),
  goblin: profile('hearth-lair', 5, 3, 0.68, 2),
  spider: profile('brood-chamber', 5, 2, 0.82, 2),
  slime: profile('spawning-pool', 5, 2, 0.9, 1),
  skeleton: profile('ossuary', 6, 3, 0.78, 2),
  ogre: profile('butcher-camp', 2, 4, 0.48, 1),
  zombie: profile('plague-mortuary', 5, 2, 0.82, 2),
  orc: profile('tribal-war-camp', 4, 4, 0.64, 2),
  myconid: profile('fungal-colony', 5, 1, 0.94, 2),
  stirge: profile('blood-roost', 7, 3, 0.72, 2),
  carrion: profile('carrion-pit', 4, 3, 0.72, 1),
  kobold: profile('trapworks', 5, 2, 0.86, 2),
  wraith: profile('cursed-chapel', 3, 4, 0.62, 1),
  parasite: profile('larval-cistern', 6, 1, 0.96, 1)
};

export const SAFE_HUB_PROFILE = {
  type: 'licensed-waystation',
  capacity: 10,
  guestCapacity: 5,
  roamingRange: 99,
  homeAttachment: 0.9,
  minimumGarrison: 0,
  indestructible: true
};

export const SETTLEMENT_BUILDING_BONUSES = {
  territory_banner: { capacity: 0, security: 2 },
  barricade: { capacity: 1, security: 8 },
  watch_post: { capacity: 1, security: 10 },
  camp_site: { capacity: 2, comfort: 8, recovery: 5 },
  rest_site: { capacity: 2, comfort: 10, recovery: 6 },
  water_fountain: { capacity: 0, comfort: 4, recovery: 8 },
  merchant_stall: { capacity: 1, comfort: 4 },
  goddess_statue: { capacity: 1, security: 12, recovery: 12 }
};

export const SETTLEMENT_FACTION_COLORS = {
  'adventurer-expedition': 0x7bb7e8,
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

export function settlementProfileFor(species) {
  return SETTLEMENT_PROFILES[species] ?? profile(`${species}-habitat`, 4, 2, 0.7, 1);
}

export function isSettlementAnchor(prop) {
  return Boolean(prop && prop.species && (SETTLEMENT_PROP_TYPES.has(prop.type) || Number.isFinite(prop.capacity)));
}

function profile(type, capacity, roamingRange, homeAttachment, minimumGarrison) {
  return { type, capacity, roamingRange, homeAttachment, minimumGarrison, guestCapacity: 0, indestructible: false };
}
