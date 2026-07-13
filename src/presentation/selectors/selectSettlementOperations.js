const ACTIVE = new Set(['queued', 'moving', 'working', 'interrupted']);
const OLD_LANTERN_ID = 'settlement-old-lantern-inn';
const OLD_LANTERN_ROOMS = new Set(['H36', 'H37', 'H38', 'H39', 'H40']);

function table(state, name) {
  const value = state?.entities?.[name];
  return value && typeof value === 'object' ? value : {};
}

export function selectSettlementOperations(state, target) {
  const settlement = resolveSettlement(state, target);
  if (!settlement) return { actions: [], tasks: [], settlement: null };
  const orders = Object.values(table(state, 'settlementOrders')).filter(order => ACTIVE.has(order.status) && order.settlementId === settlement.id);
  const actions = candidates(target, settlement).map(action => finalize(action, { state, settlement, orders }));
  return { actions, tasks: orders.map(summarize), settlement: summarizeSettlement(settlement) };
}

function candidates(target, settlement) {
  const actions = [];
  const roomId = target?.type === 'room' ? target.id : target?.roomId;
  const oldLantern = settlement.id === OLD_LANTERN_ID;
  if (target?.type === 'settlement' || roomId === 'H36' || target?.type === 'landmark' || target?.type === 'interaction-socket') {
    actions.push(
      item('settlement.upgrade', 'Restore', 'Commit a work shift toward the next settlement tier.'),
      item('settlement.allocate-materials', 'Deliver materials', 'Move spare construction materials from a friendly base.'),
      item('settlement.allocate-supply', 'Deliver supplies', 'Move two units from the expedition reserve into the settlement.'),
      item('settlement.assign-workers', 'Assign worker', 'Add a persistent restoration worker to this settlement.'),
      item('settlement.release-workers', 'Release worker', 'Release one restoration worker back to normal duties.'),
      item('settlement.set-garrison', 'Assign garrison', 'Add a persistent defender to this settlement.'),
      item('settlement.release-garrison', 'Release garrison', 'Release one defender back to normal duties.'),
      item('settlement.fortify', 'Toggle fortification', 'Switch the settlement between normal and fortified posture.')
    );
  }
  if (!oldLantern) return actions;
  if (target?.type === 'settlement' || roomId === 'H36') actions.push(
    item('inn.trade', 'Trade', 'Purchase an expedition supply bundle at the common-room counter.'),
    item('inn.recruit', 'Recruit', 'Hire a new adventurer when the inn has spare capacity.'),
    item('inn.regroup', 'Regroup party', 'Set the Old Lantern as expedition base and replenish the party.')
  );
  if (target?.type === 'settlement' || roomId === 'H38') actions.push(item('inn.rest', 'Rest', 'Send the most fatigued adventurer to the guest wing.'));
  if (target?.type === 'settlement' || roomId === 'H40') actions.push(
    item('inn.rumors', 'Gather rumors', 'Search the secret office network for route intelligence.'),
    item('inn.smuggling', 'Run smuggler route', 'Travel H40–I45 and return with covert supplies.')
  );
  return actions;
}

function finalize(action, context) {
  const { state, settlement, orders } = context;
  let enabled = true;
  let reason = null;
  const duplicate = orders.find(order => order.actionId === action.id);
  const services = settlement.services ?? {};
  if (duplicate) {
    enabled = false;
    reason = `${duplicate.status} as ${duplicate.id}`;
  } else if (settlement.factionId && settlement.factionId !== 'adventurer-expedition') {
    enabled = false;
    reason = 'Only friendly settlements can receive these orders.';
  } else if (action.id === 'settlement.upgrade' && Number(settlement.tier ?? 0) >= 4) {
    enabled = false;
    reason = 'The Old Lantern is fully restored.';
  } else if (action.id === 'settlement.allocate-materials' && !Object.values(table(state, 'settlements')).some(value => value.id !== settlement.id && value.factionId === settlement.factionId && Number(value.materials ?? 0) >= 3)) {
    enabled = false;
    reason = 'No friendly settlement has spare materials.';
  } else if (action.id === 'settlement.release-workers' && Number(settlement.workerTarget ?? 0) <= 0) {
    enabled = false;
    reason = 'No restoration workers are assigned.';
  } else if (action.id === 'settlement.release-garrison' && Number(settlement.garrisonTarget ?? 0) <= 0) {
    enabled = false;
    reason = 'No garrison is assigned.';
  } else if (action.id === 'inn.rest' && !services.guestRooms) {
    enabled = false;
    reason = 'Guest rooms are not operational.';
  } else if (action.id === 'inn.rest' && Number(settlement.food ?? 0) < 1) {
    enabled = false;
    reason = 'The inn has no meal reserve for a proper rest.';
  } else if (action.id === 'inn.trade' && !services.trade) {
    enabled = false;
    reason = 'The trade counter is closed.';
  } else if (action.id === 'inn.recruit' && (!services.trade || Number(settlement.capacity ?? 0) <= Number(settlement.presentPopulation ?? 0))) {
    enabled = false;
    reason = 'Recruitment requires trade service and spare capacity.';
  } else if (action.id === 'inn.recruit' && Number(settlement.wealth ?? 0) < 1) {
    enabled = false;
    reason = 'The inn needs one wealth to secure a recruit.';
  } else if (action.id === 'inn.regroup' && !services.partyRegroup) {
    enabled = false;
    reason = 'Party regroup is not unlocked.';
  } else if (action.id === 'inn.rumors' && !services.rumors) {
    enabled = false;
    reason = 'Rumor service is not available.';
  } else if (action.id === 'inn.smuggling') {
    const route = table(state, 'connections')['secret-H40-I45'];
    if (!services.smuggling) {
      enabled = false;
      reason = 'The secret office is not operational.';
    } else if (!route || !['open', 'opened'].includes(route.state)) {
      enabled = false;
      reason = 'The H40–I45 smuggler route is closed.';
    }
  }
  return { ...action, enabled, reason, target: { type: 'settlement', id: settlement.id, settlementId: settlement.id, roomId: settlement.roomId, label: settlement.name ?? settlement.type ?? settlement.id } };
}

function resolveSettlement(state, target) {
  const settlements = table(state, 'settlements');
  if (target?.type === 'settlement') return settlements[target.id] ?? null;
  const roomId = target?.type === 'room' ? target.id : target?.roomId;
  if (OLD_LANTERN_ROOMS.has(roomId)) return settlements[OLD_LANTERN_ID] ?? Object.values(settlements).find(value => value.type === 'old-lantern-inn') ?? null;
  return target?.settlementId ? settlements[target.settlementId] ?? null : null;
}
function summarize(order) { return { id: order.id, actionId: order.actionId, label: order.label ?? order.actionId, status: order.status, progress: Number.isFinite(order.progress) ? order.progress : 0, assignedAgentId: order.assignedAgentId ?? null, lastError: order.lastError ?? null, stage: order.stage ?? null, source: 'settlement' }; }
function summarizeSettlement(value) { return { id: value.id, tier: value.tier ?? 0, state: value.state ?? 'unknown', supplyReserve: value.supplyReserve ?? 0, workerTarget: value.workerTarget ?? 0, garrisonTarget: value.garrisonTarget ?? 0, defenseMode: value.defenseMode ?? 'normal', services: { ...(value.services ?? {}) }, nextUpgrade: value.nextUpgrade ? { ...value.nextUpgrade } : null, upgradeProgress: value.upgradeProgress ?? value.innUpgradeProgress ?? null }; }
function item(id, label, description) { return { id, label, description }; }
