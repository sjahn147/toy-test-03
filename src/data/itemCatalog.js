export const EQUIPMENT_SLOTS = ['mainHand', 'offHand', 'head', 'body', 'accessory'];

export const ITEM_TEMPLATES = {
  rusty_sword: item('rusty_sword', 'Notched Cellar Sword', 'mainHand', 'common', { attack: 2, speed: 0.1, durability: 18, value: 2, visualId: 'sword_rusty', roles: ['fighter', 'rogue'] }),
  iron_sword: item('iron_sword', 'Waystation Iron Sword', 'mainHand', 'uncommon', { attack: 4, speed: 0.05, durability: 34, value: 6, visualId: 'sword_iron', roles: ['fighter'] }),
  goblin_shiv: item('goblin_shiv', 'Goblin Button-Shiv', 'mainHand', 'common', { attack: 3, speed: 0.28, durability: 16, value: 3, visualId: 'dagger_goblin', roles: ['rogue', 'fighter'] }),
  orc_axe: item('orc_axe', 'Orc Camp Axe', 'mainHand', 'rare', { attack: 6, speed: -0.18, durability: 42, value: 11, visualId: 'axe_orc', roles: ['fighter'] }),
  bone_blade: item('bone_blade', 'Ossuary Bone Blade', 'mainHand', 'uncommon', { attack: 4, speed: 0.12, durability: 25, value: 7, visualId: 'blade_bone', roles: ['fighter', 'rogue'] }),
  hunter_bow: item('hunter_bow', 'Ashwood Hunter Bow', 'mainHand', 'common', { attack: 3, range: 5.5, speed: 0.12, durability: 24, value: 5, visualId: 'bow_hunter', roles: ['archer'] }),
  yew_bow: item('yew_bow', 'Yew Longbow of the Back Row', 'mainHand', 'rare', { attack: 5, range: 7, speed: -0.05, durability: 36, value: 12, visualId: 'bow_yew', roles: ['archer'] }),
  apprentice_staff: item('apprentice_staff', 'Apprentice’s Blue Staff', 'mainHand', 'common', { attack: 2, range: 4.8, durability: 23, value: 4, visualId: 'staff_apprentice', roles: ['wizard'] }),
  crystal_staff: item('crystal_staff', 'Prismatic Survey Staff', 'mainHand', 'rare', { attack: 5, range: 6.2, durability: 31, value: 13, visualId: 'staff_crystal', roles: ['wizard'] }),
  pilgrim_mace: item('pilgrim_mace', 'Pilgrim’s Brass Mace', 'mainHand', 'common', { attack: 2, durability: 27, value: 4, visualId: 'mace_pilgrim', roles: ['cleric'] }),
  saint_mace: item('saint_mace', 'Mace of the Returning Lady', 'mainHand', 'rare', { attack: 4, healing: 2, durability: 38, value: 14, visualId: 'mace_saint', roles: ['cleric'] }),

  plank_shield: item('plank_shield', 'Goblin-Proof Plank Shield', 'offHand', 'common', { defense: 2, durability: 22, value: 3, visualId: 'shield_plank', roles: ['fighter', 'cleric'] }),
  iron_shield: item('iron_shield', 'Iron Watch Shield', 'offHand', 'uncommon', { defense: 4, durability: 39, value: 8, visualId: 'shield_iron', roles: ['fighter'] }),
  thief_buckler: item('thief_buckler', 'Quiet Buckler', 'offHand', 'uncommon', { defense: 2, speed: 0.18, durability: 25, value: 7, visualId: 'buckler_quiet', roles: ['rogue'] }),
  field_spellbook: item('field_spellbook', 'Field Spellbook with Burn Marks', 'offHand', 'uncommon', { attack: 1, range: 0.8, durability: 19, value: 8, visualId: 'book_field', roles: ['wizard'] }),
  reliquary_tome: item('reliquary_tome', 'Reliquary Book of Small Returns', 'offHand', 'uncommon', { defense: 1, healing: 2, durability: 24, value: 9, visualId: 'book_reliquary', roles: ['cleric'] }),

  leather_hood: item('leather_hood', 'Waxed Delver Hood', 'head', 'common', { defense: 1, durability: 18, value: 3, visualId: 'hood_leather', roles: ['rogue', 'archer'] }),
  iron_helm: item('iron_helm', 'Riveted Threshold Helm', 'head', 'uncommon', { defense: 3, durability: 34, value: 7, visualId: 'helm_iron', roles: ['fighter'] }),
  spider_silk_cap: item('spider_silk_cap', 'Spider-Silk Thinking Cap', 'head', 'uncommon', { defense: 1, speed: 0.12, durability: 20, value: 8, visualId: 'cap_spider_silk', roles: ['wizard', 'cleric'] }),
  bone_circlet: item('bone_circlet', 'Mouse-Crypt Bone Circlet', 'head', 'rare', { attack: 1, defense: 2, durability: 27, value: 12, visualId: 'circlet_bone', roles: ['wizard', 'cleric'] }),

  patched_leather: item('patched_leather', 'Patched Expedition Leathers', 'body', 'common', { defense: 2, durability: 30, value: 4, visualId: 'armor_leather', roles: ['rogue', 'archer'] }),
  chain_coat: item('chain_coat', 'Short Chain Expedition Coat', 'body', 'uncommon', { defense: 5, speed: -0.08, durability: 48, value: 10, visualId: 'armor_chain', roles: ['fighter', 'cleric'] }),
  spider_silk_robe: item('spider_silk_robe', 'Layered Spider-Silk Robe', 'body', 'rare', { defense: 3, speed: 0.1, durability: 31, value: 13, visualId: 'robe_spider_silk', roles: ['wizard', 'cleric'] }),
  bone_plate: item('bone_plate', 'Articulated Ossuary Plate', 'body', 'rare', { defense: 6, speed: -0.12, durability: 41, value: 14, visualId: 'armor_bone', roles: ['fighter'] }),
  slime_coat: item('slime_coat', 'Alchemically Sealed Slime-Coat', 'body', 'uncommon', { defense: 3, durability: 36, value: 9, visualId: 'coat_slime', roles: ['rogue', 'archer', 'wizard'] }),

  goblin_charm: item('goblin_charm', 'Goblin’s Seven-Button Charm', 'accessory', 'common', { speed: 0.1, value: 4, durability: 99, visualId: 'charm_goblin', roles: [] }),
  slime_core: item('slime_core', 'Stable Slime Core', 'accessory', 'uncommon', { defense: 1, healing: 1, value: 8, durability: 99, visualId: 'core_slime', roles: ['cleric', 'wizard'] }),
  necrotic_locket: item('necrotic_locket', 'Locket from an Unclaimed Niche', 'accessory', 'rare', { attack: 2, defense: 1, value: 12, durability: 99, visualId: 'locket_necrotic', roles: [] }),
  ogre_tooth: item('ogre_tooth', 'Ogre Tooth Trophy', 'accessory', 'rare', { attack: 2, value: 13, durability: 99, visualId: 'trophy_ogre', roles: ['fighter', 'rogue', 'archer'] })
};

export const INITIAL_LOADOUTS = {
  fighter: ['rusty_sword', 'plank_shield', 'iron_helm', 'chain_coat'],
  rogue: ['goblin_shiv', 'thief_buckler', 'leather_hood', 'patched_leather'],
  cleric: ['pilgrim_mace', 'reliquary_tome', 'spider_silk_cap', 'chain_coat'],
  wizard: ['apprentice_staff', 'field_spellbook', 'spider_silk_cap', 'spider_silk_robe'],
  archer: ['hunter_bow', 'leather_hood', 'patched_leather']
};

export const LOOT_TABLES = {
  treasure: ['iron_sword', 'yew_bow', 'crystal_staff', 'saint_mace', 'iron_shield', 'bone_circlet', 'chain_coat', 'spider_silk_robe', 'necrotic_locket'],
  goblin: ['goblin_shiv', 'plank_shield', 'leather_hood', 'goblin_charm'],
  skeleton: ['rusty_sword', 'bone_blade', 'bone_circlet', 'bone_plate', 'necrotic_locket'],
  slime: ['slime_coat', 'slime_core'],
  spider: ['spider_silk_cap', 'spider_silk_robe', 'hunter_bow'],
  ogre: ['orc_axe', 'iron_shield', 'chain_coat', 'ogre_tooth'],
  mimic: ['iron_sword', 'crystal_staff', 'saint_mace', 'yew_bow', 'bone_plate', 'necrotic_locket'],
  orc: ['orc_axe', 'iron_shield', 'chain_coat']
};

export function instantiateItem(templateId, sequence, level = 1) {
  const template = ITEM_TEMPLATES[templateId];
  if (!template) return null;
  const levelBonus = Math.max(0, Math.floor((level - 1) / 2));
  return {
    ...template,
    instanceId: `item-${sequence}`,
    itemLevel: Math.max(1, level),
    attack: (template.attack ?? 0) + (template.attack ? levelBonus : 0),
    defense: (template.defense ?? 0) + (template.defense ? levelBonus : 0),
    maxDurability: template.durability,
    durability: template.durability,
    broken: false
  };
}

function item(id, name, slot, rarity, options) {
  return {
    templateId: id,
    name,
    slot,
    rarity,
    attack: options.attack ?? 0,
    defense: options.defense ?? 0,
    healing: options.healing ?? 0,
    range: options.range ?? 0,
    speed: options.speed ?? 0,
    durability: options.durability ?? 20,
    value: options.value ?? 1,
    visualId: options.visualId,
    roles: options.roles ?? []
  };
}
