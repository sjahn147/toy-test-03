import { THREE } from './ThreeScene.js';

export function buildHumanoidRig(factory, model, recipe, profile, variation, { goblin = false, ogre = false } = {}) {
  const proportions = recipe.proportions ?? {};
  const scaleClass = ogre ? 1.3 : goblin ? 0.82 : 1;
  const limbLength = profile.limbLength * (proportions.legs ?? 1) * variation.limbLength;
  const shoulderWidth = 0.42 * profile.shoulders * (proportions.shoulders ?? 1) * variation.width * scaleClass;
  const hipWidth = 0.19 * profile.hips * variation.width * scaleClass;
  const baseY = goblin ? 0.47 : ogre ? 0.66 : 0.56;
  const skin = factory.material(recipe, 'skin', { roughness: goblin ? 0.78 : 0.65 });
  const cloth = factory.material(recipe, 'cloth', { roughness: 0.78 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.88 });
  const rig = { root: model, sockets: {} };
  const pelvis = joint('rig_pelvis', model, [0, baseY, 0]);
  pelvis.userData.restY = baseY;
  rig.pelvis = pelvis;
  const pelvisMesh = factory.mesh(`polish:pelvis:${recipe.skeleton}`, () => new THREE.CapsuleGeometry(0.24, 0.18, 5, 10), cloth);
  pelvisMesh.scale.set(profile.hips * variation.width * scaleClass, 0.78, 0.88 * profile.chestDepth);
  pelvis.add(pelvisMesh);
  const spine = joint('rig_spine', pelvis, [0, goblin ? 0.25 : 0.29, 0]);
  rig.spine = spine;
  const spineMesh = factory.mesh(`polish:spine:${recipe.skeleton}`, () => new THREE.CapsuleGeometry(0.12, 0.24, 4, 8), cloth);
  spineMesh.scale.set(profile.waist * variation.width * scaleClass, 1, profile.chestDepth);
  spineMesh.position.y = 0.12;
  spine.add(spineMesh);
  const chest = joint('rig_chest', spine, [0, goblin ? 0.29 : 0.35, profile.posture]);
  rig.chest = chest;
  const chestMesh = factory.mesh(`polish:chest:${recipe.skeleton}`, () => new THREE.CapsuleGeometry(0.27, goblin ? 0.22 : 0.32, 5, 10), cloth);
  chestMesh.scale.set(profile.shoulders * (proportions.shoulders ?? 1) * variation.width * scaleClass, variation.torsoLength, profile.chestDepth);
  chestMesh.position.y = 0.16;
  chest.add(chestMesh);
  const neck = joint('rig_neck', chest, [0, goblin ? 0.37 : ogre ? 0.5 : 0.45, 0]);
  rig.neck = neck;
  const neckMesh = factory.mesh('polish:neck', () => new THREE.CylinderGeometry(0.105, 0.12, 0.2, 10), skin);
  neckMesh.position.y = 0.08;
  neck.add(neckMesh);
  const head = joint('rig_head', neck, [0, goblin ? 0.18 : 0.2, 0]);
  rig.head = head;
  buildFace(factory, head, recipe, profile, variation, { goblin, ogre });
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R';
    const shoulder = joint(`rig_shoulder${suffix}`, chest, [side * shoulderWidth, goblin ? 0.25 : 0.29, 0]);
    const upperArm = joint(`rig_upperArm${suffix}`, shoulder, [0, 0, 0]);
    const upperArmMesh = limbMesh(factory, `polish:upper-arm:${recipe.skeleton}`, 0.095 * scaleClass, 0.34 * limbLength, cloth);
    upperArmMesh.position.y = -0.17 * limbLength;
    upperArm.add(upperArmMesh);
    const elbow = joint(`rig_elbow${suffix}`, upperArm, [0, -0.34 * limbLength, 0]);
    const forearm = joint(`rig_forearm${suffix}`, elbow, [0, 0, 0]);
    const forearmMesh = limbMesh(factory, `polish:forearm:${recipe.skeleton}`, 0.083 * scaleClass, 0.29 * limbLength, cloth);
    forearmMesh.position.y = -0.145 * limbLength;
    forearm.add(forearmMesh);
    const hand = joint(`rig_hand${suffix}`, forearm, [0, -0.29 * limbLength, 0]);
    const handMesh = factory.mesh('polish:hand', () => new THREE.SphereGeometry(0.11, 10, 7), skin);
    handMesh.scale.set(0.82 * scaleClass, 1.05 * scaleClass, 0.68 * scaleClass);
    hand.add(handMesh);
    const thigh = joint(`rig_thigh${suffix}`, pelvis, [side * hipWidth, -0.08, 0]);
    const thighMesh = limbMesh(factory, `polish:thigh:${recipe.skeleton}`, 0.115 * scaleClass, 0.42 * limbLength, cloth);
    thighMesh.position.y = -0.21 * limbLength;
    thigh.add(thighMesh);
    const knee = joint(`rig_knee${suffix}`, thigh, [0, -0.42 * limbLength, 0.015]);
    const shin = joint(`rig_shin${suffix}`, knee, [0, 0, 0]);
    const shinMesh = limbMesh(factory, `polish:shin:${recipe.skeleton}`, 0.092 * scaleClass, 0.38 * limbLength, cloth);
    shinMesh.position.y = -0.19 * limbLength;
    shin.add(shinMesh);
    const foot = joint(`rig_foot${suffix}`, shin, [0, -0.38 * limbLength, 0.08]);
    const boot = factory.mesh(`polish:boot:${recipe.skeleton}`, () => new THREE.CapsuleGeometry(0.1, 0.22, 4, 8), dark);
    boot.rotation.x = Math.PI / 2;
    boot.scale.set(1.05 * scaleClass, 0.88 * scaleClass, 1.15 * scaleClass);
    boot.position.z = 0.08;
    foot.add(boot);
    Object.assign(rig, { [`shoulder${suffix}`]: shoulder, [`upperArm${suffix}`]: upperArm, [`elbow${suffix}`]: elbow, [`forearm${suffix}`]: forearm, [`hand${suffix}`]: hand, [`thigh${suffix}`]: thigh, [`knee${suffix}`]: knee, [`shin${suffix}`]: shin, [`foot${suffix}`]: foot });
    rig.sockets[`hand${suffix}`] = hand;
  }
  addCommonSockets(rig, model, pelvis, chest, head, goblin ? 0.34 : 0.36);
  return rig;
}

export function decorateGoblin(factory, rig, recipe, variation, { ogre = false } = {}) {
  const skin = factory.material(recipe, 'skin', { roughness: 0.8 });
  const tooth = factory.material(recipe, 'accent', { roughness: 0.76 });
  const ears = [];
  for (const side of [-1, 1]) {
    const earPivot = joint(`goblin_ear_${side < 0 ? 'L' : 'R'}`, rig.head, [side * (ogre ? 0.32 : 0.29), 0.06 + side * variation.faceBias * 0.03, 0]);
    const ear = factory.mesh(`polish:goblin-ear:${ogre ? 'ogre' : 'goblin'}`, () => new THREE.ConeGeometry(ogre ? 0.1 : 0.075, ogre ? 0.48 : 0.39, 7), skin);
    ear.rotation.z = side * -Math.PI / 2;
    ear.scale.y = side < 0 ? 0.82 + variation.asymmetry * 0.22 : 0.95 - variation.asymmetry * 0.12;
    earPivot.add(ear);
    ears.push(earPivot);
  }
  [rig.earL, rig.earR] = ears;
  for (const side of [-1, 1]) {
    const tusk = factory.mesh('polish:goblin-tusk', () => new THREE.ConeGeometry(0.025, 0.12, 6), tooth);
    tusk.position.set(side * 0.09, -0.17, 0.28);
    tusk.rotation.x = Math.PI;
    rig.head.add(tusk);
  }
  const wart = factory.mesh('polish:goblin-wart', () => new THREE.SphereGeometry(0.035, 7, 5), skin);
  wart.position.set(variation.faceBias > 0 ? 0.055 : -0.045, -0.04, 0.34);
  rig.head.add(wart);
}

function buildFace(factory, head, recipe, profile, variation, { goblin, ogre }) {
  const skin = factory.material(recipe, 'skin', { roughness: goblin ? 0.8 : 0.65 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.92 });
  const scale = ogre ? 1.18 : goblin ? 1.04 : 1;
  const cranium = factory.mesh(`polish:cranium:${recipe.skeleton}`, () => new THREE.SphereGeometry(0.3, 16, 11), skin);
  cranium.scale.set(profile.faceWidth * variation.width * scale, (recipe.proportions?.head ?? 1) * scale, goblin ? 0.86 : 0.94);
  head.add(cranium);
  const jaw = factory.mesh(`polish:jaw:${recipe.skeleton}`, () => new THREE.CapsuleGeometry(0.18, 0.13, 4, 9), skin);
  jaw.position.set(0, -0.18, 0.03);
  jaw.scale.set(profile.jawWidth * variation.width * scale, 0.74, 0.78);
  head.add(jaw);
  const nose = factory.mesh(`polish:nose:${recipe.skeleton}`, () => new THREE.ConeGeometry(goblin ? 0.07 : 0.055, goblin ? 0.18 : 0.13, 7), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(variation.faceBias * 0.02, -0.015, 0.29);
  head.add(nose);
  const brow = factory.mesh(`polish:brow:${recipe.skeleton}`, () => new THREE.BoxGeometry(goblin ? 0.34 : 0.27, 0.045, 0.055), skin);
  brow.position.set(0, 0.09, 0.27);
  brow.rotation.z = goblin ? variation.faceBias * 0.16 : variation.faceBias * 0.05;
  head.add(brow);
  for (const side of [-1, 1]) {
    const eye = factory.mesh('polish:eye', () => new THREE.SphereGeometry(goblin ? 0.052 : 0.043, 9, 7), dark);
    eye.position.set(side * (goblin ? 0.105 : 0.09), 0.045 + side * variation.faceBias * 0.008, goblin ? 0.29 : 0.285);
    head.add(eye);
  }
}

function addCommonSockets(rig, model, pelvis, chest, head, headTopY) {
  rig.sockets.root = model;
  rig.sockets.pelvis = pelvis;
  rig.sockets.chest = chest;
  rig.sockets.head = head;
  rig.sockets.headTop = joint('socket_headTop', head, [0, headTopY, 0]);
  rig.sockets.back = joint('socket_back', chest, [0, 0.1, -0.24]);
  rig.sockets.waistFront = joint('socket_waistFront', pelvis, [0, 0.05, 0.24]);
  rig.sockets.waistBack = joint('socket_waistBack', pelvis, [0, 0.05, -0.24]);
  rig.sockets.baseFx = joint('socket_baseFx', model, [0, 0.08, 0]);
}

function joint(name, parent, position) {
  const node = new THREE.Group();
  node.name = name;
  node.position.set(...position);
  node.userData.restPosition = [...position];
  parent.add(node);
  return node;
}

function limbMesh(factory, key, radius, length, material) {
  return factory.mesh(key, () => new THREE.CapsuleGeometry(radius, Math.max(0.08, length - radius * 2), 4, 9), material);
}
