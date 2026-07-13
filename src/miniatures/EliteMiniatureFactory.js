import { THREE } from '../engine/ThreeScene.js';
import { getEliteDefinition } from '../content/elite/EliteBestiary.js';

const DEFAULT_PALETTES = {
  'goblin-clan': { skin: 0x7e9f4f, cloth: 0x6f3f2e, leather: 0x483126, metal: 0x858882, accent: 0xd0a44f, dark: 0x252920 },
  'copper-tail-clutch': { skin: 0xb07443, cloth: 0x7a4c2d, leather: 0x493326, metal: 0xa47a3e, accent: 0xe0b256, dark: 0x2b241f },
  'red-tusk-tribe': { skin: 0x6c7c4b, cloth: 0x5c2f28, leather: 0x493326, metal: 0x858a84, accent: 0xc84e47, dark: 0x25241f },
  'undead-host': { skin: 0xcfcbbb, cloth: 0x575365, leather: 0x493b35, metal: 0x7e8790, accent: 0x9c8fc8, dark: 0x1d1e25 },
  'bluecap-colony': { skin: 0xb2a079, cloth: 0x65704d, leather: 0x5f4d39, metal: 0x858477, accent: 0x5fa9c8, dark: 0x332d2a },
  'red-wing-brood': { skin: 0x332735, cloth: 0x4b3548, leather: 0x281f29, metal: 0x746b75, accent: 0xb64c68, dark: 0x120f16 },
  'pale-brood': { skin: 0xc7c0a9, cloth: 0x6d675d, leather: 0x554c42, metal: 0x8b8a82, accent: 0xd6d1b6, dark: 0x27251f },
  'slime-bloom': { skin: 0x58bea0, cloth: 0x58bea0, leather: 0x337d6b, metal: 0x7ad8c0, accent: 0xb7ffe8, dark: 0x244e46 },
  'warren-vermin': { skin: 0x79675b, cloth: 0x5d4a3e, leather: 0x41342c, metal: 0x77736c, accent: 0xa99573, dark: 0x29231f },
  'carrion-brood': { skin: 0x8f765a, cloth: 0x665343, leather: 0x4d3e32, metal: 0x77706a, accent: 0xb9a171, dark: 0x2c251f },
  'ogre-solitary': { skin: 0x84905d, cloth: 0x69442e, leather: 0x4b3022, metal: 0x777c78, accent: 0xd0aa69, dark: 0x2c2825 }
};

export function getEliteMiniatureRecipe(role) {
  return getEliteDefinition(role)?.visual ?? null;
}

export function createEliteMiniature(agent) {
  const definition = getEliteDefinition(agent.role);
  if (!definition) return null;
  const palette = DEFAULT_PALETTES[definition.factionId] ?? DEFAULT_PALETTES['undead-host'];
  const materials = makeMaterials(palette, definition);
  const root = new THREE.Group();
  root.name = `elite-miniature:${agent.role}`;
  root.userData.role = agent.role;
  root.userData.recipeId = `elite:${agent.role}`;
  root.userData.articulated = true;
  root.userData.animationProfile = definition.visual.animationProfile;
  root.userData.baseScale = 1;

  const model = new THREE.Group();
  model.name = 'miniature-model';
  model.scale.setScalar(definition.visual.scale ?? 1);
  root.add(model);

  const joints = buildBodyPlan(model, definition.visual.bodyPlan, materials, definition);
  root.userData.joints = joints;
  for (const token of definition.visual.kit ?? []) attachKit(token, joints, materials, definition);
  addIndicators(root, agent, definition, materials);
  return root;
}

function buildBodyPlan(model, plan, materials, definition) {
  if (plan.includes('arachnid')) return buildArachnid(model, materials, plan.includes('long'));
  if (plan.includes('fungal') || plan === 'corpse-orchard') return buildFungal(model, materials, plan, definition);
  if (plan === 'slime') return buildSlime(model, materials, definition);
  if (plan.includes('drill-construct') || plan.includes('walking-vat') || plan.includes('bell-revenant')) return buildConstruct(model, materials, plan);
  if (plan.includes('crawler')) return buildCrawler(model, materials, plan.includes('large'));
  if (plan.includes('swarm') || plan === 'rat-swarm') return buildSwarm(model, materials, plan);
  if (plan === 'rat') return buildRat(model, materials);
  if (plan === 'spectral') return buildSpectral(model, materials);
  const skeleton = plan.includes('skeleton') || plan === 'bone-golem';
  const ghoul = plan.includes('ghoul');
  const large = plan.includes('large') || plan.includes('heavy') || plan === 'ogre' || plan === 'corpse-colossus' || plan === 'bone-golem';
  const small = plan === 'goblin' || plan === 'kobold' || plan === 'kobold-frame';
  return buildHumanoid(model, materials, { skeleton, ghoul, large, small, plan });
}

function buildHumanoid(model, materials, { skeleton, ghoul, large, small, plan }) {
  const joints = hierarchy(model, {
    motionRoot: [0, 0, 0], pelvis: [0, small ? 0.46 : large ? 0.68 : 0.56, 0],
    legL: [-0.17, -0.32, 0], footL: [0, -0.35, 0.08], legR: [0.17, -0.32, 0], footR: [0, -0.35, 0.08],
    spineLower: [0, 0.28, 0], chest: [0, 0.34, ghoul ? -0.08 : 0], neck: [0, 0.42, 0], head: [0, 0.28, ghoul ? 0.12 : 0], headTop: [0, 0.28, 0],
    shoulderL: [-0.38, 0.25, 0], upperArmL: [-0.16, -0.16, 0], forearmL: [0, -0.28, 0], handL: [0, -0.2, 0],
    shoulderR: [0.38, 0.25, 0], upperArmR: [0.16, -0.16, 0], forearmR: [0, -0.28, 0], handR: [0, -0.2, 0],
    back: [0, 0.14, -0.25], chestFront: [0, 0.12, 0.25], waistFront: [0, -0.18, 0.2], waistBack: [0, -0.18, -0.2], baseFx: [0, -0.66, 0]
  });
  const width = large ? 0.78 : small ? 0.52 : 0.62;
  const bone = materials.skin;
  if (skeleton) {
    add(joints.pelvis, box([0.38, 0.18, 0.24], bone));
    add(joints.chest, cylinder(0.08, 0.62, bone));
    for (let i = -2; i <= 2; i += 1) { const rib = torus(0.3 + Math.abs(i) * 0.02, 0.035, bone, Math.PI); rib.rotation.z = Math.PI / 2; rib.position.y = i * 0.09; joints.chest.add(rib); }
  } else {
    add(joints.pelvis, box([width * 0.72, 0.3, 0.42], materials.cloth));
    const torso = capsule(width * 0.43, large ? 0.64 : 0.48, materials.cloth); torso.scale.x = large ? 1.2 : 1; add(joints.chest, torso);
  }
  for (const side of ['L', 'R']) {
    const limbMat = skeleton ? bone : materials.cloth;
    add(joints[`leg${side}`], capsule(skeleton ? 0.055 : 0.12, large ? 0.68 : small ? 0.46 : 0.56, limbMat));
    add(joints[`foot${side}`], box([large ? 0.3 : 0.22, 0.13, large ? 0.42 : 0.32], materials.dark));
    add(joints[`upperArm${side}`], capsule(skeleton ? 0.05 : large ? 0.13 : 0.1, large ? 0.58 : 0.46, limbMat));
    add(joints[`forearm${side}`], capsule(skeleton ? 0.045 : large ? 0.12 : 0.09, large ? 0.5 : 0.38, limbMat));
    add(joints[`hand${side}`], sphere(large ? 0.15 : 0.11, skeleton ? bone : materials.skin));
  }
  const head = skeleton ? skull(materials) : sphere(large ? 0.32 : small ? 0.31 : 0.29, materials.skin);
  if (ghoul) head.scale.set(0.88, 1.15, 1.08);
  add(joints.head, head);
  if (plan === 'corpse-colossus') {
    for (const x of [-0.42, 0.42]) { const extra = capsule(0.24, 0.5, materials.skin); extra.position.set(x, 0.05, -0.12); joints.chest.add(extra); }
  }
  return joints;
}

function buildArachnid(model, materials, longLegs) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], body: [0, 0.48, 0.08], abdomen: [0, 0.06, -0.5], head: [0, 0.05, 0.38], baseFx: [0, 0.05, 0] });
  add(joints.body, sphere(0.38, materials.skin));
  const abdomen = sphere(longLegs ? 0.43 : 0.5, materials.leather); abdomen.scale.set(1, 0.8, 1.25); add(joints.abdomen, abdomen);
  add(joints.head, sphere(0.25, materials.dark));
  for (let i = 0; i < 8; i += 1) {
    const side = i < 4 ? -1 : 1;
    const lane = i % 4;
    const hip = joint(`leg${i}`, [side * 0.28, 0.05, 0.32 - lane * 0.24]);
    const knee = joint(`knee${i}`, [side * (longLegs ? 0.72 : 0.5), 0.12, 0]);
    const foot = joint(`foot${i}`, [side * (longLegs ? 0.65 : 0.48), -0.42, 0]);
    hip.add(knee); knee.add(foot); joints.body.add(hip);
    add(knee, cylinder(0.045, longLegs ? 0.8 : 0.58, materials.skin, true));
    add(foot, cylinder(0.035, longLegs ? 0.72 : 0.5, materials.skin, true));
    joints[`leg${i}`] = hip; joints[`knee${i}`] = knee; joints[`foot${i}`] = foot;
  }
  return joints;
}

function buildFungal(model, materials, plan) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], pelvis: [0, 0.18, 0], stem: [0, 0.58, 0], cap: [0, 0.72, 0], armL: [-0.28, 0.16, 0], armR: [0.28, 0.16, 0], back: [0, 0.25, -0.22], baseFx: [0, 0.05, 0] });
  add(joints.stem, capsule(plan.includes('pillar') ? 0.34 : 0.25, plan.includes('pillar') ? 1.1 : 0.72, materials.skin));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(plan.includes('pillar') ? 0.72 : 0.52, 0.38, 12), materials.accent); cap.rotation.x = Math.PI; add(joints.cap, cap);
  for (const side of ['L', 'R']) add(joints[`arm${side}`], capsule(0.07, 0.5, materials.skin));
  if (plan === 'corpse-orchard') for (const x of [-0.36, 0, 0.36]) { const stem = capsule(0.15, 0.65, materials.skin); stem.position.set(x, 0.05, -0.12); joints.pelvis.add(stem); }
  return joints;
}

function buildSlime(model, materials) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], blob: [0, 0.48, 0], core: [0.1, 0.04, 0.08], baseFx: [0, 0.05, 0] });
  const blob = sphere(0.62, materials.skinTransparent); blob.scale.set(1.15, 0.78, 1); add(joints.blob, blob);
  add(joints.core, sphere(0.16, materials.dark));
  return joints;
}

function buildConstruct(model, materials, plan) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], chassis: [0, 0.58, 0], core: [0, 0.22, 0], front: [0, 0, 0.55], back: [0, 0, -0.55], baseFx: [0, 0.05, 0] });
  if (plan === 'walking-vat') {
    add(joints.chassis, cylinder(0.52, 1.05, materials.glass));
    add(joints.core, sphere(0.28, materials.accentTransparent));
  } else if (plan === 'bell-revenant') {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.1, 12, 1, true), materials.bone); bell.rotation.x = Math.PI; add(joints.chassis, bell);
    add(joints.core, cylinder(0.09, 0.9, materials.dark));
  } else {
    add(joints.chassis, cylinder(0.58, 1.2, materials.metal, false, Math.PI / 2));
    add(joints.front, cone(0.5, 1.15, materials.metal, Math.PI / 2));
  }
  for (let i = 0; i < (plan === 'drill-construct' ? 6 : 4); i += 1) {
    const angle = (i / (plan === 'drill-construct' ? 6 : 4)) * Math.PI * 2;
    const leg = joint(`leg${i}`, [Math.cos(angle) * 0.45, -0.3, Math.sin(angle) * 0.45]);
    add(leg, cylinder(0.06, 0.72, materials.metal, true)); joints.chassis.add(leg); joints[`leg${i}`] = leg;
  }
  return joints;
}

function buildCrawler(model, materials, large) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], head: [0, 0.34, 0.55], body: [0, 0.38, 0], abdomen: [0, 0.35, -0.58], baseFx: [0, 0.04, 0] });
  add(joints.head, sphere(large ? 0.34 : 0.26, materials.dark));
  add(joints.body, capsule(large ? 0.34 : 0.25, large ? 0.8 : 0.6, materials.skin, Math.PI / 2));
  const abdomen = capsule(large ? 0.42 : 0.3, large ? 0.9 : 0.65, materials.leather, Math.PI / 2); add(joints.abdomen, abdomen);
  for (let i = 0; i < 10; i += 1) { const side = i < 5 ? -1 : 1; const lane = i % 5; const leg = joint(`leg${i}`, [side * 0.3, 0, 0.45 - lane * 0.25]); add(leg, cylinder(0.035, large ? 0.55 : 0.42, materials.skin, true)); joints.body.add(leg); joints[`leg${i}`] = leg; }
  return joints;
}

function buildSwarm(model, materials, plan) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], core: [0, 0.34, 0], baseFx: [0, 0.04, 0] });
  for (let i = 0; i < 12; i += 1) {
    const node = joint(`swarm${i}`, [Math.cos(i * 1.7) * (0.25 + (i % 3) * 0.12), 0.04 + (i % 4) * 0.11, Math.sin(i * 1.7) * (0.25 + (i % 3) * 0.12)]);
    add(node, plan === 'rat-swarm' ? capsule(0.07, 0.22, materials.skin, Math.PI / 2) : cone(0.06, 0.28, materials.accent, Math.PI / 2));
    joints.core.add(node); joints[`swarm${i}`] = node;
  }
  return joints;
}

function buildRat(model, materials) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], body: [0, 0.24, 0], head: [0, 0.04, 0.34], tail: [0, 0, -0.4], back: [0, 0.18, -0.05], baseFx: [0, 0.03, 0] });
  const body = capsule(0.16, 0.44, materials.skin, Math.PI / 2); add(joints.body, body); add(joints.head, sphere(0.14, materials.skin));
  const tail = cylinder(0.025, 0.65, materials.skin, true); tail.rotation.x = Math.PI / 2; add(joints.tail, tail);
  return joints;
}

function buildSpectral(model, materials) {
  const joints = hierarchy(model, { motionRoot: [0, 0, 0], chest: [0, 1.0, 0], head: [0, 0.46, 0], armL: [-0.38, 0.1, 0], armR: [0.38, 0.1, 0], tail: [0, -0.65, 0], back: [0, 0.1, -0.2], baseFx: [0, 0.08, 0] });
  add(joints.chest, capsule(0.34, 0.58, materials.spectral)); add(joints.head, sphere(0.28, materials.spectral));
  add(joints.armL, capsule(0.07, 0.65, materials.spectral)); add(joints.armR, capsule(0.07, 0.65, materials.spectral));
  const tail = cone(0.42, 1.1, materials.spectral, Math.PI); add(joints.tail, tail);
  return joints;
}

function attachKit(token, joints, materials) {
  const lower = token.toLowerCase();
  let target = joints.chest ?? joints.body ?? joints.chassis ?? joints.core ?? joints.motionRoot;
  let part;
  if (/(helm|cap|crown|goggle|hood|plume|mane)/.test(lower)) { target = joints.headTop ?? joints.head ?? target; part = lower.includes('goggle') ? torus(0.24, 0.04, materials.accent) : lower.includes('crown') ? crown(materials.accent) : dome(0.34, materials.metal); }
  else if (/(shield|buckler)/.test(lower)) { target = joints.handL ?? target; part = lower.includes('tower') || lower.includes('door') ? box([0.16, 0.95, 0.62], materials.metal) : cylinder(0.34, 0.09, materials.metal, false, Math.PI / 2); }
  else if (/(spear|sword|axe|cleaver|club|hammer|wrench|harpoon|scythe|bow|crossbow|hook)/.test(lower)) { target = joints.handR ?? joints.front ?? target; part = weapon(lower, materials); }
  else if (/(back|pack|crate|keg|tank|rack|sack|quiver|cocoon|stall|harness|banner|cloak|mantle|surcoat|shroud|apron|coat|frame)/.test(lower)) { target = joints.back ?? joints.abdomen ?? joints.chassis ?? target; part = backpack(lower, materials); }
  else if (/(armor|plate|mail|robe|cloth|rags|rib|torso|body|cage)/.test(lower)) { target = joints.chest ?? joints.body ?? joints.chassis ?? target; part = lower.includes('rib') || lower.includes('bone') ? ribCage(materials.bone) : box([0.74, 0.72, 0.48], lower.includes('plate') || lower.includes('armor') ? materials.metal : materials.cloth); }
  else if (/(sac|bubble|core|lantern|gut|eye|fluid|glass|vat)/.test(lower)) { target = joints.abdomen ?? joints.core ?? joints.chestFront ?? target; part = sphere(lower.includes('glass') || lower.includes('fluid') ? 0.32 : 0.22, lower.includes('glass') || lower.includes('fluid') ? materials.accentTransparent : materials.accent); }
  else if (/(leg|piston|stabilizer|root|tentacle|arm|claw|fang|spinneret|needle|tail|cord)/.test(lower)) { target = joints.body ?? joints.chassis ?? joints.pelvis ?? target; part = multiAppendage(lower, materials); }
  else if (/(bell)/.test(lower)) { target = joints.tail ?? joints.core ?? target; part = bell(materials.metal); }
  else { part = symbolicToken(token, materials.accent); }
  part.name = `elite-kit:${token}`;
  target?.add(part);
}

function hierarchy(root, positions) {
  const joints = {};
  const parentMap = {
    motionRoot: null, pelvis: 'motionRoot', spineLower: 'pelvis', chest: 'spineLower', neck: 'chest', head: 'neck', headTop: 'head',
    legL: 'pelvis', footL: 'legL', legR: 'pelvis', footR: 'legR', shoulderL: 'chest', upperArmL: 'shoulderL', forearmL: 'upperArmL', handL: 'forearmL',
    shoulderR: 'chest', upperArmR: 'shoulderR', forearmR: 'upperArmR', handR: 'forearmR', back: 'chest', chestFront: 'chest', waistFront: 'pelvis', waistBack: 'pelvis', baseFx: 'motionRoot'
  };
  for (const [name, position] of Object.entries(positions)) joints[name] = joint(name, position);
  for (const name of Object.keys(positions)) {
    const parent = parentMap[name] && joints[parentMap[name]] ? joints[parentMap[name]] : root;
    parent.add(joints[name]);
  }
  for (const [name, node] of Object.entries(joints)) node.userData.baseTransform = { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone(), name };
  return joints;
}

function makeMaterials(palette) {
  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: options.roughness ?? 0.72, metalness: options.metalness ?? 0, transparent: options.transparent ?? false, opacity: options.opacity ?? 1, emissive: options.emissive ? color : 0x000000, emissiveIntensity: options.emissive ? 0.2 : 0 });
  return {
    skin: mat(palette.skin), cloth: mat(palette.cloth), leather: mat(palette.leather), metal: mat(palette.metal, { metalness: 0.28, roughness: 0.45 }), accent: mat(palette.accent, { emissive: true }), dark: mat(palette.dark),
    bone: mat(0xd4d0bc, { roughness: 0.62 }), skinTransparent: mat(palette.skin, { transparent: true, opacity: 0.72, roughness: 0.2 }), accentTransparent: mat(palette.accent, { transparent: true, opacity: 0.66, roughness: 0.18, emissive: true }),
    spectral: mat(palette.accent, { transparent: true, opacity: 0.52, roughness: 0.15, emissive: true }), glass: mat(0xa7d9d6, { transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.05 })
  };
}

function addIndicators(root, agent, definition, materials) {
  const radius = definition.size === 'huge' ? 0.9 : definition.size === 'large' ? 0.68 : definition.size === 'medium' ? 0.5 : 0.4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 6, 28), new THREE.MeshBasicMaterial({ color: materials.accent.color, transparent: true, opacity: 0.75 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.35; ring.name = 'elite-ring'; root.add(ring);
  const barWidth = radius * 1.5;
  const hpBack = new THREE.Mesh(new THREE.BoxGeometry(barWidth, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: 0x330b0b })); hpBack.position.set(0, definition.size === 'huge' ? 2.8 : definition.size === 'large' ? 2.35 : 1.85, 0); root.add(hpBack);
  const hp = new THREE.Mesh(new THREE.BoxGeometry(barWidth, 0.075, 0.05), new THREE.MeshBasicMaterial({ color: 0x9ee0a3 })); hp.name = 'hp'; hp.position.copy(hpBack.position); hp.position.z += 0.01; root.add(hp);
  root.userData.agentId = agent.id;
}

function joint(name, position) { const node = new THREE.Group(); node.name = `joint:${name}`; node.position.set(...position); return node; }
function add(parent, object) { parent.add(object); return object; }
function box(size, material) { return new THREE.Mesh(new THREE.BoxGeometry(...size), material); }
function sphere(radius, material) { return new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material); }
function cylinder(radius, height, material, horizontal = false, rotate = 0) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 8), material); if (horizontal) mesh.rotation.z = Math.PI / 2; if (rotate) mesh.rotation.x = rotate; return mesh; }
function capsule(radius, length, material, rotate = 0) { const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 7), material); if (rotate) mesh.rotation.x = rotate; return mesh; }
function cone(radius, height, material, rotate = 0) { const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 9), material); if (rotate) mesh.rotation.x = rotate; return mesh; }
function torus(radius, tube, material, arc = Math.PI * 2) { return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 18, arc), material); }
function skull(materials) { const group = new THREE.Group(); group.add(sphere(0.29, materials.bone)); const jaw = box([0.34, 0.13, 0.25], materials.bone); jaw.position.set(0, -0.23, 0.03); group.add(jaw); return group; }
function dome(radius, material) { return new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), material); }
function crown(material) { const group = new THREE.Group(); for (let i = 0; i < 5; i += 1) { const spike = cone(0.06, 0.28, material); spike.position.set((i - 2) * 0.12, 0.1, 0); group.add(spike); } return group; }
function bell(material) { const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.38, 10, 1, true), material); mesh.rotation.x = Math.PI; return mesh; }
function ribCage(material) { const group = new THREE.Group(); for (let i = -2; i <= 2; i += 1) { const rib = torus(0.29, 0.03, material, Math.PI); rib.rotation.z = Math.PI / 2; rib.position.y = i * 0.09; group.add(rib); } return group; }
function weapon(token, materials) { const group = new THREE.Group(); const shaft = cylinder(0.045, token.includes('spear') || token.includes('scythe') ? 1.2 : 0.72, materials.leather); shaft.position.y = 0.28; group.add(shaft); if (token.includes('bow')) { const bow = torus(0.42, 0.035, materials.leather, Math.PI); bow.rotation.z = Math.PI / 2; group.add(bow); } else { const head = token.includes('club') || token.includes('hammer') ? box([0.28, 0.24, 0.24], materials.metal) : cone(token.includes('axe') || token.includes('cleaver') ? 0.22 : 0.11, token.includes('great') ? 0.68 : 0.42, materials.metal); head.position.y = 0.7; if (token.includes('axe') || token.includes('cleaver')) head.rotation.z = Math.PI / 2; group.add(head); } return group; }
function backpack(token, materials) { const group = new THREE.Group(); const large = /(stall|frame|coffin|vat|rack)/.test(token); const pack = box([large ? 0.9 : 0.48, large ? 0.7 : 0.52, large ? 0.45 : 0.28], /(crate|stall|frame|coffin)/.test(token) ? materials.leather : materials.cloth); pack.position.z = -0.14; group.add(pack); if (/(crate|sack|tank|cocoon)/.test(token)) for (const x of [-0.24, 0.24]) { const item = token.includes('tank') ? cylinder(0.12, 0.55, materials.metal) : token.includes('cocoon') ? capsule(0.18, 0.55, materials.cloth) : box([0.28, 0.3, 0.28], materials.leather); item.position.x = x; group.add(item); } return group; }
function multiAppendage(token, materials) { const group = new THREE.Group(); const count = /(six|multiple|tentacle|needle|spinneret)/.test(token) ? 6 : 3; for (let i = 0; i < count; i += 1) { const limb = capsule(0.035 + (token.includes('claw') ? 0.03 : 0), 0.45 + (i % 2) * 0.15, token.includes('piston') ? materials.metal : materials.skin); limb.rotation.z = (i - (count - 1) / 2) * 0.28; limb.position.x = (i - (count - 1) / 2) * 0.11; group.add(limb); } return group; }
function symbolicToken(token, material) { const group = new THREE.Group(); const seed = [...token].reduce((sum, char) => sum + char.charCodeAt(0), 0); for (let i = 0; i < 3; i += 1) { const bead = sphere(0.07 + (seed % 3) * 0.01, material); bead.position.set((i - 1) * 0.16, (i % 2) * 0.13, 0); group.add(bead); } return group; }
