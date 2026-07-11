import { THREE } from './ThreeScene.js';

export function buildHeavyAxe(factory, recipe) {
  const group = new THREE.Group();
  group.name = 'weapon_axe_heavy';
  const haft = factory.mesh('polish:axe-haft', () => new THREE.CapsuleGeometry(0.035, 0.82, 4, 8), factory.material(recipe, 'leather', { roughness: 0.82 }));
  haft.position.y = 0.34;
  const head = factory.mesh('polish:axe-head', () => new THREE.BoxGeometry(0.42, 0.22, 0.1), factory.material(recipe, 'metal', { metalness: 0.38, roughness: 0.34 }));
  head.position.set(0.12, 0.82, 0);
  head.rotation.z = -0.12;
  const blade = factory.mesh('polish:axe-blade', () => new THREE.ConeGeometry(0.18, 0.36, 4), factory.material(recipe, 'metal', { metalness: 0.42, roughness: 0.3 }));
  blade.position.set(0.32, 0.82, 0);
  blade.rotation.z = -Math.PI / 2;
  group.add(haft, head, blade);
  group.rotation.z = -0.08;
  return group;
}

export function buildKiteShield(factory, recipe) {
  const group = new THREE.Group();
  group.name = 'shield_kite';
  const shield = factory.mesh('polish:kite-shield', () => new THREE.CylinderGeometry(0.34, 0.46, 0.08, 5), factory.material(recipe, 'metal', { metalness: 0.24, roughness: 0.48 }));
  shield.rotation.x = Math.PI / 2;
  shield.scale.set(0.9, 1.15, 1);
  const boss = factory.mesh('polish:kite-boss', () => new THREE.SphereGeometry(0.11, 10, 7), factory.material(recipe, 'accent', { metalness: 0.28, roughness: 0.4 }));
  boss.position.z = 0.075;
  group.add(shield, boss);
  group.rotation.y = Math.PI / 2;
  return group;
}
