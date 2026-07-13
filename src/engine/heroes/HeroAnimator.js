import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';
import { getHeroAnimationClip } from '../../content/heroes/HeroAnimationClips.js';
import { updateHeroSecondaryMotion, applyVolumePreservingSquash, beginSecondaryMotionFrame, springRotation, springPosition } from './HeroSecondaryMotion.js';

export function animateHeroMiniature(mesh, agent, time = 0) {
  if (mesh?.userData?.isHeroSummon) return animateHeroSummonMiniature(mesh, agent, time);
  if (mesh?.userData?.isHeroForm) return animateHeroFormMiniature(mesh, agent, time);
  if (!mesh?.userData?.isHero) return false;
  const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
  if (!definition) return false;
  const joints = mesh.userData.joints ?? {};
  resetJoints(joints);
  beginSecondaryMotionFrame(mesh, time);
  configureSkillParts(mesh, definition, agent);

  const moving = Boolean(agent.travel) || agent.mood === 'retreating';
  if (definition.id === 'hero.nibble') animateNibbleLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.kirik') animateKirikLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.karg') animateKargLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.isara') animateIsaraLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.orum-bell') animateOrumLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.glop') animateGlopLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.jijik') animateJijikLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.tissa') animateTissaLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.murga') animateMurgaLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.aldren') animateAldrenLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.malcor') animateMalcorLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.arvek') animateArvekLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.pev') animatePevLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.eighth-cocoon') animateEighthCocoonLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.empty-queen-hand') animateEmptyQueenLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.failed-successor') animateSuccessorLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.sleeping-gardener') animateGardenerLocomotion(joints, agent, time, moving);
  else if (definition.id === 'hero.goldcrown-back') animateGoldcrownLocomotion(joints, agent, time, moving);

  if (agent.heroCast) animateHeroCast(joints, definition, agent.heroCast);
  else if (agent.combat) animateCombat(joints, definition, agent.combat);
  else animateIdle(joints, definition, time, agent);

  animateSecondary(joints, definition, time, agent);
  animatePhysicalSecondary(mesh, joints, definition, time, agent);
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

function animateJijikLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 5.8 : 1.9) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.46);
  rotate(joints.legR, 'x', -gait * 0.46);
  rotate(joints.upperArmL, 'x', -gait * 0.24);
  rotate(joints.mechanicalShoulder, 'x', gait * 0.08);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.03 : Math.sin(phase * 0.5) * 0.007;
  if (joints.chest) joints.chest.rotation.z += moving ? -0.05 + gait * 0.025 : -0.03;
}

function animateTissaLocomotion(joints, agent, time, moving) {
  const swimming = Boolean(agent.heroAquaticMode || agent.heroStatuses?.swimming);
  const phase = time * (moving ? (swimming ? 4.2 : 5.2) : 1.7) + seed(agent.id);
  if (swimming) {
    if (joints.motionRoot) joints.motionRoot.rotation.x += -0.62;
    rotate(joints.tailBase, 'y', Math.sin(phase) * 0.38);
    rotate(joints.tailMid, 'y', Math.sin(phase - 0.7) * 0.48);
    rotate(joints.tailFin, 'y', Math.sin(phase - 1.2) * 0.55);
    rotate(joints.legL, 'x', 0.35 + Math.sin(phase) * 0.08);
    rotate(joints.legR, 'x', 0.35 - Math.sin(phase) * 0.08);
    if (joints.motionRoot) joints.motionRoot.position.y += Math.sin(phase * 0.5) * 0.04;
  } else {
    const gait = moving ? Math.sin(phase) : 0;
    rotate(joints.legL, 'x', gait * 0.4);
    rotate(joints.legR, 'x', -gait * 0.4);
    rotate(joints.upperArmL, 'x', -gait * 0.2);
    rotate(joints.upperArmR, 'x', gait * 0.2);
    if (joints.chest) joints.chest.rotation.x += moving ? 0.08 : 0.05;
    if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase)) * 0.025 : Math.sin(phase * 0.4) * 0.006;
  }
}

function animateMurgaLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 2.8 : 1.35) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.36);
  rotate(joints.legR, 'x', -gait * 0.36);
  rotate(joints.upperArmL, 'x', -gait * 0.12);
  rotate(joints.upperArmR, 'x', gait * 0.12);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase)) * 0.026 : Math.sin(phase * 0.45) * 0.006;
  if (joints.chest) joints.chest.rotation.y += moving ? gait * 0.06 : 0;
  if (joints.chest) joints.chest.rotation.x += 0.06;
}

function animateAldrenLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 2.7 : 1.1) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.34);
  rotate(joints.legR, 'x', -gait * 0.34);
  rotate(joints.armL, 'x', -gait * 0.12);
  rotate(joints.armR, 'x', gait * 0.1);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase)) * 0.018 : 0;
  if (joints.shieldRoot) joints.shieldRoot.rotation.y += moving ? 0.1 : 0;
}

function animateMalcorLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 5.0 : 1.5) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.48);
  rotate(joints.legR, 'x', -gait * 0.48);
  rotate(joints.upperArmL, 'x', -gait * 0.34);
  rotate(joints.upperArmR, 'x', gait * 0.34);
  if (joints.spineLower) joints.spineLower.rotation.x += moving ? 0.34 : 0.22;
  if (joints.neck) joints.neck.rotation.x += moving ? -0.18 : -0.08;
  if (joints.motionRoot && moving) joints.motionRoot.position.y += Math.max(0, Math.sin(phase * 2)) * 0.04;
}

function animateArvekLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 2.2 : 0.9) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.27);
  rotate(joints.legR, 'x', -gait * 0.27);
  rotate(joints.armL, 'x', -gait * 0.08);
  rotate(joints.armR, 'x', gait * 0.07);
  if (joints.motionRoot) joints.motionRoot.position.y += moving ? Math.abs(Math.sin(phase)) * 0.012 : 0;
  if (joints.chest) joints.chest.rotation.y += moving ? gait * 0.04 : 0;
}

function animateIdle(joints, definition, time, agent) {
  const profile = definition.visual.animationProfile;
  const primary = getHeroAnimationClip(profile, 'idle-primary');
  const secondary = getHeroAnimationClip(profile, 'idle-secondary');
  if (primary) sampleClip(primary, (time + seed(agent.id)) % primary.duration / primary.duration, joints, 1);
  if (secondary) sampleClip(secondary, (time * 0.73 + seed(agent.id) * 2) % secondary.duration / secondary.duration, joints, 0.75);
}


function animatePevLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 4.8 : 1.5) + seed(agent.id);
  applyVolumePreservingSquash(joints.blobRoot, Math.sin(phase) * (moving ? 0.14 : 0.045), Math.sin(phase * 0.5) * 0.025);
  if (joints.motionRoot) joints.motionRoot.position.y += Math.max(0, Math.sin(phase)) * (moving ? 0.08 : 0.018);
  if (joints.artifactOrbit) joints.artifactOrbit.rotation.y += time * (moving ? 0.42 : 0.18);
  rotate(joints.crest, 'z', Math.sin(phase * 0.72) * 0.08);
}

function animateEighthCocoonLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? (agent.heroStatuses?.feralShell ? 6.2 : 4.0) : 1.4) + seed(agent.id);
  for (let i = 0; i < 8; i += 1) {
    const local = phase + (i % 4) * 0.72 + (i >= 4 ? Math.PI : 0);
    rotate(joints[`leg${i}a`], 'y', Math.sin(local) * (moving ? 0.26 : 0.025));
    rotate(joints[`leg${i}b`], 'z', (i < 4 ? -1 : 1) * Math.cos(local) * (moving ? 0.33 : 0.035));
    rotate(joints[`leg${i}c`], 'z', (i < 4 ? 1 : -1) * Math.max(0, Math.sin(local)) * (moving ? 0.22 : 0.02));
  }
  if (joints.thorax) joints.thorax.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.025 : Math.sin(phase * 0.5) * 0.008;
  if (joints.knightChest) joints.knightChest.rotation.z += Math.sin(phase * 0.45) * (moving ? 0.035 : 0.015);
}

function animateEmptyQueenLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 3.1 : 1.0) + seed(agent.id);
  const carriers = Math.max(1, agent.carrierCount ?? 5);
  for (let i = 0; i < 5; i += 1) {
    const root = joints[`carrier${i}`];
    if (!root) continue;
    const active = i < carriers;
    root.visible = active;
    if (active) {
      rotate(root, 'z', Math.sin(phase + i * 0.9) * (moving ? 0.09 : 0.025));
      root.position.y += Math.max(0, Math.sin(phase * 2 + i * 0.8)) * (moving ? 0.06 : 0.01);
    }
  }
  if (joints.sacRoot) {
    joints.sacRoot.position.y += Math.sin(phase * 0.72) * 0.035;
    joints.sacRoot.scale.y *= 1 + Math.sin(phase * 1.2) * 0.035;
  }
  rotate(joints.queenCrown, 'y', Math.sin(phase * 0.4) * 0.05);
}

function animateSuccessorLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 3.8 : 1.1) + seed(agent.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.34);
  rotate(joints.legR, 'x', -gait * 0.34);
  rotate(joints.armL, 'x', -gait * 0.17);
  rotate(joints.armR, 'x', gait * 0.17);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase)) * 0.02 : Math.sin(phase * 0.5) * 0.005;
  if (joints.shadow) {
    joints.shadow.position.z -= moving ? 0.15 + Math.abs(gait) * 0.08 : 0.08;
    joints.shadow.rotation.y += -gait * 0.08;
  }
  if (agent.heroStatuses?.shedPrince && joints.extraArms) joints.extraArms.rotation.y += Math.sin(phase * 2.2) * 0.12;
}

function animateGardenerLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? 1.9 : 0.55) + seed(agent.id);
  for (let i = 0; i < 4; i += 1) {
    const local = phase + i * Math.PI * 0.5;
    rotate(joints[`rootLeg${i}`], 'x', Math.sin(local) * (moving ? 0.16 : 0.015));
    rotate(joints[`rootFoot${i}`], 'z', Math.cos(local) * (moving ? 0.18 : 0.02));
  }
  if (joints.trunk) joints.trunk.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.025 : Math.sin(phase) * 0.01;
  rotate(joints.crown, 'z', Math.sin(phase * 0.42) * 0.025);
  rotate(joints.gardenBed, 'x', Math.sin(phase * 0.55) * 0.02);
}

function animateGoldcrownLocomotion(joints, agent, time, moving) {
  const phase = time * (moving ? (agent.heroStatuses?.royalMolt ? 4.7 : 3.0) : 0.9) + seed(agent.id);
  for (let i = 0; i < 10; i += 1) rotate(joints[`leg${i}`], 'z', (i % 2 ? -1 : 1) * Math.sin(phase + i * 0.58) * (moving ? 0.22 : 0.018));
  rotate(joints.body1, 'y', Math.sin(phase * 0.72) * (moving ? 0.08 : 0.025));
  rotate(joints.body2, 'y', Math.sin(phase * 0.72 - 0.55) * (moving ? 0.1 : 0.03));
  rotate(joints.body3, 'y', Math.sin(phase * 0.72 - 1.1) * (moving ? 0.12 : 0.035));
  if (joints.motionRoot) joints.motionRoot.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.018 : 0;
  if (joints.crown) joints.crown.rotation.y += time * 0.08;
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
  if (definition.id === 'hero.jijik') {
    rotate(joints.mechanicalShoulder, 'x', combat.phase === 'impact' ? 0.72 : -progress * 0.72);
    rotate(joints.toolRotor, 'y', combat.phase === 'impact' ? 0.5 : -progress * 0.35);
    return;
  }
  if (definition.id === 'hero.tissa') {
    rotate(joints.shoulderL, 'x', combat.phase === 'impact' ? 0.72 : -progress * 0.82);
    rotate(joints.harpoon, 'z', combat.phase === 'impact' ? 0.28 : -progress * 0.35);
    return;
  }
  if (definition.id === 'hero.murga') {
    rotate(joints.shoulderR, 'x', combat.phase === 'impact' ? 0.8 : -progress * 0.9);
    rotate(joints.cleaverRoot, 'z', combat.phase === 'impact' ? 0.75 : -progress * 0.72);
    rotate(joints.chest, 'y', combat.phase === 'impact' ? 0.35 : -progress * 0.22);
    return;
  }
  if (definition.id === 'hero.aldren') {
    rotate(joints.shoulderL, 'x', combat.phase === 'impact' ? 0.55 : -progress * 0.65);
    rotate(joints.shieldRoot, 'z', combat.phase === 'impact' ? -0.35 : progress * 0.2);
    rotate(joints.swordRoot, 'x', combat.phase === 'impact' ? 0.5 : -progress * 0.72);
    return;
  }
  if (definition.id === 'hero.malcor') {
    rotate(joints.spineLower, 'x', combat.phase === 'impact' ? -0.15 : 0.25 + progress * 0.2);
    rotate(joints.shoulderR, 'x', combat.phase === 'impact' ? 0.9 : -progress * 0.75);
    rotate(joints.jaw, 'x', combat.phase === 'impact' ? -0.8 : -progress * 0.2);
    return;
  }
  if (definition.id === 'hero.arvek') {
    rotate(joints.shoulderR, 'x', combat.phase === 'impact' ? 0.75 : -progress * 0.72);
    rotate(joints.swordRoot, 'z', combat.phase === 'impact' ? 0.62 : -progress * 0.58);
    rotate(joints.shieldRoot, 'y', combat.phase === 'impact' ? 0.2 : -progress * 0.15);
    return;
  }
  if (definition.id === 'hero.pev') {
    applyVolumePreservingSquash(joints.blobRoot, combat.phase === 'impact' ? -0.2 : progress * 0.14, 0.04);
    rotate(joints.artifactOrbit, 'y', combat.phase === 'impact' ? 0.6 : -progress * 0.35);
    return;
  }
  if (definition.id === 'hero.eighth-cocoon') {
    rotate(joints.lanceRoot, 'x', combat.phase === 'impact' ? 0.72 : -progress * 0.92);
    rotate(joints.knightChest, 'y', combat.phase === 'impact' ? 0.24 : -progress * 0.16);
    return;
  }
  if (definition.id === 'hero.empty-queen-hand') {
    rotate(joints.queenCrown, 'x', combat.phase === 'impact' ? 0.34 : -progress * 0.24);
    if (joints.sacRoot) joints.sacRoot.scale.y *= combat.phase === 'impact' ? 0.88 : 1 + progress * 0.08;
    return;
  }
  if (definition.id === 'hero.failed-successor') {
    rotate(joints.armR, 'x', combat.phase === 'impact' ? 0.72 : -progress * 0.68);
    rotate(joints.chest, 'y', combat.phase === 'impact' ? 0.28 : -progress * 0.2);
    return;
  }
  if (definition.id === 'hero.sleeping-gardener') {
    rotate(joints.armL, 'z', combat.phase === 'impact' ? -0.8 : progress * 0.55);
    rotate(joints.armR, 'z', combat.phase === 'impact' ? 0.8 : -progress * 0.55);
    rotate(joints.trunk, 'y', combat.phase === 'impact' ? 0.24 : -progress * 0.14);
    return;
  }
  if (definition.id === 'hero.goldcrown-back') {
    rotate(joints.rakeL, 'x', combat.phase === 'impact' ? -0.7 : progress * 0.4);
    rotate(joints.rakeR, 'x', combat.phase === 'impact' ? -0.7 : progress * 0.4);
    rotate(joints.body0, 'x', combat.phase === 'impact' ? -0.16 : progress * 0.12);
    return;
  }
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
  if (definition.id === 'hero.aldren') {
    rotate(joints.cloakL, 'z', Math.sin(phase * 1.15) * 0.045);
    rotate(joints.cloakR, 'z', -Math.sin(phase * 1.05 + 0.35) * 0.045);
    rotate(joints.commandChain, 'y', Math.sin(phase * 1.4) * 0.04);
    if (joints.soulCore) joints.soulCore.scale.y *= 0.92 + Math.sin(phase * 4.2) * 0.08;
  }
  if (definition.id === 'hero.malcor') {
    rotate(joints.coatTailL, 'z', Math.sin(phase * 1.55) * 0.08);
    rotate(joints.coatTailR, 'z', -Math.sin(phase * 1.42 + 0.6) * 0.08);
    rotate(joints.vaporRoot, 'y', phase * 0.08);
    if (agent.heroStatuses?.ghoulFrenzy) rotate(joints.jaw, 'x', -0.2);
  }
  if (definition.id === 'hero.arvek') {
    rotate(joints.keyRing, 'y', phase * 0.07);
    rotate(joints.chainCloak, 'z', Math.sin(phase * 0.85) * 0.035);
    if (agent.heroStatuses?.gateLockdown) {
      rotate(joints.shieldRoot, 'y', -0.18);
      rotate(joints.crossbar, 'z', -0.08);
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
  if (definition.id === 'hero.aldren') {
    rotate(joints.cloakL, 'z', Math.sin(phase * 1.1) * 0.055);
    rotate(joints.cloakR, 'z', -Math.sin(phase * 1.05 + 0.4) * 0.055);
    if (joints.commandChain) joints.commandChain.rotation.y += phase * 0.05;
    if (agent.heroStatuses?.royalFormation) rotate(joints.shieldRoot, 'y', 0.24);
  }
  if (definition.id === 'hero.malcor') {
    rotate(joints.coatTailL, 'z', Math.sin(phase * 1.4) * 0.09);
    rotate(joints.coatTailR, 'z', -Math.sin(phase * 1.3 + 0.5) * 0.09);
    rotate(joints.jaw, 'x', Math.sin(phase * 0.8) * 0.06);
    if (joints.vaporRoot) joints.vaporRoot.rotation.y += phase * 0.08;
  }
  if (definition.id === 'hero.arvek') {
    if (joints.keyRing) joints.keyRing.rotation.y += phase * 0.04;
    rotate(joints.chainCloak, 'z', Math.sin(phase * 0.75) * 0.035);
    if (agent.heroStatuses?.gateLockdown) {
      if (joints.shieldRoot) joints.shieldRoot.position.z += 0.18;
      if (joints.crossbar) joints.crossbar.position.z -= 0.12;
    }
  }
  if (definition.id === 'hero.pev') {
    if (joints.artifactOrbit) joints.artifactOrbit.rotation.y += phase * 0.08;
    const adaptation = agent.heroAdaptation ?? 'clear';
    if (joints.metalPlateL) joints.metalPlateL.visible = adaptation === 'metal';
    if (joints.metalPlateR) joints.metalPlateR.visible = adaptation === 'metal';
    if (joints.fungalCap) joints.fungalCap.visible = adaptation === 'fungal';
    if (joints.spectralTail) joints.spectralTail.visible = adaptation === 'spectral';
    if (agent.heroStatuses?.borrowedShape) rotate(joints.crest, 'y', Math.sin(phase * 2.4) * 0.16);
  }
  if (definition.id === 'hero.eighth-cocoon') {
    rotate(joints.silkRig, 'y', Math.sin(phase * 0.8) * 0.06);
    if (agent.heroStatuses?.feralShell) {
      if (joints.knightChest) joints.knightChest.visible = false;
      rotate(joints.fangL, 'x', -0.24);
      rotate(joints.fangR, 'x', -0.24);
    }
  }
  if (definition.id === 'hero.empty-queen-hand') {
    if (joints.egg0) joints.egg0.scale.setScalar(0.94 + Math.sin(phase * 2) * 0.06);
    if (joints.egg1) joints.egg1.scale.setScalar(0.94 + Math.sin(phase * 2 + 0.9) * 0.06);
    if (joints.egg2) joints.egg2.scale.setScalar(0.94 + Math.sin(phase * 2 + 1.8) * 0.06);
    if (agent.heroStatuses?.queenDomain && joints.sacRoot) joints.sacRoot.scale.set(1.12, 1.18, 1.12);
  }
  if (definition.id === 'hero.failed-successor') {
    rotate(joints.coatL, 'z', Math.sin(phase * 1.1) * 0.045);
    rotate(joints.coatR, 'z', -Math.sin(phase * 1.05 + 0.4) * 0.045);
    if (joints.shadow) joints.shadow.rotation.y += phase * 0.04;
    if (agent.heroStatuses?.shedPrince) {
      if (joints.mask) joints.mask.visible = false;
      if (joints.parasiteFace) joints.parasiteFace.visible = true;
      if (joints.extraArms) joints.extraArms.visible = true;
    }
  }
  if (definition.id === 'hero.sleeping-gardener') {
    const season = agent.heroSeason ?? 'spring';
    if (joints.gardenBed) joints.gardenBed.rotation.y += phase * 0.018;
    if (season === 'winter') rotate(joints.crown, 'x', 0.12);
    if (season === 'summer') rotate(joints.armL, 'z', -0.08);
    if (agent.gardenAwake && joints.motionRoot) joints.motionRoot.position.y += 0.05;
  }
  if (definition.id === 'hero.goldcrown-back') {
    if (joints.trophies) joints.trophies.rotation.y += phase * 0.025;
    if (joints.glow) joints.glow.scale.setScalar(0.9 + Math.sin(phase * 3.2) * 0.08);
    if (agent.heroStatuses?.royalMolt && joints.carapace) joints.carapace.visible = false;
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
  } else if (definition.id === 'hero.pev') {
    const spectral = agent.heroAdaptation === 'spectral';
    for (const material of materials) {
      if (material?.transparent) material.opacity = clamp((spectral ? 0.46 : 0.68) + Math.sin(time * 2.2) * 0.04, 0.3, 0.78);
      if ('emissiveIntensity' in material) material.emissiveIntensity = spectral ? 0.42 : 0.18;
    }
  }
}

function animateHeroSummonMiniature(mesh, agent, time) {
  const joints = mesh.userData.joints ?? {};
  resetJoints(joints);
  const moving = Boolean(agent?.travel) || agent?.mood === 'retreating';
  const phase = time * (moving ? 4.4 : 1.7) + seed(agent?.id);
  const gait = moving ? Math.sin(phase) : 0;
  rotate(joints.legL, 'x', gait * 0.4);
  rotate(joints.legR, 'x', -gait * 0.4);
  rotate(joints.armL, 'x', -gait * 0.26);
  rotate(joints.armR, 'x', gait * 0.26);
  if (agent?.heroSummonKind === 'ghoul') {
    rotate(joints.body, 'x', 0.32 + Math.sin(phase * 0.5) * 0.04);
    rotate(joints.head, 'x', -0.18);
  } else if (agent?.heroSummonKind === 'spectral-guard') {
    if (joints.motionRoot) joints.motionRoot.position.y += Math.sin(phase) * 0.05;
    if (joints.accent) joints.accent.rotation.y += time * 0.25;
  }
  if (agent?.combat) {
    const progress = clamp(agent.combat.progress ?? 0, 0, 1);
    rotate(joints.armR, 'x', agent.combat.phase === 'impact' ? 0.8 : -progress * 0.7);
  }
  return true;
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

function animatePhysicalSecondary(mesh, joints, definition, time, agent) {
  const phase = time + seed(agent.id);
  const moving = Boolean(agent.travel) || agent.mood === 'retreating';
  if (definition.id === 'hero.jijik') {
    const recoil = agent.heroCast?.skillId === 'jijik-air-cannon' || agent.heroCast?.skillId === 'jijik-three-point-barrage' ? -0.16 : moving ? -0.04 : 0;
    springRotation(mesh, joints.powderPack, 'jijik:powder-pack', 'z', Math.sin(phase * 1.4) * 0.035 - (moving ? 0.05 : 0), { stiffness: 45, damping: 9 });
    springRotation(mesh, joints.mechanicalShoulder, 'jijik:heavy-arm', 'z', Math.sin(phase * 1.1) * 0.025 + (moving ? 0.04 : 0), { stiffness: 58, damping: 12 });
    springPosition(mesh, joints.recoilBrace, 'jijik:recoil-brace', 'z', recoil, { stiffness: 85, damping: 16 });
    springRotation(mesh, joints.fuseRoot, 'jijik:fuse-crown', 'z', Math.sin(phase * 2.3) * 0.035, { stiffness: 28, damping: 6 });
    if (joints.toolRotor && !agent.heroCast) joints.toolRotor.rotation.y += Math.sin(phase * 0.7) * 0.04;
  }
  if (definition.id === 'hero.tissa') {
    const swim = agent.heroAquaticMode ? 1 : 0;
    springRotation(mesh, joints.tailBase, 'tissa:tail-base', 'y', Math.sin(phase * (swim ? 3.8 : 1.4)) * (swim ? 0.32 : 0.14), { stiffness: 34, damping: 7 });
    springRotation(mesh, joints.tailMid, 'tissa:tail-mid', 'y', Math.sin(phase * (swim ? 3.8 : 1.4) - 0.7) * (swim ? 0.42 : 0.18), { stiffness: 29, damping: 6 });
    springRotation(mesh, joints.tailFin, 'tissa:tail-fin', 'y', Math.sin(phase * (swim ? 3.8 : 1.4) - 1.2) * (swim ? 0.5 : 0.22), { stiffness: 25, damping: 5.5 });
    springRotation(mesh, joints.hoseL, 'tissa:hose-left', 'z', Math.sin(phase * 1.6) * 0.08, { stiffness: 24, damping: 5 });
    springRotation(mesh, joints.hoseR, 'tissa:hose-right', 'z', -Math.sin(phase * 1.55 + 0.3) * 0.08, { stiffness: 24, damping: 5 });
    springRotation(mesh, joints.tankRoot, 'tissa:tanks', 'x', moving ? -0.05 : Math.sin(phase) * 0.015, { stiffness: 48, damping: 10 });
  }
  if (definition.id === 'hero.murga') {
    const setDown = agent.heroCast?.skillId === 'murga-blood-root-broth';
    springRotation(mesh, joints.cauldronRoot, 'murga:cauldron-swing', 'z', Math.sin(phase * 1.15) * (moving ? 0.08 : 0.035), { stiffness: 30, damping: 6.5, maxVelocity: 4 });
    springRotation(mesh, joints.cauldronRoot, 'murga:cauldron-pitch', 'x', setDown ? -0.3 : moving ? 0.06 : 0, { stiffness: 44, damping: 9 });
    springRotation(mesh, joints.lid, 'murga:lid', 'x', Math.sin(phase * 2.1) * 0.035, { stiffness: 26, damping: 5.5 });
    springRotation(mesh, joints.chainRoot, 'murga:chain', 'z', Math.sin(phase * 1.8) * 0.11 + (moving ? -0.08 : 0), { stiffness: 22, damping: 4.8 });
    springRotation(mesh, joints.necklace, 'murga:necklace', 'z', Math.sin(phase * 2.25) * 0.09, { stiffness: 24, damping: 5 });
    springRotation(mesh, joints.pouchL, 'murga:pouch-left', 'z', Math.sin(phase * 1.65) * 0.06, { stiffness: 24, damping: 5 });
    springRotation(mesh, joints.pouchR, 'murga:pouch-right', 'z', -Math.sin(phase * 1.55 + 0.5) * 0.06, { stiffness: 24, damping: 5 });
    if (agent.heroStatuses?.butchering) {
      rotate(joints.chest, 'x', 0.28);
      rotate(joints.hookRoot, 'z', -0.45 + Math.sin(phase * 7) * 0.16);
    }
  }

  if (definition.id === 'hero.pev') {
    springRotation(mesh, joints.crest, 'pev:crest', 'z', Math.sin(phase * 1.8) * 0.08, { stiffness: 22, damping: 6 });
    springRotation(mesh, joints.spectralTail, 'pev:tail', 'z', Math.sin(phase * 1.35) * 0.14, { stiffness: 17, damping: 5 });
  }
  if (definition.id === 'hero.eighth-cocoon') {
    springRotation(mesh, joints.shieldRoot, 'cocoon:shield', 'z', Math.sin(phase * 1.2) * 0.045, { stiffness: 38, damping: 9 });
    springRotation(mesh, joints.silkRig, 'cocoon:silk', 'y', Math.sin(phase * 1.5) * 0.08, { stiffness: 20, damping: 6 });
  }
  if (definition.id === 'hero.empty-queen-hand') {
    springRotation(mesh, joints.sacRoot, 'queen:sac', 'z', Math.sin(phase * 0.8) * 0.04, { stiffness: 22, damping: 7 });
    springRotation(mesh, joints.queenCrown, 'queen:crown', 'y', Math.sin(phase * 0.6) * 0.06, { stiffness: 30, damping: 9 });
  }
  if (definition.id === 'hero.failed-successor') {
    springRotation(mesh, joints.coatL, 'successor:coatL', 'z', Math.sin(phase * 1.1) * 0.055, { stiffness: 22, damping: 7 });
    springRotation(mesh, joints.coatR, 'successor:coatR', 'z', -Math.sin(phase * 1.05 + 0.4) * 0.055, { stiffness: 22, damping: 7 });
    springPosition(mesh, joints.shadow, 'successor:shadow', 'z', moving ? -0.18 : -0.08, { stiffness: 18, damping: 6 });
  }
  if (definition.id === 'hero.sleeping-gardener') {
    springRotation(mesh, joints.gardenBed, 'gardener:bed', 'z', Math.sin(phase * 0.72) * 0.025, { stiffness: 25, damping: 8 });
    springRotation(mesh, joints.nest, 'gardener:nest', 'z', Math.sin(phase * 1.4) * 0.055, { stiffness: 20, damping: 6 });
  }
  if (definition.id === 'hero.goldcrown-back') {
    springRotation(mesh, joints.trophies, 'goldcrown:trophies', 'z', Math.sin(phase * 1.15) * (moving ? 0.055 : 0.02), { stiffness: 32, damping: 10 });
    springRotation(mesh, joints.crown, 'goldcrown:crown', 'z', Math.sin(phase * 1.45) * 0.035, { stiffness: 38, damping: 12 });
  }

}

function configureSkillParts(mesh, definition, agent) {
  const parts = mesh.userData.skillParts ?? {};
  if (definition.id === 'hero.jijik') {
    const skillId = agent.heroCast?.skillId;
    if (parts.toolHammer) parts.toolHammer.visible = !skillId || skillId === 'jijik-breach-charge';
    if (parts.toolNozzle) parts.toolNozzle.visible = skillId === 'jijik-air-cannon';
    if (parts.toolMortar) parts.toolMortar.visible = skillId === 'jijik-three-point-barrage';
  }
  if (definition.id === 'hero.murga' && parts.chainRoot) {
    parts.chainRoot.scale.y = agent.heroCast?.skillId === 'murga-butchers-hook' || agent.heroStatuses?.butchering ? 1.4 : 1;
  }
  if (definition.id === 'hero.pev') {
    if (parts.bubbleFilm) parts.bubbleFilm.visible = agent.heroCast?.skillId === 'pev-purifying-bubble';
    const adaptation = agent.heroAdaptation ?? 'clear';
    for (const name of ['metalPlateL','metalPlateR']) if (parts[name]) parts[name].visible = adaptation === 'metal';
    if (parts.fungalCap) parts.fungalCap.visible = adaptation === 'fungal';
    if (parts.spectralTail) parts.spectralTail.visible = adaptation === 'spectral';
  }
  if (definition.id === 'hero.eighth-cocoon') {
    if (parts.knightChest) parts.knightChest.visible = !agent.heroStatuses?.feralShell;
    if (parts.shieldRoot) parts.shieldRoot.visible = !agent.heroStatuses?.feralShell;
  }
  if (definition.id === 'hero.failed-successor') {
    const shed = Boolean(agent.heroStatuses?.shedPrince);
    if (parts.mask) parts.mask.visible = !shed;
    if (parts.parasiteFace) parts.parasiteFace.visible = shed;
    if (parts.extraArms) parts.extraArms.visible = shed;
  }
  if (definition.id === 'hero.goldcrown-back' && parts.carapace) parts.carapace.visible = !agent.heroStatuses?.royalMolt;
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
    marker.userData ??= {};
    marker.userData.heroBaseY ??= marker.position.y;
    marker.rotation.y = time * 0.72;
    marker.position.y = marker.userData.heroBaseY + Math.sin(time * 2.2 + seed(agent.id)) * 0.04;
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
