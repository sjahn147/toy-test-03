import { THREE } from './ThreeScene.js';

const ROUTE_COLORS = Object.freeze({
  ordinary: 0x8b806d,
  conditional: 0xc98b45,
  secret: 0x66598b
});

export class AuthoredRouteRenderer {
  constructor({ three, assets, parent, topology, roomY }) {
    this.three = three;
    this.assets = assets;
    this.parent = parent;
    this.topology = topology;
    this.roomY = roomY;
    this.groups = new Map();
    this.signatures = new Map();
  }

  build() {
    for (const connection of this.topology.connections) this.rebuild(connection);
  }

  sync(routeSnapshots = []) {
    const byId = new Map((routeSnapshots ?? []).map(route => [route.id, route]));
    for (const connection of this.topology.connections) {
      const snapshot = byId.get(connection.id);
      if (snapshot) {
        connection.state = snapshot.state ?? connection.state;
        connection.active = snapshot.active ?? connection.active;
      }
      const signature = routeSignature(connection);
      if (this.signatures.get(connection.id) !== signature) this.rebuild(connection);
    }
  }

  rebuild(connection) {
    const existing = this.groups.get(connection.id);
    if (existing) {
      this.parent.remove(existing);
      disposeTree(existing);
    }
    const group = this.create(connection);
    this.groups.set(connection.id, group);
    this.signatures.set(connection.id, routeSignature(connection));
    this.parent.add(group);
  }

  create(connection) {
    const group = new THREE.Group();
    group.name = `campaign-route:${connection.id}`;
    group.userData = {
      entityType: 'route',
      routeId: connection.id,
      routeKind: connection.kind,
      routeState: connection.state,
      fromRoomId: connection.aId,
      toRoomId: connection.bId,
      active: connection.active
    };

    const revealCorridor = connection.active === true;
    const revealFrame = connection.kind !== 'secret' || connection.state !== 'hidden';
    const hiddenCover = connection.kind === 'secret' && ['hidden', 'suspected', 'discovered'].includes(connection.state);
    const lockedCover = connection.kind === 'conditional' && ['locked', 'opening'].includes(connection.state);
    const collapsed = connection.state === 'collapsed';

    if (revealCorridor) this.addCorridor(group, connection);
    if (revealFrame) {
      this.addDoorFrame(group, connection, connection.aPort);
      this.addDoorFrame(group, connection, connection.bPort);
    }
    if (hiddenCover || lockedCover) {
      this.addSeal(group, connection, connection.aPort, hiddenCover ? 'hidden' : 'locked');
      this.addSeal(group, connection, connection.bPort, hiddenCover ? 'hidden' : 'locked');
    }
    if (connection.kind !== 'ordinary' && !revealCorridor) this.addRouteMarker(group, connection);
    if (collapsed) this.addCollapseMarker(group, connection);

    group.traverse(node => {
      node.userData ??= {};
      node.userData.entityType ??= 'route';
      node.userData.routeId ??= connection.id;
      node.userData.roomId ??= connection.aId;
    });
    return group;
  }

  addCorridor(group, connection) {
    const aRoom = this.topology.roomById.get(connection.aId);
    const bRoom = this.topology.roomById.get(connection.bId);
    const ay = this.roomY(aRoom);
    const by = this.roomY(bRoom);
    const points = connection.points;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length <= 0.02) continue;
      const segment = this.assets.makeCorridorSegment(length, connection.width);
      const progress = (i + 0.5) / Math.max(1, points.length - 1);
      const yOffsetA = Number.isFinite(a.yOffset) ? a.yOffset : connection.elevation;
      const yOffsetB = Number.isFinite(b.yOffset) ? b.yOffset : connection.elevation;
      segment.position.set(
        (a.x + b.x) / 2,
        ay + (by - ay) * progress + (yOffsetA + yOffsetB) / 2,
        (a.z + b.z) / 2
      );
      segment.rotation.y = -Math.atan2(dz, dx);
      segment.userData.routeSegmentIndex = i;
      group.add(segment);
    }
  }

  addDoorFrame(group, connection, port) {
    if (!port) return;
    const axis = port.side === 'N' || port.side === 'S' ? 'x' : 'z';
    const frame = this.assets.makeDoorFrame(port.width ?? connection.width, axis);
    const room = this.topology.roomById.get(port.roomId);
    frame.position.set(port.x, this.roomY(room) + connection.elevation, port.z);
    frame.name = `route-door:${connection.id}:${port.roomId}`;
    frame.userData.roomId = port.roomId;
    group.add(frame);
  }

  addSeal(group, connection, port, mode) {
    if (!port) return;
    const horizontal = port.side === 'N' || port.side === 'S';
    const material = new THREE.MeshStandardMaterial({
      color: mode === 'hidden' ? 0x45414a : 0x6d4c31,
      roughness: 0.9,
      metalness: mode === 'locked' ? 0.18 : 0.02
    });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? (port.width ?? connection.width) : 0.22, 1.7, horizontal ? 0.22 : (port.width ?? connection.width)),
      material
    );
    const room = this.topology.roomById.get(port.roomId);
    slab.position.set(port.x, this.roomY(room) + 0.86 + connection.elevation, port.z);
    slab.name = mode === 'hidden' ? 'secret-wall-cover' : 'conditional-route-seal';
    slab.userData.roomId = port.roomId;
    group.add(slab);

    if (mode === 'locked') {
      const sigil = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.035, 6, 20),
        new THREE.MeshStandardMaterial({ color: 0xd6a35f, emissive: 0x5d3517, emissiveIntensity: 0.45, roughness: 0.45 })
      );
      sigil.rotation.x = Math.PI / 2;
      sigil.rotation.y = horizontal ? 0 : Math.PI / 2;
      sigil.position.copy(slab.position);
      sigil.position.x += port.normalX * 0.13;
      sigil.position.z += port.normalZ * 0.13;
      sigil.name = 'conditional-route-lock-sigil';
      sigil.userData.roomId = port.roomId;
      group.add(sigil);
    }
  }

  addRouteMarker(group, connection) {
    const point = connection.points[Math.floor(connection.points.length / 2)];
    const color = ROUTE_COLORS[connection.kind] ?? ROUTE_COLORS.ordinary;
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.055, 6, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(point.x, connection.elevation + 0.1, point.z);
    marker.name = `${connection.kind}-route-marker`;
    group.add(marker);
  }

  addCollapseMarker(group, connection) {
    const point = connection.points[Math.floor(connection.points.length / 2)];
    const material = new THREE.MeshStandardMaterial({ color: 0x4b4038, roughness: 1 });
    for (let i = 0; i < 5; i += 1) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 2) * 0.08, 0), material);
      stone.position.set(point.x + (i - 2) * 0.28, connection.elevation + 0.16 + (i % 2) * 0.09, point.z + ((i % 3) - 1) * 0.24);
      stone.name = 'collapsed-route-stone';
      group.add(stone);
    }
  }

  destroy() {
    for (const group of this.groups.values()) {
      this.parent.remove(group);
      disposeTree(group);
    }
    this.groups.clear();
    this.signatures.clear();
  }
}

function routeSignature(connection) {
  return `${connection.kind}:${connection.state}:${connection.active}:${connection.elevation}`;
}

function disposeTree(root) {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
