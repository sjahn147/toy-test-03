import { THREE } from '../ThreeScene.js';
import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';

const geometryCache = new Map();
const materialCache = new Map();

export function createHeroMiniature(agent) {
  const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
  if (!definition) return null;

  const root = new THREE.Group();
  root.name = `hero-miniature:${definition.id}`;
  root.userData.agentId = agent.id;
  root.userData.heroId = definition.id;
  root.userData.role = definition.role;
  root.userData.isHero = true;
  root.userData.articulated = true;
  root.userData.animationProfile = definition.visual.animationProfile;
  root.userData.baseScale = 1;

  const model = new THREE.Group();
  model.name = 'hero-model';
  model.scale.setScalar(definition.visual.scale ?? 1);
  root.add(model);

  const materials = makeMaterials(definition);
  let assembly;
  if (definition.id === 'hero.nibble') assembly = buildNibble(model, definition, materials);
  else if (definition.id === 'hero.kirik') assembly = buildKirik(model, definition, materials);
  else if (definition.id === 'hero.karg') assembly = buildKarg(model, definition, materials);
  else return null;

  root.userData.joints = assembly.joints;
  root.userData.secondary = assembly.secondary ?? {};
  root.userData.damageParts = assembly.damageParts ?? { stage1Hide: [], stage2Hide: [], stage1Show: [], stage2Show: [] };
  root.userData.skillParts = assembly.skillParts ?? {};
  root.userData.heroMeshCount = countMeshes(root);
  addHeroIndicators(root, definition, materials);
  root.traverse(node => { node.userData.agentId = agent.id; node.userData.heroId = definition.id; });
  return root;
}

function buildNibble(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    pelvis: { parent: 'motionRoot', position: [0, 0.46, 0] },
    legL: { parent: 'pelvis', position: [-0.16, -0.28, 0] },
    footL: { parent: 'legL', position: [0, -0.28, 0.08] },
    legR: { parent: 'pelvis', position: [0.16, -0.28, 0] },
    footR: { parent: 'legR', position: [0, -0.28, 0.08] },
    spineLower: { parent: 'pelvis', position: [0, 0.22, 0] },
    chest: { parent: 'spineLower', position: [0, 0.32, 0] },
    neck: { parent: 'chest', position: [0, 0.34, 0] },
    head: { parent: 'neck', position: [0, 0.24, 0.02] },
    shoulderL: { parent: 'chest', position: [-0.32, 0.18, 0] },
    upperArmL: { parent: 'shoulderL', position: [-0.12, -0.14, 0] },
    forearmL: { parent: 'upperArmL', position: [0, -0.24, 0] },
    handL: { parent: 'forearmL', position: [0, -0.17, 0] },
    shoulderR: { parent: 'chest', position: [0.32, 0.18, 0] },
    upperArmR: { parent: 'shoulderR', position: [0.12, -0.14, 0] },
    forearmR: { parent: 'upperArmR', position: [0, -0.24, 0] },
    handR: { parent: 'forearmR', position: [0, -0.17, 0] },
    coatRoot: { parent: 'chest', position: [0, -0.12, 0] },
    coatLeft: { parent: 'coatRoot', position: [-0.28, -0.16, 0] },
    coatRight: { parent: 'coatRoot', position: [0.28, -0.16, 0] },
    coatBack: { parent: 'coatRoot', position: [0, -0.16, -0.16] },
    staff: { parent: 'handR', position: [0, -0.08, 0.02] },
    keyRing: { parent: 'staff', position: [0, 0.52, 0] },
    pocketHand: { parent: 'handL', position: [0, 0, 0] },
    baseFx: { parent: 'motionRoot', position: [0, 0.02, 0] }
  });

  add(joints.pelvis, box('hero:nibble:pelvis', [0.42, 0.25, 0.32], materials.leather));
  add(joints.chest, capsule('hero:nibble:torso', 0.24, 0.36, materials.clothInner));
  for (const side of ['L', 'R']) {
    add(joints[`leg${side}`], capsule('hero:nibble:leg', 0.085, 0.38, materials.clothInner));
    add(joints[`foot${side}`], box('hero:nibble:boot', [0.18, 0.12, 0.28], materials.dark));
    add(joints[`upperArm${side}`], capsule('hero:nibble:upper-arm', 0.075, 0.28, materials.cloth));
    add(joints[`forearm${side}`], capsule('hero:nibble:forearm', 0.065, 0.23, materials.cloth));
    add(joints[`hand${side}`], sphere('hero:nibble:hand', 0.095, materials.skin));
  }

  const head = sphere('hero:nibble:head', 0.29, materials.skin);
  head.scale.set(1.1, 1.04, 0.9);
  add(joints.head, head);
  const nose = cone('hero:nibble:nose', 0.09, 0.32, materials.skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.03, 0.28);
  joints.head.add(nose);
  addEyes(joints.head, materials.dark, materials.accent, 0.18, 0.09, 0.24);
  const earL = cone('hero:nibble:ear', 0.12, 0.42, materials.skin);
  earL.rotation.z = Math.PI / 2;
  earL.position.x = -0.34;
  const earR = cone('hero:nibble:torn-ear', 0.11, 0.25, materials.skin);
  earR.rotation.z = -Math.PI / 2;
  earR.position.x = 0.33;
  joints.head.add(earL, earR);

  const coatShell = openCone('hero:nibble:coat-shell', 0.82, 1.1, 10, materials.cloth);
  coatShell.position.y = -0.42;
  coatShell.scale.z = 0.72;
  joints.coatRoot.add(coatShell);
  const leftPanel = box('hero:nibble:coat-panel', [0.44, 0.92, 0.08], materials.cloth);
  leftPanel.position.set(-0.12, -0.3, 0.35);
  leftPanel.rotation.z = -0.08;
  const rightPanel = box('hero:nibble:coat-panel', [0.44, 0.92, 0.08], materials.cloth);
  rightPanel.position.set(0.12, -0.3, 0.35);
  rightPanel.rotation.z = 0.08;
  const backPanel = box('hero:nibble:coat-back', [0.7, 0.95, 0.08], materials.cloth);
  backPanel.position.set(0, -0.3, -0.2);
  joints.coatLeft.add(leftPanel);
  joints.coatRight.add(rightPanel);
  joints.coatBack.add(backPanel);

  const buttons = [];
  for (let row = 0; row < 5; row += 1) {
    for (const side of [-1, 1]) {
      const button = cylinder('hero:nibble:button', 0.035, 0.025, materials.brass, true);
      button.position.set(side * 0.11, 0.11 - row * 0.16, 0.405);
      button.rotation.x = Math.PI / 2;
      button.name = `hero-part:nibble-button-${row}-${side}`;
      joints.coatRoot.add(button);
      buttons.push(button);
    }
  }
  for (const x of [-0.33, 0.33]) {
    const pocket = box('hero:nibble:pocket', [0.22, 0.2, 0.08], materials.leather);
    pocket.position.set(x, -0.42, 0.39);
    joints.coatRoot.add(pocket);
  }

  const staffShaft = cylinder('hero:nibble:staff-shaft', 0.035, 1.32, materials.leather);
  staffShaft.position.y = 0.34;
  joints.staff.add(staffShaft);
  const staffHead = torus('hero:nibble:staff-ring', 0.16, 0.028, materials.brass);
  staffHead.position.y = 0.98;
  staffHead.rotation.x = Math.PI / 2;
  joints.staff.add(staffHead);
  const keys = [];
  for (let i = 0; i < 6; i += 1) {
    const key = makeKey(materials.brass, i);
    const angle = (i / 6) * Math.PI * 2;
    key.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.04, Math.sin(angle) * 0.16);
    key.rotation.z = angle;
    joints.keyRing.add(key);
    keys.push(key);
  }
  const satchel = box('hero:nibble:satchel', [0.38, 0.42, 0.22], materials.leather);
  satchel.position.set(0.38, -0.12, -0.18);
  joints.coatBack.add(satchel);

  const tornCloth = box('hero:nibble:torn-cloth', [0.28, 0.56, 0.05], materials.clothInner);
  tornCloth.position.set(-0.35, -0.4, 0.22);
  tornCloth.rotation.z = -0.28;
  tornCloth.visible = false;
  tornCloth.name = 'hero-damage:stage2-show:torn-coat';
  joints.coatRoot.add(tornCloth);

  return {
    joints,
    secondary: { coatLeft: joints.coatLeft, coatRight: joints.coatRight, coatBack: joints.coatBack, keyRing: joints.keyRing },
    damageParts: {
      stage1Hide: buttons.filter((_, index) => index % 3 === 0),
      stage2Hide: [leftPanel, ...buttons.filter((_, index) => index % 2 === 1)],
      stage1Show: [],
      stage2Show: [tornCloth]
    },
    skillParts: { staff: joints.staff, keyRing: joints.keyRing, coatLeft: joints.coatLeft, coatRight: joints.coatRight }
  };
}

function buildKirik(model, definition, materials) {
  const specs = {
    motionRoot: { parent: null, position: [0, 0, 0] },
    chassis: { parent: 'motionRoot', position: [0, 0.9, 0] },
    pilotBody: { parent: 'chassis', position: [0, 0.2, 0.02] },
    pilotHead: { parent: 'pilotBody', position: [0, 0.34, 0.08] },
    toolArmL: { parent: 'chassis', position: [-0.46, 0.14, 0.18] },
    toolArmR: { parent: 'chassis', position: [0.46, 0.14, 0.18] },
    gear: { parent: 'chassis', position: [0, 0.18, -0.42] },
    lens: { parent: 'pilotHead', position: [0.12, 0.02, 0.24] },
    boiler: { parent: 'chassis', position: [0, -0.06, -0.02] },
    baseFx: { parent: 'motionRoot', position: [0, 0.03, 0] }
  };
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    specs[`leg${i}`] = { parent: 'chassis', position: [Math.cos(angle) * 0.42, -0.18, Math.sin(angle) * 0.42] };
    specs[`knee${i}`] = { parent: `leg${i}`, position: [Math.cos(angle) * 0.48, -0.34, Math.sin(angle) * 0.48] };
    specs[`foot${i}`] = { parent: `knee${i}`, position: [Math.cos(angle) * 0.42, -0.42, Math.sin(angle) * 0.42] };
    specs[`stabilizer${i}`] = { parent: `foot${i}`, position: [0, -0.05, 0] };
  }
  const joints = buildHierarchy(model, specs);

  const chassis = cylinder('hero:kirik:chassis', 0.42, 0.44, materials.metal);
  chassis.rotation.x = Math.PI / 2;
  joints.chassis.add(chassis);
  const boiler = sphere('hero:kirik:boiler', 0.25, materials.brass);
  boiler.scale.set(1.1, 0.9, 1);
  joints.boiler.add(boiler);
  for (const x of [-0.16, 0.16]) {
    const insulator = cylinder('hero:kirik:insulator', 0.05, 0.22, materials.accent);
    insulator.position.set(x, 0.18, -0.18);
    joints.chassis.add(insulator);
  }

  for (let i = 0; i < 3; i += 1) {
    const upper = cylinder('hero:kirik:upper-leg', 0.055, 0.72, materials.metal, true);
    upper.position.x = 0.28;
    joints[`leg${i}`].add(upper);
    const lower = cylinder('hero:kirik:lower-leg', 0.045, 0.66, materials.metal, true);
    lower.position.x = 0.25;
    joints[`knee${i}`].add(lower);
    const foot = box('hero:kirik:foot', [0.38, 0.12, 0.28], materials.dark);
    joints[`foot${i}`].add(foot);
    const stabilizer = cone('hero:kirik:stabilizer', 0.11, 0.38, materials.brass);
    stabilizer.position.y = -0.18;
    joints[`stabilizer${i}`].add(stabilizer);
    const piston = cylinder('hero:kirik:piston', 0.035, 0.48, materials.accent, true);
    piston.position.z = 0.08;
    joints[`leg${i}`].add(piston);
  }

  const pilotTorso = capsule('hero:kirik:pilot-torso', 0.16, 0.32, materials.cloth);
  joints.pilotBody.add(pilotTorso);
  const pilotHead = sphere('hero:kirik:pilot-head', 0.2, materials.skin);
  pilotHead.scale.set(1.05, 0.9, 0.92);
  joints.pilotHead.add(pilotHead);
  const snout = cone('hero:kirik:snout', 0.07, 0.24, materials.skin);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.03, 0.2);
  joints.pilotHead.add(snout);
  for (const side of [-1, 1]) {
    const horn = cone('hero:kirik:horn', 0.045, 0.2, materials.dark);
    horn.position.set(side * 0.13, 0.13, -0.02);
    horn.rotation.z = side * -0.35;
    joints.pilotHead.add(horn);
  }
  addEyes(joints.pilotHead, materials.dark, materials.accent, 0.12, 0.05, 0.18);
  const lensRing = torus('hero:kirik:lens-ring', 0.12, 0.025, materials.brass);
  lensRing.rotation.x = Math.PI / 2;
  const lensGlass = sphere('hero:kirik:lens-glass', 0.09, materials.glass);
  lensGlass.scale.z = 0.28;
  joints.lens.add(lensRing, lensGlass);

  const gear = toothedGear(materials.brass, 0.34, 10);
  joints.gear.add(gear);
  const windingKey = box('hero:kirik:winding-key', [0.12, 0.66, 0.08], materials.brass);
  windingKey.position.y = 0.34;
  joints.gear.add(windingKey);

  const wrench = makeWrench(materials.metal, materials.brass);
  wrench.position.y = -0.22;
  joints.toolArmL.add(wrench);
  const hammer = makeHammer(materials.metal, materials.leather);
  hammer.position.y = -0.22;
  joints.toolArmR.add(hammer);
  for (const jointName of ['toolArmL', 'toolArmR']) {
    const arm = capsule('hero:kirik:work-arm', 0.055, 0.5, materials.metal);
    arm.position.y = -0.18;
    joints[jointName].add(arm);
  }

  const smokeStage1 = makeSmokePuff(materials.darkTransparent, 4);
  smokeStage1.position.set(0, 0.28, -0.1);
  smokeStage1.visible = false;
  smokeStage1.name = 'hero-damage:stage1-show:boiler-smoke';
  joints.boiler.add(smokeStage1);
  const sparkStage2 = makeSparkCluster(materials.accent, 5);
  sparkStage2.visible = false;
  sparkStage2.name = 'hero-damage:stage2-show:leg-sparks';
  joints.knee1.add(sparkStage2);
  const intactPlate = box('hero:kirik:intact-plate', [0.5, 0.28, 0.08], materials.brass);
  intactPlate.position.z = 0.37;
  joints.chassis.add(intactPlate);

  return {
    joints,
    secondary: { gear: joints.gear, toolArmL: joints.toolArmL, toolArmR: joints.toolArmR },
    damageParts: {
      stage1Hide: [],
      stage2Hide: [intactPlate],
      stage1Show: [smokeStage1],
      stage2Show: [sparkStage2]
    },
    skillParts: { gear: joints.gear, stabilizers: [joints.stabilizer0, joints.stabilizer1, joints.stabilizer2] }
  };
}

function buildKarg(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    pelvis: { parent: 'motionRoot', position: [0, 0.62, 0] },
    legL: { parent: 'pelvis', position: [-0.22, -0.38, 0] },
    footL: { parent: 'legL', position: [0, -0.38, 0.1] },
    legR: { parent: 'pelvis', position: [0.22, -0.38, 0] },
    footR: { parent: 'legR', position: [0, -0.38, 0.1] },
    spineLower: { parent: 'pelvis', position: [0, 0.32, 0] },
    chest: { parent: 'spineLower', position: [0, 0.42, 0] },
    neck: { parent: 'chest', position: [0, 0.45, 0] },
    head: { parent: 'neck', position: [0, 0.3, 0.03] },
    shoulderL: { parent: 'chest', position: [-0.52, 0.27, 0] },
    upperArmL: { parent: 'shoulderL', position: [-0.18, -0.18, 0] },
    forearmL: { parent: 'upperArmL', position: [0, -0.34, 0] },
    handL: { parent: 'forearmL', position: [0, -0.25, 0] },
    shoulderR: { parent: 'chest', position: [0.52, 0.27, 0] },
    upperArmR: { parent: 'shoulderR', position: [0.18, -0.18, 0] },
    forearmR: { parent: 'upperArmR', position: [0, -0.34, 0] },
    handR: { parent: 'forearmR', position: [0, -0.25, 0] },
    weaponRoot: { parent: 'handR', position: [0, -0.05, 0] },
    armorShell: { parent: 'chest', position: [0, 0, 0] },
    scarChest: { parent: 'chest', position: [0, 0, 0.34] },
    bannerL: { parent: 'pelvis', position: [-0.28, -0.2, -0.18] },
    bannerR: { parent: 'pelvis', position: [0.28, -0.2, -0.18] },
    kneePlate: { parent: 'legR', position: [0, -0.2, 0.18] },
    baseFx: { parent: 'motionRoot', position: [0, 0.03, 0] }
  });

  add(joints.pelvis, box('hero:karg:pelvis', [0.62, 0.34, 0.46], materials.leather));
  const torso = capsule('hero:karg:torso', 0.38, 0.72, materials.skin);
  torso.scale.x = 1.25;
  joints.chest.add(torso);
  for (const side of ['L', 'R']) {
    add(joints[`leg${side}`], capsule('hero:karg:leg', 0.15, 0.7, materials.cloth));
    add(joints[`foot${side}`], box('hero:karg:boot', [0.32, 0.16, 0.46], materials.dark));
    add(joints[`upperArm${side}`], capsule('hero:karg:upper-arm', 0.15, 0.62, materials.skin));
    add(joints[`forearm${side}`], capsule('hero:karg:forearm', 0.14, 0.52, materials.skin));
    add(joints[`hand${side}`], sphere('hero:karg:hand', 0.16, materials.skin));
  }

  const head = sphere('hero:karg:head', 0.34, materials.skin);
  head.scale.set(1.12, 1.04, 0.92);
  joints.head.add(head);
  const brow = box('hero:karg:brow', [0.5, 0.12, 0.12], materials.dark);
  brow.position.set(0, 0.1, 0.27);
  joints.head.add(brow);
  addEyes(joints.head, materials.dark, materials.accent, 0.2, 0.08, 0.3);
  for (const side of [-1, 1]) {
    const tusk = cone('hero:karg:cut-tusk', 0.07, side === -1 ? 0.19 : 0.14, materials.bone);
    tusk.rotation.x = -Math.PI / 2;
    tusk.position.set(side * 0.14, -0.2, 0.3);
    joints.head.add(tusk);
  }

  const cuirass = box('hero:karg:cuirass', [0.9, 0.78, 0.52], materials.metal);
  cuirass.scale.x = 1.12;
  joints.armorShell.add(cuirass);
  const leftShoulder = dome('hero:karg:left-shoulder', 0.3, materials.metal);
  leftShoulder.scale.set(1.25, 0.72, 0.95);
  joints.shoulderL.add(leftShoulder);
  const rightShoulder = box('hero:karg:right-shoulder', [0.42, 0.24, 0.48], materials.metal);
  joints.shoulderR.add(rightShoulder);
  const knee = box('hero:karg:knee-plate', [0.34, 0.28, 0.16], materials.metal);
  joints.kneePlate.add(knee);

  const scars = new THREE.Group();
  for (const angle of [-0.36, 0, 0.32]) {
    const scar = box('hero:karg:scar', [0.035, 0.56, 0.02], materials.accent);
    scar.rotation.z = angle;
    scar.position.x = angle * 0.38;
    scars.add(scar);
  }
  scars.visible = false;
  scars.name = 'hero-damage:stage2-show:chest-scars';
  joints.scarChest.add(scars);

  const weapon = makeJoinedBrokenBlade(materials.metal, materials.leather, materials.accent);
  weapon.rotation.z = -0.15;
  weapon.position.y = 0.28;
  joints.weaponRoot.add(weapon);
  const leftGrip = cylinder('hero:karg:left-grip', 0.05, 0.4, materials.leather);
  leftGrip.position.y = -0.12;
  joints.handL.add(leftGrip);

  const bannerL = makeTornBanner(materials.cloth, 0.56, -0.18);
  const bannerR = makeTornBanner(materials.cloth, 0.48, 0.16);
  joints.bannerL.add(bannerL);
  joints.bannerR.add(bannerR);

  const shoulderCrack = makeSparkCluster(materials.accent, 3);
  shoulderCrack.visible = false;
  shoulderCrack.name = 'hero-damage:stage1-show:armor-cracks';
  joints.armorShell.add(shoulderCrack);

  return {
    joints,
    secondary: { bannerL: joints.bannerL, bannerR: joints.bannerR, weaponRoot: joints.weaponRoot },
    damageParts: {
      stage1Hide: [rightShoulder],
      stage2Hide: [cuirass, leftShoulder],
      stage1Show: [shoulderCrack],
      stage2Show: [scars]
    },
    skillParts: { weaponRoot: joints.weaponRoot, armorShell: joints.armorShell }
  };
}

function addHeroIndicators(root, definition, materials) {
  const radius = definition.id === 'hero.karg' ? 0.72 : definition.id === 'hero.kirik' ? 0.62 : 0.5;
  const outer = new THREE.Mesh(geo(`hero:ring:${radius}`, () => new THREE.TorusGeometry(radius, 0.045, 8, 32)), new THREE.MeshBasicMaterial({ color: materials.brass.color, transparent: true, opacity: 0.86 }));
  outer.rotation.x = Math.PI / 2;
  outer.position.y = -0.36;
  outer.name = 'hero-ring';
  const inner = new THREE.Mesh(geo(`hero:ring-inner:${radius}`, () => new THREE.TorusGeometry(radius * 0.78, 0.018, 6, 28)), new THREE.MeshBasicMaterial({ color: materials.accent.color, transparent: true, opacity: 0.72 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.y = -0.35;
  inner.name = 'hero-ring-inner';
  root.add(outer, inner);

  const marker = new THREE.Mesh(geo('hero:marker', () => new THREE.OctahedronGeometry(0.11, 0)), new THREE.MeshBasicMaterial({ color: materials.brass.color }));
  marker.position.set(0, definition.id === 'hero.karg' ? 2.65 : definition.id === 'hero.kirik' ? 2.35 : 2.0, 0);
  marker.name = 'hero-marker';
  root.add(marker);

  const width = radius * 1.8;
  const hpBack = new THREE.Mesh(geo(`hero:hp-back:${width}`, () => new THREE.BoxGeometry(width, 0.075, 0.04)), new THREE.MeshBasicMaterial({ color: 0x260809 }));
  hpBack.position.set(0, marker.position.y - 0.2, 0);
  hpBack.name = 'hero-hp-back';
  const hp = new THREE.Mesh(geo(`hero:hp:${width}`, () => new THREE.BoxGeometry(width, 0.08, 0.05)), new THREE.MeshBasicMaterial({ color: 0xe8bd62 }));
  hp.position.copy(hpBack.position);
  hp.position.z += 0.01;
  hp.name = 'hp';
  root.add(hpBack, hp);
}

function buildHierarchy(root, specs) {
  const joints = {};
  for (const [name, spec] of Object.entries(specs)) {
    const node = new THREE.Group();
    node.name = `hero-joint:${name}`;
    node.position.set(...spec.position);
    joints[name] = node;
  }
  for (const [name, spec] of Object.entries(specs)) {
    const parent = spec.parent ? joints[spec.parent] : root;
    parent.add(joints[name]);
  }
  for (const [name, node] of Object.entries(joints)) {
    node.userData.baseTransform = {
      position: node.position.clone(),
      rotation: node.rotation.clone(),
      scale: node.scale.clone(),
      name
    };
  }
  return joints;
}

function makeMaterials(definition) {
  const result = {};
  for (const [key, value] of Object.entries(definition.visual.palette)) {
    const cacheKey = `${definition.id}:${key}:${value}`;
    if (!materialCache.has(cacheKey)) {
      const metal = ['metal', 'brass'].includes(key);
      const emissive = ['accent'].includes(key);
      materialCache.set(cacheKey, new THREE.MeshStandardMaterial({
        color: value,
        roughness: metal ? 0.42 : key === 'skin' ? 0.66 : 0.76,
        metalness: metal ? 0.32 : 0,
        emissive: emissive ? value : 0x000000,
        emissiveIntensity: emissive ? 0.18 : 0
      }));
    }
    result[key] = materialCache.get(cacheKey);
  }
  result.bone = materialFor(`${definition.id}:bone`, 0xd5cfb8, { roughness: 0.62 });
  result.glass = materialFor(`${definition.id}:glass`, 0x8ed3dc, { roughness: 0.08, transparent: true, opacity: 0.42, metalness: 0.04 });
  result.darkTransparent = materialFor(`${definition.id}:dark-transparent`, definition.visual.palette.dark, { roughness: 0.3, transparent: true, opacity: 0.45 });
  return result;
}

function materialFor(key, color, options = {}) {
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: options.roughness ?? 0.72, metalness: options.metalness ?? 0, transparent: options.transparent ?? false, opacity: options.opacity ?? 1 }));
  return materialCache.get(key);
}

function add(parent, object) { parent.add(object); return object; }
function geo(key, builder) { if (!geometryCache.has(key)) geometryCache.set(key, builder()); return geometryCache.get(key); }
function box(key, size, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.BoxGeometry(...size)), material); mesh.name = `hero-part:${key}`; return mesh; }
function sphere(key, radius, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.SphereGeometry(radius, 14, 10)), material); mesh.name = `hero-part:${key}`; return mesh; }
function cylinder(key, radius, height, material, horizontal = false) { const mesh = new THREE.Mesh(geo(key, () => new THREE.CylinderGeometry(radius, radius * 1.04, height, 10)), material); if (horizontal) mesh.rotation.z = Math.PI / 2; mesh.name = `hero-part:${key}`; return mesh; }
function capsule(key, radius, length, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.CapsuleGeometry(radius, length, 4, 8)), material); mesh.name = `hero-part:${key}`; return mesh; }
function cone(key, radius, height, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.ConeGeometry(radius, height, 10)), material); mesh.name = `hero-part:${key}`; return mesh; }
function torus(key, radius, tube, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.TorusGeometry(radius, tube, 8, 24)), material); mesh.name = `hero-part:${key}`; return mesh; }
function dome(key, radius, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), material); mesh.name = `hero-part:${key}`; return mesh; }
function openCone(key, radius, height, segments, material) { const mesh = new THREE.Mesh(geo(key, () => new THREE.ConeGeometry(radius, height, segments, 1, true)), material); mesh.name = `hero-part:${key}`; return mesh; }

function addEyes(parent, dark, glow, spread, y, z) {
  for (const side of [-1, 1]) {
    const socket = sphere('hero:eye-socket', 0.07, dark);
    socket.position.set(side * spread, y, z);
    const eye = sphere('hero:eye-glow', 0.035, glow);
    eye.position.z = 0.055;
    socket.add(eye);
    parent.add(socket);
  }
}

function makeKey(material, index) {
  const group = new THREE.Group();
  group.name = `hero-part:key-${index}`;
  const shaft = box('hero:key-shaft', [0.035, 0.24, 0.035], material);
  shaft.position.y = -0.11;
  const loop = torus('hero:key-loop', 0.055, 0.012, material);
  loop.rotation.x = Math.PI / 2;
  const tooth = box('hero:key-tooth', [0.09, 0.035, 0.035], material);
  tooth.position.set(0.04, -0.22, 0);
  group.add(shaft, loop, tooth);
  group.scale.setScalar(0.7 + (index % 3) * 0.12);
  return group;
}

function toothedGear(material, radius, teeth) {
  const group = new THREE.Group();
  group.name = 'hero-part:third-gear';
  const hub = cylinder('hero:gear-hub', radius * 0.52, 0.1, material);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  for (let i = 0; i < teeth; i += 1) {
    const tooth = box('hero:gear-tooth', [0.09, 0.14, 0.08], material);
    const angle = (i / teeth) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    tooth.rotation.z = angle;
    group.add(tooth);
  }
  return group;
}

function makeWrench(metal, brass) {
  const group = new THREE.Group();
  group.name = 'hero-part:work-wrench';
  const handle = cylinder('hero:wrench-handle', 0.035, 0.62, metal);
  const jawA = box('hero:wrench-jaw', [0.08, 0.18, 0.06], brass);
  jawA.position.set(-0.07, 0.34, 0);
  jawA.rotation.z = -0.32;
  const jawB = box('hero:wrench-jaw', [0.08, 0.18, 0.06], brass);
  jawB.position.set(0.07, 0.34, 0);
  jawB.rotation.z = 0.32;
  group.add(handle, jawA, jawB);
  return group;
}

function makeHammer(metal, leather) {
  const group = new THREE.Group();
  group.name = 'hero-part:work-hammer';
  const handle = cylinder('hero:hammer-handle', 0.035, 0.58, leather);
  const head = box('hero:hammer-head', [0.34, 0.16, 0.16], metal);
  head.position.y = 0.34;
  group.add(handle, head);
  return group;
}

function makeSmokePuff(material, count) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const puff = sphere('hero:smoke-puff', 0.08 + i * 0.015, material);
    puff.position.set((i % 2 ? 1 : -1) * 0.05, i * 0.08, -i * 0.03);
    group.add(puff);
  }
  return group;
}

function makeSparkCluster(material, count) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const spark = cone('hero:spark', 0.025, 0.18, material);
    spark.rotation.z = (i / count) * Math.PI * 2;
    spark.position.set(Math.cos(i) * 0.12, Math.sin(i * 1.7) * 0.1, Math.sin(i) * 0.08);
    group.add(spark);
  }
  return group;
}

function makeJoinedBrokenBlade(metal, leather, accent) {
  const group = new THREE.Group();
  group.name = 'hero-part:joined-broken-double-blade';
  const grip = cylinder('hero:karg:weapon-grip', 0.055, 0.72, leather);
  const centerBand = torus('hero:karg:center-band', 0.1, 0.025, accent);
  centerBand.rotation.x = Math.PI / 2;
  group.add(grip, centerBand);
  for (const side of [-1, 1]) {
    const blade = cone('hero:karg:broken-blade', 0.16, 0.82, metal);
    blade.position.y = side * 0.72;
    blade.rotation.z = side === -1 ? Math.PI : 0;
    blade.scale.x = 0.72;
    group.add(blade);
    const notch = box('hero:karg:blade-notch', [0.08, 0.14, 0.08], accent);
    notch.position.set(side * 0.08, side * 0.42, 0.05);
    group.add(notch);
  }
  return group;
}

function makeTornBanner(material, length, tilt) {
  const group = new THREE.Group();
  group.name = 'hero-part:defeated-banner-strip';
  const strip = box('hero:karg:banner-strip', [0.18, length, 0.035], material);
  strip.position.y = -length * 0.5;
  strip.rotation.z = tilt;
  group.add(strip);
  return group;
}

function countMeshes(root) {
  let count = 0;
  root.traverse(node => { if (node.isMesh || node.geometry) count += 1; });
  return count;
}
