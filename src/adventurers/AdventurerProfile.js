const ADVENTURER_ROLES = new Set(['fighter', 'rogue', 'cleric', 'wizard', 'archer', 'ranger', 'paladin', 'barbarian', 'bard', 'druid', 'warlock']);

const BODY_BUILDS = ['compact', 'lean', 'average', 'broad', 'tall', 'heavy'];
const STATURES = ['short', 'medium', 'tall'];
const FACE_VARIANTS = ['angular-01', 'angular-02', 'soft-01', 'broad-01', 'narrow-01'];
const HAIR_STYLES = ['cropped', 'swept', 'bob', 'tied-back', 'braid', 'shaved', 'tonsure', 'messy'];
const HAIR_COLORS = ['black', 'brown-dark', 'brown-warm', 'auburn', 'blond-dark', 'grey'];
const SKIN_TONES = ['warm-01', 'warm-02', 'warm-03', 'neutral-01', 'neutral-02', 'deep-01'];
const BACKGROUNDS = ['former-soldier', 'temple-acolyte', 'street-urchin', 'hedge-scholar', 'caravan-guard', 'tomb-robber', 'failed-noble', 'village-hunter'];
const TRAITS = ['brave', 'methodical', 'compassionate', 'alert', 'resourceful', 'reckless', 'greedy', 'superstitious', 'claustrophobic', 'proud', 'vengeful'];

const ROLE_DEFINITIONS = Object.freeze({
  fighter: {
    archetypes: ['sword-and-board', 'polearm-guard', 'heavy-vanguard'],
    specializations: ['guardian', 'vanguard', 'duelist'],
    palettes: ['red-iron', 'blue-steel', 'brown-mercenary', 'white-tabard'],
    abilities: ['fighter.guard', 'fighter.shield-bash', 'fighter.hold-door']
  },
  rogue: {
    archetypes: ['dual-blade-scout', 'crossbow-infiltrator', 'trap-specialist'],
    specializations: ['infiltrator', 'trapper', 'scavenger'],
    palettes: ['moss', 'charcoal', 'rust', 'muted-violet'],
    abilities: ['rogue.backstab', 'rogue.scout-ahead', 'rogue.disarm']
  },
  cleric: {
    archetypes: ['armored-chaplain', 'relic-healer', 'exorcist'],
    specializations: ['healer', 'exorcist', 'chaplain'],
    palettes: ['ivory-gold', 'blue-silver', 'ash-red', 'green-bronze'],
    abilities: ['cleric.mend', 'cleric.bless', 'cleric.turn-undead']
  },
  wizard: {
    archetypes: ['staff-scholar', 'battle-mage', 'ritualist'],
    specializations: ['battle-mage', 'ritualist', 'controller'],
    palettes: ['violet', 'midnight-blue', 'ochre', 'black-teal'],
    abilities: ['wizard.arcane-bolt', 'wizard.ward', 'wizard.analyze']
  },
  archer: {
    archetypes: ['longbow-ranger', 'shortbow-skirmisher', 'dungeon-marksman'],
    specializations: ['ranger', 'marksman', 'skirmisher'],
    palettes: ['forest', 'weathered-blue', 'ochre-leather', 'ash-green'],
    abilities: ['archer.aimed-shot', 'archer.overwatch', 'archer.mark-target']
  }
});

const ROLE_ALIASES = Object.freeze({
  ranger: 'archer',
  paladin: 'fighter',
  barbarian: 'fighter',
  bard: 'cleric',
  druid: 'cleric',
  warlock: 'wizard'
});

export function isStandardAdventurer(agent) {
  if (!agent || agent.faction !== 'party') return false;
  if (agent.heroId || agent.rank === 'hero' || agent.isHero || agent.uniqueHero) return false;
  return ADVENTURER_ROLES.has(agent.role);
}

export function ensureAdventurerProfile(agent) {
  if (!isStandardAdventurer(agent)) return agent;
  const seed = Number.isFinite(agent.appearanceSeed)
    ? agent.appearanceSeed >>> 0
    : hash32(agent.id ?? agent.name ?? `${agent.role}:adventurer`);
  const role = canonicalRole(agent.role);
  const definition = ROLE_DEFINITIONS[role] ?? ROLE_DEFINITIONS.fighter;

  agent.appearanceSeed = seed;
  agent.adventurerRole = role;
  agent.bodyBuild ??= pick(BODY_BUILDS, seed, 'body');
  agent.stature ??= pick(STATURES, seed, 'stature');
  agent.faceVariant ??= pick(FACE_VARIANTS, seed, 'face');
  agent.hairStyle ??= pick(HAIR_STYLES, seed, 'hair');
  agent.hairColor ??= pick(HAIR_COLORS, seed, 'hair-color');
  agent.skinTone ??= pick(SKIN_TONES, seed, 'skin');
  agent.paletteFamily ??= pick(definition.palettes, seed, 'palette');
  agent.visualArchetype ??= pick(definition.archetypes, seed, 'archetype');
  agent.specialization ??= pick(definition.specializations, seed, 'specialization');
  agent.background ??= pick(BACKGROUNDS, seed, 'background');
  agent.traits ??= distinctPicks(TRAITS, seed, 'trait', 2);
  agent.experience ??= Math.max(0, Number(agent.experience ?? 0));
  agent.equipmentCondition ??= pick(['maintained', 'worn', 'patched', 'field-repaired'], seed, 'condition');
  refreshAdventurerProgression(agent);
  return agent;
}

export function refreshAdventurerProgression(agent) {
  if (!isStandardAdventurer(agent)) return agent;
  const role = canonicalRole(agent.role);
  const definition = ROLE_DEFINITIONS[role] ?? ROLE_DEFINITIONS.fighter;
  const level = Math.max(1, Math.floor(Number(agent.level ?? 1)));
  agent.level = level;
  agent.equipmentTier = level >= 8 ? 'renowned' : level >= 5 ? 'veteran' : level >= 3 ? 'seasoned' : 'recruit';
  const unlocked = level >= 7 ? 3 : level >= 3 ? 2 : 1;
  agent.abilityIds = [...new Set([...(agent.abilityIds ?? []), ...definition.abilities.slice(0, unlocked)])];
  agent.visualProgression = {
    tier: agent.equipmentTier,
    trophyCount: level >= 8 ? 2 : level >= 5 ? 1 : 0,
    reinforced: level >= 3,
    renowned: level >= 8
  };
  return agent;
}

export function grantAdventurerExperience(agent, amount = 0) {
  if (!isStandardAdventurer(agent)) return { leveled: false, previousLevel: agent?.level ?? 1, level: agent?.level ?? 1 };
  ensureAdventurerProfile(agent);
  const previousLevel = agent.level;
  agent.experience = Math.max(0, agent.experience + Math.max(0, Number(amount) || 0));
  const derivedLevel = Math.max(previousLevel, levelForExperience(agent.experience));
  agent.level = derivedLevel;
  refreshAdventurerProgression(agent);
  return { leveled: derivedLevel > previousLevel, previousLevel, level: derivedLevel };
}

export function levelForExperience(experience) {
  const xp = Math.max(0, Number(experience) || 0);
  let level = 1;
  let threshold = 40;
  let spent = 0;
  while (level < 12 && xp >= spent + threshold) {
    spent += threshold;
    level += 1;
    threshold = Math.round(threshold * 1.42 + 12);
  }
  return level;
}

export function adventurerVisualSignature(agent) {
  if (!isStandardAdventurer(agent)) return null;
  ensureAdventurerProfile(agent);
  return [
    agent.adventurerRole,
    agent.visualArchetype,
    agent.bodyBuild,
    agent.stature,
    agent.faceVariant,
    agent.hairStyle,
    agent.hairColor,
    agent.skinTone,
    agent.paletteFamily,
    agent.equipmentTier,
    agent.equipmentCondition
  ].join(':');
}

export function adventurerRoleDefinition(role) {
  return ROLE_DEFINITIONS[canonicalRole(role)] ?? ROLE_DEFINITIONS.fighter;
}

export function canonicalRole(role) {
  return ROLE_ALIASES[role] ?? role;
}

function pick(values, seed, salt) {
  return values[hash32(`${seed}:${salt}`) % values.length];
}

function distinctPicks(values, seed, salt, count) {
  const ranked = values
    .map(value => ({ value, score: hash32(`${seed}:${salt}:${value}`) }))
    .sort((a, b) => a.score - b.score);
  return ranked.slice(0, count).map(entry => entry.value);
}

export function hash32(value) {
  let result = 2166136261;
  for (const char of String(value ?? '')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
