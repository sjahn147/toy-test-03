import { THREE } from '../ThreeScene.js';

const COLORS = {
  'goblin-brass': 0xd3a64f,
  'goblin-teal': 0x66c8bb,
  'kobold-copper': 0xc0843c,
  'kobold-blue': 0x78cbd5,
  'orc-red': 0xc64e45,
  'orc-bright-red': 0xff6954,
  hero: 0xf2d47c
};

export function createHeroEffect(effect) {
  if (!String(effect?.type ?? '').startsWith('hero-')) return null;
  const group = new THREE.Group();
  group.name = `hero-effect:${effect.type}:${effect.skillId ?? effect.heroId ?? ''}`;
  group.userData.heroEffect = true;
  group.userData.effectType = effect.type;
  group.userData.shape = effect.shape ?? defaultShape(effect.type);
  group.userData.baseRadius = effect.radius ?? 2;
  group.userData.baseOpacity = 0.74;
  const color = COLORS[effect.colorRole] ?? COLORS.hero;
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: group.userData.baseOpacity, depthWrite: false });

  if (effect.type === 'hero-route-lock') buildRouteWall(group, material, effect);
  else if (effect.type === 'hero-armor-drop') buildArmorDrop(group, material);
  else if (effect.type === 'hero-interrupt') buildInterrupt(group, material);
  else if (effect.type === 'hero-passive') buildPassive(group, material);
  else buildShape(group, group.userData.shape, effect.radius ?? 2, material);
  return group;
}

export function animateHeroEffect(mesh, effect, age, progress) {
  if (!mesh?.userData?.heroEffect) return false;
  const shape = mesh.userData.shape;
  const pulse = 1 + Math.sin(age * 7) * 0.04;
  mesh.rotation.y = shape === 'triangle' || shape === 'three-gear-circle' ? age * 0.28 : 0;
  mesh.scale.setScalar(pulse);

  if (effect.type === 'hero-telegraph') {
    const appear = Math.min(1, age * 4);
    mesh.scale.multiplyScalar(0.82 + appear * 0.18);
    setOpacity(mesh, Math.max(0.18, 0.32 + progress * 0.62));
  } else if (effect.type === 'hero-impact') {
    mesh.scale.multiplyScalar(0.7 + progress * 1.5);
    setOpacity(mesh, Math.max(0, 1 - progress));
  } else if (effect.type === 'hero-route-lock' || effect.type === 'hero-zone' || effect.type === 'hero-duel') {
    setOpacity(mesh, 0.5 + Math.sin(age * 3) * 0.16);
  } else if (effect.type === 'hero-armor-drop') {
    mesh.rotation.z = age * 0.5;
    setOpacity(mesh, Math.max(0.2, 1 - progress * 0.7));
  } else {
    setOpacity(mesh, Math.max(0, 1 - progress));
  }
  return true;
}

function buildShape(group, shape, radius, material) {
  if (shape === 'route-wall') return buildRouteWall(group, material, { radius });
  if (shape === 'key-sigil') return buildKeySigil(group, material, radius);
  if (shape === 'outward-arrows') return buildOutwardArrows(group, material, radius);
  if (shape === 'three-gear-circle') return buildGearCircle(group, material, radius);
  if (shape === 'wrench-arc') return buildWrenchArc(group, material, radius);
  if (shape === 'triangle') return buildTriangle(group, material, radius);
  if (shape === 'duel-ring') return buildDuelRing(group, material, radius);
  if (shape === 'shattering-armor') return buildShatteringArmor(group, material, radius);
  return buildRing(group, material, radius);
}

function buildRing(group, material, radius) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 8, 48), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.035;
  group.add(ring);
}

function buildRouteWall(group, material, effect) {
  const width = Math.max(2.4, effect?.radius ?? 4);
  for (const x of [-width / 2, width / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.12), material);
    post.position.set(x, 0.62, 0);
    group.add(post);
  }
  for (let i = 0; i < 3; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.08), material);
    bar.position.y = 0.28 + i * 0.35;
    group.add(bar);
  }
  const lock = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 24), material);
  lock.position.y = 0.78;
  lock.rotation.x = Math.PI / 2;
  group.add(lock);
}

function buildKeySigil(group, material, radius) {
  buildRing(group, material, Math.max(0.8, radius * 0.55));
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, radius * 1.2), material);
  shaft.position.y = 0.06;
  group.add(shaft);
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.12), material);
  tooth.position.set(0.2, 0.06, radius * 0.42);
  group.add(tooth);
}

function buildOutwardArrows(group, material, radius) {
  buildRing(group, material, radius * 0.55);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 5), material);
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
    const hub = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.2, 0.04, 6, 20), material);
    hub.rotation.x = Math.PI / 2;
    gear.add(hub);
    for (let tooth = 0; tooth < 8; tooth += 1) {
      const item = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.25), material);
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
  const arc = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.65, 0.05, 8, 32, Math.PI * 1.4), material);
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = -Math.PI * 0.2;
  group.add(arc);
  const jawA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.5), material);
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
    const edge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.08), material);
    edge.position.set((a[0] + b[0]) / 2, 0.05, (a[1] + b[1]) / 2);
    edge.rotation.y = -Math.atan2(dz, dx);
    group.add(edge);
  }
}

function buildDuelRing(group, material, radius) {
  buildRing(group, material, radius);
  for (const angle of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), material);
    blade.position.set(Math.cos(angle) * radius * 0.65, 0.18, Math.sin(angle) * radius * 0.65);
    blade.rotation.z = Math.PI / 2;
    blade.rotation.y = angle;
    group.add(blade);
  }
}

function buildShatteringArmor(group, material, radius) {
  for (let i = 0; i < 10; i += 1) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 4), material);
    const angle = i / 10 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * radius * 0.6, 0.2 + (i % 3) * 0.12, Math.sin(angle) * radius * 0.6);
    shard.rotation.z = angle;
    group.add(shard);
  }
}

function buildArmorDrop(group, material) {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.18), material);
  plate.position.y = 0.35;
  plate.rotation.z = 0.25;
  group.add(plate);
}

function buildInterrupt(group, material) {
  for (let i = 0; i < 4; i += 1) {
    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), material);
    slash.rotation.y = i * Math.PI / 2;
    slash.rotation.z = Math.PI / 4;
    group.add(slash);
  }
}

function buildPassive(group, material) {
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), material);
  diamond.position.y = 0.6;
  group.add(diamond);
}

function defaultShape(type) {
  if (type === 'hero-duel') return 'duel-ring';
  if (type === 'hero-zone') return 'ring';
  return 'ring';
}

function setOpacity(root, opacity) {
  root.traverse(node => {
    if (node.material?.transparent) node.material.opacity = opacity;
  });
}
