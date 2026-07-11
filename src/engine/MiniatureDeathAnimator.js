import { clamp01, smoothstep } from './MiniatureAnimationTiming.js';

export function applyMiniatureDeathPose(mesh, agent, time, alpha) {
  if (!mesh || !agent?.corpse) return false;

  const model = mesh.getObjectByName('miniature-model');
  if (!model) return false;

  const progress = corpseProgress(agent, time);
  const collapse = smoothstep(Math.min(1, progress / 0.38));
  const settle = smoothstep(Math.max(0, (progress - 0.18) / 0.82));
  const direction = (mesh.userData.animationSeed ?? 0) >= 0.5 ? 1 : -1;
  const rig = mesh.userData.rig;
  const parts = model.userData.creatureParts ?? {};

  if (rig) {
    if (agent.role === 'skeleton') animateSkeletonDeath(model, rig, collapse, settle, direction, alpha);
    else animateHumanoidDeath(model, rig, collapse, settle, direction, alpha, agent.role);
    return true;
  }

  if (agent.role === 'slime') animateSlimeDeath(model, parts, collapse, settle, alpha);
  else if (agent.role === 'mimic') animateMimicDeath(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'arachnid') animateSpiderDeath(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'spectral') animateWraithDeath(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'fungal') animateMyconidDeath(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'flying') animateStirgeDeath(model, parts, collapse, settle, direction, alpha);
  else animateGenericDeath(model, collapse, settle, direction, alpha);

  return true;
}

export function corpseProgress(agent, time) {
  if (!agent?.corpse || agent.deathAt === undefined || agent.deathAt === null) return 0;
  return clamp01((time - agent.deathAt) / Math.max(0.01, agent.corpseLinger ?? 2.4));
}

function animateHumanoidDeath(model, rig, collapse, settle, direction, alpha, role) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  const heavy = role === 'orc' || role === 'ogre';
  const kneeDepth = heavy ? 0.72 : 0.58;
  const fallAngle = heavy ? 1.18 : 1.32;

  dampRotation(rig.thighL, 'x', -0.34 + collapse * 0.82, alpha);
  dampRotation(rig.thighR, 'x', 0.22 + collapse * 0.64, alpha);
  dampRotation(rig.shinL, 'x', collapse * kneeDepth, alpha);
  dampRotation(rig.shinR, 'x', collapse * kneeDepth * 0.88, alpha);
  dampRotation(rig.upperArmL, 'x', 0.28 + settle * 0.52, alpha);
  dampRotation(rig.upperArmR, 'x', -0.18 + settle * 0.66, alpha);
  dampRotation(rig.forearmL, 'x', 0.36 + settle * 0.44, alpha);
  dampRotation(rig.forearmR, 'x', 0.28 + settle * 0.52, alpha);
  dampRotation(rig.spine, 'x', collapse * 0.42 + settle * 0.16, alpha);
  dampRotation(rig.chest, 'y', direction * settle * 0.22, alpha);
  dampRotation(rig.head, 'x', settle * 0.18, alpha);
  dampPosition(rig.pelvis, 'y', (rig.pelvis.userData.restY ?? rig.pelvis.position.y) - collapse * 0.24, alpha);

  dampRotation(model, 'z', direction * fallAngle * settle, alpha);
  dampRotation(model, 'x', -0.12 - settle * 0.16, alpha);
  dampPosition(model, 'y', -collapse * 0.12 - settle * 0.08, alpha);
  dampScale(model, baseScale * (1 - settle * 0.035), baseScale * (1 - settle * 0.04), baseScale, alpha);
}

function animateSkeletonDeath(model, rig, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampRotation(rig.spine, 'x', collapse * 0.68, alpha);
  dampRotation(rig.chest, 'z', direction * collapse * 0.28, alpha);
  dampRotation(rig.head, 'z', -direction * settle * 0.52, alpha);
  dampRotation(rig.upperArmL, 'z', -0.7 - settle * 0.58, alpha);
  dampRotation(rig.upperArmR, 'z', 0.7 + settle * 0.58, alpha);
  dampRotation(rig.forearmL, 'x', 0.8 + settle * 0.6, alpha);
  dampRotation(rig.forearmR, 'x', 0.7 + settle * 0.72, alpha);
  dampRotation(rig.thighL, 'z', -0.34 - settle * 0.38, alpha);
  dampRotation(rig.thighR, 'z', 0.34 + settle * 0.38, alpha);
  dampRotation(rig.shinL, 'x', 0.7 + collapse * 0.55, alpha);
  dampRotation(rig.shinR, 'x', 0.62 + collapse * 0.62, alpha);
  if (rig.jaw) dampRotation(rig.jaw, 'x', 0.68, alpha);

  dampRotation(model, 'z', direction * 0.92 * settle, alpha);
  dampRotation(model, 'x', -0.26 - settle * 0.2, alpha);
  dampPosition(model, 'y', -collapse * 0.18 - settle * 0.08, alpha);
  dampScale(model, baseScale * (1 - settle * 0.08), baseScale * (1 - settle * 0.12), baseScale, alpha);
}

function animateSlimeDeath(model, parts, collapse, settle, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampRotation(model, 'z', 0, alpha);
  dampPosition(model, 'y', -0.1 - settle * 0.12, alpha);
  dampScale(
    model,
    baseScale * (1 + settle * 0.58),
    baseScale * (1 - collapse * 0.72),
    baseScale * (1 + settle * 0.48),
    alpha
  );
  dampPosition(parts.body, 'y', -settle * 0.12, alpha);
  dampScale(parts.skirt, 1 + settle * 0.52, 0.62 + (1 - settle) * 0.38, 1 + settle * 0.52, alpha);
  dampPosition(parts.core, 'y', 0.5 - settle * 0.38, alpha);
  dampScale(parts.core, 1 - settle * 0.42, 1 - settle * 0.42, 1 - settle * 0.42, alpha);
}

function animateMimicDeath(model, parts, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampRotation(parts.lidPivot, 'x', -0.95 - settle * 0.32, alpha);
  dampPosition(parts.jaw, 'z', 0.44 + settle * 0.18, alpha);
  dampRotation(parts.tongue, 'x', Math.PI / 2 + settle * 0.42, alpha);
  dampScale(parts.tongue, 1, 1 + settle * 0.38, 1, alpha);
  for (let index = 0; index < (parts.legs?.length ?? 0); index += 1) {
    const leg = parts.legs[index];
    const side = index % 2 === 0 ? -1 : 1;
    dampRotation(leg, 'z', side * (0.68 + settle * 0.52), alpha);
    dampRotation(leg, 'x', (index < 2 ? -1 : 1) * (0.34 + settle * 0.46), alpha);
  }
  dampRotation(model, 'z', direction * settle * 0.34, alpha);
  dampPosition(model, 'y', -collapse * 0.08, alpha);
  dampScale(model, baseScale * (1 + settle * 0.04), baseScale * (1 - settle * 0.08), baseScale, alpha);
}

function animateSpiderDeath(model, parts, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  for (const leg of parts.legs ?? []) {
    const curl = 0.52 + settle * 0.92;
    dampRotation(leg.hip, 'x', curl + leg.index * 0.04, alpha);
    dampRotation(leg.hip, 'z', leg.side * (0.42 + settle * 0.5), alpha);
    dampRotation(leg.knee, 'x', 0.72 + settle * 0.68, alpha);
  }
  for (const fang of parts.fangs ?? []) dampRotation(fang, 'x', 0.64 + settle * 0.26, alpha);
  dampPosition(parts.root, 'y', 0.01 - collapse * 0.26, alpha);
  dampRotation(parts.root, 'z', direction * settle * 0.26, alpha);
  dampScale(parts.abdomen, 1.08 + settle * 0.12, 0.72 - collapse * 0.24, 1.2 + settle * 0.08, alpha);
  dampScale(model, baseScale, baseScale * (1 - settle * 0.18), baseScale, alpha);
}

function animateWraithDeath(model, parts, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampPosition(parts.root, 'y', 0.08 + settle * 0.92, alpha);
  dampRotation(parts.root, 'y', direction * settle * 0.7, alpha);
  for (let index = 0; index < (parts.arms?.length ?? 0); index += 1) {
    const side = index === 0 ? -1 : 1;
    dampRotation(parts.arms[index], 'x', -0.4 - settle * 0.72, alpha);
    dampRotation(parts.arms[index], 'z', side * (0.3 + settle * 0.5), alpha);
  }
  for (let index = 0; index < (parts.tatters?.length ?? 0); index += 1) {
    const side = index - ((parts.tatters.length - 1) / 2);
    dampRotation(parts.tatters[index], 'z', side * 0.16 + direction * settle * 0.3, alpha);
    dampRotation(parts.tatters[index], 'x', -settle * 0.72, alpha);
  }
  dampScale(parts.face, 0.72 * (1 - settle * 0.82), 1 + collapse * 0.24, 0.45 * (1 - settle * 0.78), alpha);
  dampScale(model, baseScale * (1 - settle * 0.34), baseScale * (1 + collapse * 0.22 - settle * 0.5), baseScale * (1 - settle * 0.34), alpha);
}

function animateMyconidDeath(model, parts, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampRotation(parts.cap, 'x', direction * settle * 0.84, alpha);
  dampRotation(parts.cap, 'z', direction * settle * 0.28, alpha);
  for (let index = 0; index < (parts.arms?.length ?? 0); index += 1) {
    const side = index === 0 ? -1 : 1;
    dampRotation(parts.arms[index], 'x', 0.52 + settle * 0.66, alpha);
    dampRotation(parts.arms[index], 'z', side * (0.22 + settle * 0.22), alpha);
  }
  for (const sprout of parts.sprouts ?? []) dampRotation(sprout, 'z', direction * settle * 0.56, alpha);
  const sporePulse = Math.sin(Math.min(1, collapse) * Math.PI);
  dampScale(parts.sporeSac, 0.8 + sporePulse * 0.42, 1.18 + sporePulse * 0.7 - settle * 0.58, 0.72 + sporePulse * 0.32, alpha);
  dampRotation(model, 'z', direction * settle * 0.64, alpha);
  dampPosition(model, 'y', -collapse * 0.16, alpha);
  dampScale(model, baseScale * (1 + settle * 0.04), baseScale * (1 - settle * 0.16), baseScale, alpha);
}

function animateStirgeDeath(model, parts, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampPosition(parts.root, 'y', 0.08 - collapse * 0.7, alpha);
  dampRotation(parts.root, 'x', 0.4 + settle * 0.9, alpha);
  dampRotation(parts.root, 'z', direction * settle * 5.2, alpha);
  for (let index = 0; index < (parts.wings?.length ?? 0); index += 1) {
    const side = index === 0 ? -1 : 1;
    dampRotation(parts.wings[index], 'z', side * (0.12 + (1 - settle) * 0.2), alpha);
    dampRotation(parts.wings[index], 'x', settle * 0.86, alpha);
  }
  dampScale(parts.proboscis, 1, 1 - settle * 0.48, 1, alpha);
  dampScale(model, baseScale * (1 - settle * 0.12), baseScale * (1 - settle * 0.12), baseScale * (1 - settle * 0.12), alpha);
}

function animateGenericDeath(model, collapse, settle, direction, alpha) {
  const baseScale = model.userData.baseScale ?? model.scale.x;
  dampRotation(model, 'z', direction * settle * 1.15, alpha);
  dampRotation(model, 'x', -collapse * 0.24, alpha);
  dampPosition(model, 'y', -collapse * 0.18, alpha);
  dampScale(model, baseScale * (1 - settle * 0.08), baseScale * (1 - settle * 0.08), baseScale * (1 - settle * 0.08), alpha);
}

function dampRotation(node, axis, target, alpha) {
  if (node) node.rotation[axis] += (target - node.rotation[axis]) * alpha;
}

function dampPosition(node, axis, target, alpha) {
  if (node) node.position[axis] += (target - node.position[axis]) * alpha;
}

function dampScale(node, x, y, z, alpha) {
  if (!node) return;
  node.scale.x += (x - node.scale.x) * alpha;
  node.scale.y += (y - node.scale.y) * alpha;
  node.scale.z += (z - node.scale.z) * alpha;
}
