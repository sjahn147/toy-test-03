import { corpseProgress, smoothstep } from './MiniatureAnimationTiming.js';

export function applyMiniatureDeathPose(mesh, agent, time, alpha) {
  if (!mesh || !agent?.corpse) return false;
  const model = mesh.getObjectByName('miniature-model');
  if (!model) return false;
  const progress = corpseProgress(agent, time);
  const collapse = smoothstep(progress / 0.38);
  const settle = smoothstep((progress - 0.18) / 0.82);
  const direction = (mesh.userData.animationSeed ?? 0) >= 0.5 ? 1 : -1;
  const rig = mesh.userData.rig;
  const parts = model.userData.creatureParts ?? {};

  if (rig) {
    if (agent.role === 'skeleton') skeleton(model, rig, collapse, settle, direction, alpha);
    else humanoid(model, rig, collapse, settle, direction, alpha, agent.role);
  } else if (agent.role === 'slime') slime(model, parts, collapse, settle, alpha);
  else if (agent.role === 'mimic') mimic(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'arachnid') spider(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'spectral') wraith(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'fungal') myconid(model, parts, collapse, settle, direction, alpha);
  else if (parts.type === 'flying') stirge(model, parts, collapse, settle, direction, alpha);
  else generic(model, collapse, settle, direction, alpha);
  return true;
}

function humanoid(model, rig, collapse, settle, direction, alpha, role) {
  const heavy = role === 'orc' || role === 'ogre';
  rot(rig.thighL, 'x', -0.3 + collapse * 0.8, alpha);
  rot(rig.thighR, 'x', 0.2 + collapse * 0.62, alpha);
  rot(rig.shinL, 'x', collapse * (heavy ? 0.72 : 0.58), alpha);
  rot(rig.shinR, 'x', collapse * 0.54, alpha);
  rot(rig.spine, 'x', collapse * 0.42, alpha);
  rot(rig.chest, 'y', direction * settle * 0.22, alpha);
  rot(rig.upperArmL, 'x', settle * 0.7, alpha);
  rot(rig.upperArmR, 'x', settle * 0.55, alpha);
  rot(model, 'z', direction * settle * (heavy ? 1.18 : 1.32), alpha);
  rot(model, 'x', -0.12 - settle * 0.16, alpha);
  pos(model, 'y', -collapse * 0.12 - settle * 0.08, alpha);
}

function skeleton(model, rig, collapse, settle, direction, alpha) {
  rot(rig.spine, 'x', collapse * 0.68, alpha);
  rot(rig.head, 'z', -direction * settle * 0.52, alpha);
  rot(rig.upperArmL, 'z', -0.7 - settle * 0.58, alpha);
  rot(rig.upperArmR, 'z', 0.7 + settle * 0.58, alpha);
  rot(rig.thighL, 'z', -0.34 - settle * 0.38, alpha);
  rot(rig.thighR, 'z', 0.34 + settle * 0.38, alpha);
  rot(rig.shinL, 'x', 0.7 + collapse * 0.55, alpha);
  rot(rig.shinR, 'x', 0.62 + collapse * 0.62, alpha);
  if (rig.jaw) rot(rig.jaw, 'x', 0.68, alpha);
  rot(model, 'z', direction * 0.92 * settle, alpha);
  pos(model, 'y', -collapse * 0.2, alpha);
}

function slime(model, parts, collapse, settle, alpha) {
  scaleRelative(model, 1 + settle * 0.58, 1 - collapse * 0.72, 1 + settle * 0.48, alpha);
  pos(model, 'y', -0.1 - settle * 0.12, alpha);
  scale(parts.skirt, 1 + settle * 0.52, 0.62, 1 + settle * 0.52, alpha);
  scale(parts.core, 1 - settle * 0.5, 1 - settle * 0.5, 1 - settle * 0.5, alpha);
}

function mimic(model, parts, collapse, settle, direction, alpha) {
  rot(parts.lidPivot, 'x', -0.95 - settle * 0.32, alpha);
  pos(parts.jaw, 'z', 0.44 + settle * 0.18, alpha);
  for (let index = 0; index < (parts.legs?.length ?? 0); index += 1) {
    rot(parts.legs[index], 'z', (index % 2 ? 1 : -1) * (0.68 + settle * 0.52), alpha);
  }
  rot(model, 'z', direction * settle * 0.34, alpha);
  pos(model, 'y', -collapse * 0.08, alpha);
}

function spider(model, parts, collapse, settle, direction, alpha) {
  for (const leg of parts.legs ?? []) {
    rot(leg.hip, 'x', 0.52 + settle * 0.92, alpha);
    rot(leg.hip, 'z', leg.side * (0.42 + settle * 0.5), alpha);
    rot(leg.knee, 'x', 0.72 + settle * 0.68, alpha);
  }
  pos(parts.root, 'y', 0.01 - collapse * 0.26, alpha);
  rot(parts.root, 'z', direction * settle * 0.26, alpha);
  scaleRelative(model, 1, 1 - settle * 0.18, 1, alpha);
}

function wraith(model, parts, collapse, settle, direction, alpha) {
  pos(parts.root, 'y', 0.08 + settle * 0.92, alpha);
  rot(parts.root, 'y', direction * settle * 0.7, alpha);
  scale(parts.face, 0.72 * (1 - settle * 0.82), 1 + collapse * 0.24, 0.45 * (1 - settle * 0.78), alpha);
  scaleRelative(model, 1 - settle * 0.34, 1 + collapse * 0.22 - settle * 0.5, 1 - settle * 0.34, alpha);
}

function myconid(model, parts, collapse, settle, direction, alpha) {
  rot(parts.cap, 'x', direction * settle * 0.84, alpha);
  rot(parts.cap, 'z', direction * settle * 0.28, alpha);
  const pulse = Math.sin(collapse * Math.PI);
  scale(parts.sporeSac, 0.8 + pulse * 0.42, 1.18 + pulse * 0.7 - settle * 0.58, 0.72 + pulse * 0.32, alpha);
  rot(model, 'z', direction * settle * 0.64, alpha);
  pos(model, 'y', -collapse * 0.16, alpha);
}

function stirge(model, parts, collapse, settle, direction, alpha) {
  pos(parts.root, 'y', 0.08 - collapse * 0.7, alpha);
  rot(parts.root, 'x', 0.4 + settle * 0.9, alpha);
  rot(parts.root, 'z', direction * settle * 5.2, alpha);
  for (const wing of parts.wings ?? []) rot(wing, 'x', settle * 0.86, alpha);
  scaleRelative(model, 1 - settle * 0.12, 1 - settle * 0.12, 1 - settle * 0.12, alpha);
}

function generic(model, collapse, settle, direction, alpha) {
  rot(model, 'z', direction * settle * 1.15, alpha);
  pos(model, 'y', -collapse * 0.18, alpha);
}

function rot(node, axis, target, alpha) { if (node) node.rotation[axis] += (target - node.rotation[axis]) * alpha; }
function pos(node, axis, target, alpha) { if (node) node.position[axis] += (target - node.position[axis]) * alpha; }
function scale(node, x, y, z, alpha) {
  if (!node) return;
  node.scale.x += (x - node.scale.x) * alpha;
  node.scale.y += (y - node.scale.y) * alpha;
  node.scale.z += (z - node.scale.z) * alpha;
}
function scaleRelative(node, x, y, z, alpha) {
  if (!node) return;
  const base = node.userData.baseScale ?? node.scale.x;
  scale(node, base * x, base * y, base * z, alpha);
}
