import { beginAnimationFrame, resolveAttackTimeline, smoothingAlpha } from './MiniatureAnimationTiming.js';

const HIT_EFFECTS = new Set(['attack', 'siege-hit', 'structure-break']);
const HEAL_EFFECTS = new Set(['heal', 'settlement-rehome']);

export class MiniatureAnimator {
  update(mesh, agent, time, effects = []) {
    if (!mesh) return;
    const dt = beginAnimationFrame(mesh, time);
    const alpha = smoothingAlpha(15, dt);
    const seed = mesh.userData.animationSeed ?? hash01(agent.id ?? agent.name ?? agent.role);
    const rig = mesh.userData.rig;
    const localEffects = effects.filter(effect => effect.agentId === agent.id);

    if (!rig) {
      this.animateCreatureFallback(mesh, agent, time, seed, dt, alpha, localEffects, effects);
      return;
    }

    const moving = Boolean(agent.travel) && !agent.corpse;
    const pace = movementPace(agent);
    const phase = time * pace + seed * Math.PI * 2;
    const strideWave = Math.sin(phase);
    const liftWave = Math.max(0, Math.sin(phase * 2));
    const hit = strongestEffect(localEffects, HIT_EFFECTS, time);
    const heal = strongestEffect(localEffects, HEAL_EFFECTS, time);
    const attack = resolveAttackTimeline(agent, time, seed, effects);
    const role = agent.role;
    const skeletal = role === 'skeleton';
    const shambling = role === 'zombie';
    const heavy = role === 'orc' || role === 'ogre';
    const skirmisher = role === 'rogue' || role === 'goblin' || role === 'kobold';
    const roleLean = role === 'rogue' ? 0.1 : role === 'fighter' ? 0.035 : role === 'wizard' ? 0.02 : heavy ? 0.07 : skeletal ? 0.055 : shambling ? 0.075 : 0.045;
    const stride = moving ? (skirmisher ? 0.68 : role === 'ogre' ? 0.43 : role === 'orc' ? 0.5 : shambling ? 0.38 : 0.52) : 0;
    const armSwing = moving ? stride * (heavy ? 0.62 : 0.78) : 0;
    const idleBreath = Math.sin(time * (skeletal ? 2.4 : heavy ? 1.2 : shambling ? 1.05 : 1.55) + seed * 5.4);
    const idleLook = Math.sin(time * 0.55 + seed * 9.1);
    const hitPulse = hit ? Math.sin(Math.PI * hit.progress) : 0;
    const healPulse = heal ? Math.sin(Math.PI * heal.progress) : 0;
    const attackLean = attack.windup * -0.14 + attack.strike * (heavy ? 0.28 : 0.22) + attack.recover * 0.04;
    const stomp = moving && heavy ? Math.max(0, Math.sin(phase * 2)) * 0.018 : 0;

    dampPosition(rig.pelvis, 'y', rig.pelvis.userData.restY + (moving ? liftWave * (heavy ? 0.018 : 0.028) : skeletal ? 0 : idleBreath * 0.008) - attack.strike * 0.015 - stomp, alpha);
    dampPosition(rig.pelvis, 'x', moving ? Math.cos(phase) * (heavy ? 0.009 : 0.014) : idleBreath * 0.008, alpha);
    dampRotation(rig.pelvis, 'y', moving ? strideWave * (heavy ? 0.035 : 0.055) : idleBreath * 0.012, alpha);
    dampRotation(rig.pelvis, 'z', moving ? Math.cos(phase) * (heavy ? 0.018 : 0.025) : skeletal ? idleBreath * 0.028 : idleBreath * 0.018, alpha);

    dampRotation(rig.spine, 'x', roleLean + hitPulse * -0.24 + healPulse * -0.05 + attackLean, alpha);
    dampRotation(rig.spine, 'y', (moving ? -strideWave * (heavy ? 0.05 : 0.075) : idleBreath * -0.014) + attack.twist, alpha);
    dampRotation(rig.chest, 'x', hitPulse * -0.28 + (moving ? heavy ? 0.035 : 0.015 : idleBreath * 0.012) + attackLean * 0.65, alpha);
    dampRotation(rig.chest, 'y', (moving ? -strideWave * (heavy ? 0.055 : 0.09) : idleBreath * 0.02) + attack.twist * 0.78, alpha);
    dampRotation(rig.head, 'x', hitPulse * 0.18 + (skirmisher ? -0.04 : 0) - attack.strike * 0.04, alpha);
    dampRotation(rig.head, 'y', moving ? -strideWave * 0.035 : idleLook * (skeletal ? 0.16 : shambling ? 0.06 : 0.11), alpha);
    dampRotation(rig.head, 'z', healPulse * 0.035 + ((skeletal || shambling) ? Math.sin(time * 3.1 + seed) * 0.018 : 0), alpha);

    poseLeg(rig.thighL, rig.shinL, rig.footL, strideWave * stride, moving, attack, -1, alpha, heavy);
    poseLeg(rig.thighR, rig.shinR, rig.footR, -strideWave * stride, moving, attack, 1, alpha, heavy);
    poseArm(rig.upperArmL, rig.forearmL, -strideWave * armSwing, role, false, moving, healPulse, attack, alpha);
    poseArm(rig.upperArmR, rig.forearmR, strideWave * armSwing, role, true, moving, healPulse, attack, alpha);

    if (rig.jaw) dampRotation(rig.jaw, 'x', 0.08 + Math.max(0, Math.sin(time * 4.8 + seed * 8)) * 0.12 + attack.strike * 0.14, alpha);
    if (rig.earL) dampRotation(rig.earL, 'z', -0.08 + Math.sin(time * 3.8 + seed) * 0.12 - attack.strike * 0.08, alpha);
    if (rig.earR) dampRotation(rig.earR, 'z', 0.08 - Math.sin(time * 3.5 + seed * 1.2) * 0.1 + attack.strike * 0.08, alpha);

    if (hitPulse > 0) {
      const direction = hash01(`${agent.id}:hit`) > 0.5 ? 1 : -1;
      dampRotation(rig.root, 'z', direction * hitPulse * 0.13, alpha);
      dampRotation(rig.root, 'x', -hitPulse * 0.08, alpha);
    } else {
      dampRotation(rig.root, 'z', 0, alpha);
      dampRotation(rig.root, 'x', 0, alpha);
    }

    const model = rig.model;
    const baseScale = model.userData.baseScale ?? model.scale.x;
    const breathScale = 1 + ((skeletal || shambling) ? 0 : idleBreath * (heavy ? 0.0025 : 0.004)) + healPulse * 0.014;
    dampScale(model, baseScale * breathScale, baseScale * (1 + ((skeletal || shambling) ? 0 : idleBreath * 0.007) + healPulse * 0.02), baseScale * breathScale, alpha);
  }

  animateCreatureFallback(mesh, agent, time, seed, dt, alpha, effects, allEffects) {
    const model = mesh.getObjectByName('miniature-model');
    if (!model) return;
    const baseScale = model.userData.baseScale ?? model.scale.x;
    model.userData.baseScale = baseScale;
    const phase = time * (agent.travel ? 6.8 : 2.2) + seed * Math.PI * 2;
    const hit = strongestEffect(effects, HIT_EFFECTS, time);
    const hitPulse = hit ? Math.sin(Math.PI * hit.progress) : 0;
    const attack = resolveAttackTimeline(agent, time, seed, allEffects);
    const parts = model.userData.creatureParts ?? {};

    if (agent.role === 'slime') {
      const drive = agent.travel ? Math.sin(phase) * 0.12 : Math.sin(phase) * 0.045;
      const strikeStretch = attack.strike * 0.18 - attack.windup * 0.08;
      dampScale(model, baseScale * (1 - drive * 0.48 - strikeStretch * 0.25), baseScale * (1 + drive + strikeStretch), baseScale * (1 - drive * 0.32 + strikeStretch * 0.32), alpha);
      dampRotation(model, 'z', hitPulse * 0.12 + (agent.travel ? Math.cos(phase) * 0.04 : 0), alpha);
      if (parts.body) {
        dampPosition(parts.body, 'z', attack.strike * 0.14, alpha);
        dampRotation(parts.body, 'x', attack.windup * -0.12 + attack.strike * 0.2, alpha);
      }
      if (parts.skirt) {
        const spread = 1 + Math.max(0, -drive) * 0.18 + hitPulse * 0.12;
        dampScale(parts.skirt, spread, 1, spread, alpha);
      }
      if (parts.core) {
        dampPosition(parts.core, 'x', 0.1 + Math.sin(phase * 0.7) * 0.07 + attack.strike * 0.06, alpha);
        dampPosition(parts.core, 'z', 0.08 + Math.cos(phase * 0.85) * 0.05 + attack.strike * 0.08, alpha);
        parts.core.rotation.y += dt * 2.1;
      }
      return;
    }

    if (agent.role === 'mimic') {
      if (parts.lidPivot) {
        const open = agent.combat ? 0.48 + attack.windup * 0.3 + attack.strike * 0.48 : Math.max(0, Math.sin(phase * 0.45)) * 0.035;
        dampRotation(parts.lidPivot, 'x', -open, alpha);
      }
      if (parts.jaw) dampPosition(parts.jaw, 'z', 0.36 + attack.strike * 0.22, alpha);
      if (parts.tongue) {
        dampScale(parts.tongue, 1, 1 + attack.strike * 0.75, 1, alpha);
        dampRotation(parts.tongue, 'z', Math.sin(phase * 1.4) * 0.08, alpha);
      }
      for (let index = 0; index < (parts.legs?.length ?? 0); index += 1) {
        const leg = parts.legs[index];
        dampRotation(leg, 'x', Math.sin(phase + index * Math.PI / 2) * (agent.travel ? 0.36 : 0.06), alpha);
        dampRotation(leg, 'z', (index % 2 ? 1 : -1) * (0.18 + attack.strike * 0.12), alpha);
      }
      dampScale(model, baseScale * (1 + hitPulse * 0.05 + attack.windup * 0.03), baseScale * (1 - hitPulse * 0.08 - attack.windup * 0.04), baseScale * (1 + hitPulse * 0.05 + attack.strike * 0.08), alpha);
      return;
    }

    const idle = Math.sin(phase) * 0.012;
    dampScale(model, baseScale * (1 - idle), baseScale * (1 + idle), baseScale, alpha);
    dampRotation(model, 'z', hitPulse * 0.12, alpha);
  }
}

function poseLeg(thigh, shin, foot, wave, moving, attack, side, alpha, heavy) {
  const forward = moving ? wave : 0;
  const lunge = attack.strike * (side > 0 ? -0.28 : 0.18) + attack.windup * (side > 0 ? 0.12 : -0.08);
  const bend = moving ? Math.max(0, -wave) * (heavy ? 0.5 : 0.62) : 0.035;
  dampRotation(thigh, 'x', forward + lunge, alpha);
  dampRotation(thigh, 'z', moving ? Math.abs(wave) * (heavy ? 0.018 : 0.025) : attack.strike * side * 0.025, alpha);
  dampRotation(shin, 'x', bend + attack.strike * (side > 0 ? 0.18 : 0.08), alpha);
  dampRotation(foot, 'x', moving ? -forward * 0.35 - bend * 0.22 : -attack.strike * 0.06, alpha);
}

function poseArm(upperArm, forearm, wave, role, dominant, moving, healPulse, attack, alpha) {
  let target = moving ? wave : 0;
  let bend = moving ? 0.08 + Math.max(0, wave) * 0.18 : 0.12;
  if (role === 'fighter' || role === 'orc') {
    if (dominant) target -= 0.18;
    else target += 0.12;
    bend += dominant ? 0.22 : 0.14;
  }
  if (role === 'rogue' || role === 'goblin' || role === 'kobold') {
    target -= 0.18;
    bend += 0.32;
  }
  if (role === 'wizard' || role === 'cleric') {
    target *= 0.55;
    bend += 0.18 + healPulse * 0.38;
  }
  if (role === 'skeleton') bend += 0.08;
  const combat = combatArmPose(role, dominant, attack);
  dampRotation(upperArm, 'x', target - healPulse * 0.22 + combat.x, alpha);
  dampRotation(upperArm, 'y', combat.y, alpha);
  dampRotation(upperArm, 'z', (dominant ? -0.05 : 0.05) + combat.z, alpha);
  dampRotation(forearm, 'x', bend + healPulse * 0.2 + combat.forearm, alpha);
  dampRotation(forearm, 'z', combat.forearmZ, alpha);
}

function combatArmPose(role, dominant, attack) {
  if (!attack.active) return { x: 0, y: 0, z: 0, forearm: 0, forearmZ: 0 };
  const hand = dominant ? 1 : -1;
  if (role === 'wizard' || role === 'cleric') return { x: -attack.windup * 0.38 - attack.strike * 0.7, y: hand * (attack.windup * 0.18 + attack.strike * 0.08), z: hand * -attack.strike * 0.12, forearm: attack.windup * 0.28 + attack.strike * 0.5, forearmZ: hand * attack.strike * 0.08 };
  if (role === 'rogue' || role === 'goblin' || role === 'kobold') return { x: attack.windup * 0.58 - attack.strike * 1.08, y: hand * (attack.windup * -0.24 + attack.strike * 0.2), z: hand * attack.strike * -0.18, forearm: 0.42 + attack.windup * 0.42 - attack.strike * 0.24, forearmZ: hand * -attack.strike * 0.12 };
  if (!dominant && (role === 'fighter' || role === 'orc')) return { x: -0.2 - attack.strike * 0.12, y: -0.28, z: 0.18, forearm: 0.48, forearmZ: 0 };
  return { x: attack.windup * 0.82 - attack.strike * 1.2, y: hand * (attack.windup * -0.36 + attack.strike * 0.28), z: hand * (attack.windup * 0.18 - attack.strike * 0.24), forearm: 0.25 + attack.windup * 0.55 - attack.strike * 0.2, forearmZ: hand * attack.strike * -0.1 };
}

function movementPace(agent) {
  if (!agent.travel) return 1.55;
  if (agent.role === 'goblin' || agent.role === 'kobold' || agent.role === 'rogue') return 9.1;
  if (agent.role === 'ogre') return 5.2;
  if (agent.role === 'orc') return 6;
  if (agent.role === 'zombie') return 4.9;
  if (agent.role === 'skeleton') return 6.4;
  return 7.4;
}

function strongestEffect(effects, types, time) {
  let winner = null;
  for (const effect of effects) {
    if (!types.has(effect.type)) continue;
    const duration = Math.max(0.001, effect.duration ?? 0.5);
    const progress = Math.max(0, Math.min(1, (time - (effect.createdAt ?? time)) / duration));
    if (!winner || progress < winner.progress) winner = { effect, progress };
  }
  return winner;
}

function dampRotation(node, axis, target, alpha) { if (node) node.rotation[axis] += (target - node.rotation[axis]) * alpha; }
function dampPosition(node, axis, target, alpha) { if (node) node.position[axis] += (target - node.position[axis]) * alpha; }
function dampScale(node, x, y, z, alpha) {
  if (!node) return;
  node.scale.x += (x - node.scale.x) * alpha;
  node.scale.y += (y - node.scale.y) * alpha;
  node.scale.z += (z - node.scale.z) * alpha;
}
function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return ((result >>> 0) % 10000) / 10000;
}
