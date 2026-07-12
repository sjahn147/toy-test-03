const FACTION_PROFILES = {
  'undead-host': { id: 'bone-reliquary', label: 'Bone Reliquary', restBehavior: 'death-vigil', materials: ['bone', 'grave-stone', 'soul-flame'] },
  'goblin-clan': { id: 'scrap-palisade', label: 'Scrap Palisade', restBehavior: 'fire-circle', materials: ['scrap', 'timber', 'patched-cloth'] },
  'red-tusk-tribe': { id: 'war-totem-camp', label: 'War Totem Camp', restBehavior: 'weapon-circle', materials: ['tusks', 'hide', 'charred-timber'] },
  'copper-tail-clutch': { id: 'scavenger-workyard', label: 'Scavenger Workyard', restBehavior: 'repair-huddle', materials: ['copper-scrap', 'timber', 'rope'] },
  'bluecap-colony': { id: 'spore-garden', label: 'Spore Garden', restBehavior: 'spore-trance', materials: ['fungal-growth', 'wet-stone', 'glow-spores'] },
  'slime-bloom': { id: 'spore-garden', label: 'Bloom Garden', restBehavior: 'bloom-pool', materials: ['biomass', 'wet-stone', 'glow-spores'] },
  'red-wing-brood': { id: 'brood-nest', label: 'Hanging Brood Nest', restBehavior: 'hanging-roost', materials: ['silk', 'bone', 'egg-clusters'] },
  'carrion-brood': { id: 'brood-nest', label: 'Carrion Brood Nest', restBehavior: 'feeding-roost', materials: ['silk', 'carrion', 'egg-clusters'] },
  'pale-brood': { id: 'brood-nest', label: 'Pale Brood Nest', restBehavior: 'still-roost', materials: ['pale-silk', 'bone', 'egg-clusters'] },
  'ogre-solitary': { id: 'stone-cairn', label: 'Stone Cairn Camp', restBehavior: 'hearth-sleep', materials: ['boulder', 'timber', 'hide'] },
  'warren-vermin': { id: 'burrow-watch', label: 'Burrow Watch', restBehavior: 'burrow-huddle', materials: ['packed-earth', 'scrap', 'rope'] }
};

const SPECIES_FALLBACKS = {
  skeleton: 'bone-reliquary', zombie: 'bone-reliquary', wraith: 'bone-reliquary',
  goblin: 'scrap-palisade', kobold: 'scavenger-workyard', orc: 'war-totem-camp',
  myconid: 'spore-garden', slime: 'spore-garden', spider: 'brood-nest', stirge: 'brood-nest',
  carrion: 'brood-nest', ogre: 'stone-cairn', rat: 'burrow-watch'
};

const GENERIC_PROFILES = {
  'bone-reliquary': { id: 'bone-reliquary', label: 'Bone Reliquary', restBehavior: 'death-vigil', materials: ['bone', 'grave-stone'] },
  'scrap-palisade': { id: 'scrap-palisade', label: 'Scrap Palisade', restBehavior: 'fire-circle', materials: ['scrap', 'timber'] },
  'war-totem-camp': { id: 'war-totem-camp', label: 'War Totem Camp', restBehavior: 'weapon-circle', materials: ['tusks', 'hide'] },
  'scavenger-workyard': { id: 'scavenger-workyard', label: 'Scavenger Workyard', restBehavior: 'repair-huddle', materials: ['scrap', 'rope'] },
  'spore-garden': { id: 'spore-garden', label: 'Spore Garden', restBehavior: 'spore-trance', materials: ['fungal-growth', 'glow-spores'] },
  'brood-nest': { id: 'brood-nest', label: 'Brood Nest', restBehavior: 'hanging-roost', materials: ['silk', 'egg-clusters'] },
  'stone-cairn': { id: 'stone-cairn', label: 'Stone Cairn Camp', restBehavior: 'hearth-sleep', materials: ['boulder', 'hide'] },
  'burrow-watch': { id: 'burrow-watch', label: 'Burrow Watch', restBehavior: 'burrow-huddle', materials: ['packed-earth', 'scrap'] },
  'frontier-stockade': { id: 'frontier-stockade', label: 'Frontier Stockade', restBehavior: 'sentry-rest', materials: ['timber', 'stone'] }
};

export function resolveOutpostProfile(factionId, species = null) {
  const factionProfile = FACTION_PROFILES[factionId];
  if (factionProfile) return cloneProfile(factionProfile);
  const fallbackId = SPECIES_FALLBACKS[species] ?? 'frontier-stockade';
  return cloneProfile(GENERIC_PROFILES[fallbackId]);
}

export function isForwardOutpostProp(prop) {
  if (!prop) return false;
  if (prop.type === 'forward_outpost') return true;
  if (prop.type !== 'territory_banner') return false;
  return Boolean(
    prop.outpostArchetype || prop.outpostProfile ||
    prop.label?.includes('Forward Outpost') ||
    String(prop.settlementId ?? '').includes('monster-forward-outpost')
  );
}

export function knownOutpostArchetypes() {
  return Object.keys(GENERIC_PROFILES);
}

function cloneProfile(profile) {
  return {
    ...profile,
    label: `${profile.label} forward outpost`,
    materials: [...(profile.materials ?? [])]
  };
}
