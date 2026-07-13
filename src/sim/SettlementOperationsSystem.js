const ACTIVE = new Set(['queued', 'moving', 'working', 'interrupted']);
const FRIENDLY_FACTION = 'adventurer-expedition';
const OLD_LANTERN_ID = 'settlement-old-lantern-inn';
const OLD_LANTERN_ROOMS = new Set(['H36', 'H37', 'H38', 'H39', 'H40']);

export const SETTLEMENT_OPERATION_DEFINITIONS = Object.freeze({
  'settlement.upgrade': def('Restore settlement', 7.5, 'restoration-work', 'hammer-plank', ['fighter', 'rogue', 'cleric', 'wizard'], 'H36'),
  'settlement.allocate-materials': def('Deliver materials', 5.8, 'materials-delivery', 'hammer-plank', ['fighter', 'rogue'], 'H36'),
  'settlement.allocate-supply': def('Deliver supplies', 5.4, 'supply-delivery', 'bowl-spoon', ['fighter', 'rogue', 'cleric'], 'H37'),
  'settlement.assign-workers': def('Assign restoration crew', 4.2, 'worker-muster', 'hammer-plank', ['fighter', 'rogue', 'cleric', 'wizard'], 'H36'),
  'settlement.release-workers': def('Release restoration crew', 2.6, 'worker-release', 'camp-mug', ['fighter', 'rogue', 'cleric', 'wizard'], 'H36'),
  'settlement.set-garrison': def('Assign garrison', 4.0, 'garrison-muster', 'watch-lantern', ['fighter', 'rogue', 'archer'], 'H36'),
  'settlement.release-garrison': def('Release garrison', 2.6, 'garrison-release', 'camp-mug', ['fighter', 'rogue', 'archer'], 'H36'),
  'settlement.fortify': def('Set defensive posture', 6.2, 'fortification', 'hammer-plank', ['fighter', 'rogue'], 'H36'),
  'inn.rest': def('Take a proper rest', 6.8, 'inn-rest', 'bedroll-blanket', ['fighter', 'rogue', 'cleric', 'wizard', 'archer'], 'H38'),
  'inn.trade': def('Trade at the Old Lantern', 4.8, 'inn-trade', 'camp-mug', ['fighter', 'rogue', 'cleric', 'wizard', 'archer'], 'H36'),
  'inn.recruit': def('Recruit an adventurer', 7.2, 'inn-recruitment', 'camp-mug', ['fighter', 'rogue', 'cleric', 'wizard'], 'H36'),
  'inn.regroup': def('Regroup the expedition', 5.4, 'party-regroup', 'bowl-spoon', ['fighter', 'rogue', 'cleric', 'wizard', 'archer'], 'H36'),
  'inn.rumors': def('Gather rumors', 5.6, 'rumor-gathering', 'camp-mug', ['rogue', 'wizard', 'cleric'], 'H40'),
  'inn.smuggling': def('Run the smuggler route', 5.2, 'smuggling-run', 'watch-lantern', ['rogue', 'fighter'], 'H40')
});

export class SettlementOperationsSystem {
  constructor({ rooms = [], props = [], onEvent = () => {} } = {}) {
    this.rooms = rooms;
    this.props = props;
    this.onEvent = onEvent;
    this.orders = new Map();
    this.directives = new Map();
    this.rumors = [];
    this.recruits = [];
    this.sequence = 0;
    this.recruitSequence = 0;
  }

  enqueue(command, sim) {
    const definition = SETTLEMENT_OPERATION_DEFINITIONS[command?.actionId];
    if (!definition) return fail(`unknown settlement action ${command?.actionId ?? '(missing)'}`);
    const settlement = resolveSettlement(command?.target, sim);
    if (!settlement) return fail('settlement action requires a valid settlement');
    const precondition = this.precondition(command.actionId, settlement, command, sim);
    if (!precondition.ok) return precondition;
    const duplicate = [...this.orders.values()].find(order => ACTIVE.has(order.status) && order.actionId === command.actionId && order.settlementId === settlement.id);
    if (duplicate) return fail(`order ${duplicate.id} is already active`);

    const reservation = this.reserve(command.actionId, settlement, sim);
    if (!reservation.ok) return reservation;
    const destinationRoomId = this.targetRoom(definition, settlement, command, sim);
    const deliveryOrder = ['settlement.allocate-materials', 'settlement.allocate-supply'].includes(command.actionId);
    const order = {
      id: `settlement-order-${this.sequence++}`,
      actionId: command.actionId,
      label: definition.label,
      settlementId: settlement.id,
      targetId: command?.target?.id ?? settlement.id,
      targetType: command?.target?.type ?? 'settlement',
      targetRoomId: deliveryOrder ? (reservation.result?.sourceRoomId ?? destinationRoomId) : destinationRoomId,
      destinationRoomId,
      sourceRoomId: reservation.result?.sourceRoomId ?? null,
      stage: command.actionId === 'inn.smuggling' ? 'setup' : deliveryOrder ? 'pickup' : 'work',
      status: 'queued',
      progress: 0,
      assignedAgentId: null,
      createdAt: number(sim?.time),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      interruptions: 0,
      lastError: null,
      reserved: reservation.result ?? null,
      result: null
    };
    this.orders.set(order.id, order);
    this.assign(order, sim, command?.preferredAgentId ?? null);
    this.emit(`${order.label} ordered at ${label(settlement)}.`, { type: 'settlement-order-queued', orderId: order.id, settlementId: settlement.id, roomId: order.targetRoomId });
    return ok(clone(order));
  }

  cancel(orderId, sim, reason = 'cancelled-by-observer') {
    const order = this.orders.get(orderId);
    if (!order) return fail(`unknown settlement order ${orderId}`);
    if (!ACTIVE.has(order.status)) return fail(`order ${orderId} is already ${order.status}`);
    const agent = sim?.agents?.find(candidate => candidate.id === order.assignedAgentId);
    if (agent?.activity?.source === 'settlement-operation' && agent.activity.orderId === order.id) clearActivity(agent, reason);
    this.refund(order, sim);
    order.status = 'cancelled';
    order.completedAt = number(sim?.time, order.createdAt);
    order.lastError = reason;
    this.emit(`${order.label} cancelled.`, { type: 'settlement-order-cancelled', orderId: order.id });
    return ok(clone(order));
  }

  update(_dt, sim) {
    this.syncDuties(sim);
    for (const order of this.orders.values()) {
      if (!ACTIVE.has(order.status)) continue;
      let agent = sim.agents.find(candidate => candidate.id === order.assignedAgentId) ?? null;
      if (!isAvailable(agent)) {
        if (agent?.activity?.source === 'settlement-operation') clearActivity(agent, 'agent-unavailable');
        order.assignedAgentId = null;
        order.status = 'queued';
        order.progress = 0;
        agent = this.assign(order, sim);
      }
      if (!agent) continue;
      const activity = agent.activity;
      if (activity?.source !== 'settlement-operation' || activity.orderId !== order.id) continue;
      if (!isActivityValid(agent, activity)) {
        clearActivity(agent, 'interrupted');
        order.status = 'interrupted';
        order.progress = 0;
        order.interruptions += 1;
        order.lastError = 'interrupted';
        continue;
      }
      const duration = Math.max(0.01, activity.endsAt - activity.startedAt);
      activity.progress = clamp((number(sim.time) - activity.startedAt) / duration, 0, 1);
      activity.phase = activity.progress < 0.12 ? 'approach' : activity.progress < 0.86 ? 'loop' : 'finish';
      order.status = 'working';
      order.progress = activity.progress;
      if (activity.progress >= 1) this.complete(order, agent, sim);
    }
  }

  decide(agent, sim) {
    const duty = this.dutyFor(agent?.id);
    if (duty && isAvailable(agent) && !agent.travel && !agent.combat) {
      if (agent.roomId !== duty.roomId) {
        const step = nextStep(sim.graph, agent.roomId, duty.roomId);
        return step && step !== agent.roomId ? { type: 'settlement-duty-move', roomId: step, dutyId: duty.id } : null;
      }
      if (!agent.activity) beginDutyActivity(agent, duty, sim);
      return { type: 'settlement-duty-hold', dutyId: duty.id };
    }

    const order = this.forAgent(agent?.id);
    if (!order || !ACTIVE.has(order.status) || !isAvailable(agent) || agent.travel || agent.combat) return null;
    if (agent.roomId !== order.targetRoomId) {
      const step = nextStep(sim.graph, agent.roomId, order.targetRoomId);
      if (!step || step === agent.roomId) {
        this.failOrder(order, agent, 'target is unreachable', sim);
        return null;
      }
      order.status = 'moving';
      return { type: 'settlement-order-move', roomId: step, orderId: order.id };
    }
    if (agent.activity?.source === 'settlement-operation' && agent.activity.orderId === order.id) return { type: 'settlement-order-hold', orderId: order.id };
    if (agent.activity) return null;
    this.begin(order, agent, sim);
    return { type: 'settlement-order-hold', orderId: order.id };
  }

  resolve(agent, action, sim) {
    if (action?.type === 'settlement-order-move' || action?.type === 'settlement-duty-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action?.type === 'settlement-order-hold' || action?.type === 'settlement-duty-hold') {
      agent.mood = action.type === 'settlement-duty-hold' ? 'settlement-duty' : 'settlement-service';
      return true;
    }
    return false;
  }

  clearAgent(agent, reason = 'agent-cleared') {
    if (!agent) return;
    const order = this.forAgent(agent.id);
    if (agent.activity?.source === 'settlement-operation' || agent.activity?.source === 'settlement-duty') clearActivity(agent, reason);
    if (order && ACTIVE.has(order.status)) {
      order.assignedAgentId = null;
      order.status = 'queued';
      order.progress = 0;
      order.lastError = reason;
    }
    for (const directive of this.directives.values()) {
      directive.workerIds = (directive.workerIds ?? []).filter(id => id !== agent.id);
      directive.garrisonIds = (directive.garrisonIds ?? []).filter(id => id !== agent.id);
    }
    delete agent.settlementDuty;
  }

  forAgent(agentId) {
    return [...this.orders.values()].find(order => ACTIVE.has(order.status) && order.assignedAgentId === agentId) ?? null;
  }

  dutyFor(agentId) {
    if (!agentId) return null;
    for (const directive of this.directives.values()) {
      if (directive.workerIds?.includes(agentId)) return { id: `${directive.settlementId}:worker`, type: 'worker', settlementId: directive.settlementId, roomId: directive.roomId, prop: 'hammer-plank' };
      if (directive.garrisonIds?.includes(agentId)) return { id: `${directive.settlementId}:garrison`, type: 'garrison', settlementId: directive.settlementId, roomId: directive.roomId, prop: 'watch-lantern' };
    }
    return null;
  }

  snapshot() {
    return {
      orders: [...this.orders.values()].map(clone),
      directives: [...this.directives.values()].map(value => ({ ...value, workerIds: [...(value.workerIds ?? [])], garrisonIds: [...(value.garrisonIds ?? [])] })),
      rumors: this.rumors.map(value => ({ ...value })),
      recruits: this.recruits.map(value => ({ ...value }))
    };
  }

  metrics() {
    const values = [...this.orders.values()];
    return {
      settlementOrdersActive: values.filter(order => ACTIVE.has(order.status)).length,
      settlementOrdersCompleted: values.filter(order => order.status === 'completed').length,
      settlementWorkersAssigned: [...this.directives.values()].reduce((sum, value) => sum + (value.workerIds?.length ?? 0), 0),
      settlementGarrisonAssigned: [...this.directives.values()].reduce((sum, value) => sum + (value.garrisonIds?.length ?? 0), 0),
      oldLanternRumors: this.rumors.length,
      oldLanternRecruits: this.recruits.length
    };
  }

  precondition(actionId, settlement, command, sim) {
    if (settlement.factionId && settlement.factionId !== FRIENDLY_FACTION) return fail('only friendly settlements can receive observer orders');
    if (!sim?.agents?.some(isAvailable)) return fail('no active adventurer can perform this order');
    const inn = oldLantern(sim);
    const services = settlement.services ?? inn?.snapshot?.().services ?? {};
    if (actionId.startsWith('inn.') && settlement.id !== OLD_LANTERN_ID) return fail('inn services are only available at the Old Lantern');
    if (actionId === 'settlement.upgrade' && settlement.id === OLD_LANTERN_ID && (inn?.tier ?? settlement.tier ?? 0) >= 4) return fail('the Old Lantern is already fully restored');
    if (actionId === 'settlement.allocate-materials' && !findMaterialSource(settlement, sim)) return fail('no friendly settlement has spare materials');
    if (actionId === 'settlement.allocate-supply' && factionSupply(sim) < 2) return fail('adventurer supply is below the two-unit delivery reserve');
    if (actionId === 'settlement.release-workers' && number(settlement.workerTarget) <= 0) return fail('no restoration workers are assigned');
    if (actionId === 'settlement.release-garrison' && number(settlement.garrisonTarget) <= 0) return fail('no garrison is assigned');
    if (actionId === 'inn.rest' && !services.guestRooms) return fail('guest rooms are not operational');
    if (actionId === 'inn.rest' && number(settlement.food) < 1) return fail('the inn has no meal reserve for a proper rest');
    if (actionId === 'inn.trade' && !services.trade) return fail('the trade counter is closed');
    if (actionId === 'inn.trade' && !sim.agents.some(agent => isAvailable(agent) && number(agent.gold) > 0)) return fail('no available adventurer has coin to trade');
    if (actionId === 'inn.recruit' && (!services.trade || (settlement.capacity ?? 0) <= (settlement.presentPopulation ?? 0))) return fail('recruitment requires an open inn with spare capacity');
    if (actionId === 'inn.recruit' && number(settlement.wealth) < 1) return fail('the inn needs one wealth to secure a recruit');
    if (actionId === 'inn.regroup' && !services.partyRegroup) return fail('the inn cannot regroup parties at this tier');
    if (actionId === 'inn.rumors' && !services.rumors) return fail('the rumor service is unavailable');
    if (actionId === 'inn.smuggling') {
      if (!services.smuggling) return fail('the secret office is not operating');
      const route = routeById(sim, 'secret-H40-I45');
      if (!route || !['open', 'opened'].includes(route.state)) return fail('the H40–I45 smuggler route is not open');
    }
    if (['inn.rest', 'inn.trade'].includes(actionId) && command?.preferredAgentId) {
      const agent = sim.agents.find(candidate => candidate.id === command.preferredAgentId);
      if (!isAvailable(agent)) return fail('the selected adventurer is unavailable');
    }
    return ok(null);
  }

  reserve(actionId, settlement, sim) {
    if (actionId === 'settlement.allocate-materials') {
      const source = findMaterialSource(settlement, sim);
      if (!source) return fail('no spare materials');
      const amount = Math.min(3, Math.max(2, Math.floor((source.materials ?? 0) - 1)));
      source.materials -= amount;
      return ok({ resourceType: 'materials', amount, sourceSettlementId: source.id, sourceRoomId: source.roomId, refunded: false });
    }
    if (actionId === 'settlement.allocate-supply') {
      const amount = 2;
      setFactionSupply(sim, factionSupply(sim) - amount);
      return ok({ resourceType: 'supply', amount, sourceSettlementId: 'faction-reserve', sourceRoomId: safeHub(sim)?.roomId ?? 'A01', refunded: false });
    }
    return ok(null);
  }

  refund(order, sim) {
    const reserved = order.reserved;
    if (!reserved || reserved.refunded || order.status === 'completed') return;
    if (reserved.resourceType === 'materials') {
      const source = settlementById(sim, reserved.sourceSettlementId);
      if (source) source.materials = number(source.materials) + number(reserved.amount);
    }
    if (reserved.resourceType === 'supply') setFactionSupply(sim, factionSupply(sim) + number(reserved.amount));
    reserved.refunded = true;
  }

  targetRoom(definition, settlement, command, sim) {
    if (command?.target?.roomId && OLD_LANTERN_ROOMS.has(command.target.roomId)) return command.target.roomId;
    if (definition.roomId && this.rooms.some(room => room.id === definition.roomId)) return definition.roomId;
    return settlement.roomId;
  }

  assign(order, sim, preferredAgentId = null) {
    const definition = SETTLEMENT_OPERATION_DEFINITIONS[order.actionId];
    const startRoomId = order.sourceRoomId ?? order.targetRoomId;
    const candidates = sim.agents
      .filter(isAvailable)
      .filter(agent => !this.forAgent(agent.id) && !this.dutyFor(agent.id) && !agent.activity)
      .filter(agent => definition.roles.includes(agent.role))
      .filter(agent => order.actionId !== 'inn.trade' || number(agent.gold) > 0)
      .map(agent => ({
        agent,
        distance: distance(sim.graph, agent.roomId, startRoomId),
        preference: agent.id === preferredAgentId ? -1000 : 0,
        serviceBias: order.actionId === 'inn.rest' ? -number(agent.fatigue) * 0.03 : order.actionId === 'inn.trade' ? -number(agent.gold) * 0.04 : number(agent.fatigue) * 0.02
      }))
      .filter(entry => Number.isFinite(entry.distance))
      .sort((a, b) => (a.distance + a.preference + a.serviceBias) - (b.distance + b.preference + b.serviceBias));
    const agent = candidates[0]?.agent ?? null;
    if (!agent) {
      order.status = 'queued';
      order.lastError = 'no eligible reachable adventurer';
      return null;
    }
    order.assignedAgentId = agent.id;
    order.status = agent.roomId === order.targetRoomId ? 'queued' : 'moving';
    order.lastError = null;
    return agent;
  }

  begin(order, agent, sim) {
    const definition = SETTLEMENT_OPERATION_DEFINITIONS[order.actionId];
    const duration = definition.duration * (0.92 + hash(`${agent.id}:${order.id}:${order.stage}`) * 0.16);
    agent.activity = {
      id: `settlement-activity-${order.id}-${order.attempts}`,
      orderId: order.id,
      source: 'settlement-operation',
      type: definition.activityType,
      prop: definition.prop,
      phase: 'approach',
      progress: 0,
      startedAt: number(sim.time),
      endsAt: number(sim.time) + duration,
      duration,
      interruptible: true,
      assignedBy: 'observer',
      roomId: order.targetRoomId,
      targetRoomId: order.targetRoomId,
      targetId: order.settlementId,
      anchor: anchor(order, this.rooms.find(room => room.id === order.targetRoomId), agent.id),
      label: order.label
    };
    order.startedAt ??= number(sim.time);
    order.status = 'working';
    order.progress = 0;
    order.attempts += 1;
    agent.mood = definition.activityType;
  }

  complete(order, agent, sim) {
    clearActivity(agent, 'complete');
    const settlement = settlementById(sim, order.settlementId);
    if (!settlement) return this.failOrder(order, agent, 'settlement disappeared', sim);
    const result = this.applyEffect(order, agent, settlement, sim);
    if (result?.continue) {
      order.stage = result.stage;
      order.targetRoomId = result.targetRoomId;
      order.sourceRoomId = null;
      order.status = 'queued';
      order.progress = 0;
      order.assignedAgentId = agent.id;
      return;
    }
    if (!result?.ok) return this.failOrder(order, agent, result?.error ?? 'order failed', sim);
    order.status = 'completed';
    order.progress = 1;
    order.completedAt = number(sim.time);
    order.result = result.result ?? null;
    this.emit(`${order.label} completed.`, { type: 'settlement-order-completed', orderId: order.id, settlementId: settlement.id, roomId: order.targetRoomId });
  }

  applyEffect(order, agent, settlement, sim) {
    const actionId = order.actionId;
    const inn = oldLantern(sim);
    const directive = this.directiveFor(settlement);
    if (actionId === 'settlement.allocate-materials') {
      if (order.stage === 'pickup') return { continue: true, stage: 'delivery', targetRoomId: order.destinationRoomId };
      settlement.materials = number(settlement.materials) + number(order.reserved?.amount);
      order.reserved.refunded = true;
      return ok({ materials: order.reserved.amount });
    }
    if (actionId === 'settlement.allocate-supply') {
      if (order.stage === 'pickup') return { continue: true, stage: 'delivery', targetRoomId: order.destinationRoomId };
      settlement.supplyReserve = number(settlement.supplyReserve) + number(order.reserved?.amount);
      order.reserved.refunded = true;
      return ok({ supplyReserve: settlement.supplyReserve });
    }
    if (actionId === 'settlement.assign-workers') {
      directive.workerTarget = Math.min(4, number(directive.workerTarget) + 1);
      this.syncDuties(sim);
      return ok({ workerTarget: directive.workerTarget });
    }
    if (actionId === 'settlement.release-workers') {
      directive.workerTarget = Math.max(0, number(directive.workerTarget) - 1);
      this.trimDuty(directive, 'worker', sim);
      this.syncDuties(sim);
      return ok({ workerTarget: directive.workerTarget });
    }
    if (actionId === 'settlement.set-garrison') {
      directive.garrisonTarget = Math.min(4, number(directive.garrisonTarget) + 1);
      this.syncDuties(sim);
      return ok({ garrisonTarget: directive.garrisonTarget });
    }
    if (actionId === 'settlement.release-garrison') {
      directive.garrisonTarget = Math.max(0, number(directive.garrisonTarget) - 1);
      this.trimDuty(directive, 'garrison', sim);
      this.syncDuties(sim);
      return ok({ garrisonTarget: directive.garrisonTarget });
    }
    if (actionId === 'settlement.fortify') {
      directive.defenseMode = directive.defenseMode === 'fortified' ? 'normal' : 'fortified';
      settlement.defenseMode = directive.defenseMode;
      settlement.security = number(settlement.security) + (directive.defenseMode === 'fortified' ? 6 : -6);
      return ok({ defenseMode: directive.defenseMode });
    }
    if (actionId === 'settlement.upgrade') {
      settlement.upgradeRequested = true;
      directive.workerTarget = Math.max(1, directive.workerTarget);
      if (inn) inn.progress = number(inn.progress) + 5.5;
      this.syncDuties(sim);
      return ok({ upgradeRequested: true, progress: inn?.progress ?? null });
    }
    if (actionId === 'inn.rest') {
      agent.hp = Math.min(number(agent.maxHp, 10), number(agent.hp) + 6);
      agent.fatigue = Math.max(0, number(agent.fatigue) - 55);
      agent.stress = Math.max(0, number(agent.stress) - 35);
      settlement.food = Math.max(0, number(settlement.food) - 1);
      return ok({ agentId: agent.id, rested: true });
    }
    if (actionId === 'inn.trade') {
      const spend = Math.min(2, Math.max(0, number(agent.gold)));
      agent.gold = number(agent.gold) - spend;
      settlement.wealth = number(settlement.wealth) + spend;
      agent.inventory ??= [];
      agent.inventory.push({ id: `inn-bundle-${order.id}`, name: 'Old Lantern supply bundle', type: 'provisions' });
      return ok({ spent: spend, item: 'Old Lantern supply bundle' });
    }
    if (actionId === 'inn.regroup') {
      const party = findPartyForAgent(sim, agent.id);
      if (party) {
        party.baseSettlementId = settlement.id;
        party.baseRoomId = settlement.roomId;
        party.state = 'resting';
        party.provisions = Math.min(number(party.maxProvisions, 12), number(party.provisions) + 3);
        party.water = Math.min(number(party.maxWater, 10), number(party.water) + 2);
      }
      for (const member of partyMembers(sim, party)) {
        member.fatigue = Math.max(0, number(member.fatigue) - 20);
        member.stress = Math.max(0, number(member.stress) - 15);
      }
      return ok({ partyId: party?.id ?? null, baseSettlementId: settlement.id });
    }
    if (actionId === 'inn.recruit') {
      const recruit = createRecruit(sim, settlement, this.recruitSequence++);
      if (!recruit) return fail('recruit creation failed');
      this.recruits.push({ id: recruit.id, name: recruit.name, role: recruit.role, recruitedAt: number(sim.time), settlementId: settlement.id });
      settlement.wealth = Math.max(0, number(settlement.wealth) - 1);
      return ok({ recruitId: recruit.id, role: recruit.role });
    }
    if (actionId === 'inn.rumors') {
      const route = firstHiddenRoute(sim);
      if (route) setRoute(sim, route.id, route.state === 'hidden' ? 'suspected' : 'discovered');
      const rumor = { id: `rumor-${this.rumors.length}`, text: route ? `A concealed way links ${route.from} and ${route.to}.` : 'The lower halls are changing hands again.', routeId: route?.id ?? null, discoveredAt: number(sim.time), settlementId: settlement.id };
      this.rumors.push(rumor);
      settlement.lastRumor = rumor.text;
      return ok(rumor);
    }
    if (actionId === 'inn.smuggling') {
      if (order.stage === 'setup') return { continue: true, stage: 'outbound', targetRoomId: 'I45' };
      if (order.stage === 'outbound') return { continue: true, stage: 'return', targetRoomId: 'H40' };
      settlement.materials = number(settlement.materials) + 2;
      settlement.wealth = number(settlement.wealth) + 1;
      setFactionSupply(sim, factionSupply(sim) + 1);
      return ok({ materials: 2, wealth: 1, supply: 1, routeId: 'secret-H40-I45' });
    }
    return fail(`no effect handler for ${actionId}`);
  }

  failOrder(order, agent, error, sim) {
    if (agent?.activity?.source === 'settlement-operation') clearActivity(agent, error);
    this.refund(order, sim);
    order.status = 'failed';
    order.lastError = error;
    order.completedAt = number(sim?.time, order.createdAt);
    this.emit(`${order.label} failed: ${error}.`, { type: 'settlement-order-failed', orderId: order.id, error });
  }

  directiveFor(settlement) {
    let directive = this.directives.get(settlement.id);
    if (!directive) {
      directive = { id: `directive-${settlement.id}`, settlementId: settlement.id, roomId: settlement.roomId, workerTarget: 0, garrisonTarget: 0, workerIds: [], garrisonIds: [], defenseMode: 'normal' };
      this.directives.set(settlement.id, directive);
    }
    return directive;
  }

  syncDuties(sim) {
    for (const directive of this.directives.values()) {
      directive.workerIds = (directive.workerIds ?? []).filter(id => isAvailable(sim.agents.find(agent => agent.id === id)));
      directive.garrisonIds = (directive.garrisonIds ?? []).filter(id => isAvailable(sim.agents.find(agent => agent.id === id)));
      const used = new Set([...directive.workerIds, ...directive.garrisonIds]);
      while (directive.workerIds.length < directive.workerTarget) {
        const candidate = sim.agents.filter(isAvailable).find(agent => !used.has(agent.id) && !this.forAgent(agent.id) && !agent.activity && ['fighter', 'rogue', 'cleric', 'wizard'].includes(agent.role));
        if (!candidate) break;
        directive.workerIds.push(candidate.id); used.add(candidate.id); candidate.settlementDuty = { type: 'worker', settlementId: directive.settlementId };
      }
      while (directive.garrisonIds.length < directive.garrisonTarget) {
        const candidate = sim.agents.filter(isAvailable).find(agent => !used.has(agent.id) && !this.forAgent(agent.id) && !agent.activity && ['fighter', 'rogue', 'archer'].includes(agent.role));
        if (!candidate) break;
        directive.garrisonIds.push(candidate.id); used.add(candidate.id); candidate.settlementDuty = { type: 'garrison', settlementId: directive.settlementId };
      }
      const settlement = settlementById(sim, directive.settlementId);
      if (settlement) {
        settlement.workerTarget = directive.workerTarget;
        settlement.garrisonTarget = directive.garrisonTarget;
        settlement.assignedWorkerIds = [...directive.workerIds];
        settlement.assignedGarrisonIds = [...directive.garrisonIds];
        settlement.defenseMode = directive.defenseMode;
      }
    }
  }

  trimDuty(directive, type, sim) {
    const key = type === 'worker' ? 'workerIds' : 'garrisonIds';
    const target = type === 'worker' ? directive.workerTarget : directive.garrisonTarget;
    while ((directive[key]?.length ?? 0) > target) {
      const id = directive[key].pop();
      const agent = sim.agents.find(candidate => candidate.id === id);
      if (agent?.activity?.source === 'settlement-duty') clearActivity(agent, 'duty-released');
      if (agent) delete agent.settlementDuty;
    }
  }

  emit(text, meta) { this.onEvent(text, meta); }
}

function def(labelText, duration, activityType, prop, roles, roomId) { return Object.freeze({ label: labelText, duration, activityType, prop, roles: Object.freeze([...roles]), roomId }); }
function resolveSettlement(target, sim) {
  if (target?.type === 'settlement') return settlementById(sim, target.id);
  if (target?.settlementId) return settlementById(sim, target.settlementId);
  if (target?.roomId && OLD_LANTERN_ROOMS.has(target.roomId)) return settlementById(sim, OLD_LANTERN_ID);
  if (target?.type === 'room' && OLD_LANTERN_ROOMS.has(target.id)) return settlementById(sim, OLD_LANTERN_ID);
  return target?.id === OLD_LANTERN_ID ? settlementById(sim, OLD_LANTERN_ID) : null;
}
function settlementById(sim, id) { return sim?.settlementSystem?.settlements?.get?.(id) ?? null; }
function safeHub(sim) { return settlementById(sim, sim?.settlementSystem?.safeSettlementId) ?? [...(sim?.settlementSystem?.settlements?.values?.() ?? [])].find(value => value.indestructible); }
function oldLantern(sim) { return sim?.ensureOldLanternInnSystem?.() ?? sim?.oldLanternInnSystem ?? null; }
function factionSupply(sim) { return number(sim?.territorySystem?.factionSupply?.get?.(FRIENDLY_FACTION)); }
function setFactionSupply(sim, value) { sim?.territorySystem?.factionSupply?.set?.(FRIENDLY_FACTION, Math.max(0, number(value))); }
function findMaterialSource(target, sim) { return [...(sim?.settlementSystem?.settlements?.values?.() ?? [])].filter(value => value.id !== target.id && value.factionId === FRIENDLY_FACTION && number(value.materials) >= 3 && ['active', 'damaged', 'threatened'].includes(value.state ?? 'active')).sort((a, b) => number(b.materials) - number(a.materials))[0] ?? null; }
function label(settlement) { return settlement?.name ?? settlement?.type?.replaceAll?.('-', ' ') ?? settlement?.id ?? 'settlement'; }
function routeById(sim, id) { return sim?.routeGraph?.getRoute?.(id) ?? sim?.scenario?.routes?.find?.(route => route.id === id) ?? null; }
function firstHiddenRoute(sim) { return (sim?.scenario?.routes ?? []).find(route => route.kind === 'secret' && ['hidden', 'suspected'].includes(route.state)) ?? sim?.routeGraph?.routes?.find?.(route => route.kind === 'secret' && ['hidden', 'suspected'].includes(route.state)) ?? null; }
function setRoute(sim, id, state) { if (typeof sim?.setRouteState === 'function') return sim.setRouteState(id, state, { source: 'old-lantern-rumor' }); if (sim?.routeGraph?.setRouteState) return sim.routeGraph.setRouteState(id, state, { source: 'old-lantern-rumor' }); return fail('active campaign graph unavailable'); }
function findPartyForAgent(sim, agentId) { const source = sim?.expeditionSystem?.parties; const parties = source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : []; return parties.find(party => (party.memberIds ?? party.members ?? []).some(member => (typeof member === 'string' ? member : member.id) === agentId)) ?? parties[0] ?? null; }
function partyMembers(sim, party) { if (!party) return []; const ids = new Set((party.memberIds ?? party.members ?? []).map(member => typeof member === 'string' ? member : member.id)); return sim.agents.filter(agent => ids.has(agent.id)); }
function createRecruit(sim, settlement, sequence) {
  const template = sim.agents.find(isAvailable);
  if (!template) return null;
  const roles = ['fighter', 'rogue', 'cleric', 'wizard', 'archer'];
  const role = roles[sequence % roles.length];
  const id = `old-lantern-recruit-${sequence + 1}`;
  const recruit = {
    ...template,
    id,
    name: ['Elia', 'Bram', 'Sister Vale', 'Orren', 'Tamsin'][sequence % 5],
    role,
    faction: 'party',
    factionId: FRIENDLY_FACTION,
    ecologyFaction: FRIENDLY_FACTION,
    roomId: settlement.roomId,
    homeRoomId: settlement.roomId,
    homeSettlementId: settlement.id,
    alive: true,
    departed: false,
    hidden: false,
    downed: false,
    travel: null,
    combat: null,
    activity: null,
    cargoId: null,
    carryingHostId: null,
    attachedToId: null,
    hp: number(template.maxHp, 10),
    maxHp: number(template.maxHp, 10),
    fatigue: 0,
    stress: 0,
    gold: 1,
    inventory: [],
    equipment: {},
    index: sim.agents.length
  };
  sim.agents.push(recruit);
  sim.occupancy?.placeAgent?.(recruit, settlement.roomId);
  sim.personalitySystem?.initializeAgent?.(recruit);
  sim.settlementSystem?.assignHome?.(recruit, sim);
  return recruit;
}
function beginDutyActivity(agent, duty, sim) { agent.activity = { id: `duty-${duty.id}-${agent.id}`, source: 'settlement-duty', type: duty.type === 'worker' ? 'restoration-duty' : 'garrison-duty', prop: duty.prop, phase: 'loop', progress: 0.5, startedAt: number(sim.time), endsAt: Number.POSITIVE_INFINITY, duration: Number.POSITIVE_INFINITY, interruptible: true, assignedBy: 'observer', roomId: duty.roomId, targetRoomId: duty.roomId, targetId: duty.settlementId, anchor: { slotId: `duty:${duty.id}:${agent.id}`, ox: duty.type === 'worker' ? -1.1 : 1.1, oz: duty.type === 'worker' ? 0.6 : -0.6, facing: duty.type === 'worker' ? 0.4 : -0.4, scale: 1 }, label: duty.type === 'worker' ? 'Restoration crew' : 'Garrison watch' }; }
function isAvailable(agent) { return Boolean(agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.hosted && !agent.attachedToId && (agent.faction === 'party' || agent.factionId === FRIENDLY_FACTION)); }
function isActivityValid(agent, activity) { return isAvailable(agent) && !agent.travel && !agent.combat && agent.roomId === activity.roomId; }
function clearActivity(agent, reason) { if (!['settlement-operation', 'settlement-duty'].includes(agent?.activity?.source)) return; agent.lastSettlementOperation = { orderId: agent.activity.orderId ?? null, reason }; agent.activity = null; if (!agent.combat && !agent.travel) agent.mood = reason === 'complete' ? 'settlement-operation-complete' : 'settlement-operation-interrupted'; }
function nextStep(graph, from, to) { if (from === to) return from; const queue = [[from]]; const seen = new Set([from]); while (queue.length) { const path = queue.shift(); const last = path.at(-1); for (const n of graph?.get?.(last) ?? []) { if (seen.has(n)) continue; const next = [...path, n]; if (n === to) return next[1]; seen.add(n); queue.push(next); } } return from; }
function distance(graph, from, to) { if (!from || !to) return Infinity; if (from === to) return 0; const queue = [{ room: from, d: 0 }]; const seen = new Set([from]); while (queue.length) { const current = queue.shift(); for (const n of graph?.get?.(current.room) ?? []) { if (seen.has(n)) continue; if (n === to) return current.d + 1; seen.add(n); queue.push({ room: n, d: current.d + 1 }); } } return Infinity; }
function anchor(order, room, agentId) { const angle = hash(`${order.id}:${agentId}`) * Math.PI * 2; const radius = Math.min(1.25, Math.max(0.55, Math.min(room?.w ?? 8, room?.d ?? 8) * 0.07)); return { slotId: `${order.id}:${agentId}`, ox: Math.cos(angle) * radius, oz: Math.sin(angle) * radius, facing: angle + Math.PI, scale: 1 }; }
function clone(order) { return { ...order, reserved: order.reserved ? { ...order.reserved } : null, result: order.result && typeof order.result === 'object' ? { ...order.result } : order.result }; }
function ok(result) { return { ok: true, result }; }
function fail(error) { return { ok: false, error }; }
function number(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash(value) { let result = 2166136261; for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
