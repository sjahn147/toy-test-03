const ROUTE_STATES = Object.freeze({
  ordinary: new Set(['open', 'blocked', 'barricaded', 'collapsed', 'flooded', 'webbed']),
  conditional: new Set(['locked', 'opening', 'opened', 'collapsed']),
  secret: new Set(['hidden', 'suspected', 'discovered', 'opened', 'collapsed'])
});

const TRAVERSABLE = Object.freeze({
  ordinary: new Set(['open']),
  conditional: new Set(['opened']),
  secret: new Set(['opened'])
});

export class ActiveCampaignGraph {
  constructor(routes = [], { initialStates = null } = {}) {
    this.routes = new Map();
    this.listeners = new Set();
    this.version = 0;
    this.graph = new Map();
    this.replaceRoutes(routes, { initialStates, silent: true });
  }

  replaceRoutes(routes, { initialStates = null, silent = false } = {}) {
    const next = new Map();
    for (const source of routes ?? []) {
      const route = normalizeRoute(source, initialStates?.[source.id]);
      if (next.has(route.id)) throw new Error(`duplicate campaign route id ${route.id}`);
      next.set(route.id, route);
    }
    this.routes = next;
    this.rebuild({ silent });
    return this;
  }

  getRoute(routeId) {
    const route = this.routes.get(routeId);
    return route ? cloneRoute(route) : null;
  }

  allRoutes() {
    return [...this.routes.values()].map(cloneRoute);
  }

  activeRoutes() {
    return [...this.routes.values()].filter(route => route.active).map(cloneRoute);
  }

  activeLinks() {
    return [...this.routes.values()].filter(route => route.active).map(route => [route.from, route.to]);
  }

  neighbors(roomId) {
    return [...(this.graph.get(roomId) ?? [])];
  }

  hasActiveConnection(a, b) {
    return this.neighbors(a).includes(b);
  }

  findActiveRoute(a, b) {
    for (const route of this.routes.values()) {
      if (!route.active) continue;
      if ((route.from === a && route.to === b) || (route.from === b && route.to === a)) return cloneRoute(route);
    }
    return null;
  }

  setRouteState(routeId, state, metadata = {}) {
    const route = this.routes.get(routeId);
    if (!route) return { ok: false, error: `unknown route ${routeId}` };
    const allowed = ROUTE_STATES[route.kind];
    if (!allowed?.has(state)) return { ok: false, error: `invalid ${route.kind} route state ${state}` };
    if (route.state === state) return { ok: true, changed: false, route: cloneRoute(route), version: this.version };
    const previousState = route.state;
    route.state = state;
    route.active = isTraversable(route.kind, state);
    route.lastTransition = sanitizeMetadata(metadata);
    this.rebuild({ reason: 'route-state', routeId, previousState, state });
    return { ok: true, changed: true, route: cloneRoute(route), version: this.version };
  }

  snapshot() {
    return [...this.routes.values()].map(route => ({
      id: route.id,
      from: route.from,
      to: route.to,
      kind: route.kind,
      state: route.state,
      active: route.active,
      condition: route.condition ?? null,
      width: route.width,
      elevation: route.elevation,
      points: route.points.map(point => ({ ...point })),
      ports: clonePorts(route.ports),
      lastTransition: route.lastTransition ? { ...route.lastTransition } : null
    }));
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('route graph listener must be a function');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  rebuild(meta = {}) {
    const graph = new Map();
    for (const route of this.routes.values()) {
      if (!graph.has(route.from)) graph.set(route.from, new Set());
      if (!graph.has(route.to)) graph.set(route.to, new Set());
      if (!route.active) continue;
      graph.get(route.from).add(route.to);
      graph.get(route.to).add(route.from);
    }
    this.graph = graph;
    this.version += 1;
    if (!meta.silent) {
      const event = { type: 'campaign-route-graph-rebuilt', version: this.version, ...meta };
      for (const listener of this.listeners) listener(event);
    }
  }
}

export function isRouteTraversable(route) {
  if (!route) return false;
  return isTraversable(route.kind ?? 'ordinary', route.state ?? route.defaultState ?? 'open');
}

export function routeStateVocabulary(kind) {
  return [...(ROUTE_STATES[kind] ?? [])];
}

function normalizeRoute(source, initialState) {
  if (!source || typeof source !== 'object') throw new Error('campaign route must be an object');
  const id = String(source.id ?? '');
  const from = String(source.from ?? source.a ?? '');
  const to = String(source.to ?? source.b ?? '');
  const kind = source.kind ?? 'ordinary';
  if (!id || !from || !to) throw new Error('campaign route requires id, from and to');
  if (!ROUTE_STATES[kind]) throw new Error(`unsupported campaign route kind ${kind}`);
  const state = initialState ?? source.state ?? source.defaultState ?? (kind === 'ordinary' ? 'open' : kind === 'conditional' ? 'locked' : 'hidden');
  if (!ROUTE_STATES[kind].has(state)) throw new Error(`invalid initial ${kind} route state ${state}`);
  return {
    ...source,
    id,
    from,
    to,
    kind,
    state,
    active: isTraversable(kind, state),
    width: Number.isFinite(source.width) ? source.width : 1.5,
    elevation: Number.isFinite(source.elevation) ? source.elevation : 0,
    points: (source.points ?? []).map(point => ({ x: Number(point.x), z: Number(point.z), ...(Number.isFinite(point.yOffset) ? { yOffset: point.yOffset } : {}) })),
    ports: clonePorts(source.ports),
    lastTransition: null
  };
}

function isTraversable(kind, state) {
  return TRAVERSABLE[kind]?.has(state) ?? false;
}

function cloneRoute(route) {
  return {
    ...route,
    points: route.points.map(point => ({ ...point })),
    ports: clonePorts(route.ports),
    lastTransition: route.lastTransition ? { ...route.lastTransition } : null
  };
}

function clonePorts(ports) {
  if (!ports || typeof ports !== 'object') return {};
  return Object.fromEntries(Object.entries(ports).map(([roomId, port]) => [roomId, { ...port }]));
}

function sanitizeMetadata(metadata) {
  const result = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) result[key] = value;
  }
  return result;
}
