import { floorByRoom, roomFloorId } from '../content/floors/SleepingCitadelFloorContract.js';

export class FloorSceneManager {
  constructor({ root, scenario, activeFloorId = null } = {}) {
    if (!root || !scenario) throw new Error('FloorSceneManager requires root and scenario');
    this.root = root;
    this.scenario = scenario;
    this.roomFloor = floorByRoom(scenario);
    this.activeFloorId = activeFloorId ?? scenario.floors?.[0]?.id ?? roomFloorId(scenario.rooms?.[0]);
    this.index = new Map();
    this.reindex();
    this.apply();
  }

  reindex() {
    this.index.clear();
    this.root.traverse?.(node => {
      if (node === this.root) return;
      const floorId = this.resolveNodeFloor(node);
      if (!floorId) return;
      const list = this.index.get(floorId) ?? new Set();
      list.add(node);
      this.index.set(floorId, list);
      node.userData ??= {};
      node.userData.floorId = floorId;
    });
    return this;
  }

  setActiveFloor(floorId) {
    if (!floorId || floorId === this.activeFloorId) return false;
    this.activeFloorId = floorId;
    this.apply();
    return true;
  }

  apply() {
    this.root.traverse?.(node => {
      if (node === this.root) return;
      const floorId = node.userData?.floorId ?? this.resolveNodeFloor(node);
      if (!floorId) return;
      const transitionVisible = Boolean(node.userData?.floorTransitionVisible);
      node.visible = floorId === this.activeFloorId || transitionVisible;
      if (node.userData) node.userData.worldInteractionHidden = !node.visible;
    });
  }

  resolveNodeFloor(node) {
    const data = node.userData ?? {};
    if (data.floorId) return data.floorId;
    if (String(data.entityType ?? '').startsWith('vertical-connector')) return null;
    if (data.roomId && this.roomFloor.has(data.roomId)) return this.roomFloor.get(data.roomId);
    if (data.fromRoomId && this.roomFloor.has(data.fromRoomId)) return this.roomFloor.get(data.fromRoomId);
    if (data.toRoomId && this.roomFloor.has(data.toRoomId)) return this.roomFloor.get(data.toRoomId);
    let parent = node.parent;
    while (parent && parent !== this.root) {
      const parentData = parent.userData ?? {};
      if (parentData.floorId) return parentData.floorId;
      if (parentData.roomId && this.roomFloor.has(parentData.roomId)) return this.roomFloor.get(parentData.roomId);
      parent = parent.parent;
    }
    return null;
  }

  visibleNodeCount() {
    let count = 0;
    this.root.traverse?.(node => { if (node !== this.root && node.visible !== false) count += 1; });
    return count;
  }

  destroy() { this.index.clear(); }
}
