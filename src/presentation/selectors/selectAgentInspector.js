// Agent inspector selector (surface.inspector.agent).
// This selector is the only place where the UI joins normalized entity tables.

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function projectedRoomId(agent) {
  return firstString(agent.travel?.toRoomId, agent.travel?.targetRoomId, agent.destinationRoomId, agent.roomId);
}

function statusOf(agent) {
  if (agent.infected) return 'infected';
  if (agent.attachedToId) return 'feeding attachment';
  if ((agent.sporeSleep ?? 0) > 0) return `spore sleep ${Math.ceil(agent.sporeSleep)}s`;
  if (agent.hosted) return 'living host';
  if (agent.queued) return 'waiting outside';
  if (agent.downed) return `downed ${Math.ceil(agent.bleedout ?? 0)}s`;
  if (agent.departed) return 'departed';
  if (agent.alive === false) return agent.resurrectable ? 'awaiting return' : 'fallen';
  if (agent.combat?.phase) return agent.combat.phase;
  if (agent.travel?.phase) return agent.travel.phase;
  return firstString(agent.personalityState, agent.partyState, agent.mood, agent.status, agent.state, agent.task, agent.activity) ?? 'active';
}

function thoughtOf(agent) {
  if (agent.infected) return 'There is something inside me with a schedule.';
  if (agent.attachedToId) return 'The blood is warm and the exit plan is excellent.';
  if ((agent.sporeSleep ?? 0) > 0) return 'The mushrooms have made a persuasive argument for lying down.';
  if (agent.hosted) return 'The silk is warm. That is not reassuring.';
  if (agent.queued) return 'Everyone is here. Someone is still checking the rope.';
  if (agent.downed) return `I have about ${Math.ceil(agent.bleedout ?? 0)} seconds of optimism left.`;
  if (agent.alive === false && agent.resurrectable) return 'The statue has not forgotten my name yet.';
  if (agent.alive === false) return 'I have become useful documentation.';
  if ((agent.webbed ?? 0) > 0) return 'The silk is tighter than the employment contract.';
  if (Object.values(agent.equipment ?? {}).some(item => item?.broken)) return 'Something important is making the wrong metal noise.';
  if ((agent.hunger ?? 0) >= 82) return 'Everything nearby has become a menu category.';
  if (agent.carryingHostId) return 'The brood chamber is this way. The package is still breathing.';
  if ((agent.resurrectionSickness ?? 0) > 0) return 'Being alive again is more tiring than advertised.';
  if (agent.combat?.phase === 'windup') return 'This is the part where commitment becomes visible.';
  if (agent.travel) return 'The corridor is taking this personally.';
  if ((agent.fatigue ?? 0) > 75) return 'A bench, a fountain, or a small administrative miracle would help.';
  if (agent.orphaned) return 'I should be able to hear the others.';
  return firstString(agent.thought, agent.mood) ?? 'I am making a small decision badly.';
}

function findParty(parties, agent) {
  const directId = firstString(agent.partyId);
  if (directId && parties[directId]) return parties[directId];
  return Object.values(parties).find(party => Array.isArray(party.memberIds) && party.memberIds.includes(agent.id)) ?? null;
}

function equipmentList(agent) {
  if (Array.isArray(agent.equipment)) return agent.equipment.map(item => item && typeof item === 'object' ? { ...item } : item);
  if (agent.equipment && typeof agent.equipment === 'object') {
    return Object.entries(agent.equipment).map(([slot, item]) => ({ slot, ...(item && typeof item === 'object' ? item : { value: item }) }));
  }
  return [];
}

export function selectAgentInspector(state, agentId) {
  if (typeof agentId !== 'string' || agentId.length === 0) return null;
  const agents = table(state, 'agents');
  const rooms = table(state, 'rooms');
  const settlements = table(state, 'settlements');
  const props = table(state, 'props');
  const cargoTable = table(state, 'cargo');
  const parties = table(state, 'parties');
  const agent = agents[agentId];
  if (!agent || typeof agent !== 'object') return null;

  const roomId = projectedRoomId(agent);
  const room = roomId ? rooms[roomId] : null;
  const destinationId = firstString(agent.travel?.toRoomId, agent.travel?.targetRoomId, agent.destinationRoomId);
  const destination = destinationId ? rooms[destinationId] : null;
  const settlementId = firstString(agent.homeSettlementId, agent.settlementId);
  const settlement = settlementId ? settlements[settlementId] : null;
  const anchor = settlement?.anchorPropId ? props[settlement.anchorPropId] : null;
  const cargo = firstString(agent.cargoId)
    ? cargoTable[agent.cargoId]
    : Object.values(cargoTable).find(item => item.carrierId === agentId && item.state === 'carried') ?? null;
  const party = findParty(parties, agent);
  const hp = firstNumber(agent.hp, agent.health) ?? 0;
  const maxHp = firstNumber(agent.maxHp, agent.maxHealth) ?? hp;

  const result = {
    identity: {
      id: agentId,
      name: firstString(agent.name) ?? agentId,
      role: firstString(agent.role, agent.kind) ?? null,
      faction: firstString(agent.factionId, agent.ecologyFaction, agent.faction) ?? null,
      level: firstNumber(agent.level) ?? 1
    },
    vitals: {
      hp,
      maxHp,
      attack: firstNumber(agent.attack) ?? 0,
      defense: firstNumber(agent.defense) ?? 0,
      fatigue: firstNumber(agent.fatigue) ?? 0,
      hunger: firstNumber(agent.hunger) ?? 0,
      gold: firstNumber(agent.gold) ?? 0
    },
    intent: {
      status: statusOf(agent),
      thought: thoughtOf(agent),
      roomId,
      roomName: firstString(room?.name) ?? roomId,
      destinationRoomId: destinationId,
      destinationRoomName: firstString(destination?.name) ?? destinationId,
      travelPhase: firstString(agent.travel?.phase)
    },
    flags: {
      alive: agent.alive !== false,
      departed: agent.departed === true,
      displaced: agent.displaced === true,
      overflowLanding: agent.roomCell?.overflow === true,
      blockedMoveCount: firstNumber(agent.blockedMoveCount) ?? 0
    },
    equipment: equipmentList(agent),
    inventory: Array.isArray(agent.inventory) ? agent.inventory.map(item => item && typeof item === 'object' ? { ...item } : item) : [],
    memories: Array.isArray(agent.memories) ? agent.memories.slice(0, 6).map(memory => memory && typeof memory === 'object' ? { ...memory } : memory) : []
  };

  const traits = agent.personality && typeof agent.personality === 'object' ? agent.personality : {};
  const relationships = agent.relationships && typeof agent.relationships === 'object' ? agent.relationships : {};
  result.personality = {
    state: firstString(agent.personalityState) ?? 'steady',
    strongestTraits: Object.entries(traits)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({ name, value })),
    bonds: Object.values(relationships).filter(value => typeof value === 'number' && value >= 0.45).length,
    grudges: Object.values(relationships).filter(value => typeof value === 'number' && value <= -0.35).length
  };

  result.home = settlement ? {
    id: settlement.id,
    name: firstString(anchor?.label, settlement.label, settlement.name) ?? firstString(settlement.type)?.replaceAll('-', ' ') ?? settlement.id,
    state: firstString(settlement.state) ?? 'active',
    supplyStatus: firstString(settlement.supplyStatus) ?? 'open',
    supplyEfficiency: firstNumber(settlement.supplyEfficiency) ?? 1,
    structuralIntegrity: firstNumber(settlement.structuralIntegrity),
    indestructible: settlement.indestructible === true,
    population: firstNumber(settlement.population) ?? 0,
    capacity: firstNumber(settlement.capacity) ?? 0,
    roomId: firstString(settlement.roomId)
  } : null;

  result.cargo = cargo ? {
    id: cargo.id,
    resourceType: firstString(cargo.resourceType) ?? 'cargo',
    amount: firstNumber(cargo.amount) ?? 0,
    state: firstString(cargo.state) ?? 'unknown',
    routeRisk: firstNumber(cargo.routeRisk) ?? 0,
    escorted: Boolean(cargo.escortId),
    destinationSettlementId: firstString(cargo.destinationSettlementId)
  } : null;

  result.party = party ? {
    id: party.id,
    name: firstString(party.name) ?? party.id,
    state: firstString(party.expeditionState, party.state, party.phase, party.status) ?? 'exploring',
    provisions: firstNumber(party.provisions) ?? 0,
    maxProvisions: firstNumber(party.maxProvisions) ?? 0,
    water: firstNumber(party.water) ?? 0,
    maxWater: firstNumber(party.maxWater) ?? 0,
    endurance: firstNumber(party.endurance) ?? 0,
    maxExpeditionTime: firstNumber(party.maxExpeditionTime) ?? 0,
    expeditionTime: firstNumber(party.expeditionTime) ?? 0,
    baseSettlementId: firstString(party.baseSettlementId),
    baseName: firstString(settlements[party.baseSettlementId]?.name, settlements[party.baseSettlementId]?.type)?.replaceAll('-', ' ') ?? null
  } : null;

  return result;
}
