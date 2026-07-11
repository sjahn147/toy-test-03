import { THREE } from './ThreeScene.js';

export function applyMiniaturePresentationPolish(factory, root, agent, recipe) {
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x08090b,
    transparent: true,
    opacity: recipe.skeleton === 'spectral' || recipe.skeleton === 'flying' ? 0.12 : 0.24,
    depthWrite: false
  });
  const shadow = factory.mesh('polish:contact-shadow', () => new THREE.CircleGeometry(0.46, 24), shadowMaterial);
  shadow.name = 'miniature_contact_shadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.33;
  shadow.renderOrder = -1;
  root.add(shadow);

  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.name !== 'miniature_contact_shadow';
    node.receiveShadow = false;
    node.frustumCulled = true;
  });

  root.userData.presentation = {
    shadow,
    cape: root.getObjectByName('back_cape_short'),
    quiver: root.getObjectByName('back_quiver'),
    spellbook: root.getObjectByName('back_spellbook'),
    relicPack: root.getObjectByName('back_relic_pack'),
    hood: root.getObjectByName('hat_hood_rogue'),
    wizardHat: root.getObjectByName('hat_wizard_tall'),
    arrow: root.getObjectByName('wpn_arrow_nocked'),
    topknot: root.getObjectByName('orc_topknot'),
    seed: root.userData.animationSeed ?? 0,
    baseShadowOpacity: shadowMaterial.opacity,
    faction: agent.faction
  };
}
