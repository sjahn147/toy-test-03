import { THREE } from './ThreeScene.js';

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

export const ROLE_COLORS = {
  fighter: 0xd65f4c,
  rogue: 0xe8c46a,
  cleric: 0xd7e9ff,
  wizard: 0x9b87ff,
  goblin: 0x8ed06f,
  skeleton: 0xd8d5c4,
  slime: 0x79d1b0,
  mimic: 0xa66b3f
};

export class AssetRegistry {
  constructor() {
    this.manifest = null;
    this.status = 'fallback';
  }

  async loadManifest(url = './assets/manifest.json') {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      this.manifest = await response.json();
      this.status = 'manifest-loaded';
    } catch (error) {
      console.warn('[AssetRegistry] Using primitive fallback assets:', error);
      this.status = 'fallback';
    }
    return this;
  }

  makeRoomFloor(room) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(room.w, 0.35, room.d),
      new THREE.MeshStandardMaterial({
        color: ROOM_COLORS[room.kind] ?? 0x555555,
        roughness: 0.82,
        metalness: 0.02
      })
    );
  }

  makeWall(w, d) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.9, d),
      new THREE.MeshStandardMaterial({ color: 0x252435, roughness: 0.88 })
    );
  }

  makeCorridor(width, depth, isStair = false) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.22, depth),
      new THREE.MeshStandardMaterial({
        color: isStair ? 0x55647a : 0x3a3342,
        roughness: isStair ? 0.75 : 0.9
      })
    );
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
    const group = new THREE.Group();
    const color = ROLE_COLORS[agent.role] ?? 0xffffff;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 0.72, 4, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.62 })
    );
    body.position.y = 0.15;
    group.add(body);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.035, 6, 20),
      new THREE.MeshBasicMaterial({ color: agent.faction === 'party' ? 0x88c7ff : 0xff8e73 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.46;
    group.add(ring);

    const hpBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x330b0b })
    );
    hpBack.position.set(0, 1.12, 0);
    group.add(hpBack);

    const hp = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.07, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x9ee0a3 })
    );
    hp.name = 'hp';
    hp.position.set(0, 1.12, 0.01);
    group.add(hp);

    const badge = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: roleBadgeColor(agent.role) })
    );
    badge.position.set(0.28, 0.72, 0.12);
    group.add(badge);

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
      return new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.35, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xa9b2ba, metalness: 0.25, roughness: 0.38 })
      );
    }

    if (prop.type === 'shrine') {
      return new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.6, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xb6a5ff, roughness: 0.52 })
      );
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

function roleBadgeColor(role) {
  if (role === 'fighter') return 0xffa199;
  if (role === 'rogue') return 0xffeb95;
  if (role === 'cleric') return 0xffffff;
  if (role === 'wizard') return 0xc7bcff;
  if (role === 'goblin') return 0xb6ff95;
  if (role === 'skeleton') return 0xf2efd8;
  if (role === 'slime') return 0x9fffd8;
  if (role === 'mimic') return 0xe2a36a;
  return 0xffffff;
}
