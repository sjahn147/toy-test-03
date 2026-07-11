import { THREE } from './ThreeScene.js';

export function buildSkeletonRig(factory, model, recipe, variation) {
  const bone = factory.material(recipe, 'skin', { roughness: 0.62 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.92 });
  const rig = { root: model, sockets: {} };
  const pelvis = joint('rig_pelvis', model, [0, 0.56, 0]);
  pelvis.userData.restY = 0.56;
  rig.pelvis = pelvis;
  for (const side of [-1, 1]) {
    const iliac = factory.mesh('polish:skeleton-iliac', () => new THREE.TorusGeometry(0.16, 0.035, 6, 13, Math.PI), bone);
    iliac.rotation.z = side * Math.PI / 2;
    iliac.position.x = side * 0.12;
    pelvis.add(iliac);
  }
  pelvis.add(factory.mesh('polish:skeleton-sacrum', () => new THREE.BoxGeometry(0.13, 0.2, 0.1), bone));

  const spine = joint('rig_spine', pelvis, [0, 0.2, 0]);
  rig.spine = spine;
  for (let i = 0; i < 6; i += 1) {
    const vertebra = factory.mesh('polish:skeleton-vertebra', () => new THREE.CylinderGeometry(0.055, 0.06, 0.08, 7), bone);
    vertebra.position.y = i * 0.09;
    spine.add(vertebra);
  }

  const chest = joint('rig_chest', spine, [0, 0.48, 0]);
  rig.chest = chest;
  const sternum = factory.mesh('polish:skeleton-sternum', () => new THREE.BoxGeometry(0.08, 0.42, 0.08), bone);
  sternum.position.set(0, 0.12, 0.12);
  chest.add(sternum);
  for (let i = 0; i < 5; i += 1) {
    const width = 0.24 - i * 0.012;
    const rib = factory.mesh(`polish:skeleton-rib:${i}`, () => new THREE.TorusGeometry(width, 0.028, 6, 14, Math.PI), bone);
    rib.rotation.z = Math.PI / 2;
    rib.position.y = i * 0.085 - 0.04;
    chest.add(rib);
  }
  const clavicle = factory.mesh('polish:skeleton-clavicle', () => new THREE.CapsuleGeometry(0.025, 0.46, 3, 7), bone);
  clavicle.rotation.z = Math.PI / 2;
  clavicle.position.y = 0.34;
  chest.add(clavicle);

  const neck = joint('rig_neck', chest, [0, 0.42, 0]);
  rig.neck = neck;
  const head = joint('rig_head', neck, [0, 0.18, 0]);
  rig.head = head;
  const skull = factory.mesh('polish:skeleton-skull', () => new THREE.SphereGeometry(0.28, 14, 10), bone);
  skull.scale.set(0.9, 1.05, 0.82);
  head.add(skull);
  const jaw = joint('rig_jaw', head, [0, -0.2, 0.035]);
  rig.jaw = jaw;
  jaw.add(factory.mesh('polish:skeleton-jaw', () => new THREE.BoxGeometry(0.3, 0.12, 0.22), bone));
  for (const side of [-1, 1]) {
    const socket = factory.mesh('polish:skeleton-eye', () => new THREE.SphereGeometry(0.07, 8, 6), dark);
    socket.position.set(side * 0.09, 0.035, 0.22);
    head.add(socket);
  }

  for (const side of [-1, 1]) addLimbPair(factory, rig, { side, chest, pelvis, bone, variation });
  Object.assign(rig.sockets, {
    root: model,
    pelvis,
    chest,
    head,
    headTop: joint('socket_headTop', head, [0, 0.31, 0]),
    back: joint('socket_back', chest, [0, 0.08, -0.2]),
    waistFront: joint('socket_waistFront', pelvis, [0, 0.03, 0.2]),
    waistBack: joint('socket_waistBack', pelvis, [0, 0.03, -0.2]),
    baseFx: joint('socket_baseFx', model, [0, 0.08, 0])
  });
  return rig;
}

function addLimbPair(factory, rig, { side, chest, pelvis, bone, variation }) {
  const suffix = side < 0 ? 'L' : 'R';
  const shoulder = joint(`rig_shoulder${suffix}`, chest, [side * 0.34, 0.28, 0]);
  const upperArm = joint(`rig_upperArm${suffix}`, shoulder, [0, 0, 0]);
  const humerus = boneLimb(factory, 'polish:skeleton-humerus', 0.035, 0.34, bone);
  humerus.position.y = -0.17;
  upperArm.add(humerus);
  const elbow = joint(`rig_elbow${suffix}`, upperArm, [0, -0.34, 0]);
  const forearm = joint(`rig_forearm${suffix}`, elbow, [0, 0, 0]);
  for (const x of [-0.025, 0.025]) {
    const radius = boneLimb(factory, 'polish:skeleton-radius', 0.021, 0.3, bone);
    radius.position.set(x, -0.15, 0);
    forearm.add(radius);
  }
  const hand = joint(`rig_hand${suffix}`, forearm, [0, -0.3, 0]);
  for (let i = -2; i <= 2; i += 1) {
    const finger = boneLimb(factory, 'polish:skeleton-finger', 0.008, 0.13, bone);
    finger.position.set(i * 0.025, -0.065, 0.02);
    hand.add(finger);
  }
  const thigh = joint(`rig_thigh${suffix}`, pelvis, [side * 0.13, -0.05, 0]);
  const femur = boneLimb(factory, 'polish:skeleton-femur', 0.042, 0.42 * variation.limbLength, bone);
  femur.position.y = -0.21 * variation.limbLength;
  thigh.add(femur);
  const knee = joint(`rig_knee${suffix}`, thigh, [0, -0.42 * variation.limbLength, 0]);
  knee.add(factory.mesh('polish:skeleton-patella', () => new THREE.SphereGeometry(0.055, 8, 6), bone));
  const shin = joint(`rig_shin${suffix}`, knee, [0, 0, 0]);
  for (const x of [-0.022, 0.022]) {
    const tibia = boneLimb(factory, 'polish:skeleton-tibia', x < 0 ? 0.027 : 0.021, 0.38 * variation.limbLength, bone);
    tibia.position.set(x, -0.19 * variation.limbLength, 0);
    shin.add(tibia);
  }
  const foot = joint(`rig_foot${suffix}`, shin, [0, -0.38 * variation.limbLength, 0.08]);
  for (let i = -2; i <= 2; i += 1) {
    const toe = boneLimb(factory, 'polish:skeleton-toe', 0.009, 0.18, bone);
    toe.rotation.x = Math.PI / 2;
    toe.position.set(i * 0.022, 0, 0.08);
    foot.add(toe);
  }
  Object.assign(rig, { [`shoulder${suffix}`]: shoulder, [`upperArm${suffix}`]: upperArm, [`elbow${suffix}`]: elbow, [`forearm${suffix}`]: forearm, [`hand${suffix}`]: hand, [`thigh${suffix}`]: thigh, [`knee${suffix}`]: knee, [`shin${suffix}`]: shin, [`foot${suffix}`]: foot });
  rig.sockets[`hand${suffix}`] = hand;
}

function joint(name, parent, position) {
  const node = new THREE.Group();
  node.name = name;
  node.position.set(...position);
  node.userData.restPosition = [...position];
  parent.add(node);
  return node;
}

function boneLimb(factory, key, radius, length, material) {
  return factory.mesh(key, () => new THREE.CylinderGeometry(radius * 0.88, radius, length, 8), material);
}
