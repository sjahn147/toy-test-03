import { THREE } from '../ThreeScene.js';

const COLORS = {
  'goblin-brass': 0xd3a64f,
  'goblin-teal': 0x66c8bb,
  'kobold-copper': 0xc0843c,
  'kobold-blue': 0x78cbd5,
  'orc-red': 0xc64e45,
  'orc-bright-red': 0xff6954,
  'undead-veil': 0x678aa5,
  'undead-crown': 0xc5e9f2,
  'fungal-blue': 0x5e96b5,
  'fungal-gold': 0xe0bc72,
  'slime-gold': 0xe4c65c,
  'slime-teal': 0x56bdb0,
  'goblin-orange': 0xff8242,
  'goblin-air': 0xa8d8d5,
  'kobold-water': 0x72d3e5,
  'orc-ember': 0xe36b42,
  'royal-blue': 0x6f9fd1,
  'royal-soul': 0xa9e3ff,
  'ghast-green': 0x9bcf83,
  'death-knight-blue': 0x6b98b8,
  'slime-clear': 0xa8f4e5,
  'slime-adaptive': 0x79d7c6,
  'spider-silver': 0xc9c4d4,
  'spider-red': 0xc86172,
  'spider-rose': 0xe49bae,
  'parasite-white': 0xe7e0f2,
  'parasite-pale': 0xcab6da,
  'garden-green': 0x8fbd72,
  'garden-gold': 0xd8b765,
  'garden-prismatic': 0xb8cf8a,
  'carrion-gold': 0xd3aa52,
  hero: 0xf2d47c
};

export function createHeroEffect(effect) {
  if (!String(effect?.type ?? '').startsWith('hero-')) return null;
  const group = new THREE.Group();
  group.name = `hero-effect:${effect.type}:${effect.skillId ?? effect.heroId ?? effect.formKind ?? ''}`;
  group.userData.heroEffect = true;
  group.userData.effectType = effect.type;
  group.userData.shape = effect.shape ?? defaultShape(effect.type, effect);
  group.userData.baseRadius = effect.radius ?? 2;
  group.userData.baseOpacity = 0.74;
  group.userData.formKind = effect.formKind ?? null;
  const color = COLORS[effect.colorRole] ?? COLORS.hero;
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: group.userData.baseOpacity, depthWrite: false });

  if (effect.type === 'hero-route-lock') buildRouteWall(group, material, effect);
  else if (effect.type === 'hero-armor-drop') buildArmorDrop(group, material);
  else if (effect.type === 'hero-interrupt') buildInterrupt(group, material);
  else if (effect.type === 'hero-passive') buildPassive(group, material);
  else if (effect.type === 'hero-form-reveal') buildFormReveal(group, material, effect);
  else if (effect.type === 'hero-form-merge') buildFormMerge(group, material, effect);
  else if (effect.type === 'hero-form-effect') buildFormEffect(group, material, effect);
  else if (effect.type === 'hero-explosion') buildExplosion(group, material, effect.radius ?? 3);
  else if (effect.type === 'hero-air-blast' || effect.type === 'hero-water-jet') buildPressureStream(group, material, effect);
  else if (effect.type === 'hero-hook-line') buildHookLine(group, material, effect.length ?? 5.5);
  else if (effect.type === 'hero-feast-burst') buildFeastBurst(group, material, effect.radius ?? 6);
  else if (effect.type === 'hero-submerged-reveal') buildDrainSpiral(group, material, effect.radius ?? 3.5);
  else if (effect.type === 'hero-butcher-complete') buildButcherBurst(group, material);
  else if (effect.type === 'hero-formation-impact') buildShieldImpact(group, material);
  else if (effect.type === 'hero-necromancy-rite') buildNecromancyRite(group, material, effect);
  else if (effect.type === 'hero-summon-emerge') buildSummonEmerge(group, material, effect);
  else if (effect.type === 'hero-ghast-retch') buildGhastRetch(group, material);
  else if (effect.type === 'hero-barrier-rise' || effect.type === 'hero-barrier-hit' || effect.type === 'hero-barrier-fall') buildSpectralGateWall(group, material, effect);
  else if (effect.type === 'hero-gate-collision') buildGateCollision(group, material);
  else buildShape(group, group.userData.shape, effect.radius ?? 2, material, effect);
  captureEffectBaseTransforms(group);
  return group;
}

export function animateHeroEffect(mesh, effect, age, progress) {
  if (!mesh?.userData?.heroEffect) return false;
  const shape = mesh.userData.shape;
  resetEffectBaseTransforms(mesh);
  const pulse = 1 + Math.sin(age * 7) * 0.04;
  mesh.rotation.y = rotatingShape(shape) ? age * rotationSpeed(shape) : 0;
  mesh.scale.setScalar(pulse);

  if (effect.type === 'hero-telegraph') {
    const appear = Math.min(1, age * 4);
    mesh.scale.multiplyScalar(0.82 + appear * 0.18);
    setOpacity(mesh, Math.max(0.18, 0.32 + progress * 0.62));
    animateShapeParts(mesh, shape, age, progress, true);
  } else if (effect.type === 'hero-impact') {
    mesh.scale.multiplyScalar(0.7 + progress * 1.5);
    setOpacity(mesh, Math.max(0, 1 - progress));
    animateShapeParts(mesh, shape, age, progress, false);
  } else if (effect.type === 'hero-route-lock' || effect.type === 'hero-zone' || effect.type === 'hero-duel') {
    setOpacity(mesh, 0.48 + Math.sin(age * 3) * 0.14);
    animateShapeParts(mesh, shape, age, progress, false);
  } else if (effect.type === 'hero-explosion' || effect.type === 'hero-air-blast' || effect.type === 'hero-water-jet' || effect.type === 'hero-feast-burst') {
    mesh.scale.multiplyScalar(0.55 + progress * 1.65);
    setOpacity(mesh, Math.max(0, 1 - progress));
  } else if (effect.type === 'hero-hook-line') {
    mesh.scale.z = 0.4 + Math.sin(Math.min(1, progress) * Math.PI) * 0.8;
    setOpacity(mesh, Math.max(0, 1 - progress * 0.8));
  } else if (effect.type === 'hero-armor-drop') {
    mesh.rotation.z = age * 0.5;
    setOpacity(mesh, Math.max(0.2, 1 - progress * 0.7));
  } else if (effect.type === 'hero-form-reveal') {
    const rise = smoothstep(progress);
    offsetEffectChildren(mesh, rise * 0.65);
    mesh.scale.multiplyScalar(0.25 + rise * 1.25);
    setOpacity(mesh, Math.sin(Math.PI * progress));
    animateNamed(mesh, 'form-orbit', age * 1.8, rise * 0.24);
  } else if (effect.type === 'hero-form-merge') {
    const inverse = 1 - progress;
    mesh.scale.multiplyScalar(0.35 + inverse * 1.45);
    mesh.rotation.y = age * 2.1;
    setOpacity(mesh, Math.max(0, inverse));
  } else if (effect.type === 'hero-form-effect') {
    mesh.scale.multiplyScalar(0.65 + Math.sin(progress * Math.PI) * 0.9);
    setOpacity(mesh, Math.max(0, 1 - progress));
  } else {
    setOpacity(mesh, Math.max(0, 1 - progress));
  }
  return true;
}

function buildShape(group, shape, radius, material, effect = {}) {
  if (shape === 'route-wall') return buildRouteWall(group, material, { radius });
  if (shape === 'key-sigil') return buildKeySigil(group, material, radius);
  if (shape === 'outward-arrows') return buildOutwardArrows(group, material, radius);
  if (shape === 'three-gear-circle') return buildGearCircle(group, material, radius);
  if (shape === 'wrench-arc') return buildWrenchArc(group, material, radius);
  if (shape === 'triangle') return buildTriangle(group, material, radius);
  if (shape === 'duel-ring') return buildDuelRing(group, material, radius);
  if (shape === 'shattering-armor') return buildShatteringArmor(group, material, radius);
  if (shape === 'mourning-veil') return buildMourningVeil(group, material, radius);
  if (shape === 'soul-procession') return buildSoulProcession(group, material, radius);
  if (shape === 'ethereal-domain') return buildEtherealDomain(group, material, radius);
  if (shape === 'fungal-lance') return buildFungalLance(group, material, effect.length ?? radius * 2.4, effect.width ?? 0.8);
  if (shape === 'memory-flower') return buildMemoryFlower(group, material, radius);
  if (shape === 'solitary-bloom') return buildSolitaryBloom(group, material, radius);
  if (shape === 'royal-sigil') return buildRoyalSigil(group, material, radius);
  if (shape === 'digest-spiral') return buildDigestSpiral(group, material, radius);
  if (shape === 'triune-court') return buildTriuneCourt(group, material, radius);
  if (shape === 'charge-cross') return buildChargeCross(group, material, radius);
  if (shape === 'pressure-cone' || shape === 'water-cone') return buildPressureCone(group, material, radius);
  if (shape === 'three-impact-rings') return buildThreeImpactRings(group, material, radius);
  if (shape === 'route-seal') return buildRouteSeal(group, material, radius);
  if (shape === 'drain-spiral') return buildDrainSpiral(group, material, radius);
  if (shape === 'cauldron-hearth') return buildCauldronHearth(group, material, radius);
  if (shape === 'hook-line') return buildHookLine(group, material, effect.length ?? radius);
  if (shape === 'feast-ring') return buildFeastRing(group, material, radius);
  if (shape === 'command-line') return buildCommandLine(group, material, effect.length ?? radius, effect.width ?? 0.8);
  if (shape === 'shield-wedge') return buildShieldWedge(group, material, effect.length ?? radius, effect.width ?? 2.4);
  if (shape === 'three-grave-sigils') return buildThreeGraveSigils(group, material, radius);
  if (shape === 'ghast-scream-cone') return buildGhastScreamCone(group, material, effect.length ?? radius, effect.width ?? 3.5);
  if (shape === 'corpse-grasp') return buildCorpseGrasp(group, material, radius);
  if (shape === 'carrion-banquet-ring') return buildCarrionBanquetRing(group, material, radius);
  if (shape === 'spectral-gate-wall') return buildSpectralGateWall(group, material, effect);
  if (shape === 'door-shield-charge') return buildDoorShieldCharge(group, material, effect.length ?? radius, effect.width ?? 1.6);
  if (shape === 'all-gates-closing') return buildAllGatesClosing(group, material, radius);
  if (shape === 'purifying-bubble') return buildBubbleSigil(group, material, radius);
  if (shape === 'borrowed-silhouette') return buildMirroredSilhouette(group, material, radius);
  if (shape === 'fourfold-adaptation') return buildFourfoldAdaptation(group, material, radius);
  if (shape === 'needle-line') return buildNeedleLine(group, material, effect.length ?? radius, effect.width ?? 0.7);
  if (shape === 'silk-kite-shield') return buildSilkShield(group, material, radius);
  if (shape === 'shattering-cuirass') return buildShatteringCuirass(group, material, radius);
  if (shape === 'royal-egg-sigil') return buildRoyalEggSigil(group, material, radius);
  if (shape === 'radiating-silk-orders') return buildRadiatingSilk(group, material, radius);
  if (shape === 'fivefold-brood-crown') return buildFivefoldCrown(group, material, radius);
  if (shape === 'mirrored-gesture') return buildMirroredGesture(group, material, radius);
  if (shape === 'counterfeit-royal-seal') return buildCounterfeitSeal(group, material, radius);
  if (shape === 'porcelain-mask-fracture') return buildMaskFracture(group, material, radius);
  if (shape === 'rooted-orchard') return buildRootedOrchard(group, material, radius);
  if (shape === 'crossing-pruning-arcs') return buildPruningArcs(group, material, radius);
  if (shape === 'four-season-wheel') return buildSeasonWheel(group, material, radius);
  if (shape === 'low-raking-charge') return buildLowRakingCharge(group, material, effect.length ?? radius, effect.width ?? 1.7);
  if (shape === 'relic-shard-fan') return buildRelicFan(group, material, radius);
  if (shape === 'splitting-reliquary-shell') return buildReliquaryShell(group, material, radius);
  return buildRing(group, material, radius);
}

function buildRing(group, material, radius) {
  const ring = namedMesh('pulse-ring', new THREE.TorusGeometry(radius, 0.055, 8, 48), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.035;
  group.add(ring);
}

function buildRouteWall(group, material, effect) {
  const width = Math.max(2.4, effect?.radius ?? 4);
  for (const x of [-width / 2, width / 2]) {
    const post = namedMesh('route-post', new THREE.BoxGeometry(0.12, 1.25, 0.12), material);
    post.position.set(x, 0.62, 0);
    group.add(post);
  }
  for (let i = 0; i < 3; i += 1) {
    const bar = namedMesh('route-bar', new THREE.BoxGeometry(width, 0.08, 0.08), material);
    bar.position.y = 0.28 + i * 0.35;
    group.add(bar);
  }
  const lock = namedMesh('route-lock', new THREE.TorusGeometry(0.22, 0.05, 8, 24), material);
  lock.position.y = 0.78;
  lock.rotation.x = Math.PI / 2;
  group.add(lock);
}

function buildKeySigil(group, material, radius) {
  buildRing(group, material, Math.max(0.8, radius * 0.55));
  const shaft = namedMesh('key-shaft', new THREE.BoxGeometry(0.1, 0.05, radius * 1.2), material);
  shaft.position.y = 0.06;
  group.add(shaft);
  const tooth = namedMesh('key-tooth', new THREE.BoxGeometry(0.42, 0.05, 0.12), material);
  tooth.position.set(0.2, 0.06, radius * 0.42);
  group.add(tooth);
}

function buildOutwardArrows(group, material, radius) {
  buildRing(group, material, radius * 0.55);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const arrow = namedMesh('outward-arrow', new THREE.ConeGeometry(0.14, 0.45, 5), material);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.z = -angle;
    arrow.position.set(Math.cos(angle) * radius * 0.78, 0.08, Math.sin(angle) * radius * 0.78);
    group.add(arrow);
  }
}

function buildGearCircle(group, material, radius) {
  buildRing(group, material, radius);
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
    const gear = new THREE.Group();
    gear.name = 'gear-orbit';
    const hub = namedMesh('gear-hub', new THREE.TorusGeometry(radius * 0.2, 0.04, 6, 20), material);
    hub.rotation.x = Math.PI / 2;
    gear.add(hub);
    for (let tooth = 0; tooth < 8; tooth += 1) {
      const item = namedMesh('gear-tooth', new THREE.BoxGeometry(0.13, 0.04, 0.25), material);
      const toothAngle = tooth / 8 * Math.PI * 2;
      item.position.set(Math.cos(toothAngle) * radius * 0.27, 0, Math.sin(toothAngle) * radius * 0.27);
      item.rotation.y = -toothAngle;
      gear.add(item);
    }
    gear.position.set(Math.cos(angle) * radius * 0.48, 0.05, Math.sin(angle) * radius * 0.48);
    group.add(gear);
  }
}

function buildWrenchArc(group, material, radius) {
  const arc = namedMesh('wrench-arc', new THREE.TorusGeometry(radius * 0.65, 0.05, 8, 32, Math.PI * 1.4), material);
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = -Math.PI * 0.2;
  group.add(arc);
  const jawA = namedMesh('wrench-jaw', new THREE.BoxGeometry(0.12, 0.05, 0.5), material);
  jawA.position.set(radius * 0.46, 0.05, -radius * 0.36);
  jawA.rotation.y = 0.5;
  const jawB = jawA.clone();
  jawB.position.x += 0.22;
  jawB.rotation.y = -0.2;
  group.add(jawA, jawB);
}

function buildTriangle(group, material, radius) {
  const points = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  for (let i = 0; i < 3; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % 3];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const edge = namedMesh('triangle-edge', new THREE.BoxGeometry(length, 0.05, 0.08), material);
    edge.position.set((a[0] + b[0]) / 2, 0.05, (a[1] + b[1]) / 2);
    edge.rotation.y = -Math.atan2(dz, dx);
    group.add(edge);
  }
}

function buildDuelRing(group, material, radius) {
  buildRing(group, material, radius);
  for (const angle of [0, Math.PI]) {
    const blade = namedMesh('duel-blade', new THREE.ConeGeometry(0.1, 0.9, 4), material);
    blade.position.set(Math.cos(angle) * radius * 0.65, 0.18, Math.sin(angle) * radius * 0.65);
    blade.rotation.z = Math.PI / 2;
    blade.rotation.y = angle;
    group.add(blade);
  }
}

function buildShatteringArmor(group, material, radius) {
  for (let i = 0; i < 10; i += 1) {
    const shard = namedMesh('armor-shard', new THREE.ConeGeometry(0.08, 0.42, 4), material);
    const angle = i / 10 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * radius * 0.6, 0.2 + (i % 3) * 0.12, Math.sin(angle) * radius * 0.6);
    shard.rotation.z = angle;
    group.add(shard);
  }
}

function buildMourningVeil(group, material, radius) {
  buildRing(group, material, radius);
  const inner = namedMesh('veil-inner-ring', new THREE.TorusGeometry(radius * 0.62, 0.035, 7, 40), material);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.04;
  group.add(inner);
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    const veil = namedMesh('veil-panel', new THREE.ConeGeometry(0.24, 1.5, 5, 1, true), material);
    veil.position.set(Math.cos(angle) * radius * 0.82, 0.74, Math.sin(angle) * radius * 0.82);
    veil.rotation.z = Math.PI;
    veil.rotation.y = -angle;
    veil.scale.z = 0.35;
    veil.userData.phase = i * 0.57;
    group.add(veil);
  }
}

function buildSoulProcession(group, material, radius) {
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const z = -radius + (i / (count - 1)) * radius * 2;
    const left = namedMesh('procession-step', new THREE.ConeGeometry(0.13, 0.36, 5), material);
    left.rotation.x = Math.PI / 2;
    left.position.set(i % 2 ? -0.26 : 0.26, 0.055, z);
    left.userData.phase = i * 0.3;
    group.add(left);
  }
  for (const x of [-0.75, 0.75]) {
    const guide = namedMesh('procession-guide', new THREE.BoxGeometry(0.045, 0.035, radius * 2.1), material);
    guide.position.set(x, 0.03, 0);
    group.add(guide);
  }
}

function buildEtherealDomain(group, material, radius) {
  buildRing(group, material, radius);
  const middle = namedMesh('domain-middle', new THREE.TorusGeometry(radius * 0.68, 0.035, 7, 44), material);
  middle.rotation.x = Math.PI / 2;
  middle.position.y = 0.045;
  group.add(middle);
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    const pillar = namedMesh('domain-pillar', new THREE.BoxGeometry(0.07, 1.2 + (i % 3) * 0.22, 0.07), material);
    pillar.position.set(Math.cos(angle) * radius * 0.86, 0.55, Math.sin(angle) * radius * 0.86);
    pillar.userData.phase = i * 0.43;
    group.add(pillar);
  }
}

function buildFungalLance(group, material, length, width) {
  const safeLength = Math.max(2.4, length);
  const lane = namedMesh('lance-lane', new THREE.BoxGeometry(Math.max(0.4, width), 0.035, safeLength), material);
  lane.position.set(0, 0.035, safeLength * 0.5);
  group.add(lane);
  for (let i = 0; i < 5; i += 1) {
    const root = namedMesh('lance-root', new THREE.ConeGeometry(0.12 + i * 0.015, 0.45 + i * 0.06, 6), material);
    root.position.set((i % 2 ? -1 : 1) * width * 0.38, 0.18, safeLength * (0.14 + i * 0.18));
    root.rotation.z = i % 2 ? -0.5 : 0.5;
    root.userData.phase = i * 0.45;
    group.add(root);
  }
  const tip = namedMesh('lance-tip', new THREE.ConeGeometry(width * 0.42, 0.75, 6), material);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.12, safeLength + 0.32);
  group.add(tip);
}

function buildMemoryFlower(group, material, radius) {
  buildRing(group, material, radius);
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    const petal = namedMesh('memory-petal', new THREE.ConeGeometry(radius * 0.18, radius * 0.62, 7), material);
    petal.position.set(Math.cos(angle) * radius * 0.44, 0.055, Math.sin(angle) * radius * 0.44);
    petal.rotation.x = Math.PI / 2;
    petal.rotation.z = -angle;
    petal.scale.z = 0.34;
    petal.userData.phase = i * 0.61;
    group.add(petal);
  }
  const center = namedMesh('memory-center', new THREE.SphereGeometry(radius * 0.15, 12, 8), material);
  center.position.y = 0.12;
  group.add(center);
}

function buildSolitaryBloom(group, material, radius) {
  buildRing(group, material, radius);
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    const spike = namedMesh('solitary-root-spike', new THREE.ConeGeometry(0.1, radius * 0.58, 6), material);
    spike.position.set(Math.cos(angle) * radius * 0.62, 0.18, Math.sin(angle) * radius * 0.62);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = -angle;
    spike.userData.phase = i * 0.34;
    group.add(spike);
  }
  const cap = namedMesh('solitary-cap', new THREE.ConeGeometry(radius * 0.42, 0.32, 12), material);
  cap.rotation.x = Math.PI;
  cap.position.y = 0.22;
  group.add(cap);
}

function buildRoyalSigil(group, material, radius) {
  buildRing(group, material, radius);
  const crownBase = namedMesh('royal-crown-base', new THREE.BoxGeometry(radius * 0.85, 0.045, 0.15), material);
  crownBase.position.set(0, 0.06, 0);
  group.add(crownBase);
  for (let i = -2; i <= 2; i += 1) {
    const tooth = namedMesh('royal-crown-tooth', new THREE.ConeGeometry(0.13, 0.5 + (2 - Math.abs(i)) * 0.09, 5), material);
    tooth.position.set(i * radius * 0.17, 0.18, 0);
    group.add(tooth);
  }
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const line = namedMesh('royal-command-line', new THREE.BoxGeometry(0.06, 0.035, radius * 0.62), material);
    line.position.set(Math.sin(angle) * radius * 0.31, 0.03, Math.cos(angle) * radius * 0.31);
    line.rotation.y = angle;
    group.add(line);
  }
}

function buildDigestSpiral(group, material, radius) {
  for (let i = 0; i < 14; i += 1) {
    const t = i / 13;
    const angle = t * Math.PI * 3.4;
    const distance = radius * (0.18 + t * 0.75);
    const bead = namedMesh('digest-bead', new THREE.SphereGeometry(0.08 + t * 0.05, 8, 6), material);
    bead.position.set(Math.cos(angle) * distance, 0.08 + t * 0.12, Math.sin(angle) * distance);
    bead.userData.phase = i * 0.3;
    group.add(bead);
  }
  const core = namedMesh('digest-core', new THREE.SphereGeometry(radius * 0.16, 12, 8), material);
  core.position.y = 0.16;
  group.add(core);
}

function buildTriuneCourt(group, material, radius) {
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
    const court = new THREE.Group();
    court.name = 'court-orbit';
    court.position.set(Math.cos(angle) * radius * 0.52, 0.05, Math.sin(angle) * radius * 0.52);
    const ring = namedMesh('court-ring', new THREE.TorusGeometry(radius * 0.24, 0.045, 7, 28), material);
    ring.rotation.x = Math.PI / 2;
    court.add(ring);
    const markerGeometry = i === 0
      ? new THREE.ConeGeometry(radius * 0.12, 0.48, 5)
      : i === 1
        ? new THREE.BoxGeometry(radius * 0.25, 0.38, 0.12)
        : new THREE.SphereGeometry(radius * 0.12, 10, 7);
    const marker = namedMesh(`court-marker-${i}`, markerGeometry, material);
    marker.position.y = 0.22;
    court.add(marker);
    group.add(court);
  }
  buildRing(group, material, radius);
}

function buildChargeCross(group, material, radius) {
  buildRing(group, material, radius);
  for (const rotation of [0, Math.PI / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.4, 0.05, 0.08), material);
    bar.rotation.y = rotation;
    bar.position.y = 0.04;
    group.add(bar);
  }
  for (let i = 0; i < 4; i += 1) {
    const charge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 8), material);
    const angle = Math.PI / 4 + i * Math.PI / 2;
    charge.position.set(Math.cos(angle) * radius * 0.55, 0.18, Math.sin(angle) * radius * 0.55);
    charge.rotation.z = Math.PI / 2;
    group.add(charge);
  }
}

function buildPressureCone(group, material, radius) {
  const segments = 7;
  for (let i = 0; i < segments; i += 1) {
    const t = (i + 1) / segments;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(radius * t, 0.035, 6, 20, Math.PI * 0.38), material);
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = Math.PI * (0.5 - 0.19);
    arc.position.z = radius * t * 0.12;
    group.add(arc);
  }
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(radius, 0.04, 0.05), material);
    edge.position.set(side * radius * 0.18, 0.04, radius * 0.46);
    edge.rotation.y = side * -0.34;
    group.add(edge);
  }
}

function buildThreeImpactRings(group, material, radius) {
  const points = [[-radius * 0.36, -radius * 0.14], [radius * 0.34, radius * 0.2], [0.04, -radius * 0.4]];
  for (let i = 0; i < points.length; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (0.25 - i * 0.035), 0.05, 8, 32), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(points[i][0], 0.05 + i * 0.015, points[i][1]);
    group.add(ring);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), material);
    marker.position.set(points[i][0], 0.24, points[i][1]);
    marker.rotation.x = Math.PI;
    group.add(marker);
  }
}

function buildRouteSeal(group, material, radius) {
  buildRouteWall(group, material, { radius: Math.max(2.4, radius) });
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 28), material);
  wheel.position.y = 0.72;
  wheel.rotation.x = Math.PI / 2;
  group.add(wheel);
  for (let i = 0; i < 4; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), material);
    spoke.position.y = 0.72;
    spoke.rotation.z = i * Math.PI / 4;
    group.add(spoke);
  }
}

function buildDrainSpiral(group, material, radius) {
  for (let i = 0; i < 4; i += 1) {
    const spiral = new THREE.Mesh(new THREE.TorusGeometry(radius * (0.22 + i * 0.18), 0.04, 6, 36, Math.PI * 1.7), material);
    spiral.rotation.x = Math.PI / 2;
    spiral.rotation.z = i * 0.7;
    group.add(spiral);
  }
}

function buildCauldronHearth(group, material, radius) {
  buildRing(group, material, radius);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.18, 12, 8, 0, Math.PI * 2, 0.2, Math.PI * 0.65), material);
  pot.scale.y = 0.65;
  pot.position.y = 0.28;
  group.add(pot);
  for (let i = 0; i < 6; i += 1) {
    const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), material);
    const angle = i / 6 * Math.PI * 2;
    ember.position.set(Math.cos(angle) * radius * 0.25, 0.08, Math.sin(angle) * radius * 0.25);
    group.add(ember);
  }
}

function buildHookLine(group, material, length) {
  const links = 14;
  for (let i = 0; i < links; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 10), material);
    link.position.z = i / Math.max(1, links - 1) * length;
    link.position.y = Math.sin(i / Math.max(1, links - 1) * Math.PI) * -0.18;
    link.rotation.x = i % 2 ? Math.PI / 2 : 0;
    group.add(link);
  }
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 7, 18, Math.PI * 1.4), material);
  hook.position.z = length;
  hook.rotation.y = Math.PI / 2;
  group.add(hook);
}

function buildFeastRing(group, material, radius) {
  buildRing(group, material, radius);
  for (let i = 0; i < 10; i += 1) {
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), material);
    const angle = i / 10 * Math.PI * 2;
    marker.position.set(Math.cos(angle) * radius * 0.75, 0.12, Math.sin(angle) * radius * 0.75);
    marker.rotation.z = -angle;
    group.add(marker);
  }
}

function buildExplosion(group, material, radius) {
  for (let i = 0; i < 12; i += 1) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.08, radius * 0.75, 5), material);
    const angle = i / 12 * Math.PI * 2;
    ray.position.set(Math.cos(angle) * radius * 0.25, 0.25, Math.sin(angle) * radius * 0.25);
    ray.rotation.z = Math.PI / 2;
    ray.rotation.y = -angle;
    group.add(ray);
  }
  buildRing(group, material, radius * 0.45);
}

function buildPressureStream(group, material, effect) {
  const length = effect.length ?? 5;
  for (let i = 0; i < 8; i += 1) {
    const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, length * (0.45 + i * 0.045), 6), material);
    streak.rotation.x = Math.PI / 2;
    streak.position.set((i % 2 ? 1 : -1) * (0.12 + (i % 4) * 0.1), 0.2 + (i % 3) * 0.08, length * 0.25);
    streak.rotation.z = (i - 3.5) * 0.035;
    group.add(streak);
  }
}

function buildFeastBurst(group, material, radius) {
  buildFeastRing(group, material, radius);
  for (let i = 0; i < 8; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + i * 0.015, 8, 6), material);
    const angle = i / 8 * Math.PI * 2;
    puff.position.set(Math.cos(angle) * radius * 0.35, 0.35 + (i % 3) * 0.14, Math.sin(angle) * radius * 0.35);
    group.add(puff);
  }
}

function buildButcherBurst(group, material) {
  for (let i = 0; i < 6; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.38, 5), material);
    const angle = i / 6 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.35, 0.3, Math.sin(angle) * 0.35);
    shard.rotation.z = angle;
    group.add(shard);
  }
}

function buildFormReveal(group, material, effect) {
  const radius = effect.formKind?.startsWith?.('shade') ? 0.8 : 1.05;
  for (let i = 0; i < 3; i += 1) {
    const orbit = namedMesh('form-orbit', new THREE.TorusGeometry(radius * (0.55 + i * 0.16), 0.035, 6, 24), material);
    orbit.rotation.x = Math.PI / 2;
    orbit.rotation.z = i * Math.PI / 3;
    orbit.position.y = 0.12 + i * 0.18;
    group.add(orbit);
  }
  const rise = namedMesh('form-rise', new THREE.ConeGeometry(radius * 0.22, 1.4, 7, 1, true), material);
  rise.position.y = 0.55;
  rise.rotation.x = Math.PI;
  group.add(rise);
}

function buildFormMerge(group, material) {
  for (let i = 0; i < 3; i += 1) {
    const angle = i * Math.PI * 2 / 3;
    const orb = namedMesh('merge-orb', new THREE.SphereGeometry(0.18, 9, 7), material);
    orb.position.set(Math.cos(angle) * 1.1, 0.35, Math.sin(angle) * 1.1);
    group.add(orb);
  }
  buildDigestSpiral(group, material, 1.25);
}

function buildFormEffect(group, material, effect) {
  if (effect.formKind === 'scribe') {
    buildRoyalSigil(group, material, 1.2);
    return;
  }
  buildRing(group, material, 1.15);
  const flare = namedMesh('form-flare', new THREE.OctahedronGeometry(0.35, 0), material);
  flare.position.y = 0.55;
  group.add(flare);
}


function buildCommandLine(group, material, length, width) {
  const span = Math.max(3, length);
  const line = namedMesh('command-line', new THREE.BoxGeometry(span, 0.055, Math.max(0.08, width * 0.18)), material);
  line.position.y = 0.045;
  group.add(line);
  for (let i = 0; i < 5; i += 1) {
    const shield = namedMesh('command-shield', new THREE.BoxGeometry(0.42, 0.06, 0.58), material);
    shield.position.set((i / 4 - 0.5) * span, 0.08, 0);
    shield.rotation.x = Math.PI / 2;
    shield.userData.phase = i * 0.48;
    group.add(shield);
  }
  const sword = namedMesh('command-sword', new THREE.ConeGeometry(0.09, 0.9, 4), material);
  sword.position.set(0, 0.12, -0.55);
  sword.rotation.x = Math.PI / 2;
  group.add(sword);
}

function buildShieldWedge(group, material, length, width) {
  const safeLength = Math.max(2.5, length);
  for (const side of [-1, 1]) {
    const edge = namedMesh('shield-wedge-edge', new THREE.BoxGeometry(0.07, 0.05, safeLength), material);
    edge.position.set(side * width * 0.25, 0.045, safeLength * 0.5);
    edge.rotation.y = side * -0.16;
    group.add(edge);
  }
  for (let i = 0; i < 4; i += 1) {
    const plate = namedMesh('shield-wedge-plate', new THREE.BoxGeometry(width * (0.38 + i * 0.08), 0.06, 0.24), material);
    plate.position.set(0, 0.06, safeLength * (0.18 + i * 0.2));
    plate.userData.phase = i * 0.45;
    group.add(plate);
  }
}

function buildThreeGraveSigils(group, material, radius) {
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
    const grave = new THREE.Group();
    grave.name = 'grave-sigil';
    grave.userData.phase = i * 0.72;
    const ring = namedMesh('grave-ring', new THREE.TorusGeometry(0.52, 0.045, 7, 28), material);
    ring.rotation.x = Math.PI / 2;
    grave.add(ring);
    const blade = namedMesh('grave-blade', new THREE.BoxGeometry(0.09, 0.05, 0.8), material);
    blade.position.z = 0.08;
    grave.add(blade);
    const cross = namedMesh('grave-cross', new THREE.BoxGeometry(0.42, 0.05, 0.09), material);
    cross.position.z = -0.17;
    grave.add(cross);
    grave.position.set(Math.cos(angle) * radius * 0.55, 0.055, Math.sin(angle) * radius * 0.55);
    group.add(grave);
  }
}

function buildGhastScreamCone(group, material, length, width) {
  const safeLength = Math.max(3, length);
  for (let i = 0; i < 5; i += 1) {
    const z = safeLength * (i + 1) / 5;
    const wave = namedMesh('ghast-scream-wave', new THREE.TorusGeometry(Math.max(0.18, width * z / safeLength * 0.5), 0.04, 6, 30, Math.PI), material);
    wave.rotation.x = Math.PI / 2;
    wave.rotation.z = Math.PI / 2;
    wave.position.set(0, 0.12, z);
    wave.userData.phase = i * 0.46;
    group.add(wave);
  }
}

function buildCorpseGrasp(group, material, radius) {
  buildRing(group, material, radius * 0.7);
  for (let i = 0; i < 6; i += 1) {
    const angle = i / 6 * Math.PI * 2;
    const claw = namedMesh('corpse-claw', new THREE.ConeGeometry(0.08, 0.62, 5), material);
    claw.position.set(Math.cos(angle) * radius * 0.46, 0.14, Math.sin(angle) * radius * 0.46);
    claw.rotation.z = Math.PI / 2;
    claw.rotation.y = -angle;
    claw.userData.phase = i * 0.51;
    group.add(claw);
  }
}

function buildCarrionBanquetRing(group, material, radius) {
  buildRing(group, material, radius);
  const inner = namedMesh('banquet-inner-ring', new THREE.TorusGeometry(radius * 0.56, 0.035, 7, 40), material);
  inner.rotation.x = Math.PI / 2;
  group.add(inner);
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    const tooth = namedMesh('banquet-tooth', new THREE.ConeGeometry(0.11, 0.55, 5), material);
    tooth.position.set(Math.cos(angle) * radius * 0.78, 0.14, Math.sin(angle) * radius * 0.78);
    tooth.rotation.z = Math.PI / 2;
    tooth.rotation.y = -angle;
    tooth.userData.phase = i * 0.37;
    group.add(tooth);
  }
}

function buildSpectralGateWall(group, material, effect = {}) {
  const width = Math.max(2.6, effect.width ?? effect.radius ?? 4.2);
  for (const side of [-1, 1]) {
    const tower = namedMesh('spectral-gate-tower', new THREE.BoxGeometry(0.34, 2.2, 0.38), material);
    tower.position.set(side * width * 0.5, 1.1, 0);
    group.add(tower);
    const crown = namedMesh('spectral-gate-crown', new THREE.ConeGeometry(0.32, 0.72, 4), material);
    crown.position.set(side * width * 0.5, 2.55, 0);
    crown.rotation.y = Math.PI / 4;
    group.add(crown);
  }
  for (let i = 0; i < 5; i += 1) {
    const bar = namedMesh('spectral-gate-bar', new THREE.BoxGeometry(width, 0.09, 0.12), material);
    bar.position.y = 0.34 + i * 0.38;
    bar.userData.phase = i * 0.42;
    group.add(bar);
  }
  const bolt = namedMesh('spectral-gate-bolt', new THREE.BoxGeometry(width * 0.72, 0.18, 0.2), material);
  bolt.position.y = 1.16;
  group.add(bolt);
}

function buildDoorShieldCharge(group, material, length, width) {
  const lane = namedMesh('door-charge-lane', new THREE.BoxGeometry(Math.max(0.8, width), 0.04, Math.max(2.5, length)), material);
  lane.position.set(0, 0.04, Math.max(2.5, length) * 0.5);
  group.add(lane);
  const door = namedMesh('door-charge-shield', new THREE.BoxGeometry(Math.max(0.9, width * 0.72), 0.08, 1.1), material);
  door.position.set(0, 0.1, 0.65);
  door.userData.phase = 0.4;
  group.add(door);
}

function buildAllGatesClosing(group, material, radius) {
  buildRing(group, material, radius);
  for (let i = 0; i < 6; i += 1) {
    const angle = i / 6 * Math.PI * 2;
    const gate = namedMesh('closing-gate', new THREE.BoxGeometry(radius * 0.32, 0.08, 0.65), material);
    gate.position.set(Math.cos(angle) * radius * 0.72, 0.08, Math.sin(angle) * radius * 0.72);
    gate.rotation.y = -angle;
    gate.userData.phase = i * 0.52;
    group.add(gate);
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    const key = namedMesh('falling-key', new THREE.BoxGeometry(0.08, 0.08, 0.55), material);
    key.position.set(Math.cos(angle) * radius * 0.4, 0.15 + (i % 3) * 0.12, Math.sin(angle) * radius * 0.4);
    key.rotation.y = angle;
    key.userData.phase = i * 0.33;
    group.add(key);
  }
}

function buildShieldImpact(group, material) {
  for (let i = 0; i < 7; i += 1) {
    const angle = i / 7 * Math.PI * 2;
    const shard = namedMesh('shield-impact-shard', new THREE.ConeGeometry(0.07, 0.5, 4), material);
    shard.position.set(Math.cos(angle) * 0.55, 0.25, Math.sin(angle) * 0.55);
    shard.rotation.z = angle;
    group.add(shard);
  }
}

function buildNecromancyRite(group, material, effect = {}) {
  buildThreeGraveSigils(group, material, effect.radius ?? 3.4);
  const core = namedMesh('necromancy-core', new THREE.OctahedronGeometry(0.28, 0), material);
  core.position.y = 0.42;
  group.add(core);
}

function buildSummonEmerge(group, material, effect = {}) {
  buildRing(group, material, effect.radius ?? 1.2);
  for (let i = 0; i < 5; i += 1) {
    const bone = namedMesh('summon-bone', new THREE.CylinderGeometry(0.035, 0.045, 0.62, 6), material);
    const angle = i / 5 * Math.PI * 2;
    bone.position.set(Math.cos(angle) * 0.48, 0.22, Math.sin(angle) * 0.48);
    bone.rotation.z = angle;
    bone.userData.phase = i * 0.42;
    group.add(bone);
  }
}

function buildGhastRetch(group, material) {
  for (let i = 0; i < 7; i += 1) {
    const drop = namedMesh('ghast-retch-drop', new THREE.SphereGeometry(0.07 + (i % 3) * 0.02, 7, 5), material);
    drop.position.set((i % 2 ? -1 : 1) * 0.12 * (1 + i / 5), 0.3 + i * 0.08, 0.28 + i * 0.12);
    drop.userData.phase = i * 0.31;
    group.add(drop);
  }
}

function buildGateCollision(group, material) {
  const gate = namedMesh('gate-collision-door', new THREE.BoxGeometry(1.5, 1.8, 0.12), material);
  gate.position.y = 0.9;
  group.add(gate);
  for (let i = 0; i < 8; i += 1) {
    const shard = namedMesh('gate-collision-shard', new THREE.BoxGeometry(0.08, 0.38, 0.08), material);
    const angle = i / 8 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.8, 0.6 + (i % 3) * 0.2, Math.sin(angle) * 0.4);
    shard.rotation.z = angle;
    group.add(shard);
  }
}

function buildArmorDrop(group, material) {
  const plate = namedMesh('armor-drop', new THREE.BoxGeometry(0.8, 0.7, 0.18), material);
  plate.position.y = 0.35;
  plate.rotation.z = 0.25;
  group.add(plate);
}

function buildInterrupt(group, material) {
  for (let i = 0; i < 4; i += 1) {
    const slash = namedMesh('interrupt-slash', new THREE.BoxGeometry(0.08, 0.08, 1.1), material);
    slash.rotation.y = i * Math.PI / 2;
    slash.rotation.z = Math.PI / 4;
    group.add(slash);
  }
}

function buildPassive(group, material) {
  const diamond = namedMesh('passive-diamond', new THREE.OctahedronGeometry(0.45, 0), material);
  diamond.position.y = 0.6;
  group.add(diamond);
}


function buildBubbleSigil(group, material, radius) {
  buildRing(group, material, radius);
  for (let i=0;i<9;i+=1) { const a=i/9*Math.PI*2; const bubble=namedMesh('purity-bubble',new THREE.SphereGeometry(0.1+(i%3)*0.035,8,6),material); bubble.position.set(Math.cos(a)*radius*0.62,0.08+(i%2)*0.12,Math.sin(a)*radius*0.62); bubble.userData.phase=i*0.48; group.add(bubble); }
  const core=namedMesh('purity-core',new THREE.OctahedronGeometry(radius*0.14,0),material);core.position.y=0.16;group.add(core);
}
function buildMirroredSilhouette(group, material, radius) {
  for (const side of [-1,1]) { const torso=namedMesh('mirror-figure',new THREE.CapsuleGeometry(radius*0.08,radius*0.28,4,8),material);torso.position.set(side*radius*0.28,0.34,0);torso.scale.x=side;torso.userData.phase=side;group.add(torso); }
  const line=namedMesh('mirror-line',new THREE.BoxGeometry(0.04,0.04,radius*1.2),material);line.rotation.y=Math.PI/2;line.position.y=0.03;group.add(line);
}
function buildFourfoldAdaptation(group, material, radius) {
  buildRing(group,material,radius);const shapes=[new THREE.BoxGeometry(.36,.08,.36),new THREE.ConeGeometry(.18,.55,7),new THREE.SphereGeometry(.2,9,7),new THREE.TorusGeometry(.2,.04,6,20)];
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const node=namedMesh('adaptation-node',shapes[i],material);node.position.set(Math.cos(a)*radius*.62,.15,Math.sin(a)*radius*.62);node.userData.phase=i*Math.PI/2;group.add(node);}
}
function buildNeedleLine(group, material, length, width) { const line=namedMesh('needle-lane',new THREE.BoxGeometry(width,.04,length),material);line.position.set(0,.03,length*.5);group.add(line);for(let i=0;i<5;i++){const barb=namedMesh('needle-barb',new THREE.ConeGeometry(.09,.42,5),material);barb.rotation.x=Math.PI/2;barb.position.set((i%2?1:-1)*width*.55,.1,length*(.15+i*.18));barb.userData.phase=i*.4;group.add(barb);} }
function buildSilkShield(group,material,radius){for(let i=0;i<6;i++){const a=-Math.PI*.55+i*Math.PI*.22;const thread=namedMesh('silk-shield-thread',new THREE.BoxGeometry(.035,.035,radius*1.15),material);thread.position.set(Math.sin(a)*radius*.38,.18,Math.cos(a)*radius*.38);thread.rotation.y=a;thread.userData.phase=i*.45;group.add(thread);}const rim=namedMesh('silk-shield-rim',new THREE.TorusGeometry(radius*.62,.05,7,30,Math.PI),material);rim.rotation.x=Math.PI/2;rim.rotation.z=Math.PI;rim.position.z=radius*.15;group.add(rim);}
function buildShatteringCuirass(group,material,radius){const chest=namedMesh('cuirass-core',new THREE.BoxGeometry(radius*.5,.7,.18),material);chest.position.y=.4;group.add(chest);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const shard=namedMesh('cuirass-shard',new THREE.ConeGeometry(.09,.5,4),material);shard.position.set(Math.cos(a)*radius*.48,.28+(i%3)*.14,Math.sin(a)*radius*.48);shard.rotation.z=a;shard.userData.phase=i*.38;group.add(shard);}}
function buildRoyalEggSigil(group,material,radius){buildRing(group,material,radius);for(let i=0;i<3;i++){const a=-.8+i*.8;const egg=namedMesh('royal-egg',new THREE.SphereGeometry(radius*.16,10,8),material);egg.scale.y=1.35;egg.position.set(Math.sin(a)*radius*.42,.2,Math.cos(a)*radius*.28);egg.userData.phase=i*.8;group.add(egg);}}
function buildRadiatingSilk(group,material,radius){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const line=namedMesh('silk-order-line',new THREE.BoxGeometry(.035,.025,radius*.82),material);line.position.set(Math.sin(a)*radius*.41,.04,Math.cos(a)*radius*.41);line.rotation.y=a;line.userData.phase=i*.3;group.add(line);}buildRing(group,material,radius*.25);}
function buildFivefoldCrown(group,material,radius){buildRing(group,material,radius);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const claw=namedMesh('brood-crown-claw',new THREE.ConeGeometry(.16,radius*.55,6),material);claw.position.set(Math.cos(a)*radius*.58,.22,Math.sin(a)*radius*.58);claw.rotation.z=Math.PI/2;claw.rotation.y=-a;claw.userData.phase=i*.65;group.add(claw);}}
function buildMirroredGesture(group,material,radius){for(const side of [-1,1]){const arc=namedMesh('gesture-arc',new THREE.TorusGeometry(radius*.42,.055,7,30,Math.PI*1.2),material);arc.rotation.x=Math.PI/2;arc.rotation.z=side>0?.25:Math.PI+.25;arc.position.x=side*radius*.24;arc.userData.phase=side;group.add(arc);}const mask=namedMesh('gesture-mask',new THREE.BoxGeometry(.42,.56,.05),material);mask.position.y=.32;group.add(mask);}
function buildCounterfeitSeal(group,material,radius){buildRoyalSigil(group,material,radius);const slash=namedMesh('counterfeit-slash',new THREE.BoxGeometry(radius*1.25,.08,.08),material);slash.position.y=.12;slash.rotation.y=.72;group.add(slash);}
function buildMaskFracture(group,material,radius){const mask=namedMesh('fracture-mask',new THREE.BoxGeometry(radius*.42,.65,.08),material);mask.position.y=.4;group.add(mask);for(let i=0;i<7;i++){const crack=namedMesh('mask-crack-ray',new THREE.BoxGeometry(.025,.04,radius*.52),material);crack.position.y=.4;crack.rotation.y=i/7*Math.PI*2;crack.rotation.z=.2+(i%3)*.18;crack.userData.phase=i*.4;group.add(crack);}}
function buildRootedOrchard(group,material,radius){buildRing(group,material,radius);for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const root=namedMesh('orchard-root',new THREE.ConeGeometry(.07,radius*(.35+(i%3)*.09),6),material);root.rotation.z=Math.PI/2;root.rotation.y=-a;root.position.set(Math.cos(a)*radius*.38,.05,Math.sin(a)*radius*.38);root.userData.phase=i*.35;group.add(root);}for(let i=0;i<6;i++){const bloom=namedMesh('orchard-bloom',new THREE.SphereGeometry(.12,8,6),material);const a=i/6*Math.PI*2;bloom.position.set(Math.cos(a)*radius*.62,.18,Math.sin(a)*radius*.62);bloom.userData.phase=i*.65;group.add(bloom);}}
function buildPruningArcs(group,material,radius){for(const z of [-.28,.28]){const arc=namedMesh('pruning-arc',new THREE.TorusGeometry(radius*.55,.07,8,34,Math.PI*1.35),material);arc.rotation.x=Math.PI/2;arc.rotation.z=z<0?.6:Math.PI+.6;arc.position.z=z*radius;group.add(arc);} }
function buildSeasonWheel(group,material,radius){buildRing(group,material,radius);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const petal=namedMesh('season-quarter',i===0?new THREE.SphereGeometry(.16,8,6):i===1?new THREE.ConeGeometry(.13,.48,7):i===2?new THREE.DodecahedronGeometry(.16,0):new THREE.OctahedronGeometry(.17,0),material);petal.position.set(Math.cos(a)*radius*.58,.15,Math.sin(a)*radius*.58);petal.userData.phase=i*Math.PI/2;group.add(petal);} }
function buildLowRakingCharge(group,material,length,width){const lane=namedMesh('rake-lane',new THREE.BoxGeometry(width,.035,length),material);lane.position.set(0,.02,length*.5);group.add(lane);for(const side of [-1,1])for(let i=0;i<4;i++){const tine=namedMesh('rake-tine',new THREE.ConeGeometry(.07,.48,5),material);tine.rotation.x=Math.PI/2;tine.position.set(side*width*.42,.1,length*(.18+i*.19));tine.userData.phase=i*.4+side;group.add(tine);} }
function buildRelicFan(group,material,radius){for(let i=0;i<9;i++){const a=-.9+i*.225;const shard=namedMesh('relic-fan-shard',i%2?new THREE.BoxGeometry(.12,.08,.5):new THREE.ConeGeometry(.08,.5,5),material);shard.position.set(Math.sin(a)*radius*.42,.18,Math.cos(a)*radius*.42);shard.rotation.y=a;shard.userData.phase=i*.34;group.add(shard);} }
function buildReliquaryShell(group,material,radius){for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const plate=namedMesh('reliquary-plate',new THREE.BoxGeometry(radius*.28,.42,.08),material);plate.position.set(Math.cos(a)*radius*.52,.28+(i%2)*.18,Math.sin(a)*radius*.52);plate.rotation.y=-a;plate.rotation.z=(i%3-1)*.18;plate.userData.phase=i*.37;group.add(plate);}const crown=namedMesh('reliquary-crown',new THREE.TorusGeometry(radius*.24,.06,8,24),material);crown.rotation.x=Math.PI/2;crown.position.y=.65;group.add(crown);}

function animateShapeParts(root, shape, age, progress, telegraph) {
  root.traverse(node => {
    const phase = node.userData?.phase ?? 0;
    if (node.name === 'veil-panel') {
      node.rotation.z += Math.sin(age * 2.1 + phase) * 0.12;
      node.position.y += Math.sin(age * 1.5 + phase) * 0.06;
    } else if (node.name === 'domain-pillar') {
      node.scale.y *= 0.75 + Math.sin(age * 1.8 + phase) * 0.12 + progress * 0.25;
    } else if (node.name === 'procession-step') {
      node.position.y += Math.max(0, Math.sin(age * 5 + phase)) * 0.12;
    } else if (node.name === 'memory-petal') {
      node.rotation.y += Math.sin(age * 1.7 + phase) * 0.15;
      node.scale.x *= 0.85 + progress * 0.25;
    } else if (node.name === 'solitary-root-spike') {
      node.scale.y *= 0.7 + progress * 0.42;
    } else if (node.name === 'digest-bead') {
      node.rotation.y += age * 1.4 + phase;
      node.position.y += Math.sin(age * 3 + phase) * 0.035;
    } else if (node.name === 'lance-root') {
      node.scale.y *= telegraph ? 0.55 + progress * 0.7 : 1 + progress * 0.25;
    } else if (node.name === 'gear-orbit') {
      node.rotation.y += age * 0.6;
    } else if (node.name === 'court-orbit') {
      node.rotation.y += age * 0.35;
    } else if (node.name === 'command-shield' || node.name === 'shield-wedge-plate') {
      node.position.y += Math.sin(age * 3.2 + phase) * 0.025;
      node.scale.x *= 0.84 + progress * 0.18;
    } else if (node.name === 'grave-sigil' || node.name === 'falling-key') {
      node.rotation.y += age * (node.name === 'grave-sigil' ? 0.45 : 1.2) + phase * 0.05;
      node.position.y += Math.sin(age * 2.4 + phase) * 0.06;
    } else if (node.name === 'ghast-scream-wave') {
      node.scale.setScalar(0.7 + progress * 0.55 + Math.sin(age * 5 + phase) * 0.06);
    } else if (node.name === 'corpse-claw' || node.name === 'banquet-tooth') {
      node.rotation.z += Math.sin(age * 3.5 + phase) * 0.16;
    } else if (node.name === 'spectral-gate-bar') {
      node.scale.x *= 0.55 + progress * 0.5;
      node.material.opacity = Math.max(0.15, 0.35 + Math.sin(age * 4 + phase) * 0.15);
    } else if (node.name === 'closing-gate') {
      node.position.x *= 1 - progress * 0.22;
      node.position.z *= 1 - progress * 0.22;
    } else if (node.name === 'summon-bone') {
      node.position.y += progress * 0.65 + Math.sin(age * 4 + phase) * 0.05;
    } else if (node.name === 'ghast-retch-drop') {
      node.position.z += progress * 0.7;
      node.position.y -= progress * 0.28;
    }
  });
  if (shape === 'ethereal-domain') offsetEffectChildren(root, Math.sin(age * 1.25) * 0.025);
}

function defaultShape(type, effect = {}) {
  if (type === 'hero-duel') return 'duel-ring';
  if (type === 'hero-zone') return effect.shape ?? 'ring';
  if (type === 'hero-form-reveal') return 'form-reveal';
  if (type === 'hero-form-merge') return 'form-merge';
  return 'ring';
}

function rotatingShape(shape) {
  return ['triangle', 'three-gear-circle', 'memory-flower', 'solitary-bloom', 'royal-sigil', 'digest-spiral', 'triune-court', 'ethereal-domain', 'three-grave-sigils', 'carrion-banquet-ring', 'all-gates-closing', 'fourfold-adaptation', 'royal-egg-sigil', 'radiating-silk-orders', 'fivefold-brood-crown', 'mirrored-gesture', 'counterfeit-royal-seal', 'rooted-orchard', 'four-season-wheel', 'splitting-reliquary-shell'].includes(shape);
}

function rotationSpeed(shape) {
  if (shape === 'digest-spiral') return 0.9;
  if (shape === 'triune-court') return 0.42;
  if (shape === 'ethereal-domain') return 0.08;
  return 0.28;
}

function animateNamed(root, name, angle, lift) {
  root.traverse(node => {
    if (node.name !== name) return;
    node.rotation.y += angle;
    node.position.y += Math.sin(angle) * lift;
  });
}


function captureEffectBaseTransforms(root) {
  root.traverse(node => {
    if (node === root) return;
    node.userData ??= {};
    node.userData.heroEffectBaseTransform = {
      position: node.position.clone(),
      rotation: node.rotation.clone(),
      scale: node.scale.clone()
    };
  });
}

function resetEffectBaseTransforms(root) {
  root.traverse(node => {
    const base = node.userData?.heroEffectBaseTransform;
    if (!base) return;
    node.position.copy(base.position);
    node.rotation.copy(base.rotation);
    node.scale.copy(base.scale);
  });
}

function offsetEffectChildren(root, amount) {
  for (const child of root.children ?? []) child.position.y += amount;
}

function namedMesh(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function setOpacity(root, opacity) {
  root.traverse(node => {
    if (node.material?.transparent) node.material.opacity = opacity;
  });
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
