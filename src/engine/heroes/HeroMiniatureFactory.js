import { THREE } from '../ThreeScene.js';
import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';

const geometryCache = new Map();
const materialCache = new Map();

export function createHeroMiniature(agent) {
  if (agent?.heroSummonKind) return createHeroSummonMiniature(agent);
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
  else if (definition.id === 'hero.jijik') assembly = buildJijik(model, definition, materials);
  else if (definition.id === 'hero.tissa') assembly = buildTissa(model, definition, materials);
  else if (definition.id === 'hero.murga') assembly = buildMurga(model, definition, materials);
  else if (definition.id === 'hero.aldren') assembly = buildAldren(model, definition, materials);
  else if (definition.id === 'hero.malcor') assembly = buildMalcor(model, definition, materials);
  else if (definition.id === 'hero.arvek') assembly = buildArvek(model, definition, materials);
  else if (definition.id === 'hero.pev') assembly = buildPev(model, definition, materials);
  else if (definition.id === 'hero.eighth-cocoon') assembly = buildEighthCocoon(model, definition, materials);
  else if (definition.id === 'hero.empty-queen-hand') assembly = buildEmptyQueenHand(model, definition, materials);
  else if (definition.id === 'hero.failed-successor') assembly = buildFailedSuccessor(model, definition, materials);
  else if (definition.id === 'hero.sleeping-gardener') assembly = buildSleepingGardener(model, definition, materials);
  else if (definition.id === 'hero.goldcrown-back') assembly = buildGoldcrownBack(model, definition, materials);
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

function buildJijik(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    pelvis: { parent: 'motionRoot', position: [0, 0.47, 0] },
    legL: { parent: 'pelvis', position: [-0.15, -0.28, 0] },
    footL: { parent: 'legL', position: [0, -0.28, 0.08] },
    legR: { parent: 'pelvis', position: [0.15, -0.28, 0] },
    footR: { parent: 'legR', position: [0, -0.28, 0.08] },
    spineLower: { parent: 'pelvis', position: [0, 0.24, 0] },
    chest: { parent: 'spineLower', position: [-0.04, 0.34, 0] },
    neck: { parent: 'chest', position: [-0.08, 0.34, 0] },
    head: { parent: 'neck', position: [0, 0.23, 0.02] },
    shoulderL: { parent: 'chest', position: [-0.31, 0.17, 0] },
    upperArmL: { parent: 'shoulderL', position: [-0.11, -0.13, 0] },
    forearmL: { parent: 'upperArmL', position: [0, -0.23, 0] },
    handL: { parent: 'forearmL', position: [0, -0.16, 0] },
    mechanicalShoulder: { parent: 'chest', position: [0.42, 0.2, 0] },
    mechanicalUpper: { parent: 'mechanicalShoulder', position: [0.22, -0.14, 0] },
    mechanicalElbow: { parent: 'mechanicalUpper', position: [0.18, -0.28, 0] },
    toolRotor: { parent: 'mechanicalElbow', position: [0.02, -0.3, 0] },
    toolHammer: { parent: 'toolRotor', position: [0, -0.18, 0] },
    toolNozzle: { parent: 'toolRotor', position: [0.22, 0.02, 0] },
    toolMortar: { parent: 'toolRotor', position: [-0.2, 0.02, 0] },
    recoilBrace: { parent: 'mechanicalShoulder', position: [0.06, -0.04, -0.22] },
    powderPack: { parent: 'chest', position: [-0.08, 0.02, -0.34] },
    tankL: { parent: 'powderPack', position: [-0.17, 0.03, 0] },
    tankR: { parent: 'powderPack', position: [0.17, 0.03, 0] },
    gauge: { parent: 'mechanicalShoulder', position: [0.02, 0.18, 0.2] },
    fuseRoot: { parent: 'head', position: [0, 0.28, -0.02] },
    baseFx: { parent: 'motionRoot', position: [0, 0.02, 0] }
  });

  add(joints.pelvis, box('hero:jijik:pelvis', [0.4, 0.24, 0.31], materials.leather));
  const torso = capsule('hero:jijik:torso', 0.23, 0.36, materials.cloth);
  torso.scale.x = 0.94;
  joints.chest.add(torso);
  for (const side of ['L', 'R']) {
    add(joints[`leg${side}`], capsule('hero:jijik:leg', 0.08, 0.38, materials.clothInner));
    add(joints[`foot${side}`], box('hero:jijik:boot', [0.18, 0.12, 0.29], materials.dark));
  }
  add(joints.upperArmL, capsule('hero:jijik:left-upper-arm', 0.075, 0.27, materials.skin));
  add(joints.forearmL, capsule('hero:jijik:left-forearm', 0.065, 0.22, materials.skin));
  add(joints.handL, sphere('hero:jijik:left-hand', 0.09, materials.skin));

  const head = sphere('hero:jijik:head', 0.28, materials.skin);
  head.scale.set(1.08, 1.0, 0.9);
  joints.head.add(head);
  const nose = cone('hero:jijik:nose', 0.085, 0.3, materials.skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.03, 0.27);
  joints.head.add(nose);
  addEyes(joints.head, materials.dark, materials.accent, 0.17, 0.08, 0.24);
  for (const side of [-1, 1]) {
    const ear = cone('hero:jijik:ear', 0.11, 0.36, materials.skin);
    ear.rotation.z = side * -Math.PI / 2;
    ear.position.x = side * 0.33;
    joints.head.add(ear);
  }
  const potHelmet = dome('hero:jijik:pot-helmet', 0.34, materials.metal);
  potHelmet.position.y = 0.04;
  potHelmet.scale.set(1.05, 0.65, 1.0);
  joints.fuseRoot.add(potHelmet);
  const fuses = [];
  for (let i = 0; i < 7; i += 1) {
    const fuse = cylinder('hero:jijik:fuse', 0.012, 0.32 + (i % 3) * 0.07, materials.dark);
    const angle = -0.72 + i * 0.24;
    fuse.position.set(Math.sin(angle) * 0.19, 0.25 + (i % 2) * 0.04, Math.cos(angle) * 0.09);
    fuse.rotation.z = -angle * 0.7;
    const ember = sphere('hero:jijik:fuse-ember', 0.035, materials.ember);
    ember.position.y = 0.18 + (i % 3) * 0.035;
    fuse.add(ember);
    joints.fuseRoot.add(fuse);
    fuses.push(fuse);
  }

  const shoulderHousing = sphere('hero:jijik:shoulder-housing', 0.28, materials.brass);
  shoulderHousing.scale.set(1.15, 0.9, 0.95);
  joints.mechanicalShoulder.add(shoulderHousing);
  const upper = cylinder('hero:jijik:mechanical-upper', 0.11, 0.48, materials.metal);
  upper.position.y = -0.12;
  joints.mechanicalUpper.add(upper);
  const upperPiston = cylinder('hero:jijik:upper-piston', 0.04, 0.5, materials.accent);
  upperPiston.position.set(0.1, -0.11, 0.07);
  joints.mechanicalUpper.add(upperPiston);
  const elbow = sphere('hero:jijik:elbow', 0.17, materials.brass);
  joints.mechanicalElbow.add(elbow);
  const lower = cylinder('hero:jijik:mechanical-lower', 0.095, 0.46, materials.metal);
  lower.position.y = -0.16;
  joints.mechanicalElbow.add(lower);
  const rotor = cylinder('hero:jijik:tool-rotor', 0.24, 0.16, materials.brass);
  rotor.rotation.x = Math.PI / 2;
  joints.toolRotor.add(rotor);
  for (let i = 0; i < 8; i += 1) {
    const tooth = box('hero:jijik:rotor-tooth', [0.08, 0.1, 0.1], materials.metal);
    const angle = i / 8 * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0);
    tooth.rotation.z = angle;
    joints.toolRotor.add(tooth);
  }

  const hammerHandle = cylinder('hero:jijik:hammer-handle', 0.045, 0.44, materials.metal);
  hammerHandle.position.y = -0.16;
  const hammerHead = box('hero:jijik:hammer-head', [0.38, 0.2, 0.2], materials.metal);
  hammerHead.position.y = -0.42;
  joints.toolHammer.add(hammerHandle, hammerHead);

  const nozzle = cylinder('hero:jijik:air-nozzle', 0.12, 0.52, materials.metal, true);
  nozzle.position.x = 0.18;
  const nozzleRing = torus('hero:jijik:nozzle-ring', 0.14, 0.028, materials.brass);
  nozzleRing.rotation.y = Math.PI / 2;
  nozzleRing.position.x = 0.44;
  joints.toolNozzle.add(nozzle, nozzleRing);

  const mortarCup = cylinder('hero:jijik:mortar-cup', 0.17, 0.42, materials.dark);
  mortarCup.position.y = 0.15;
  const mortarRim = torus('hero:jijik:mortar-rim', 0.18, 0.025, materials.brass);
  mortarRim.rotation.x = Math.PI / 2;
  mortarRim.position.y = 0.37;
  joints.toolMortar.add(mortarCup, mortarRim);

  const brace = box('hero:jijik:recoil-brace', [0.16, 0.52, 0.16], materials.metal);
  brace.rotation.x = -0.22;
  joints.recoilBrace.add(brace);
  const bracePad = box('hero:jijik:brace-pad', [0.34, 0.14, 0.24], materials.leather);
  bracePad.position.y = -0.28;
  joints.recoilBrace.add(bracePad);

  const packFrame = box('hero:jijik:pack-frame', [0.5, 0.62, 0.16], materials.leather);
  joints.powderPack.add(packFrame);
  for (const name of ['tankL', 'tankR']) {
    const tank = cylinder('hero:jijik:powder-tank', 0.13, 0.58, materials.dark);
    tank.position.y = 0;
    joints[name].add(tank);
    for (const y of [-0.2, 0.2]) {
      const band = torus('hero:jijik:tank-band', 0.14, 0.018, materials.brass);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      joints[name].add(band);
    }
  }
  const gaugeFace = cylinder('hero:jijik:gauge-face', 0.11, 0.04, materials.glass);
  gaugeFace.rotation.x = Math.PI / 2;
  const gaugeNeedle = box('hero:jijik:gauge-needle', [0.018, 0.15, 0.018], materials.accent);
  gaugeNeedle.position.y = 0.04;
  joints.gauge.add(gaugeFace, gaugeNeedle);

  const smoke = makeSmokePuff(materials.darkTransparent, 5);
  smoke.visible = false;
  smoke.name = 'hero-damage:stage1-show:powder-smoke';
  joints.powderPack.add(smoke);
  const brokenTank = makeSparkCluster(materials.ember, 6);
  brokenTank.visible = false;
  brokenTank.name = 'hero-damage:stage2-show:tank-sparks';
  joints.tankR.add(brokenTank);
  const intactTankR = joints.tankR.children[0];

  return {
    joints,
    secondary: { powderPack: joints.powderPack, fuseRoot: joints.fuseRoot, mechanicalShoulder: joints.mechanicalShoulder, recoilBrace: joints.recoilBrace },
    damageParts: {
      stage1Hide: [fuses[1], fuses[5]],
      stage2Hide: [intactTankR, fuses[0], fuses[3]],
      stage1Show: [smoke],
      stage2Show: [brokenTank]
    },
    skillParts: { toolRotor: joints.toolRotor, toolHammer: joints.toolHammer, toolNozzle: joints.toolNozzle, toolMortar: joints.toolMortar, recoilBrace: joints.recoilBrace }
  };
}

function buildTissa(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    pelvis: { parent: 'motionRoot', position: [0, 0.5, 0] },
    legL: { parent: 'pelvis', position: [-0.15, -0.3, 0] },
    footL: { parent: 'legL', position: [0, -0.28, 0.1] },
    legR: { parent: 'pelvis', position: [0.15, -0.3, 0] },
    footR: { parent: 'legR', position: [0, -0.28, 0.1] },
    spineLower: { parent: 'pelvis', position: [0, 0.24, 0] },
    chest: { parent: 'spineLower', position: [0, 0.34, 0] },
    neck: { parent: 'chest', position: [0, 0.34, 0] },
    head: { parent: 'neck', position: [0, 0.22, 0] },
    helmet: { parent: 'head', position: [0, 0.03, 0] },
    shoulderL: { parent: 'chest', position: [-0.31, 0.18, 0] },
    upperArmL: { parent: 'shoulderL', position: [-0.11, -0.14, 0] },
    forearmL: { parent: 'upperArmL', position: [0, -0.23, 0] },
    handL: { parent: 'forearmL', position: [0, -0.16, 0] },
    shoulderR: { parent: 'chest', position: [0.31, 0.18, 0] },
    upperArmR: { parent: 'shoulderR', position: [0.11, -0.14, 0] },
    forearmR: { parent: 'upperArmR', position: [0, -0.23, 0] },
    handR: { parent: 'forearmR', position: [0, -0.16, 0] },
    wrench: { parent: 'handR', position: [0, -0.04, 0] },
    harpoon: { parent: 'handL', position: [0, -0.04, 0] },
    tankRoot: { parent: 'chest', position: [0, 0.02, -0.32] },
    tankL: { parent: 'tankRoot', position: [-0.16, 0, 0] },
    tankR: { parent: 'tankRoot', position: [0.16, 0, 0] },
    hoseL: { parent: 'tankRoot', position: [-0.18, -0.1, 0.05] },
    hoseR: { parent: 'tankRoot', position: [0.18, -0.1, 0.05] },
    tailBase: { parent: 'pelvis', position: [0, -0.02, -0.22] },
    tailMid: { parent: 'tailBase', position: [0, -0.04, -0.42] },
    tailFin: { parent: 'tailMid', position: [0, 0, -0.38] },
    gauge: { parent: 'chest', position: [0.19, 0.08, 0.24] },
    baseFx: { parent: 'motionRoot', position: [0, 0.02, 0] }
  });

  add(joints.pelvis, box('hero:tissa:pelvis', [0.4, 0.25, 0.32], materials.leather));
  const torso = capsule('hero:tissa:torso', 0.23, 0.38, materials.cloth);
  torso.scale.x = 0.94;
  joints.chest.add(torso);
  for (const side of ['L', 'R']) {
    add(joints[`leg${side}`], capsule('hero:tissa:leg', 0.075, 0.39, materials.skin));
    add(joints[`upperArm${side}`], capsule('hero:tissa:upper-arm', 0.07, 0.28, materials.skin));
    add(joints[`forearm${side}`], capsule('hero:tissa:forearm', 0.06, 0.23, materials.skin));
    add(joints[`hand${side}`], sphere('hero:tissa:hand', 0.085, materials.skin));
    const boot = box('hero:tissa:webbed-boot', [0.2, 0.1, 0.32], materials.dark);
    joints[`foot${side}`].add(boot);
    const fin = cone('hero:tissa:foot-fin', 0.12, 0.32, materials.skin);
    fin.rotation.x = Math.PI / 2;
    fin.position.z = 0.18;
    fin.scale.x = 0.65;
    joints[`foot${side}`].add(fin);
  }

  const head = sphere('hero:tissa:head', 0.25, materials.skin);
  head.scale.set(1.02, 0.88, 1.0);
  joints.head.add(head);
  const snout = cone('hero:tissa:snout', 0.065, 0.22, materials.skin);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.04, 0.2);
  joints.head.add(snout);
  addEyes(joints.head, materials.dark, materials.accent, 0.14, 0.06, 0.19);
  const helmetGlass = sphere('hero:tissa:helmet-glass', 0.39, materials.glass);
  helmetGlass.scale.set(1.05, 1.02, 1.0);
  joints.helmet.add(helmetGlass);
  const helmetRim = torus('hero:tissa:helmet-rim', 0.37, 0.04, materials.brass);
  helmetRim.rotation.x = Math.PI / 2;
  helmetRim.position.y = -0.18;
  joints.helmet.add(helmetRim);
  for (let i = 0; i < 4; i += 1) {
    const brace = box('hero:tissa:helmet-brace', [0.035, 0.58, 0.035], materials.metal);
    brace.rotation.z = i * Math.PI / 2;
    brace.position.z = 0.31;
    joints.helmet.add(brace);
  }

  const tankFrame = box('hero:tissa:tank-frame', [0.5, 0.58, 0.12], materials.leather);
  joints.tankRoot.add(tankFrame);
  for (const name of ['tankL', 'tankR']) {
    const tank = cylinder('hero:tissa:air-tank', 0.12, 0.58, materials.metal);
    joints[name].add(tank);
    const cap = dome('hero:tissa:tank-cap', 0.12, materials.brass);
    cap.position.y = 0.29;
    joints[name].add(cap);
    for (const y of [-0.2, 0.18]) {
      const band = torus('hero:tissa:tank-band', 0.13, 0.018, materials.brass);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      joints[name].add(band);
    }
  }
  for (const name of ['hoseL', 'hoseR']) {
    const hose = makeSegmentedHose(materials.dark, materials.brass, 5);
    hose.rotation.x = 0.4;
    joints[name].add(hose);
  }

  const wrench = makeValveWrench(materials.metal, materials.brass);
  wrench.position.y = -0.12;
  joints.wrench.add(wrench);
  const harpoon = makeHarpoon(materials.metal, materials.leather);
  harpoon.position.y = 0.24;
  joints.harpoon.add(harpoon);

  const tailA = capsule('hero:tissa:tail-base', 0.1, 0.48, materials.skin);
  tailA.rotation.x = Math.PI / 2;
  tailA.position.z = -0.2;
  joints.tailBase.add(tailA);
  const tailB = capsule('hero:tissa:tail-mid', 0.075, 0.4, materials.skin);
  tailB.rotation.x = Math.PI / 2;
  tailB.position.z = -0.17;
  joints.tailMid.add(tailB);
  const finL = cone('hero:tissa:tail-fin', 0.17, 0.48, materials.skin);
  finL.rotation.z = Math.PI / 2;
  finL.position.x = -0.13;
  finL.scale.z = 0.32;
  const finR = cone('hero:tissa:tail-fin', 0.17, 0.48, materials.skin);
  finR.rotation.z = -Math.PI / 2;
  finR.position.x = 0.13;
  finR.scale.z = 0.32;
  joints.tailFin.add(finL, finR);

  const gaugeFace = cylinder('hero:tissa:gauge-face', 0.09, 0.035, materials.glass);
  gaugeFace.rotation.x = Math.PI / 2;
  const needle = box('hero:tissa:gauge-needle', [0.015, 0.12, 0.015], materials.accent);
  needle.position.y = 0.03;
  joints.gauge.add(gaugeFace, needle);

  const cracks = new THREE.Group();
  for (const angle of [-0.45, 0.1, 0.58]) {
    const line = box('hero:tissa:helmet-crack', [0.018, 0.24, 0.012], materials.accent);
    line.position.set(angle * 0.2, 0.05, 0.37);
    line.rotation.z = angle;
    cracks.add(line);
  }
  cracks.visible = false;
  cracks.name = 'hero-damage:stage1-show:helmet-cracks';
  joints.helmet.add(cracks);
  const bubbles = makeBubbleCluster(materials.water, 6);
  bubbles.visible = false;
  bubbles.name = 'hero-damage:stage2-show:tank-leak';
  joints.tankR.add(bubbles);
  const intactTank = joints.tankR.children[0];

  return {
    joints,
    secondary: { tailBase: joints.tailBase, tailMid: joints.tailMid, tailFin: joints.tailFin, hoseL: joints.hoseL, hoseR: joints.hoseR, tankRoot: joints.tankRoot },
    damageParts: { stage1Hide: [], stage2Hide: [intactTank], stage1Show: [cracks], stage2Show: [bubbles] },
    skillParts: { wrench: joints.wrench, harpoon: joints.harpoon, tailBase: joints.tailBase, tankRoot: joints.tankRoot }
  };
}

function buildMurga(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot: { parent: null, position: [0, 0, 0] },
    pelvis: { parent: 'motionRoot', position: [0, 0.62, 0] },
    legL: { parent: 'pelvis', position: [-0.2, -0.38, 0] },
    footL: { parent: 'legL', position: [0, -0.37, 0.1] },
    legR: { parent: 'pelvis', position: [0.2, -0.38, 0] },
    footR: { parent: 'legR', position: [0, -0.37, 0.1] },
    spineLower: { parent: 'pelvis', position: [0, 0.32, 0] },
    chest: { parent: 'spineLower', position: [0, 0.42, 0] },
    neck: { parent: 'chest', position: [0, 0.44, 0] },
    head: { parent: 'neck', position: [0, 0.29, 0.02] },
    shoulderL: { parent: 'chest', position: [-0.47, 0.25, 0] },
    upperArmL: { parent: 'shoulderL', position: [-0.17, -0.18, 0] },
    forearmL: { parent: 'upperArmL', position: [0, -0.32, 0] },
    handL: { parent: 'forearmL', position: [0, -0.24, 0] },
    shoulderR: { parent: 'chest', position: [0.47, 0.25, 0] },
    upperArmR: { parent: 'shoulderR', position: [0.17, -0.18, 0] },
    forearmR: { parent: 'upperArmR', position: [0, -0.32, 0] },
    handR: { parent: 'forearmR', position: [0, -0.24, 0] },
    hookRoot: { parent: 'handL', position: [0, -0.04, 0] },
    cleaverRoot: { parent: 'handR', position: [0, -0.04, 0] },
    chainRoot: { parent: 'hookRoot', position: [0, 0.3, 0] },
    cauldronRoot: { parent: 'chest', position: [0, 0.02, -0.42] },
    cauldron: { parent: 'cauldronRoot', position: [0, 0, 0] },
    lid: { parent: 'cauldronRoot', position: [0, 0.42, -0.02] },
    brazier: { parent: 'cauldronRoot', position: [0, -0.43, 0] },
    necklace: { parent: 'chest', position: [0, 0.22, 0.28] },
    pouchL: { parent: 'pelvis', position: [-0.3, -0.06, 0.22] },
    pouchR: { parent: 'pelvis', position: [0.3, -0.06, 0.22] },
    baseFx: { parent: 'motionRoot', position: [0, 0.03, 0] }
  });

  add(joints.pelvis, box('hero:murga:pelvis', [0.58, 0.32, 0.44], materials.leather));
  const torso = capsule('hero:murga:torso', 0.34, 0.74, materials.skin);
  torso.scale.set(1.02, 1.08, 0.88);
  joints.chest.add(torso);
  const apron = openCone('hero:murga:apron', 0.42, 0.9, 8, materials.cloth);
  apron.position.y = -0.2;
  apron.scale.z = 0.32;
  joints.chest.add(apron);
  for (const side of ['L', 'R']) {
    add(joints[`leg${side}`], capsule('hero:murga:leg', 0.13, 0.68, materials.clothInner));
    add(joints[`foot${side}`], box('hero:murga:boot', [0.3, 0.16, 0.44], materials.dark));
    add(joints[`upperArm${side}`], capsule('hero:murga:upper-arm', 0.13, 0.58, materials.skin));
    add(joints[`forearm${side}`], capsule('hero:murga:forearm', 0.12, 0.48, materials.skin));
    add(joints[`hand${side}`], sphere('hero:murga:hand', 0.15, materials.skin));
  }

  const head = sphere('hero:murga:head', 0.32, materials.skin);
  head.scale.set(1.0, 1.12, 0.88);
  joints.head.add(head);
  const jaw = box('hero:murga:jaw', [0.42, 0.18, 0.3], materials.skin);
  jaw.position.set(0, -0.22, 0.06);
  joints.head.add(jaw);
  addEyes(joints.head, materials.dark, materials.accent, 0.18, 0.08, 0.27);
  for (const side of [-1, 1]) {
    const tusk = cone('hero:murga:tusk', 0.06, 0.24, materials.bone);
    tusk.rotation.x = -Math.PI / 2;
    tusk.position.set(side * 0.14, -0.22, 0.27);
    joints.head.add(tusk);
  }

  const frame = new THREE.Group();
  for (const side of [-1, 1]) {
    const ribA = cylinder('hero:murga:rib-frame', 0.035, 0.92, materials.bone, true);
    ribA.position.set(side * 0.28, 0.02, 0);
    ribA.rotation.y = side * 0.12;
    frame.add(ribA);
    for (let i = 0; i < 3; i += 1) {
      const brace = cylinder('hero:murga:rib-brace', 0.025, 0.45, materials.bone, true);
      brace.position.set(side * 0.23, -0.25 + i * 0.25, 0.08);
      brace.rotation.z = side * (0.65 - i * 0.08);
      frame.add(brace);
    }
  }
  joints.cauldronRoot.add(frame);

  const pot = sphere('hero:murga:war-cauldron', 0.48, materials.dark);
  pot.scale.set(1.05, 0.82, 0.92);
  joints.cauldron.add(pot);
  const rim = torus('hero:murga:cauldron-rim', 0.42, 0.055, materials.metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.28;
  joints.cauldron.add(rim);
  const broth = cylinder('hero:murga:broth', 0.36, 0.025, materials.broth);
  broth.position.y = 0.29;
  joints.cauldron.add(broth);
  const lid = cylinder('hero:murga:lid', 0.44, 0.08, materials.metal);
  lid.position.y = 0;
  const lidHandle = torus('hero:murga:lid-handle', 0.12, 0.025, materials.brass);
  lidHandle.rotation.x = Math.PI / 2;
  lidHandle.position.y = 0.07;
  joints.lid.add(lid, lidHandle);
  const brazierBowl = dome('hero:murga:brazier', 0.28, materials.metal);
  brazierBowl.rotation.x = Math.PI;
  joints.brazier.add(brazierBowl);
  for (let i = 0; i < 5; i += 1) {
    const coal = sphere('hero:murga:coal', 0.07, materials.ember);
    coal.position.set((i % 3 - 1) * 0.1, 0.02, (Math.floor(i / 3) - 0.3) * 0.1);
    joints.brazier.add(coal);
  }

  const hook = makeButcherHook(materials.metal, materials.leather);
  hook.position.y = 0.28;
  joints.hookRoot.add(hook);
  const chain = makeChain(materials.metal, 10, 0.1);
  chain.position.y = 0.2;
  joints.chainRoot.add(chain);
  const cleaver = makeWarCleaver(materials.metal, materials.leather, materials.accent);
  cleaver.position.y = 0.3;
  joints.cleaverRoot.add(cleaver);

  for (let i = 0; i < 7; i += 1) {
    const spoon = makeBrokenSpoon(materials.metal, i);
    const angle = -0.9 + i * 0.3;
    spoon.position.set(Math.sin(angle) * 0.24, Math.cos(angle) * -0.08, 0);
    spoon.rotation.z = angle;
    joints.necklace.add(spoon);
  }
  for (const name of ['pouchL', 'pouchR']) {
    const pouch = box('hero:murga:spice-pouch', [0.22, 0.28, 0.16], materials.leather);
    joints[name].add(pouch);
    const cord = torus('hero:murga:pouch-cord', 0.09, 0.012, materials.brass);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.12;
    joints[name].add(cord);
  }

  const steam = makeSmokePuff(materials.steam, 5);
  steam.position.y = 0.35;
  joints.cauldron.add(steam);
  const crack = makeSparkCluster(materials.ember, 5);
  crack.visible = false;
  crack.name = 'hero-damage:stage1-show:cauldron-crack';
  joints.cauldron.add(crack);
  const spill = makeBrothSpill(materials.broth);
  spill.visible = false;
  spill.name = 'hero-damage:stage2-show:broth-spill';
  joints.brazier.add(spill);
  const intactLid = lid;

  return {
    joints,
    secondary: { cauldronRoot: joints.cauldronRoot, lid: joints.lid, chainRoot: joints.chainRoot, necklace: joints.necklace, pouchL: joints.pouchL, pouchR: joints.pouchR },
    damageParts: { stage1Hide: [], stage2Hide: [intactLid], stage1Show: [crack], stage2Show: [spill] },
    skillParts: { cauldronRoot: joints.cauldronRoot, lid: joints.lid, hookRoot: joints.hookRoot, chainRoot: joints.chainRoot, cleaverRoot: joints.cleaverRoot }
  };
}


function buildAldren(model, definition, materials) {
  const joints = buildHierarchy(model, {
    motionRoot:{parent:null,position:[0,0,0]}, pelvis:{parent:'motionRoot',position:[0,0.64,0]},
    legL:{parent:'pelvis',position:[-0.18,-0.38,0]}, footL:{parent:'legL',position:[0,-0.38,0.1]},
    legR:{parent:'pelvis',position:[0.18,-0.38,0]}, footR:{parent:'legR',position:[0,-0.38,0.1]},
    spine:{parent:'pelvis',position:[0,0.38,0]}, chest:{parent:'spine',position:[0,0.42,0]}, soulCore:{parent:'chest',position:[0,0.02,0.02]},
    neck:{parent:'chest',position:[0,0.43,0]}, head:{parent:'neck',position:[0,0.27,0]}, crest:{parent:'head',position:[0,0.36,-0.02]},
    shoulderL:{parent:'chest',position:[-0.45,0.24,0]}, armL:{parent:'shoulderL',position:[-0.14,-0.2,0]}, forearmL:{parent:'armL',position:[0,-0.31,0]}, handL:{parent:'forearmL',position:[0,-0.23,0]}, shieldRoot:{parent:'handL',position:[0,0,0.1]},
    shoulderR:{parent:'chest',position:[0.45,0.24,0]}, armR:{parent:'shoulderR',position:[0.14,-0.2,0]}, forearmR:{parent:'armR',position:[0,-0.31,0]}, handR:{parent:'forearmR',position:[0,-0.23,0]}, swordRoot:{parent:'handR',position:[0,0.04,0]},
    cloakRoot:{parent:'chest',position:[0,0.22,-0.25]}, cloakL:{parent:'cloakRoot',position:[-0.18,-0.2,0]}, cloakR:{parent:'cloakRoot',position:[0.18,-0.2,0]}, commandChain:{parent:'chest',position:[0,0.2,0.27]}, baseFx:{parent:'motionRoot',position:[0,0.03,0]}
  });
  add(joints.pelvis, box('hero:aldren:pelvis-plate',[0.48,0.26,0.34],materials.metal));
  for(const side of ['L','R']){
    add(joints[`leg${side}`], cylinder('hero:aldren:femur',0.05,0.62,materials.bone));
    const greave=box('hero:aldren:greave',[0.18,0.46,0.22],materials.metal); greave.position.y=-0.08; joints[`leg${side}`].add(greave);
    add(joints[`foot${side}`], box('hero:aldren:sabatons',[0.22,0.13,0.38],materials.dark));
    add(joints[`arm${side}`], cylinder('hero:aldren:humerus',0.045,0.5,materials.bone));
    add(joints[`forearm${side}`], cylinder('hero:aldren:forearm-bone',0.04,0.44,materials.bone));
    add(joints[`hand${side}`], sphere('hero:aldren:hand-bone',0.11,materials.bone));
    const pauldron=dome(`hero:aldren:pauldron:${side}`,0.28,materials.metal); pauldron.rotation.z=side==='L'?-0.35:0.35; joints[`shoulder${side}`].add(pauldron);
  }
  const leftBreast=box('hero:aldren:hollow-breast-left',[0.3,0.65,0.18],materials.metal); leftBreast.position.x=-0.23;
  const rightBreast=box('hero:aldren:hollow-breast-right',[0.3,0.65,0.18],materials.metal); rightBreast.position.x=0.23;
  const collar=torus('hero:aldren:hollow-collar',0.34,0.05,materials.brass); collar.rotation.x=Math.PI/2; collar.position.y=0.31;
  joints.chest.add(leftBreast,rightBreast,collar);
  for(let i=0;i<5;i++){const rib=torus('hero:aldren:rib',0.22,0.018,materials.bone);rib.rotation.z=Math.PI/2;rib.position.y=-0.18+i*0.09;joints.chest.add(rib);}
  const flame=sphere('hero:aldren:soul-flame',0.16,materials.spectral); flame.scale.set(0.8,1.5,0.8); joints.soulCore.add(flame);
  const skull=sphere('hero:aldren:skull',0.27,materials.bone); skull.scale.set(0.92,1.02,0.88); joints.head.add(skull);
  const jaw=box('hero:aldren:jaw',[0.32,0.13,0.23],materials.bone); jaw.position.set(0,-0.2,0.04); joints.head.add(jaw); addEyes(joints.head,materials.dark,materials.accent,0.17,0.05,0.23);
  const helm=dome('hero:aldren:royal-helm',0.33,materials.metal); helm.position.y=0.05; joints.head.add(helm);
  const visor=box('hero:aldren:visor',[0.52,0.12,0.11],materials.metal); visor.position.set(0,-0.02,0.25); joints.head.add(visor);
  for(let i=0;i<5;i++){const feather=box('hero:aldren:crest-feather',[0.08,0.42-i*0.035,0.05],materials.cloth);feather.position.set((i-2)*0.075,0.16,0);feather.rotation.z=(i-2)*0.08;joints.crest.add(feather);}
  const shield=box('hero:aldren:empty-shield',[0.78,1.15,0.12],materials.metal); shield.position.y=0.08; joints.shieldRoot.add(shield);
  const shieldRim=torus('hero:aldren:shield-rim',0.39,0.04,materials.brass); shieldRim.scale.y=1.4; shieldRim.rotation.x=Math.PI/2; shieldRim.position.z=0.08; joints.shieldRoot.add(shieldRim);
  const emptyHeraldry=box('hero:aldren:empty-heraldry',[0.38,0.55,0.06],materials.dark);emptyHeraldry.position.set(0,0.08,0.09);joints.shieldRoot.add(emptyHeraldry);
  const sword=makeRoyalSword(materials.metal,materials.brass,materials.accent); sword.position.y=0.42; joints.swordRoot.add(sword);
  for(const [joint,side] of [[joints.cloakL,-1],[joints.cloakR,1]]){const cloth=openCone('hero:aldren:cloak',0.42,1.25,8,materials.cloth);cloth.scale.z=0.18;cloth.position.set(side*0.1,-0.48,-0.08);cloth.rotation.z=side*0.06;joint.add(cloth);}
  const chain=makeChain(materials.brass,9,0.09); chain.rotation.z=Math.PI/2; joints.commandChain.add(chain);
  const brokenShield=makeCrackMark(materials.accent); brokenShield.visible=false; brokenShield.name='hero-damage:stage1-show:shield-crack'; joints.shieldRoot.add(brokenShield);
  const tornCloak=box('hero:aldren:torn-cloak',[0.32,0.55,0.04],materials.clothInner);tornCloak.visible=false;tornCloak.position.set(-0.28,-0.5,-0.12);tornCloak.rotation.z=-0.25;tornCloak.name='hero-damage:stage2-show:torn-cloak';joints.cloakRoot.add(tornCloak);
  return {joints,secondary:{cloakL:joints.cloakL,cloakR:joints.cloakR,commandChain:joints.commandChain,crest:joints.crest,soulCore:joints.soulCore},secondaryMotionConfig:[{id:'aldren-cloak',mode:'veil-chain',joints:['cloakL','cloakR'],amplitude:0.05,frequency:1.1,stiffness:22,damping:8},{id:'aldren-chain',mode:'artifact-float',joints:['commandChain'],amplitude:0.025,frequency:1.4,stiffness:28,damping:9}],damageParts:{stage1Hide:[],stage2Hide:[leftBreast],stage1Show:[brokenShield],stage2Show:[tornCloak]},skillParts:{shieldRoot:joints.shieldRoot,swordRoot:joints.swordRoot,soulCore:joints.soulCore,cloakRoot:joints.cloakRoot}};
}

function buildMalcor(model, definition, materials) {
  const joints=buildHierarchy(model,{
    motionRoot:{parent:null,position:[0,0,0]},pelvis:{parent:'motionRoot',position:[0,0.54,0]},legL:{parent:'pelvis',position:[-0.16,-0.34,0]},footL:{parent:'legL',position:[0,-0.34,0.12]},legR:{parent:'pelvis',position:[0.16,-0.34,0]},footR:{parent:'legR',position:[0,-0.34,0.12]},
    spineLower:{parent:'pelvis',position:[0,0.3,0]},chest:{parent:'spineLower',position:[0,0.36,0.08]},neck:{parent:'chest',position:[0,0.38,0.16]},head:{parent:'neck',position:[0,0.24,0.16]},jaw:{parent:'head',position:[0,-0.2,0.12]},
    shoulderL:{parent:'chest',position:[-0.38,0.18,0]},upperArmL:{parent:'shoulderL',position:[-0.12,-0.25,0]},forearmL:{parent:'upperArmL',position:[0,-0.38,0]},handL:{parent:'forearmL',position:[0,-0.3,0]},
    shoulderR:{parent:'chest',position:[0.38,0.18,0]},upperArmR:{parent:'shoulderR',position:[0.12,-0.25,0]},forearmR:{parent:'upperArmR',position:[0,-0.38,0]},handR:{parent:'forearmR',position:[0,-0.3,0]},
    coatRoot:{parent:'chest',position:[0,-0.05,-0.18]},coatTailL:{parent:'coatRoot',position:[-0.2,-0.28,-0.04]},coatTailR:{parent:'coatRoot',position:[0.2,-0.28,-0.04]},cravat:{parent:'chest',position:[0,0.18,0.25]},cutlery:{parent:'pelvis',position:[0,0.04,0.25]},vaporRoot:{parent:'chest',position:[0,0.1,-0.15]},baseFx:{parent:'motionRoot',position:[0,0.03,0]}
  });
  add(joints.pelvis,box('hero:malcor:pelvis',[0.42,0.25,0.32],materials.leather));
  const torso=capsule('hero:malcor:torso',0.25,0.56,materials.skin);torso.scale.set(0.9,1.12,0.72);joints.chest.add(torso);
  for(const side of ['L','R']){add(joints[`leg${side}`],capsule('hero:malcor:leg',0.085,0.58,materials.skin));add(joints[`foot${side}`],box('hero:malcor:foot',[0.18,0.1,0.35],materials.dark));add(joints[`upperArm${side}`],capsule('hero:malcor:long-upper-arm',0.07,0.62,materials.skin));add(joints[`forearm${side}`],capsule('hero:malcor:long-forearm',0.065,0.66,materials.skin));const claw=makeClawHand(materials.skin,materials.bone);joints[`hand${side}`].add(claw);}
  const head=sphere('hero:malcor:head',0.28,materials.skin);head.scale.set(0.84,1.16,0.9);joints.head.add(head);addEyes(joints.head,materials.dark,materials.accent,0.15,0.08,0.24);
  const jaw=box('hero:malcor:jaw',[0.38,0.18,0.29],materials.skin);joints.jaw.add(jaw);for(let i=0;i<6;i++){const tooth=cone('hero:malcor:tooth',0.025,0.11,materials.bone);tooth.position.set(-0.12+i*0.05,-0.08,0.15);tooth.rotation.x=Math.PI;joints.jaw.add(tooth);}for(let i=0;i<4;i++){const stitch=cylinder('hero:malcor:silver-stitch',0.012,0.22,materials.metal,true);stitch.position.set(-0.13+i*0.09,0,0.17);stitch.rotation.z=0.4;joints.jaw.add(stitch);}
  const coat=openCone('hero:malcor:banquet-coat',0.48,0.9,8,materials.cloth);coat.scale.z=0.55;coat.position.y=-0.18;joints.chest.add(coat);
  for(const joint of [joints.coatTailL,joints.coatTailR]){const tail=box('hero:malcor:coat-tail',[0.3,1.05,0.07],materials.cloth);tail.position.y=-0.44;joint.add(tail);}
  const cravat=box('hero:malcor:tablecloth-cravat',[0.26,0.68,0.05],materials.clothInner);cravat.position.y=-0.18;joints.cravat.add(cravat);
  for(let i=0;i<7;i++){const ring=torus('hero:malcor:noble-ring',0.035,0.01,materials.brass);ring.rotation.x=Math.PI/2;ring.position.set((i%4-1.5)*0.04,-0.02-Math.floor(i/4)*0.04,0);(i<4?joints.handL:joints.handR).add(ring);}
  for(let i=0;i<6;i++){const utensil=cylinder('hero:malcor:cutlery',0.012,0.38,materials.metal);utensil.position.set((i-2.5)*0.055,0,0);utensil.rotation.z=-0.18+(i%2)*0.36;joints.cutlery.add(utensil);}
  for(let i=0;i<6;i++){const spine=cone('hero:malcor:spine-ridge',0.045,0.22,materials.bone);spine.rotation.x=-Math.PI/2;spine.position.set(0,0.25-i*0.1,-0.26);joints.chest.add(spine);}
  const vapor=makeSmokePuff(materials.spore,7);vapor.position.y=0.1;joints.vaporRoot.add(vapor);
  const openJaw=box('hero:malcor:open-jaw-shadow',[0.34,0.28,0.25],materials.dark);openJaw.visible=false;openJaw.position.y=-0.12;openJaw.name='hero-damage:stage1-show:open-jaw';joints.jaw.add(openJaw);
  const tornTail=box('hero:malcor:torn-tail',[0.22,0.48,0.06],materials.clothInner);tornTail.visible=false;tornTail.position.set(0,-0.35,0);tornTail.rotation.z=-0.35;tornTail.name='hero-damage:stage2-show:torn-coat';joints.coatTailL.add(tornTail);
  return {joints,secondary:{coatTailL:joints.coatTailL,coatTailR:joints.coatTailR,jaw:joints.jaw,vaporRoot:joints.vaporRoot,cravat:joints.cravat},secondaryMotionConfig:[{id:'malcor-coat',mode:'veil-chain',joints:['coatTailL','coatTailR'],amplitude:0.09,frequency:1.35,stiffness:18,damping:7},{id:'malcor-cravat',mode:'root-tendrils',joints:['cravat'],amplitude:0.035,frequency:1.1,stiffness:24,damping:8}],damageParts:{stage1Hide:[],stage2Hide:[],stage1Show:[openJaw],stage2Show:[tornTail]},skillParts:{jaw:joints.jaw,coatRoot:joints.coatRoot,handL:joints.handL,handR:joints.handR,vaporRoot:joints.vaporRoot}};
}

function buildArvek(model, definition, materials) {
  const joints=buildHierarchy(model,{
    motionRoot:{parent:null,position:[0,0,0]},pelvis:{parent:'motionRoot',position:[0,0.72,0]},legL:{parent:'pelvis',position:[-0.22,-0.43,0]},footL:{parent:'legL',position:[0,-0.43,0.12]},legR:{parent:'pelvis',position:[0.22,-0.43,0]},footR:{parent:'legR',position:[0,-0.43,0.12]},spine:{parent:'pelvis',position:[0,0.42,0]},chest:{parent:'spine',position:[0,0.5,0]},head:{parent:'chest',position:[0,0.62,0]},
    shoulderL:{parent:'chest',position:[-0.58,0.3,0]},towerL:{parent:'shoulderL',position:[0,0.22,0]},armL:{parent:'shoulderL',position:[-0.16,-0.24,0]},forearmL:{parent:'armL',position:[0,-0.36,0]},handL:{parent:'forearmL',position:[0,-0.27,0]},shieldRoot:{parent:'handL',position:[0,0.05,0.14]},
    shoulderR:{parent:'chest',position:[0.58,0.3,0]},towerR:{parent:'shoulderR',position:[0,0.22,0]},armR:{parent:'shoulderR',position:[0.16,-0.24,0]},forearmR:{parent:'armR',position:[0,-0.36,0]},handR:{parent:'forearmR',position:[0,-0.27,0]},swordRoot:{parent:'handR',position:[0,0.04,0]},
    crossbar:{parent:'chest',position:[0,0.05,0.3]},keyRing:{parent:'chest',position:[0,0.25,-0.38]},chainCloak:{parent:'chest',position:[0,0.1,-0.32]},baseFx:{parent:'motionRoot',position:[0,0.03,0]}
  });
  add(joints.pelvis,box('hero:arvek:pelvis',[0.65,0.34,0.46],materials.metal));const torso=box('hero:arvek:gate-torso',[0.9,0.9,0.52],materials.metal);joints.chest.add(torso);
  for(const side of ['L','R']){add(joints[`leg${side}`],capsule('hero:arvek:leg',0.15,0.76,materials.dark));add(joints[`foot${side}`],box('hero:arvek:boot',[0.34,0.18,0.5],materials.metal));add(joints[`arm${side}`],capsule('hero:arvek:upper-arm',0.14,0.64,materials.dark));add(joints[`forearm${side}`],box('hero:arvek:gauntlet',[0.24,0.55,0.28],materials.metal));add(joints[`hand${side}`],sphere('hero:arvek:hand',0.15,materials.dark));}
  for(const [tower,side] of [[joints.towerL,-1],[joints.towerR,1]]){const block=box('hero:arvek:gate-tower',[0.42,0.72,0.4],materials.metal);tower.add(block);for(let i=0;i<3;i++){const cren=box('hero:arvek:crenellation',[0.1,0.16,0.12],materials.brass);cren.position.set((i-1)*0.13,0.42,0);tower.add(cren);}const crest=box('hero:arvek:crest',[0.22,0.3,0.05],side<0?materials.cloth:materials.clothInner);crest.position.set(0,0.05,0.23);tower.add(crest);}
  const helm=box('hero:arvek:helm',[0.52,0.52,0.48],materials.metal);joints.head.add(helm);const slit=box('hero:arvek:visor-slit',[0.38,0.06,0.03],materials.accent);slit.position.z=0.26;joints.head.add(slit);const crown=dome('hero:arvek:helm-crown',0.31,materials.dark);crown.position.y=0.28;joints.head.add(crown);
  const bar=box('hero:arvek:crossbar',[1.15,0.15,0.16],materials.brass);joints.crossbar.add(bar);for(const x of [-0.46,0.46]){const bolt=cylinder('hero:arvek:bar-bolt',0.07,0.12,materials.dark);bolt.rotation.x=Math.PI/2;bolt.position.set(x,0,0.1);joints.crossbar.add(bolt);}
  const shield=box('hero:arvek:door-shield',[0.95,1.45,0.18],materials.dark);shield.position.y=0.08;joints.shieldRoot.add(shield);for(let i=0;i<4;i++){const band=box('hero:arvek:door-band',[0.98,0.09,0.08],materials.metal);band.position.set(0,-0.48+i*0.32,0.11);joints.shieldRoot.add(band);}for(let i=0;i<6;i++){const mark=sphere('hero:arvek:handprint',0.045,materials.clothInner);mark.position.set(-0.28+(i%3)*0.28,-0.35+Math.floor(i/3)*0.55,0.22);mark.scale.set(1.5,0.7,0.3);joints.shieldRoot.add(mark);}
  const sword=makeExecutionSword(materials.metal,materials.dark,materials.accent);sword.position.y=0.48;joints.swordRoot.add(sword);
  for(let i=0;i<12;i++){const key=makeKey(materials.brass,i);const angle=i/12*Math.PI*2;key.position.set(Math.cos(angle)*0.3,Math.sin(angle)*0.08,Math.sin(angle)*0.3);key.rotation.z=angle;joints.keyRing.add(key);}
  const chain=makeChain(materials.metal,16,0.11);chain.position.y=-0.25;joints.chainCloak.add(chain);const shadowCloth=openCone('hero:arvek:threshold-cloak',0.55,1.25,9,materials.cloth);shadowCloth.scale.z=0.2;shadowCloth.position.y=-0.42;joints.chainCloak.add(shadowCloth);
  const brokenBar=box('hero:arvek:broken-crossbar',[0.54,0.14,0.15],materials.brass);brokenBar.visible=false;brokenBar.position.x=0.28;brokenBar.rotation.z=0.35;brokenBar.name='hero-damage:stage1-show:broken-bar';joints.crossbar.add(brokenBar);
  const fallenTower=box('hero:arvek:fallen-tower',[0.36,0.58,0.35],materials.metal);fallenTower.visible=false;fallenTower.position.set(-0.35,-0.35,0);fallenTower.rotation.z=-0.9;fallenTower.name='hero-damage:stage2-show:fallen-tower';joints.chest.add(fallenTower);
  return {joints,secondary:{keyRing:joints.keyRing,chainCloak:joints.chainCloak,towerL:joints.towerL,towerR:joints.towerR,crossbar:joints.crossbar},secondaryMotionConfig:[{id:'arvek-keys',mode:'artifact-float',joints:['keyRing'],amplitude:0.025,frequency:1.0,stiffness:32,damping:10},{id:'arvek-chain-cloak',mode:'veil-chain',joints:['chainCloak'],amplitude:0.04,frequency:0.8,stiffness:26,damping:9}],damageParts:{stage1Hide:[bar],stage2Hide:[joints.towerL.children[0]],stage1Show:[brokenBar],stage2Show:[fallenTower]},skillParts:{shieldRoot:joints.shieldRoot,crossbar:joints.crossbar,keyRing:joints.keyRing,swordRoot:joints.swordRoot,towerL:joints.towerL,towerR:joints.towerR}};
}


function buildPev(model, definition, materials) {
  const joints=buildHierarchy(model,{
    motionRoot:{parent:null,position:[0,0,0]},blobRoot:{parent:'motionRoot',position:[0,0.52,0]},shell:{parent:'blobRoot',position:[0,0,0]},core:{parent:'blobRoot',position:[0,0.02,0]},crest:{parent:'blobRoot',position:[0,0.52,0]},artifactOrbit:{parent:'blobRoot',position:[0,0.06,0]},trinket0:{parent:'artifactOrbit',position:[0.34,0.14,0]},trinket1:{parent:'artifactOrbit',position:[-0.18,0.28,0.28]},trinket2:{parent:'artifactOrbit',position:[-0.2,-0.08,-0.3]},metalPlateL:{parent:'blobRoot',position:[-0.32,0.04,0.03]},metalPlateR:{parent:'blobRoot',position:[0.32,0.04,0.03]},fungalCap:{parent:'crest',position:[0,0.05,0]},spectralTail:{parent:'blobRoot',position:[0,-0.38,-0.12]},bubbleFilm:{parent:'blobRoot',position:[0,0,0]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}
  });
  const shell=sphere('hero:pev:clear-shell',0.48,materials.slimeShell);shell.scale.set(0.95,1.14,0.92);joints.shell.add(shell);
  const inner=sphere('hero:pev:purity-core',0.13,materials.accent);inner.scale.set(0.9,1.25,0.9);joints.core.add(inner);
  const crest=cone('hero:pev:crest',0.13,0.34,materials.slimeShell);crest.position.y=0.12;joints.crest.add(crest);
  const bubble= sphere('hero:pev:bubble-film',0.54,materials.glass);bubble.scale.set(1,1.08,1);bubble.visible=false;bubble.name='hero-skill:pev-bubble';joints.bubbleFilm.add(bubble);
  const trinkets=[];
  const nail=box('hero:pev:mimic-nail',[0.07,0.32,0.06],materials.metal);nail.rotation.z=-0.45;joints.trinket0.add(nail);trinkets.push(nail);
  const coin=cylinder('hero:pev:mimic-coin',0.1,0.025,materials.brass,true);coin.rotation.x=Math.PI/2;joints.trinket1.add(coin);trinkets.push(coin);
  const bead=sphere('hero:pev:mimic-bead',0.09,materials.spore);joints.trinket2.add(bead);trinkets.push(bead);
  for(const joint of [joints.metalPlateL,joints.metalPlateR]){const plate=box('hero:pev:adaptive-plate',[0.22,0.42,0.08],materials.metal);plate.visible=false;joint.add(plate);}
  const cap=dome('hero:pev:fungal-cap',0.26,materials.spore);cap.visible=false;joints.fungalCap.add(cap);
  const tail=openCone('hero:pev:spectral-tail',0.22,0.6,8,materials.spectral);tail.visible=false;tail.position.y=-0.18;joints.spectralTail.add(tail);
  const cloud=sphere('hero:pev:clouded-core',0.28,materials.darkTransparent);cloud.visible=false;cloud.name='hero-damage:stage2-show:clouded';joints.core.add(cloud);
  return {joints,secondary:{artifactOrbit:joints.artifactOrbit,trinket0:joints.trinket0,trinket1:joints.trinket1,trinket2:joints.trinket2,crest:joints.crest,spectralTail:joints.spectralTail},secondaryMotionConfig:[{id:'pev-orbit',mode:'artifact-float',joints:['trinket0','trinket1','trinket2'],amplitude:0.06,frequency:1.3,stiffness:28,damping:9},{id:'pev-tail',mode:'veil-chain',joints:['spectralTail'],amplitude:0.08,frequency:1.5,stiffness:18,damping:7}],damageParts:{stage1Hide:[trinkets[1]],stage2Hide:[trinkets[0]],stage1Show:[],stage2Show:[cloud]},skillParts:{bubbleFilm:joints.bubbleFilm,artifactOrbit:joints.artifactOrbit,metalPlateL:joints.metalPlateL,metalPlateR:joints.metalPlateR,fungalCap:joints.fungalCap,spectralTail:joints.spectralTail},dynamicMaterials:[materials.slimeShell,materials.accent]};
}

function buildEighthCocoon(model, definition, materials) {
  const specs={motionRoot:{parent:null,position:[0,0,0]},thorax:{parent:'motionRoot',position:[0,0.62,0]},abdomen:{parent:'thorax',position:[0,0.05,-0.62]},knightChest:{parent:'thorax',position:[0,0.68,0.04]},helm:{parent:'knightChest',position:[0,0.62,0.02]},lanceRoot:{parent:'knightChest',position:[0.46,0.24,0.12]},shieldRoot:{parent:'knightChest',position:[-0.5,0.18,0.12]},silkRig:{parent:'thorax',position:[0,0.32,0]},fangL:{parent:'thorax',position:[-0.18,0.03,0.34]},fangR:{parent:'thorax',position:[0.18,0.03,0.34]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}};
  for(let i=0;i<8;i++){const side=i<4?-1:1,index=i%4,z=0.42-index*0.3;specs[`leg${i}a`]={parent:'thorax',position:[side*0.36,-0.02,z]};specs[`leg${i}b`]={parent:`leg${i}a`,position:[side*0.42,-0.12,0]};specs[`leg${i}c`]={parent:`leg${i}b`,position:[side*0.38,-0.28,0]};}
  const joints=buildHierarchy(model,specs);
  const thorax=sphere('hero:cocoon:thorax',0.4,materials.skin);thorax.scale.set(1.18,0.72,1);joints.thorax.add(thorax);
  const abdomen=sphere('hero:cocoon:abdomen',0.56,materials.dark);abdomen.scale.set(0.95,0.72,1.25);joints.abdomen.add(abdomen);
  for(let i=0;i<5;i++){const ridge=torus('hero:cocoon:abdomen-ridge',0.34+i*0.025,0.028,materials.cloth);ridge.rotation.x=Math.PI/2;ridge.position.z=-0.25+i*0.13;joints.abdomen.add(ridge);}
  for(let i=0;i<8;i++){add(joints[`leg${i}a`],cylinder('hero:cocoon:leg-upper',0.055,0.56,materials.skin,true));add(joints[`leg${i}b`],cylinder('hero:cocoon:leg-mid',0.045,0.5,materials.skin,true));const lower=cone('hero:cocoon:leg-tip',0.05,0.54,materials.dark);lower.rotation.z=(i<4?-1:1)*Math.PI/2;joints[`leg${i}c`].add(lower);}
  const cuirass=box('hero:cocoon:empty-cuirass',[0.72,0.78,0.4],materials.metal);joints.knightChest.add(cuirass);for(const x of [-0.24,0.24]){const pauldron=dome('hero:cocoon:pauldron',0.23,materials.metal);pauldron.position.set(x,0.32,0);joints.knightChest.add(pauldron);}
  const helm=dome('hero:cocoon:hollow-helm',0.3,materials.metal);joints.helm.add(helm);const visor=box('hero:cocoon:visor',[0.42,0.08,0.04],materials.dark);visor.position.set(0,-0.02,0.26);joints.helm.add(visor);for(let i=0;i<4;i++){const eye=sphere('hero:cocoon:spider-eye',0.035,materials.accent);eye.position.set((i-1.5)*0.08,-0.02,0.29);joints.helm.add(eye);}
  const lance=cylinder('hero:cocoon:silk-lance',0.045,1.9,materials.spectral);lance.position.y=0.72;lance.rotation.z=-0.1;joints.lanceRoot.add(lance);const lanceTip=cone('hero:cocoon:lance-tip',0.1,0.38,materials.metal);lanceTip.position.y=1.78;joints.lanceRoot.add(lanceTip);
  const shield=box('hero:cocoon:kite-shield',[0.68,0.92,0.12],materials.metal);shield.position.y=-0.05;joints.shieldRoot.add(shield);for(let i=0;i<6;i++){const thread=cylinder('hero:cocoon:shield-thread',0.012,0.9,materials.spectral);thread.position.set(-0.25+i*0.1,0,0.09);thread.rotation.z=(i-2.5)*0.06;joints.shieldRoot.add(thread);}
  for(const fang of [joints.fangL,joints.fangR]){const mesh=cone('hero:cocoon:fang',0.07,0.32,materials.bone);mesh.rotation.x=Math.PI/2;fang.add(mesh);}
  const shattered=box('hero:cocoon:shattered-cuirass',[0.65,0.18,0.38],materials.metal);shattered.visible=false;shattered.rotation.z=0.5;shattered.name='hero-damage:stage2-show:shattered-cuirass';joints.thorax.add(shattered);
  return {joints,secondary:{abdomen:joints.abdomen,shieldRoot:joints.shieldRoot,silkRig:joints.silkRig,lanceRoot:joints.lanceRoot},secondaryMotionConfig:[{id:'cocoon-silk',mode:'root-tendrils',joints:['silkRig','shieldRoot'],amplitude:0.045,frequency:1.4,stiffness:23,damping:8}],damageParts:{stage1Hide:[],stage2Hide:[cuirass,helm],stage1Show:[],stage2Show:[shattered]},skillParts:{lanceRoot:joints.lanceRoot,shieldRoot:joints.shieldRoot,knightChest:joints.knightChest,fangL:joints.fangL,fangR:joints.fangR}};
}

function buildEmptyQueenHand(model, definition, materials) {
  const specs={motionRoot:{parent:null,position:[0,0,0]},sacRoot:{parent:'motionRoot',position:[0,1.05,0]},sac:{parent:'sacRoot',position:[0,0,0]},neuralCore:{parent:'sac',position:[0,0.05,0]},crownRoot:{parent:'sacRoot',position:[0,0.72,0]},egg0:{parent:'sacRoot',position:[-0.42,-0.36,0.18]},egg1:{parent:'sacRoot',position:[0,-0.45,-0.12]},egg2:{parent:'sacRoot',position:[0.42,-0.36,0.18]},silkTrail:{parent:'sacRoot',position:[0,-0.3,-0.65]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}};
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;specs[`carrier${i}`]={parent:'motionRoot',position:[Math.cos(a)*0.72,0.38,Math.sin(a)*0.6]};for(let j=0;j<4;j++){const side=j<2?-1:1;specs[`carrier${i}leg${j}`]={parent:`carrier${i}`,position:[side*0.22,0,(j%2?-.18:.18)]};}}
  const joints=buildHierarchy(model,specs);
  const sac=sphere('hero:queen:royal-sac',0.72,materials.glass);sac.scale.set(1.15,1.25,1);joints.sac.add(sac);const yolk=sphere('hero:queen:neural-yolk',0.28,materials.spore);yolk.scale.set(1.1,1.35,0.9);joints.neuralCore.add(yolk);for(let i=0;i<12;i++){const nerve=cylinder('hero:queen:nerve',0.012,0.55,materials.accent,true);nerve.rotation.z=i/12*Math.PI*2;nerve.position.set(Math.cos(i/12*Math.PI*2)*0.2,0,Math.sin(i/12*Math.PI*2)*0.2);joints.neuralCore.add(nerve);}
  for(let i=0;i<5;i++){const body=sphere('hero:queen:carrier-body',0.24,materials.skin);body.scale.set(1,0.65,1.15);joints[`carrier${i}`].add(body);for(let j=0;j<4;j++){const leg=cylinder('hero:queen:carrier-leg',0.032,0.48,materials.dark,true);leg.rotation.z=(j<2?-1:1)*0.8;joints[`carrier${i}leg${j}`].add(leg);}}
  for(const side of [-1,1]){const limb=cylinder('hero:queen:severed-forelimb',0.085,1.1,materials.bone,true);limb.rotation.z=side*0.62;limb.position.set(side*0.35,0.28,0);joints.crownRoot.add(limb);const hook=cone('hero:queen:forelimb-hook',0.1,0.36,materials.bone);hook.position.set(side*0.72,0.62,0);hook.rotation.z=side*-0.62;joints.crownRoot.add(hook);}
  for(const joint of [joints.egg0,joints.egg1,joints.egg2]){const egg=sphere('hero:queen:egg',0.18,materials.glass);egg.scale.y=1.25;joint.add(egg);}
  const trail=openCone('hero:queen:silk-trail',0.5,1.35,10,materials.spectral);trail.scale.z=0.35;trail.position.y=-0.3;joints.silkTrail.add(trail);
  const ruptured=sphere('hero:queen:ruptured-sac',0.38,materials.darkTransparent);ruptured.visible=false;ruptured.name='hero-damage:stage2-show:rupture';joints.sac.add(ruptured);
  return {joints,secondary:{sacRoot:joints.sacRoot,neuralCore:joints.neuralCore,crownRoot:joints.crownRoot,silkTrail:joints.silkTrail},secondaryMotionConfig:[{id:'queen-sac',mode:'artifact-float',joints:['sacRoot','neuralCore'],amplitude:0.05,frequency:0.9,stiffness:18,damping:7},{id:'queen-trail',mode:'veil-chain',joints:['silkTrail'],amplitude:0.08,frequency:1.2,stiffness:16,damping:6}],damageParts:{stage1Hide:[joints.carrier4.children[0]],stage2Hide:[joints.carrier3.children[0]],stage1Show:[],stage2Show:[ruptured]},skillParts:{sacRoot:joints.sacRoot,egg0:joints.egg0,egg1:joints.egg1,egg2:joints.egg2,crownRoot:joints.crownRoot}};
}

function buildFailedSuccessor(model, definition, materials) {
  const joints=buildHierarchy(model,{motionRoot:{parent:null,position:[0,0,0]},pelvis:{parent:'motionRoot',position:[0,0.68,0]},legL:{parent:'pelvis',position:[-0.18,-0.4,0]},legR:{parent:'pelvis',position:[0.18,-0.4,0]},spine:{parent:'pelvis',position:[0,0.42,0]},chest:{parent:'spine',position:[0,0.48,0]},head:{parent:'chest',position:[0,0.58,0]},mask:{parent:'head',position:[0,0,0.25]},shoulderL:{parent:'chest',position:[-0.4,0.22,0]},armL:{parent:'shoulderL',position:[-0.1,-0.22,0]},handL:{parent:'armL',position:[0,-0.42,0]},shoulderR:{parent:'chest',position:[0.4,0.22,0]},armR:{parent:'shoulderR',position:[0.1,-0.22,0]},handR:{parent:'armR',position:[0,-0.42,0]},coatL:{parent:'chest',position:[-0.24,-0.38,-0.1]},coatR:{parent:'chest',position:[0.24,-0.38,-0.1]},shadow:{parent:'motionRoot',position:[0,0.02,-0.18]},parasiteFace:{parent:'head',position:[0,0,0.2]},extraArms:{parent:'chest',position:[0,0.05,-0.12]},seal:{parent:'chest',position:[0,0.05,0.31]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}});
  add(joints.pelvis,box('hero:successor:pelvis',[0.5,0.28,0.36],materials.cloth));add(joints.chest,capsule('hero:successor:torso',0.29,0.62,materials.cloth));for(const side of ['L','R']){add(joints[`leg${side}`],capsule('hero:successor:leg',0.1,0.72,materials.cloth));add(joints[`arm${side}`],capsule('hero:successor:arm',0.085,0.62,materials.cloth));add(joints[`hand${side}`],sphere('hero:successor:hand',0.11,materials.skin));}
  const head=sphere('hero:successor:head',0.28,materials.skin);joints.head.add(head);const mask=box('hero:successor:porcelain-mask',[0.42,0.52,0.08],materials.clothInner);mask.position.z=0.02;joints.mask.add(mask);const slit=box('hero:successor:mask-slit',[0.24,0.025,0.02],materials.dark);slit.position.z=0.06;joints.mask.add(slit);
  for(const joint of [joints.coatL,joints.coatR]){const tail=box('hero:successor:longcoat',[0.34,1.05,0.08],materials.cloth);tail.position.y=-0.42;joint.add(tail);}
  const emptyCrest=box('hero:successor:empty-crest',[0.3,0.38,0.04],materials.metal);joints.seal.add(emptyCrest);const falseSeal=cylinder('hero:successor:false-seal',0.1,0.03,materials.brass,true);falseSeal.rotation.x=Math.PI/2;joints.seal.add(falseSeal);
  const shadow=openCone('hero:successor:delayed-shadow',0.48,1.2,9,materials.darkTransparent);shadow.scale.z=0.3;shadow.position.y=0.15;joints.shadow.add(shadow);
  const petals=[];for(let i=0;i<8;i++){const petal=cone('hero:successor:parasite-petal',0.055,0.34,materials.spore);petal.rotation.z=i/8*Math.PI*2;petal.visible=false;joints.parasiteFace.add(petal);petals.push(petal);}for(let i=0;i<4;i++){const arm=capsule('hero:successor:hidden-arm',0.045,0.48,materials.skin);arm.rotation.z=-0.9+i*0.6;arm.visible=false;joints.extraArms.add(arm);}
  const cracks=makeCrackMark(materials.dark);cracks.visible=false;cracks.name='hero-damage:stage1-show:mask-cracks';joints.mask.add(cracks);
  return {joints,secondary:{coatL:joints.coatL,coatR:joints.coatR,shadow:joints.shadow,extraArms:joints.extraArms},secondaryMotionConfig:[{id:'successor-coat',mode:'veil-chain',joints:['coatL','coatR','shadow'],amplitude:0.05,frequency:1.1,stiffness:24,damping:8}],damageParts:{stage1Hide:[],stage2Hide:[mask],stage1Show:[cracks],stage2Show:[...petals,...joints.extraArms.children]},skillParts:{mask:joints.mask,parasiteFace:joints.parasiteFace,extraArms:joints.extraArms,seal:joints.seal,shadow:joints.shadow}};
}

function buildSleepingGardener(model, definition, materials) {
  const specs={motionRoot:{parent:null,position:[0,0,0]},trunk:{parent:'motionRoot',position:[0,1.05,0]},crown:{parent:'trunk',position:[0,0.82,0]},gardenBed:{parent:'trunk',position:[0,0.42,-0.46]},armL:{parent:'trunk',position:[-0.52,0.25,0]},hookL:{parent:'armL',position:[-0.38,-0.3,0]},armR:{parent:'trunk',position:[0.52,0.25,0]},hookR:{parent:'armR',position:[0.38,-0.3,0]},placard:{parent:'trunk',position:[0,0.1,0.42]},nest:{parent:'crown',position:[0.28,0.2,-0.05]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}};for(let i=0;i<4;i++){const a=-Math.PI/2+i*Math.PI/2;specs[`rootLeg${i}`]={parent:'trunk',position:[Math.cos(a)*0.35,-0.58,Math.sin(a)*0.35]};specs[`rootFoot${i}`]={parent:`rootLeg${i}`,position:[Math.cos(a)*0.38,-0.5,Math.sin(a)*0.38]};}
  const joints=buildHierarchy(model,specs);const trunk=cylinder('hero:gardener:trunk',0.45,1.55,materials.leather);trunk.scale.set(1.1,1,0.9);joints.trunk.add(trunk);for(let i=0;i<8;i++){const bark=box('hero:gardener:bark',[0.12,0.85,0.05],materials.dark);bark.rotation.z=-0.25+i*0.07;bark.position.set(Math.cos(i/8*Math.PI*2)*0.4,(i%3-1)*0.18,Math.sin(i/8*Math.PI*2)*0.32);joints.trunk.add(bark);}
  for(let i=0;i<4;i++){const root=cylinder('hero:gardener:root-leg',0.1,0.78,materials.leather,true);joints[`rootLeg${i}`].add(root);const foot=cone('hero:gardener:root-foot',0.14,0.62,materials.dark);foot.rotation.z=i%2?Math.PI/2:-Math.PI/2;joints[`rootFoot${i}`].add(foot);}
  for(const side of ['L','R']){const branch=cylinder('hero:gardener:branch-arm',0.1,0.9,materials.leather,true);joints[`arm${side}`].add(branch);const hook=torus('hero:gardener:pruning-hook',0.24,0.045,materials.metal);hook.rotation.x=Math.PI/2;joints[`hook${side}`].add(hook);}
  const bed=box('hero:gardener:soil-bed',[1.0,0.22,0.72],materials.dark);joints.gardenBed.add(bed);for(let i=0;i<14;i++){const stem=cylinder('hero:gardener:plant-stem',0.018,0.28+(i%3)*0.08,materials.skin);stem.position.set(-0.42+(i%7)*0.14,0.22,(-0.2+Math.floor(i/7)*0.32));joints.gardenBed.add(stem);const flower=dome('hero:gardener:flower',0.07+(i%2)*0.025,i%3===0?materials.accent:i%3===1?materials.spore:materials.clothInner);flower.position.set(stem.position.x,0.42+(i%3)*0.08,stem.position.z);joints.gardenBed.add(flower);}
  const crown=openCone('hero:gardener:tree-crown',0.72,0.95,10,materials.cloth);crown.position.y=0.18;joints.crown.add(crown);const nest=torus('hero:gardener:nest',0.18,0.05,materials.leather);nest.rotation.x=Math.PI/2;joints.nest.add(nest);for(let i=0;i<3;i++){const egg=sphere('hero:gardener:nest-egg',0.045,materials.clothInner);egg.position.set((i-1)*0.07,0.04,0);joints.nest.add(egg);}const placard=box('hero:gardener:royal-placard',[0.45,0.28,0.04],materials.brass);joints.placard.add(placard);
  const withered=openCone('hero:gardener:withered-crown',0.62,0.82,8,materials.dark);withered.visible=false;withered.name='hero-damage:stage2-show:withered';joints.crown.add(withered);
  return {joints,secondary:{gardenBed:joints.gardenBed,crown:joints.crown,armL:joints.armL,armR:joints.armR,nest:joints.nest},secondaryMotionConfig:[{id:'gardener-garden',mode:'root-tendrils',joints:['gardenBed','crown','nest'],amplitude:0.035,frequency:0.7,stiffness:25,damping:9}],damageParts:{stage1Hide:joints.gardenBed.children.filter((_,i)=>i%4===0),stage2Hide:[crown],stage1Show:[],stage2Show:[withered]},skillParts:{hookL:joints.hookL,hookR:joints.hookR,gardenBed:joints.gardenBed,crown:joints.crown,placard:joints.placard}};
}

function buildGoldcrownBack(model, definition, materials) {
  const specs={motionRoot:{parent:null,position:[0,0,0]},body0:{parent:'motionRoot',position:[0,0.5,0.55]},body1:{parent:'body0',position:[0,0,-0.45]},body2:{parent:'body1',position:[0,0,-0.45]},body3:{parent:'body2',position:[0,0,-0.45]},head:{parent:'body0',position:[0,0.08,0.48]},crown:{parent:'head',position:[0,0.5,0]},rakeL:{parent:'head',position:[-0.2,-0.05,0.35]},rakeR:{parent:'head',position:[0.2,-0.05,0.35]},carapace:{parent:'body1',position:[0,0.35,-0.15]},trophies:{parent:'carapace',position:[0,0.25,0]},glow:{parent:'body2',position:[0,-0.28,0]},baseFx:{parent:'motionRoot',position:[0,0.02,0]}};for(let i=0;i<10;i++){const segment=Math.floor(i/3),side=i%2?-1:1;specs[`leg${i}`]={parent:`body${Math.min(3,segment)}`,position:[side*0.32,-0.12,0.18-(i%3)*0.18]};}
  const joints=buildHierarchy(model,specs);for(let i=0;i<4;i++){const body=sphere('hero:goldcrown:body-segment',0.38-(i*.02),materials.skin);body.scale.set(1.05,0.62,1.15);joints[`body${i}`].add(body);}for(let i=0;i<10;i++){const leg=cylinder('hero:goldcrown:leg',0.055,0.62,materials.dark,true);leg.rotation.z=(i%2?-1:1)*0.9;joints[`leg${i}`].add(leg);const claw=cone('hero:goldcrown:leg-claw',0.045,0.24,materials.bone);claw.position.y=-0.35;joints[`leg${i}`].add(claw);}
  const head=box('hero:goldcrown:rake-head',[0.58,0.42,0.56],materials.dark);joints.head.add(head);for(const joint of [joints.rakeL,joints.rakeR]){for(let i=0;i<4;i++){const tine=cone('hero:goldcrown:bone-rake',0.055,0.48,materials.bone);tine.rotation.x=Math.PI/2;tine.position.set((i-1.5)*0.08,0,0);joint.add(tine);}}
  const crown=torus('hero:goldcrown:clean-crown',0.28,0.055,materials.brass);crown.rotation.x=Math.PI/2;joints.crown.add(crown);for(let i=0;i<6;i++){const spike=cone('hero:goldcrown:crown-spike',0.045,0.3,materials.brass);const a=i/6*Math.PI*2;spike.position.set(Math.cos(a)*0.24,0.14,Math.sin(a)*0.24);joints.crown.add(spike);}
  for(let i=0;i<10;i++){const plate=box('hero:goldcrown:trophy-plate',[0.22+(i%3)*0.08,0.32+(i%2)*0.12,0.08],i%2?materials.metal:materials.brass);plate.position.set(-0.5+(i%5)*0.25,Math.floor(i/5)*0.28,(-0.18+Math.floor(i/5)*0.28));plate.rotation.z=-0.25+i*0.07;plate.name=`hero-part:goldcrown-trophy-${i}`;joints.trophies.add(plate);}for(let i=0;i<4;i++){const goblet=cylinder('hero:goldcrown:goblet',0.08,0.18,materials.brass);goblet.position.set(-0.35+i*0.23,0.42+(i%2)*0.12,0);joints.trophies.add(goblet);}
  const glow=sphere('hero:goldcrown:underside-glow',0.34,materials.ember);glow.scale.set(1.2,0.35,1.6);joints.glow.add(glow);const exposed=sphere('hero:goldcrown:exposed-molt',0.42,materials.spore);exposed.visible=false;exposed.name='hero-damage:stage2-show:exposed-molt';joints.body1.add(exposed);
  return {joints,secondary:{crown:joints.crown,carapace:joints.carapace,trophies:joints.trophies,body1:joints.body1,body2:joints.body2,body3:joints.body3},secondaryMotionConfig:[{id:'goldcrown-body',mode:'root-tendrils',joints:['body1','body2','body3'],amplitude:0.05,frequency:1.1,stiffness:26,damping:9},{id:'goldcrown-trophies',mode:'artifact-float',joints:['trophies','crown'],amplitude:0.025,frequency:1.4,stiffness:32,damping:11}],damageParts:{stage1Hide:joints.trophies.children.filter((_,i)=>i%3===0),stage2Hide:joints.trophies.children.filter((_,i)=>i%2===1),stage1Show:[],stage2Show:[exposed]},skillParts:{rakeL:joints.rakeL,rakeR:joints.rakeR,trophies:joints.trophies,carapace:joints.carapace,crown:joints.crown}};
}

function createHeroSummonMiniature(agent) {
  const root=new THREE.Group();root.name=`hero-summon:${agent.heroSummonKind}`;root.userData.agentId=agent.id;root.userData.heroSummonKind=agent.heroSummonKind;root.userData.isHeroSummon=true;
  const model=new THREE.Group();model.name='hero-summon-model';root.add(model);
  const bone=materialFor('hero-summon:bone',0xd5cfb8,{roughness:0.62});const metal=materialFor('hero-summon:metal',0x53616b,{metalness:0.28,roughness:0.48});const spectral=materialFor('hero-summon:spectral',0xa9e3ff,{transparent:true,opacity:0.5,emissive:0xa9e3ff,emissiveIntensity:0.28,depthWrite:false});const ghast=materialFor('hero-summon:ghast',0x7f856f,{roughness:0.68});const dark=materialFor('hero-summon:dark',0x17191b,{roughness:0.8});
  const joints=buildHierarchy(model,{motionRoot:{parent:null,position:[0,0,0]},body:{parent:'motionRoot',position:[0,0.72,0]},head:{parent:'body',position:[0,0.58,0]},armL:{parent:'body',position:[-0.32,0.14,0]},armR:{parent:'body',position:[0.32,0.14,0]},legL:{parent:'body',position:[-0.14,-0.42,0]},legR:{parent:'body',position:[0.14,-0.42,0]},accent:{parent:'body',position:[0,0.12,0.18]}});
  if(agent.heroSummonKind==='spiderling'||agent.heroSummonKind==='royal-spiderling'){
    joints.body.position.y=0.34;const abdomen=sphere('hero-summon:spider-abdomen',0.26,agent.heroSummonKind==='royal-spiderling'?spectral:dark);abdomen.scale.set(1,0.72,1.25);joints.body.add(abdomen);const thorax=sphere('hero-summon:spider-thorax',0.2,ghast);thorax.position.z=0.28;joints.body.add(thorax);for(let i=0;i<8;i++){const side=i<4?-1:1,index=i%4;const leg=cylinder('hero-summon:spider-leg',0.025,0.48,ghast,true);leg.position.set(side*(0.28+index*.03),-0.05,0.28-index*.18);leg.rotation.z=side*(0.55+index*.12);joints.body.add(leg);}const eyes=[];for(let i=0;i<4;i++){const eye=sphere('hero-summon:spider-eye',0.025,spectral);eye.position.set((i-1.5)*0.045,0.06,0.45);joints.body.add(eye);eyes.push(eye);}
  }else if(agent.heroSummonKind==='parasite-echo'){
    const shell=capsule('hero-summon:parasite-shell',0.2,0.58,ghast);joints.body.add(shell);const bloom=openCone('hero-summon:parasite-bloom',0.28,0.52,8,spectral);bloom.position.y=0.18;joints.head.add(bloom);for(const side of ['L','R']){add(joints[`arm${side}`],capsule('hero-summon:parasite-arm',0.055,0.48,ghast));add(joints[`leg${side}`],capsule('hero-summon:parasite-leg',0.055,0.5,ghast));}for(let i=0;i<4;i++){const tendril=capsule('hero-summon:parasite-tendril',0.025,0.36,spectral);tendril.rotation.z=-0.75+i*0.5;joints.accent.add(tendril);}
  }else if(agent.heroSummonKind==='ghoul'){
    const torso=capsule('hero-summon:ghoul-torso',0.22,0.46,ghast);torso.rotation.x=0.3;joints.body.add(torso);const head=sphere('hero-summon:ghoul-head',0.22,ghast);head.position.z=0.18;joints.head.add(head);for(const side of ['L','R']){add(joints[`arm${side}`],capsule('hero-summon:ghoul-arm',0.065,0.56,ghast));add(joints[`leg${side}`],capsule('hero-summon:ghoul-leg',0.07,0.48,ghast));const claw=makeClawHand(ghast,bone);joints[`arm${side}`].add(claw);}const jaw=box('hero-summon:ghoul-jaw',[0.28,0.12,0.2],dark);jaw.position.set(0,-0.16,0.15);joints.head.add(jaw);
  }else if(agent.heroSummonKind==='spectral-guard'){
    const armor=box('hero-summon:spectral-armor',[0.5,0.7,0.32],metal);joints.body.add(armor);const helm=dome('hero-summon:spectral-helm',0.28,metal);joints.head.add(helm);const core=sphere('hero-summon:spectral-core',0.13,spectral);joints.accent.add(core);for(const side of ['L','R']){add(joints[`arm${side}`],capsule('hero-summon:spectral-arm',0.07,0.45,spectral));add(joints[`leg${side}`],capsule('hero-summon:spectral-leg',0.07,0.5,spectral));}
  }else{
    const spine=cylinder('hero-summon:skeleton-spine',0.04,0.58,bone);joints.body.add(spine);for(let i=0;i<4;i++){const rib=torus('hero-summon:skeleton-rib',0.18,0.018,bone);rib.rotation.z=Math.PI/2;rib.position.y=-0.14+i*0.08;joints.body.add(rib);}const skull=sphere('hero-summon:skeleton-skull',0.21,bone);joints.head.add(skull);for(const side of ['L','R']){add(joints[`arm${side}`],cylinder('hero-summon:skeleton-arm',0.035,0.48,bone));add(joints[`leg${side}`],cylinder('hero-summon:skeleton-leg',0.04,0.56,bone));}const plate=box('hero-summon:royal-plate',[0.44,0.46,0.2],metal);joints.body.add(plate);
  }
  const ring=new THREE.Mesh(geo(`hero-summon:ring:${agent.heroSummonKind}`,()=>new THREE.TorusGeometry(0.36,0.025,6,24)),new THREE.MeshBasicMaterial({color:agent.heroSummonKind==='ghoul'?0x9fc784:agent.heroSummonKind?.includes('spiderling')?0xd5a7bd:agent.heroSummonKind==='parasite-echo'?0xe7e0f2:0xa9e3ff,transparent:true,opacity:0.55}));ring.rotation.x=Math.PI/2;ring.position.y=-0.28;root.add(ring);root.userData.joints=joints;root.userData.heroMeshCount=countMeshes(root);root.traverse(node=>{node.userData.agentId=agent.id;node.userData.heroSummonKind=agent.heroSummonKind;});return root;
}

function makeRoyalSword(metal, brass, accent){const group=new THREE.Group();const blade=box('hero:aldren:sword-blade',[0.12,1.15,0.06],metal);blade.position.y=0.52;const point=cone('hero:aldren:sword-point',0.085,0.22,metal);point.position.y=1.18;const guard=box('hero:aldren:sword-guard',[0.48,0.08,0.08],brass);const gem=sphere('hero:aldren:sword-gem',0.06,accent);gem.position.y=-0.08;group.add(blade,point,guard,gem);return group;}
function makeClawHand(skin,bone){const group=new THREE.Group();const palm=sphere('hero:malcor:claw-palm',0.1,skin);group.add(palm);for(let i=0;i<4;i++){const finger=capsule('hero:malcor:claw-finger',0.025,0.22,skin);finger.position.set((i-1.5)*0.05,-0.13,0.03);finger.rotation.z=(i-1.5)*0.08;const claw=cone('hero:malcor:claw-tip',0.022,0.12,bone);claw.position.y=-0.3;finger.add(claw);group.add(finger);}return group;}
function makeExecutionSword(metal,dark,accent){const group=new THREE.Group();const blade=box('hero:arvek:execution-blade',[0.22,1.35,0.09],metal);blade.position.y=0.58;const tip=cone('hero:arvek:execution-tip',0.15,0.28,metal);tip.position.y=1.38;const guard=box('hero:arvek:execution-guard',[0.62,0.12,0.13],dark);const rune=box('hero:arvek:execution-rune',[0.05,0.72,0.02],accent);rune.position.set(0,0.62,0.06);group.add(blade,tip,guard,rune);return group;}
function makeCrackMark(material){const group=new THREE.Group();for(let i=0;i<4;i++){const line=box('hero:crack-line',[0.025,0.34-i*0.04,0.02],material);line.rotation.z=-0.45+i*0.3;line.position.set((i-1.5)*0.06,0.08,0.16);group.add(line);}return group;}

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
  result.steam = materialFor(`${definition.id}:steam`, 0xd7d9d3, { roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false });
  result.water = materialFor(`${definition.id}:water`, 0x75d4e5, { roughness: 0.06, transparent: true, opacity: 0.46, depthWrite: false });
  result.ember = materialFor(`${definition.id}:ember`, 0xff713d, { roughness: 0.28, emissive: 0xff4b21, emissiveIntensity: 0.24 });
  result.broth = materialFor(`${definition.id}:broth`, 0x883c2e, { roughness: 0.2, transparent: true, opacity: 0.82, depthWrite: false });
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

function makeSegmentedHose(dark, brass, segments) {
  const group = new THREE.Group();
  group.name = 'hero-part:pressure-hose';
  for (let i = 0; i < segments; i += 1) {
    const segment = torus('hero:tissa:hose-segment', 0.075, 0.018, i % 2 ? brass : dark);
    segment.rotation.x = Math.PI / 2;
    segment.position.set(0, -i * 0.085, i * 0.035);
    segment.rotation.z = i * 0.18;
    group.add(segment);
  }
  return group;
}

function makeValveWrench(metal, brass) {
  const group = new THREE.Group();
  group.name = 'hero-part:valve-wrench';
  const handle = cylinder('hero:tissa:wrench-handle', 0.035, 0.72, metal);
  handle.position.y = 0.18;
  const wheel = torus('hero:tissa:wrench-wheel', 0.18, 0.035, brass);
  wheel.position.y = 0.56;
  wheel.rotation.x = Math.PI / 2;
  group.add(handle, wheel);
  for (let i = 0; i < 4; i += 1) {
    const spoke = box('hero:tissa:wrench-spoke', [0.3, 0.025, 0.025], brass);
    spoke.position.y = 0.56;
    spoke.rotation.z = i * Math.PI / 4;
    group.add(spoke);
  }
  return group;
}

function makeHarpoon(metal, leather) {
  const group = new THREE.Group();
  group.name = 'hero-part:short-harpoon';
  const shaft = cylinder('hero:tissa:harpoon-shaft', 0.028, 0.86, leather);
  shaft.position.y = 0.16;
  const head = cone('hero:tissa:harpoon-head', 0.09, 0.28, metal);
  head.position.y = 0.72;
  const barbL = box('hero:tissa:harpoon-barb', [0.04, 0.18, 0.04], metal);
  barbL.position.set(-0.07, 0.62, 0);
  barbL.rotation.z = -0.55;
  const barbR = box('hero:tissa:harpoon-barb', [0.04, 0.18, 0.04], metal);
  barbR.position.set(0.07, 0.62, 0);
  barbR.rotation.z = 0.55;
  group.add(shaft, head, barbL, barbR);
  return group;
}

function makeBubbleCluster(material, count) {
  const group = new THREE.Group();
  group.name = 'hero-part:bubble-cluster';
  for (let i = 0; i < count; i += 1) {
    const bubble = sphere('hero:tissa:bubble', 0.05 + (i % 3) * 0.018, material);
    bubble.position.set((i % 2 ? 1 : -1) * (0.05 + (i % 3) * 0.025), 0.12 + i * 0.08, (i % 3 - 1) * 0.04);
    group.add(bubble);
  }
  return group;
}

function makeButcherHook(metal, leather) {
  const group = new THREE.Group();
  group.name = 'hero-part:long-butcher-hook';
  const handle = cylinder('hero:murga:hook-handle', 0.045, 0.72, leather);
  handle.position.y = 0.1;
  const curve = torus('hero:murga:hook-curve', 0.22, 0.045, metal);
  curve.rotation.x = Math.PI / 2;
  curve.rotation.z = Math.PI * 0.25;
  curve.position.set(0.13, 0.54, 0);
  const point = cone('hero:murga:hook-point', 0.055, 0.28, metal);
  point.position.set(0.31, 0.46, 0);
  point.rotation.z = -0.8;
  group.add(handle, curve, point);
  return group;
}

function makeChain(material, count, spacing) {
  const group = new THREE.Group();
  group.name = 'hero-part:chain';
  for (let i = 0; i < count; i += 1) {
    const link = torus('hero:murga:chain-link', 0.055, 0.014, material);
    link.rotation.x = i % 2 ? Math.PI / 2 : 0;
    link.position.y = -i * spacing;
    group.add(link);
  }
  return group;
}

function makeWarCleaver(metal, leather, accent) {
  const group = new THREE.Group();
  group.name = 'hero-part:broad-war-cleaver';
  const handle = cylinder('hero:murga:cleaver-handle', 0.05, 0.58, leather);
  handle.position.y = 0.04;
  const blade = box('hero:murga:cleaver-blade', [0.42, 0.68, 0.09], metal);
  blade.position.set(0.12, 0.52, 0);
  blade.rotation.z = -0.08;
  const edge = box('hero:murga:cleaver-edge', [0.05, 0.64, 0.1], accent);
  edge.position.set(0.34, 0.52, 0);
  const hole = torus('hero:murga:cleaver-hole', 0.08, 0.015, leather);
  hole.position.set(-0.02, 0.7, 0.06);
  hole.rotation.x = Math.PI / 2;
  group.add(handle, blade, edge, hole);
  return group;
}

function makeBrokenSpoon(material, index) {
  const group = new THREE.Group();
  group.name = `hero-part:broken-spoon-${index}`;
  const handle = box('hero:murga:spoon-handle', [0.025, 0.22, 0.018], material);
  handle.position.y = -0.08;
  const bowl = sphere('hero:murga:spoon-bowl', 0.045, material);
  bowl.scale.set(0.7, 1.1, 0.35);
  bowl.position.y = 0.05;
  group.add(handle, bowl);
  group.scale.setScalar(0.85 + (index % 3) * 0.08);
  return group;
}

function makeBrothSpill(material) {
  const group = new THREE.Group();
  group.name = 'hero-part:broth-spill';
  for (let i = 0; i < 5; i += 1) {
    const drop = sphere('hero:murga:broth-drop', 0.06 + i * 0.01, material);
    drop.position.set((i % 2 ? 1 : -1) * (0.08 + i * 0.03), -0.05 - i * 0.08, (i % 3 - 1) * 0.05);
    group.add(drop);
  }
  return group;
}

function countMeshes(root) {
  let count = 0;
  root.traverse(node => { if (node.isMesh || node.geometry) count += 1; });
  return count;
}
