import { THREE } from './ThreeScene.js';

export function buildLongbow(factory, recipe) {
  const group = new THREE.Group();
  group.name = 'weapon_bow_long';
  const wood = factory.material(recipe, 'leather', { roughness: 0.64 });
  const stringMaterial = factory.material(recipe, 'accent', { roughness: 0.9 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.58, 0), new THREE.Vector3(0.14, -0.3, 0), new THREE.Vector3(0.18, 0, 0),
    new THREE.Vector3(0.14, 0.3, 0), new THREE.Vector3(0, 0.58, 0)
  ]);
  const stave = factory.mesh('polish:longbow-stave', () => new THREE.TubeGeometry(curve, 24, 0.035, 7, false), wood);
  const grip = factory.mesh('polish:longbow-grip', () => new THREE.CapsuleGeometry(0.055, 0.16, 3, 7), factory.material(recipe, 'dark', { roughness: 0.82 }));
  grip.position.x = 0.18;
  const upperString = lineCylinder(factory, 'polish:bow-string-upper', new THREE.Vector3(0, 0.58, 0), new THREE.Vector3(0.18, 0, 0), 0.008, stringMaterial);
  const lowerString = lineCylinder(factory, 'polish:bow-string-lower', new THREE.Vector3(0.18, 0, 0), new THREE.Vector3(0, -0.58, 0), 0.008, stringMaterial);
  group.add(stave, grip, upperString, lowerString);
  group.rotation.z = -0.08;
  group.rotation.y = Math.PI / 2;
  return group;
}

export function buildArrow(factory, recipe) {
  const group = new THREE.Group();
  group.name = 'weapon_arrow_nocked';
  const shaft = factory.mesh('polish:arrow-shaft', () => new THREE.CylinderGeometry(0.012, 0.014, 0.92, 6), factory.material(recipe, 'leather', { roughness: 0.72 }));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.34;
  const head = factory.mesh('polish:arrow-head', () => new THREE.ConeGeometry(0.045, 0.14, 5), factory.material(recipe, 'metal', { metalness: 0.35, roughness: 0.28 }));
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.86;
  const featherMaterial = factory.material(recipe, 'accent', { roughness: 0.86 });
  for (const side of [-1, 1]) {
    const feather = factory.mesh('polish:arrow-feather', () => new THREE.BoxGeometry(0.08, 0.025, 0.18), featherMaterial);
    feather.position.set(side * 0.045, 0, -0.08);
    feather.rotation.z = side * 0.18;
    group.add(feather);
  }
  group.add(shaft, head);
  return group;
}

function lineCylinder(factory, key, start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = factory.mesh(key, () => new THREE.CylinderGeometry(radius, radius, length, 5), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}
