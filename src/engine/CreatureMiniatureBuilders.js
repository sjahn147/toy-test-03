import { THREE } from './ThreeScene.js';

export function buildSlime(factory, model, agent, recipe) {
  const skin = factory.material(recipe, 'skin', { transparent: true, opacity: 0.66, roughness: 0.14 });
  const inner = factory.material(recipe, 'accent', { transparent: true, opacity: 0.34, roughness: 0.18 });
  const coreMaterial = factory.material(recipe, 'dark', { roughness: 0.2, emissive: true });
  const body = new THREE.Group();
  body.name = 'slime_body';
  model.add(body);
  const lobes = [[0,0.42,0,0.68,0.52,0.62],[-0.31,0.29,0.05,0.38,0.31,0.35],[0.29,0.32,-0.08,0.34,0.38,0.31],[0.05,0.67,0.02,0.31,0.35,0.29]];
  lobes.forEach(([x,y,z,sx,sy,sz], index) => {
    const lobe = factory.mesh(`polish:slime-lobe:${index}`, () => new THREE.SphereGeometry(0.62, 18, 12), index === 0 ? skin : inner);
    lobe.name = `slime_lobe_${index}`;
    lobe.position.set(x, y, z);
    lobe.scale.set(sx, sy, sz);
    body.add(lobe);
  });
  const skirt = factory.mesh('polish:slime-skirt', () => new THREE.TorusGeometry(0.52, 0.16, 8, 22), skin);
  skirt.name = 'slime_skirt';
  skirt.rotation.x = Math.PI / 2;
  skirt.position.y = 0.14;
  body.add(skirt);
  const core = factory.mesh('polish:slime-core', () => new THREE.IcosahedronGeometry(0.16, 1), coreMaterial);
  core.name = 'part:slime-core';
  core.position.set(0.1, 0.5, 0.08);
  body.add(core);
  for (let index = 0; index < 5; index += 1) {
    const bubble = factory.mesh(`polish:slime-bubble:${index}`, () => new THREE.SphereGeometry(0.075 + index * 0.006, 9, 7), inner);
    bubble.name = `slime_bubble_${index}`;
    const seed = hash01(`${agent.id ?? agent.name}:${index}`);
    bubble.position.set((seed - 0.5) * 0.74, 0.28 + hash01(`${seed}:y`) * 0.55, (hash01(`${seed}:z`) - 0.5) * 0.48);
    body.add(bubble);
  }
  return { body, core, skirt };
}

export function buildMimic(factory, model, recipe) {
  const wood = factory.material(recipe, 'leather', { roughness: 0.78 });
  const iron = factory.material(recipe, 'metal', { metalness: 0.24, roughness: 0.42 });
  const flesh = new THREE.MeshStandardMaterial({ color: 0x8f3150, roughness: 0.68 });
  const tooth = factory.material(recipe, 'accent', { roughness: 0.7 });
  const body = new THREE.Group();
  body.name = 'mimic_body';
  model.add(body);
  const chest = factory.mesh('polish:mimic-chest', () => new THREE.BoxGeometry(1.05, 0.62, 0.78, 2, 2, 2), wood);
  chest.position.y = 0.43;
  body.add(chest);
  for (const x of [-0.42, 0.42]) {
    const band = factory.mesh('polish:mimic-band', () => new THREE.BoxGeometry(0.1, 0.67, 0.82), iron);
    band.position.set(x, 0.44, 0);
    body.add(band);
  }
  const lidPivot = new THREE.Group();
  lidPivot.name = 'mimic_lid_pivot';
  lidPivot.position.set(0, 0.72, -0.33);
  body.add(lidPivot);
  const lid = factory.mesh('polish:mimic-lid', () => new THREE.BoxGeometry(1.08, 0.22, 0.82, 2, 1, 2), wood);
  lid.name = 'part:mimic-lid';
  lid.position.set(0, 0.1, 0.33);
  lidPivot.add(lid);
  const gum = factory.mesh('polish:mimic-gum', () => new THREE.BoxGeometry(0.86, 0.12, 0.12), flesh);
  gum.position.set(0, -0.02, 0.73);
  lidPivot.add(gum);
  const jaw = new THREE.Group();
  jaw.name = 'mimic_jaw';
  jaw.position.set(0, 0.66, 0.36);
  body.add(jaw);
  const tongue = factory.mesh('polish:mimic-tongue', () => new THREE.CapsuleGeometry(0.09, 0.62, 4, 9), flesh);
  tongue.name = 'mimic_tongue';
  tongue.rotation.x = Math.PI / 2;
  tongue.position.set(0.06, -0.12, 0.28);
  jaw.add(tongue);
  for (const row of [-1, 1]) for (let i = -3; i <= 3; i += 1) {
    const fang = factory.mesh('polish:mimic-fang', () => new THREE.ConeGeometry(0.055, 0.2, 6), tooth);
    fang.position.set(i * 0.12, row * 0.06, row > 0 ? 0.18 : 0.08);
    fang.rotation.x = row > 0 ? Math.PI : 0;
    jaw.add(fang);
  }
  const legs = [];
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = `mimic_leg_${side}_${front}`;
    leg.position.set(side * 0.42, 0.22, front * 0.28);
    const upper = factory.mesh('polish:mimic-leg', () => new THREE.CapsuleGeometry(0.07, 0.3, 3, 7), flesh);
    upper.rotation.z = side * 0.7;
    upper.rotation.x = front * 0.35;
    leg.add(upper);
    body.add(leg);
    legs.push(leg);
  }
  return { body, lidPivot, jaw, tongue, legs };
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return ((result >>> 0) % 10000) / 10000;
}
