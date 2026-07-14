import { THREE } from '../ThreeScene.js';
import { adventurerVisualSignature, canonicalRole, ensureAdventurerProfile, isStandardAdventurer } from '../../adventurers/AdventurerProfile.js';
import { BODY_BUILD_PROFILE, HAIR_COLORS, SKIN_TONES, STATURE_SCALE, resolveEquipment, resolvePalette } from './AdventurerVisualCatalog.js';

const LOD_DISTANCES = [0, 23, 48];
const TIER_RANK = { recruit: 0, seasoned: 1, veteran: 2, renowned: 3 };

export function createModernAdventurerMiniature(agent) {
  if (!isStandardAdventurer(agent)) return null;
  ensureAdventurerProfile(agent);

  const root = new THREE.Group();
  root.name = `modern-adventurer:${agent.id ?? agent.name ?? agent.role}`;
  root.userData.role = agent.role;
  root.userData.modernAdventurer = true;
  root.userData.adventurerVisualSignature = adventurerVisualSignature(agent);
  root.userData.animationSeed = (agent.appearanceSeed ?? 0) / 0xffffffff;

  const lod = new THREE.LOD();
  lod.name = 'adventurer-lod';
  root.add(lod);

  const rigs = [];
  for (let detail = 0; detail < 3; detail += 1) {
    const built = buildRiggedCharacter(agent, detail);
    rigs.push(built.rig);
    lod.addLevel(built.model, LOD_DISTANCES[detail]);
  }

  addPresentation(root, agent);
  root.userData.adventurerRigs = rigs;
  root.userData.lod = lod;
  return root;
}

function buildRiggedCharacter(agent, detail) {
  const role = canonicalRole(agent.role);
  const build = BODY_BUILD_PROFILE[agent.bodyBuild] ?? BODY_BUILD_PROFILE.average;
  const stature = STATURE_SCALE[agent.stature] ?? 1;
  const scale = 0.69 * build.height * stature;
  const palette = resolvePalette(agent.paletteFamily);
  const materials = createMaterials(palette, agent, detail);
  const equipment = resolveEquipment(role, agent.equipmentTier);

  const model = new THREE.Group();
  model.name = `adventurer-model-lod${detail}`;
  model.scale.setScalar(scale);

  const rig = createCanonicalRig(build);
  model.add(rig.rootBone);
  model.updateMatrixWorld(true);
  rig.skeleton.calculateInverses();
  rig.bindMatrix = model.matrixWorld.clone();
  rig.model = model;
  rig.detail = detail;
  rig.role = role;
  rig.build = build;
  rig.archetype = agent.visualArchetype;
  rig.baseScale = scale;

  addBody(model, rig, build, materials, detail, agent);
  addFaceAndHair(model, rig, materials, detail, agent, equipment);
  addEquipment(model, rig, materials, detail, agent, role, equipment);

  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = detail < 2;
    node.receiveShadow = false;
    node.frustumCulled = true;
  });

  return { model, rig };
}

function createCanonicalRig(build) {
  const limb = build.limb;
  const shoulder = build.shoulder;
  const rootBone = bone('root', [0, 0, 0]);
  const pelvis = bone('pelvis', [0, 0.9, 0], rootBone);
  const spine = bone('spine_01', [0, 0.28, 0], pelvis);
  const chest = bone('chest', [0, 0.34, 0], spine);
  const neck = bone('neck', [0, 0.28, 0], chest);
  const head = bone('head', [0, 0.2, 0], neck);

  const clavicleL = bone('clavicle.L', [-0.25 * shoulder, 0.17, 0], chest);
  const upperArmL = bone('upper_arm.L', [-0.11 * shoulder, -0.04, 0], clavicleL);
  const forearmL = bone('forearm.L', [0, -0.38 * limb, 0], upperArmL);
  const handL = bone('hand.L', [0, -0.32 * limb, 0], forearmL);

  const clavicleR = bone('clavicle.R', [0.25 * shoulder, 0.17, 0], chest);
  const upperArmR = bone('upper_arm.R', [0.11 * shoulder, -0.04, 0], clavicleR);
  const forearmR = bone('forearm.R', [0, -0.38 * limb, 0], upperArmR);
  const handR = bone('hand.R', [0, -0.32 * limb, 0], forearmR);

  const thighL = bone('thigh.L', [-0.14 * build.volume, -0.02, 0], pelvis);
  const shinL = bone('shin.L', [0, -0.48 * limb, 0], thighL);
  const footL = bone('foot.L', [0, -0.42 * limb, 0.07], shinL);
  const toeL = bone('toe.L', [0, -0.02, 0.16], footL);

  const thighR = bone('thigh.R', [0.14 * build.volume, -0.02, 0], pelvis);
  const shinR = bone('shin.R', [0, -0.48 * limb, 0], thighR);
  const footR = bone('foot.R', [0, -0.42 * limb, 0.07], shinR);
  const toeR = bone('toe.R', [0, -0.02, 0.16], footR);

  const capeRoot = bone('cape_root', [0, 0.17, -0.08], chest);
  const capeTip = bone('cape_tip', [0, -0.64, -0.05], capeRoot);

  rootBone.updateMatrixWorld(true);
  const bones = [rootBone, pelvis, spine, chest, neck, head, clavicleL, upperArmL, forearmL, handL, clavicleR, upperArmR, forearmR, handR, thighL, shinL, footL, toeL, thighR, shinR, footR, toeR, capeRoot, capeTip];
  const skeleton = new THREE.Skeleton(bones);
  const byName = Object.fromEntries(bones.map(value => [value.name, value]));
  const rest = new Map(bones.map(value => [value.name, {
    position: value.position.clone(),
    quaternion: value.quaternion.clone(),
    scale: value.scale.clone()
  }]));
  return { rootBone, skeleton, bones, byName, rest };
}

function addBody(model, rig, build, materials, detail, agent) {
  const anchors = restAnchors(build);
  const torso = createTorsoGeometry(anchors, rig, build, detail);
  const torsoMesh = skinnedMesh(torso, materials.underlayer, rig, 'body-torso');
  torsoMesh.morphTargetInfluences[0] = ['broad', 'heavy'].includes(agent.bodyBuild) ? 0.75 : agent.bodyBuild === 'lean' ? -0.25 : 0;
  torsoMesh.morphTargetInfluences[1] = agent.bodyBuild === 'heavy' ? 0.85 : 0;
  model.add(torsoMesh);

  const limbSpecs = [
    ['arm.L', anchors.shoulderL, anchors.elbowL, 0.105 * build.volume, 'upper_arm.L', 'forearm.L'],
    ['forearm.L', anchors.elbowL, anchors.handL, 0.095 * build.volume, 'forearm.L', 'hand.L'],
    ['arm.R', anchors.shoulderR, anchors.elbowR, 0.105 * build.volume, 'upper_arm.R', 'forearm.R'],
    ['forearm.R', anchors.elbowR, anchors.handR, 0.095 * build.volume, 'forearm.R', 'hand.R'],
    ['thigh.L', anchors.hipL, anchors.kneeL, 0.145 * build.volume, 'thigh.L', 'shin.L'],
    ['shin.L', anchors.kneeL, anchors.ankleL, 0.115 * build.volume, 'shin.L', 'foot.L'],
    ['thigh.R', anchors.hipR, anchors.kneeR, 0.145 * build.volume, 'thigh.R', 'shin.R'],
    ['shin.R', anchors.kneeR, anchors.ankleR, 0.115 * build.volume, 'shin.R', 'foot.R']
  ];
  for (const [name, start, end, radius, boneA, boneB] of limbSpecs) {
    const geometry = createSegmentGeometry(start, end, radius, detail === 0 ? 10 : detail === 1 ? 8 : 6, rig.bones.indexOf(rig.byName[boneA]), rig.bones.indexOf(rig.byName[boneB]));
    model.add(skinnedMesh(geometry, materials.underlayer, rig, `body-${name}`));
  }

  addRigidBodyPart(rig.byName['hand.L'], new THREE.SphereGeometry(0.12 * build.volume, detail === 2 ? 6 : 10, detail === 2 ? 4 : 7), materials.skin, 'hand.L', [0, -0.02, 0]);
  addRigidBodyPart(rig.byName['hand.R'], new THREE.SphereGeometry(0.12 * build.volume, detail === 2 ? 6 : 10, detail === 2 ? 4 : 7), materials.skin, 'hand.R', [0, -0.02, 0]);
  addBoot(rig.byName['foot.L'], materials, detail, -1, build);
  addBoot(rig.byName['foot.R'], materials, detail, 1, build);
}

function addFaceAndHair(model, rig, materials, detail, agent, equipment) {
  const head = rig.byName.head;
  const faceScale = faceScaleFor(agent.faceVariant);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.29, detail === 0 ? 18 : detail === 1 ? 12 : 8, detail === 0 ? 12 : 8), materials.skin);
  cranium.scale.set(faceScale.x, faceScale.y, faceScale.z);
  cranium.position.y = 0.05;
  cranium.name = 'face-cranium';
  head.add(cranium);

  if (detail < 2) {
    const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.12, 4, 8), materials.skin);
    jaw.scale.set(faceScale.jaw, 0.78, 0.84);
    jaw.position.set(0, -0.12, 0.035);
    jaw.name = 'face-jaw';
    head.add(jaw);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 7), materials.skin);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(faceScale.bias * 0.012, 0.015, 0.285);
    nose.name = 'face-nose';
    head.add(nose);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), materials.eye);
      eye.position.set(side * 0.09 * faceScale.x, 0.06, 0.275);
      eye.name = side < 0 ? 'eye.L' : 'eye.R';
      head.add(eye);
    }
  }

  const fullHelmet = ['nasal', 'kettle', 'sallet', 'sallet-crested', 'chaplain-helm'].includes(equipment.helmet);
  if (!fullHelmet || ['braid', 'tied-back'].includes(agent.hairStyle)) addHair(head, materials.hair, agent.hairStyle, detail, fullHelmet);
}

function addEquipment(model, rig, materials, detail, agent, role, equipment) {
  addSoftArmor(model, rig, materials, detail, role, equipment.armor);
  addHeadwear(rig, materials, detail, role, equipment.helmet, agent);
  addBackEquipment(rig, materials, detail, role, agent);
  addWeaponSet(rig, materials, detail, role, equipment, agent);
  addTierDetails(rig, materials, detail, role, agent.equipmentTier);
}

function addSoftArmor(model, rig, materials, detail, role, armorId) {
  const build = rig.build ?? BODY_BUILD_PROFILE.average;
  const anchors = restAnchors(build);
  const shell = createTorsoGeometry(anchors, rig, { ...build, volume: role === 'fighter' ? 1.1 : 1.04, shoulder: role === 'fighter' ? 1.08 : 1 }, Math.min(detail + 1, 2), 1.08);
  const material = role === 'fighter' || armorId.includes('plate') || armorId.includes('brigandine') ? materials.secondary : materials.primary;
  const mesh = skinnedMesh(shell, material, rig, `armor-soft:${armorId}`);
  model.add(mesh);

  if (detail === 2) return;
  if (role === 'fighter' || role === 'cleric') {
    const chest = rig.byName.chest;
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.37, detail === 0 ? 14 : 10, detail === 0 ? 9 : 7, 0, Math.PI * 2, 0.2, Math.PI * 0.65), materials.metal);
    plate.scale.set(role === 'fighter' ? 1.18 : 1.05, 0.9, 0.5);
    plate.position.set(0, 0.02, 0.13);
    plate.rotation.x = -0.08;
    plate.name = `armor-chest:${armorId}`;
    chest.add(plate);
    addPauldron(rig.byName['clavicle.L'], materials.metal, detail, -1, role === 'fighter' ? 1 : 0.82);
    if (armorId.includes('plate') || armorId.includes('veteran')) addPauldron(rig.byName['clavicle.R'], materials.metal, detail, 1, 0.9);
  }

  if (role === 'rogue' || role === 'archer') {
    const chest = rig.byName.chest;
    const strapA = strapMesh(materials.leather, 0.055, 0.84);
    strapA.rotation.z = 0.55;
    strapA.position.set(0, -0.03, 0.26);
    chest.add(strapA);
    const strapB = strapMesh(materials.leather, 0.045, 0.74);
    strapB.rotation.z = -0.45;
    strapB.position.set(0.03, -0.08, 0.27);
    chest.add(strapB);
  }

  if (role === 'wizard' || role === 'cleric') addRobeSkirt(model, rig, materials, detail, role);
}

function addRobeSkirt(model, rig, materials, detail, role) {
  const geometry = new THREE.CylinderGeometry(0.2, 0.46, 0.86, detail === 0 ? 12 : 8, 4, true);
  geometry.translate(0, 0.48, 0);
  const position = geometry.getAttribute('position');
  const skinIndices = [];
  const skinWeights = [];
  const pelvisIndex = rig.bones.indexOf(rig.byName.pelvis);
  const thighLIndex = rig.bones.indexOf(rig.byName['thigh.L']);
  const thighRIndex = rig.bones.indexOf(rig.byName['thigh.R']);
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    const lower = Math.max(0, Math.min(1, (0.45 - y) / 0.45));
    skinIndices.push(pelvisIndex, position.getX(i) < 0 ? thighLIndex : thighRIndex, 0, 0);
    skinWeights.push(1 - lower * 0.45, lower * 0.45, 0, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  const mesh = skinnedMesh(geometry, role === 'wizard' ? materials.primary : materials.secondary, rig, 'robe-skirt');
  mesh.position.y = 0.02;
  model.add(mesh);
}

function addHeadwear(rig, materials, detail, role, id, agent) {
  const head = rig.byName.head;
  if (!id || detail === 2 && !['hood', 'headband', 'circlet', 'travel-hat'].includes(id)) return;
  if (role === 'fighter' || id.includes('helm') || ['nasal', 'kettle', 'sallet', 'sallet-crested'].includes(id)) {
    const helmet = new THREE.Group();
    helmet.name = `headwear:${id}`;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.325, detail === 0 ? 16 : 10, detail === 0 ? 10 : 7, 0, Math.PI * 2, 0, Math.PI * 0.62), materials.metal);
    dome.scale.set(1.04, 1.02, 1.08);
    dome.position.y = 0.03;
    helmet.add(dome);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 6, detail === 0 ? 20 : 12, Math.PI), materials.metalDark);
    brow.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    brow.position.set(0, 0.04, 0.08);
    helmet.add(brow);
    if (id !== 'kettle') {
      const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.065), materials.metal);
      nasal.position.set(0, -0.07, 0.305);
      helmet.add(nasal);
    }
    if (detail === 0 && (id.includes('sallet') || id.includes('chaplain'))) {
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), materials.metalDark);
        cheek.position.set(side * 0.24, -0.08, 0.16);
        cheek.rotation.z = side * 0.12;
        helmet.add(cheek);
      }
      const neckGuard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.08), materials.metalDark);
      neckGuard.position.set(0, -0.12, -0.25);
      neckGuard.rotation.x = -0.28;
      helmet.add(neckGuard);
    }
    if (id.includes('crested') || id.includes('crown')) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 7), materials.accent);
      crest.position.y = 0.48;
      crest.rotation.z = -0.08;
      helmet.add(crest);
    }
    head.add(helmet);
    return;
  }

  if (id.includes('hood') || id.includes('cowl')) {
    const hood = new THREE.Group();
    hood.name = `headwear:${id}`;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.36, detail === 0 ? 16 : 10, detail === 0 ? 10 : 7, 0, Math.PI * 2, 0, Math.PI * 0.78), materials.primary);
    shell.scale.set(1.05, 1.1, 1.08);
    shell.position.y = 0.02;
    hood.add(shell);
    const cowl = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 6, detail === 0 ? 18 : 12), materials.primary);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.y = -0.22;
    hood.add(cowl);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.035), materials.dark);
    mask.position.set(0, -0.06, 0.3);
    mask.visible = id.includes('mask');
    hood.add(mask);
    head.add(hood);
    return;
  }

  if (role === 'wizard' && id.includes('hat')) {
    const hat = new THREE.Group();
    hat.name = `headwear:${id}`;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.055, detail === 0 ? 20 : 12), materials.primary);
    brim.position.y = 0.25;
    hat.add(brim);
    const lower = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.62, detail === 0 ? 14 : 9), materials.primary);
    lower.position.y = 0.56;
    lower.rotation.z = -0.08;
    hat.add(lower);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, detail === 0 ? 12 : 8), materials.secondary);
    tip.position.set(-0.08, 0.95, 0);
    tip.rotation.z = -0.35;
    hat.add(tip);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 16), materials.accent);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.34;
    hat.add(band);
    head.add(hat);
    return;
  }

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, id.includes('crown') ? 0.045 : 0.025, 6, 18), id.includes('crown') ? materials.accent : materials.primary);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.1;
  band.name = `headwear:${id}`;
  head.add(band);
}

function addBackEquipment(rig, materials, detail, role, agent) {
  if (detail === 2) return;
  const chest = rig.byName.chest;
  if (role === 'archer') {
    const quiver = new THREE.Group();
    quiver.name = 'back-quiver';
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.72, 8), materials.leather);
    tube.rotation.z = -0.18;
    quiver.add(tube);
    for (let i = 0; i < 5; i += 1) {
      const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.82, 5), materials.wood);
      arrow.position.set((i - 2) * 0.035, 0.18 + (i % 2) * 0.04, 0);
      quiver.add(arrow);
    }
    quiver.position.set(0.2, 0.02, -0.25);
    chest.add(quiver);
  } else if (role === 'wizard') {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.11), materials.leather);
    book.position.set(0.18, -0.04, -0.28);
    book.rotation.z = -0.12;
    book.name = 'back-spellbook';
    chest.add(book);
  } else if (role === 'cleric') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.2), materials.leather);
    pack.position.set(0, -0.02, -0.27);
    pack.name = 'back-relic-pack';
    chest.add(pack);
  } else if (role === 'fighter' && TIER_RANK[agent.equipmentTier] >= 2) {
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.78, 10, 1, true), materials.primary);
    cape.rotation.x = Math.PI;
    cape.scale.z = 0.32;
    cape.position.set(0, -0.28, -0.12);
    cape.name = 'veteran-cape';
    rig.byName.cape_root.add(cape);
  }
}

function addWeaponSet(rig, materials, detail, role, equipment, agent) {
  const right = rig.byName['hand.R'];
  const left = rig.byName['hand.L'];
  if (role === 'fighter') {
    right.add(buildSword(materials, equipment.weapon.includes('long') ? 1.05 : 0.88, detail));
    rig.byName['forearm.L'].add(buildShield(materials, equipment.offhand, detail));
  } else if (role === 'rogue') {
    right.add(buildDagger(materials, false, detail));
    left.add(buildDagger(materials, true, detail));
  } else if (role === 'cleric') {
    right.add(buildMace(materials, detail));
    left.add(buildRelic(materials, equipment.offhand, detail));
  } else if (role === 'wizard') {
    right.add(buildStaff(materials, detail));
    left.add(buildFocus(materials, detail));
  } else if (role === 'archer') {
    left.add(buildBow(materials, detail));
    right.add(buildArrow(materials, detail));
  }
}

function addTierDetails(rig, materials, detail, role, tier) {
  if (detail === 2 || TIER_RANK[tier] < 1) return;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 16), materials.leather);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.02;
  belt.name = 'equipment-belt';
  rig.byName.pelvis.add(belt);
  if (TIER_RANK[tier] >= 2) {
    const trophy = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), materials.accent);
    trophy.position.set(0.24, -0.1, 0.19);
    trophy.rotation.z = 0.3;
    trophy.name = 'veteran-trophy';
    rig.byName.pelvis.add(trophy);
  }
  if (tier === 'renowned') {
    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 6, 28), materials.magic);
    aura.rotation.x = Math.PI / 2;
    aura.position.y = -0.88;
    aura.name = 'renowned-aura';
    rig.byName.pelvis.add(aura);
  }
}

function addPresentation(root, agent) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({ color: 0x07080a, transparent: true, opacity: 0.26, depthWrite: false })
  );
  shadow.name = 'miniature_contact_shadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.028, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0x8bc8ff, transparent: true, opacity: 0.78 })
  );
  ring.name = 'adventurer-selection-ring';
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.018;
  root.add(ring);

  const hpBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.055, 0.035), new THREE.MeshBasicMaterial({ color: 0x2c1012 }));
  hpBack.position.set(0, 1.62, 0);
  root.add(hpBack);
  const hp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0x9cdba4 }));
  hp.name = 'hp';
  hp.position.set(0, 1.62, 0.006);
  root.add(hp);
}

function createMaterials(palette, agent, detail) {
  const condition = agent.equipmentCondition;
  const roughnessBias = condition === 'maintained' ? -0.06 : condition === 'field-repaired' ? 0.12 : 0.05;
  return {
    skin: standard(SKIN_TONES[agent.skinTone] ?? SKIN_TONES['warm-02'], 0.72, 0),
    eye: standard(0x1c2024, 0.28, 0),
    hair: standard(HAIR_COLORS[agent.hairColor] ?? HAIR_COLORS['brown-dark'], 0.86, 0),
    underlayer: standard(palette.secondary, 0.82 + roughnessBias, 0),
    primary: standard(palette.primary, 0.76 + roughnessBias, 0),
    secondary: standard(palette.secondary, 0.74 + roughnessBias, 0),
    leather: standard(palette.leather, 0.8 + roughnessBias, 0.02),
    metal: standard(palette.metal, 0.36 + roughnessBias, detail === 2 ? 0.2 : 0.55),
    metalDark: standard(darken(palette.metal, 0.64), 0.44 + roughnessBias, detail === 2 ? 0.15 : 0.48),
    accent: standard(palette.accent, 0.48 + roughnessBias, 0.18),
    dark: standard(palette.dark, 0.9, 0),
    wood: standard(0x5a3a25, 0.86, 0),
    magic: new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.75, transparent: true, opacity: 0.68, roughness: 0.24 })
  };
}

function standard(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: Math.max(0.08, Math.min(1, roughness)), metalness: Math.max(0, Math.min(1, metalness)) });
}

function createTorsoGeometry(anchors, rig, build, detail, shellScale = 1) {
  const radial = detail === 0 ? 12 : detail === 1 ? 9 : 7;
  const rings = [
    { y: anchors.pelvis.y - 0.12, rx: 0.25 * build.volume, rz: 0.18 * build.volume, bones: ['pelvis', 'spine_01'], blend: 0.08 },
    { y: anchors.spine.y, rx: 0.29 * build.volume, rz: 0.19 * build.volume, bones: ['pelvis', 'spine_01'], blend: 0.7 },
    { y: anchors.chest.y - 0.1, rx: 0.37 * build.shoulder, rz: 0.22 * build.volume, bones: ['spine_01', 'chest'], blend: 0.65 },
    { y: anchors.chest.y + 0.18, rx: 0.39 * build.shoulder, rz: 0.23 * build.volume, bones: ['chest', 'neck'], blend: 0.2 }
  ];
  const positions = [];
  const normals = [];
  const skinIndices = [];
  const skinWeights = [];
  const indices = [];
  for (let r = 0; r < rings.length; r += 1) {
    const ring = rings[r];
    for (let i = 0; i < radial; i += 1) {
      const angle = i / radial * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.push(cos * ring.rx * shellScale, ring.y, sin * ring.rz * shellScale);
      normals.push(cos, 0, sin);
      const a = rig.bones.indexOf(rig.byName[ring.bones[0]]);
      const b = rig.bones.indexOf(rig.byName[ring.bones[1]]);
      skinIndices.push(a, b, 0, 0);
      skinWeights.push(1 - ring.blend, ring.blend, 0, 0);
    }
  }
  for (let r = 0; r < rings.length - 1; r += 1) {
    for (let i = 0; i < radial; i += 1) {
      const next = (i + 1) % radial;
      const a = r * radial + i;
      const b = r * radial + next;
      const c = (r + 1) * radial + next;
      const d = (r + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.morphAttributes.position = [morphDelta(geometry, 0.12, 0.04), morphDelta(geometry, 0.08, 0.12)];
  geometry.morphTargetsRelative = true;
  return geometry;
}

function morphDelta(geometry, horizontal, forward) {
  const position = geometry.getAttribute('position');
  const deltas = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    deltas[i * 3] = position.getX(i) * horizontal;
    deltas[i * 3 + 1] = 0;
    deltas[i * 3 + 2] = position.getZ(i) * forward;
  }
  return new THREE.Float32BufferAttribute(deltas, 3);
}

function createSegmentGeometry(start, end, radius, radial, boneA, boneB) {
  const rings = 6;
  const positions = [];
  const normals = [];
  const skinIndices = [];
  const skinWeights = [];
  const indices = [];
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();
  const helper = Math.abs(direction.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const axisX = new THREE.Vector3().crossVectors(direction, helper).normalize();
  const axisZ = new THREE.Vector3().crossVectors(direction, axisX).normalize();
  for (let r = 0; r < rings; r += 1) {
    const t = r / (rings - 1);
    const center = start.clone().lerp(end, t);
    const taper = 0.78 + Math.sin(t * Math.PI) * 0.22;
    for (let i = 0; i < radial; i += 1) {
      const angle = i / radial * Math.PI * 2;
      const normal = axisX.clone().multiplyScalar(Math.cos(angle)).add(axisZ.clone().multiplyScalar(Math.sin(angle))).normalize();
      const point = center.clone().addScaledVector(normal, radius * taper);
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
      skinIndices.push(boneA, boneB, 0, 0);
      skinWeights.push(1 - t, t, 0, 0);
    }
  }
  for (let r = 0; r < rings - 1; r += 1) {
    for (let i = 0; i < radial; i += 1) {
      const next = (i + 1) % radial;
      const a = r * radial + i;
      const b = r * radial + next;
      const c = (r + 1) * radial + next;
      const d = (r + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function skinnedMesh(geometry, material, rig, name) {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.bind(rig.skeleton, rig.bindMatrix ?? new THREE.Matrix4());
  mesh.normalizeSkinWeights();
  return mesh;
}

function restAnchors(build) {
  const limb = build.limb;
  const shoulder = build.shoulder;
  return {
    pelvis: new THREE.Vector3(0, 0.9, 0),
    spine: new THREE.Vector3(0, 1.18, 0),
    chest: new THREE.Vector3(0, 1.52, 0),
    shoulderL: new THREE.Vector3(-0.36 * shoulder, 1.65, 0),
    elbowL: new THREE.Vector3(-0.36 * shoulder, 1.27 * limb, 0),
    handL: new THREE.Vector3(-0.36 * shoulder, 0.95 * limb, 0),
    shoulderR: new THREE.Vector3(0.36 * shoulder, 1.65, 0),
    elbowR: new THREE.Vector3(0.36 * shoulder, 1.27 * limb, 0),
    handR: new THREE.Vector3(0.36 * shoulder, 0.95 * limb, 0),
    hipL: new THREE.Vector3(-0.14 * build.volume, 0.88, 0),
    kneeL: new THREE.Vector3(-0.14 * build.volume, 0.43 * limb, 0),
    ankleL: new THREE.Vector3(-0.14 * build.volume, 0.02, 0.05),
    hipR: new THREE.Vector3(0.14 * build.volume, 0.88, 0),
    kneeR: new THREE.Vector3(0.14 * build.volume, 0.43 * limb, 0),
    ankleR: new THREE.Vector3(0.14 * build.volume, 0.02, 0.05)
  };
}

function addRigidBodyPart(parent, geometry, material, name, position) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addBoot(parent, materials, detail, side, build) {
  const boot = new THREE.Group();
  boot.name = side < 0 ? 'boot.L' : 'boot.R';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * build.volume, 0.22, 4, detail === 2 ? 6 : 9), materials.dark);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, -0.04, 0.12);
  body.scale.set(1.05, 1, 1.22);
  boot.add(body);
  parent.add(boot);
}

function addPauldron(parent, material, detail, side, scale) {
  const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, detail === 0 ? 12 : 8, detail === 0 ? 8 : 6, 0, Math.PI * 2, 0, Math.PI * 0.55), material);
  pauldron.scale.set(1.25, 0.7, 1.05);
  pauldron.position.set(side * 0.07, 0.03, 0);
  pauldron.rotation.z = side * 0.18;
  pauldron.name = side < 0 ? 'pauldron.L' : 'pauldron.R';
  parent.add(pauldron);
}

function strapMesh(material, width, length) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.03), material);
}

function addHair(head, material, style, detail, helmeted) {
  const group = new THREE.Group();
  group.name = `hair:${style}`;
  const segments = detail === 0 ? 10 : 7;
  if (!helmeted && !['shaved', 'tonsure'].includes(style)) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.302, segments + 4, segments, 0, Math.PI * 2, 0, Math.PI * 0.48), material);
    cap.position.y = 0.12;
    cap.scale.set(1.02, 0.74, 1.03);
    group.add(cap);
  }
  if (['tied-back', 'braid'].includes(style)) {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, style === 'braid' ? 0.46 : 0.28, 3, 7), material);
    tail.position.set(0, -0.08, -0.3);
    tail.rotation.x = -0.12;
    group.add(tail);
  }
  if (style === 'bob' && !helmeted) {
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 7), material);
      lock.position.set(side * 0.24, -0.06, 0.01);
      group.add(lock);
    }
  }
  if (style === 'tonsure') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 6, 18), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    group.add(ring);
  }
  head.add(group);
}

function buildSword(materials, length, detail) {
  const group = new THREE.Group();
  group.name = 'weapon:sword';
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8), materials.leather);
  grip.position.y = 0.08;
  group.add(grip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.06), materials.accent);
  guard.position.y = 0.23;
  group.add(guard);
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.075, length, detail === 2 ? 4 : 6), materials.metal);
  blade.position.y = 0.23 + length * 0.48;
  group.add(blade);
  group.rotation.z = -0.12;
  return group;
}

function buildDagger(materials, reverse, detail) {
  const dagger = buildSword(materials, 0.46, detail);
  dagger.name = 'weapon:dagger';
  dagger.scale.setScalar(0.82);
  dagger.rotation.z = reverse ? Math.PI + 0.18 : -0.18;
  return dagger;
}

function buildMace(materials, detail) {
  const group = new THREE.Group();
  group.name = 'weapon:mace';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.68, 8), materials.leather);
  shaft.position.y = 0.22;
  group.add(shaft);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, detail === 0 ? 1 : 0), materials.metal);
  head.position.y = 0.62;
  group.add(head);
  return group;
}

function buildStaff(materials, detail) {
  const group = new THREE.Group();
  group.name = 'weapon:staff';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 1.45, 8), materials.wood);
  shaft.position.y = 0.3;
  group.add(shaft);
  const focus = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, detail === 0 ? 1 : 0), materials.magic);
  focus.position.y = 1.05;
  group.add(focus);
  group.position.y = -0.32;
  return group;
}

function buildFocus(materials, detail) {
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, detail === 0 ? 1 : 0), materials.magic);
  orb.name = 'offhand:focus';
  return orb;
}

function buildRelic(materials, id, detail) {
  const group = new THREE.Group();
  group.name = `offhand:${id}`;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.34, 0.08), materials.leather);
  group.add(frame);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, detail === 0 ? 12 : 8), materials.accent);
  seal.rotation.x = Math.PI / 2;
  seal.position.z = 0.055;
  group.add(seal);
  return group;
}

function buildShield(materials, id, detail) {
  const group = new THREE.Group();
  group.name = `offhand:${id}`;
  const round = id?.includes('round');
  const board = round
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.075, detail === 0 ? 18 : 12), materials.secondary)
    : new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.68, detail === 0 ? 6 : 5), materials.secondary);
  board.rotation.x = Math.PI / 2;
  board.rotation.z = Math.PI / 2;
  board.position.set(-0.02, -0.2, 0.13);
  group.add(board);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 7), materials.metal);
  boss.position.set(-0.02, -0.2, 0.2);
  group.add(boss);
  for (const y of [-0.12, 0.08]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.03), materials.leather);
    strap.position.set(-0.02, y - 0.2, 0.02);
    group.add(strap);
  }
  group.rotation.z = -0.1;
  return group;
}

function buildBow(materials, detail) {
  const group = new THREE.Group();
  group.name = 'weapon:bow';
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.62, 0),
    new THREE.Vector3(-0.18, -0.28, 0),
    new THREE.Vector3(-0.22, 0, 0),
    new THREE.Vector3(-0.18, 0.28, 0),
    new THREE.Vector3(0, 0.62, 0)
  ]);
  const bow = new THREE.Mesh(new THREE.TubeGeometry(curve, detail === 0 ? 20 : 12, 0.025, 6, false), materials.wood);
  group.add(bow);
  const string = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.62, 0), new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(0, 0.62, 0)]),
    new THREE.LineBasicMaterial({ color: 0xd8d0bc })
  );
  string.name = 'bow-string';
  group.add(string);
  group.rotation.z = -0.05;
  return group;
}

function buildArrow(materials, detail) {
  const group = new THREE.Group();
  group.name = 'weapon:arrow';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.78, 5), materials.wood);
  shaft.position.y = 0.26;
  group.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 5), materials.metal);
  tip.position.y = 0.71;
  group.add(tip);
  return group;
}

function faceScaleFor(variant) {
  if (variant === 'angular-01') return { x: 0.94, y: 1.04, z: 0.94, jaw: 0.86, bias: -0.5 };
  if (variant === 'angular-02') return { x: 0.98, y: 1.08, z: 0.92, jaw: 0.9, bias: 0.45 };
  if (variant === 'soft-01') return { x: 1.04, y: 0.98, z: 1.02, jaw: 1.02, bias: 0.1 };
  if (variant === 'broad-01') return { x: 1.1, y: 0.98, z: 1, jaw: 1.12, bias: -0.15 };
  return { x: 0.92, y: 1.05, z: 0.96, jaw: 0.84, bias: 0.3 };
}

function bone(name, position, parent = null) {
  const value = new THREE.Bone();
  value.name = name;
  value.position.set(...position);
  if (parent) parent.add(value);
  return value;
}

function darken(color, factor) {
  const value = new THREE.Color(color);
  value.multiplyScalar(factor);
  return value;
}

export function disposeModernAdventurer(root) {
  if (!root?.userData?.modernAdventurer) return false;
  const materials = new Set();
  root.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => materials.add(material));
    else if (node.material) materials.add(node.material);
  });
  for (const material of materials) material.dispose?.();
  return true;
}
