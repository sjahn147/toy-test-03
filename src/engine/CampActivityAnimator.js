export class CampActivityAnimator {
  update(mesh, agent, time) {
    const activity = agent?.activity;
    if (!mesh || activity?.source !== 'camp-life' || agent.travel || agent.combat || agent.corpse) return;
    const previous = mesh.userData.campActivityFrameTime ?? time;
    const dt = Math.max(0, Math.min(0.1, time - previous));
    mesh.userData.campActivityFrameTime = time;
    const alpha = 1 - Math.exp(-14 * Math.max(dt, 1 / 120));
    const seed = hash01(agent.id ?? agent.name ?? activity.id);
    const phase = time * activityPace(activity.type) + seed * Math.PI * 2;
    const rig = mesh.userData.rig;
    if (rig) this.animateRig(rig, activity, phase, seed, alpha);
    else this.animateFallback(mesh, activity, phase, seed, alpha);
  }

  animateRig(rig, activity, phase, seed, alpha) {
    const type = activity.type;
    const loop = Math.sin(phase);
    const softLoop = Math.sin(phase * 0.5);
    const pelvisRest = rig.pelvis?.userData?.restY ?? rig.pelvis?.position?.y ?? 0;

    if (type === 'sleeping') {
      const side = seed > 0.5 ? 1 : -1;
      rotate(rig.root, 'z', side * 1.42, alpha);
      rotate(rig.root, 'x', 0.06, alpha);
      position(rig.pelvis, 'y', pelvisRest - 0.14, alpha);
      rotate(rig.spine, 'x', 0.12 + softLoop * 0.015, alpha);
      rotate(rig.chest, 'x', -0.04 + softLoop * 0.018, alpha);
      rotate(rig.head, 'y', side * 0.22, alpha);
      rotate(rig.thighL, 'x', -0.36, alpha);
      rotate(rig.thighR, 'x', -0.18, alpha);
      rotate(rig.shinL, 'x', 0.72, alpha);
      rotate(rig.shinR, 'x', 0.52, alpha);
      rotate(rig.upperArmL, 'x', -0.42, alpha);
      rotate(rig.upperArmR, 'x', -0.3, alpha);
      rotate(rig.forearmL, 'x', 1.08, alpha);
      rotate(rig.forearmR, 'x', 0.92, alpha);
      return;
    }

    if (type === 'resting' || type === 'monster-resting') {
      rotate(rig.root, 'z', 0, alpha);
      rotate(rig.root, 'x', 0, alpha);
      position(rig.pelvis, 'y', pelvisRest - 0.18, alpha);
      rotate(rig.spine, 'x', 0.18 + softLoop * 0.025, alpha);
      rotate(rig.chest, 'x', 0.08, alpha);
      rotate(rig.head, 'y', softLoop * 0.12, alpha);
      rotate(rig.thighL, 'x', -0.82, alpha);
      rotate(rig.thighR, 'x', -0.78, alpha);
      rotate(rig.shinL, 'x', 1.08, alpha);
      rotate(rig.shinR, 'x', 1.02, alpha);
      rotate(rig.upperArmL, 'x', -0.18, alpha);
      rotate(rig.upperArmR, 'x', -0.2, alpha);
      rotate(rig.forearmL, 'x', 0.55, alpha);
      rotate(rig.forearmR, 'x', 0.52, alpha);
      return;
    }

    if (type === 'eating' || type === 'monster-feeding') {
      const bite = Math.max(0, Math.sin(phase));
      rotate(rig.root, 'z', 0, alpha);
      position(rig.pelvis, 'y', pelvisRest - 0.11, alpha);
      rotate(rig.spine, 'x', 0.2 + bite * 0.05, alpha);
      rotate(rig.chest, 'x', 0.1, alpha);
      rotate(rig.head, 'x', 0.12 - bite * 0.16, alpha);
      rotate(rig.head, 'y', softLoop * 0.06, alpha);
      rotate(rig.thighL, 'x', -0.52, alpha);
      rotate(rig.thighR, 'x', -0.46, alpha);
      rotate(rig.shinL, 'x', 0.78, alpha);
      rotate(rig.shinR, 'x', 0.72, alpha);
      rotate(rig.upperArmL, 'x', -0.58, alpha);
      rotate(rig.forearmL, 'x', 1.02, alpha);
      rotate(rig.upperArmR, 'x', -0.58 - bite * 0.72, alpha);
      rotate(rig.upperArmR, 'y', -0.16, alpha);
      rotate(rig.forearmR, 'x', 1.18 + bite * 0.38, alpha);
      return;
    }

    if (type === 'cooking') {
      const stir = Math.sin(phase * 1.35);
      rotate(rig.root, 'z', 0, alpha);
      position(rig.pelvis, 'y', pelvisRest - 0.08, alpha);
      rotate(rig.spine, 'x', 0.28, alpha);
      rotate(rig.chest, 'x', 0.12, alpha);
      rotate(rig.chest, 'y', stir * 0.1, alpha);
      rotate(rig.head, 'x', 0.18, alpha);
      rotate(rig.head, 'y', stir * 0.05, alpha);
      rotate(rig.thighL, 'x', -0.34, alpha);
      rotate(rig.thighR, 'x', -0.3, alpha);
      rotate(rig.shinL, 'x', 0.46, alpha);
      rotate(rig.shinR, 'x', 0.42, alpha);
      rotate(rig.upperArmL, 'x', -0.68, alpha);
      rotate(rig.upperArmL, 'z', 0.18, alpha);
      rotate(rig.forearmL, 'x', 0.92, alpha);
      rotate(rig.upperArmR, 'x', -0.86 + stir * 0.15, alpha);
      rotate(rig.upperArmR, 'y', -0.18 + stir * 0.22, alpha);
      rotate(rig.forearmR, 'x', 1.0 + stir * 0.18, alpha);
      return;
    }

    if (type === 'maintaining-outpost') {
      const strike = Math.max(0, Math.sin(phase));
      rotate(rig.root, 'z', 0, alpha);
      position(rig.pelvis, 'y', pelvisRest - 0.05, alpha);
      rotate(rig.spine, 'x', 0.22 + strike * 0.12, alpha);
      rotate(rig.chest, 'y', -0.12 + strike * 0.18, alpha);
      rotate(rig.head, 'x', 0.12, alpha);
      rotate(rig.upperArmL, 'x', -0.72, alpha);
      rotate(rig.forearmL, 'x', 0.92, alpha);
      rotate(rig.upperArmR, 'x', -1.28 + strike * 1.05, alpha);
      rotate(rig.upperArmR, 'z', -0.12, alpha);
      rotate(rig.forearmR, 'x', 0.5 + strike * 0.58, alpha);
      return;
    }

    if (type === 'guarding') {
      const scan = Math.sin(phase * 0.42 + seed * 3.1);
      rotate(rig.root, 'z', 0, alpha);
      rotate(rig.root, 'x', 0, alpha);
      position(rig.pelvis, 'y', pelvisRest, alpha);
      rotate(rig.spine, 'x', 0.02, alpha);
      rotate(rig.spine, 'y', scan * 0.035, alpha);
      rotate(rig.chest, 'x', 0.015, alpha);
      rotate(rig.head, 'x', -0.035, alpha);
      rotate(rig.head, 'y', scan * 0.32, alpha);
      rotate(rig.thighL, 'x', 0.04, alpha);
      rotate(rig.thighR, 'x', -0.04, alpha);
      rotate(rig.shinL, 'x', 0.08, alpha);
      rotate(rig.shinR, 'x', 0.07, alpha);
      rotate(rig.upperArmL, 'x', -0.28, alpha);
      rotate(rig.upperArmL, 'z', 0.1, alpha);
      rotate(rig.forearmL, 'x', 0.72, alpha);
      rotate(rig.upperArmR, 'x', -0.36, alpha);
      rotate(rig.upperArmR, 'z', -0.08, alpha);
      rotate(rig.forearmR, 'x', 0.82, alpha);
    }
  }

  animateFallback(mesh, activity, phase, seed, alpha) {
    const model = mesh.getObjectByName('miniature-model');
    if (!model) return;
    const type = activity.type;
    if (type === 'sleeping' || type === 'monster-resting') {
      rotate(model, 'z', seed > 0.5 ? 1.36 : -1.36, alpha);
      rotate(model, 'x', 0.04, alpha);
      return;
    }
    if (type === 'eating' || type === 'monster-feeding') {
      rotate(model, 'x', 0.16 + Math.max(0, Math.sin(phase)) * 0.2, alpha);
      rotate(model, 'z', Math.sin(phase * 0.5) * 0.035, alpha);
      return;
    }
    if (type === 'guarding') {
      rotate(model, 'x', 0, alpha);
      rotate(model, 'z', Math.sin(phase * 0.32) * 0.025, alpha);
      return;
    }
    if (type === 'cooking' || type === 'maintaining-outpost') {
      rotate(model, 'x', 0.14 + Math.max(0, Math.sin(phase)) * 0.08, alpha);
      rotate(model, 'z', Math.sin(phase) * 0.07, alpha);
    }
  }
}

function activityPace(type) {
  if (type === 'sleeping' || type === 'monster-resting') return 1.2;
  if (type === 'guarding') return 1.8;
  if (type === 'eating' || type === 'monster-feeding') return 4.4;
  if (type === 'cooking') return 3.4;
  if (type === 'maintaining-outpost') return 4.8;
  return 2.2;
}

function rotate(node, axis, value, alpha) {
  if (!node?.rotation) return;
  node.rotation[axis] += (value - node.rotation[axis]) * alpha;
}

function position(node, axis, value, alpha) {
  if (!node?.position) return;
  node.position[axis] += (value - node.position[axis]) * alpha;
}

function hash01(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}
