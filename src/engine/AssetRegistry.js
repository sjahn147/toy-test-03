import { THREE } from './ThreeScene.js';
import { MiniatureFactory } from './MiniatureFactory.js';
import { createHeroEffect } from './heroes/HeroTelegraphRenderer.js';

export const ROOM_COLORS = {
  start: 0x4f6d7a,
  hall: 0x6b5b48,
  treasure: 0x8a6a2b,
  crypt: 0x595b6d,
  trap: 0x6e3f3d,
  lair: 0x4c5a38,
  nest: 0x445f35,
  hatchery: 0x6f5d42,
  shrine: 0x6d648e,
  armory: 0x687077,
  pantry: 0x66513a,
  stairs: 0x3f4f61,
  gate: 0x523a68
};

const FLOOR_THICKNESS = 0.32;
const WALL_HEIGHT = 0.92;
const WALL_THICKNESS = 0.34;

export class AssetRegistry {
  constructor() {
    this.manifest = null;
    this.status = 'fallback';
    this.miniatures = new MiniatureFactory();
  }

  async loadManifest(url = './assets/manifest.json') {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      this.manifest = await response.json();
      this.status = 'manifest-loaded';
    } catch (error) {
      console.warn('[AssetRegistry] Using procedural modular assets:', error);
      this.status = 'fallback';
    }
    return this;
  }

  makeRoomFloor(room) {
    const group = new THREE.Group();
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(room.w, FLOOR_THICKNESS, room.d),
      new THREE.MeshStandardMaterial({
        color: ROOM_COLORS[room.kind] ?? 0x555555,
        roughness: 0.86,
        metalness: 0.01
      })
    );
    slab.position.y = -FLOOR_THICKNESS / 2;

    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.4, room.w - 0.28), 0.035, Math.max(0.4, room.d - 0.28)),
      new THREE.MeshStandardMaterial({
        color: lightenHex(ROOM_COLORS[room.kind] ?? 0x555555, 0.08),
        roughness: 0.9
      })
    );
    inset.position.y = 0.018;
    group.add(slab, inset);
    return group;
  }

  makeWallSegment(length, axis = 'x') {
    const group = new THREE.Group();
    const wall = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS)
        : new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, length),
      new THREE.MeshStandardMaterial({ color: 0x252435, roughness: 0.9 })
    );
    wall.position.y = WALL_HEIGHT / 2;

    const cap = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(length + 0.04, 0.08, WALL_THICKNESS + 0.08)
        : new THREE.BoxGeometry(WALL_THICKNESS + 0.08, 0.08, length + 0.04),
      new THREE.MeshStandardMaterial({ color: 0x4a4356, roughness: 0.72 })
    );
    cap.position.y = WALL_HEIGHT + 0.04;
    group.add(wall, cap);
    return group;
  }

  makeDoorFrame(width = 1.5, axis = 'x') {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x61586a, roughness: 0.78 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x765037, roughness: 0.72 });
    const postGeometry = axis === 'x'
      ? new THREE.BoxGeometry(0.18, 1.12, 0.38)
      : new THREE.BoxGeometry(0.38, 1.12, 0.18);

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, stone);
      if (axis === 'x') post.position.set(side * width / 2, 0.56, 0);
      else post.position.set(0, 0.56, side * width / 2);
      group.add(post);
    }

    const lintel = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(width + 0.36, 0.18, 0.42)
        : new THREE.BoxGeometry(0.42, 0.18, width + 0.36),
      stone
    );
    lintel.position.y = 1.08;

    const threshold = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(width, 0.055, 0.52)
        : new THREE.BoxGeometry(0.52, 0.055, width),
      wood
    );
    threshold.position.y = 0.028;
    group.add(lintel, threshold);
    return group;
  }

  makeCorridorSegment(length, width = 1.5) {
    const group = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.24, width),
      new THREE.MeshStandardMaterial({ color: 0x3a3342, roughness: 0.92 })
    );
    floor.position.y = -0.12;

    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.1, length - 0.04), 0.025, Math.max(0.3, width - 0.28)),
      new THREE.MeshStandardMaterial({ color: 0x51485c, roughness: 0.88 })
    );
    inset.position.y = 0.014;

    const curbGeometry = new THREE.BoxGeometry(length, 0.16, 0.12);
    const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2632, roughness: 0.9 });
    const left = new THREE.Mesh(curbGeometry, curbMaterial);
    const right = new THREE.Mesh(curbGeometry, curbMaterial);
    left.position.set(0, 0.08, -width / 2 + 0.06);
    right.position.set(0, 0.08, width / 2 - 0.06);
    group.add(floor, inset, left, right);
    return group;
  }

  makeRoomMarker(room, color) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(room.w, room.d) * 0.27, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
    );
    marker.rotation.x = Math.PI / 2;
    return marker;
  }

  makeAgent(agent) {
    return this.miniatures.create(agent);
  }

  makeEffect(effect) {
    const heroEffect = createHeroEffect(effect);
    if (heroEffect) return heroEffect;
    const group = new THREE.Group();
    group.userData.effectType = effect.type;

    if (effect.type === 'attack') {
      for (const angle of [-0.55, 0.55]) {
        const slash = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 1.15),
          new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.92 })
        );
        slash.rotation.y = angle;
        slash.rotation.z = angle;
        group.add(slash);
      }
    } else if (effect.type === 'death') {
      const burst = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.54, 1),
        new THREE.MeshBasicMaterial({ color: 0xee746c, wireframe: true, transparent: true, opacity: 0.9 })
      );
      group.add(burst);
    } else if (effect.type === 'gold') {
      for (let i = 0; i < 5; i += 1) {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.035, 10),
          new THREE.MeshStandardMaterial({ color: 0xe8c46a, metalness: 0.35, roughness: 0.28 })
        );
        coin.rotation.x = Math.PI / 2;
        coin.position.set((i - 2) * 0.16, (i % 2) * 0.12, 0);
        group.add(coin);
      }
    } else if (effect.type === 'heal') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.045, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0x9ee0a3, transparent: true, opacity: 0.88 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    return group;
  }

  makeProp(prop) {
    if (prop.type === 'trap') {
      return new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.16, 5),
        new THREE.MeshStandardMaterial({ color: 0xbd3d38, roughness: 0.7 })
      );
    }

    if (prop.type === 'armory') {
      const group = new THREE.Group();
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.35, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xa9b2ba, metalness: 0.25, roughness: 0.38 })
      );
      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.9, 4),
        new THREE.MeshStandardMaterial({ color: 0xe6edf2, metalness: 0.45, roughness: 0.25 })
      );
      blade.rotation.z = Math.PI / 2;
      blade.position.set(0, 0.42, 0);
      group.add(rack, blade);
      return group;
    }

    if (prop.type === 'shrine') {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.6, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xb6a5ff, roughness: 0.52 })
      );
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xf1eaff })
      );
      light.position.y = 0.62;
      group.add(base, light);
      return group;
    }

    const group = new THREE.Group();
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.65, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x8a542c, roughness: 0.75 })
    );
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.18, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe8c46a, roughness: 0.45 })
    );
    lid.position.y = 0.42;
    group.add(chest, lid);
    return group;
  }
}

function lightenHex(hex, amount) {
  const r = Math.min(255, ((hex >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((hex >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (hex & 255) + Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}
