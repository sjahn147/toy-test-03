export const DEFAULT_FLOOR_HEIGHT = 5.4;

const DOOR_WIDTH = 1.5;
const PORT_CLEARANCE = 0.9;

export function buildDungeonTopology(rooms, linksOrRoutes, options = {}) {
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const roomPorts = new Map(rooms.map(room => [room.id, []]));
  const connections = [];
  const connectionByPair = new Map();
  const connectionById = new Map();
  const routes = normalizeRoutes(linksOrRoutes);
  const authored = routes.some(route => route.authored);

  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    if (!options.includeInactive && route.active === false) continue;
    const a = roomById.get(route.aId);
    const b = roomById.get(route.bId);
    if (!a || !b) continue;

    const connection = route.authored
      ? buildAuthoredConnection(route, a, b, index)
      : buildGeneratedConnection(route, a, b, index);

    connections.push(connection);
    connectionById.set(connection.id, connection);
    if (!connectionByPair.has(pairKey(connection.aId, connection.bId)) || connection.active) {
      connectionByPair.set(pairKey(connection.aId, connection.bId), connection);
    }
    addUniquePort(roomPorts.get(connection.aId), connection.aPort);
    addUniquePort(roomPorts.get(connection.bId), connection.bPort);
  }

  return { roomById, roomPorts, connections, connectionByPair, connectionById, authored };
}

export function findConnection(topology, aId, bId) {
  return topology.connectionByPair.get(pairKey(aId, bId)) ?? null;
}

export function sampleConnection(connection, progress) {
  const t = clamp(progress, 0, 1);
  if (!connection?.points?.length) return { x: 0, z: 0, tx: 1, tz: 0, yOffset: connection?.elevation ?? 0 };
  if (connection.points.length === 1) {
    const point = connection.points[0];
    return { x: point.x, z: point.z, tx: 1, tz: 0, yOffset: pointY(point, connection) };
  }

  const targetDistance = connection.length * t;
  let travelled = 0;
  for (let i = 0; i < connection.points.length - 1; i += 1) {
    const a = connection.points[i];
    const b = connection.points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dy = pointY(b, connection) - pointY(a, connection);
    const length = Math.hypot(dx, dz, dy);
    if (travelled + length >= targetDistance || i === connection.points.length - 2) {
      const local = length > 0 ? (targetDistance - travelled) / length : 0;
      const clamped = clamp(local, 0, 1);
      return {
        x: a.x + dx * clamped,
        z: a.z + dz * clamped,
        tx: length > 0 ? dx / Math.max(0.001, Math.hypot(dx, dz)) : 1,
        tz: length > 0 ? dz / Math.max(0.001, Math.hypot(dx, dz)) : 0,
        yOffset: pointY(a, connection) + dy * clamped
      };
    }
    travelled += length;
  }

  const last = connection.points[connection.points.length - 1];
  return { x: last.x, z: last.z, tx: 1, tz: 0, yOffset: pointY(last, connection) };
}

export function roomSurfaceY(room, floorHeight = DEFAULT_FLOOR_HEIGHT) {
  return (room?.floor ?? 0) * floorHeight;
}

export function connectionSurfaceY(connection, topology, progress, floorHeight = DEFAULT_FLOOR_HEIGHT) {
  const t = clamp(progress, 0, 1);
  const aRoom = topology?.roomById?.get?.(connection?.aId) ?? null;
  const bRoom = topology?.roomById?.get?.(connection?.bId) ?? null;
  const ay = roomSurfaceY(aRoom, floorHeight);
  const by = roomSurfaceY(bRoom, floorHeight);
  const sample = sampleConnection(connection, t);
  return ay + (by - ay) * t + (Number.isFinite(sample?.yOffset) ? sample.yOffset : 0);
}

export function connectionProgressAtPoint(connection, point) {
  const points = connection?.points ?? [];
  if (points.length < 2 || !point) return 0.5;
  const lengths = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = Math.hypot(points[index + 1].x - points[index].x, points[index + 1].z - points[index].z);
    lengths.push(length);
    total += length;
  }
  if (total <= 0.0001) return 0.5;
  let best = { distance: Infinity, progress: 0.5 };
  let travelled = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const local = lengthSq > 0 ? clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq, 0, 1) : 0;
    const x = a.x + dx * local;
    const z = a.z + dz * local;
    const distance = Math.hypot(point.x - x, point.z - z);
    if (distance < best.distance) best = { distance, progress: (travelled + lengths[index] * local) / total };
    travelled += lengths[index];
  }
  return clamp(best.progress, 0, 1);
}

function normalizeRoutes(linksOrRoutes = []) {
  return linksOrRoutes.map((raw, index) => {
    if (Array.isArray(raw)) {
      return { id: `connection-${index}-${raw[0]}-${raw[1]}`, aId: raw[0], bId: raw[1], authored: false, active: true };
    }
    const aId = raw.from ?? raw.a ?? raw.aId;
    const bId = raw.to ?? raw.b ?? raw.bId;
    return {
      ...raw,
      id: raw.id ?? `connection-${index}-${aId}-${bId}`,
      aId,
      bId,
      authored: Array.isArray(raw.points) && raw.points.length >= 2 && Boolean(raw.ports),
      active: raw.active !== false
    };
  });
}

function buildAuthoredConnection(route, a, b, index) {
  const aPort = normalizeAuthoredPort(route.ports?.[a.id], a, route.id, 'a');
  const bPort = normalizeAuthoredPort(route.ports?.[b.id], b, route.id, 'b');
  const elevation = Number.isFinite(route.elevation) ? route.elevation : 0;
  const points = route.points.map(point => ({
    x: Number(point.x),
    z: Number(point.z),
    ...(Number.isFinite(point.yOffset) ? { yOffset: point.yOffset } : {})
  }));
  return {
    id: route.id ?? `connection-${index}-${a.id}-${b.id}`,
    aId: a.id,
    bId: b.id,
    aPort,
    bPort,
    width: Number.isFinite(route.width) ? route.width : DOOR_WIDTH,
    points,
    length: polylineLength(points, elevation),
    elevation,
    kind: route.kind ?? 'ordinary',
    state: route.state ?? route.defaultState ?? 'open',
    active: route.active !== false,
    condition: route.condition ?? null,
    routeType: route.routeType ?? 'campaign-transition',
    modules: (route.modules ?? []).map(module => ({
      ...module,
      position: module?.position ? { x: Number(module.position.x), z: Number(module.position.z) } : null
    })),
    vertical: Boolean(route.vertical),
    fromFloor: Number.isFinite(route.fromFloor) ? route.fromFloor : (a.floor ?? 0),
    toFloor: Number.isFinite(route.toFloor) ? route.toFloor : (b.floor ?? 0),
    authored: true
  };
}

function buildGeneratedConnection(route, a, b, index) {
  const aPort = choosePort(a, b, `${a.id}:${b.id}:a`);
  const bPort = choosePort(b, a, `${a.id}:${b.id}:b`);
  const points = buildOrthogonalPath(aPort, bPort);
  return {
    id: route.id ?? `connection-${index}-${a.id}-${b.id}`,
    aId: a.id,
    bId: b.id,
    aPort,
    bPort,
    width: Number.isFinite(route.width) ? route.width : DOOR_WIDTH,
    points,
    length: polylineLength(points, 0),
    elevation: 0,
    kind: route.kind ?? 'ordinary',
    state: route.state ?? 'open',
    active: route.active !== false,
    condition: route.condition ?? null,
    authored: false
  };
}

function normalizeAuthoredPort(source, room, routeId, suffix) {
  if (!source) throw new Error(`authored route ${routeId} is missing a port for ${room.id}`);
  return {
    id: `${routeId}:${suffix}`,
    roomId: room.id,
    side: source.side,
    x: Number(source.x),
    z: Number(source.z),
    normalX: Number(source.normalX ?? 0),
    normalZ: Number(source.normalZ ?? 0),
    width: Number.isFinite(source.width) ? source.width : DOOR_WIDTH
  };
}

function addUniquePort(list, port) {
  if (!list) return;
  const duplicate = list.some(existing => existing.side === port.side && Math.abs(existing.x - port.x) < 0.02 && Math.abs(existing.z - port.z) < 0.02);
  if (!duplicate) list.push(port);
}

function choosePort(room, target, id) {
  const dx = target.x - room.x;
  const dz = target.z - room.z;
  const horizontal = Math.abs(dx) >= Math.abs(dz);
  let side;
  let x;
  let z;
  let normalX = 0;
  let normalZ = 0;

  if (horizontal) {
    side = dx >= 0 ? 'E' : 'W';
    normalX = dx >= 0 ? 1 : -1;
    x = room.x + normalX * room.w / 2;
    z = room.z + clamp(dz, -room.d / 2 + PORT_CLEARANCE, room.d / 2 - PORT_CLEARANCE);
  } else {
    side = dz >= 0 ? 'S' : 'N';
    normalZ = dz >= 0 ? 1 : -1;
    z = room.z + normalZ * room.d / 2;
    x = room.x + clamp(dx, -room.w / 2 + PORT_CLEARANCE, room.w / 2 - PORT_CLEARANCE);
  }

  return { id, roomId: room.id, side, x, z, normalX, normalZ, width: DOOR_WIDTH };
}

function buildOrthogonalPath(a, b) {
  const aOut = { x: a.x + a.normalX * 0.75, z: a.z + a.normalZ * 0.75 };
  const bOut = { x: b.x + b.normalX * 0.75, z: b.z + b.normalZ * 0.75 };
  const points = [{ x: a.x, z: a.z }, aOut];

  if (Math.abs(aOut.x - bOut.x) > 0.01 && Math.abs(aOut.z - bOut.z) > 0.01) {
    if (a.side === 'E' || a.side === 'W') {
      const midX = (aOut.x + bOut.x) / 2;
      points.push({ x: midX, z: aOut.z }, { x: midX, z: bOut.z });
    } else {
      const midZ = (aOut.z + bOut.z) / 2;
      points.push({ x: aOut.x, z: midZ }, { x: bOut.x, z: midZ });
    }
  }

  points.push(bOut, { x: b.x, z: b.z });
  return removeDuplicatePoints(points);
}

function removeDuplicatePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return Math.hypot(point.x - previous.x, point.z - previous.z) > 0.01;
  });
}

function polylineLength(points, elevation) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].z - points[i].z,
      pointY(points[i + 1], { elevation }) - pointY(points[i], { elevation })
    );
  }
  return Math.max(total, 0.01);
}

function pointY(point, connection) {
  return Number.isFinite(point?.yOffset) ? point.yOffset : (connection?.elevation ?? 0);
}

function pairKey(aId, bId) {
  return [aId, bId].sort().join('::');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
