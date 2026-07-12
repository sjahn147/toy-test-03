import { THREE } from './ThreeScene.js';

export const ORC_BARRACKS_COLORS = Object.freeze({
  stone: 0x56534f,
  stoneDark: 0x302f2d,
  stoneDust: 0x746b5f,
  mortar: 0x45413d,
  wood: 0x5f402b,
  woodDark: 0x34251d,
  repairWood: 0x8b6545,
  iron: 0x474c4e,
  ironDark: 0x24282a,
  steelEdge: 0x899092,
  rust: 0x81452f,
  brass: 0xb18b4f,
  leather: 0x71452f,
  leatherDark: 0x3d2922,
  hide: 0x92745a,
  clanRed: 0x762f34,
  clanDark: 0x3d2025,
  ochre: 0x99723e,
  capturedCloth: 0x5b6262,
  bone: 0xc0b28f,
  horn: 0x82745e,
  ember: 0xff8640,
  flame: 0xffbd5b,
  smoke: 0x504a47,
  meatDark: 0x6f3431,
  meatDry: 0x8d5545,
  salt: 0xc2baa3,
  parasite: 0x7d8d4d,
  parasiteGlow: 0xaec65f,
  water: 0x52666a,
  parchment: 0xb9aa86,
  ash: 0x4d4945,
  soot: 0x201f1e
});

const materialCache = new Map();
const geometryCache = new Map();

const MATERIAL_ALIASES = Object.freeze({
  repairWood: 'wood',
  ironDark: 'iron',
  steelEdge: 'iron',
  rust: 'iron',
  leatherDark: 'leather',
  hide: 'leather',
  clanDark: 'clanRed',
  capturedCloth: 'ochre',
  bone: 'parchment',
  horn: 'parchment',
  smoke: 'stoneDark',
  meatDry: 'meatDark',
  salt: 'parchment',
  parasiteGlow: 'parasite',
  stoneDust: 'stone',
  mortar: 'stoneDark',
  ash: 'stone',
  soot: 'stoneDark',
  flame: 'ember'
});

const MATERIAL_PROFILES = Object.freeze({
  stone: { roughness: 0.9, metalness: 0 },
  stoneDark: { roughness: 0.92, metalness: 0 },
  wood: { roughness: 0.91, metalness: 0 },
  woodDark: { roughness: 0.94, metalness: 0 },
  iron: { roughness: 0.54, metalness: 0.38 },
  brass: { roughness: 0.44, metalness: 0.46 },
  leather: { roughness: 0.95, metalness: 0 },
  clanRed: { roughness: 0.97, metalness: 0 },
  ochre: { roughness: 0.97, metalness: 0 },
  parchment: { roughness: 0.93, metalness: 0 },
  ember: { roughness: 0.42, metalness: 0 },
  meatDark: { roughness: 0.84, metalness: 0 },
  parasite: { roughness: 0.5, metalness: 0 },
  water: { roughness: 0.28, metalness: 0.04 }
});
export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  const resolvedName = MATERIAL_ALIASES[name] ?? name;
  const profile = MATERIAL_PROFILES[resolvedName] ?? { roughness: 0.76, metalness: 0.03 };
  const color = options.color ?? ORC_BARRACKS_COLORS[resolvedName] ?? ORC_BARRACKS_COLORS.stone;
  const shared = options.shared !== false;
  const roughness = shared ? profile.roughness : (options.roughness ?? profile.roughness);
  const metalness = shared ? profile.metalness : (options.metalness ?? profile.metalness);
  const key = JSON.stringify({
    resolvedName,
    color,
    roughness,
    metalness,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true
  });
  if (shared && materialCache.has(key)) return materialCache.get(key);
  const instance = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true
  });
  instance.name = `orc-barracks-material:${resolvedName}`;
  if (shared) materialCache.set(key, instance);
  return instance;
}

function cachedGeometry(key, factory) {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key);
}

function mark(node, role = 'decoration', blocksTraversal = false) {
  node.userData.assetRole = role;
  node.userData.blocksTraversal = blocksTraversal;
  return node;
}

function instanced(name, geometry, materialInstance, instances, options = {}) {
  const mesh = new THREE.InstancedMesh(geometry, materialInstance, instances.length);
  mesh.name = name;
  const dummy = new THREE.Object3D();
  instances.forEach((item, index) => {
    dummy.position.set(...(item.position ?? [0, 0, 0]));
    dummy.rotation.set(...(item.rotation ?? [0, 0, 0]));
    dummy.scale.set(...(item.scale ?? [1, 1, 1]));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function box(width, height, depth, materialName, name, position = [0, 0, 0], options = {}) {
  const key = `box:${width}:${height}:${depth}`;
  const mesh = new THREE.Mesh(cachedGeometry(key, () => new THREE.BoxGeometry(width, height, depth)), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function cylinder(radius, height, materialName, name, position = [0, 0, 0], segments = 14, rotation = null, options = {}) {
  const key = `cyl:${radius}:${height}:${segments}`;
  const mesh = new THREE.Mesh(cachedGeometry(key, () => new THREE.CylinderGeometry(radius, radius, height, segments)), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function taperedCylinder(radiusTop, radiusBottom, height, materialName, name, position = [0, 0, 0], segments = 14, rotation = null, options = {}) {
  const key = `tcyl:${radiusTop}:${radiusBottom}:${height}:${segments}`;
  const mesh = new THREE.Mesh(cachedGeometry(key, () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)), material(materialName, options));
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function sphere(radius, materialName, name, position = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const key = `sphere:${radius}:${options.widthSegments ?? 14}:${options.heightSegments ?? 10}`;
  const mesh = new THREE.Mesh(
    cachedGeometry(key, () => new THREE.SphereGeometry(radius, options.widthSegments ?? 14, options.heightSegments ?? 10)),
    material(materialName, options)
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function torus(radius, tube, materialName, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const key = `torus:${radius}:${tube}:${options.radialSegments ?? 7}:${options.tubularSegments ?? 24}:${options.arc ?? Math.PI * 2}`;
  const mesh = new THREE.Mesh(
    cachedGeometry(key, () => new THREE.TorusGeometry(radius, tube, options.radialSegments ?? 7, options.tubularSegments ?? 24, options.arc ?? Math.PI * 2)),
    material(materialName, options)
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function beam(start, end, radius, materialName, name, options = {}) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    cachedGeometry(`beam:${radius}:${delta.length().toFixed(3)}:${options.segments ?? 7}`, () => new THREE.CylinderGeometry(radius, radius, delta.length(), options.segments ?? 7)),
    material(materialName, options)
  );
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mark(mesh, options.role, options.blocksTraversal ?? false);
}

export function instanceBoxes(name, items, materialName, options = {}) {
  return instanced(name, cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material(materialName, options), items, options);
}

export function instanceSpheres(name, items, materialName, options = {}) {
  return instanced(name, cachedGeometry('unit-sphere:12:8', () => new THREE.SphereGeometry(1, 12, 8)), material(materialName, options), items, options);
}

export function instanceCylinders(name, items, materialName, options = {}) {
  return instanced(name, cachedGeometry('unit-cylinder:10', () => new THREE.CylinderGeometry(1, 1, 1, 10)), material(materialName, options), items, options);
}

export function barracksFloor(width, depth, options = {}) {
  const root = group(options.name ?? 'orc-barracks-floor');
  root.add(box(width, 0.32, depth, options.material ?? 'stone', 'orc-barracks-floor-slab', [0, -0.16, 0], { role: 'structure', blocksTraversal: false }));
  const spacing = options.jointSpacing ?? 2.4;
  const xJoints = [];
  const zJoints = [];
  for (let x = -width / 2 + spacing; x < width / 2; x += spacing) {
    xJoints.push({ position: [x, 0.012, 0], scale: [0.045, 0.025, depth * 0.96] });
  }
  for (let z = -depth / 2 + spacing; z < depth / 2; z += spacing) {
    zJoints.push({ position: [0, 0.014, z], scale: [width * 0.96, 0.025, 0.045] });
  }
  if (xJoints.length) root.add(instanced('orc-barracks-floor-joints-x', cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material('stoneDark'), xJoints));
  if (zJoints.length) root.add(instanced('orc-barracks-floor-joints-z', cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material('stoneDark'), zJoints));
  return root;
}
export function wallFragment(width, height, depth, position, rotationY = 0, options = {}) {
  const root = group(options.name ?? 'orc-barracks-wall-fragment');
  root.position.set(...position);
  root.rotation.y = rotationY;
  const courses = Math.max(2, Math.round(height / 0.62));
  const count = Math.max(2, Math.round(width / 1.45));
  const blockWidth = width / count - 0.05;
  const blockHeight = height / courses - 0.05;
  const blocks = [];
  for (let row = 0; row < courses; row += 1) {
    for (let index = 0; index < count; index += 1) {
      const stagger = row % 2 ? blockWidth * 0.22 : 0;
      const x = -width / 2 + blockWidth / 2 + index * (width / count) + stagger;
      if (Math.abs(x) > width / 2 - blockWidth * 0.16) continue;
      const chip = ((row * 7 + index * 11) % 7) * 0.018;
      blocks.push({
        position: [x, blockHeight / 2 + row * (height / courses), 0],
        rotation: [0, ((row + index) % 3 - 1) * 0.008, 0],
        scale: [blockWidth - chip, blockHeight, depth]
      });
    }
  }
  root.add(instanced('wall-masonry-blocks', cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material(options.material ?? 'stone'), blocks, { role: 'structure', blocksTraversal: true }));
  root.add(box(width * 0.96, 0.06, depth * 1.03, 'stoneDark', 'wall-foundation-shadow', [0, 0.04, 0]));
  return root;
}
export function arch(width, height, depth, materialName, name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  if (options.rotationY) root.rotation.y = options.rotationY;
  const pillarWidth = options.pillarWidth ?? Math.max(0.42, width * 0.13);
  const springY = height * 0.58;
  root.add(
    box(pillarWidth, springY, depth, materialName, `${name}:pillar-left`, [-width / 2 + pillarWidth / 2, springY / 2, 0], { role: 'structure', blocksTraversal: true }),
    box(pillarWidth, springY, depth, materialName, `${name}:pillar-right`, [width / 2 - pillarWidth / 2, springY / 2, 0], { role: 'structure', blocksTraversal: true }),
    box(width, height - springY, depth, materialName, `${name}:lintel`, [0, springY + (height - springY) / 2, 0], { role: 'structure', blocksTraversal: true })
  );
  const innerRadius = width * 0.29;
  const stones = [];
  for (let index = 0; index < 7; index += 1) {
    const angle = Math.PI * (index / 6);
    stones.push({
      position: [Math.cos(angle) * innerRadius, springY + Math.sin(angle) * innerRadius * 0.72, 0],
      rotation: [0, 0, angle - Math.PI / 2],
      scale: [width * 0.11, height * 0.12, depth * 1.08]
    });
  }
  root.add(instanced(`${name}:voussoirs`, cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material(materialName), stones, { role: 'structure', blocksTraversal: true }));
  return root;
}
export function clothPanel(width, height, materialName, name, position = [0, 0, 0], rotation = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.set(...rotation);
  const folds = Math.max(3, Math.min(options.folds ?? 5, 8));
  const foldWidth = width / folds;
  const strips = [];
  for (let index = 0; index < folds; index += 1) {
    strips.push({
      position: [(index - (folds - 1) / 2) * foldWidth, -height / 2, (index % 2 ? 1 : -1) * 0.025],
      scale: [foldWidth * 0.98, height * (1 - (index % 3) * 0.025), 0.035 + (index % 2) * 0.025]
    });
  }
  root.add(instanced(`${name}:folds`, cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material(materialName, options), strips));
  root.userData.animation = options.animation ?? 'cloth-sway';
  root.userData.phase = options.phase ?? 0;
  return root;
}
export function rope(start, end, radius = 0.035, name = 'rope', options = {}) {
  return beam(start, end, radius, options.material ?? 'wood', name, options);
}

export function chain(start, end, linkCount = 6, name = 'chain', options = {}) {
  const root = group(name);
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const links = [];
  for (let index = 0; index < linkCount; index += 1) {
    const t = linkCount === 1 ? 0 : index / (linkCount - 1);
    const p = a.clone().lerp(b, t);
    links.push({
      position: [p.x, p.y, p.z],
      rotation: [index % 2 ? Math.PI / 2 : 0, 0, 0]
    });
  }
  root.add(instanced(`${name}:links`, cachedGeometry(`chain-link:${options.radius ?? 0.11}:${options.tube ?? 0.025}`, () => new THREE.TorusGeometry(options.radius ?? 0.11, options.tube ?? 0.025, 7, 18)), material(options.material ?? 'iron'), links));
  root.userData.animation = options.animation ?? 'chain-tremble';
  root.userData.phase = options.phase ?? 0;
  return root;
}
export function signBoard(textKey, position = [0, 0, 0], rotationY = 0, options = {}) {
  const root = group(options.name ?? `sign:${textKey}`);
  root.position.set(...position);
  root.rotation.y = rotationY;
  const width = options.width ?? 2.2;
  const height = options.height ?? 0.52;
  root.add(
    box(width, height, 0.12, options.material ?? 'wood', `${root.name}:board`, [0, 0, 0], { role: 'story-prop' }),
    box(width * 0.86, 0.035, 0.132, options.inlay ?? 'brass', `${root.name}:inlay`, [0, 0, 0.07])
  );
  root.userData.inscription = textKey;
  root.userData.animation = options.animation ?? 'sign-creak';
  root.userData.phase = options.phase ?? 0;
  return root;
}

export function crate(name, position = [0, 0, 0], scale = 1, options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  const w = 0.92 * scale;
  const h = 0.72 * scale;
  const d = 0.8 * scale;
  root.add(box(w, h, d, options.material ?? 'wood', `${name}:body`, [0, h / 2, 0], { role: options.role ?? 'decoration', blocksTraversal: options.blocksTraversal ?? true }));
  root.add(instanceBoxes(`${name}:straps`, [
    { position: [-w / 2 + 0.08, h / 2, 0], scale: [0.07, h * 1.04, d * 1.04] },
    { position: [w / 2 - 0.08, h / 2, 0], scale: [0.07, h * 1.04, d * 1.04] }
  ], 'iron', { metalness: 0.34 }));
  root.add(instanceBoxes(`${name}:edges`, [
    { position: [0, h - 0.08, -d / 2 + 0.08], scale: [w * 1.04, 0.07, 0.06] },
    { position: [0, h - 0.08, d / 2 - 0.08], scale: [w * 1.04, 0.07, 0.06] }
  ], 'iron'));
  return root;
}
export function barrel(name, position = [0, 0, 0], scale = 1, options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.set(0, options.rotationY ?? 0, options.tipped ? Math.PI / 2 : 0);
  const body = taperedCylinder(0.38 * scale, 0.42 * scale, 0.9 * scale, options.material ?? 'wood', `${name}:body`, [0, 0.45 * scale, 0], 14, null, { role: options.role ?? 'decoration', blocksTraversal: options.blocksTraversal ?? true });
  root.add(body);
  root.add(instanced(`${name}:hoops`, cachedGeometry(`barrel-hoop:${scale}`, () => new THREE.TorusGeometry(0.4 * scale, 0.025 * scale, 7, 18)), material('iron'), [
    { position: [0, 0.17 * scale, 0], rotation: [Math.PI / 2, 0, 0] },
    { position: [0, 0.45 * scale, 0], rotation: [Math.PI / 2, 0, 0] },
    { position: [0, 0.73 * scale, 0], rotation: [Math.PI / 2, 0, 0] }
  ]));
  return root;
}
export function lantern(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  const frame = group(`${name}:frame`);
  frame.add(
    box(0.34, 0.52, 0.34, 'ironDark', `${name}:cage`, [0, 0, 0], { transparent: true, opacity: 0.2 }),
    cylinder(0.06, 0.65, 'iron', `${name}:spine`, [0, 0, 0]),
    torus(0.18, 0.025, 'iron', `${name}:handle`, [0, 0.39, 0], [0, 0, 0])
  );
  const glow = sphere(0.17, 'ember', `${name}:glow`, [0, 0, 0], [1, 1.45, 1], {
    emissive: ORC_BARRACKS_COLORS.flame,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.86,
    
  });
  glow.userData.animation = options.pulse ? 'flame-flicker' : 'lantern-glow';
  glow.userData.phase = options.phase ?? 0;
  root.add(frame, glow);
  root.userData.animation = options.animation ?? 'lantern-sway';
  root.userData.phase = options.phase ?? 0;
  return root;
}

export function brazier(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.add(
    cylinder(0.46, 0.16, 'iron', `${name}:bowl`, [0, 0.52, 0], 12),
    cylinder(0.12, 0.52, 'iron', `${name}:stem`, [0, 0.26, 0], 8),
    torus(0.43, 0.035, 'iron', `${name}:rim`, [0, 0.6, 0], [Math.PI / 2, 0, 0])
  );
  for (let index = 0; index < 2; index += 1) {
    const flame = taperedCylinder(0.03, 0.18 - index * 0.04, 0.62 - index * 0.08, 'ember', `${name}:flame`, [(index ? 1 : -1) * 0.1, 0.88, index * 0.06], 7, null, {
      emissive: ORC_BARRACKS_COLORS.flame,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.86
    });
    flame.userData.animation = 'flame-flicker';
    flame.userData.phase = (options.phase ?? 0) + index * 0.9;
    root.add(flame);
  }
  if (options.smoke !== false) {
    for (let index = 0; index < 2; index += 1) {
      const puff = sphere(0.24 + index * 0.05, 'stone', `${name}:smoke`, [0, 1.35 + index * 0.42, 0], [1, 0.8, 1], { transparent: true, opacity: 0.14, depthWrite: false });
      puff.userData.animation = 'smoke-rise';
      puff.userData.phase = (options.phase ?? 0) + index * 1.4;
      root.add(puff);
    }
  }
  return root;
}
export function waterSurface(radius, name, position = [0, 0, 0], options = {}) {
  const surface = cylinder(radius, options.thickness ?? 0.05, options.poisoned ? 'parasite' : 'water', name, position, 36, null, {
    transparent: true,
    opacity: options.opacity ?? 0.72,
    roughness: 0.2,
    metalness: 0.12,
    depthWrite: false
  });
  surface.userData.animation = options.poisoned ? 'poison-ripple' : 'water-ripple';
  surface.userData.phase = options.phase ?? 0;
  return surface;
}

export function socketNode(name, position, options = {}) {
  const node = group(name);
  node.position.set(...position);
  node.rotation.set(...(options.rotation ?? [0, 0, 0]));
  node.userData.semanticSocket = true;
  node.userData.radius = options.radius ?? 0.8;
  node.userData.tags = [...(options.tags ?? [])];
  node.userData.enabledIn = options.enabledIn ? [...options.enabledIn] : null;
  node.visible = options.visible ?? false;
  return node;
}

export function addRecipeSockets(root, recipe, state) {
  root.userData.semanticSockets = {};
  for (const socket of recipe.semanticSockets) {
    const node = socketNode(socket.id, socket.position, socket);
    const enabled = !socket.enabledIn || socket.enabledIn.includes(state);
    node.userData.enabled = enabled;
    root.add(node);
    root.userData.semanticSockets[socket.id] = {
      position: [...socket.position],
      rotation: [...(socket.rotation ?? [0, 0, 0])],
      radius: socket.radius ?? 0.8,
      tags: [...(socket.tags ?? [])],
      enabled
    };
  }
  return root;
}

export function scatterPaper(root, prefix, points, options = {}) {
  const sheets = points.map((point, index) => ({
    position: [point[0], point[1] ?? 0.04, point[2]],
    rotation: [0, point[3] ?? index * 0.51, (index % 2 ? 1 : -1) * 0.025],
    scale: [options.width ?? 0.44, 0.018, options.depth ?? 0.32]
  }));
  root.add(instanceBoxes(`${prefix}:sheets`, sheets, options.material ?? 'parchment'));
}
export function coinPile(name, position = [0, 0, 0], count = 7, options = {}) {
  const root = group(name);
  root.position.set(...position);
  const coins = [];
  for (let index = 0; index < count; index += 1) {
    coins.push({
      position: [((index * 13) % 5 - 2) * 0.07, 0.02 + Math.floor(index / 5) * 0.022, ((index * 7) % 5 - 2) * 0.055],
      rotation: [Math.PI / 2, 0, index * 0.4]
    });
  }
  root.add(instanced(`${name}:coins`, cachedGeometry('coin:0.075:0.018', () => new THREE.CylinderGeometry(0.075, 0.075, 0.018, 10)), material(options.material ?? 'brass', { metalness: 0.35, roughness: 0.45 }), coins));
  return root;
}
export function brokenPlanks(name, position = [0, 0, 0], count = 5, options = {}) {
  const root = group(name);
  root.position.set(...position);
  const planks = [];
  for (let index = 0; index < count; index += 1) {
    planks.push({
      position: [(index - count / 2) * 0.28, 0.08 + index * 0.018, (index % 2 ? 1 : -1) * 0.3],
      rotation: [0, (index - 2) * 0.22, (index % 2 ? 1 : -1) * 0.08],
      scale: [1.1 + (index % 3) * 0.35, 0.11, 0.22]
    });
  }
  root.add(instanced(`${name}:planks`, cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material(options.material ?? 'wood'), planks));
  return root;
}
export function disposeOrcBarracksCaches() {
  for (const geometry of geometryCache.values()) geometry.dispose?.();
  for (const value of materialCache.values()) value.dispose?.();
  geometryCache.clear();
  materialCache.clear();
}

export function banner(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    beam([0, 0, 0], [0, options.height ?? 3.6, 0], 0.07, options.poleMaterial ?? 'woodDark', `${name}:pole`, { role: 'structure', blocksTraversal: true }),
    clothPanel(options.width ?? 1.35, options.clothHeight ?? 2.2, options.material ?? 'clanRed', `${name}:cloth`, [0.72, options.clothY ?? 2.3, 0], [0, 0, 0], { folds: 5, phase: options.phase ?? 0, animation: options.animation ?? 'banner-sway' })
  );
  return root;
}

export function weaponRack(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  const width = options.width ?? 3.4;
  root.add(
    box(width, 0.18, 0.7, 'woodDark', `${name}:base`, [0, 0.09, 0], { role: 'structure', blocksTraversal: true }),
    beam([-width / 2 + 0.18, 0.2, 0], [-width / 2 + 0.18, 2.5, 0], 0.065, 'wood', `${name}:post-left`, { role: 'structure', blocksTraversal: true }),
    beam([width / 2 - 0.18, 0.2, 0], [width / 2 - 0.18, 2.5, 0], 0.065, 'wood', `${name}:post-right`, { role: 'structure', blocksTraversal: true }),
    beam([-width / 2 + 0.18, 1.55, 0], [width / 2 - 0.18, 1.55, 0], 0.055, 'iron', `${name}:crossbar`)
  );
  const count = options.count ?? 6;
  for (let index = 0; index < count; index += 1) {
    const x = -width / 2 + 0.45 + index * ((width - 0.9) / Math.max(1, count - 1));
    const shaft = beam([x, 0.3, 0.02], [x + (index % 2 ? 0.08 : -0.08), 2.15, 0.02], 0.035, options.empty ? 'woodDark' : 'wood', `${name}:weapon-shaft`);
    root.add(shaft);
    if (!options.empty) {
      root.add(taperedCylinder(0.02, 0.13, 0.42, options.bladeMaterial ?? 'iron', `${name}:weapon-head`, [x + (index % 2 ? 0.09 : -0.09), 2.35, 0.02], 6, null, { role: 'decoration' }));
    }
  }
  if (!options.empty) {
    root.userData.animation = 'weapon-tremble';
    root.userData.phase = options.phase ?? 0;
  }
  return root;
}

export function shieldRack(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(box(options.width ?? 3.6, 0.22, 0.75, 'woodDark', `${name}:base`, [0, 0.11, 0], { role: 'structure', blocksTraversal: true }));
  const count = options.count ?? 5;
  for (let index = 0; index < count; index += 1) {
    const x = (index - (count - 1) / 2) * 0.72;
    if (!options.empty || index % 2 === 0) {
      const shield = group(`${name}:shield`);
      shield.position.set(x, 1.15, 0);
      shield.rotation.y = index % 2 ? 0.08 : -0.08;
      shield.add(
        cylinder(0.56, 0.11, options.material ?? 'clanRed', `${name}:shield-face`, [0, 0, 0], 12, [Math.PI / 2, 0, 0]),
        sphere(0.14, 'iron', `${name}:shield-boss`, [0, 0, 0.08], [1, 0.5, 1])
      );
      root.add(shield);
    } else {
      root.add(torus(0.33, 0.025, 'iron', `${name}:empty-hook`, [x, 1.15, 0], [0, 0, 0]));
    }
  }
  return root;
}

export function armorStand(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    beam([0, 0, 0], [0, 2.8, 0], 0.07, 'woodDark', `${name}:spine`, { role: 'structure', blocksTraversal: true }),
    beam([-0.75, 2.05, 0], [0.75, 2.05, 0], 0.06, 'wood', `${name}:shoulders`),
    box(1.0, 0.22, 0.78, 'woodDark', `${name}:base`, [0, 0.11, 0], { role: 'structure', blocksTraversal: true })
  );
  if (!options.empty) {
    root.add(
      box(1.35, 1.25, 0.42, options.material ?? 'iron', `${name}:cuirass`, [0, 1.45, 0], { role: 'decoration' }),
      cylinder(0.42, 0.55, options.material ?? 'iron', `${name}:helmet`, [0, 2.55, 0], 10),
      clothPanel(0.9, 0.75, options.cloth ?? 'leather', `${name}:waist-guard`, [0, 0.85, 0.22], [0, 0, 0], { folds: 4, animation: 'banner-sway', phase: options.phase ?? 0 })
    );
  }
  return root;
}

export function targetDummy(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    beam([0, 0, 0], [0, 2.6, 0], 0.11, 'woodDark', `${name}:spine`, { role: 'structure', blocksTraversal: true }),
    beam([-0.72, 1.85, 0], [0.72, 1.85, 0], 0.08, 'wood', `${name}:arms`),
    box(1.05, 1.05, 0.5, options.material ?? 'hide', `${name}:torso`, [0, 1.35, 0], { blocksTraversal: true }),
    sphere(0.3, 'hide', `${name}:head`, [0, 2.2, 0], [1, 1.15, 1])
  );
  root.userData.animation = options.animation ?? 'target-swing';
  root.userData.phase = options.phase ?? 0;
  return root;
}

export function trainingPost(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    cylinder(options.radius ?? 0.38, options.height ?? 3.1, 'woodDark', `${name}:post`, [0, (options.height ?? 3.1) / 2, 0], 12, null, { role: 'structure', blocksTraversal: true }),
    torus((options.radius ?? 0.38) * 1.08, 0.045, 'iron', `${name}:lower-band`, [0, 0.75, 0], [Math.PI / 2, 0, 0]),
    torus((options.radius ?? 0.38) * 1.08, 0.045, 'iron', `${name}:upper-band`, [0, (options.height ?? 3.1) - 0.6, 0], [Math.PI / 2, 0, 0])
  );
  return root;
}

export function warDrum(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    cylinder(1.15, 1.35, 'woodDark', `${name}:body`, [0, 1.2, 0], 16, [0, 0, Math.PI / 2], { role: 'structure', blocksTraversal: true }),
    cylinder(1.18, 0.08, 'hide', `${name}:skin-left`, [-0.72, 1.2, 0], 16, [0, 0, Math.PI / 2]),
    cylinder(1.18, 0.08, 'hide', `${name}:skin-right`, [0.72, 1.2, 0], 16, [0, 0, Math.PI / 2]),
    beam([-0.9, 0, -0.8], [-0.9, 1.0, -0.8], 0.08, 'wood', `${name}:stand-left`, { role: 'structure', blocksTraversal: true }),
    beam([0.9, 0, -0.8], [0.9, 1.0, -0.8], 0.08, 'wood', `${name}:stand-right`, { role: 'structure', blocksTraversal: true })
  );
  if (options.active) {
    const skin = root.getObjectByName(`${name}:skin-right`);
    if (skin) {
      skin.userData.animation = 'drum-pulse';
      skin.userData.phase = options.phase ?? 0;
    }
  }
  return root;
}

export function forge(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    box(2.4, 1.2, 1.7, 'stoneDark', `${name}:hearth`, [0, 0.6, 0], { role: 'structure', blocksTraversal: true }),
    box(1.6, 0.3, 1.15, 'iron', `${name}:fire-bed`, [0, 1.15, 0])
  );
  if (options.lit !== false) {
    for (let index = 0; index < 3; index += 1) {
      const flame = taperedCylinder(0.02, 0.16 + index * 0.025, 0.55 + index * 0.08, 'ember', `${name}:flame`, [(index - 1) * 0.35, 1.55, (index % 2 ? 0.12 : -0.08)], 7, null, { emissive: ORC_BARRACKS_COLORS.flame, emissiveIntensity: 1.4, transparent: true, opacity: 0.86 });
      flame.userData.animation = 'forge-flicker';
      flame.userData.phase = (options.phase ?? 0) + index * 0.8;
      root.add(flame);
    }
  }
  const bellows = group(`${name}:bellows`);
  bellows.position.set(-1.65, 0.75, 0.1);
  bellows.add(
    box(0.95, 0.55, 0.65, 'leather', `${name}:bellows-body`, [0, 0, 0]),
    beam([-0.5, 0.15, 0], [-1.2, 0.4, 0], 0.045, 'wood', `${name}:bellows-handle`)
  );
  bellows.userData.animation = 'bellows-pulse';
  bellows.userData.phase = options.phase ?? 0;
  root.add(bellows);
  return root;
}

export function whetstone(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    box(2.0, 0.45, 0.85, 'woodDark', `${name}:bench`, [0, 0.22, 0], { role: 'structure', blocksTraversal: true }),
    beam([-0.65, 0.35, 0], [-0.65, 1.2, 0], 0.05, 'iron', `${name}:axle-left`),
    beam([0.65, 0.35, 0], [0.65, 1.2, 0], 0.05, 'iron', `${name}:axle-right`)
  );
  const wheel = cylinder(0.58, 0.24, 'stone', `${name}:wheel`, [0, 0.9, 0], 18, [0, 0, Math.PI / 2]);
  wheel.userData.animation = 'whetstone-turn';
  wheel.userData.phase = options.phase ?? 0;
  root.add(wheel);
  return root;
}

export function saltBin(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    box(2.1, 1.0, 1.7, 'woodDark', `${name}:bin`, [0, 0.5, 0], { role: 'structure', blocksTraversal: true }),
    box(1.7, options.empty ? 0.06 : 0.35, 1.3, 'salt', `${name}:salt`, [0, options.empty ? 0.95 : 1.08, 0], { rotation: [0, 0, options.empty ? 0 : 0.05] })
  );
  return root;
}

export function rationScale(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.add(
    beam([0, 0, 0], [0, 2.25, 0], 0.055, 'iron', `${name}:post`, { role: 'structure', blocksTraversal: true }),
    beam([-1.25, 1.9, 0], [1.25, 1.9, 0], 0.045, 'iron', `${name}:beam`),
    chain([-1.05, 1.88, 0], [-1.05, 0.95, 0], 5, `${name}:chain-left`, { animation: 'chain-sway', phase: 0.3 }),
    chain([1.05, 1.88, 0], [1.05, 0.95, 0], 5, `${name}:chain-right`, { animation: 'chain-sway', phase: 1.1 }),
    cylinder(0.65, 0.08, 'iron', `${name}:pan-left`, [-1.05, 0.88, 0], 16),
    cylinder(options.precise ? 0.42 : 0.65, 0.08, 'iron', `${name}:pan-right`, [1.05, options.precise ? 1.02 : 0.88, 0], 16)
  );
  return root;
}

export function cauldron(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.add(
    taperedCylinder(0.85, 0.62, 1.05, 'ironDark', `${name}:pot`, [0, 0.8, 0], 16, null, { role: 'structure', blocksTraversal: true }),
    torus(0.86, 0.05, 'iron', `${name}:rim`, [0, 1.3, 0], [Math.PI / 2, 0, 0])
  );
  if (options.steam !== false) {
    for (let index = 0; index < 3; index += 1) {
      const puff = sphere(0.22 + index * 0.035, 'stone', `${name}:steam`, [(index - 1) * 0.17, 1.55 + index * 0.3, 0], [1, 0.75, 1], { transparent: true, opacity: 0.12, depthWrite: false });
      puff.userData.animation = 'cauldron-steam';
      puff.userData.phase = (options.phase ?? 0) + index * 0.9;
      root.add(puff);
    }
  }
  return root;
}

export function meatBundle(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  root.rotation.y = options.rotationY ?? 0;
  root.add(
    sphere(options.radius ?? 0.48, options.dry ? 'meatDry' : 'meatDark', `${name}:body`, [0, 0, 0], [0.75, options.length ?? 1.45, 0.82]),
    rope([0, (options.length ?? 1.45) * 0.46, 0], [0, (options.length ?? 1.45) * 0.9, 0], 0.025, `${name}:tie`, { material: 'leather' })
  );
  root.userData.animation = options.animation ?? 'hook-sway';
  root.userData.phase = options.phase ?? 0;
  return root;
}

export function parasiteCluster(name, position = [0, 0, 0], options = {}) {
  const root = group(name);
  root.position.set(...position);
  for (let index = 0; index < (options.count ?? 5); index += 1) {
    const node = sphere(0.16 + (index % 3) * 0.05, 'parasite', `${name}:sac`, [((index * 7) % 5 - 2) * 0.17, 0.12 + Math.floor(index / 3) * 0.18, ((index * 11) % 5 - 2) * 0.12], [1, 1.3, 1], { emissive: ORC_BARRACKS_COLORS.parasiteGlow, emissiveIntensity: 0.18 });
    root.add(node);
  }
  root.userData.animation = 'parasite-pulse';
  root.userData.phase = options.phase ?? 0;
  return root;
}
