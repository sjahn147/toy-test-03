import { THREE } from './ThreeScene.js';

export function buildSpider(factory, model, recipe) {
  const skin = factory.material(recipe, 'skin', { roughness: 0.82 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.9 });
  const accent = factory.material(recipe, 'accent', { roughness: 0.62 });
  const root = new THREE.Group(); root.name = 'spider_root'; model.add(root);
  const abdomen = factory.mesh('polish:spider-abdomen', () => new THREE.SphereGeometry(0.48, 16, 10), skin);
  abdomen.scale.set(1.08, 0.72, 1.2); abdomen.position.set(0, 0.42, -0.28); root.add(abdomen);
  const thorax = factory.mesh('polish:spider-thorax', () => new THREE.SphereGeometry(0.34, 14, 9), dark);
  thorax.scale.set(1.0, 0.72, 0.92); thorax.position.set(0, 0.4, 0.2); root.add(thorax);
  const head = factory.mesh('polish:spider-head', () => new THREE.SphereGeometry(0.24, 12, 8), dark);
  head.position.set(0, 0.4, 0.48); root.add(head);
  for (const side of [-1, 1]) for (const row of [-1, 1]) {
    const eye = factory.mesh('polish:spider-eye', () => new THREE.SphereGeometry(0.035, 7, 5), accent);
    eye.position.set(side * 0.08, 0.46 + row * 0.045, 0.68); root.add(eye);
  }
  const fangs = [];
  for (const side of [-1, 1]) {
    const fang = new THREE.Group(); fang.name = `spider_fang_${side < 0 ? 'L' : 'R'}`; fang.position.set(side * 0.09, 0.32, 0.66);
    const mesh = factory.mesh('polish:spider-fang', () => new THREE.ConeGeometry(0.045, 0.28, 6), accent);
    mesh.rotation.x = Math.PI / 2; mesh.rotation.z = side * 0.2; fang.add(mesh); root.add(fang); fangs.push(fang);
  }
  const legs = [];
  for (const side of [-1, 1]) for (let index = 0; index < 4; index += 1) {
    const hip = new THREE.Group(); hip.name = `spider_hip_${side}_${index}`; hip.position.set(side * 0.25, 0.38, 0.32 - index * 0.2); root.add(hip);
    const upper = factory.mesh('polish:spider-upper-leg', () => new THREE.CapsuleGeometry(0.045, 0.42, 3, 7), skin);
    upper.position.y = -0.18; upper.rotation.z = side * (0.8 + index * 0.06); upper.rotation.x = (index - 1.5) * 0.12; hip.add(upper);
    const knee = new THREE.Group(); knee.position.set(side * 0.32, -0.24, 0); hip.add(knee);
    const lower = factory.mesh('polish:spider-lower-leg', () => new THREE.CapsuleGeometry(0.035, 0.5, 3, 7), dark);
    lower.position.y = -0.22; lower.rotation.z = side * -0.52; knee.add(lower);
    legs.push({ hip, knee, side, index });
  }
  return { type: 'arachnid', root, abdomen, thorax, head, fangs, legs };
}

export function buildWraith(factory, model, recipe) {
  const veil = factory.material(recipe, 'cloth', { transparent: true, opacity: 0.52, roughness: 0.3, emissive: true });
  const glow = factory.material(recipe, 'accent', { transparent: true, opacity: 0.82, emissive: true, roughness: 0.1 });
  const root = new THREE.Group(); root.name = 'wraith_root'; model.add(root);
  const torso = factory.mesh('polish:wraith-torso', () => new THREE.ConeGeometry(0.42, 1.25, 12, 1, true), veil);
  torso.position.y = 0.8; root.add(torso);
  const hood = factory.mesh('polish:wraith-hood', () => new THREE.SphereGeometry(0.31, 14, 9), veil);
  hood.position.y = 1.45; hood.scale.set(1, 1.12, 0.9); root.add(hood);
  const face = factory.mesh('polish:wraith-face', () => new THREE.SphereGeometry(0.16, 10, 7), glow);
  face.position.set(0, 1.42, 0.2); face.scale.set(0.72, 1, 0.45); root.add(face);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = `wraith_arm_${side < 0 ? 'L' : 'R'}`; arm.position.set(side * 0.28, 1.12, 0); root.add(arm);
    const sleeve = factory.mesh('polish:wraith-sleeve', () => new THREE.ConeGeometry(0.16, 0.82, 9, 1, true), veil);
    sleeve.position.y = -0.28; sleeve.rotation.z = side * 0.48; arm.add(sleeve);
    const claw = factory.mesh('polish:wraith-claw', () => new THREE.ConeGeometry(0.08, 0.34, 6), glow);
    claw.position.set(side * 0.26, -0.56, 0.08); claw.rotation.z = side * -0.35; arm.add(claw); arms.push(arm);
  }
  const tatters = [];
  for (let i = 0; i < 5; i += 1) {
    const tatter = factory.mesh('polish:wraith-tatter', () => new THREE.ConeGeometry(0.12, 0.72, 6, 1, true), veil);
    tatter.position.set((i - 2) * 0.13, 0.12, (i % 2 ? 0.08 : -0.08)); tatter.rotation.z = (i - 2) * 0.08; root.add(tatter); tatters.push(tatter);
  }
  return { type: 'spectral', root, torso, hood, face, arms, tatters };
}

export function buildMyconid(factory, model, recipe) {
  const skin = factory.material(recipe, 'skin', { roughness: 0.88 });
  const cloth = factory.material(recipe, 'cloth', { roughness: 0.92 });
  const accent = factory.material(recipe, 'accent', { roughness: 0.76 });
  const root = new THREE.Group(); root.name = 'myconid_root'; model.add(root);
  const stem = factory.mesh('polish:myconid-stem', () => new THREE.CapsuleGeometry(0.25, 0.75, 5, 10), skin);
  stem.position.y = 0.72; stem.scale.set(0.9, 1, 0.82); root.add(stem);
  const cap = new THREE.Group(); cap.name = 'myconid_cap'; cap.position.y = 1.45; root.add(cap);
  const capMesh = factory.mesh('polish:myconid-cap', () => new THREE.SphereGeometry(0.48, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), cloth);
  capMesh.scale.set(1.12, 0.62, 1.0); cap.add(capMesh);
  const gills = factory.mesh('polish:myconid-gills', () => new THREE.CylinderGeometry(0.34, 0.2, 0.12, 14), accent);
  gills.position.y = -0.04; cap.add(gills);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = `myconid_arm_${side < 0 ? 'L' : 'R'}`; arm.position.set(side * 0.26, 0.98 + side * 0.04, 0); root.add(arm);
    const limb = factory.mesh('polish:myconid-arm', () => new THREE.CapsuleGeometry(0.075, 0.5, 4, 8), skin);
    limb.position.y = -0.22; limb.rotation.z = side * 0.38; arm.add(limb); arms.push(arm);
  }
  const sprouts = [];
  for (let i = 0; i < 4; i += 1) {
    const sprout = new THREE.Group(); sprout.name = `myconid_sprout_${i}`; sprout.position.set((i - 1.5) * 0.13, 1.32 + (i % 2) * 0.08, i % 2 ? 0.13 : -0.12); root.add(sprout);
    const stalk = factory.mesh('polish:myconid-sprout-stalk', () => new THREE.CylinderGeometry(0.025, 0.035, 0.22, 7), skin); stalk.position.y = 0.1; sprout.add(stalk);
    const bud = factory.mesh('polish:myconid-sprout-bud', () => new THREE.SphereGeometry(0.07, 8, 6), accent); bud.position.y = 0.22; sprout.add(bud); sprouts.push(sprout);
  }
  const sporeSac = factory.mesh('polish:myconid-spore-sac', () => new THREE.SphereGeometry(0.18, 10, 7), accent);
  sporeSac.position.set(0.2, 0.78, -0.18); sporeSac.scale.set(0.8, 1.18, 0.72); root.add(sporeSac);
  return { type: 'fungal', root, stem, cap, arms, sprouts, sporeSac };
}

export function buildStirge(factory, model, recipe) {
  const skin = factory.material(recipe, 'skin', { roughness: 0.72 });
  const wingMaterial = factory.material(recipe, 'accent', { transparent: true, opacity: 0.52, roughness: 0.24 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.9 });
  const root = new THREE.Group(); root.name = 'stirge_root'; model.add(root);
  const body = factory.mesh('polish:stirge-body', () => new THREE.SphereGeometry(0.26, 12, 8), skin);
  body.scale.set(0.72, 1.12, 0.66); body.position.y = 0.72; root.add(body);
  const head = factory.mesh('polish:stirge-head', () => new THREE.SphereGeometry(0.18, 10, 7), dark);
  head.position.set(0, 0.86, 0.24); root.add(head);
  const proboscis = factory.mesh('polish:stirge-proboscis', () => new THREE.ConeGeometry(0.035, 0.52, 7), skin);
  proboscis.position.set(0, 0.82, 0.5); proboscis.rotation.x = Math.PI / 2; root.add(proboscis);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.name = `stirge_wing_${side < 0 ? 'L' : 'R'}`; wing.position.set(side * 0.18, 0.78, 0); root.add(wing);
    const membrane = factory.mesh('polish:stirge-wing', () => new THREE.CircleGeometry(0.42, 12, 0, Math.PI), wingMaterial);
    membrane.scale.set(1.4, 0.72, 1); membrane.rotation.y = side * Math.PI / 2; membrane.rotation.z = side * 0.28; wing.add(membrane); wings.push(wing);
  }
  return { type: 'flying', root, body, head, proboscis, wings };
}
