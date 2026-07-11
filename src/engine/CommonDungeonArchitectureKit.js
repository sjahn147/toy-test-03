import { THREE } from './ThreeScene.js';

const DEFAULT_PALETTE = Object.freeze({
  stone: 0x4b4a52,
  stoneLight: 0x68656d,
  stoneDark: 0x2d2d35,
  mortar: 0x25252c,
  wet: 0x1f4450,
  moss: 0x536451,
  iron: 0x4b5158,
  rust: 0x895941,
  wood: 0x705039
});

export function createDungeonMaterials(overrides = {}) {
  const palette = { ...DEFAULT_PALETTE, ...overrides };
  const standard = (color, roughness = 0.82, metalness = 0.04, extra = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra
  });

  return Object.freeze({
    palette,
    stone: standard(palette.stone, 0.9),
    stoneLight: standard(palette.stoneLight, 0.86),
    stoneDark: standard(palette.stoneDark, 0.95),
    mortar: standard(palette.mortar, 1),
    wetStone: standard(palette.wet, 0.34, 0.08),
    moss: standard(palette.moss, 0.96),
    iron: standard(palette.iron, 0.48, 0.64),
    rust: standard(palette.rust, 0.78, 0.3),
    wood: standard(palette.wood, 0.88),
    waterDecal: standard(palette.wet, 0.2, 0.02, { transparent: true, opacity: 0.34, depthWrite: false })
  });
}

export class CommonDungeonArchitectureKit {
  constructor(options = {}) {
    this.materials = options.materials ?? createDungeonMaterials(options.palette);
    this.seed = Number.isFinite(options.seed) ? options.seed : 17;
  }

  addMasonryFloor(parent, options = {}) {
    const {
      width = 8,
      depth = 8,
      y = 0,
      tile = 1,
      wetness = 0,
      damaged = 0.12,
      name = 'masonry-floor'
    } = options;
    const group = namedGroup(name);
    const cols = Math.max(1, Math.ceil(width / tile));
    const rows = Math.max(1, Math.ceil(depth / tile));
    const cellW = width / cols;
    const cellD = depth / rows;

    for (let z = 0; z < rows; z += 1) {
      for (let x = 0; x < cols; x += 1) {
        const n = noise2(x, z, this.seed);
        const chipped = n < damaged;
        const stone = new THREE.Mesh(
          chipped
            ? new THREE.BoxGeometry(cellW * 0.86, 0.14 + n * 0.05, cellD * 0.82)
            : new THREE.BoxGeometry(cellW * 0.94, 0.16, cellD * 0.92),
          (x + z) % 5 === 0 ? this.materials.stoneLight : this.materials.stone
        );
        stone.position.set(
          -width / 2 + cellW * (x + 0.5) + (n - 0.5) * 0.07,
          y - (chipped ? 0.035 : 0),
          -depth / 2 + cellD * (z + 0.5) + (noise2(z, x, this.seed + 9) - 0.5) * 0.07
        );
        stone.rotation.y = (n - 0.5) * 0.04;
        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);
      }
    }

    if (wetness > 0) {
      const wet = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, depth * 0.92), this.materials.waterDecal.clone());
      wet.material.opacity = 0.12 + Math.min(1, wetness) * 0.28;
      wet.rotation.x = -Math.PI / 2;
      wet.position.y = y + 0.092;
      wet.name = 'wet-floor-overlay';
      group.add(wet);
    }

    parent.add(group);
    return group;
  }

  addWallSegment(parent, options = {}) {
    const {
      width = 8,
      height = 4,
      thickness = 0.55,
      position = [0, height / 2, 0],
      rotationY = 0,
      courses = 6,
      wetness = 0,
      damaged = 0.1,
      name = 'masonry-wall'
    } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    group.rotation.y = rotationY;
    const courseH = height / courses;

    for (let row = 0; row < courses; row += 1) {
      const blocks = Math.max(2, Math.round(width / 1.35));
      const blockW = width / blocks;
      for (let i = 0; i < blocks; i += 1) {
        const n = noise2(i + row * 13, row, this.seed + 31);
        if (n < damaged * 0.32 && row > 1) continue;
        const offset = row % 2 ? blockW * 0.5 : 0;
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(blockW * 0.94, courseH * 0.9, thickness * (0.9 + n * 0.16)),
          n > 0.72 ? this.materials.stoneLight : this.materials.stone
        );
        block.position.set(-width / 2 + blockW * (i + 0.5) + offset, -height / 2 + courseH * (row + 0.5), 0);
        if (block.position.x > width / 2) block.position.x -= width;
        block.rotation.z = (n - 0.5) * damaged * 0.05;
        block.castShadow = true;
        block.receiveShadow = true;
        group.add(block);
      }
    }

    const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.24, thickness + 0.18), this.materials.stoneLight);
    cap.position.y = height / 2 + 0.08;
    group.add(cap);

    if (wetness > 0) {
      for (let i = 0; i < 6; i += 1) {
        const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + (i % 3) * 0.09, height * (0.22 + wetness * 0.3)), this.materials.waterDecal.clone());
        streak.position.set(-width * 0.38 + i * width * 0.15, -height * 0.22, thickness * 0.53 + 0.012);
        streak.material.opacity = 0.14 + wetness * 0.16;
        group.add(streak);
      }
    }

    parent.add(group);
    return group;
  }

  addArchway(parent, options = {}) {
    const {
      width = 3.2,
      height = 4.5,
      depth = 0.8,
      position = [0, 0, 0],
      rotationY = 0,
      name = 'stone-archway'
    } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    group.rotation.y = rotationY;
    const pierW = 0.58;
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(pierW, height * 0.68, depth), this.materials.stone);
      pier.position.set(side * (width / 2 - pierW / 2), height * 0.34, 0);
      pier.castShadow = true;
      group.add(pier);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(pierW + 0.25, 0.3, depth + 0.18), this.materials.stoneDark);
      foot.position.set(pier.position.x, 0.15, 0);
      group.add(foot);
    }

    const radius = width / 2 - pierW * 0.35;
    const segments = 11;
    for (let i = 0; i < segments; i += 1) {
      const angle = Math.PI * (i / (segments - 1));
      const voussoir = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.45, depth + 0.08), i % 3 ? this.materials.stoneLight : this.materials.stone);
      voussoir.position.set(Math.cos(angle) * radius, height * 0.68 + Math.sin(angle) * radius, 0);
      voussoir.rotation.z = -angle + Math.PI / 2;
      voussoir.castShadow = true;
      group.add(voussoir);
    }

    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.72, depth + 0.16), this.materials.stoneLight);
    keystone.position.set(0, height * 0.68 + radius + 0.1, 0);
    group.add(keystone);
    parent.add(group);
    return group;
  }

  addColumn(parent, options = {}) {
    const { height = 4.8, radius = 0.48, position = [0, 0, 0], name = 'stone-column', cracked = false } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.35, radius * 1.5, 0.36, 8), this.materials.stoneDark);
    base.position.y = 0.18;
    group.add(base);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, height - 0.72, 10), this.materials.stone);
    shaft.position.y = height / 2;
    shaft.rotation.z = cracked ? 0.035 : 0;
    shaft.castShadow = true;
    group.add(shaft);
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.48, radius * 1.05, 0.42, 8), this.materials.stoneLight);
    capital.position.y = height - 0.21;
    group.add(capital);
    parent.add(group);
    return group;
  }

  addDrainChannel(parent, options = {}) {
    const { length = 8, width = 1.2, position = [0, 0, 0], rotationY = 0, water = true, name = 'drain-channel' } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    group.rotation.y = rotationY;
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, length), this.materials.stoneDark);
      curb.position.set(side * width / 2, 0.02, 0);
      group.add(curb);
    }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, length), this.materials.mortar);
    bed.position.y = -0.14;
    group.add(bed);
    if (water) {
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.88, length * 0.97), this.materials.waterDecal.clone());
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = -0.055;
      surface.name = 'water-surface';
      surface.userData.waveAmplitude = 0.015;
      group.add(surface);
    }
    parent.add(group);
    return group;
  }

  addMetalGrate(parent, options = {}) {
    const { width = 2, depth = 2, position = [0, 0.12, 0], name = 'iron-grate' } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    for (let i = 0; i < 8; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, depth), this.materials.iron);
      bar.position.x = -width / 2 + (i + 0.5) * width / 8;
      group.add(bar);
    }
    for (const z of [-depth / 2, 0, depth / 2]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), this.materials.rust);
      brace.position.z = z;
      group.add(brace);
    }
    parent.add(group);
    return group;
  }

  addStairs(parent, options = {}) {
    const { width = 3, rise = 1.4, run = 3.4, steps = 7, position = [0, 0, 0], rotationY = 0, name = 'stone-stairs' } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    group.rotation.y = rotationY;
    for (let i = 0; i < steps; i += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, rise / steps, run / steps + 0.08), i % 3 ? this.materials.stone : this.materials.stoneLight);
      step.position.set(0, rise * (i + 0.5) / steps, -run / 2 + run * (i + 0.5) / steps);
      group.add(step);
    }
    parent.add(group);
    return group;
  }

  addRubble(parent, options = {}) {
    const { count = 16, radius = 2.6, position = [0, 0.12, 0], name = 'masonry-rubble' } = options;
    const group = namedGroup(name);
    group.position.fromArray(position);
    for (let i = 0; i < count; i += 1) {
      const n = noise2(i, this.seed, this.seed + 71);
      const piece = new THREE.Mesh(
        i % 4 === 0 ? new THREE.TetrahedronGeometry(0.18 + n * 0.25, 0) : new THREE.BoxGeometry(0.22 + n * 0.4, 0.16 + n * 0.24, 0.2 + n * 0.42),
        i % 5 ? this.materials.stone : this.materials.stoneLight
      );
      const angle = i * 2.399963;
      const r = radius * Math.sqrt((i + 0.5) / count);
      piece.position.set(Math.cos(angle) * r, n * 0.18, Math.sin(angle) * r);
      piece.rotation.set(n * 2.1, angle, n * 1.7);
      group.add(piece);
    }
    parent.add(group);
    return group;
  }
}

export function namedGroup(name) {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

export function noise2(x, z, seed = 0) {
  const value = Math.sin((x + seed * 0.17) * 12.9898 + (z - seed * 0.11) * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
