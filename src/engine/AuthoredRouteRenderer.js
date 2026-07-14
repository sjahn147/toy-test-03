import { THREE } from './ThreeScene.js';
import { connectionSurfaceY, connectionProgressAtPoint, DEFAULT_FLOOR_HEIGHT } from './DungeonTopology.js';

const ROUTE_COLORS = Object.freeze({
  ordinary: 0x8b806d,
  conditional: 0xc98b45,
  secret: 0x66598b
});

export class AuthoredRouteRenderer {
  constructor({ three, assets, parent, topology, roomY, floorHeight = DEFAULT_FLOOR_HEIGHT }) {
    this.three = three;
    this.assets = assets;
    this.parent = parent;
    this.topology = topology;
    this.roomY = roomY;
    this.floorHeight = floorHeight;
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
      active: connection.active,
      worldInteractionHidden: connection.kind === 'secret' && connection.state === 'hidden'
    };

    const revealCorridor = connection.active === true;
    const undiscoveredSecret = connection.kind === 'secret' && connection.state === 'hidden';
    if (undiscoveredSecret) group.userData.pickable = false;
    const revealFrame = connection.kind !== 'secret' || connection.state !== 'hidden';
    const hiddenCover = connection.kind === 'secret' && ['hidden', 'suspected', 'discovered'].includes(connection.state);
    const lockedCover = connection.kind === 'conditional' && ['locked', 'opening'].includes(connection.state);
    const collapsed = connection.state === 'collapsed';

    if (revealCorridor) {
      this.addCorridor(group, connection);
      this.addCorridorModules(group, connection);
    }
    if (revealFrame) {
      this.addDoorFrame(group, connection, connection.aPort);
      this.addDoorFrame(group, connection, connection.bPort);
    }
    if (hiddenCover || lockedCover) {
      this.addSeal(group, connection, connection.aPort, hiddenCover ? 'hidden' : 'locked');
      this.addSeal(group, connection, connection.bPort, hiddenCover ? 'hidden' : 'locked');
    }
    if (connection.kind !== 'ordinary' && !revealCorridor && !undiscoveredSecret) this.addRouteMarker(group, connection);
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
    const points = connection.points;
    const trim = Math.min(0.72, Math.max(0.18, connection.width * 0.24));
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length <= 0.02) continue;
      const ux = dx / length;
      const uz = dz / length;
      const trimStart = i > 0 ? Math.min(trim, length * 0.45) : 0;
      const trimEnd = i < points.length - 2 ? Math.min(trim, length * 0.45) : 0;
      const startX = a.x + ux * trimStart;
      const startZ = a.z + uz * trimStart;
      const endX = b.x - ux * trimEnd;
      const endZ = b.z - uz * trimEnd;
      const visibleLength = Math.hypot(endX - startX, endZ - startZ);
      if (visibleLength <= 0.04) continue;
      const segment = this.assets.makeCorridorSegment(length, connection.width);
      const progress = (i + 0.5) / Math.max(1, points.length - 1);
      segment.position.set(
        (startX + endX) / 2,
        this.routeY(connection, progress),
        (startZ + endZ) / 2
      );
      segment.rotation.y = -Math.atan2(dz, dx);
      segment.scale.x = visibleLength / Math.max(0.001, length);
      segment.userData.routeSegmentIndex = i;
      group.add(segment);
    }
    for (let i = 1; i < points.length - 1; i += 1) {
      const point = points[i];
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.42, connection.width + 0.08), 0.24, Math.max(0.42, connection.width + 0.08)),
        new THREE.MeshStandardMaterial({ color: 0x3a3342, roughness: 0.92 })
      );
      cap.position.set(point.x, this.routeY(connection, i / Math.max(1, points.length - 1)) - 0.12, point.z);
      cap.name = `route-turn-cap:${connection.id}:${i}`;
      group.add(cap);
    }
  }

  addCorridorModules(group, connection) {
    const aRoom = this.topology.roomById.get(connection.aId);
    const bRoom = this.topology.roomById.get(connection.bId);
    const tone = routeTone(connection.routeType);
    for (let index = 0; index < (connection.modules ?? []).length; index += 1) {
      const module = connection.modules[index];
      const point = module?.position;
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) continue;
      const marker = new THREE.Group();
      marker.name = `corridor-module:${connection.id}:${index}`;
      marker.userData.routeId = connection.id;
      marker.userData.routeModuleIndex = index;

      const material = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.88, metalness: connection.routeType?.includes('industrial') ? 0.18 : 0.04 });
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.18), material.clone());
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.18), material.clone());
      const beam = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.4, connection.width + 0.65), 0.16, 0.18), material.clone());
      left.position.set(-Math.max(0.8, connection.width * 0.55), 0.62, 0);
      right.position.set(Math.max(0.8, connection.width * 0.55), 0.62, 0);
      beam.position.y = 1.22;
      marker.add(left, right, beam);

      if (connection.routeType?.includes('fungal')) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7fb6a3, transparent: true, opacity: 0.62 }));
        cap.scale.set(1.4, 0.45, 1.4);
        cap.position.set(0, 1.05, 0.16);
        marker.add(cap);
      } else if (connection.routeType?.includes('ossuary') || connection.routeType?.includes('funeral')) {
        const niche = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 10), new THREE.MeshBasicMaterial({ color: 0xa697bb, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        niche.position.set(0, 0.72, 0.12);
        marker.add(niche);
      } else {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe0b86c, transparent: true, opacity: 0.72 }));
        lamp.position.set(0, 1.08, 0.12);
        marker.add(lamp);
      }

      const progress = connectionProgressAtPoint(connection, point);
      marker.position.set(point.x, this.routeY(connection, progress) + 0.02, point.z);
      marker.rotation.y = corridorHeading(connection.points, point);
      group.add(marker);
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
    marker.position.set(point.x, this.routeY(connection, 0.5) + 0.1, point.z);
    marker.name = `${connection.kind}-route-marker`;
    group.add(marker);
  }

  addCollapseMarker(group, connection) {
    const point = connection.points[Math.floor(connection.points.length / 2)];
    const material = new THREE.MeshStandardMaterial({ color: 0x4b4038, roughness: 1 });
    for (let i = 0; i < 5; i += 1) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 2) * 0.08, 0), material);
      stone.position.set(point.x + (i - 2) * 0.28, this.routeY(connection, 0.5) + 0.16 + (i % 2) * 0.09, point.z + ((i % 3) - 1) * 0.24);
      stone.name = 'collapsed-route-stone';
      group.add(stone);
    }
  }

  routeY(connection, progress) {
    const aRoom = this.topology.roomById.get(connection.aId);
    const bRoom = this.topology.roomById.get(connection.bId);
    const inferredHeight = Math.abs((aRoom?.floor ?? 0) - (bRoom?.floor ?? 0)) > 0
      ? Math.abs(this.roomY(aRoom) - this.roomY(bRoom)) / Math.abs((aRoom?.floor ?? 0) - (bRoom?.floor ?? 0))
      : this.floorHeight;
    return connectionSurfaceY(connection, this.topology, progress, inferredHeight);
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
  return `${connection.kind}:${connection.state}:${connection.active}:${connection.elevation}:${connection.routeType}:${connection.modules?.length ?? 0}`;
}

function routeTone(routeType = '') {
  if (routeType.includes('industrial')) return 0x6f6253;
  if (routeType.includes('market') || routeType.includes('inn')) return 0x806a4f;
  if (routeType.includes('fungal')) return 0x58746a;
  if (routeType.includes('silk')) return 0x745969;
  if (routeType.includes('ossuary') || routeType.includes('funeral')) return 0x6c6477;
  if (routeType.includes('royal') || routeType.includes('sanctum')) return 0x73665f;
  return 0x70675c;
}

function corridorHeading(points, point) {
  let best = null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const distance = pointToSegmentDistance(point.x, point.z, a.x, a.z, b.x, b.z);
    if (!best || distance < best.distance) best = { distance, heading: -Math.atan2(b.z - a.z, b.x - a.x) };
  }
  return best?.heading ?? 0;
}

function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= 0.0001) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function disposeTree(root) {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
