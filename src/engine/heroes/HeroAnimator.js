import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';
import { getHeroAnimationClip } from '../../content/heroes/HeroAnimationClips.js';
import { updateHeroSecondaryMotion, applyVolumePreservingSquash } from './HeroSecondaryMotion.js';

export function animateHeroMiniature(mesh, agent, time = 0) {
  if (mesh?.userData?.isHeroForm) return animateHeroFormMiniature(mesh, agent, time);
  if (!mesh?.userData?.isHero) return false;
  const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
  if (!definition) return false;
  const joints = mesh.userData.joints ?? {};
  resetJoints(joints);

  const moving = Boolean(agent.travel) || agent.mood === 'retreating';
  if (definition.id === 'hero.nibble') animateNibbleLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.kirik') animateKirikLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.karg') animateKargLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.isara') animateIsaraLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.orum-bell') animateOrumLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.glop') animateGlopLocomotion(joints, agent, time, moving);

  if (agent.heroCast) animateHeroCast(joints, definition, agent.heroCast);
  else if (agent.combat) animateCombat(joints, definition, agent.combat);
  else animateIdle(joints, definition, time, agent);

  animateSecondary(joints, definition, time, agent);
  updateHeroSecondaryMotion(mesh, agent, time);
  animateDynamicMaterials(mesh, agent, definition, time);
  applyDamageStage(mesh, agent.heroDamageStage ?? 0, agent.heroVariant);
  animateIndicators(mesh, agent, definition, time);
  animateReveal(mesh, agent);
  return true;
}

function animateNibbleLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 6.1 : 2.2) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.48);
  rotate(joints.legR, 'x', -gait * 0.48);
  rotate(joints.upperArmL, 'x', -gait * 0.28);
  rotate(joints.upperArmR, 'x', gait * 0.18);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : Math.sin(phase * 0.5) * 0.008;
  if (moving && joints.motionRoot) joints.motionRoot.rotation.z += Math.sin(phase) * 0.03;
}

function animateKirikLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 4.6 : 1.8) + seed(agent.id);
  for (let i = 0; i < 3; i += 1) {
    const offset = phase + i * (Math.PI * 2 / 3);
    rotate(joints[`leg${i}`], 'y', Math.sin(offset) * (moving ? 0.22 : 0.025));
    rotate(joints[`knee${i}`], 'z', Math.cos(offset) * (moving ? 0.36 : 0.035));
    if (joints[`foot${i}`]) joints[`foot${i}`].position.y += moving ? Math.max(0, Math.sin(offset)) * 0.12 : 0;
  }
  if (joints.chassis) joints.chassis.position.y += moving ? Math.sin(phase * 3) * 0.018 : Math.sin(phase) * 0.008;
  if (joints.pilotBody) joints.pilotBody.rotation.z += Math.sin(phase * 0.6) * 0.025;
}

function animateKargLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 3.1 : 1.6) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  const stance = agent.heroStatuses?.secondDefeat ? 1.15 : 0.78;
  rotate(joints.legL, 'x', gait * 0.42 * stance);
  rotate(joints.legR, 'x', -gait * 0.42 * stance);
  rotate(joints.upperArmL, 'x', -gait * 0.18);
  rotate(joints.upperArmR, 'x', gait * 0.16);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase)) * 0.028 : Math.sin(phase * 0.45) * 0.006;
  if (joints.chest) joints.chest.rotation.y += moving ? gait * 0.09 : 0;
}

function animateIsaraLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 2.8 : 1.2) + seed(agent.id);
  if (joints.motionRoot) {
    joints.motionRoot.position.y += Math.sin(phase * 1.15) * (moving ? 0.07 : 0.04);
    joints.motionRoot.rotation.y += moving ? Math.sin(phase * 0.45) * 0.035 : 0;
  }
  rotate(joints.veilRoot, 'z', Math.sin(phase * 0.72) * (moving ? 0.06 : 0.025));
  rotate(joints.handL, 'y', Math.sin(phase * 0.83) * 0.08);
  rotate(joints.handR, 'y', -Math.sin(phase * 0.79) * 0.08);
}

function animateOrumLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 2.6 : 1.0) + seed(agent.id);
  for (let i = 0; i < 3; i += 1) {
    const local = phase + i * Math.PI * 2 / 3;
    rotate(joints[`rootLeg${i}`], 'x', Math.sin(local) * (moving ? 0.24 : 0.025));
    rotate(joints[`rootLeg${i}`], 'z', Math.cos(local) * (moving ? 0.08 : 0.018));
  }
  if (joints.rootCore) joints.rootCore.position.y += moving ? Math.abs(Math.sin(phase * 1.5)) * 0.035 : Math.sin(phase * 0.55) * 0.01;
  if (joints.stemLower) joints.stemLower.rotation.z += Math.sin(phase * 0.48) * (moving ? 0.045 : 0.018);
}

function animateGlopLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 3.2 : 1.35) + seed(agent.id);
  const compression = moving ? Math.sin(phase) * 0.11 + Math.abs(Math.cos(phase * 0.5)) * 0.05 : Math.sin(phase) * 0.035;
  applyVolumePreservingSquash(joints.blobRoot, compression, Math.sin(phase * 0.5) * 0.025);
  for (let i = 0; i < 4; i += 1) {
    const lobe = joints[`lobe${i}`];
    if (!lobe) continue;
    const local = phase + i * Math.PI * 0.5;
    lobe.position.y += Math.max(0, Math.sin(local)) * (moving ? 0.08 : 0.015);
    lobe.scale.x *= 1 + Math.sin(local) * (moving ? 0.08 : 0.025);
  }
  if (joints.crown) joints.crown.rotation.y += time * 0.08;
}

function animateIdle(joints, definition, time, agent) {
  const profile = definition.visual.animationProfile;
  const primary = getHeroAnimationClip(profile, 'idle-primary');
  const secondary = getHeroAnimationClip(profile, 'idle-secondary');
  if (primary) sampleClip(primary, (time + seed(agent.id)) % primary.duration / primary.duration, joints, 1);
  if (secondary) sampleClip(secondary, (time * 0.73 + seed(agent.id) * 2) % secondary.duration / secondary.duration, joints, 0.75);
}

function animateHeroCast(joints, definition, cast) {
  const clip = getHeroAnimationClip(definition.visual.animationProfile, `skill:${cast.skillId}`);
  if (!clip) return;
  let normalized;
  let weight = 1;
  if (cast.phase === 'windup') normalized = clamp(cast.elapsed / Math.max(0.001, cast.duration), 0, 1);
  else if (cast.phase === 'impact') normalized = 1;
  else {
    normalized = 1;
    weight = 1 - clamp(cast.elapsed / Math.max(0.001, cast.duration), 0, 1);
  }
  sampleClip(clip, normalized, joints, weight);
}

function animateCombat(joints, definition, combat) {
  const progress = clamp(combat.progress ?? 0, 0, 1);
  if (definition.id === 'hero.karg') {
    if (combat.phase === 'windup') {
      rotate(joints.weaponRoot, 'z', -progress * 0.9);
      rotate(joints.chest, 'y', -progress * 0.28);
    } else if (combat.phase === 'impact') {
      rotate(joints.weaponRoot, 'z', 0.75);
      rotate(joints.chest, 'y', 0.42);
    }
  } else if (definition.id === 'hero.kirik') {
    rotate(joints.toolArmR, 'x', combat.phase === 'impact' ? 0.72 : -progress * 0.8);
  } else if (definition.id === 'hero.isara') {
    rotate(joints.handR, 'z', combat.phase === 'impact' ? 0.9 : -progress * 0.6);
    rotate(joints.veilRoot, 'y', combat.phase === 'impact' ? 0.28 : -progress * 0.18);
  } else if (definition.id === 'hero.orum-bell') {
    rotate(joints.spearRoot, 'x', combat.phase === 'impact' ? 0.62 : -progress * 0.86);
    if (joints.spearShaft) joints.spearShaft.scale.y *= 1 + (combat.phase === 'impact' ? 0.45 : progress * 0.12);
  } else if (definition.id === 'hero.glop') {
    rotate(joints.pseudoArmR, 'z', combat.phase === 'impact' ? 1.0 : -progress * 0.65);
    applyVolumePreservingSquash(joints.blobRoot, combat.phase === 'impact' ? -0.18 : progress * 0.12, 0.04);
  } else {
    rotate(joints.staff, 'z', combat.phase === 'impact' ? 0.6 : -progress * 0.55);
    rotate(joints.chest, 'y', combat.phase === 'impact' ? 0.3 : -progress * 0.2);
  }
}

function animateSecondary(joints, definition, time, agent) {
  const phase = time + seed(agent.id);
  if (definition.id === 'hero.nibble') {
    rotate(joints.coatLeft, 'z', Math.sin(phase * 1.7) * 0.045);
    rotate(joints.coatRight, 'z', -Math.sin(phase * 1.7 + 0.4) * 0.045);
    rotate(joints.coatBack, 'x', Math.sin(phase * 1.3) * 0.035);
    if (joints.keyRing) joints.keyRing.rotation.y += phase * 0.11;
    if (agent.mood === 'retreating') {
      rotate(joints.coatLeft, 'z', 0.28);
      rotate(joints.coatRight, 'z', -0.28);
    }
  }
  if (definition.id === 'hero.kirik') {
    if (joints.gear) joints.gear.rotation.z += phase * (agent.heroStatuses?.bastion ? 1.5 : 0.22);
    if (joints.lens) joints.lens.rotation.z += phase * 0.14;
    if (agent.heroStatuses?.bastion) {
      if (joints.chassis) joints.chassis.position.y -= 0.22;
      for (let i = 0; i < 3; i += 1) rotate(joints[`stabilizer${i}`], 'x', -0.9);
    }
  }
  if (definition.id === 'hero.karg') {
    rotate(joints.bannerL, 'z', Math.sin(phase * 1.15) * 0.09);
    rotate(joints.bannerR, 'z', -Math.sin(phase * 1.05 + 0.5) * 0.09);
    if (agent.heroStatuses?.secondDefeat) {
      rotate(joints.chest, 'x', -0.12);
      rotate(joints.weaponRoot, 'z', 0.12);
    }
  }
  if (definition.id === 'hero.isara') {
    if (joints.crown) joints.crown.rotation.y += phase * 0.05;
    if (agent.heroStatuses?.etherealDomain) {
      if (joints.motionRoot) joints.motionRoot.position.y += 0.16;
      if (joints.veilRoot) joints.veilRoot.scale.x *= 1.18;
    }
  }
  if (definition.id === 'hero.orum-bell') {
    if (agent.heroStatuses?.lanceGrown && joints.spearShaft) joints.spearShaft.scale.y *= 1.55;
    if (agent.heroStatuses?.solitaryBloom) {
      if (joints.capRoot) { joints.capRoot.scale.x *= 1.2; joints.capRoot.scale.z *= 1.2; }
      if (joints.spearShaft) joints.spearShaft.scale.y *= 1.25;
      rotate(joints.mantleRoot, 'x', -0.18);
    }
  }
  if (definition.id === 'hero.glop') {
    applyGlopStance(joints, agent.heroStance ?? 'crown');
    if (agent.heroStatuses?.splitCourt && joints.blobRoot) joints.blobRoot.scale.setScalar(0.72);
  }
}

function applyGlopStance(joints, stance) {
  const names = ['crown','keyRingArtifact','chalice','throneFragment'];
  const selected = stance === 'key' ? 'keyRingArtifact' : stance === 'chalice' ? 'chalice' : stance === 'throne' ? 'throneFragment' : 'crown';
  for (const name of names) {
    const joint = joints[name];
    if (!joint) continue;
    const active = name === selected;
    joint.scale.setScalar(active ? 1.28 : 0.86);
    if (active && name !== 'crown') {
      joint.position.z += 0.25;
      joint.position.y += 0.12;
    }
  }
}

function animateDynamicMaterials(mesh, agent, definition, time) {
  const materials = mesh.userData.dynamicMaterials ?? [];
  if (!materials.length) return;
  if (definition.id === 'hero.isara') {
    const domain = agent.heroStatuses?.etherealDomain;
    const baseOpacity = domain ? 0.38 : 0.62;
    for (const material of materials) {
      if (!material?.transparent) continue;
      material.opacity = clamp(baseOpacity + Math.sin(time * 2.1) * 0.08, 0.2, 0.82);
      if ('emissiveIntensity' in material) material.emissiveIntensity = domain ? 0.55 : 0.28;
    }
  } else if (definition.id === 'hero.orum-bell') {
    for (const material of materials) {
      if ('emissiveIntensity' in material) material.emissiveIntensity = agent.heroStatuses?.solitaryBloom ? 0.52 : 0.2 + Math.sin(time * 1.4) * 0.05;
    }
  } else if (definition.id === 'hero.glop') {
    const damage = agent.heroDamageStage ?? 0;
    for (const material of materials) {
      if (material?.transparent) material.opacity = clamp(0.64 - damage * 0.08 + Math.sin(time * 1.7) * 0.025, 0.38, 0.72);
    }
  }
}

function animateHeroFormMiniature(mesh, agent, time) {
  const joints = mesh.userData.joints ?? {};
  resetJoints(joints);
  const moving = Boolean(agent?.travel);
  const phase = time * (moving ? 4.2 : 1.8) + seed(agent?.id);
  if (String(agent?.heroFormKind ?? '').startsWith('shade')) {
    if (joints.motionRoot) joints.motionRoot.position.y += Math.sin(phase) * 0.08;
    if (joints.body) { joints.body.rotation.z += Math.sin(phase * 0.55) * 0.05; joints.body.scale.y *= 1 + Math.sin(phase * 0.72) * 0.05; }
    if (joints.accent) joints.accent.rotation.y += time * 0.35;
  } else {
    applyVolumePreservingSquash(joints.body, Math.sin(phase) * (moving ? 0.12 : 0.045), 0.02);
    if (joints.accent) {
      joints.accent.position.y += Math.sin(phase * 0.8) * 0.05;
      joints.accent.rotation.y += time * 0.22;
    }
  }
  const ring = mesh.getObjectByName?.('hero-form-ring');
  if (ring) { ring.rotation.z = time * 0.3; ring.material.opacity = 0.5 + Math.sin(time * 3) * 0.12; }
  return true;
}

function applyDamageStage(mesh, stage, variant) {
  const parts = mesh.userData.damageParts ?? {};
  for (const node of parts.stage1Hide ?? []) node.visible = stage < 1;
  for (const node of parts.stage2Hide ?? []) node.visible = stage < 2 && variant !== 'second-defeat';
  for (const node of parts.stage1Show ?? []) node.visible = stage >= 1;
  for (const node of parts.stage2Show ?? []) node.visible = stage >= 2 || variant === 'second-defeat' || variant === 'unarmored';
  if (variant === 'second-defeat' && mesh.userData.joints?.armorShell) mesh.userData.joints.armorShell.visible = false;
  else if (mesh.userData.joints?.armorShell) mesh.userData.joints.armorShell.visible = stage < 2;
}

function animateIndicators(mesh, agent, definition, time) {
  const ring = mesh.getObjectByName?.('hero-ring');
  const inner = mesh.getObjectByName?.('hero-ring-inner');
  const marker = mesh.getObjectByName?.('hero-marker');
  const hp = mesh.getObjectByName?.('hp');
  if (ring) {
    ring.rotation.z = time * 0.24;
    ring.material.opacity = agent.heroCast ? 0.98 : 0.82;
    ring.scale.setScalar(agent.heroCast ? 1 + Math.sin(time * 8) * 0.08 : 1);
  }
  if (inner) inner.rotation.z = -time * 0.31;
  if (marker) {
    marker.rotation.y = time * 0.72;
    marker.position.y += Math.sin(time * 2.2 + seed(agent.id)) * 0.04;
  }
  if (hp) hp.scale.x = Math.max(0.02, (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? definition.baseStats.hp));
}

function animateReveal(mesh, agent) {
  const remaining = agent.heroRevealRemaining ?? 0;
  if (remaining <= 0) {
    mesh.scale.setScalar(mesh.userData.baseScale ?? 1);
    return;
  }
  const progress = clamp(1 - remaining / 2.2, 0, 1);
  const eased = overshoot(progress);
  mesh.scale.setScalar((mesh.userData.baseScale ?? 1) * Math.max(0.12, eased));
  if (mesh.userData.joints?.motionRoot) mesh.userData.joints.motionRoot.position.y += (1 - progress) * 0.35;
}

function resetJoints(joints) {
  for (const joint of Object.values(joints)) {
    const base = joint?.userData?.baseTransform;
    if (!base) continue;
    joint.position.copy(base.position);
    joint.rotation.copy(base.rotation);
    joint.scale.copy(base.scale);
  }
}

function sampleClip(clip, t, joints, weight = 1) {
  const time = clip.loop ? t % 1 : clamp(t, 0, 1);
  for (const channel of clip.channels ?? []) {
    const joint = joints[channel.joint];
    if (!joint) continue;
    const value = sampleKeys(channel.keys, time, channel.easing);
    const [objectName, propertyName] = channel.property.split('.');
    const target = joint[objectName];
    if (!target || !(propertyName in target)) continue;
    if (objectName === 'scale') target[propertyName] *= 1 + value * weight;
    else target[propertyName] += value * weight;
  }
}

function sampleKeys(keys, t, easing) {
  if (!keys?.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t > b[0]) continue;
    const local = clamp((t - a[0]) / Math.max(0.0001, b[0] - a[0]), 0, 1);
    const e = easing === 'linear' ? local : smoothstep(local);
    return a[1] + (b[1] - a[1]) * e;
  }
  return keys.at(-1)[1];
}

function rotate(joint, axis, amount) {
  if (joint) joint.rotation[axis] += amount;
}

function seed(value) {
  let result = 0;
  for (const char of String(value ?? '')) result = (result * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(result % 997) / 997 * Math.PI * 2;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function overshoot(value) {
  const t = clamp(value, 0, 1) - 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
