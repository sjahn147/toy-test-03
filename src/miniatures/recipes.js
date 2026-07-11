export const MINIATURE_RECIPES = {
  fighter: {
    id: 'fighter_rana_v2', skeleton: 'humanoid', bodyType: 'feminine', weaponStyle: 'sword-shield', scale: 0.74,
    proportions: { head: 1.04, shoulders: 1.12, legs: 0.96 },
    palette: { skin: 0xd7a27f, cloth: 0x8f3832, leather: 0x5a3422, metal: 0xb7c2c9, accent: 0xe5b956, dark: 0x292633 },
    parts: { head: 'head_square_01', hat: 'hat_helm_round', torso: 'torso_chain_fighter', back: 'back_cape_short', waist: 'waist_belt_plain', mainHand: 'wpn_sword_long', offHand: 'off_shield_round', accent: null }
  },
  rogue: {
    id: 'rogue_milo_v2', skeleton: 'humanoid', bodyType: 'masculine', weaponStyle: 'dual-dagger', scale: 0.72,
    proportions: { head: 1.02, shoulders: 0.92, legs: 1.05 },
    palette: { skin: 0xc98967, cloth: 0x66532d, leather: 0x3d2b1f, metal: 0x9aa1a6, accent: 0xe8c46a, dark: 0x211c22 },
    parts: { head: 'head_round_01', hat: 'hat_hood_rogue', torso: 'torso_leather_rogue', back: 'back_quiver', waist: 'waist_pouch_rogue', mainHand: 'wpn_dagger', offHand: 'off_dagger_reverse', accent: null }
  },
  cleric: {
    id: 'cleric_pell_v2', skeleton: 'humanoid', bodyType: 'feminine', weaponStyle: 'mace-book', scale: 0.73,
    proportions: { head: 1.08, shoulders: 1.02, legs: 0.96 },
    palette: { skin: 0xd7aa8a, cloth: 0xd8e2e8, leather: 0x6a4a35, metal: 0xc9d2d6, accent: 0xf2d67a, dark: 0x4c5364 },
    parts: { head: 'head_round_02', hat: 'hat_cleric_band', torso: 'torso_robe_cleric', back: 'back_relic_pack', waist: 'waist_scroll_case', mainHand: 'wpn_mace', offHand: 'off_book', accent: 'accent_halo_small' }
  },
  wizard: {
    id: 'wizard_orwin_v2', skeleton: 'humanoid', bodyType: 'masculine', weaponStyle: 'staff-focus', scale: 0.71,
    proportions: { head: 1.0, shoulders: 0.9, legs: 1.02 },
    palette: { skin: 0xb9826c, cloth: 0x5946b2, leather: 0x513724, metal: 0x9aa5bc, accent: 0x9fdcff, dark: 0x252039 },
    parts: { head: 'head_round_01', hat: 'hat_wizard_tall', torso: 'torso_robe_mage', back: 'back_spellbook', waist: 'waist_scroll_case', mainHand: 'wpn_staff', offHand: 'off_focus_orb', accent: 'accent_arcane_ring' }
  },
  archer: {
    id: 'archer_alda_v2', skeleton: 'humanoid', bodyType: 'feminine', weaponStyle: 'bow', scale: 0.72,
    proportions: { head: 1.02, shoulders: 0.94, legs: 1.05 },
    palette: { skin: 0xc99575, cloth: 0x506244, leather: 0x4a3528, metal: 0x9da5a5, accent: 0xc9b36b, dark: 0x282721 },
    parts: { head: 'head_round_02', hat: 'hat_hood_rogue', torso: 'torso_leather_rogue', back: 'back_quiver', waist: 'waist_pouch_rogue', mainHand: 'wpn_arrow_nocked', offHand: 'off_bow_long', accent: null }
  },
  goblin: {
    id: 'goblin_common_v2', skeleton: 'goblin', bodyType: 'neutral', weaponStyle: 'club', scale: 0.7,
    proportions: { head: 1.18, shoulders: 0.92, legs: 0.82 },
    palette: { skin: 0x82a850, cloth: 0x7b4732, leather: 0x4c3325, metal: 0x8b8d82, accent: 0xb8df6a, dark: 0x2c2f22 },
    parts: { head: 'head_goblin_01', hat: 'hat_goblin_cap', torso: 'torso_goblin_rags', back: null, waist: 'waist_pouch_small', mainHand: 'wpn_bone_club', offHand: null, accent: 'accent_ear_goblin' }
  },
  skeleton: {
    id: 'skeleton_common_v2', skeleton: 'skeleton', weaponStyle: 'sword', scale: 0.72,
    proportions: { head: 1.05, shoulders: 0.84, legs: 1.0 },
    palette: { skin: 0xd8d5c4, cloth: 0x6b6470, leather: 0x4b382d, metal: 0x8d969b, accent: 0xe8e2c9, dark: 0x25262a },
    parts: { head: 'head_skull_01', hat: null, torso: 'torso_bone_rib', back: null, waist: 'waist_belt_plain', mainHand: 'wpn_sword_short', offHand: null, accent: null }
  },
  ogre: {
    id: 'ogre_large_v2', skeleton: 'ogre', bodyType: 'neutral', weaponStyle: 'heavy-club', scale: 1.08,
    proportions: { head: 1.18, shoulders: 1.48, legs: 0.88 },
    palette: { skin: 0x87905c, cloth: 0x6e4430, leather: 0x4b3022, metal: 0x777c78, accent: 0xd6b16f, dark: 0x2c2825 },
    parts: { head: 'head_goblin_01', hat: null, torso: 'torso_goblin_rags', back: null, waist: 'waist_belt_plain', mainHand: 'wpn_bone_club', offHand: null, accent: 'accent_ear_goblin' }
  },
  slime: {
    id: 'slime_common_v2', skeleton: 'slime', weaponStyle: 'body-slam', scale: 0.76,
    proportions: { head: 1, shoulders: 1, legs: 1 },
    palette: { skin: 0x62c7a8, cloth: 0x62c7a8, leather: 0x3b927d, metal: 0x7ae1c2, accent: 0xb2ffe7, dark: 0x245b50 },
    parts: { head: null, hat: null, torso: 'torso_slime_blob', back: null, waist: null, mainHand: null, offHand: null, accent: 'accent_slime_bubbles' }
  },
  mimic: {
    id: 'mimic_common_v2', skeleton: 'mimic', weaponStyle: 'bite', scale: 0.72,
    proportions: { head: 1, shoulders: 1, legs: 1 },
    palette: { skin: 0x8a542c, cloth: 0x8a542c, leather: 0x6b3e24, metal: 0xd7ad4a, accent: 0xfff0c9, dark: 0x3a1e19 },
    parts: { head: null, hat: null, torso: 'torso_mimic_body', back: null, waist: null, mainHand: null, offHand: null, accent: 'accent_teeth_mimic' }
  },
  spider: {
    id: 'spider_hunter_v1', skeleton: 'arachnid', weaponStyle: 'fangs', scale: 0.74,
    palette: { skin: 0x332735, cloth: 0x4b3548, leather: 0x281f29, metal: 0x746b75, accent: 0xd9b27c, dark: 0x120f16 },
    parts: {}
  },
  wraith: {
    id: 'wraith_veil_v1', skeleton: 'spectral', weaponStyle: 'spectral-claws', scale: 0.78,
    palette: { skin: 0x9cc9d8, cloth: 0x3f526b, leather: 0x273346, metal: 0x7d97aa, accent: 0xc7f3ff, dark: 0x101721 },
    parts: {}
  },
  myconid: {
    id: 'myconid_bloom_v1', skeleton: 'fungal', weaponStyle: 'spores', scale: 0.8,
    palette: { skin: 0xb7a47d, cloth: 0x6e7651, leather: 0x66503a, metal: 0x8c8a77, accent: 0xd6aa70, dark: 0x3c322d },
    parts: {}
  },
  stirge: {
    id: 'stirge_bloodwing_v1', skeleton: 'flying', weaponStyle: 'proboscis', scale: 0.58,
    palette: { skin: 0x7e3e4c, cloth: 0x5b2934, leather: 0x3b2027, metal: 0x7d6c70, accent: 0xd88474, dark: 0x24151a },
    parts: {}
  }
};

export function getMiniatureRecipe(role) {
  return MINIATURE_RECIPES[role] ?? MINIATURE_RECIPES.goblin;
}
