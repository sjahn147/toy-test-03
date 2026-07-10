const DOOR_WIDTH = 1.5;
const PORT_CLEARANCE = 0.9;

export function buildDungeonTopology(rooms, links) {
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const roomPorts = new Map(rooms.map(room => [room.id, []]));
  const connections = [];
  const connectionByPair = new Map();

  for (let index = 0; index < links.length; index += 1) {
    const raw = links[index];
    const aId = Array.isArray(raw) ? raw[0] : raw.a;
    const bId = Array.isArray(raw) ? raw[1] : raw.b;
    const a = roomById.get(aId);
    const b = roomById.get(bId);
    if (!a || !b) continue;

    const aPort = choosePort(a, b, `${aId}:${bId}:a`);
    const bPort = choosePort(b, a, `${aId}:${bId}:b`);
    const points = buildOrthogonalPath(aPort, bPort);
    const connection = {
      id: `connection-${index}-${aId}-${bId}`,
      aId,
      bId,
      aPort,
      bPort,
      width: DOOR_WIDTH,
      points,
      length: polylineLength(points)
    };

    connections.push(connection);
    roomPorts.get(aId).push(aPort);
    roomPorts.get(bId).push(bPort);
    connectionByPair.set(pairKey(aId, bId), connection);
  }

  return { roomById, roomPorts, connections, connectionByPair };
}

export function findConnection(topology, aId, bId) {
  return topology.connectionByPair.get(pairKey(aId, bId)) ?? null;
}

export function sampleConnection(connection, progress) {
  const t = clamp(progress, 0, 1);
  if (!connection?.points?.length) return { x: 0, z: 0, tx: 1, tz: 0 };
  if (connection.points.length === 1) {
    const point = connection.points[0];
    return { x: point.x, z: point.z, tx: 1, tz: 0 };
  }

  const targetDistance = connection.length * t;
  let travelled = 0;
  for (let i = 0; i < connection.points.length - 1; i += 1) {
    const a = connection.points[i];
    const b = connection.points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (travelled + length >= targetDistance || i === connection.points.length - 2) {
      const local = length > 0 ? (targetDistance - travelled) / length : 0;
      return {
        x: a.x + dx * clamp(local, 0, 1),
        z: a.z + dz * clamp(local, 0, 1),
        tx: length > 0 ? dx / length : 1,
        tz: length > 0 ? dz / length : 0
      };
    }
    travelled += length;
  }

  const last = connection.points[connection.points.length - 1];
  return { x: last.x, z: last.z, tx: 1, tz: 0 };
}

export function roomSurfaceY(room, floorHeight = 2.85) {
  return (room.floor ?? 0) * floorHeight;
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

function polylineLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  }
  return Math.max(total, 0.01);
}

function pairKey(aId, bId) {
  return [aId, bId].sort().join('::');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
