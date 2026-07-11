import { MiniatureAnimator } from './MiniatureAnimator.js';

export class AdvancedMiniatureAnimator extends MiniatureAnimator {
  update(mesh, agent, time, effects = []) {
    super.update(mesh, agent, time, effects);
    const alpha = 0.24;
    const attack = attackTimeline(agent, time, mesh.userData.animationSeed ?? 0);
    const rig = mesh.userData.rig;
    const style = mesh.userData.weaponStyle ?? 'natural';
    if (rig) animateWeaponStyle(rig, style, attack, alpha);
    const model = mesh.getObjectByName('miniature-model');
    const parts = model?.userData?.creatureParts;
    if (!parts) return;
    if (parts.type === 'arachnid') animateSpider(parts, agent, time, attack, alpha);
    if (parts.type === 'spectral') animateWraith(parts, agent, time, attack, alpha);
    if (parts.type === 'fungal') animateMyconid(parts, agent, time, attack, alpha);
    if (parts.type === 'flying') animateStirge(parts, agent, time, attack, alpha);
  }
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
  if (style === 'heavy-club') {
    dampRotation(rig.upperArmR, 'x', 0.72 * attack.windup - 1.35 * attack.strike, alpha);
    dampRotation(rig.upperArmL, 'x', 0.48 * attack.windup - 0.9 * attack.strike, alpha);
    dampRotation(rig.forearmR, 'x', 0.58 + attack.windup * 0.38, alpha);
    dampRotation(rig.forearmL, 'x', 0.5 + attack.windup * 0.3, alpha);
  }
}

function animateSpider(parts, agent, time, attack, alpha) {
  const pace = agent.travel ? 10.5 : 2.1;
  parts.root.position.y = 0.01 + Math.sin(time * pace) * (agent.travel ? 0.025 : 0.008);
  for (const leg of parts.legs) {
    const phase = time * pace + leg.index * Math.PI / 2 + (leg.side < 0 ? Math.PI : 0);
    const stride = agent.travel ? Math.sin(phase) * 0.42 : Math.sin(phase * 0.35) * 0.04;
    dampRotation(leg.hip, 'x', stride + attack.windup * -0.12 + attack.strike * 0.28, alpha);
    dampRotation(leg.hip, 'z', leg.side * (0.2 + Math.cos(phase) * 0.08), alpha);
    dampRotation(leg.knee, 'x', Math.max(0, -stride) * 0.55, alpha);
  }
  parts.fangs.forEach((fang, index) => dampRotation(fang, 'x', attack.strike * 0.5 + Math.sin(time * 3 + index) * 0.05, alpha));
  dampScale(parts.abdomen, 1.08 + attack.windup * 0.05, 0.72 - attack.strike * 0.08, 1.2 + attack.strike * 0.12, alpha);
}

function animateWraith(parts, agent, time, attack, alpha) {
  const float = Math.sin(time * 1.8) * 0.08;
  parts.root.position.y = 0.08 + float;
  parts.root.rotation.y = Math.sin(time * 0.42) * 0.08;
  parts.arms.forEach((arm, index) => {
    const side = index === 0 ? -1 : 1;
    dampRotation(arm, 'x', -0.28 - attack.strike * 0.62, alpha);
    dampRotation(arm, 'z', side * (0.28 + Math.sin(time * 1.5 + index) * 0.12), alpha);
  });
  parts.tatters.forEach((tatter, index) => {
    dampRotation(tatter, 'z', Math.sin(time * 2 + index * 0.8) * 0.18, alpha);
    dampRotation(tatter, 'x', Math.cos(time * 1.6 + index) * 0.12, alpha);
  });
  dampScale(parts.face, 0.72 + attack.strike * 0.18, 1 + attack.windup * 0.08, 0.45, alpha);
}

function animateMyconid(parts, agent, time, attack, alpha) {
  const sway = Math.sin(time * (agent.travel ? 4.2 : 1.2));
  parts.root.rotation.z = sway * (agent.travel ? 0.06 : 0.025);
  dampRotation(parts.cap, 'y', sway * 0.08 + attack.strike * 0.16, alpha);
  parts.arms.forEach((arm, index) => {
    const side = index === 0 ? -1 : 1;
    dampRotation(arm, 'x', -0.18 - attack.windup * 0.22 - attack.strike * 0.42, alpha);
    dampRotation(arm, 'z', side * (0.24 + attack.strike * 0.18), alpha);
  });
  parts.sprouts.forEach((sprout, index) => dampRotation(sprout, 'z', Math.sin(time * 2.2 + index) * 0.12, alpha));
  dampScale(parts.sporeSac, 0.8 + attack.windup * 0.15, 1.18 + attack.windup * 0.25 - attack.strike * 0.18, 0.72 + attack.strike * 0.12, alpha);
}

function animateStirge(parts, agent, time, attack, alpha) {
  const speed = agent.travel ? 18 : 11;
  const flap = Math.sin(time * speed);
  parts.root.position.y = 0.08 + Math.sin(time * 3.4) * 0.06;
  parts.wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1;
    dampRotation(wing, 'z', side * (0.3 + flap * 0.62), alpha);
    dampRotation(wing, 'x', flap * 0.12, alpha);
  });
  dampRotation(parts.root, 'x', agent.travel ? -0.18 : 0, alpha);
  dampScale(parts.proboscis, 1, 1 + attack.strike * 0.65, 1, alpha);
}

function attackTimeline(agent, time, seed) {
  if (!agent.combat) return { active: false, windup: 0, strike: 0, recover: 0 };
  const cycle = ((time + seed * 0.37) % 1 + 1) % 1;
  return {
    active: true,
    windup: cycle < 0.36 ? pulse(cycle / 0.36) : 0,
    strike: cycle >= 0.36 && cycle < 0.53 ? pulse((cycle - 0.36) / 0.17) : 0,
    recover: cycle >= 0.53 ? 1 - smoothstep((cycle - 0.53) / 0.47) : 0
  };
}

function pulse(value) { return Math.sin(Math.max(0, Math.min(1, value)) * Math.PI / 2); }
function smoothstep(value) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
function dampRotation(node, axis, target, alpha) { if (node) node.rotation[axis] += (target - node.rotation[axis]) * alpha; }
function dampScale(node, x, y, z, alpha) {
  if (!node) return;
  node.scale.x += (x - node.scale.x) * alpha;
  node.scale.y += (y - node.scale.y) * alpha;
  node.scale.z += (z - node.scale.z) * alpha;
}
