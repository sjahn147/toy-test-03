import { THREE } from '../ThreeScene.js';
import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';

const geometryCache = new Map();
const materialCache = new Map();

export function createHeroMiniature(agent) {
  if (agent?.heroFormOf) return createHeroFormMiniature(agent);
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
  else if (definition.id === 'hero.isara') assembly = buildIsara(model, definition, materials);
  else if (definition.id === 'hero.orum-bell') assembly = buildOrumBell(model, definition, materials);
  else if (definition.id === 'hero.glop') assembly = buildGlop(model, definition, materials);
  else return null;

  root.userData.joints = assembly.joints;
  root.userData.secondary = assembly.secondary ?? {};
  root.userData.damageParts = assembly.damageParts ?? { stage1Hide: [], stage2Hide: [], stage1Show: [], stage2Show: [] };
  root.userData.skillParts = assembly.skillParts ?? {};
  root.userData.secondaryMotionConfig = assembly.secondaryMotionConfig ?? [];
  root.userData.dynamicMaterials = assembly.dynamicMaterials ?? [];
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


function buildIsara(model, definition, materials) {
  const specs = {
    motionRoot: { parent: null, position: [0, 0.32, 0] },
    veilRoot: { parent: 'motionRoot', position: [0, 0.92, 0] },
    crown: { parent: 'veilRoot', position: [0, 0.86, 0] },
    faceVoid: { parent: 'veilRoot', position: [0, 0.34, 0.16] },
    handL: { parent: 'motionRoot', position: [-0.68, 1.02, 0.08] },
    handR: { parent: 'motionRoot', position: [0.68, 1.02, 0.08] },
    baseFx: { parent: 'motionRoot', position: [0, -0.28, 0] }
  };
  let parent = 'veilRoot';
  for (let i = 0; i < 6; i += 1) {
    specs[`veil${i}`] = { parent, position: [0, i === 0 ? -0.1 : -0.28, 0] };
    parent = `veil${i}`;
  }
  specs.shadow0 = { parent: 'veil5', position: [-0.22, -0.18, -0.04] };
  specs.shadow1 = { parent: 'veil5', position: [0.22, -0.18, -0.04] };
  specs.shadow2 = { parent: 'veil5', position: [0, -0.22, -0.14] };
  specs.memoryFace0 = { parent: 'veil2', position: [-0.18, -0.05, 0.34] };
  specs.memoryFace1 = { parent: 'veil3', position: [0.2, -0.06, 0.3] };
  const joints = buildHierarchy(model, specs);

  const collar = torus('hero:isara:collar', 0.34, 0.055, materials.metal);
  collar.rotation.x = Math.PI / 2;
  joints.veilRoot.add(collar);
  const shoulderVeil = openCone('hero:isara:shoulder-veil', 0.78, 0.72, 14, materials.veil);
  shoulderVeil.position.y = -0.22;
  shoulderVeil.scale.z = 0.8;
  joints.veilRoot.add(shoulderVeil);

  const faceVoid = sphere('hero:isara:face-void', 0.24, materials.darkTransparent);
  faceVoid.scale.set(0.58, 1.25, 0.32);
  joints.faceVoid.add(faceVoid);
  const faceSlit = box('hero:isara:face-slit', [0.035, 0.48, 0.035], materials.spectral);
  faceSlit.position.z = 0.08;
  joints.faceVoid.add(faceSlit);

  const crownRing = torus('hero:isara:crown-ring', 0.31, 0.035, materials.metal);
  crownRing.rotation.x = Math.PI / 2;
  joints.crown.add(crownRing);
  const crownInner = torus('hero:isara:crown-inner', 0.19, 0.018, materials.spectral);
  crownInner.rotation.x = Math.PI / 2;
  crownInner.position.y = 0.03;
  joints.crown.add(crownInner);
  const crownSpikes = [];
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const spike = cone('hero:isara:crown-spike', 0.045, 0.34 + (i % 2) * 0.08, materials.metal);
    spike.position.set(Math.cos(angle) * 0.29, 0.17 + (i % 2) * 0.04, Math.sin(angle) * 0.29);
    spike.rotation.z = -Math.cos(angle) * 0.18;
    spike.rotation.x = Math.sin(angle) * 0.18;
    joints.crown.add(spike);
    crownSpikes.push(spike);
  }

  // Four suspended crown chains make the crown readable as a separate floating relic.
  // Each chain is deliberately built from a rigid link and a spectral drop so that it
  // inherits the crown stabilizer while lagging behind the larger veil silhouette.
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI * 0.25 + i * Math.PI / 2;
    const chain = capsule('hero:isara:crown-chain', 0.012, 0.28 + (i % 2) * 0.05, materials.metal);
    chain.position.set(Math.cos(angle) * 0.24, -0.12, Math.sin(angle) * 0.24);
    chain.rotation.z = Math.cos(angle) * 0.18;
    chain.rotation.x = -Math.sin(angle) * 0.18;
    const drop = sphere('hero:isara:crown-drop', 0.045, materials.spectral);
    drop.position.set(Math.cos(angle) * 0.27, -0.31 - (i % 2) * 0.04, Math.sin(angle) * 0.27);
    joints.crown.add(chain, drop);
  }

  const veilPanels = [];
  for (let i = 0; i < 6; i += 1) {
    const radius = 0.72 - i * 0.055;
    const panel = openCone(`hero:isara:veil-panel-${i}`, radius, 0.54, 12, materials.veil);
    panel.position.y = -0.24;
    panel.scale.z = 0.78 + i * 0.02;
    joints[`veil${i}`].add(panel);
    veilPanels.push(panel);
    for (const side of [-1, 1]) {
      const edge = box('hero:isara:veil-edge', [0.035, 0.5, 0.04], materials.spectral);
      edge.position.set(side * radius * 0.56, -0.22, 0.12);
      edge.rotation.z = side * 0.08;
      joints[`veil${i}`].add(edge);
    }
  }

  for (const [jointName, side] of [['handL', -1], ['handR', 1]]) {
    const palm = sphere('hero:isara:palm', 0.13, materials.spectral);
    palm.scale.set(0.8, 1.1, 0.45);
    joints[jointName].add(palm);
    for (let i = 0; i < 4; i += 1) {
      const finger = capsule('hero:isara:finger', 0.018, 0.2 + i * 0.02, materials.spectral);
      finger.position.set((i - 1.5) * 0.045, -0.14, 0.02);
      finger.rotation.z = side * (i - 1.5) * 0.06;
      joints[jointName].add(finger);
    }
  }

  for (let i = 0; i < 3; i += 1) {
    const tail = openCone(`hero:isara:shadow-tail-${i}`, 0.22 - i * 0.025, 0.72 + i * 0.08, 8, materials.darkTransparent);
    tail.position.y = -0.32;
    tail.scale.z = 0.55;
    joints[`shadow${i}`].add(tail);
  }

  const memoryFaces = [];
  for (let i = 0; i < 2; i += 1) {
    const mask = sphere('hero:isara:memory-mask', 0.11, materials.spectral);
    mask.scale.set(0.75, 1.1, 0.24);
    mask.material = materials.spectral;
    joints[`memoryFace${i}`].add(mask);
    memoryFaces.push(mask);
  }

  const tornVeil = box('hero:isara:torn-veil', [0.42, 0.72, 0.035], materials.veil);
  tornVeil.position.set(0.35, -0.28, 0.12);
  tornVeil.rotation.z = -0.32;
  tornVeil.visible = false;
  joints.veil3.add(tornVeil);
  const crownFracture = makeSparkCluster(materials.spectral, 5);
  crownFracture.visible = false;
  joints.crown.add(crownFracture);

  return {
    joints,
    secondary: { veilRoot: joints.veilRoot, crown: joints.crown, handL: joints.handL, handR: joints.handR },
    secondaryMotionConfig: [
      { id: 'isara-veil', mode: 'veil-chain', joints: ['veil0','veil1','veil2','veil3','veil4','veil5','shadow0','shadow1','shadow2'], property: 'rotation', amplitude: 0.11, frequency: 1.2, phaseStep: 0.37, stiffness: 16, damping: 6.2, movementMultiplier: 2.1, castMultiplier: 1.2 },
      { id: 'isara-hands', mode: 'floating-hands', joints: ['handL','handR'], property: 'position', amplitude: 0.12, frequency: 1.05, phaseStep: 1.6, stiffness: 14, damping: 5.6 },
      { id: 'isara-crown', mode: 'crown-stabilizer', joints: ['crown'], property: 'position', amplitude: 0.11, frequency: 0.8, stiffness: 12, damping: 5 }
    ],
    dynamicMaterials: [materials.veil, materials.spectral, materials.darkTransparent],
    damageParts: {
      stage1Hide: [veilPanels[1], memoryFaces[0]],
      stage2Hide: [veilPanels[3], ...crownSpikes.filter((_, index) => index % 3 === 0)],
      stage1Show: [tornVeil],
      stage2Show: [crownFracture]
    },
    skillParts: { crown: joints.crown, veilRoot: joints.veilRoot, hands: [joints.handL, joints.handR], faceVoid: joints.faceVoid }
  };
}

function buildOrumBell(model, definition, materials) {
  const specs = {
    motionRoot: { parent: null, position: [0, 0, 0] },
    rootCore: { parent: 'motionRoot', position: [0, 0.32, 0] },
    rootLeg0: { parent: 'rootCore', position: [-0.22, -0.22, 0.06] },
    rootLeg1: { parent: 'rootCore', position: [0.22, -0.22, 0.06] },
    rootLeg2: { parent: 'rootCore', position: [0, -0.2, -0.2] },
    stemLower: { parent: 'rootCore', position: [0, 0.38, 0] },
    chest: { parent: 'stemLower', position: [0, 0.56, 0] },
    capRoot: { parent: 'chest', position: [0, 0.62, 0] },
    capRim: { parent: 'capRoot', position: [0, -0.03, 0] },
    branchArm: { parent: 'chest', position: [-0.38, 0.16, 0] },
    branchHand: { parent: 'branchArm', position: [-0.16, -0.34, 0] },
    spearRoot: { parent: 'chest', position: [0.4, 0.17, 0] },
    spearShaft: { parent: 'spearRoot', position: [0, -0.2, 0] },
    spearTip: { parent: 'spearShaft', position: [0, -0.62, 0] },
    mantleRoot: { parent: 'chest', position: [0, 0.18, -0.18] },
    mantle0: { parent: 'mantleRoot', position: [-0.32, -0.1, 0] },
    mantle1: { parent: 'mantleRoot', position: [-0.11, -0.12, -0.03] },
    mantle2: { parent: 'mantleRoot', position: [0.11, -0.12, -0.03] },
    mantle3: { parent: 'mantleRoot', position: [0.32, -0.1, 0] },
    sporeSacL: { parent: 'chest', position: [-0.24, 0.34, -0.12] },
    sporeSacR: { parent: 'chest', position: [0.24, 0.34, -0.12] },
    memoryLights: { parent: 'capRoot', position: [0, -0.12, 0.18] },
    baseFx: { parent: 'motionRoot', position: [0, 0.03, 0] }
  };
  const joints = buildHierarchy(model, specs);

  const rootBody = sphere('hero:orum:root-core', 0.28, materials.leather);
  rootBody.scale.set(1.05, 0.8, 1);
  joints.rootCore.add(rootBody);
  for (let i = 0; i < 3; i += 1) {
    const leg = capsule('hero:orum:root-leg', 0.09, 0.58, materials.skin);
    leg.position.y = -0.24;
    leg.rotation.z = i === 0 ? -0.2 : i === 1 ? 0.2 : 0;
    joints[`rootLeg${i}`].add(leg);
    for (let fork = 0; fork < 3; fork += 1) {
      const toe = cone('hero:orum:root-toe', 0.045, 0.32, materials.dark);
      toe.rotation.x = Math.PI / 2;
      toe.rotation.z = (fork - 1) * 0.32;
      toe.position.set((fork - 1) * 0.09, -0.5, 0.13);
      joints[`rootLeg${i}`].add(toe);
    }
  }
  const stem = capsule('hero:orum:stem', 0.23, 0.82, materials.skin);
  stem.scale.set(0.9, 1, 0.86);
  joints.stemLower.add(stem);
  const chest = capsule('hero:orum:chest', 0.3, 0.62, materials.leather);
  chest.scale.set(1.05, 1, 0.82);
  joints.chest.add(chest);
  for (let i = 0; i < 5; i += 1) {
    const plate = openCone('hero:orum:mycelial-plate', 0.34 + i * 0.025, 0.26, 8, i % 2 ? materials.cloth : materials.skin);
    plate.position.y = 0.22 - i * 0.12;
    plate.scale.z = 0.7;
    joints.chest.add(plate);
  }

  const cap = dome('hero:orum:bell-cap', 0.83, materials.cloth);
  cap.scale.set(1.18, 0.62, 1.05);
  cap.position.y = -0.12;
  joints.capRoot.add(cap);
  const capEdge = torus('hero:orum:cap-edge', 0.72, 0.06, materials.brass);
  capEdge.rotation.x = Math.PI / 2;
  capEdge.scale.z = 0.9;
  joints.capRim.add(capEdge);
  for (let i = 0; i < 7; i += 1) {
    const gill = torus('hero:orum:gill', 0.18 + i * 0.07, 0.018, i % 2 ? materials.clothInner : materials.accent);
    gill.rotation.x = Math.PI / 2;
    gill.position.y = -0.04 - i * 0.004;
    joints.capRim.add(gill);
  }
  for (let i = 0; i < 6; i += 1) {
    const light = sphere('hero:orum:memory-light', 0.035 + (i % 2) * 0.012, materials.spore);
    const angle = i / 6 * Math.PI * 2;
    light.position.set(Math.cos(angle) * 0.3, Math.sin(angle * 2) * 0.05, Math.sin(angle) * 0.16);
    joints.memoryLights.add(light);
  }

  const branch = capsule('hero:orum:branch-arm', 0.075, 0.64, materials.skin);
  branch.position.y = -0.24;
  branch.rotation.z = -0.08;
  joints.branchArm.add(branch);
  for (let i = 0; i < 4; i += 1) {
    const twig = capsule('hero:orum:branch-finger', 0.022, 0.24, materials.skin);
    twig.position.set((i - 1.5) * 0.05, -0.12, 0);
    twig.rotation.z = (i - 1.5) * 0.14;
    joints.branchHand.add(twig);
  }

  const spearArm = capsule('hero:orum:spear-arm', 0.085, 0.54, materials.skin);
  spearArm.position.y = -0.2;
  joints.spearRoot.add(spearArm);
  const spear = cylinder('hero:orum:spear-shaft', 0.055, 1.15, materials.skin);
  spear.position.y = -0.42;
  joints.spearShaft.add(spear);
  const spearTip = cone('hero:orum:spear-tip', 0.14, 0.48, materials.accent);
  spearTip.position.y = -0.22;
  spearTip.rotation.z = Math.PI;
  joints.spearTip.add(spearTip);
  for (let i = 0; i < 4; i += 1) {
    const barb = cone('hero:orum:spear-barb', 0.045, 0.22, materials.brass);
    const angle = i / 4 * Math.PI * 2;
    barb.position.set(Math.cos(angle) * 0.08, -0.1, Math.sin(angle) * 0.08);
    barb.rotation.z = Math.PI + Math.cos(angle) * 0.35;
    joints.spearTip.add(barb);
  }

  const mantleMeshes = [];
  for (let i = 0; i < 4; i += 1) {
    const strip = openCone('hero:orum:mantle-strip', 0.18, 0.92 + (i % 2) * 0.14, 7, materials.veil);
    strip.position.y = -0.42;
    strip.scale.z = 0.38;
    joints[`mantle${i}`].add(strip);
    mantleMeshes.push(strip);
  }
  for (const name of ['sporeSacL','sporeSacR']) {
    const sac = sphere('hero:orum:spore-sac', 0.15, materials.spore);
    sac.scale.set(0.85, 1.2, 0.75);
    joints[name].add(sac);
  }

  const capCrack = makeSparkCluster(materials.accent, 6);
  capCrack.visible = false;
  joints.capRoot.add(capCrack);
  const exposedCore = sphere('hero:orum:exposed-core', 0.16, materials.spore);
  exposedCore.visible = false;
  exposedCore.position.z = 0.22;
  joints.chest.add(exposedCore);

  return {
    joints,
    secondary: { mantleRoot: joints.mantleRoot, capRoot: joints.capRoot, spearRoot: joints.spearRoot },
    secondaryMotionConfig: [
      { id: 'orum-roots', mode: 'root-tendrils', joints: ['rootLeg0','rootLeg1','rootLeg2'], property: 'rotation', amplitude: 0.06, frequency: 0.9, phaseStep: 1.7, stiffness: 20, damping: 8 },
      { id: 'orum-mantle', mode: 'root-tendrils', joints: ['mantle0','mantle1','mantle2','mantle3'], property: 'rotation', amplitude: 0.1, frequency: 1.1, phaseStep: 0.58, stiffness: 14, damping: 5.5, movementMultiplier: 1.8, castMultiplier: 1.1 }
    ],
    dynamicMaterials: [materials.spore, materials.veil],
    damageParts: {
      stage1Hide: [mantleMeshes[0]],
      stage2Hide: [mantleMeshes[2], capEdge],
      stage1Show: [capCrack],
      stage2Show: [exposedCore]
    },
    skillParts: { spearRoot: joints.spearRoot, spearShaft: joints.spearShaft, capRoot: joints.capRoot, sporeSacs: [joints.sporeSacL, joints.sporeSacR] }
  };
}

function buildGlop(model, definition, materials) {
  const specs = {
    motionRoot: { parent: null, position: [0, 0, 0] },
    blobRoot: { parent: 'motionRoot', position: [0, 0.7, 0] },
    shell: { parent: 'blobRoot', position: [0, 0, 0] },
    core: { parent: 'blobRoot', position: [0.08, 0.05, 0.04] },
    crown: { parent: 'motionRoot', position: [0, 1.72, 0] },
    artifactOrbit: { parent: 'blobRoot', position: [0, 0, 0] },
    royalSeal: { parent: 'artifactOrbit', position: [-0.28, 0.18, 0.22] },
    keyRingArtifact: { parent: 'artifactOrbit', position: [0.34, 0.12, 0.16] },
    chalice: { parent: 'artifactOrbit', position: [-0.16, -0.22, 0.28] },
    throneFragment: { parent: 'artifactOrbit', position: [0.22, -0.18, -0.2] },
    boneHand: { parent: 'artifactOrbit', position: [-0.32, -0.12, -0.12] },
    scribePen: { parent: 'artifactOrbit', position: [0.1, 0.28, -0.24] },
    pseudoArmL: { parent: 'blobRoot', position: [-0.58, 0.08, 0] },
    pseudoArmR: { parent: 'blobRoot', position: [0.58, 0.08, 0] },
    lobe0: { parent: 'motionRoot', position: [-0.48, 0.24, 0.24] },
    lobe1: { parent: 'motionRoot', position: [0.48, 0.24, 0.24] },
    lobe2: { parent: 'motionRoot', position: [-0.3, 0.2, -0.35] },
    lobe3: { parent: 'motionRoot', position: [0.3, 0.2, -0.35] },
    bubbleRoot: { parent: 'blobRoot', position: [0, 0, 0] },
    baseFx: { parent: 'motionRoot', position: [0, 0.02, 0] }
  };
  const joints = buildHierarchy(model, specs);

  const shell = sphere('hero:glop:shell', 0.82, materials.slimeShell);
  shell.scale.set(1.08, 0.92, 1.02);
  joints.shell.add(shell);
  const innerShell = sphere('hero:glop:inner-shell', 0.66, materials.darkTransparent);
  innerShell.scale.set(1.05, 0.9, 1);
  joints.shell.add(innerShell);
  const core = sphere('hero:glop:gold-core', 0.22, materials.accent);
  joints.core.add(core);
  for (let i = 0; i < 8; i += 1) {
    const bubble = sphere('hero:glop:bubble', 0.055 + (i % 3) * 0.018, materials.glass);
    const angle = i / 8 * Math.PI * 2;
    bubble.position.set(Math.cos(angle) * (0.34 + (i % 2) * 0.12), -0.24 + (i % 4) * 0.16, Math.sin(angle) * 0.34);
    joints.bubbleRoot.add(bubble);
  }
  for (let i = 0; i < 4; i += 1) {
    const lobe = sphere('hero:glop:base-lobe', 0.34, materials.slimeShell);
    lobe.scale.set(1.18, 0.55, 1.05);
    joints[`lobe${i}`].add(lobe);
  }

  const crownRing = torus('hero:glop:crown-ring', 0.36, 0.055, materials.brass);
  crownRing.rotation.x = Math.PI / 2;
  joints.crown.add(crownRing);
  for (let i = 0; i < 6; i += 1) {
    const spike = cone('hero:glop:crown-spike', 0.055, 0.38 + (i % 2) * 0.1, materials.brass);
    const angle = i / 6 * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.33, 0.18, Math.sin(angle) * 0.33);
    joints.crown.add(spike);
  }
  const crownGem = sphere('hero:glop:crown-gem', 0.09, materials.accent);
  crownGem.position.y = 0.06;
  joints.crown.add(crownGem);

  const seal = cylinder('hero:glop:royal-seal', 0.14, 0.055, materials.brass, true);
  seal.rotation.x = Math.PI / 2;
  joints.royalSeal.add(seal);
  const sealMark = torus('hero:glop:seal-mark', 0.08, 0.018, materials.accent);
  sealMark.rotation.x = Math.PI / 2;
  sealMark.position.z = 0.04;
  joints.royalSeal.add(sealMark);

  const artifactKeys = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const key = makeKey(materials.brass, i);
    key.position.set((i - 1.5) * 0.08, (i % 2) * 0.08, 0);
    artifactKeys.add(key);
  }
  joints.keyRingArtifact.add(artifactKeys);

  const cup = cylinder('hero:glop:chalice-cup', 0.13, 0.22, materials.brass);
  cup.position.y = 0.08;
  const cupRim = torus('hero:glop:chalice-rim', 0.15, 0.025, materials.accent);
  cupRim.rotation.x = Math.PI / 2;
  cupRim.position.y = 0.2;
  const cupStem = cylinder('hero:glop:chalice-stem', 0.035, 0.24, materials.brass);
  cupStem.position.y = -0.12;
  joints.chalice.add(cup, cupRim, cupStem);

  const throneSeat = box('hero:glop:throne-seat', [0.34, 0.12, 0.28], materials.leather);
  const throneBack = box('hero:glop:throne-back', [0.32, 0.48, 0.1], materials.brass);
  throneBack.position.set(0, 0.24, -0.1);
  joints.throneFragment.add(throneSeat, throneBack);

  const palm = sphere('hero:glop:bone-palm', 0.09, materials.bone);
  joints.boneHand.add(palm);
  for (let i = 0; i < 4; i += 1) {
    const finger = capsule('hero:glop:bone-finger', 0.018, 0.22, materials.bone);
    finger.position.set((i - 1.5) * 0.035, 0.13, 0);
    finger.rotation.z = (i - 1.5) * 0.08;
    joints.boneHand.add(finger);
  }
  const penShaft = cylinder('hero:glop:scribe-pen', 0.025, 0.5, materials.metal);
  penShaft.rotation.z = -0.55;
  const nib = cone('hero:glop:pen-nib', 0.045, 0.14, materials.brass);
  nib.position.set(0.2, -0.19, 0);
  nib.rotation.z = -0.55;
  joints.scribePen.add(penShaft, nib);

  for (const name of ['pseudoArmL','pseudoArmR']) {
    const arm = capsule('hero:glop:pseudo-arm', 0.11, 0.6, materials.slimeShell);
    arm.position.y = -0.18;
    arm.rotation.z = name.endsWith('L') ? -0.32 : 0.32;
    joints[name].add(arm);
    const hand = sphere('hero:glop:pseudo-hand', 0.14, materials.slimeShell);
    hand.position.y = -0.5;
    joints[name].add(hand);
  }

  const clouding = makeSmokePuff(materials.darkTransparent, 7);
  clouding.visible = false;
  clouding.position.set(0, 0.1, 0.1);
  joints.blobRoot.add(clouding);
  const fracture = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const shard = torus('hero:glop:fracture-ring', 0.18 + i * 0.045, 0.012, materials.accent);
    shard.rotation.x = Math.PI / 2;
    shard.rotation.z = i * 0.45;
    shard.position.set(Math.cos(i) * 0.18, (i - 4) * 0.07, Math.sin(i) * 0.14);
    fracture.add(shard);
  }
  fracture.visible = false;
  joints.shell.add(fracture);

  return {
    joints,
    secondary: { artifactOrbit: joints.artifactOrbit, crown: joints.crown, blobRoot: joints.blobRoot },
    secondaryMotionConfig: [
      { id: 'glop-artifacts', mode: 'artifact-float', joints: ['royalSeal','keyRingArtifact','chalice','throneFragment','boneHand','scribePen'], property: 'position', amplitude: 0.1, frequency: 0.9, phaseStep: 0.8, stiffness: 10, damping: 4.2, movementMultiplier: 1.6, castMultiplier: 1.2 },
      { id: 'glop-crown', mode: 'crown-stabilizer', joints: ['crown'], property: 'position', amplitude: 0.14, frequency: 0.72, stiffness: 11, damping: 4.8 },
      { id: 'glop-arms', mode: 'floating-hands', joints: ['pseudoArmL','pseudoArmR'], property: 'rotation', amplitude: 0.08, frequency: 0.92, phaseStep: 1.4, stiffness: 13, damping: 5 }
    ],
    dynamicMaterials: [materials.slimeShell, materials.glass, materials.darkTransparent],
    damageParts: {
      stage1Hide: [],
      stage2Hide: [innerShell],
      stage1Show: [clouding],
      stage2Show: [fracture]
    },
    skillParts: {
      crown: joints.crown,
      blobRoot: joints.blobRoot,
      shell: joints.shell,
      artifacts: { crown: joints.crown, key: joints.keyRingArtifact, chalice: joints.chalice, throne: joints.throneFragment },
      pseudoArms: [joints.pseudoArmL, joints.pseudoArmR]
    }
  };
}

function createHeroFormMiniature(agent) {
  const root = new THREE.Group();
  root.name = `hero-form:${agent.heroFormKind ?? 'unknown'}`;
  root.userData.agentId = agent.id;
  root.userData.heroFormOf = agent.heroFormOf;
  root.userData.heroFormKind = agent.heroFormKind;
  root.userData.isHeroForm = true;
  root.userData.baseScale = 1;

  const model = new THREE.Group();
  model.name = 'hero-form-model';
  root.add(model);
  const spectral = materialFor('hero-form:spectral', 0xbcecff, { transparent: true, opacity: 0.48, emissive: 0xbcecff, emissiveIntensity: 0.3, depthWrite: false, roughness: 0.08 });
  const slime = materialFor('hero-form:slime', 0x56aaa2, { transparent: true, opacity: 0.66, emissive: 0x183c3b, emissiveIntensity: 0.08, depthWrite: false, roughness: 0.12 });
  const gold = materialFor('hero-form:gold', 0xe0bd55, { metalness: 0.24, roughness: 0.38, emissive: 0x5b4310, emissiveIntensity: 0.08 });
  const dark = materialFor('hero-form:dark', 0x173332, { roughness: 0.6 });
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    body: { parent: 'motionRoot', position: [0, 0.48, 0] },
    accent: { parent: 'body', position: [0, 0.42, 0] },
    baseFx: { parent: 'motionRoot', position: [0, 0.02, 0] }
  });

  if (String(agent.heroFormKind ?? '').startsWith('shade')) {
    const veil = openCone('hero-form:shade-veil', 0.38, 0.9, 9, spectral);
    veil.position.y = -0.18;
    joints.body.add(veil);
    const voidCore = sphere('hero-form:shade-core', 0.12, dark);
    voidCore.position.y = 0.2;
    joints.body.add(voidCore);
    const halo = torus('hero-form:shade-halo', 0.22, 0.025, spectral);
    halo.rotation.x = Math.PI / 2;
    joints.accent.add(halo);
  } else {
    const body = sphere('hero-form:court-blob', agent.heroFormKind === 'guard' ? 0.48 : 0.38, slime);
    body.scale.set(1.05, agent.heroFormKind === 'guard' ? 0.95 : 0.82, 1);
    joints.body.add(body);
    if (agent.heroFormKind === 'king') {
      const crown = torus('hero-form:king-crown', 0.24, 0.04, gold);
      crown.rotation.x = Math.PI / 2;
      joints.accent.add(crown);
      for (let i = 0; i < 4; i += 1) {
        const spike = cone('hero-form:king-spike', 0.04, 0.24, gold);
        const angle = i / 4 * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.2, 0.12, Math.sin(angle) * 0.2);
        joints.accent.add(spike);
      }
    } else if (agent.heroFormKind === 'guard') {
      const plate = box('hero-form:guard-plate', [0.62, 0.55, 0.16], gold);
      plate.position.z = 0.25;
      joints.body.add(plate);
    } else {
      const pen = cylinder('hero-form:scribe-pen', 0.025, 0.62, gold);
      pen.rotation.z = -0.55;
      joints.accent.add(pen);
      const tablet = box('hero-form:scribe-tablet', [0.38, 0.46, 0.08], dark);
      tablet.position.set(-0.22, 0, 0.12);
      joints.body.add(tablet);
    }
  }

  const ringRadius = agent.heroFormKind === 'guard' ? 0.48 : 0.38;
  const ring = new THREE.Mesh(geo(`hero-form:ring:${ringRadius}`, () => new THREE.TorusGeometry(ringRadius, 0.025, 6, 24)), new THREE.MeshBasicMaterial({ color: agent.heroFormOf === 'hero.isara' ? 0xbcecff : 0xe0bd55, transparent: true, opacity: 0.65 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.26;
  ring.name = 'hero-form-ring';
  root.add(ring);

  root.userData.joints = joints;
  root.userData.heroMeshCount = countMeshes(root);
  root.traverse(node => { node.userData.agentId = agent.id; node.userData.heroFormOf = agent.heroFormOf; });
  return root;
}

function addHeroIndicators(root, definition, materials) {
  const radius = definition.visual.indicatorRadius ?? (definition.id === 'hero.karg' ? 0.72 : definition.id === 'hero.kirik' ? 0.62 : 0.5);
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
  marker.position.set(0, definition.visual.markerHeight ?? (definition.id === 'hero.karg' ? 2.65 : definition.id === 'hero.kirik' ? 2.35 : 2.0), 0);
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
  result.darkTransparent = materialFor(`${definition.id}:dark-transparent`, definition.visual.palette.dark, { roughness: 0.3, transparent: true, opacity: 0.45, depthWrite: false });
  result.spectral = materialFor(`${definition.id}:spectral`, definition.visual.palette.accent, { roughness: 0.08, transparent: true, opacity: 0.5, emissive: definition.visual.palette.accent, emissiveIntensity: 0.36, depthWrite: false });
  result.veil = materialFor(`${definition.id}:veil`, definition.visual.palette.cloth, { roughness: 0.28, transparent: true, opacity: 0.78, emissive: definition.visual.palette.clothInner, emissiveIntensity: 0.08, depthWrite: false });
  result.slimeShell = materialFor(`${definition.id}:slime-shell`, definition.visual.palette.skin, { roughness: 0.12, transparent: true, opacity: 0.62, emissive: definition.visual.palette.dark, emissiveIntensity: 0.06, depthWrite: false });
  result.spore = materialFor(`${definition.id}:spore`, definition.visual.palette.accent, { roughness: 0.18, transparent: true, opacity: 0.7, emissive: definition.visual.palette.accent, emissiveIntensity: 0.22, depthWrite: false });
  return result;
}

function materialFor(key, color, options = {}) {
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  }));
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
