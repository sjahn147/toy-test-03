import { THREE } from './ThreeScene.js';
import { MiniatureFactory } from './MiniatureFactory.js';
import { getMiniatureRecipe } from '../miniatures/recipes.js';
import { BODY_PROFILES, resolveBodyType, variationFor, hash01 } from './MiniatureBodyProfiles.js';
import { buildHumanoidRig, decorateGoblin } from './HumanoidMiniatureRig.js';
import { buildSkeletonRig } from './SkeletonMiniatureRig.js';
import { buildSlime, buildMimic } from './CreatureMiniatureBuilders.js';
import { buildSpider, buildWraith, buildMyconid, buildStirge } from './ExoticMiniatureBuilders.js';
import { buildLongbow, buildArrow } from './MiniatureWeaponBuilders.js';
import { buildHeavyAxe, buildKiteShield } from './MiniaturePhase3Equipment.js';
import { decorateOrc } from './OrcMiniaturePolish.js';
import { applyMiniaturePresentationPolish } from './MiniaturePresentationPolish.js';
import { installAdvancedMiniatureAnimation } from './AdvancedMiniatureAnimator.js';
import { installCombatPresentationBridge } from './CombatPresentationBridge.js';

installAdvancedMiniatureAnimation();
installCombatPresentationBridge();

const HUMANOID_SKELETONS = new Set(['humanoid', 'goblin', 'orc', 'ogre']);
const EXOTIC_BUILDERS = {
  arachnid: buildSpider,
  spectral: buildWraith,
  fungal: buildMyconid,
  flying: buildStirge
};

export class PolishedMiniatureFactory extends MiniatureFactory {
  create(agent) {
    const recipe = getMiniatureRecipe(agent.role);
    if (recipe.skeleton === 'slime') return this.createCreature(agent, recipe, 'slime');
    if (recipe.skeleton === 'mimic') return this.createCreature(agent, recipe, 'mimic');
    if (recipe.skeleton === 'skeleton') return this.createSkeleton(agent, recipe);
    if (HUMANOID_SKELETONS.has(recipe.skeleton)) return this.createHumanoid(agent, recipe);
    if (EXOTIC_BUILDERS[recipe.skeleton]) return this.createExotic(agent, recipe);
    return super.create(agent);
  }

  createHumanoid(agent, recipe) {
    const root = this.createRoot(agent, recipe);
    const model = root.getObjectByName('miniature-model');
    const bodyType = resolveBodyType(agent, recipe);
    const variation = variationFor(agent);
    const goblin = recipe.skeleton === 'goblin';
    const orc = recipe.skeleton === 'orc';
    const ogre = recipe.skeleton === 'ogre';
    const rig = buildHumanoidRig(this, model, recipe, BODY_PROFILES[bodyType], variation, { goblin, ogre });
    this.attachEquipment(rig.sockets, recipe, { omitAccent: goblin || ogre });
    if (goblin || ogre) decorateGoblin(this, rig, recipe, variation, { ogre });
    if (orc) decorateOrc(this, rig, recipe, variation);
    return this.finishRoot(root, agent, recipe, { rig, bodyType, variation });
  }

  createSkeleton(agent, recipe) {
    const root = this.createRoot(agent, recipe);
    const model = root.getObjectByName('miniature-model');
    const variation = variationFor(agent);
    const rig = buildSkeletonRig(this, model, recipe, variation);
    this.attachEquipment(rig.sockets, recipe, { omitTorso: true, omitHead: true });
    if (variation.asymmetry > 0.45) {
      const crack = this.mesh('polish:skeleton-crack', () => new THREE.BoxGeometry(0.025, 0.18, 0.025), this.material(recipe, 'dark', { roughness: 1 }));
      crack.position.set(0.12, 0.08, 0.25);
      crack.rotation.z = 0.42;
      rig.head.add(crack);
    }
    return this.finishRoot(root, agent, recipe, { rig, bodyType: 'skeletal', variation });
  }

  createCreature(agent, recipe, type) {
    const root = this.createRoot(agent, recipe);
    const model = root.getObjectByName('miniature-model');
    const variation = variationFor(agent);
    model.userData.creatureParts = type === 'slime'
      ? buildSlime(this, model, agent, recipe)
      : buildMimic(this, model, recipe);
    return this.finishRoot(root, agent, recipe, { rig: null, bodyType: type === 'slime' ? 'amorphous' : 'hinged-creature', variation });
  }

  createExotic(agent, recipe) {
    const root = this.createRoot(agent, recipe);
    const model = root.getObjectByName('miniature-model');
    const variation = variationFor(agent);
    const builder = EXOTIC_BUILDERS[recipe.skeleton];
    model.userData.creatureParts = builder(this, model, recipe);
    return this.finishRoot(root, agent, recipe, { rig: null, bodyType: recipe.skeleton, variation });
  }

  createRoot(agent, recipe) {
    const root = new THREE.Group();
    root.name = `miniature:${recipe.id}`;
    root.userData.recipeId = recipe.id;
    root.userData.role = agent.role;
    root.userData.weaponStyle = recipe.weaponStyle ?? 'natural';
    root.userData.animationSeed = hash01(agent.id ?? agent.name ?? agent.role);
    const model = new THREE.Group();
    model.name = 'miniature-model';
    model.scale.setScalar(recipe.scale ?? 0.72);
    model.userData.baseScale = recipe.scale ?? 0.72;
    root.add(model);
    return root;
  }

  finishRoot(root, agent, recipe, { rig, bodyType, variation }) {
    root.userData.bodyType = bodyType;
    root.userData.variation = variation;
    root.userData.rig = rig;
    if (rig) rig.model = root.getObjectByName('miniature-model');
    this.addIndicators(root, agent);
    applyMiniaturePresentationPolish(this, root, agent, recipe);
    return root;
  }

  attachEquipment(sockets, recipe, { omitTorso = false, omitHead = true, omitAccent = false } = {}) {
    const parts = { ...recipe.parts };
    if (omitHead) parts.head = null;
    if (omitTorso) parts.torso = null;
    if (omitAccent) parts.accent = null;
    this.attachRecipeParts(sockets, { ...recipe, parts });
  }

  bowLong(recipe) {
    return buildLongbow(this, recipe);
  }

  arrowNocked(recipe) {
    return buildArrow(this, recipe);
  }

  axeHeavy(recipe) {
    return buildHeavyAxe(this, recipe);
  }

  shieldKite(recipe) {
    return buildKiteShield(this, recipe);
  }
}
