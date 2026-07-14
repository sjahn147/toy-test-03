import { THREE } from '../ThreeScene.js';
import { ensureAdventurerProfile, isStandardAdventurer } from '../../adventurers/AdventurerProfile.js';

const EULER = new THREE.Euler();
const QUATERNION = new THREE.Quaternion();

export function animateModernAdventurer(root, agent, time = 0) {
  if (!root?.userData?.modernAdventurer || !isStandardAdventurer(agent)) return false;
  ensureAdventurerProfile(agent);
  const rigs = root.userData.adventurerRigs ?? [];
  const seed = root.userData.animationSeed ?? 0;
  const moving = Boolean(agent.travel);
  const injured = (agent.hp ?? 1) / Math.max(1, agent.maxHp ?? 1) < 0.36;
  const phase = time * movementFrequency(agent) + seed * Math.PI * 2;

  for (const rig of rigs) {
    resetRig(rig);
    applyLocomotion(rig, agent, phase, moving, injured);
    applyRolePose(rig, agent, phase, moving);
    applyActionPose(rig, agent, phase);
    applySecondaryMotion(rig, agent, phase, moving);
    rig.rootBone.updateMatrixWorld(true);
  }

  const hp = root.getObjectByName('hp');
  if (hp) hp.scale.x = Math.max(0.04, (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? 1));
  const ring = root.getObjectByName('adventurer-selection-ring');
  if (ring) {
    ring.material.opacity = agent.combat ? 0.95 : 0.72;
    ring.scale.setScalar(agent.combat ? 1.05 + Math.sin(time * 7) * 0.04 : 1);
  }
  const aura = root.getObjectByName('renowned-aura');
  if (aura) {
    aura.rotation.z = time * 0.35;
    aura.material.opacity = 0.48 + Math.sin(time * 2.6 + seed * 5) * 0.14;
  }
  return true;
}

function resetRig(rig) {
  for (const [name, transform] of rig.rest.entries()) {
    const bone = rig.byName[name];
    if (!bone) continue;
    bone.position.copy(transform.position);
    bone.quaternion.copy(transform.quaternion);
    bone.scale.copy(transform.scale);
  }
}

function applyLocomotion(rig, agent, phase, moving, injured) {
  const stride = moving ? Math.sin(phase) : 0;
  const stride2 = moving ? Math.sin(phase + Math.PI) : 0;
  const weight = agent.bodyBuild === 'heavy' || agent.bodyBuild === 'broad' ? 0.78 : agent.bodyBuild === 'lean' ? 1.08 : 1;
  const speed = moving ? 1 : 0;

  rotateLocal(rig.byName['thigh.L'], 'x', stride * 0.52 * weight);
  rotateLocal(rig.byName['thigh.R'], 'x', stride2 * 0.52 * weight);
  rotateLocal(rig.byName['shin.L'], 'x', Math.max(0, -stride) * 0.6 * speed);
  rotateLocal(rig.byName['shin.R'], 'x', Math.max(0, -stride2) * 0.6 * speed);
  rotateLocal(rig.byName['foot.L'], 'x', -Math.max(0, stride) * 0.18 * speed);
  rotateLocal(rig.byName['foot.R'], 'x', -Math.max(0, stride2) * 0.18 * speed);

  const armAmplitude = rig.role === 'fighter' ? 0.18 : rig.role === 'wizard' ? 0.12 : 0.3;
  rotateLocal(rig.byName['upper_arm.L'], 'x', -stride * armAmplitude);
  rotateLocal(rig.byName['upper_arm.R'], 'x', stride * armAmplitude);

  if (moving) {
    rig.byName.pelvis.position.y += Math.abs(Math.sin(phase * 2)) * 0.018;
    rig.byName.chest.rotation.y += stride * 0.035;
  }
  if (injured) {
    rig.byName.chest.rotation.z += 0.08;
    rig.byName.neck.rotation.z -= 0.04;
    rig.byName.pelvis.rotation.x += 0.06;
  }
}

function applyRolePose(rig, agent, phase, moving) {
  if (rig.role === 'fighter') {
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.35);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.55);
    rotateLocal(rig.byName['upper_arm.R'], 'z', 0.18);
    rotateLocal(rig.byName['forearm.R'], 'x', -0.18);
    if (!moving) rig.byName.chest.rotation.y -= 0.05;
  } else if (rig.role === 'rogue') {
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.18);
    rotateLocal(rig.byName['upper_arm.R'], 'z', 0.18);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.36);
    rotateLocal(rig.byName['forearm.R'], 'x', -0.36);
    rig.byName.pelvis.rotation.x -= 0.05;
    rig.byName.chest.rotation.x += 0.08;
  } else if (rig.role === 'cleric') {
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.14);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.52);
    rotateLocal(rig.byName['upper_arm.R'], 'z', 0.12);
    rig.byName.chest.rotation.x -= 0.025;
  } else if (rig.role === 'wizard') {
    rotateLocal(rig.byName['upper_arm.R'], 'z', 0.12);
    rotateLocal(rig.byName['forearm.R'], 'x', -0.42);
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.24);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.7);
    rig.byName.chest.rotation.x -= 0.04;
  } else if (rig.role === 'archer') {
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.32);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.48);
    rotateLocal(rig.byName['upper_arm.R'], 'z', 0.22);
    rotateLocal(rig.byName['forearm.R'], 'x', -0.62);
    rig.byName.chest.rotation.y -= 0.1;
  }

  if (!moving) {
    rig.byName.head.rotation.y += Math.sin(phase * 0.18) * 0.1;
    rig.byName.chest.scale.y *= 1 + Math.sin(phase * 0.45) * 0.012;
  }
}

function applyActionPose(rig, agent, phase) {
  const combat = agent.combat;
  const ability = agent.adventurerAbilityCast;
  if (ability) {
    const progress = clamp(ability.elapsed / Math.max(0.001, ability.duration), 0, 1);
    const lift = Math.sin(progress * Math.PI);
    rotateLocal(rig.byName['upper_arm.R'], 'x', -lift * 1.1);
    rotateLocal(rig.byName['upper_arm.L'], 'x', -lift * 0.72);
    rig.byName.chest.rotation.y += Math.sin(progress * Math.PI * 2) * 0.18;
    return;
  }
  if (!combat) return;
  const progress = clamp(combat.progress ?? 0, 0, 1);
  const phaseName = combat.phase ?? 'windup';
  if (phaseName === 'windup') {
    rotateLocal(rig.byName['upper_arm.R'], 'x', -progress * 1.05);
    rotateLocal(rig.byName['forearm.R'], 'x', -progress * 0.45);
    rig.byName.chest.rotation.y -= progress * 0.28;
  } else if (phaseName === 'impact') {
    rotateLocal(rig.byName['upper_arm.R'], 'x', 0.72);
    rig.byName.chest.rotation.y += 0.36;
  } else {
    rotateLocal(rig.byName['upper_arm.R'], 'x', (1 - progress) * 0.34);
  }

  if (rig.role === 'fighter' && agent.adventurerGuard?.remaining > 0) {
    rotateLocal(rig.byName['upper_arm.L'], 'x', -0.9);
    rotateLocal(rig.byName['forearm.L'], 'x', -0.45);
    rotateLocal(rig.byName['upper_arm.L'], 'z', -0.52);
  }
  if (rig.role === 'archer') applyBowDraw(rig, progress);
}

function applyBowDraw(rig, progress) {
  const draw = Math.sin(clamp(progress, 0, 1) * Math.PI);
  rotateLocal(rig.byName['upper_arm.L'], 'x', -0.3 * draw);
  rotateLocal(rig.byName['upper_arm.L'], 'z', -0.92 * draw);
  rotateLocal(rig.byName['forearm.L'], 'x', -0.3 * draw);
  rotateLocal(rig.byName['upper_arm.R'], 'z', 1.0 * draw);
  rotateLocal(rig.byName['forearm.R'], 'x', -1.15 * draw);
  rig.byName.chest.rotation.y -= draw * 0.28;
}

function applySecondaryMotion(rig, agent, phase, moving) {
  const cape = rig.byName.cape_root;
  const capeTip = rig.byName.cape_tip;
  if (cape) cape.rotation.x += moving ? 0.12 + Math.sin(phase * 0.55) * 0.05 : Math.sin(phase * 0.25) * 0.025;
  if (capeTip) capeTip.rotation.x += moving ? 0.22 + Math.sin(phase * 0.72 + 0.4) * 0.08 : Math.sin(phase * 0.3) * 0.04;
  if (agent.mood === 'afraid' || agent.mood === 'retreating') {
    rig.byName.head.rotation.z += Math.sin(phase * 3.4) * 0.04;
    rig.byName.chest.rotation.x += 0.08;
  }
}

function rotateLocal(bone, axis, amount) {
  if (!bone || !Number.isFinite(amount)) return;
  EULER.set(0, 0, 0, 'XYZ');
  EULER[axis] = amount;
  QUATERNION.setFromEuler(EULER);
  bone.quaternion.multiply(QUATERNION);
}

function movementFrequency(agent) {
  if (agent.bodyBuild === 'heavy' || agent.bodyBuild === 'broad') return 3.2;
  if (agent.role === 'rogue' || agent.role === 'archer') return 4.6;
  return 3.9;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
