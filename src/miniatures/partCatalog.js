export const MINIATURE_SOCKETS = {
  root: { position: [0, 0, 0] },
  pelvis: { position: [0, 0.56, 0] },
  chest: { position: [0, 1.08, 0] },
  head: { position: [0, 1.56, 0] },
  headTop: { position: [0, 1.9, 0] },
  handL: { position: [-0.48, 0.94, 0] },
  handR: { position: [0.48, 0.94, 0] },
  shoulderL: { position: [-0.42, 1.26, 0] },
  shoulderR: { position: [0.42, 1.26, 0] },
  back: { position: [0, 1.16, -0.24] },
  waistFront: { position: [0, 0.72, 0.24] },
  waistBack: { position: [0, 0.72, -0.24] },
  baseFx: { position: [0, 0.08, 0] }
};

export const MINIATURE_PARTS = {
  head_round_01: { slot: 'head', builder: 'headRound', material: 'skin' },
  head_round_02: { slot: 'head', builder: 'headRoundSoft', material: 'skin' },
  head_square_01: { slot: 'head', builder: 'headSquare', material: 'skin' },
  head_goblin_01: { slot: 'head', builder: 'headGoblin', material: 'skin' },
  head_skull_01: { slot: 'head', builder: 'headSkull', material: 'skin' },
  hat_helm_round: { slot: 'headTop', builder: 'helmetRound', material: 'metal' },
  hat_hood_rogue: { slot: 'headTop', builder: 'hoodRogue', material: 'leather' },
  hat_cleric_band: { slot: 'headTop', builder: 'clericBand', material: 'accent' },
  hat_wizard_tall: { slot: 'headTop', builder: 'wizardHat', material: 'cloth' },
  hat_goblin_cap: { slot: 'headTop', builder: 'goblinCap', material: 'cloth' },
  torso_chain_fighter: { slot: 'chest', builder: 'torsoChain', material: 'metal' },
  torso_leather_rogue: { slot: 'chest', builder: 'torsoLeather', material: 'leather' },
  torso_robe_cleric: { slot: 'chest', builder: 'torsoRobeCleric', material: 'cloth' },
  torso_robe_mage: { slot: 'chest', builder: 'torsoRobeMage', material: 'cloth' },
  torso_goblin_rags: { slot: 'chest', builder: 'torsoGoblinRags', material: 'cloth' },
  torso_bone_rib: { slot: 'chest', builder: 'torsoBoneRib', material: 'skin' },
  torso_slime_blob: { slot: 'root', builder: 'torsoSlimeBlob', material: 'skin' },
  torso_mimic_body: { slot: 'root', builder: 'torsoMimicBody', material: 'leather' },
  back_cape_short: { slot: 'back', builder: 'capeShort', material: 'cloth' },
  back_quiver: { slot: 'back', builder: 'quiver', material: 'leather' },
  back_relic_pack: { slot: 'back', builder: 'relicPack', material: 'leather' },
  back_spellbook: { slot: 'back', builder: 'spellbook', material: 'leather' },
  waist_belt_plain: { slot: 'waistFront', builder: 'beltPlain', material: 'leather' },
  waist_pouch_rogue: { slot: 'waistFront', builder: 'pouchRogue', material: 'leather' },
  waist_scroll_case: { slot: 'waistFront', builder: 'scrollCase', material: 'leather' },
  waist_pouch_small: { slot: 'waistFront', builder: 'pouchSmall', material: 'leather' },
  wpn_sword_long: { slot: 'handR', builder: 'swordLong', material: 'metal' },
  wpn_sword_short: { slot: 'handR', builder: 'swordShort', material: 'metal' },
  wpn_dagger: { slot: 'handR', builder: 'dagger', material: 'metal' },
  wpn_mace: { slot: 'handR', builder: 'mace', material: 'metal' },
  wpn_staff: { slot: 'handR', builder: 'staff', material: 'leather' },
  wpn_bone_club: { slot: 'handR', builder: 'boneClub', material: 'skin' },
  wpn_arrow_nocked: { slot: 'handR', builder: 'arrowNocked', material: 'leather' },
  wpn_axe_heavy: { slot: 'handR', builder: 'axeHeavy', material: 'metal' },
  off_shield_round: { slot: 'handL', builder: 'shieldRound', material: 'metal' },
  off_dagger_reverse: { slot: 'handL', builder: 'daggerReverse', material: 'metal' },
  off_book: { slot: 'handL', builder: 'book', material: 'leather' },
  off_focus_orb: { slot: 'handL', builder: 'focusOrb', material: 'accent' },
  off_bow_long: { slot: 'handL', builder: 'bowLong', material: 'leather' },
  off_shield_kite: { slot: 'handL', builder: 'shieldKite', material: 'metal' },
  accent_halo_small: { slot: 'headTop', builder: 'haloSmall', material: 'accent' },
  accent_arcane_ring: { slot: 'baseFx', builder: 'arcaneRing', material: 'accent' },
  accent_ear_goblin: { slot: 'head', builder: 'goblinEars', material: 'skin' },
  accent_slime_bubbles: { slot: 'root', builder: 'slimeBubbles', material: 'accent' },
  accent_teeth_mimic: { slot: 'root', builder: 'mimicTeeth', material: 'accent' }
};

export const PART_SLOT_ORDER = ['torso', 'head', 'hat', 'back', 'waist', 'mainHand', 'offHand', 'accent'];

export function getPartDefinition(partId) {
  return MINIATURE_PARTS[partId] ?? null;
}
