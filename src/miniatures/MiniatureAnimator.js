export function animateEliteMiniature(mesh, agent, time = 0) {
  if (!mesh?.userData?.articulated) return false;
  const joints = mesh.userData.joints ?? {};
  resetJoints(joints);
  const profile = mesh.userData.animationProfile ?? 'biped';
  const phase = time * movementFrequency(agent, profile) + numericSeed(agent.id);
  const moving = Boolean(agent.travel) || agent.mood === 'retreating' || agent.mood === 'phase-stepping';

  if (profile.includes('arachnid') || joints.leg0) animateArachnid(joints, phase, moving);
  else if (profile.includes('flying')) animateFlying(joints, phase, moving);
  else if (profile.includes('swarm') || joints.swarm0) animateSwarm(joints, phase);
  else if (profile.includes('fungal') || joints.stem) animateFungal(joints, phase, moving);
  else if (profile.includes('construct') || joints.chassis) animateConstruct(joints, phase, moving);
  else if (profile.includes('crawler') || joints.abdomen && !joints.pelvis) animateCrawler(joints, phase, moving);
  else animateBiped(joints, phase, moving, agent);

  if (agent.eliteCast) animateCast(joints, agent.eliteCast, profile);
  else if (agent.combat) animateCombat(joints, agent.combat);
  else animateIdle(joints, phase, profile);

  animateStatuses(mesh, joints, agent, phase);
  animateDamage(mesh, agent);
  animateSpawn(mesh, agent);
  return true;
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

function animateBiped(joints, phase, moving, agent) {
  const gait = moving ? Math.sin(phase) : 0;
  const weight = ['large', 'huge'].includes(agent.size) ? 0.55 : 1;
  rotate(joints.legL, 'x', gait * 0.55 * weight);
  rotate(joints.legR, 'x', -gait * 0.55 * weight);
  rotate(joints.upperArmL, 'x', -gait * 0.38 * weight);
  rotate(joints.upperArmR, 'x', gait * 0.38 * weight);
  if (joints.pelvis) joints.pelvis.position.y += moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : 0;
  if (joints.chest && moving) joints.chest.rotation.y += gait * 0.07;
}

function animateArachnid(joints, phase, moving) {
  for (let i = 0; i < 10; i += 1) {
    const leg = joints[`leg${i}`];
    const knee = joints[`knee${i}`];
    if (!leg) continue;
    const offset = phase + i * 1.37;
    leg.rotation.y += Math.sin(offset) * (moving ? 0.24 : 0.05);
    leg.rotation.z += Math.cos(offset) * (moving ? 0.15 : 0.04);
    if (knee) knee.rotation.z += Math.sin(offset + 0.8) * (moving ? 0.32 : 0.06);
  }
  if (joints.body) joints.body.position.y += Math.sin(phase * 2) * 0.02;
  if (joints.abdomen) joints.abdomen.rotation.y += Math.sin(phase * 0.6) * 0.05;
}

function animateFlying(joints, phase, moving) {
  if (joints.motionRoot) joints.motionRoot.position.y += Math.sin(phase * 1.7) * 0.09;
  for (const [name, joint] of Object.entries(joints)) if (name.includes('wing')) joint.rotation.z += Math.sin(phase * 4) * 0.8;
  if (moving && joints.chest) joints.chest.rotation.x -= 0.16;
}

function animateSwarm(joints, phase) {
  for (let i = 0; i < 20; i += 1) {
    const node = joints[`swarm${i}`];
    if (!node) continue;
    node.position.y += Math.sin(phase * 1.4 + i * 0.73) * 0.08;
    node.rotation.y += phase * 0.08 + i * 0.1;
  }
}

function animateFungal(joints, phase, moving) {
  if (joints.stem) joints.stem.rotation.z += Math.sin(phase * 0.45) * 0.05;
  if (joints.cap) {
    const pulse = 1 + Math.sin(phase * 0.7) * 0.025;
    joints.cap.scale.set(pulse, 1 / pulse, pulse);
  }
  if (moving && joints.pelvis) joints.pelvis.position.y += Math.abs(Math.sin(phase)) * 0.025;
  rotate(joints.armL, 'z', Math.sin(phase * 0.7) * 0.12);
  rotate(joints.armR, 'z', -Math.sin(phase * 0.7) * 0.12);
}

function animateConstruct(joints, phase, moving) {
  for (let i = 0; i < 8; i += 1) {
    const leg = joints[`leg${i}`];
    if (leg) leg.rotation.z += Math.sin(phase + i * 1.4) * (moving ? 0.22 : 0.03);
  }
  if (joints.front) joints.front.rotation.z += moving ? phase * 0.1 : 0;
  if (joints.chassis) joints.chassis.position.y += Math.sin(phase * 2.2) * (moving ? 0.025 : 0.01);
  if (joints.core) joints.core.rotation.y += 0.03;
}

function animateCrawler(joints, phase, moving) {
  if (joints.body) joints.body.rotation.y += Math.sin(phase) * (moving ? 0.12 : 0.03);
  if (joints.abdomen) joints.abdomen.rotation.y -= Math.sin(phase - 0.6) * (moving ? 0.1 : 0.02);
  for (let i = 0; i < 12; i += 1) {
    const leg = joints[`leg${i}`];
    if (leg) leg.rotation.z += Math.sin(phase + i * 0.9) * (moving ? 0.28 : 0.05);
  }
}

function animateIdle(joints, phase, profile) {
  const breath = Math.sin(phase * 0.52) * 0.025;
  if (joints.chest) joints.chest.scale.y += breath;
  if (joints.head) joints.head.rotation.y += Math.sin(phase * 0.24) * 0.08;
  if (profile.includes('spectral') && joints.tail) joints.tail.rotation.z += Math.sin(phase * 0.7) * 0.12;
}

function animateCast(joints, cast, profile) {
  const progress = clamp(cast.elapsed / Math.max(0.001, cast.duration), 0, 1);
  const eased = smoothstep(progress);
  if (cast.phase === 'windup') {
    if (joints.chest) joints.chest.rotation.y -= eased * 0.45;
    rotate(joints.shoulderR ?? joints.armR, 'x', -eased * 1.25);
    rotate(joints.shoulderL ?? joints.armL, 'x', -eased * 0.7);
    if (joints.head) joints.head.rotation.x -= eased * 0.25;
    if (joints.cap) joints.cap.scale.setScalar(1 + eased * 0.12);
    if (joints.abdomen) joints.abdomen.scale.setScalar(1 + eased * 0.08);
    if (joints.chassis) joints.chassis.rotation.z += Math.sin(progress * Math.PI * 8) * eased * 0.035;
  } else if (cast.phase === 'impact') {
    if (joints.chest) joints.chest.rotation.y += 0.65;
    rotate(joints.shoulderR ?? joints.armR, 'x', 0.9);
    if (joints.motionRoot) joints.motionRoot.position.y += 0.08;
  } else {
    const back = 1 - eased;
    if (joints.chest) joints.chest.rotation.y += back * 0.22;
  }
  if (cast.abilityId?.includes('bell') || cast.abilityId?.includes('toll')) {
    if (joints.chassis) joints.chassis.rotation.z += Math.sin(progress * Math.PI) * 0.5;
    if (joints.core) joints.core.rotation.z -= Math.sin(progress * Math.PI) * 0.9;
  }
  if (cast.abilityId?.includes('charge') || cast.abilityId?.includes('rush')) {
    if (joints.motionRoot) joints.motionRoot.rotation.x -= eased * 0.28;
  }
}

function animateCombat(joints, combat) {
  const progress = clamp(combat.progress ?? 0, 0, 1);
  if (combat.phase === 'windup') {
    rotate(joints.shoulderR ?? joints.armR, 'x', -progress * 1.1);
    if (joints.chest) joints.chest.rotation.y -= progress * 0.3;
  } else if (combat.phase === 'impact') {
    rotate(joints.shoulderR ?? joints.armR, 'x', 0.85);
    if (joints.chest) joints.chest.rotation.y += 0.45;
  }
}

function animateStatuses(mesh, joints, agent, phase) {
  if (agent.eliteStatuses?.stunned) {
    if (joints.head) joints.head.rotation.z += Math.sin(phase * 3) * 0.18;
    if (joints.motionRoot) joints.motionRoot.rotation.z += 0.08;
  }
  if (agent.eliteStatuses?.fear) {
    if (joints.motionRoot) joints.motionRoot.position.x += Math.sin(phase * 5) * 0.025;
  }
  const ring = mesh.getObjectByName?.('elite-ring');
  if (ring) {
    ring.rotation.z += 0.01;
    const cast = agent.eliteCast;
    ring.material.opacity = cast ? 0.95 : 0.68;
    ring.scale.setScalar(cast ? 1 + Math.sin(phase * 2) * 0.08 : 1);
  }
}

function animateDamage(mesh, agent) {
  const ratio = Math.max(0, Math.min(1, (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? 1)));
  let index = 0;
  mesh.traverse?.(node => {
    if (!String(node.name ?? '').startsWith('elite-kit:')) return;
    index += 1;
    if (index % 4 === 0) node.visible = ratio > 0.25;
    else if (index % 5 === 0) node.visible = ratio > 0.5;
    else node.visible = true;
  });
}

function animateSpawn(mesh, agent) {
  const remaining = agent.eliteSpawnRemaining ?? 0;
  const base = mesh.userData.baseScale ?? 1;
  if (remaining <= 0) { mesh.scale.setScalar(base); return; }
  const total = ['huge'].includes(agent.size) ? 2.4 : ['large'].includes(agent.size) ? 1.8 : 1.2;
  const progress = clamp(1 - remaining / total, 0.08, 1);
  mesh.scale.setScalar(base * smoothstep(progress));
}

function rotate(joint, axis, amount) {
  if (joint) joint.rotation[axis] += amount;
}

function movementFrequency(agent, profile) {
  if (profile.includes('heavy') || ['large', 'huge'].includes(agent.size)) return 2.2;
  if (profile.includes('arachnid')) return 5.2;
  if (profile.includes('swarm')) return 6.5;
  return 4;
}

function numericSeed(value) {
  let result = 0;
  for (const char of String(value ?? '')) result = (result * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(result % 1000) / 100;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
