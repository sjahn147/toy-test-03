import { THREE } from './ThreeScene.js';

export function decorateOrc(factory, rig, recipe, variation) {
  const skin = factory.material(recipe, 'skin', { roughness: 0.76 });
  const metal = factory.material(recipe, 'metal', { metalness: 0.3, roughness: 0.45 });
  const dark = factory.material(recipe, 'dark', { roughness: 0.9 });

  const jaw = factory.mesh('polish:orc-jaw', () => new THREE.CapsuleGeometry(0.2, 0.16, 4, 9), skin);
  jaw.position.set(0, -0.18, 0.08);
  jaw.scale.set(1.18 + variation.width * 0.06, 0.72, 0.88);
  rig.head.add(jaw);

  for (const side of [-1, 1]) {
    const tusk = factory.mesh('polish:orc-tusk', () => new THREE.ConeGeometry(0.035, 0.18, 7), factory.material(recipe, 'accent', { roughness: 0.72 }));
    tusk.position.set(side * 0.11, -0.19, 0.29);
    tusk.rotation.x = Math.PI;
    tusk.rotation.z = side * 0.18;
    rig.head.add(tusk);

    const pauldron = factory.mesh('polish:orc-pauldron', () => new THREE.SphereGeometry(0.2, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    pauldron.position.set(side * 0.03, 0.01, 0);
    pauldron.rotation.z = side * 0.16;
    rig[`shoulder${side < 0 ? 'L' : 'R'}`].add(pauldron);
  }

  const brow = factory.mesh('polish:orc-brow', () => new THREE.BoxGeometry(0.36, 0.055, 0.07), skin);
  brow.position.set(0, 0.1, 0.28);
  brow.rotation.z = variation.faceBias * 0.08;
  rig.head.add(brow);

  const scar = factory.mesh('polish:orc-scar', () => new THREE.BoxGeometry(0.018, 0.2, 0.018), dark);
  scar.position.set(variation.faceBias > 0 ? 0.1 : -0.1, 0.015, 0.315);
  scar.rotation.z = variation.faceBias > 0 ? 0.34 : -0.34;
  rig.head.add(scar);

  const topknot = new THREE.Group();
  topknot.name = 'orc_topknot';
  topknot.position.set(0, 0.33, -0.04);
  const knot = factory.mesh('polish:orc-topknot', () => new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), dark);
  knot.position.y = 0.13;
  knot.rotation.z = 0.18 + variation.asymmetry * 0.16;
  topknot.add(knot);
  rig.head.add(topknot);
  rig.topknot = topknot;
}
