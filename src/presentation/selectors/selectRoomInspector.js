import { selectWorldTaskActions } from './selectWorldTaskActions.js';

// room inspector selector (surface.inspector.room).

const SECRET_TAGS = new Set(['secret-route', 'secret_route']);
const RESOURCE_KEYS = ['food', 'water', 'medicine', 'materials', 'wealth', 'scrap', 'metal', 'wood', 'biomass', 'corpses', 'bones'];

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function index(state, name) {
  const records = state?.indexes?.[name];
  return records && typeof records === 'object' ? records : {};
}

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
  const zoneCode = room.zoneCode ?? room.code ?? room.zoneId ?? null;
  if (typeof zoneCode === 'string' && zoneCode.length > 0) identity.zoneCode = zoneCode;

  const occupants = (index(state, 'agentsByRoom')[roomId] ?? [])
    .map(agentId => {
      const agent = agents[agentId];
      if (!agent) return null;
      return {
        id: agentId,
        name: typeof agent.name === 'string' ? agent.name : agentId,
        role: agent.role ?? agent.kind ?? null,
        factionId: normalizedFactionId(agent),
        hp: numeric(agent.hp),
        maxHp: numeric(agent.maxHp)
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
        label: prop.label ?? prop.name ?? propId,
        state: prop.state ?? (prop.opened ? 'opened' : null)
      };
    })
    .filter(Boolean);

  const connections = [];
  const routes = [];
  for (const connection of Object.values(table(state, 'connections'))) {
    const endpoints = connectionEndpoints(connection);
    if (!endpoints) continue;
    const [a, b] = endpoints;
    if (a !== roomId && b !== roomId) continue;
    const otherRoomId = a === roomId ? b : a;
    if (!connections.includes(otherRoomId)) connections.push(otherRoomId);
    const kind = connection.kind ?? connection.routeKind ?? inferRouteKind(connection.id, connection.tags);
    routes.push({
      id: connection.id ?? `${a}--${b}`,
      otherRoomId,
      kind,
      state: connection.state ?? connection.routeState ?? defaultRouteState(kind),
      hidden: connection.hidden === true || kind === 'secret' && connection.discovered !== true,
      locked: connection.locked === true || connection.state === 'locked',
      width: numeric(connection.width)
    });
  }

  const factionId = room.ownership?.factionId
    ?? room.factionId
    ?? room.ownerFactionId
    ?? null;
  const control = room.ownership?.control ?? room.control ?? null;
  const contested = room.ownership?.contested ?? room.contested ?? false;
  const visualState = room.visualState ?? room.stateVariant ?? room.state ?? null;
  const resources = collectResources(room);
  const secret = tags.some(tag => SECRET_TAGS.has(tag)) || routes.some(route => route.kind === 'secret');
  const hostileOccupants = factionId
    ? occupants.filter(occupant => occupant.factionId && occupant.factionId !== factionId).length
    : 0;

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
    routes,
    secret,
    visited: room.visited === true,
    status: {
      visualState,
      settlementState: room.settlementState ?? room.innFacilityState ?? null,
      tier: room.innTier ?? room.tier ?? null,
      contested,
      danger: numeric(room.danger ?? room.dangerLevel ?? room.routeRisk),
      hostileOccupants
    },
    resources,
    story: {
      discovered: room.storyDiscovered === true || room.discovered === true,
      note: room.storyText ?? room.storyNote ?? null,
      clueCount: numeric(room.clueCount ?? room.storyClues)
    }
  };

  if (factionId !== null || typeof control === 'number' || contested) {
    result.ownership = {
      factionId,
      control: typeof control === 'number' ? control : null,
      contested: Boolean(contested)
    };
  }

  const taskSurface = selectWorldTaskActions(state, { type: 'room', id: roomId, roomId, label: identity.name });
  result.actions = taskSurface.actions;
  result.tasks = taskSurface.tasks;
  return result;
}

function collectResources(room) {
  const resources = {};
  const source = room.resources && typeof room.resources === 'object' ? room.resources : room;
  for (const key of RESOURCE_KEYS) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) resources[key] = value;
  }
  return resources;
}

function inferRouteKind(id, tags) {
  const text = `${id ?? ''} ${(tags ?? []).join?.(' ') ?? ''}`.toLowerCase();
  if (text.includes('secret')) return 'secret';
  if (text.includes('conditional') || text.includes('locked')) return 'conditional';
  return 'ordinary';
}

function defaultRouteState(kind) {
  if (kind === 'secret') return 'authored-secret';
  if (kind === 'conditional') return 'locked';
  return 'open';
}

function numeric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizedFactionId(agent) {
  if (agent?.faction === 'party') return 'adventurer-expedition';
  return agent?.factionId ?? agent?.ecologyFaction ?? (agent?.faction !== 'dungeon' ? agent?.faction : null) ?? null;
}
