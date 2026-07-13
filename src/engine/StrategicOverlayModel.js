export const OVERLAY_MODES = Object.freeze([
  'world',
  'territory',
  'supply',
  'danger',
  'population',
  'resources',
  'infection',
  'secrets',
  'path-intent'
]);

export const OVERLAY_LABELS = Object.freeze({
  world: 'World',
  territory: 'Territory',
  supply: 'Supply',
  danger: 'Danger',
  population: 'Population',
  resources: 'Resources',
  infection: 'Infection',
  secrets: 'Secrets',
  'path-intent': 'Path intent'
});

const HOSTILE_ROLES = new Set(['goblin', 'skeleton', 'slime', 'ogre', 'zombie', 'wraith', 'spider', 'stirge', 'carrion', 'parasite', 'rat', 'orc']);
const RESOURCE_PROP_TYPES = new Set(['territory_resource', 'treasure', 'supply_depot', 'powder-magazine']);
const ACTIVE_TASK_STATES = new Set(['queued', 'moving', 'working', 'blocked']);

export function normalizeOverlayMode(mode) {
  return OVERLAY_MODES.includes(mode) ? mode : 'world';
}

export function cycleOverlayMode(mode, direction = 1) {
  const current = OVERLAY_MODES.indexOf(normalizeOverlayMode(mode));
  return OVERLAY_MODES[(current + Math.sign(direction || 1) + OVERLAY_MODES.length) % OVERLAY_MODES.length];
}

export function deriveStrategicOverlay(snapshot = {}, mode = 'world', context = {}) {
  const normalizedMode = normalizeOverlayMode(mode);
  const rooms = array(snapshot.rooms);
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const agents = array(snapshot.agents);
  const props = array(snapshot.props);
  const routes = array(snapshot.routes);
  const territoryStates = array(snapshot.territory?.rooms);
  const settlements = array(snapshot.settlement?.settlements);
  const cargo = array(snapshot.logistics?.cargo);
  const tasks = collectTasks(snapshot);
  const sieges = array(snapshot.construction?.sieges);

  const model = {
    mode: normalizedMode,
    label: OVERLAY_LABELS[normalizedMode],
    roomMarkers: [],
    routeMarkers: [],
    pointMarkers: [],
    legend: [],
    summary: ''
  };

  if (normalizedMode === 'world') {
    appendWorld(model, tasks, roomById);
  } else if (normalizedMode === 'territory') {
    appendTerritory(model, territoryStates, roomById);
  } else if (normalizedMode === 'supply') {
    appendSupply(model, cargo, settlements, routes, roomById);
  } else if (normalizedMode === 'danger') {
    appendDanger(model, agents, territoryStates, sieges, routes, roomById);
  } else if (normalizedMode === 'population') {
    appendPopulation(model, agents, roomById);
  } else if (normalizedMode === 'resources') {
    appendResources(model, props, settlements, roomById);
  } else if (normalizedMode === 'infection') {
    appendInfection(model, agents, rooms, roomById);
  } else if (normalizedMode === 'secrets') {
    appendSecrets(model, routes, tasks, roomById);
  } else if (normalizedMode === 'path-intent') {
    appendPathIntent(model, agents, cargo, tasks, routes, roomById, context);
  }

  model.summary = summarize(model);
  return model;
}

function appendWorld(model, tasks, roomById) {
  const active = tasks.filter(task => ACTIVE_TASK_STATES.has(task.state ?? task.status));
  for (const task of active) {
    const roomId = task.targetRoomId ?? task.roomId;
    if (!roomById.has(roomId)) continue;
    model.pointMarkers.push({
      id: `task:${task.id}`,
      roomId,
      kind: 'task',
      intensity: progressOf(task),
      label: task.label ?? task.actionId ?? 'Active task',
      state: task.state ?? task.status ?? 'active'
    });
  }
  model.legend = [
    legend('task', 'Active field task', 'beacon'),
    legend('world', 'Physical map remains primary', 'none')
  ];
}

function appendTerritory(model, states, roomById) {
  for (const state of states) {
    if (!state.owner || !roomById.has(state.roomId)) continue;
    model.roomMarkers.push({
      id: `territory:${state.roomId}`,
      roomId: state.roomId,
      kind: state.contested ? 'territory-contested' : 'territory',
      factionId: state.owner,
      challengerId: state.challenger ?? null,
      intensity: clamp01((state.control ?? 0) / 100),
      label: `${state.owner}${state.contested ? ' · contested' : ''}`
    });
  }
  model.legend = [
    legend('territory', 'Controlled territory', 'solid disc'),
    legend('territory-contested', 'Contested territory', 'split ring')
  ];
}

function appendSupply(model, cargo, settlements, routes, roomById) {
  for (const item of cargo) {
    if (item.state !== 'carried' || !Array.isArray(item.route) || item.route.length < 2) continue;
    model.routeMarkers.push({
      id: `cargo:${item.id}`,
      kind: item.routeCut ? 'supply-cut' : (item.routeRisk ?? 0) > 0.55 ? 'supply-risk' : 'supply',
      roomPath: item.route.filter(roomId => roomById.has(roomId)),
      factionId: item.factionId ?? null,
      intensity: clamp01(item.routeRisk ?? 0),
      label: `${item.resourceType ?? 'cargo'}${item.routeCut ? ' · route cut' : ''}`
    });
  }
  for (const settlement of settlements) {
    if (!roomById.has(settlement.roomId)) continue;
    model.pointMarkers.push({
      id: `supply-settlement:${settlement.id}`,
      roomId: settlement.roomId,
      kind: settlement.supplyStatus === 'blockaded' ? 'supply-blockaded' : settlement.supplyStatus === 'threatened' ? 'supply-threatened' : 'supply-node',
      intensity: clamp01(settlement.supplyEfficiency ?? 1),
      label: settlement.name ?? settlement.id
    });
  }
  for (const route of routes) {
    if (route.active || route.kind === 'ordinary') continue;
    if (!['blocked', 'collapsed', 'flooded', 'webbed'].includes(route.state)) continue;
    model.routeMarkers.push(routeMarker(route, 'supply-obstruction', roomById));
  }
  model.legend = [
    legend('supply', 'Open supply route', 'moving dashed line'),
    legend('supply-risk', 'Risky supply route', 'amber dashed line'),
    legend('supply-cut', 'Cut or blockaded route', 'broken red line')
  ];
}

function appendDanger(model, agents, territoryStates, sieges, routes, roomById) {
  const byRoom = groupBy(agents.filter(isActiveAgent), agent => agent.travel?.toRoomId ?? agent.roomId);
  const territoryByRoom = new Map(territoryStates.map(state => [state.roomId, state]));
  const siegeRooms = new Set(sieges.filter(siege => siege.active).map(siege => siege.roomId));
  for (const [roomId, members] of byRoom) {
    if (!roomById.has(roomId)) continue;
    const hostiles = members.filter(agent => agent.faction !== 'party' && (agent.ecologyFaction || HOSTILE_ROLES.has(agent.role))).length;
    const downed = members.filter(agent => agent.downed || !agent.alive).length;
    const state = territoryByRoom.get(roomId);
    const intensity = clamp01(hostiles * 0.16 + downed * 0.12 + (state?.contested ? 0.35 : 0) + (siegeRooms.has(roomId) ? 0.45 : 0));
    if (intensity <= 0) continue;
    model.roomMarkers.push({
      id: `danger:${roomId}`,
      roomId,
      kind: siegeRooms.has(roomId) ? 'danger-siege' : state?.contested ? 'danger-contested' : 'danger',
      intensity,
      count: hostiles,
      label: `${hostiles} hostile${hostiles === 1 ? '' : 's'}${siegeRooms.has(roomId) ? ' · active siege' : ''}`
    });
  }
  for (const route of routes) {
    if (route.active || route.state === 'hidden') continue;
    model.routeMarkers.push(routeMarker(route, 'danger-route', roomById));
  }
  model.legend = [
    legend('danger', 'Hostile concentration', 'crossed ring'),
    legend('danger-contested', 'Contested room', 'pulsing ring'),
    legend('danger-siege', 'Active siege', 'double cross')
  ];
}

function appendPopulation(model, agents, roomById) {
  const byRoom = groupBy(agents.filter(isActiveAgent), agent => agent.travel?.toRoomId ?? agent.roomId);
  for (const [roomId, members] of byRoom) {
    if (!roomById.has(roomId) || members.length === 0) continue;
    const parties = members.filter(agent => agent.faction === 'party').length;
    const dungeon = members.length - parties;
    model.roomMarkers.push({
      id: `population:${roomId}`,
      roomId,
      kind: 'population',
      intensity: clamp01(members.length / 12),
      count: members.length,
      partyCount: parties,
      dungeonCount: dungeon,
      label: `${members.length} present · ${parties} adventurer · ${dungeon} dungeon`
    });
  }
  model.legend = [
    legend('population', 'Population column', 'height = count'),
    legend('population-party', 'Adventurer share', 'upper band')
  ];
}

function appendResources(model, props, settlements, roomById) {
  for (const prop of props) {
    if (!RESOURCE_PROP_TYPES.has(prop.type) && prop.resourceType == null) continue;
    if (!roomById.has(prop.roomId)) continue;
    model.pointMarkers.push({
      id: `resource:${prop.id}`,
      roomId: prop.roomId,
      kind: 'resource',
      resourceType: prop.resourceType ?? prop.type,
      intensity: clamp01((prop.stock ?? prop.amount ?? 1) / 12),
      count: prop.stock ?? prop.amount ?? null,
      label: prop.label ?? prop.resourceType ?? prop.type
    });
  }
  for (const settlement of settlements) {
    if (!roomById.has(settlement.roomId)) continue;
    const total = ['food', 'water', 'medicine', 'materials', 'wealth'].reduce((sum, key) => sum + Math.max(0, Number(settlement[key] ?? 0)), 0);
    if (total <= 0) continue;
    model.pointMarkers.push({
      id: `stock:${settlement.id}`,
      roomId: settlement.roomId,
      kind: 'resource-stockpile',
      intensity: clamp01(total / 40),
      count: total,
      label: `${settlement.name ?? settlement.id} stockpile`
    });
  }
  model.legend = [
    legend('resource', 'Harvestable resource', 'diamond'),
    legend('resource-stockpile', 'Settlement stockpile', 'stacked diamond')
  ];
}

function appendInfection(model, agents, rooms, roomById) {
  const byRoom = new Map();
  for (const agent of agents.filter(isActiveAgent)) {
    const affected = agent.infected || agent.hosted || agent.attachedToId || agent.carryingHostId || (agent.sporeSleep ?? 0) > 0;
    if (!affected) continue;
    const roomId = agent.travel?.toRoomId ?? agent.roomId;
    byRoom.set(roomId, (byRoom.get(roomId) ?? 0) + 1);
  }
  for (const room of rooms) {
    const state = String(room.visualState ?? room.stateVariant ?? room.state ?? '');
    const environmental = /(fungal|spore|webbed|infested|parasite|blight|ruptured|void)/i.test(state) || (room.tags ?? []).some(tag => /(fungal|spider|infection|parasite|spore)/i.test(tag));
    const count = byRoom.get(room.id) ?? 0;
    if (!environmental && count === 0) continue;
    model.roomMarkers.push({
      id: `infection:${room.id}`,
      roomId: room.id,
      kind: environmental ? 'infection-environment' : 'infection-agent',
      intensity: clamp01(0.2 + count * 0.2 + (environmental ? 0.35 : 0)),
      count,
      label: `${count} affected${environmental ? ' · environmental source' : ''}`
    });
  }
  model.legend = [
    legend('infection-agent', 'Affected creatures', 'double ring'),
    legend('infection-environment', 'Environmental source', 'spore halo')
  ];
}

function appendSecrets(model, routes, tasks, roomById) {
  for (const route of routes.filter(route => route.kind === 'secret')) {
    if (route.state === 'hidden') continue;
    model.routeMarkers.push(routeMarker(route, route.active ? 'secret-open' : route.state === 'suspected' ? 'secret-suspected' : 'secret-discovered', roomById));
  }
  for (const task of tasks) {
    if (!String(task.actionId ?? '').includes('route') && !String(task.actionId ?? '').includes('secret')) continue;
    const roomId = task.targetRoomId ?? task.roomId;
    if (!roomById.has(roomId)) continue;
    model.pointMarkers.push({
      id: `secret-task:${task.id}`,
      roomId,
      kind: 'secret-search',
      intensity: progressOf(task),
      label: task.label ?? task.actionId
    });
  }
  model.legend = [
    legend('secret-suspected', 'Suspected passage', 'faint dotted line'),
    legend('secret-discovered', 'Discovered passage', 'dotted line'),
    legend('secret-open', 'Opened secret route', 'solid violet line')
  ];
}

function appendPathIntent(model, agents, cargo, tasks, routes, roomById, context) {
  const selectedId = context.followAgentId ?? context.selection?.id ?? context.agentId ?? null;
  const agent = agents.find(candidate => candidate.id === selectedId) ?? null;
  if (!agent) {
    model.legend = [legend('path-none', 'Select or follow an agent', 'no path')];
    return;
  }
  const routeByPair = new Map();
  for (const route of routes) {
    routeByPair.set(pairKey(route.from, route.to), route);
  }
  if (agent.travel?.fromRoomId && agent.travel?.toRoomId) {
    const route = routeByPair.get(pairKey(agent.travel.fromRoomId, agent.travel.toRoomId));
    if (route) model.routeMarkers.push(routeMarker(route, 'path-current', roomById));
    else model.routeMarkers.push({ id: `path:${agent.id}`, kind: 'path-current', roomPath: [agent.travel.fromRoomId, agent.travel.toRoomId], intensity: agent.travel.progress ?? 0, label: 'Current movement' });
  }
  const carried = cargo.find(item => item.carrierId === agent.id && item.state === 'carried');
  if (carried?.route?.length > 1) {
    model.routeMarkers.push({ id: `path-cargo:${carried.id}`, kind: 'path-planned', roomPath: carried.route, intensity: carried.routeRisk ?? 0, label: 'Cargo route' });
  }
  const task = tasks.find(candidate => array(candidate.assignedAgentIds).includes(agent.id) || candidate.assignedAgentId === agent.id || candidate.workerId === agent.id);
  if (task?.targetRoomId && agent.roomId && task.targetRoomId !== agent.roomId) {
    model.routeMarkers.push({ id: `path-task:${task.id}`, kind: 'path-task', roomPath: [agent.roomId, task.targetRoomId], intensity: progressOf(task), label: task.label ?? task.actionId ?? 'Assigned task' });
    model.pointMarkers.push({ id: `path-target:${task.id}`, roomId: task.targetRoomId, kind: 'path-target', intensity: progressOf(task), label: 'Task destination' });
  }
  model.pointMarkers.push({ id: `path-agent:${agent.id}`, roomId: agent.travel?.toRoomId ?? agent.roomId, kind: 'path-agent', intensity: 1, label: agent.name ?? agent.id });
  model.legend = [
    legend('path-current', 'Current movement', 'solid cyan line'),
    legend('path-planned', 'Planned logistics route', 'dashed line'),
    legend('path-task', 'Assigned task destination', 'arrowed line')
  ];
}

function collectTasks(snapshot) {
  return [
    ...array(snapshot.environmentTasks?.tasks),
    ...array(snapshot.settlementOperations?.orders),
    ...array(snapshot.zoneInteractions?.tasks),
    ...array(snapshot.operations?.activities)
  ];
}

function routeMarker(route, kind, roomById) {
  return {
    id: `${kind}:${route.id}`,
    routeId: route.id,
    kind,
    points: array(route.points).map(point => ({ x: Number(point.x), z: Number(point.z), yOffset: Number(point.yOffset ?? 0) })),
    roomPath: [route.from, route.to].filter(roomId => roomById.has(roomId)),
    intensity: route.active ? 1 : 0.5,
    state: route.state,
    label: `${route.from}–${route.to} · ${route.state}`
  };
}

function summarize(model) {
  const total = model.roomMarkers.length + model.routeMarkers.length + model.pointMarkers.length;
  if (model.mode === 'world') return total ? `${total} active field signal${total === 1 ? '' : 's'}` : 'Physical world view';
  return `${total} overlay item${total === 1 ? '' : 's'}`;
}

function legend(kind, label, cue) {
  return { kind, label, cue };
}

function progressOf(task) {
  if (Number.isFinite(task.progress)) return clamp01(task.progress);
  if (Number.isFinite(task.workDone) && Number.isFinite(task.workRequired) && task.workRequired > 0) return clamp01(task.workDone / task.workRequired);
  return task.state === 'completed' ? 1 : 0.15;
}

function isActiveAgent(agent) {
  return Boolean(agent && agent.alive !== false && !agent.departed && !agent.hidden);
}

function groupBy(items, keyOf) {
  const result = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  }
  return result;
}

function pairKey(a, b) {
  return [String(a ?? ''), String(b ?? '')].sort().join('::');
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
