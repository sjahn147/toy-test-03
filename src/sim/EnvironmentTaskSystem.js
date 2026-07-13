const ACTIVE = new Set(['queued', 'moving', 'working', 'interrupted']);
const PARTY_FACTION = 'adventurer-expedition';

export const ENVIRONMENT_TASK_DEFINITIONS = Object.freeze({
  'room.scout': def('Scout room', 4.8, 'scouting', 'watch-lantern', ['fighter', 'rogue', 'cleric', 'wizard']),
  'room.search': def('Search room', 6.4, 'searching', 'watch-lantern', ['rogue', 'wizard', 'fighter', 'cleric']),
  'room.salvage': def('Salvage room', 7.2, 'salvaging', 'hammer-plank', ['fighter', 'rogue']),
  'landmark.inspect': def('Inspect landmark', 4.4, 'inspecting', 'watch-lantern', ['rogue', 'wizard', 'cleric', 'fighter']),
  'landmark.operate': def('Operate mechanism', 6.2, 'operating', 'hammer-plank', ['rogue', 'wizard', 'fighter']),
  'landmark.repair': def('Repair structure', 8.0, 'repairing', 'hammer-plank', ['fighter', 'rogue']),
  'story.inspect': def('Investigate clue', 5.4, 'investigating', 'watch-lantern', ['rogue', 'wizard', 'cleric']),
  'route.inspect': def('Inspect route', 4.0, 'route-inspection', 'watch-lantern', ['rogue', 'wizard', 'fighter']),
  'route.discover': def('Discover secret route', 6.6, 'route-discovery', 'watch-lantern', ['rogue', 'wizard']),
  'route.open': def('Open route', 7.8, 'route-opening', 'hammer-plank', ['rogue', 'fighter', 'wizard']),
  'route.clear': def('Clear route', 8.6, 'route-clearing', 'hammer-plank', ['fighter', 'rogue'])
});

export class EnvironmentTaskSystem {
  constructor({ rooms = [], props = [], onEvent = () => {} } = {}) {
    this.rooms = rooms;
    this.props = props;
    this.onEvent = onEvent;
    this.tasks = new Map();
    this.discoveries = new Set();
    this.sequence = 0;
  }

  enqueue(command, sim) {
    const definition = ENVIRONMENT_TASK_DEFINITIONS[command?.actionId];
    if (!definition) return fail(`unknown environment action ${command?.actionId ?? '(missing)'}`);
    const target = normalizeTarget(command?.target);
    if (!target) return fail('environment action requires a target');
    const context = resolveContext(target, sim, this.rooms, this.props);
    if (!context.room) return fail(`unknown target room ${context.roomId ?? '(none)'}`);
    const duplicate = [...this.tasks.values()].find(task => ACTIVE.has(task.status) && task.actionId === command.actionId && task.targetId === target.id);
    if (duplicate) return fail(`task ${duplicate.id} is already active`);
    const precondition = this.precondition(command.actionId, context, sim);
    if (!precondition.ok) return precondition;

    const task = {
      id: `environment-task-${this.sequence++}`,
      actionId: command.actionId,
      label: definition.label,
      targetType: target.type,
      targetId: target.id,
      targetRoomId: context.room.id,
      targetSocket: target.semanticName ?? null,
      targetAssetId: target.assetId ?? null,
      targetPoint: validPoint(target.worldPoint) ? { ...target.worldPoint } : null,
      routeId: context.route?.id ?? null,
      status: 'queued',
      progress: 0,
      assignedAgentId: null,
      createdAt: number(sim?.time),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      interruptions: 0,
      lastError: null,
      result: null
    };
    this.tasks.set(task.id, task);
    this.assign(task, sim, command?.preferredAgentId ?? null);
    this.emit(`${task.label} queued.`, { type: 'environment-task-queued', taskId: task.id, roomId: task.targetRoomId });
    return ok(clone(task));
  }

  cancel(taskId, sim, reason = 'cancelled-by-observer') {
    const task = this.tasks.get(taskId);
    if (!task) return fail(`unknown task ${taskId}`);
    if (!ACTIVE.has(task.status)) return fail(`task ${taskId} is already ${task.status}`);
    const agent = sim?.agents?.find(candidate => candidate.id === task.assignedAgentId);
    if (agent?.activity?.source === 'environment-task' && agent.activity.taskId === task.id) clearActivity(agent, reason);
    task.status = 'cancelled';
    task.completedAt = number(sim?.time, task.createdAt);
    task.lastError = reason;
    this.emit(`${task.label} cancelled.`, { type: 'environment-task-cancelled', taskId: task.id });
    return ok(clone(task));
  }

  update(_dt, sim) {
    for (const task of this.tasks.values()) {
      if (!ACTIVE.has(task.status)) continue;
      let agent = sim.agents.find(candidate => candidate.id === task.assignedAgentId) ?? null;
      if (!isAvailable(agent)) {
        if (agent?.activity?.source === 'environment-task') clearActivity(agent, 'agent-unavailable');
        task.assignedAgentId = null;
        task.status = 'queued';
        task.progress = 0;
        agent = this.assign(task, sim);
      }
      if (!agent) continue;
      const activity = agent.activity;
      if (activity?.source !== 'environment-task' || activity.taskId !== task.id) continue;
      if (!isActivityValid(agent, activity)) {
        clearActivity(agent, 'interrupted');
        task.status = 'interrupted';
        task.progress = 0;
        task.interruptions += 1;
        task.lastError = 'interrupted';
        continue;
      }
      const duration = Math.max(0.01, activity.endsAt - activity.startedAt);
      activity.progress = clamp((number(sim.time) - activity.startedAt) / duration, 0, 1);
      activity.phase = activity.progress < 0.12 ? 'approach' : activity.progress < 0.86 ? 'loop' : 'finish';
      task.status = 'working';
      task.progress = activity.progress;
      if (activity.progress >= 1) this.complete(task, agent, sim);
    }
  }

  decide(agent, sim) {
    const task = this.forAgent(agent?.id);
    if (!task || !ACTIVE.has(task.status) || !isAvailable(agent) || agent.travel || agent.combat) return null;
    if (agent.roomId !== task.targetRoomId) {
      const next = nextStep(sim.graph, agent.roomId, task.targetRoomId);
      if (!next || next === agent.roomId) {
        this.failTask(task, agent, 'target is unreachable', sim);
        return null;
      }
      task.status = 'moving';
      return { type: 'environment-task-move', roomId: next, taskId: task.id };
    }
    if (agent.activity?.source === 'environment-task' && agent.activity.taskId === task.id) return { type: 'environment-task-hold', taskId: task.id };
    if (agent.activity) return null;
    this.begin(task, agent, sim);
    return { type: 'environment-task-hold', taskId: task.id };
  }

  resolve(agent, action, sim) {
    if (action?.type === 'environment-task-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action?.type === 'environment-task-hold') {
      const task = this.tasks.get(action.taskId);
      if (task) agent.mood = ENVIRONMENT_TASK_DEFINITIONS[task.actionId]?.activityType ?? 'working';
      return true;
    }
    return false;
  }

  clearAgent(agent, reason = 'agent-cleared') {
    if (!agent) return;
    const task = this.forAgent(agent.id);
    if (agent.activity?.source === 'environment-task') clearActivity(agent, reason);
    if (!task || !ACTIVE.has(task.status)) return;
    task.assignedAgentId = null;
    task.status = 'queued';
    task.progress = 0;
    task.lastError = reason;
  }

  forAgent(agentId) {
    return [...this.tasks.values()].find(task => ACTIVE.has(task.status) && task.assignedAgentId === agentId) ?? null;
  }

  snapshot() {
    return { tasks: [...this.tasks.values()].map(clone), discoveries: [...this.discoveries] };
  }

  metrics() {
    const values = [...this.tasks.values()];
    return {
      environmentTasksActive: values.filter(task => ACTIVE.has(task.status)).length,
      environmentTasksQueued: values.filter(task => task.status === 'queued').length,
      environmentTasksWorking: values.filter(task => task.status === 'working').length,
      environmentTasksCompleted: values.filter(task => task.status === 'completed').length,
      environmentTasksFailed: values.filter(task => task.status === 'failed').length
    };
  }

  assign(task, sim, preferredAgentId = null) {
    const definition = ENVIRONMENT_TASK_DEFINITIONS[task.actionId];
    const candidates = sim.agents
      .filter(isAvailable)
      .filter(agent => !this.forAgent(agent.id))
      .filter(agent => !agent.activity)
      .filter(agent => definition.roles.includes(agent.role))
      .map(agent => ({ agent, distance: distance(sim.graph, agent.roomId, task.targetRoomId), preference: agent.id === preferredAgentId ? -1000 : 0, fatigue: number(agent.fatigue) * 0.02 }))
      .filter(entry => Number.isFinite(entry.distance))
      .sort((a, b) => (a.distance + a.preference + a.fatigue) - (b.distance + b.preference + b.fatigue));
    const agent = candidates[0]?.agent ?? null;
    if (!agent) {
      task.status = 'queued';
      task.lastError = 'no eligible reachable adventurer';
      return null;
    }
    task.assignedAgentId = agent.id;
    task.status = agent.roomId === task.targetRoomId ? 'queued' : 'moving';
    task.lastError = null;
    return agent;
  }

  begin(task, agent, sim) {
    const definition = ENVIRONMENT_TASK_DEFINITIONS[task.actionId];
    const duration = definition.duration * (0.92 + hash(`${agent.id}:${task.id}`) * 0.16);
    const room = sim.rooms.find(candidate => candidate.id === task.targetRoomId) ?? this.rooms.find(candidate => candidate.id === task.targetRoomId);
    agent.activity = {
      id: `environment-activity-${task.id}-${task.attempts}`,
      taskId: task.id,
      source: 'environment-task',
      type: definition.activityType,
      prop: definition.prop,
      phase: 'approach',
      progress: 0,
      startedAt: number(sim.time),
      endsAt: number(sim.time) + duration,
      duration,
      interruptible: true,
      assignedBy: 'observer',
      roomId: task.targetRoomId,
      targetRoomId: task.targetRoomId,
      targetId: task.targetId,
      targetSocket: task.targetSocket,
      anchor: taskAnchor(task, room, agent.id),
      label: task.label
    };
    task.startedAt ??= number(sim.time);
    task.status = 'working';
    task.progress = 0;
    task.attempts += 1;
    agent.mood = definition.activityType;
  }

  complete(task, agent, sim) {
    const context = resolveContext({ type: task.targetType, id: task.targetId, roomId: task.targetRoomId, semanticName: task.targetSocket, assetId: task.targetAssetId }, sim, this.rooms, this.props);
    const result = applyEffect(task.actionId, context, sim, this.discoveries);
    if (!result.ok) return this.failTask(task, agent, result.error, sim);
    task.status = 'completed';
    task.progress = 1;
    task.completedAt = number(sim.time, task.createdAt);
    task.result = result.result;
    task.lastError = null;
    clearActivity(agent, 'complete');
    agent.mood = 'environment-task-complete';
    sim.emitEffect?.('construction-work', { roomId: task.targetRoomId, agentId: agent.id, duration: 0.72 });
    this.emit(`${agent.name} completed ${task.label.toLowerCase()}.`, { type: 'environment-task-completed', taskId: task.id, roomId: task.targetRoomId });
  }

  failTask(task, agent, error, sim) {
    task.status = 'failed';
    task.progress = 0;
    task.completedAt = number(sim?.time, task.createdAt);
    task.lastError = error;
    if (agent?.activity?.source === 'environment-task') clearActivity(agent, 'failed');
    this.emit(`${task.label} failed: ${error}.`, { type: 'environment-task-failed', taskId: task.id, roomId: task.targetRoomId });
  }

  precondition(actionId, context, sim) {
    if (!sim?.agents?.some(isAvailable)) return fail('no active adventurer can perform this task');
    if (actionId === 'room.scout' && context.room.scouted) return fail('room has already been scouted');
    if (actionId === 'story.inspect' && this.discoveries.has(context.target.id)) return fail('clue has already been investigated');
    if (actionId.startsWith('route.')) {
      if (!context.route) return fail(`unknown route ${context.target.id}`);
      const kind = context.route.kind ?? 'ordinary';
      const state = context.route.state ?? context.route.defaultState ?? (kind === 'ordinary' ? 'open' : kind === 'conditional' ? 'locked' : 'hidden');
      if (actionId === 'route.discover' && kind !== 'secret') return fail('only secret routes require discovery');
      if (actionId === 'route.discover' && !['hidden', 'suspected'].includes(state)) return fail(`route is already ${state}`);
      if (actionId === 'route.open' && kind === 'secret' && state !== 'discovered') return fail('secret route must be discovered first');
      if (actionId === 'route.open' && ['open', 'opened'].includes(state)) return fail('route is already open');
      if (actionId === 'route.clear' && ['open', 'opened'].includes(state)) return fail('route is already clear');
      if (actionId === 'route.clear' && kind !== 'ordinary' && state !== 'collapsed') return fail(`${kind} route must be collapsed before it can be cleared`);
    }
    return ok(null);
  }

  emit(text, meta) { this.onEvent(text, meta); }
}

function applyEffect(actionId, context, sim, discoveries) {
  const { room, route, prop, target } = context;
  if (actionId === 'room.scout') {
    room.scouted = true;
    room.scoutLevel = number(room.scoutLevel) + 1;
    sim.visited?.add?.(room.id);
    return ok({ roomId: room.id, scouted: true });
  }
  if (actionId === 'room.search') {
    room.searchProgress = clamp(number(room.searchProgress) + 0.5, 0, 1);
    room.searched = room.searchProgress >= 1;
    const hidden = sim.props?.find(candidate => candidate.roomId === room.id && candidate.discovered !== true && (candidate.hidden || ['treasure', 'trap'].includes(candidate.type)));
    if (hidden) hidden.discovered = true;
    return ok({ roomId: room.id, searchProgress: room.searchProgress, discoveryId: hidden?.id ?? null });
  }
  if (actionId === 'room.salvage') {
    const salvage = sim.props?.find(candidate => candidate.roomId === room.id && candidate.salvaged !== true && candidate.type !== 'trap');
    if (salvage) salvage.salvaged = true;
    const yieldAmount = salvage ? 2 : 1;
    room.materials = number(room.materials) + yieldAmount;
    return ok({ roomId: room.id, materials: yieldAmount, propId: salvage?.id ?? null });
  }
  if (actionId === 'story.inspect') {
    discoveries.add(target.id);
    room.storyDiscovered = true;
    room.storyClues = number(room.storyClues) + 1;
    room.lastStoryDiscovery = target.id;
    return ok({ discoveryId: target.id });
  }
  if (actionId === 'landmark.inspect') {
    room.landmarkInspected = true;
    room.lastInspectedLandmark = target.assetId ?? target.id;
    return ok({ landmarkId: room.lastInspectedLandmark });
  }
  if (actionId === 'landmark.operate') {
    const candidate = prop ?? findProp(target.id, sim);
    if (candidate) {
      candidate.operational = true;
      candidate.state = candidate.operationalState ?? 'operational';
      candidate.lastOperatedAt = number(sim.time);
    } else {
      room.mechanismOperational = true;
      room.lastOperatedSocket = target.semanticName ?? target.id;
    }
    return ok({ targetId: target.id, operational: true });
  }
  if (actionId === 'landmark.repair') {
    const candidate = prop ?? findProp(target.id, sim) ?? findStructure(target.id, sim);
    if (candidate) {
      const max = number(candidate.maxIntegrity, Math.max(100, number(candidate.integrity)));
      candidate.maxIntegrity = max;
      candidate.integrity = Math.min(max, number(candidate.integrity) + Math.max(10, max * 0.25));
      if (candidate.integrity >= max) candidate.state = 'repaired';
      return ok({ targetId: target.id, integrity: candidate.integrity, maxIntegrity: max });
    }
    room.structuralIntegrity = Math.min(100, number(room.structuralIntegrity, 50) + 25);
    return ok({ roomId: room.id, structuralIntegrity: room.structuralIntegrity });
  }
  if (actionId === 'route.inspect') {
    if ((route.kind ?? 'ordinary') === 'secret' && route.state === 'hidden') setRoute(sim, route.id, 'suspected');
    return ok({ routeId: route.id, state: sim.routeState?.(route.id)?.state ?? route.state });
  }
  if (actionId === 'route.discover') return transition(sim, route, 'discovered');
  if (actionId === 'route.open' || actionId === 'route.clear') return transition(sim, route, (route.kind ?? 'ordinary') === 'ordinary' ? 'open' : 'opened');
  return fail(`no effect handler for ${actionId}`);
}

function transition(sim, route, state) {
  const result = setRoute(sim, route.id, state);
  return result.ok ? ok({ routeId: route.id, state }) : result;
}
function setRoute(sim, routeId, state) {
  if (typeof sim.setRouteState === 'function') return sim.setRouteState(routeId, state, { source: 'environment-task' });
  if (sim.routeGraph?.setRouteState) return sim.routeGraph.setRouteState(routeId, state, { source: 'environment-task' });
  return fail('active campaign graph is unavailable');
}
function resolveContext(target, sim, rooms, props) {
  const route = target.type === 'route' ? findRoute(target.id, sim) : null;
  const prop = ['prop', 'structure'].includes(target.type) ? findProp(target.id, sim, props) : null;
  const roomId = target.roomId ?? (target.type === 'room' ? target.id : null) ?? prop?.roomId ?? route?.from ?? route?.a ?? null;
  const room = sim?.rooms?.find(candidate => candidate.id === roomId) ?? rooms.find(candidate => candidate.id === roomId) ?? null;
  return { target, route, prop, roomId, room };
}
function findRoute(id, sim) { return sim?.routeGraph?.getRoute?.(id) ?? sim?.scenario?.routes?.find?.(route => route.id === id) ?? null; }
function findProp(id, sim, fallback = []) { return sim?.props?.find?.(candidate => candidate.id === id) ?? fallback.find(candidate => candidate.id === id) ?? null; }
function findStructure(id, sim) { return sim?.constructionSystem?.structures?.find?.(candidate => candidate.id === id) ?? null; }
function normalizeTarget(target) {
  if (!target?.type || !target?.id) return null;
  return {
    type: String(target.type), id: String(target.id),
    roomId: target.roomId == null ? null : String(target.roomId),
    label: target.label == null ? null : String(target.label),
    semanticName: target.semanticName == null ? null : String(target.semanticName),
    assetId: target.assetId == null ? null : String(target.assetId),
    worldPoint: validPoint(target.worldPoint) ? { x: Number(target.worldPoint.x), y: number(target.worldPoint.y), z: Number(target.worldPoint.z) } : null
  };
}
function taskAnchor(task, room, agentId) {
  if (task.targetPoint && room) return { slotId: `${task.id}:${agentId}`, ox: task.targetPoint.x - room.x, oz: task.targetPoint.z - room.z, facing: 0, scale: 1 };
  const angle = hash(`${task.targetId}:${agentId}`) * Math.PI * 2;
  const radius = Math.min(1.4, Math.max(0.6, Math.min(room?.w ?? 8, room?.d ?? 8) * 0.08));
  return { slotId: `${task.id}:${agentId}`, ox: Math.cos(angle) * radius, oz: Math.sin(angle) * radius, facing: angle + Math.PI, scale: 1 };
}
function isAvailable(agent) { return Boolean(agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.hosted && !agent.attachedToId && (agent.faction === 'party' || agent.factionId === PARTY_FACTION)); }
function isActivityValid(agent, activity) { return isAvailable(agent) && !agent.travel && !agent.combat && agent.roomId === activity.roomId; }
function clearActivity(agent, reason) { if (agent?.activity?.source !== 'environment-task') return; agent.lastEnvironmentTask = { taskId: agent.activity.taskId, reason }; agent.activity = null; if (!agent.combat && !agent.travel) agent.mood = reason === 'complete' ? 'environment-task-complete' : 'environment-task-interrupted'; }
function nextStep(graph, from, to) { if (from === to) return from; const queue = [[from]]; const seen = new Set([from]); while (queue.length) { const path = queue.shift(); const last = path[path.length - 1]; for (const n of graph?.get?.(last) ?? []) { if (seen.has(n)) continue; const next = [...path, n]; if (n === to) return next[1]; seen.add(n); queue.push(next); } } return from; }
function distance(graph, from, to) { if (!from || !to) return Infinity; if (from === to) return 0; const queue = [{ room: from, d: 0 }]; const seen = new Set([from]); while (queue.length) { const current = queue.shift(); for (const n of graph?.get?.(current.room) ?? []) { if (seen.has(n)) continue; if (n === to) return current.d + 1; seen.add(n); queue.push({ room: n, d: current.d + 1 }); } } return Infinity; }
function def(label, duration, activityType, prop, roles) { return Object.freeze({ label, duration, activityType, prop, roles: Object.freeze([...roles]) }); }
function clone(task) { return { ...task, targetPoint: task.targetPoint ? { ...task.targetPoint } : null, result: task.result && typeof task.result === 'object' ? { ...task.result } : task.result }; }
function ok(result) { return { ok: true, result }; }
function fail(error) { return { ok: false, error }; }
function number(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function validPoint(point) { return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.z)); }
function hash(value) { let result = 2166136261; for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
