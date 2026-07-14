const ACTIVE = new Set(['queued', 'moving', 'working', 'interrupted']);
const PARTY_FACTION = 'adventurer-expedition';

export const ZONE_INTERACTION_DEFINITIONS = Object.freeze({
  'sluice.drain-system': interaction('Drain the flooded storehouses', 'C14', 8.4, 'operating', 'hammer-plank', ['rogue', 'wizard', 'fighter'], 1),
  'workshop.reactivate': interaction('Reactivate the abandoned workshop', 'D16', 8.8, 'repairing', 'hammer-plank', ['fighter', 'rogue', 'wizard'], 1, { materials: 2 }),
  'workshop.controlled-breach': interaction('Prepare a controlled powder breach', 'D20', 9.2, 'breach-preparation', 'hammer-plank', ['fighter', 'rogue', 'wizard'], 2, { materials: 1 }),
  'ossuary.break-choir': interaction('Break the funeral choir', 'E22', 8.6, 'ritual-disruption', 'bone-offering', ['cleric', 'wizard', 'fighter'], 2),
  'ossuary.seal-last-names': interaction('Seal the Well of Last Names', 'E25', 10.4, 'sealing-ritual', 'bone-offering', ['cleric', 'wizard'], 2),
  'fungal.communion': interaction('Enter communion with the Mycelial Heart', 'F30', 8.5, 'fungal-communion', 'bowl-spoon', ['cleric', 'wizard', 'rogue'], 1),
  'fungal.burn-heart': interaction('Burn out the Mycelial Heart', 'F30', 9.0, 'fungal-purge', 'watch-torch', ['fighter', 'wizard', 'rogue'], 2),
  'spider.rescue-hosts': interaction('Cut free the living hosts', 'G32', 8.0, 'host-rescue', 'hammer-plank', ['rogue', 'fighter', 'cleric'], 2),
  'market.negotiate-neutrality': interaction('Negotiate the Neutral Well accord', 'I44', 7.6, 'market-diplomacy', 'camp-mug', ['rogue', 'cleric', 'wizard'], 2, { wealth: 1 }),
  'arena.challenge-champion': interaction('Challenge the Red Pit champion', 'J49', 7.2, 'arena-challenge', 'watch-torch', ['fighter', 'rogue', 'cleric'], 1),
  'laboratory.calibrate-observatory': interaction('Calibrate the sealed observatory', 'K53', 9.0, 'arcane-calibration', 'watch-lantern', ['wizard', 'rogue'], 1, { materials: 1 }),
  'laboratory.stabilize-summoning': interaction('Stabilize the failed summoning room', 'K54', 10.0, 'summoning-stabilization', 'bone-offering', ['wizard', 'cleric'], 2),
  'sanctum.open-seal-gate': interaction('Open the Heart Sanctum seal gate', 'M61', 10.5, 'seal-gate-ritual', 'watch-lantern', ['wizard', 'cleric', 'fighter', 'rogue'], 3),
  'sanctum.seal-heart': interaction('Return the Heart to sleep', 'M63', 12.0, 'heart-ritual', 'bone-offering', ['cleric', 'wizard', 'fighter', 'rogue'], 3),
  'sanctum.claim-heart': interaction('Claim the Heart of the Citadel', 'M63', 12.0, 'heart-ritual', 'watch-lantern', ['wizard', 'fighter', 'rogue', 'cleric'], 3),
  'sanctum.shatter-heart': interaction('Shatter the Heart of the Citadel', 'M63', 12.0, 'heart-ritual', 'hammer-plank', ['fighter', 'wizard', 'rogue', 'cleric'], 3)
});

export class ZoneInteractionSystem {
  constructor({ rooms = [], props = [], onEvent = () => {} } = {}) {
    this.rooms = rooms;
    this.props = props;
    this.onEvent = onEvent;
    this.tasks = new Map();
    this.outcomes = new Map();
    this.sequence = 0;
  }

  enqueue(command, sim) {
    const definition = ZONE_INTERACTION_DEFINITIONS[command?.actionId];
    if (!definition) return fail(`unknown zone interaction ${command?.actionId ?? '(missing)'}`);
    const targetRoomId = command?.target?.roomId ?? (command?.target?.type === 'room' ? command.target.id : null) ?? definition.roomId;
    if (targetRoomId !== definition.roomId) return fail(`${definition.label} must be performed in ${definition.roomId}`);
    const room = roomById(sim, definition.roomId, this.rooms);
    if (!room) return fail(`missing interaction room ${definition.roomId}`);
    const duplicate = [...this.tasks.values()].find(task => ACTIVE.has(task.status) && task.actionId === command.actionId);
    if (duplicate) return fail(`task ${duplicate.id} is already active`);
    const check = this.precondition(command.actionId, sim);
    if (!check.ok) return check;
    const reservation = reserveCost(definition.cost, sim);
    if (!reservation.ok) return reservation;

    const task = {
      id: `zone-interaction-${this.sequence++}`,
      actionId: command.actionId,
      label: definition.label,
      targetType: command?.target?.type ?? 'room',
      targetId: command?.target?.id ?? definition.roomId,
      targetRoomId: definition.roomId,
      status: 'queued',
      progress: 0,
      assignedAgentId: null,
      assignedAgentIds: [],
      crewSize: definition.crew,
      createdAt: number(sim?.time),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      interruptions: 0,
      lastError: null,
      reserved: reservation.result,
      result: null
    };
    this.tasks.set(task.id, task);
    this.assignCrew(task, sim, command?.preferredAgentId ?? null);
    this.emit(`${task.label} ordered.`, { type: 'zone-interaction-queued', taskId: task.id, roomId: task.targetRoomId });
    return ok(cloneTask(task));
  }

  cancel(taskId, sim, reason = 'cancelled-by-observer') {
    const task = this.tasks.get(taskId);
    if (!task) return fail(`unknown zone interaction ${taskId}`);
    if (!ACTIVE.has(task.status)) return fail(`task ${taskId} is already ${task.status}`);
    this.releaseCrew(task, sim, reason);
    refundReservation(task.reserved, sim);
    task.status = 'cancelled';
    task.completedAt = number(sim?.time, task.createdAt);
    task.lastError = reason;
    return ok(cloneTask(task));
  }

  update(_dt, sim) {
    for (const task of this.tasks.values()) {
      if (!ACTIVE.has(task.status)) continue;
      if (!this.crewValid(task, sim)) {
        this.releaseCrew(task, sim, 'crew-unavailable');
        task.status = 'queued';
        task.progress = 0;
        task.interruptions += 1;
        task.lastError = 'crew unavailable';
        this.assignCrew(task, sim);
        continue;
      }
      const crew = task.assignedAgentIds.map(id => sim.agents.find(agent => agent.id === id)).filter(Boolean);
      if (crew.some(agent => agent.roomId !== task.targetRoomId || agent.travel)) {
        task.status = 'moving';
        task.progress = 0;
        continue;
      }
      if (crew.some(agent => agent.combat || agent.downed || agent.hosted)) {
        this.releaseCrew(task, sim, 'interrupted');
        task.status = 'interrupted';
        task.progress = 0;
        task.interruptions += 1;
        task.lastError = 'interrupted';
        continue;
      }
      for (const agent of crew) {
        if (!isTaskActivity(agent, task.id)) this.beginActivity(task, agent, sim, agent.id === task.assignedAgentId);
      }
      const activities = crew.map(agent => agent.activity).filter(activity => activity?.taskId === task.id);
      if (activities.length !== task.crewSize) continue;
      task.status = 'working';
      const progresses = activities.map(activity => {
        const duration = Math.max(0.01, activity.endsAt - activity.startedAt);
        activity.progress = clamp((number(sim.time) - activity.startedAt) / duration, 0, 1);
        activity.phase = activity.progress < 0.12 ? 'approach' : activity.progress < 0.86 ? 'loop' : 'finish';
        return activity.progress;
      });
      task.progress = Math.min(...progresses);
      if (task.progress >= 1) this.complete(task, sim);
    }
  }

  decide(agent, sim) {
    const task = this.forAgent(agent?.id);
    if (!task || !ACTIVE.has(task.status) || !isAvailable(agent) || agent.combat) return null;
    if (agent.roomId !== task.targetRoomId) {
      const step = nextStep(sim.graph, agent.roomId, task.targetRoomId);
      if (!step || step === agent.roomId) {
        this.failTask(task, `target ${task.targetRoomId} is unreachable`, sim);
        return null;
      }
      task.status = 'moving';
      return { type: 'zone-interaction-move', roomId: step, taskId: task.id };
    }
    if (!isTaskActivity(agent, task.id) && !agent.activity) this.beginActivity(task, agent, sim, agent.id === task.assignedAgentId);
    return { type: 'zone-interaction-hold', taskId: task.id };
  }

  resolve(agent, action, sim) {
    if (action?.type === 'zone-interaction-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action?.type === 'zone-interaction-hold') {
      const task = this.tasks.get(action.taskId);
      if (task) agent.mood = ZONE_INTERACTION_DEFINITIONS[task.actionId]?.activityType ?? 'zone-interaction';
      return true;
    }
    return false;
  }

  clearAgent(agent, reason = 'agent-cleared') {
    if (!agent) return;
    const task = this.forAgent(agent.id);
    if (task) {
      if (isTaskActivity(agent, task.id)) clearActivity(agent, reason);
      task.assignedAgentIds = task.assignedAgentIds.filter(id => id !== agent.id);
      task.assignedAgentId = task.assignedAgentIds[0] ?? null;
      task.status = 'queued';
      task.progress = 0;
      task.lastError = reason;
    }
    delete agent.zoneInteractionTaskId;
  }

  forAgent(agentId) {
    if (!agentId) return null;
    return [...this.tasks.values()].find(task => ACTIVE.has(task.status) && task.assignedAgentIds.includes(agentId)) ?? null;
  }

  snapshot() {
    return {
      tasks: [...this.tasks.values()].map(cloneTask),
      outcomes: Object.fromEntries([...this.outcomes.entries()].map(([key, value]) => [key, clone(value)]))
    };
  }

  metrics() {
    const tasks = [...this.tasks.values()];
    return {
      zoneInteractionsActive: tasks.filter(task => ACTIVE.has(task.status)).length,
      zoneInteractionsCompleted: tasks.filter(task => task.status === 'completed').length,
      zoneInteractionsFailed: tasks.filter(task => task.status === 'failed').length,
      zoneInteractionOutcomes: this.outcomes.size,
      campaignResolution: this.outcomes.get('campaign-resolution')?.resolution ?? null
    };
  }

  assignCrew(task, sim, preferredAgentId = null) {
    const definition = ZONE_INTERACTION_DEFINITIONS[task.actionId];
    const candidates = sim.agents
      .filter(isAvailable)
      .filter(agent => !agent.activity && !agent.zoneInteractionTaskId)
      .filter(agent => !sim.environmentTaskSystem?.forAgent?.(agent.id))
      .filter(agent => !sim.settlementOperationsSystem?.forAgent?.(agent.id))
      .filter(agent => definition.roles.includes(agent.role))
      .map(agent => ({ agent, distance: distance(sim.graph, agent.roomId, task.targetRoomId), preferred: agent.id === preferredAgentId ? -1000 : 0 }))
      .filter(entry => Number.isFinite(entry.distance))
      .sort((a, b) => a.distance + a.preferred - b.distance - b.preferred);
    if (candidates.length < task.crewSize) {
      task.status = 'queued';
      task.lastError = `requires ${task.crewSize} reachable eligible adventurers`;
      return [];
    }
    const selected = chooseCrew(candidates.map(entry => entry.agent), definition, task.crewSize, preferredAgentId);
    if (selected.length < task.crewSize) {
      task.status = 'queued';
      task.lastError = 'required role mix is unavailable';
      return [];
    }
    task.assignedAgentIds = selected.map(agent => agent.id);
    task.assignedAgentId = selected[0]?.id ?? null;
    task.status = selected.every(agent => agent.roomId === task.targetRoomId) ? 'queued' : 'moving';
    task.lastError = null;
    for (const agent of selected) agent.zoneInteractionTaskId = task.id;
    return selected;
  }

  crewValid(task, sim) {
    if (task.assignedAgentIds.length !== task.crewSize) return false;
    return task.assignedAgentIds.every(id => {
      const agent = sim.agents.find(candidate => candidate.id === id);
      return isAvailable(agent) && agent.zoneInteractionTaskId === task.id;
    });
  }

  beginActivity(task, agent, sim, lead) {
    const definition = ZONE_INTERACTION_DEFINITIONS[task.actionId];
    const duration = definition.duration * (0.94 + hash(`${task.id}:${agent.id}`) * 0.12);
    const room = roomById(sim, task.targetRoomId, this.rooms);
    agent.activity = {
      id: `zone-activity-${task.id}-${agent.id}-${task.attempts}`,
      source: lead ? 'zone-interaction' : 'zone-interaction-support',
      taskId: task.id,
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
      anchor: taskAnchor(task, room, agent.id),
      label: task.label
    };
    task.startedAt ??= number(sim.time);
    task.attempts += 1;
  }

  complete(task, sim) {
    const result = applyOutcome(task.actionId, sim, task.assignedAgentIds, this.outcomes);
    if (!result.ok) return this.failTask(task, result.error, sim);
    task.status = 'completed';
    task.progress = 1;
    task.completedAt = number(sim.time, task.createdAt);
    task.result = result.result;
    task.lastError = null;
    this.releaseCrew(task, sim, 'complete');
    sim.emitEffect?.(result.result?.effectType ?? 'construction-complete', { roomId: task.targetRoomId, duration: 1.4 });
    this.emit(`${task.label} completed.`, { type: 'zone-interaction-completed', taskId: task.id, roomId: task.targetRoomId, result: task.result });
  }

  failTask(task, error, sim) {
    this.releaseCrew(task, sim, 'failed');
    refundReservation(task.reserved, sim);
    task.status = 'failed';
    task.progress = 0;
    task.completedAt = number(sim?.time, task.createdAt);
    task.lastError = error;
    this.emit(`${task.label} failed: ${error}.`, { type: 'zone-interaction-failed', taskId: task.id, roomId: task.targetRoomId });
  }

  releaseCrew(task, sim, reason) {
    for (const id of task.assignedAgentIds) {
      const agent = sim?.agents?.find(candidate => candidate.id === id);
      if (!agent) continue;
      if (isTaskActivity(agent, task.id)) clearActivity(agent, reason);
      if (agent.zoneInteractionTaskId === task.id) delete agent.zoneInteractionTaskId;
    }
    if (reason !== 'complete') {
      task.assignedAgentIds = [];
      task.assignedAgentId = null;
    }
  }

  precondition(actionId, sim) {
    const definition = ZONE_INTERACTION_DEFINITIONS[actionId];
    const room = roomById(sim, definition.roomId, this.rooms);
    if (!room) return fail(`missing room ${definition.roomId}`);
    if (hostilesInRoom(sim, definition.roomId) > 0 && !['arena.challenge-champion', 'ossuary.break-choir'].includes(actionId)) return fail('hostiles must be cleared from the interaction room');
    const available = sim.agents?.filter(isAvailable).filter(agent => definition.roles.includes(agent.role)) ?? [];
    if (available.length < definition.crew) return fail(`requires ${definition.crew} eligible adventurers`);
    if (!hasCost(definition.cost, sim)) return fail(costReason(definition.cost));

    if (actionId === 'sluice.drain-system' && room.mechanismOperational) return fail('the drainage system is already operational');
    if (actionId === 'workshop.reactivate' && room.workshopOperational) return fail('the workshop is already operational');
    if (actionId === 'workshop.controlled-breach' && routeOpen(sim, 'conn-D20-J48')) return fail('the powder breach is already open');
    if (actionId === 'workshop.controlled-breach' && !roomById(sim, 'D16', this.rooms)?.workshopOperational) return fail('reactivate D16 before preparing the breach');
    if (actionId === 'ossuary.break-choir' && room.choirBroken) return fail('the funeral choir is already broken');
    if (actionId === 'ossuary.seal-last-names' && room.lastNamesSealed) return fail('the Well of Last Names is already sealed');
    if (actionId === 'ossuary.seal-last-names' && !roomById(sim, 'E22', this.rooms)?.choirBroken) return fail('break the funeral choir before sealing the well');
    if (actionId === 'fungal.communion' && room.fungalResolution) return fail(`the Mycelial Heart was already resolved by ${room.fungalResolution}`);
    if (actionId === 'fungal.burn-heart' && room.fungalResolution) return fail(`the Mycelial Heart was already resolved by ${room.fungalResolution}`);
    if (actionId === 'spider.rescue-hosts' && room.hostsRescued) return fail('the living hosts have already been rescued');
    if (actionId === 'market.negotiate-neutrality' && room.marketAccord) return fail('the Neutral Well accord is already active');
    if (actionId === 'arena.challenge-champion' && room.arenaLiberated) return fail('the Red Pit has already been liberated');
    if (actionId === 'laboratory.calibrate-observatory' && room.observatoryCalibrated) return fail('the observatory is already calibrated');
    if (actionId === 'laboratory.stabilize-summoning' && room.summoningStabilized) return fail('the summoning room is already stabilized');
    if (actionId === 'laboratory.stabilize-summoning' && !roomById(sim, 'K53', this.rooms)?.observatoryCalibrated) return fail('calibrate K53 before stabilizing the summoning room');
    if (actionId === 'sanctum.open-seal-gate' && room.sealGateOpened) return fail('the seal gate is already open');
    if (actionId === 'sanctum.open-seal-gate' && (!roomById(sim, 'K53', this.rooms)?.observatoryCalibrated || !roomById(sim, 'K54', this.rooms)?.summoningStabilized)) return fail('the laboratory calibration and stabilization are both required');
    if (actionId.startsWith('sanctum.') && actionId !== 'sanctum.open-seal-gate') {
      if (!roomById(sim, 'M61', this.rooms)?.sealGateOpened) return fail('open M61 before resolving the Heart');
      if (room.campaignResolution) return fail(`the campaign was already resolved by ${room.campaignResolution}`);
      if (!hasRitualRoles(available)) return fail('the final ritual requires arcane, divine and martial participants');
    }
    return ok(null);
  }

  emit(text, meta = {}) { this.onEvent(text, meta); }
}

function applyOutcome(actionId, sim, crewIds, outcomes) {
  const room = id => roomById(sim, id, []);
  if (actionId === 'sluice.drain-system') {
    const routeResult = setRoute(sim, 'conn-C15-F26', 'opened');
    if (!routeResult.ok) return fail(routeResult.error ?? 'failed to open conn-C15-F26');
    setRoomState(room('C14'), 'operational', { mechanismOperational: true, drainageState: 'drained' });
    setRoomState(room('C11'), 'drained', { waterLevel: 0, movementPenalty: 0 });
    setRoomState(room('C13'), 'drained', { waterLevel: 0 });
    setRoomState(room('C15'), 'open', { floodHazard: false });
    outcomes.set('sluice-drained', { actionId, roomId: 'C14', resolvedAt: number(sim.time) });
    return ok({ routeId: 'conn-C15-F26', state: 'opened', effectType: 'cargo-delivery' });
  }
  if (actionId === 'workshop.reactivate') {
    setRoomState(room('D16'), 'reactivated', { workshopOperational: true, constructionBonus: 0.2 });
    outcomes.set('workshop-reactivated', { actionId, roomId: 'D16', resolvedAt: number(sim.time) });
    return ok({ workshopOperational: true, effectType: 'construction-complete' });
  }
  if (actionId === 'workshop.controlled-breach') {
    const routeResult = setRoute(sim, 'conn-D20-J48', 'opened');
    if (!routeResult.ok) return fail(routeResult.error ?? 'failed to open conn-D20-J48');
    setRoomState(room('D20'), 'detonated', { controlledBreach: true, explosiveRisk: 0 });
    outcomes.set('powder-wall-breached', { actionId, roomId: 'D20', resolvedAt: number(sim.time) });
    return ok({ routeId: 'conn-D20-J48', state: 'opened', effectType: 'siege-hit' });
  }
  if (actionId === 'ossuary.break-choir') {
    setRoomState(room('E22'), 'purified', { choirBroken: true, deathEnergy: 0, zoneInteractionSafetyBonus: 0.18 });
    outcomes.set('funeral-choir-broken', { actionId, roomId: 'E22', resolvedAt: number(sim.time) });
    return ok({ choirBroken: true, effectType: 'heal' });
  }
  if (actionId === 'ossuary.seal-last-names') {
    setRoomState(room('E25'), 'sealed', { lastNamesSealed: true, wraithSpawnDisabled: true, zoneInteractionSafetyBonus: 0.24 });
    outcomes.set('last-names-ritual-resolved', { actionId, roomId: 'E25', resolvedAt: number(sim.time) });
    return ok({ lastNamesSealed: true, effectType: 'heal' });
  }
  if (actionId === 'fungal.communion') {
    setRoomState(room('F30'), 'stable', { fungalResolution: 'communion', myconidDiplomacy: 'allied', zoneInteractionSafetyBonus: 0.22 });
    for (const id of ['F26', 'F27', 'F28', 'F29']) if (room(id)) room(id).zoneInteractionSafetyBonus = Math.max(number(room(id).zoneInteractionSafetyBonus), 0.12);
    outcomes.set('fungal-resolution', { actionId, resolution: 'communion', roomId: 'F30', resolvedAt: number(sim.time) });
    return ok({ resolution: 'communion', effectType: 'camp-meal-ready' });
  }
  if (actionId === 'fungal.burn-heart') {
    setRoomState(room('F30'), 'burned-out', { fungalResolution: 'burned', biomass: number(room('F30')?.biomass) + 6, zoneInteractionSafetyBonus: 0.08 });
    outcomes.set('fungal-resolution', { actionId, resolution: 'burned', roomId: 'F30', resolvedAt: number(sim.time) });
    return ok({ resolution: 'burned', biomass: 6, effectType: 'siege-hit' });
  }
  if (actionId === 'spider.rescue-hosts') {
    let rescued = 0;
    for (const agent of sim.agents ?? []) {
      if (agent.roomId !== 'G32' || (!agent.hosted && !agent.attachedToId)) continue;
      agent.hosted = false;
      agent.attachedToId = null;
      agent.hidden = false;
      agent.downed = false;
      agent.hp = Math.max(1, number(agent.hp, 1));
      rescued += 1;
    }
    setRoomState(room('G32'), 'rescued', { hostsRescued: true, rescuedCount: rescued, zoneInteractionSafetyBonus: 0.16 });
    outcomes.set('spider-hosts-rescued', { actionId, roomId: 'G32', rescued, resolvedAt: number(sim.time) });
    return ok({ rescued, effectType: 'settlement-rehome' });
  }
  if (actionId === 'market.negotiate-neutrality') {
    setRoomState(room('I44'), 'neutral', { marketAccord: true, diplomacyState: 'neutral-accord', zoneInteractionSafetyBonus: 0.3 });
    for (const id of ['I41', 'I42', 'I43', 'I45']) if (room(id)) room(id).zoneInteractionSafetyBonus = Math.max(number(room(id).zoneInteractionSafetyBonus), 0.18);
    if (room('I41')) room('I41').marketAccord = true;
    outcomes.set('neutral-well-accord', { actionId, roomId: 'I44', resolvedAt: number(sim.time) });
    return ok({ accord: 'neutral-well', effectType: 'camp-meal-ready' });
  }
  if (actionId === 'arena.challenge-champion') {
    const champion = sim.agents?.find(agent => agent.alive && agent.roomId === 'J49' && agent.role === 'orc') ?? null;
    const challenger = sim.agents?.find(agent => crewIds.includes(agent.id)) ?? null;
    const score = number(challenger?.level, 1) * 1.4 + number(challenger?.attack, 3) + number(challenger?.hp, 1) / Math.max(1, number(challenger?.maxHp, 1));
    const threshold = champion ? 7.5 + number(champion.level, 1) * 0.7 : 6.5;
    const victory = score >= threshold;
    if (victory) {
      setRoomState(room('J49'), 'liberated', { arenaLiberated: true, championDefeated: true, zoneInteractionSafetyBonus: 0.22 });
      setRoomState(room('J50'), 'leaderless', { arenaChallengeLost: true });
      if (champion) { champion.alive = false; champion.hp = 0; }
      outcomes.set('red-pit-liberated', { actionId, roomId: 'J49', victorId: challenger?.id ?? null, resolvedAt: number(sim.time) });
      return ok({ victory: true, challengerId: challenger?.id ?? null, effectType: 'attack' });
    }
    if (challenger) challenger.hp = Math.max(1, number(challenger.hp, 1) - 4);
    room('J49').lastArenaDefeatAt = number(sim.time);
    return ok({ victory: false, challengerId: challenger?.id ?? null, effectType: 'attack' });
  }
  if (actionId === 'laboratory.calibrate-observatory') {
    setRoomState(room('K53'), 'calibrated', { observatoryCalibrated: true, mapIntel: true });
    setRoute(sim, 'secret-G34-L56', 'discovered');
    setRoute(sim, 'secret-K55-M61', 'discovered');
    outcomes.set('observatory-calibrated', { actionId, roomId: 'K53', resolvedAt: number(sim.time) });
    return ok({ discoveredRoutes: ['secret-G34-L56', 'secret-K55-M61'], effectType: 'old-lantern-upgrade' });
  }
  if (actionId === 'laboratory.stabilize-summoning') {
    setRoomState(room('K54'), 'stabilized', { summoningStabilized: true, deathEnergy: 0, zoneInteractionSafetyBonus: 0.2 });
    outcomes.set('summoning-stabilized', { actionId, roomId: 'K54', resolvedAt: number(sim.time) });
    return ok({ stabilized: true, effectType: 'heal' });
  }
  if (actionId === 'sanctum.open-seal-gate') {
    const routeResult = setRoute(sim, 'conn-K55-M61', 'opened');
    if (!routeResult.ok) return fail(routeResult.error ?? 'failed to open conn-K55-M61');
    setRoomState(room('M61'), 'opened', { sealGateOpened: true });
    outcomes.set('heart-sanctum-opened', { actionId, roomId: 'M61', resolvedAt: number(sim.time) });
    return ok({ routeId: 'conn-K55-M61', state: 'opened', effectType: 'old-lantern-upgrade' });
  }
  if (['sanctum.seal-heart', 'sanctum.claim-heart', 'sanctum.shatter-heart'].includes(actionId)) {
    const resolution = actionId.split('.').at(-1).replace('-heart', '');
    const state = resolution === 'seal' ? 'sleeping' : resolution === 'claim' ? 'claimed' : 'collapsed';
    setRoomState(room('M63'), state, { campaignResolution: resolution, heartResolved: true });
    setRoomState(room('M62'), resolution === 'shatter' ? 'fractured' : resolution === 'claim' ? 'ritual-active' : 'dormant', { ritualResolved: resolution });
    sim.campaignResolution = { resolution, roomId: 'M63', resolvedAt: number(sim.time), crewIds: [...crewIds] };
    outcomes.set('campaign-resolution', clone(sim.campaignResolution));
    return ok({ resolution, effectType: resolution === 'shatter' ? 'structure-break' : 'old-lantern-upgrade' });
  }
  return fail(`missing outcome handler for ${actionId}`);
}

function interaction(label, roomId, duration, activityType, prop, roles, crew = 1, cost = null) {
  return Object.freeze({ label, roomId, duration, activityType, prop, roles: Object.freeze([...roles]), crew, cost: cost ? Object.freeze({ ...cost }) : null });
}
function chooseCrew(candidates, definition, count, preferredAgentId) {
  const ordered = [...candidates].sort((a, b) => (a.id === preferredAgentId ? -1 : b.id === preferredAgentId ? 1 : 0));
  if (count < 3 || !definition.label.includes('Heart')) return ordered.slice(0, count);
  const arcane = ordered.find(agent => agent.role === 'wizard');
  const divine = ordered.find(agent => agent.role === 'cleric');
  const martial = ordered.find(agent => ['fighter', 'rogue'].includes(agent.role));
  const selected = [...new Set([arcane, divine, martial].filter(Boolean))];
  for (const agent of ordered) if (selected.length < count && !selected.includes(agent)) selected.push(agent);
  return selected.slice(0, count);
}
function hasRitualRoles(agents) { return agents.some(agent => agent.role === 'wizard') && agents.some(agent => agent.role === 'cleric') && agents.some(agent => ['fighter', 'rogue'].includes(agent.role)); }
function hostilesInRoom(sim, roomId) { return (sim.agents ?? []).filter(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === roomId && factionOf(agent) !== PARTY_FACTION).length; }
function factionOf(agent) { return agent.faction === 'party' ? PARTY_FACTION : agent.factionId ?? agent.ecologyFaction ?? null; }
function isAvailable(agent) { return Boolean(agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.hosted && !agent.attachedToId && (agent.faction === 'party' || agent.factionId === PARTY_FACTION)); }
function isTaskActivity(agent, taskId) { return ['zone-interaction', 'zone-interaction-support'].includes(agent?.activity?.source) && agent.activity.taskId === taskId; }
function clearActivity(agent, reason) { if (!['zone-interaction', 'zone-interaction-support'].includes(agent?.activity?.source)) return; agent.lastZoneInteraction = { taskId: agent.activity.taskId, reason }; agent.activity = null; if (!agent.combat && !agent.travel) agent.mood = reason === 'complete' ? 'zone-interaction-complete' : 'zone-interaction-interrupted'; }
function taskAnchor(task, room, agentId) { const angle = hash(`${task.id}:${agentId}`) * Math.PI * 2; const radius = Math.min(1.5, Math.max(0.65, Math.min(room?.w ?? 10, room?.d ?? 10) * 0.075)); return { slotId: `${task.id}:${agentId}`, ox: Math.cos(angle) * radius, oz: Math.sin(angle) * radius, facing: angle + Math.PI, scale: 1 }; }
function roomById(sim, id, fallback) { return sim?.rooms?.find?.(room => room.id === id) ?? fallback.find?.(room => room.id === id) ?? null; }
function setRoomState(room, visualState, extra = {}) { if (!room) return; room.visualState = visualState; room.stateVariant = visualState; Object.assign(room, extra); }
function setRoute(sim, routeId, state) { if (typeof sim.setRouteState === 'function') return sim.setRouteState(routeId, state, { source: 'zone-interaction' }); if (sim.routeGraph?.setRouteState) return sim.routeGraph.setRouteState(routeId, state, { source: 'zone-interaction' }); return { ok: false, error: 'active campaign graph is unavailable' }; }
function routeOpen(sim, routeId) { const route = sim.routeGraph?.getRoute?.(routeId) ?? sim.scenario?.routes?.find?.(item => item.id === routeId); return ['open', 'opened'].includes(route?.state); }
function nextStep(graph, from, to) { if (from === to) return from; const queue = [[from]]; const seen = new Set([from]); while (queue.length) { const path = queue.shift(); const last = path.at(-1); for (const next of graph?.get?.(last) ?? []) { if (seen.has(next)) continue; const candidate = [...path, next]; if (next === to) return candidate[1]; seen.add(next); queue.push(candidate); } } return from; }
function distance(graph, from, to) { if (!from || !to) return Infinity; if (from === to) return 0; const queue = [{ room: from, distance: 0 }]; const seen = new Set([from]); while (queue.length) { const current = queue.shift(); for (const next of graph?.get?.(current.room) ?? []) { if (seen.has(next)) continue; if (next === to) return current.distance + 1; seen.add(next); queue.push({ room: next, distance: current.distance + 1 }); } } return Infinity; }
function resourceSettlement(sim) { return sim.settlementSystem?.settlements?.get?.('settlement-old-lantern-inn') ?? sim.settlementSystem?.settlements?.get?.(sim.settlementSystem?.safeSettlementId) ?? [...(sim.settlementSystem?.settlements?.values?.() ?? [])].find(settlement => settlement.factionId === PARTY_FACTION) ?? null; }
function hasCost(cost, sim) { if (!cost) return true; const settlement = resourceSettlement(sim); return Object.entries(cost).every(([key, amount]) => number(settlement?.[key]) >= amount); }
function costReason(cost) { if (!cost) return ''; return `requires ${Object.entries(cost).map(([key, amount]) => `${amount} ${key}`).join(' and ')}`; }
function reserveCost(cost, sim) { if (!cost) return ok(null); const settlement = resourceSettlement(sim); if (!settlement || !hasCost(cost, sim)) return fail(costReason(cost)); for (const [key, amount] of Object.entries(cost)) settlement[key] = number(settlement[key]) - amount; return ok({ settlementId: settlement.id, cost: { ...cost }, refunded: false }); }
function refundReservation(reserved, sim) { if (!reserved || reserved.refunded) return; const settlement = sim.settlementSystem?.settlements?.get?.(reserved.settlementId); if (settlement) for (const [key, amount] of Object.entries(reserved.cost ?? {})) settlement[key] = number(settlement[key]) + amount; reserved.refunded = true; }
function cloneTask(task) { return { ...task, assignedAgentIds: [...task.assignedAgentIds], reserved: task.reserved ? { ...task.reserved, cost: { ...(task.reserved.cost ?? {}) } } : null, result: clone(task.result) }; }
function clone(value) { if (!value || typeof value !== 'object') return value; return JSON.parse(JSON.stringify(value)); }
function number(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash(value) { let result = 2166136261; for (const character of String(value)) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
function ok(result) { return { ok: true, result }; }
function fail(error) { return { ok: false, error }; }
