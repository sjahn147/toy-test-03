import { roomFloorId } from '../content/floors/SleepingCitadelFloorContract.js';

const TRAVERSABLE_STATES = new Set(['open', 'working']);
const VALID_STATES = new Set(['open', 'working', 'locked', 'hidden', 'suspected', 'discovered', 'opening', 'blocked', 'webbed', 'inactive', 'sealed', 'ritual-locked', 'damaged', 'collapsed']);

export class VerticalConnectorTopology {
  constructor(connectors = [], rooms = []) {
    this.roomById = new Map((rooms ?? []).map(room => [room.id, room]));
    this.connectors = new Map();
    this.byPair = new Map();
    this.aliases = new Map();
    this.replace(connectors);
  }

  replace(connectors = []) {
    this.connectors.clear();
    this.byPair.clear();
    this.aliases.clear();
    for (const source of connectors ?? []) {
      const connector = normalizeConnector(source, this.roomById);
      if (this.connectors.has(connector.id)) throw new Error(`duplicate vertical connector ${connector.id}`);
      this.connectors.set(connector.id, connector);
      this.byPair.set(pairKey(connector.from.roomId, connector.to.roomId), connector.id);
      for (const alias of connector.legacyRouteIds ?? []) this.aliases.set(alias, connector.id);
    }
    return this;
  }

  all() { return [...this.connectors.values()].map(cloneConnector); }
  active() { return [...this.connectors.values()].filter(item => item.active).map(cloneConnector); }
  activeLinks() { return this.active().map(item => [item.from.roomId, item.to.roomId]); }
  get(idOrAlias) { const item = this.connectors.get(this.resolveId(idOrAlias)); return item ? cloneConnector(item) : null; }
  resolveId(idOrAlias) { return this.connectors.has(idOrAlias) ? idOrAlias : this.aliases.get(idOrAlias) ?? idOrAlias; }

  findBetween(a, b, { includeInactive = false } = {}) {
    const id = this.byPair.get(pairKey(a, b));
    const connector = id ? this.connectors.get(id) : null;
    if (!connector || (!includeInactive && !connector.active)) return null;
    return asConnection(connector, a);
  }

  setState(idOrAlias, state, metadata = {}) {
    const id = this.resolveId(idOrAlias);
    const connector = this.connectors.get(id);
    if (!connector) return { ok: false, error: `unknown vertical connector ${idOrAlias}` };
    const normalizedState = normalizeState(state);
    if (!VALID_STATES.has(normalizedState)) return { ok: false, error: `invalid vertical connector state ${state}` };
    if (connector.state === normalizedState) return { ok: true, changed: false, connector: cloneConnector(connector) };
    const previousState = connector.state;
    connector.state = normalizedState;
    connector.active = TRAVERSABLE_STATES.has(normalizedState);
    connector.visibility = normalizedState === 'hidden' ? 'hidden' : 'known';
    connector.lastTransition = sanitizeMetadata(metadata);
    return { ok: true, changed: true, previousState, state: normalizedState, connector: cloneConnector(connector) };
  }

  snapshot() { return this.all(); }
}

export function isConnectorTraversable(connector) {
  return Boolean(connector && TRAVERSABLE_STATES.has(connector.state ?? connector.initialState));
}

export function connectorStateVocabulary() { return [...VALID_STATES]; }

function normalizeConnector(source, roomById) {
  if (!source?.id || !source?.from?.roomId || !source?.to?.roomId) throw new Error('vertical connector requires id and two room landings');
  const fromRoom = roomById.get(source.from.roomId);
  const toRoom = roomById.get(source.to.roomId);
  if (!fromRoom || !toRoom) throw new Error(`vertical connector ${source.id} references an unknown room`);
  const fromFloorId = source.from.floorId ?? roomFloorId(fromRoom);
  const toFloorId = source.to.floorId ?? roomFloorId(toRoom);
  if (fromFloorId === toFloorId) throw new Error(`vertical connector ${source.id} must connect different floors`);
  const state = normalizeState(source.state ?? source.initialState ?? 'locked');
  if (!VALID_STATES.has(state)) throw new Error(`vertical connector ${source.id} has invalid state ${state}`);
  return {
    ...source,
    id: String(source.id),
    state,
    active: TRAVERSABLE_STATES.has(state),
    capacity: Math.max(1, Number(source.capacity ?? 1)),
    queueCapacity: Math.max(1, Number(source.queueCapacity ?? source.capacity ?? 1)),
    transitTime: Math.max(0.2, Number(source.transitTime ?? 2.4)),
    allowsCargo: source.allowsCargo ?? false,
    allowsLargeActors: Boolean(source.allowsLargeActors),
    from: normalizeLanding(source.from, fromFloorId),
    to: normalizeLanding(source.to, toFloorId),
    legacyRouteIds: [...(source.legacyRouteIds ?? [])],
    lastTransition: source.lastTransition ? { ...source.lastTransition } : null
  };
}

function normalizeLanding(source, floorId) {
  const x = Number(source.position?.x ?? source.arrivalSocket?.x ?? 0);
  const z = Number(source.position?.z ?? source.arrivalSocket?.z ?? 0);
  return {
    ...source,
    floorId,
    position: { x, z },
    arrivalSocket: { x: Number(source.arrivalSocket?.x ?? x), z: Number(source.arrivalSocket?.z ?? z) },
    queueSockets: (source.queueSockets ?? []).map(socket => ({ x: Number(socket.x), z: Number(socket.z) })),
    cameraAnchor: source.cameraAnchor ? { ...source.cameraAnchor } : { x, z, distance: 20 }
  };
}

function asConnection(connector, fromRoomId) {
  const forward = connector.from.roomId === fromRoomId;
  const from = forward ? connector.from : connector.to;
  const to = forward ? connector.to : connector.from;
  return {
    id: connector.id,
    connectorId: connector.id,
    kind: 'vertical-connector',
    type: connector.type,
    state: connector.state,
    active: connector.active,
    aId: from.roomId,
    bId: to.roomId,
    from,
    to,
    length: connector.transitTime,
    transitTime: connector.transitTime,
    capacity: connector.capacity,
    queueCapacity: connector.queueCapacity,
    allowsCargo: connector.allowsCargo,
    allowsLargeActors: connector.allowsLargeActors
  };
}

function normalizeState(state) {
  if (state === 'opened') return 'open';
  if (state === 'closed') return 'locked';
  return String(state ?? 'locked');
}
function pairKey(a, b) { return [String(a), String(b)].sort().join('::'); }
function cloneConnector(connector) { return JSON.parse(JSON.stringify(connector)); }
function sanitizeMetadata(metadata) { return Object.fromEntries(Object.entries(metadata ?? {}).filter(([, value]) => value == null || ['string','number','boolean'].includes(typeof value))); }
