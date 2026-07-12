import { THREE } from './ThreeScene.js';

export const CENTRAL_MARKET_COLORS = Object.freeze({
  stone: 0x625f58,
  stoneDark: 0x373735,
  stoneDust: 0x81796c,
  mortar: 0x4b4844,
  wood: 0x684a32,
  woodDark: 0x3b2b22,
  repairWood: 0x947253,
  iron: 0x4d5153,
  ironDark: 0x262a2c,
  bronze: 0x8b6840,
  brass: 0xb18b4f,
  clothRed: 0x7a4038,
  clothOchre: 0x9a7542,
  clothOlive: 0x646648,
  clothBlue: 0x465a6b,
  clothBlack: 0x29282a,
  parchment: 0xb7a889,
  parchmentDark: 0x766b58,
  waxRed: 0x8f3c38,
  ash: 0x494541,
  soot: 0x201f20,
  ember: 0xff8b43,
  lantern: 0xffc66d,
  water: 0x426c72,
  waterLight: 0x6b9897,
  poison: 0x6f8c45,
  bone: 0xc7bda4,
  goblin: 0x68804c,
  adventurer: 0x56758c,
  orc: 0x8a3e32
});

const materialCache = new Map();
const geometryCache = new Map();

const MATERIAL_ALIASES = Object.freeze({
  bronze: 'brass',
  repairWood: 'wood',
  ironDark: 'iron',
  parchmentDark: 'parchment',
  soot: 'stoneDark',
  ash: 'stone',
  mortar: 'stoneDark',
  bone: 'parchment',
  goblin: 'clothOlive',
  adventurer: 'clothBlue',
  orc: 'clothRed',
  waterLight: 'water',
  stoneDust: 'stone',
  ember: 'lantern'
});

const MATERIAL_PROFILES = Object.freeze({
  stone: { roughness: 0.88, metalness: 0 },
  stoneDark: { roughness: 0.9, metalness: 0 },
  stoneDust: { roughness: 0.94, metalness: 0 },
  wood: { roughness: 0.9, metalness: 0 },
  woodDark: { roughness: 0.92, metalness: 0 },
  iron: { roughness: 0.56, metalness: 0.34 },
  brass: { roughness: 0.46, metalness: 0.42 },
  clothRed: { roughness: 0.96, metalness: 0 },
  clothOchre: { roughness: 0.96, metalness: 0 },
  clothOlive: { roughness: 0.96, metalness: 0 },
  clothBlue: { roughness: 0.96, metalness: 0 },
  clothBlack: { roughness: 0.98, metalness: 0 },
  parchment: { roughness: 0.91, metalness: 0 },
  waxRed: { roughness: 0.72, metalness: 0 },
  ember: { roughness: 0.5, metalness: 0 },
  lantern: { roughness: 0.42, metalness: 0 },
  water: { roughness: 0.2, metalness: 0.1 },
  poison: { roughness: 0.25, metalness: 0.04 }
});

export function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

export function material(name, options = {}) {
  const resolvedName = MATERIAL_ALIASES[name] ?? name;
  const profile = MATERIAL_PROFILES[resolvedName] ?? { roughness: 0.76, metalness: 0.03 };
  const color = options.color ?? CENTRAL_MARKET_COLORS[resolvedName] ?? CENTRAL_MARKET_COLORS.stone;
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
  instance.name = `central-market-material:${resolvedName}`;
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

export function marketFloor(width, depth, options = {}) {
  const root = group(options.name ?? 'market-floor');
  root.add(box(width, 0.32, depth, options.material ?? 'stone', 'market-floor-slab', [0, -0.16, 0], { role: 'structure', blocksTraversal: false }));
  const spacing = options.jointSpacing ?? 2.4;
  const xJoints = [];
  const zJoints = [];
  for (let x = -width / 2 + spacing; x < width / 2; x += spacing) {
    xJoints.push({ position: [x, 0.012, 0], scale: [0.045, 0.025, depth * 0.96] });
  }
  for (let z = -depth / 2 + spacing; z < depth / 2; z += spacing) {
    zJoints.push({ position: [0, 0.014, z], scale: [width * 0.96, 0.025, 0.045] });
  }
  if (xJoints.length) root.add(instanced('market-floor-joints-x', cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material('stoneDark'), xJoints));
  if (zJoints.length) root.add(instanced('market-floor-joints-z', cachedGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1)), material('stoneDark'), zJoints));
  return root;
}
export function wallFragment(width, height, depth, position, rotationY = 0, options = {}) {
  const root = group(options.name ?? 'market-wall-fragment');
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
  const glow = sphere(0.17, 'lantern', `${name}:glow`, [0, 0, 0], [1, 1.45, 1], {
    emissive: CENTRAL_MARKET_COLORS.lantern,
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
    const flame = taperedCylinder(0.03, 0.18 - index * 0.04, 0.62 - index * 0.08, 'lantern', `${name}:flame`, [(index ? 1 : -1) * 0.1, 0.88, index * 0.06], 7, null, {
      emissive: CENTRAL_MARKET_COLORS.lantern,
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
  const surface = cylinder(radius, options.thickness ?? 0.05, options.poisoned ? 'poison' : 'water', name, position, 36, null, {
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
export function disposeCentralMarketCaches() {
  for (const geometry of geometryCache.values()) geometry.dispose?.();
  for (const value of materialCache.values()) value.dispose?.();
  geometryCache.clear();
  materialCache.clear();
}
