const ACTIVE = new Set(['queued', 'moving', 'working', 'interrupted']);
const FRIENDLY = 'adventurer-expedition';

function table(state, name) {
  const value = state?.entities?.[name];
  return value && typeof value === 'object' ? value : {};
}

export function selectWorldTaskActions(state, target) {
  if (!target?.type || !target?.id) return { actions: [], tasks: [] };
  const roomId = resolveRoomId(state, target);
  const route = target.type === 'route' ? findRoute(state, target.id) : null;
  const prop = ['prop', 'structure'].includes(target.type)
    ? table(state, target.type === 'structure' ? 'structures' : 'props')[target.id]
    : null;
  const agents = Object.values(table(state, 'agents')).filter(isFriendly);
  const reachable = roomId ? agents.filter(agent => canReach(state, agent.roomId, roomId)) : agents;
  const tasks = Object.values(table(state, 'environmentTasks')).filter(task => ACTIVE.has(task.status) && (
    task.targetId === target.id || (target.type === 'room' && task.targetRoomId === target.id)
  ));
  const actions = candidates(target, route, prop).map(action => finalize(action, { state, target, roomId, route, prop, agents, reachable, tasks }));
  return { actions, tasks: tasks.map(summarizeTask) };
}

function candidates(target, route, prop) {
  if (target.type === 'room') return [
    item('room.scout', 'Scout', 'Reveal danger, occupation and usable approaches.'),
    item('room.search', 'Search', 'Look for clues, treasure and concealed mechanisms.'),
    item('room.salvage', 'Salvage', 'Recover usable materials from the room.')
  ];
  if (target.type === 'story-prop') return [item('story.inspect', 'Investigate clue', 'Assign an adventurer to examine this story object.')];
  if (target.type === 'route') {
    const kind = route?.kind ?? inferKind(target.id);
    const state = route?.state ?? defaultState(kind);
    const result = [item('route.inspect', 'Inspect route', 'Assess the threshold and its current state.')];
    if (kind === 'secret' && ['hidden', 'suspected'].includes(state)) result.push(item('route.discover', 'Discover passage', 'Search for the concealed entrance.'));
    if ((kind === 'secret' && state === 'discovered') || (kind === 'conditional' && ['locked', 'opening'].includes(state))) result.push(item('route.open', 'Open route', 'Work the lock, seal or hidden mechanism.'));
    if ((kind === 'ordinary' && state !== 'open') || state === 'collapsed') result.push(item('route.clear', 'Clear route', 'Remove the obstruction and restore passage.'));
    return result;
  }
  if (target.type === 'structure') return [
    item('landmark.inspect', 'Inspect', 'Assess the structure and surroundings.'),
    item('landmark.repair', 'Repair', 'Restore structural integrity.')
  ];
  if (target.type === 'interaction-socket') return [
    item('landmark.inspect', 'Inspect', 'Examine this mechanism or service point.'),
    item('landmark.operate', 'Operate', 'Assign an adventurer to use this mechanism.')
  ];
  if (target.type === 'landmark') return [
    item('landmark.inspect', 'Inspect landmark', 'Record the landmark condition and clues.'),
    item('landmark.operate', 'Operate', 'Use an available mechanism or service point.'),
    item('landmark.repair', 'Repair', 'Repair damaged portions of the landmark.')
  ];
  if (target.type === 'prop') {
    const result = [item('landmark.inspect', 'Inspect', 'Examine this object.')];
    if (looksOperable(prop, target)) result.push(item('landmark.operate', 'Operate', 'Use or reactivate this object.'));
    if (looksRepairable(prop)) result.push(item('landmark.repair', 'Repair', 'Restore this object.'));
    return result;
  }
  return [];
}

function finalize(action, context) {
  let enabled = true;
  let reason = null;
  const duplicate = context.tasks.find(task => task.actionId === action.id);
  if (duplicate) {
    enabled = false;
    reason = `${duplicate.status} as ${duplicate.id}`;
  } else if (!context.agents.length) {
    enabled = false;
    reason = 'No active adventurer is available.';
  } else if (context.roomId && !context.reachable.length) {
    enabled = false;
    reason = 'No adventurer can reach this target through the active graph.';
  } else if (action.id === 'room.scout' && table(context.state, 'rooms')[context.roomId]?.scouted) {
    enabled = false;
    reason = 'This room has already been scouted.';
  } else if (action.id === 'room.search' && table(context.state, 'rooms')[context.roomId]?.searched) {
    enabled = false;
    reason = 'This room has already been searched thoroughly.';
  } else if (action.id === 'story.inspect' && table(context.state, 'rooms')[context.roomId]?.storyDiscovered) {
    enabled = false;
    reason = 'This clue has already been investigated.';
  } else if (action.id === 'route.open' && ['open', 'opened'].includes(context.route?.state)) {
    enabled = false;
    reason = 'This route is already open.';
  } else if (action.id === 'route.clear' && context.route?.state === 'open') {
    enabled = false;
    reason = 'This route is already clear.';
  } else if (action.id === 'landmark.repair' && Number.isFinite(context.prop?.integrity) && Number.isFinite(context.prop?.maxIntegrity) && context.prop.integrity >= context.prop.maxIntegrity) {
    enabled = false;
    reason = 'Integrity is already full.';
  }
  return {
    ...action,
    enabled,
    reason,
    target: {
      type: context.target.type,
      id: context.target.id,
      roomId: context.roomId,
      label: context.target.label ?? null,
      semanticName: context.target.semanticName ?? null,
      assetId: context.target.assetId ?? null,
      worldPoint: context.target.worldPoint ?? null
    }
  };
}

function resolveRoomId(state, target) {
  if (target.type === 'room') return target.id;
  if (target.roomId) return target.roomId;
  if (target.type === 'route') {
    const route = findRoute(state, target.id);
    return route?.from ?? route?.a ?? route?.roomIds?.[0] ?? null;
  }
  const entity = table(state, target.type === 'structure' ? 'structures' : 'props')[target.id];
  return entity?.roomId ?? null;
}
function findRoute(state, id) { return table(state, 'connections')[id] ?? Object.values(table(state, 'connections')).find(route => route.id === id) ?? null; }
function isFriendly(agent) { return Boolean(agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.hosted && !agent.attachedToId && (agent.faction === 'party' || agent.factionId === FRIENDLY)); }
function canReach(state, from, to) {
  if (!from || !to) return false;
  if (from === to) return true;
  const graph = new Map();
  for (const route of Object.values(table(state, 'connections'))) {
    if (route.active === false) continue;
    const endpoints = routeEndpoints(route);
    if (!endpoints) continue;
    const [a, b] = endpoints;
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a).push(b); graph.get(b).push(a);
  }
  const queue = [from]; const seen = new Set([from]);
  while (queue.length) {
    const room = queue.shift();
    for (const next of graph.get(room) ?? []) {
      if (next === to) return true;
      if (seen.has(next)) continue;
      seen.add(next); queue.push(next);
    }
  }
  return false;
}
function routeEndpoints(route) { if (Array.isArray(route.roomIds)) return route.roomIds.slice(0, 2); if (route.from && route.to) return [route.from, route.to]; if (route.a && route.b) return [route.a, route.b]; return null; }
function inferKind(id) { return String(id).startsWith('secret-') ? 'secret' : String(id).startsWith('conn-') ? 'conditional' : 'ordinary'; }
function defaultState(kind) { return kind === 'secret' ? 'hidden' : kind === 'conditional' ? 'locked' : 'open'; }
function looksOperable(prop, target) { const text = `${prop?.type ?? ''} ${target.semanticName ?? ''} ${target.id}`.toLowerCase(); return ['engine', 'sluice', 'gate', 'mechanism', 'facility', 'altar', 'well', 'forge', 'workshop', 'socket'].some(token => text.includes(token)); }
function looksRepairable(prop) { return Number.isFinite(prop?.integrity) || Number.isFinite(prop?.maxIntegrity) || Number.isFinite(prop?.buildProgress); }
function item(id, label, description) { return { id, label, description }; }
function summarizeTask(task) { return { id: task.id, actionId: task.actionId, label: task.label ?? task.actionId, status: task.status, progress: Number.isFinite(task.progress) ? task.progress : 0, assignedAgentId: task.assignedAgentId ?? null, lastError: task.lastError ?? null }; }
