const HIT_EFFECTS = new Set(['attack', 'siege-hit', 'structure-break']);
const HEAL_EFFECTS = new Set(['heal', 'settlement-rehome']);

export class MiniatureAnimator {
  update(mesh, agent, time, effects = []) {
    if (!mesh) return;
    const dt = animationDelta(mesh, time);
    const alpha = 1 - Math.exp(-Math.min(24, dt > 0 ? 15 : 1));
    const seed = mesh.userData.animationSeed ?? hash01(agent.id ?? agent.name ?? agent.role);
    const rig = mesh.userData.rig;
    const localEffects = effects.filter(effect => effect.agentId === agent.id);

    if (!rig) {
      this.animateCreatureFallback(mesh, agent, time, seed, alpha, localEffects);
      return;
    }

    const moving = Boolean(agent.travel);
    const pace = movementPace(agent);
    const phase = time * pace + seed * Math.PI * 2;
    const strideWave = Math.sin(phase);
    const liftWave = Math.max(0, Math.sin(phase * 2));
    const hit = strongestEffect(localEffects, HIT_EFFECTS, time);
    const heal = strongestEffect(localEffects, HEAL_EFFECTS, time);
    const role = agent.role;
    const roleLean = role === 'rogue' ? 0.1 : role === 'fighter' ? 0.035 : role === 'wizard' ? 0.02 : 0.045;
    const stride = moving ? (role === 'rogue' ? 0.62 : role === 'goblin' ? 0.7 : 0.52) : 0;
    const armSwing = moving ? stride * 0.78 : 0;
    const idleBreath = Math.sin(time * 1.55 + seed * 5.4);
    const idleLook = Math.sin(time * 0.55 + seed * 9.1);
    const hitPulse = hit ? Math.sin(Math.PI * hit.progress) : 0;
    const healPulse = heal ? Math.sin(Math.PI * heal.progress) : 0;

    dampPosition(rig.pelvis, 'y', rig.pelvis.userData.restY + (moving ? liftWave * 0.028 : idleBreath * 0.008), alpha);
    dampPosition(rig.pelvis, 'x', moving ? Math.cos(phase) * 0.014 : idleBreath * 0.008, alpha);
    dampRotation(rig.pelvis, 'y', moving ? strideWave * 0.055 : idleBreath * 0.012, alpha);
    dampRotation(rig.pelvis, 'z', moving ? Math.cos(phase) * 0.025 : idleBreath * 0.018, alpha);

    dampRotation(rig.spine, 'x', roleLean + hitPulse * -0.24 + healPulse * -0.05, alpha);
    dampRotation(rig.spine, 'y', moving ? -strideWave * 0.075 : idleBreath * -0.014, alpha);
    dampRotation(rig.chest, 'x', hitPulse * -0.28 + (moving ? 0.015 : idleBreath * 0.012), alpha);
    dampRotation(rig.chest, 'y', moving ? -strideWave * 0.09 : idleBreath * 0.02, alpha);
    dampRotation(rig.head, 'x', hitPulse * 0.18 + (role === 'rogue' ? -0.04 : 0), alpha);
    dampRotation(rig.head, 'y', moving ? -strideWave * 0.035 : idleLook * 0.11, alpha);
    dampRotation(rig.head, 'z', healPulse * 0.035, alpha);

    poseLeg(rig.thighL, rig.shinL, rig.footL, strideWave * stride, moving, alpha);
    poseLeg(rig.thighR, rig.shinR, rig.footR, -strideWave * stride, moving, alpha);
    poseArm(rig.upperArmL, rig.forearmL, -strideWave * armSwing, role, false, moving, healPulse, alpha);
    poseArm(rig.upperArmR, rig.forearmR, strideWave * armSwing, role, true, moving, healPulse, alpha);

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
    const breathScale = 1 + idleBreath * 0.004 + healPulse * 0.014;
    dampScale(model, baseScale * breathScale, baseScale * (1 + idleBreath * 0.007 + healPulse * 0.02), baseScale * breathScale, alpha);
  }

  animateCreatureFallback(mesh, agent, time, seed, alpha, effects) {
    const model = mesh.getObjectByName('miniature-model');
    if (!model) return;
    const baseScale = model.userData.baseScale ?? model.scale.x;
    model.userData.baseScale = baseScale;
    const phase = time * (agent.travel ? 6.8 : 2.2) + seed * Math.PI * 2;
    const hit = strongestEffect(effects, HIT_EFFECTS, time);
    const hitPulse = hit ? Math.sin(Math.PI * hit.progress) : 0;

    if (agent.role === 'slime') {
      const stretch = agent.travel ? Math.sin(phase) * 0.08 : Math.sin(phase) * 0.035;
      dampScale(model, baseScale * (1 - stretch * 0.55), baseScale * (1 + stretch), baseScale * (1 - stretch * 0.35), alpha);
      dampRotation(model, 'z', hitPulse * 0.12, alpha);
      const core = model.getObjectByName('part:slime-core');
      if (core) {
        core.position.x = 0.12 + Math.sin(phase * 0.7) * 0.055;
        core.position.z = 0.12 + Math.cos(phase * 0.85) * 0.045;
      }
      return;
    }

    if (agent.role === 'mimic') {
      const lid = model.getObjectByName('part:mimic-lid');
      if (lid) dampRotation(lid, 'x', agent.combat ? -0.72 + Math.sin(phase) * 0.16 : -0.18 + Math.max(0, Math.sin(phase * 0.45)) * 0.035, alpha);
      dampScale(model, baseScale * (1 + hitPulse * 0.05), baseScale * (1 - hitPulse * 0.08), baseScale * (1 + hitPulse * 0.05), alpha);
      return;
    }

    const idle = Math.sin(phase) * 0.012;
    dampScale(model, baseScale * (1 - idle), baseScale * (1 + idle), baseScale, alpha);
    dampRotation(model, 'z', hitPulse * 0.12, alpha);
  }
}

function poseLeg(thigh, shin, foot, wave, moving, alpha) {
  const forward = moving ? wave : 0;
  const bend = moving ? Math.max(0, -wave) * 0.62 : 0.035;
  dampRotation(thigh, 'x', forward, alpha);
  dampRotation(thigh, 'z', moving ? Math.abs(wave) * 0.025 : 0, alpha);
  dampRotation(shin, 'x', bend, alpha);
  dampRotation(foot, 'x', moving ? -forward * 0.35 - bend * 0.22 : 0, alpha);
}

function poseArm(upperArm, forearm, wave, role, dominant, moving, healPulse, alpha) {
  let target = moving ? wave : 0;
  let bend = moving ? 0.08 + Math.max(0, wave) * 0.18 : 0.12;
  if (role === 'fighter') {
    if (dominant) target -= 0.18;
    else target += 0.12;
    bend += dominant ? 0.22 : 0.14;
  }
  if (role === 'rogue') {
    target -= 0.18;
    bend += 0.32;
  }
  if (role === 'wizard' || role === 'cleric') {
    target *= 0.55;
    bend += 0.18 + healPulse * 0.38;
  }
  dampRotation(upperArm, 'x', target - healPulse * 0.22, alpha);
  dampRotation(upperArm, 'z', dominant ? -0.05 : 0.05, alpha);
  dampRotation(forearm, 'x', bend + healPulse * 0.2, alpha);
}

function movementPace(agent) {
  if (!agent.travel) return 1.55;
  if (agent.role === 'goblin' || agent.role === 'rogue') return 9.1;
  if (agent.role === 'ogre') return 5.2;
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

function animationDelta(mesh, time) {
  const previous = mesh.userData.lastAnimationTime;
  mesh.userData.lastAnimationTime = time;
  if (!Number.isFinite(previous)) return 1 / 60;
  return Math.max(1 / 240, Math.min(0.1, time - previous));
}

function dampRotation(node, axis, target, alpha) {
  if (!node) return;
  node.rotation[axis] += (target - node.rotation[axis]) * alpha;
}

function dampPosition(node, axis, target, alpha) {
  if (!node) return;
  node.position[axis] += (target - node.position[axis]) * alpha;
}

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
