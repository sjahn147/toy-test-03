import { MiniatureAnimator } from './MiniatureAnimator.js';
import { applyMiniatureDeathPose } from './MiniatureDeathAnimator.js';
import { corpseProgress, getAnimationDelta, resolveAttackTimeline, smoothingAlpha } from './MiniatureAnimationTiming.js';

let installed = false;

export function installAdvancedMiniatureAnimation() {
  if (installed) return;
  installed = true;
  const baseUpdate = MiniatureAnimator.prototype.update;
  MiniatureAnimator.prototype.update = function updateWithAdvancedLayer(mesh, agent, time, effects = []) {
    baseUpdate.call(this, mesh, agent, time, effects);
    applyAdvancedLayer(mesh, agent, time, effects);
  };
}

export class AdvancedMiniatureAnimator extends MiniatureAnimator {
  update(mesh, agent, time, effects = []) {
    super.update(mesh, agent, time, effects);
    applyAdvancedLayer(mesh, agent, time, effects);
  }
}

function applyAdvancedLayer(mesh, agent, time, effects) {
  const dt = getAnimationDelta(mesh);
  const alpha = smoothingAlpha(14, dt);
  const attack = resolveAttackTimeline(agent, time, mesh.userData.animationSeed ?? 0, effects);
  const rig = mesh.userData.rig;
  const style = mesh.userData.weaponStyle ?? 'natural';

  animatePresentation(mesh, agent, time, effects, attack, style, alpha);
  if (agent.corpse) {
    applyMiniatureDeathPose(mesh, agent, time, smoothingAlpha(18, dt));
    return;
  }

  if (rig) animateWeaponStyle(rig, style, attack, alpha);
  const model = mesh.getObjectByName('miniature-model');
  const parts = model?.userData?.creatureParts;
  if (!parts) return;
  if (parts.type === 'arachnid') animateSpider(parts, agent, time, attack, alpha);
  if (parts.type === 'spectral') animateWraith(parts, agent, time, attack, alpha);
  if (parts.type === 'fungal') animateMyconid(parts, agent, time, attack, alpha);
  if (parts.type === 'flying') animateStirge(parts, agent, time, attack, alpha);
}

function animateWeaponStyle(rig, style, attack, alpha) {
  if (!attack.active) return;
  if (style === 'bow') {
    dampRotation(rig.upperArmL, 'x', -0.95 + attack.windup * 0.18, alpha);
    dampRotation(rig.upperArmL, 'y', -0.18, alpha);
    dampRotation(rig.forearmL, 'x', 0.42, alpha);
    dampRotation(rig.upperArmR, 'x', -0.78 - attack.windup * 0.26 + attack.strike * 0.38, alpha);
    dampRotation(rig.upperArmR, 'y', 0.42 + attack.windup * 0.34, alpha);
    dampRotation(rig.forearmR, 'x', 0.72 + attack.windup * 0.36 - attack.strike * 0.5, alpha);
    dampRotation(rig.chest, 'y', -0.28 - attack.windup * 0.16 + attack.strike * 0.18, alpha);
    return;
  }
  if (style === 'staff-focus') {
    dampRotation(rig.upperArmR, 'x', -0.62 - attack.strike * 0.35, alpha);
    dampRotation(rig.forearmR, 'x', 0.5 + attack.windup * 0.26, alpha);
    dampRotation(rig.upperArmL, 'x', -0.46 - attack.strike * 0.42, alpha);
    dampRotation(rig.upperArmL, 'y', -0.28, alpha);
    dampRotation(rig.forearmL, 'x', 0.4 + attack.strike * 0.38, alpha);
    return;
  }
  if (style === 'mace-book') {
    dampRotation(rig.upperArmL, 'x', -0.34, alpha);
    dampRotation(rig.forearmL, 'x', 0.72, alpha);
    dampRotation(rig.upperArmR, 'x', attack.windup * 0.88 - attack.strike * 1.18, alpha);
    dampRotation(rig.forearmR, 'x', 0.32 + attack.windup * 0.42, alpha);
    return;
  }
  if (style === 'axe-shield') {
    dampRotation(rig.upperArmL, 'x', -0.22 - attack.strike * 0.12, alpha);
    dampRotation(rig.upperArmL, 'y', -0.34, alpha);
    dampRotation(rig.forearmL, 'x', 0.62, alpha);
    dampRotation(rig.upperArmR, 'x', 0.92 * attack.windup - 1.32 * attack.strike, alpha);
    dampRotation(rig.upperArmR, 'y', -0.22 * attack.windup + 0.3 * attack.strike, alpha);
    dampRotation(rig.forearmR, 'x', 0.36 + attack.windup * 0.44, alpha);
    dampRotation(rig.chest, 'y', -0.22 * attack.windup + 0.38 * attack.strike, alpha);
    dampRotation(rig.spine, 'x', 0.07 - attack.windup * 0.1 + attack.strike * 0.18, alpha);
    return;
  }
  if (style === 'heavy-club') {
    dampRotation(rig.upperArmR, 'x', 0.72 * attack.windup - 1.35 * attack.strike, alpha);
    dampRotation(rig.upperArmL, 'x', 0.48 * attack.windup - 0.9 * attack.strike, alpha);
    dampRotation(rig.forearmR, 'x', 0.58 + attack.windup * 0.38, alpha);
    dampRotation(rig.forearmL, 'x', 0.5 + attack.windup * 0.3, alpha);
    dampRotation(rig.chest, 'x', 0.08 - attack.windup * 0.16 + attack.strike * 0.28, alpha);
  }
}

function animatePresentation(mesh, agent, time, effects, attack, style, alpha) {
  const presentation = mesh.userData.presentation;
  if (!presentation) return;
  const moving = Boolean(agent.travel) && !agent.corpse;
  const pace = agent.role === 'orc' ? 6 : agent.role === 'ogre' ? 5.2 : agent.role === 'goblin' || agent.role === 'kobold' ? 9.1 : 7.5;
  const gait = Math.sin(time * (moving ? pace : 1.5) + presentation.seed * Math.PI * 2);
  const hit = effects.some(effect => effect.agentId === agent.id && ['attack', 'siege-hit'].includes(effect.type));
  const heal = effects.some(effect => effect.agentId === agent.id && effect.type === 'heal');
  const lift = agent.role === 'stirge' || agent.role === 'wraith' ? 0.6 : moving ? 0.08 : 0;

  if (presentation.shadow) {
    const spread = 1 - lift * 0.22 + (hit ? 0.1 : 0);
    dampScale(presentation.shadow, spread, spread, spread, alpha);
    const corpseFade = agent.corpse ? Math.max(0.08, 1 - corpseProgress(agent, time) * 0.92) : 1;
    presentation.shadow.material.opacity += ((presentation.baseShadowOpacity * (1 - lift * 0.45) * corpseFade) - presentation.shadow.material.opacity) * alpha;
  }

  if (presentation.cape) {
    dampRotation(presentation.cape, 'x', 0.08 + (moving ? 0.18 : 0.04) + gait * 0.06 - attack.strike * 0.1, alpha);
    dampRotation(presentation.cape, 'z', gait * 0.035, alpha);
  }
  if (presentation.quiver) dampRotation(presentation.quiver, 'z', gait * 0.045 + attack.strike * 0.03, alpha);
  if (presentation.spellbook) dampRotation(presentation.spellbook, 'y', gait * 0.04 + (heal ? 0.12 : 0), alpha);
  if (presentation.relicPack) dampRotation(presentation.relicPack, 'z', gait * 0.035, alpha);
  if (presentation.hood) dampRotation(presentation.hood, 'z', gait * 0.018, alpha);
  if (presentation.wizardHat) dampRotation(presentation.wizardHat, 'z', -0.04 + gait * 0.025, alpha);
  if (presentation.topknot) dampRotation(presentation.topknot, 'z', 0.12 + gait * 0.08 - attack.strike * 0.06, alpha);
  if (presentation.arrow) presentation.arrow.visible = !(style === 'bow' && attack.strike > 0.16 && attack.strike < 0.92);

  if (agent.corpse) return;
  const downed = Boolean(agent.downed) || agent.mood === 'downed';
  const fallDirection = presentation.seed > 0.5 ? 1 : -1;
  dampRotation(mesh, 'z', downed ? fallDirection * 1.05 : 0, alpha);
  dampRotation(mesh, 'x', downed ? -0.16 : 0, alpha);
  dampPosition(mesh, 'y', downed ? -0.18 : 0, alpha);
}

function animateSpider(parts, agent, time, attack, alpha) {
  const pace = agent.travel ? 10.5 : 2.1;
  const bodyPulse = Math.sin(time * pace * 2);
  dampPosition(parts.root, 'y', 0.01 + bodyPulse * (agent.travel ? 0.025 : 0.008) - attack.windup * 0.025 + attack.strike * 0.045, alpha);
  dampPosition(parts.root, 'z', attack.windup * -0.08 + attack.strike * 0.18, alpha);
  for (const leg of parts.legs) {
    const phase = time * pace + leg.index * Math.PI / 2 + (leg.side < 0 ? Math.PI : 0);
    const stride = agent.travel ? Math.sin(phase) * 0.42 : Math.sin(phase * 0.35) * 0.04;
    const frontLunge = leg.index < 2 ? attack.strike * 0.34 : 0;
    dampRotation(leg.hip, 'x', stride - attack.windup * 0.12 + frontLunge, alpha);
    dampRotation(leg.hip, 'z', leg.side * (0.2 + Math.cos(phase) * 0.08 - attack.strike * 0.05), alpha);
    dampRotation(leg.knee, 'x', Math.max(0, -stride) * 0.55 + attack.windup * 0.12, alpha);
  }
  parts.fangs.forEach((fang, index) => dampRotation(fang, 'x', attack.strike * 0.62 + Math.sin(time * 3 + index) * 0.05, alpha));
  dampScale(parts.abdomen, 1.08 + attack.windup * 0.05, 0.72 - attack.strike * 0.08, 1.2 + attack.strike * 0.12, alpha);
}

function animateWraith(parts, agent, time, attack, alpha) {
  const travel = agent.travel ? 1 : 0;
  const float = Math.sin(time * (travel ? 2.6 : 1.8)) * (travel ? 0.12 : 0.08);
  dampPosition(parts.root, 'y', 0.08 + float + attack.windup * 0.08 - attack.strike * 0.04, alpha);
  dampPosition(parts.root, 'z', travel * 0.08 + attack.strike * 0.24, alpha);
  dampRotation(parts.root, 'y', Math.sin(time * 0.42) * 0.08 + attack.strike * 0.12, alpha);
  parts.arms.forEach((arm, index) => {
    const side = index === 0 ? -1 : 1;
    dampRotation(arm, 'x', -0.28 - attack.windup * 0.22 - attack.strike * 0.72, alpha);
    dampRotation(arm, 'z', side * (0.28 + Math.sin(time * 1.5 + index) * 0.12 + attack.strike * 0.16), alpha);
  });
  parts.tatters.forEach((tatter, index) => {
    dampRotation(tatter, 'z', Math.sin(time * (travel ? 3.1 : 2) + index * 0.8) * (travel ? 0.26 : 0.18), alpha);
    dampRotation(tatter, 'x', Math.cos(time * 1.6 + index) * 0.12 - travel * 0.14, alpha);
  });
  dampScale(parts.face, 0.72 + attack.strike * 0.22, 1 + attack.windup * 0.08 + attack.strike * 0.12, 0.45, alpha);
}

function animateMyconid(parts, agent, time, attack, alpha) {
  const sway = Math.sin(time * (agent.travel ? 4.2 : 1.2));
  dampRotation(parts.root, 'z', sway * (agent.travel ? 0.08 : 0.025), alpha);
  dampPosition(parts.root, 'y', agent.travel ? Math.abs(Math.sin(time * 4.2)) * 0.025 : 0, alpha);
  dampRotation(parts.cap, 'y', sway * 0.08 + attack.strike * 0.16, alpha);
  dampRotation(parts.cap, 'x', attack.windup * -0.12 + attack.strike * 0.24, alpha);
  parts.arms.forEach((arm, index) => {
    const side = index === 0 ? -1 : 1;
    dampRotation(arm, 'x', -0.18 - attack.windup * 0.22 - attack.strike * 0.42, alpha);
    dampRotation(arm, 'z', side * (0.24 + attack.strike * 0.18), alpha);
  });
  parts.sprouts.forEach((sprout, index) => dampRotation(sprout, 'z', Math.sin(time * 2.2 + index) * 0.12 + attack.strike * 0.06, alpha));
  dampScale(parts.sporeSac, 0.8 + attack.windup * 0.15, 1.18 + attack.windup * 0.25 - attack.strike * 0.18, 0.72 + attack.strike * 0.12, alpha);
}

function animateStirge(parts, agent, time, attack, alpha) {
  const speed = agent.travel ? 18 : 11;
  const flap = Math.sin(time * speed);
  dampPosition(parts.root, 'y', 0.08 + Math.sin(time * 3.4) * 0.06 + attack.windup * 0.08 - attack.strike * 0.06, alpha);
  dampPosition(parts.root, 'z', attack.windup * -0.1 + attack.strike * 0.28, alpha);
  parts.wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1;
    const attackFold = attack.strike * 0.42;
    dampRotation(wing, 'z', side * (0.3 + flap * 0.62 - attackFold), alpha);
    dampRotation(wing, 'x', flap * 0.12 + attack.windup * 0.18, alpha);
  });
  dampRotation(parts.root, 'x', agent.travel ? -0.18 - attack.strike * 0.28 : -attack.strike * 0.22, alpha);
  dampScale(parts.proboscis, 1, 1 + attack.strike * 0.72, 1, alpha);
}

function dampRotation(node, axis, target, alpha) { if (node) node.rotation[axis] += (target - node.rotation[axis]) * alpha; }
function dampPosition(node, axis, target, alpha) { if (node) node.position[axis] += (target - node.position[axis]) * alpha; }
function dampScale(node, x, y, z, alpha) {
  if (!node) return;
  node.scale.x += (x - node.scale.x) * alpha;
  node.scale.y += (y - node.scale.y) * alpha;
  node.scale.z += (z - node.scale.z) * alpha;
}
