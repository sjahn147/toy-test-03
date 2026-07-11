import { THREE } from '../engine/ThreeScene.js';

const MODES = new Set(['normal', 'territory', 'supply', 'danger']);

export class StrategicOverlayLayer {
  constructor({ group, scenario } = {}) {
    if (!group) throw new Error('StrategicOverlayLayer requires a Three.js group');
    this.group = group;
    this.scenario = scenario;
    this.mode = 'normal';
    this.meshes = new Map();
    this.rooms = new Map((scenario?.rooms ?? []).map(room => [room.id, room]));
  }

  render({ active = 'normal', rooms = [] } = {}) {
    const mode = MODES.has(active) ? active : 'normal';
    this.mode = mode;
    if (mode === 'normal') return this.clear();
    const live = new Set();
    for (const datum of rooms) {
      const room = this.rooms.get(datum.roomId);
      if (!room) continue;
      const key = `${mode}:${room.id}`;
      live.add(key);
      const signature = overlaySignature(mode, datum);
      let entry = this.meshes.get(key);
      if (!entry || entry.signature !== signature) {
        if (entry) this.remove(key, entry.mesh);
        const mesh = createOverlayMesh(mode, room, datum);
        mesh.userData.overlayMode = mode;
        mesh.userData.roomId = room.id;
        this.group.add(mesh);
        entry = { mesh, signature };
        this.meshes.set(key, entry);
      }
      const floor = Number(room.floor ?? 0);
      entry.mesh.position.set(room.x, floor * 2.85 + 0.09, room.z);
    }
    for (const [key, entry] of [...this.meshes]) if (!live.has(key)) this.remove(key, entry.mesh);
  }

  clear() {
    for (const [key, entry] of [...this.meshes]) this.remove(key, entry.mesh);
  }

  remove(key, mesh) {
    this.group.remove(mesh);
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    this.meshes.delete(key);
  }

  destroy() { this.clear(); }
}

function createOverlayMesh(mode, room, datum) {
  const color = overlayColor(mode, datum);
  const intensity = Math.max(0.08, Math.min(1, Number(datum.intensity ?? 0)));
  const opacity = mode === 'territory' && !datum.ownerId ? 0.04 : 0.12 + intensity * 0.34;
  const geometry = new THREE.PlaneGeometry(Math.max(1, room.w * 0.9), Math.max(1, room.d * 0.9));
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 15;
  return mesh;
}

function overlayColor(mode, datum) {
  if (mode === 'territory') return factionColor(datum.ownerId, datum.contested);
  if (mode === 'supply') return datum.blocked ? 0xd76355 : datum.risk > 0.55 ? 0xe0a34b : 0x5fc6a0;
  if (mode === 'danger') return datum.critical ? 0xe95050 : datum.intensity > 0.4 ? 0xe69b45 : 0xc8b45c;
  return 0xffffff;
}

function factionColor(id, contested) {
  if (contested) return 0xe0a34b;
  if (!id) return 0x59606f;
  let hash = 2166136261;
  for (const char of String(id)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  const palette = [0x5b8fd6, 0xd26a73, 0x71b67b, 0xa27bd1, 0xd3a455, 0x55b9b1];
  return palette[Math.abs(hash) % palette.length];
}

function overlaySignature(mode, datum) {
  return JSON.stringify([mode, datum.ownerId, datum.contested, Math.round(Number(datum.intensity ?? 0) * 10), datum.blocked, Math.round(Number(datum.risk ?? 0) * 10), datum.critical]);
}
