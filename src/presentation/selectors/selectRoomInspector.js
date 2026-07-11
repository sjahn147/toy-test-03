// room inspector selector (surface.inspector.room).

const SECRET_TAG = 'secret_route';

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function index(state, name) {
  const records = state?.indexes?.[name];
  return records && typeof records === 'object' ? records : {};
}

// 어댑터 세대에 따라 connection endpoint 필드가 다를 수 있어 방어적으로 해석.
function connectionEndpoints(connection) {
  if (!connection || typeof connection !== 'object') return null;
  if (Array.isArray(connection.roomIds) && connection.roomIds.length >= 2) {
    return [connection.roomIds[0], connection.roomIds[1]];
  }
  if (connection.a != null && connection.b != null) return [connection.a, connection.b];
  if (connection.from != null && connection.to != null) return [connection.from, connection.to];
  return null;
}

export function selectRoomInspector(state, roomId) {
  if (typeof roomId !== 'string' || roomId.length === 0) return null;
  const room = table(state, 'rooms')[roomId];
  if (!room || typeof room !== 'object') return null;

  const agents = table(state, 'agents');
  const props = table(state, 'props');
  const tags = Array.isArray(room.tags) ? [...room.tags] : [];

  const identity = {
    id: roomId,
    name: typeof room.name === 'string' ? room.name : roomId,
    kind: typeof room.kind === 'string' ? room.kind : null
  };
  const zoneCode = room.zoneCode ?? room.code ?? null;
  if (typeof zoneCode === 'string' && zoneCode.length > 0) identity.zoneCode = zoneCode;

  const occupants = (index(state, 'agentsByRoom')[roomId] ?? [])
    .map(agentId => {
      const agent = agents[agentId];
      if (!agent) return null;
      return {
        id: agentId,
        name: typeof agent.name === 'string' ? agent.name : agentId,
        role: agent.role ?? agent.kind ?? null
      };
    })
    .filter(Boolean);

  const roomProps = (index(state, 'propsByRoom')[roomId] ?? [])
    .map(propId => {
      const prop = props[propId];
      if (!prop) return null;
      return {
        id: propId,
        type: prop.type ?? null,
        label: prop.label ?? prop.name ?? propId
      };
    })
    .filter(Boolean);

  const connections = [];
  for (const connection of Object.values(table(state, 'connections'))) {
    const endpoints = connectionEndpoints(connection);
    if (!endpoints) continue;
    const [a, b] = endpoints;
    if (a === roomId && !connections.includes(b)) connections.push(b);
    else if (b === roomId && !connections.includes(a)) connections.push(a);
  }

  const result = {
    identity,
    size: {
      w: typeof room.w === 'number' ? room.w : 0,
      d: typeof room.d === 'number' ? room.d : 0
    },
    tags,
    occupants,
    props: roomProps,
    connections,
    secret: tags.includes(SECRET_TAG)
  };

  const factionId = room.ownership?.factionId
    ?? room.factionId
    ?? room.ownerFactionId
    ?? null;
  const control = room.ownership?.control ?? room.control ?? null;
  if (factionId !== null || typeof control === 'number') {
    result.ownership = {
      factionId,
      control: typeof control === 'number' ? control : null
    };
  }

  return result;
}
