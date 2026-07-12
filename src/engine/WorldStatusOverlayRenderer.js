import { THREE } from './ThreeScene.js';
import { factionColor } from './TerritoryAssetFactory.js';

const ACTIVE_ACTIVITY_SOURCES = new Set(['camp-life', 'operations', 'strategic-expansion']);

export class WorldStatusOverlayRenderer {
  constructor({ group, roomY }) {
    this.group = group;
    this.roomY = roomY;
    this.controlFields = new Map();
    this.supplyRoutes = new Map();
    this.activityBeacons = new Map();
  }

  render(snapshot, time) {
    const rooms = new Map((snapshot.rooms ?? []).map(room => [room.id, room]));
    this.renderControlFields(snapshot.territory?.rooms ?? [], rooms, time);
    this.renderSupplyRoutes(snapshot.logistics?.cargo ?? [], rooms, time);
    this.renderActivityBeacons(snapshot.agents ?? [], rooms, time);
  }

  renderControlFields(states, rooms, time) {
    const visible = states.filter(state => state.owner && (state.control ?? 0) > 4);
    const live = new Set(visible.map(state => state.roomId));
    this.removeMissing(this.controlFields, live);
    for (const state of visible) {
      const room = rooms.get(state.roomId);
      if (!room) continue;
      const signature = `${state.owner}:${Boolean(state.contested)}:${state.challenger ?? ''}`;
      let entry = this.controlFields.get(state.roomId);
      if (!entry || entry.signature !== signature) {
        if (entry) this.removeEntry(entry);
        entry = { mesh: createControlField(state), signature };
        this.controlFields.set(state.roomId, entry);
        this.group.add(entry.mesh);
      }
      const strength = Math.max(0.08, Math.min(1, (state.control ?? 0) / 100));
      const radius = Math.min(room.w, room.d) * (0.23 + strength * 0.14);
      const pulse = state.contested ? 1 + Math.sin(time * 5.5 + hash(state.roomId) * 8) * 0.07 : 1;
      entry.mesh.position.set(room.x, this.roomY(room) + 0.024, room.z);
      entry.mesh.scale.setScalar(radius * pulse);
      entry.mesh.rotation.z = state.contested ? time * 0.18 : 0;
      entry.mesh.traverse(node => {
        if (!node.material) return;
        node.material.opacity = state.contested ? 0.19 + Math.sin(time * 7) * 0.05 : 0.08 + strength * 0.12;
      });
    }
  }

  renderSupplyRoutes(cargoItems, rooms, time) {
    const routed = cargoItems.filter(cargo => cargo.state === 'carried' && Array.isArray(cargo.route) && cargo.route.length > 1);
    const live = new Set(routed.map(cargo => cargo.id));
    this.removeMissing(this.supplyRoutes, live);
    for (const cargo of routed) {
      const signature = `${cargo.route.join('>')}:${cargo.factionId}:${Boolean(cargo.routeCut)}:${Math.round((cargo.routeRisk ?? 0) * 5)}`;
      let entry = this.supplyRoutes.get(cargo.id);
      if (!entry || entry.signature !== signature) {
        if (entry) this.removeEntry(entry);
        const mesh = createSupplyRoute(cargo, rooms, this.roomY);
        if (!mesh) continue;
        entry = { mesh, signature };
        this.supplyRoutes.set(cargo.id, entry);
        this.group.add(mesh);
      }
      const opacity = cargo.routeCut ? 0.25 + Math.sin(time * 8) * 0.18 : 0.34 + Math.sin(time * 2.4 + hash(cargo.id) * 5) * 0.08;
      entry.mesh.material.opacity = Math.max(0.08, opacity);
      entry.mesh.material.dashOffset = -time * (cargo.routeCut ? 0.16 : 0.42);
    }
  }

  renderActivityBeacons(agents, rooms, time) {
    const active = agents.filter(agent => agent.alive && !agent.hidden && !agent.departed && agent.activity && ACTIVE_ACTIVITY_SOURCES.has(agent.activity.source));
    const live = new Set(active.map(agent => agent.id));
    this.removeMissing(this.activityBeacons, live);
    for (const agent of active) {
      const activity = agent.activity;
      const room = rooms.get(activity.roomId ?? activity.targetRoomId ?? agent.roomId);
      if (!room) continue;
      const signature = `${activity.source}:${activity.type}`;
      let entry = this.activityBeacons.get(agent.id);
      if (!entry || entry.signature !== signature) {
        if (entry) this.removeEntry(entry);
        entry = { mesh: createActivityBeacon(activity, agent), signature };
        this.activityBeacons.set(agent.id, entry);
        this.group.add(entry.mesh);
      }
      const anchor = activity.anchor ?? {};
      const progress = Number.isFinite(activity.progress) ? activity.progress : 0;
      entry.mesh.position.set(room.x + (anchor.ox ?? 0), this.roomY(room) + 0.86 + Math.sin(time * 3.2 + hash(agent.id) * 4) * 0.06, room.z + (anchor.oz ?? 0));
      entry.mesh.rotation.y = time * 0.7;
      entry.mesh.scale.setScalar(0.78 + Math.max(0, Math.min(1, progress)) * 0.22);
    }
  }

  removeMissing(map, live) {
    for (const [key, entry] of map) {
      if (live.has(key)) continue;
      this.removeEntry(entry);
      map.delete(key);
    }
  }

  removeEntry(entry) {
    this.group.remove(entry.mesh);
    disposeTree(entry.mesh);
  }

  destroy() {
    for (const map of [this.controlFields, this.supplyRoutes, this.activityBeacons]) {
      for (const entry of map.values()) this.removeEntry(entry);
      map.clear();
    }
  }
}

function createControlField(state) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: factionColor(state.owner), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  group.add(disc);
  if (state.contested) {
    const challenger = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.96, 32, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: factionColor(state.challenger), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    challenger.rotation.x = -Math.PI / 2;
    challenger.position.y = 0.004;
    group.add(challenger);
  }
  return group;
}

function createSupplyRoute(cargo, rooms, roomY) {
  const points = cargo.route.map(roomId => rooms.get(roomId)).filter(Boolean).map(room => new THREE.Vector3(room.x, roomY(room) + 0.13, room.z));
  if (points.length < 2) return null;
  const risk = Math.max(0, Math.min(1, cargo.routeRisk ?? 0));
  const color = cargo.routeCut ? 0xd05a4f : risk > 0.55 ? 0xe0a354 : factionColor(cargo.factionId);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.4, dashSize: 0.36, gapSize: 0.22, depthWrite: false }));
  line.computeLineDistances();
  return line;
}

function createActivityBeacon(activity, agent) {
  const group = new THREE.Group();
  const color = activity.source === 'operations' ? 0xe0bd68 : activity.source === 'strategic-expansion' ? 0xd66d55 : agent.faction === 'party' ? 0x74b9e6 : factionColor(agent.ecologyFaction);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false }));
  pointer.position.y = -0.16;
  pointer.rotation.z = Math.PI;
  group.add(ring, pointer);
  return group;
}

function disposeTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}
