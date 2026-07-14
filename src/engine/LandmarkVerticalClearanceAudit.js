import { THREE } from './ThreeScene.js';
import { roomSurfaceY } from './DungeonTopology.js';

export class LandmarkVerticalClearanceAudit {
  constructor({ scenario, floorHeight = 5.4, headroom = 0.35 } = {}) {
    this.roomById = new Map((scenario?.rooms ?? []).map(room => [room.id, room]));
    this.floorHeight = floorHeight;
    this.headroom = headroom;
    this.signatures = new Map();
    this.conflicts = new Map();
  }

  inspect(landmarkMeshes = new Map(), activeFloorId = null) {
    for (const [key, mesh] of landmarkMeshes ?? []) {
      const roomId = mesh?.userData?.roomId ?? String(key).split(':')[0];
      const room = this.roomById.get(roomId);
      if (!room || (activeFloorId && room.floorId !== activeFloorId)) continue;
      const signature = `${mesh.uuid ?? key}:${mesh.scale?.x ?? 1}:${mesh.scale?.y ?? 1}:${mesh.scale?.z ?? 1}`;
      if (this.signatures.get(key) === signature) continue;
      this.signatures.set(key, signature);
      const result = inspectMesh(mesh, room, this.floorHeight, this.headroom);
      if (result.ok) this.conflicts.delete(key);
      else this.conflicts.set(key, result);
    }
    for (const key of [...this.conflicts.keys()]) if (!landmarkMeshes.has(key)) this.conflicts.delete(key);
    return this.snapshot();
  }

  snapshot() { return [...this.conflicts.values()].map(item => ({ ...item })); }
  destroy() { this.signatures.clear(); this.conflicts.clear(); }
}

export function inspectMesh(mesh, room, floorHeight = 5.4, headroom = 0.35) {
  if (!mesh || typeof THREE.Box3 !== 'function') return { ok:true, roomId:room?.id ?? null, skipped:true };
  try {
    mesh.updateMatrixWorld?.(true);
    const bounds = new THREE.Box3().setFromObject(mesh);
    const floorY = roomSurfaceY(room, floorHeight);
    const visualHeight = bounds.max.y - floorY;
    const budget = floorHeight - headroom;
    return { ok:visualHeight <= budget + 0.001, roomId:room.id, visualHeight, budget, overflow:Math.max(0, visualHeight - budget) };
  } catch {
    return { ok:true, roomId:room?.id ?? null, skipped:true };
  }
}
