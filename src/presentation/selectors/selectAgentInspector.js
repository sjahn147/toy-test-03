// agent inspector selector (surface.inspector.agent).
// 레코드에 실제로 존재하는 필드만 카드로 매핑하고, 없는 카드는 생략합니다.

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

export function selectAgentInspector(state, agentId) {
  if (typeof agentId !== 'string' || agentId.length === 0) return null;
  const agent = table(state, 'agents')[agentId];
  if (!agent || typeof agent !== 'object') return null;

  const result = {
    identity: {
      id: agentId,
      name: firstString(agent.name) ?? agentId,
      role: firstString(agent.role, agent.kind) ?? null,
      faction: firstString(agent.factionId, agent.ecologyFaction, agent.faction) ?? null,
      level: firstNumber(agent.level) ?? 1
    }
  };

  const hp = firstNumber(agent.hp, agent.health);
  const maxHp = firstNumber(agent.maxHp, agent.maxHealth);
  const fatigue = firstNumber(agent.fatigue);
  const stress = firstNumber(agent.stress, agent.fear);
  if (hp !== null || maxHp !== null || fatigue !== null || stress !== null) {
    result.vitals = {
      hp: hp ?? 0,
      maxHp: maxHp ?? hp ?? 0,
      fatigue: fatigue ?? 0
    };
    if (stress !== null) result.vitals.stress = stress;
  }

  const status = firstString(agent.status, agent.state, agent.task, agent.activity);
  const targetRoomId = firstString(
    agent.targetRoomId,
    agent.travel?.to,
    agent.travel?.targetRoomId,
    agent.destinationRoomId
  );
  const thought = firstString(agent.thought, agent.mood);
  if (status !== null || targetRoomId !== null || thought !== null) {
    result.intent = { status: status ?? 'idle' };
    if (targetRoomId !== null) result.intent.targetRoomId = targetRoomId;
    if (thought !== null) result.intent.thought = thought;
  }

  const partyId = firstString(agent.partyId);
  if (partyId !== null) {
    const party = table(state, 'parties')[partyId];
    result.party = {
      id: partyId,
      state: firstString(party?.state, party?.phase, party?.status) ?? null
    };
  }

  const settlementId = firstString(agent.homeSettlementId, agent.settlementId);
  const homeRoomId = firstString(agent.homeRoomId);
  if (settlementId !== null || homeRoomId !== null) {
    result.home = {};
    if (settlementId !== null) result.home.settlementId = settlementId;
    if (homeRoomId !== null) result.home.roomId = homeRoomId;
  }

  const equipment = Array.isArray(agent.equipment)
    ? agent.equipment
    : (agent.equipment && typeof agent.equipment === 'object'
      ? Object.values(agent.equipment)
      : []);
  if (equipment.length > 0) {
    result.equipment = equipment.map(item =>
      item && typeof item === 'object' ? { ...item } : item
    );
  }

  if (Array.isArray(agent.memories) && agent.memories.length > 0) {
    result.memories = agent.memories.map(memory =>
      memory && typeof memory === 'object' ? { ...memory } : memory
    );
  }

  return result;
}
