// Collection selectors for the production strategy observer shell.
// All functions consume only normalized WorldSnapshot records.

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function alive(agent) {
  return agent?.alive !== false && agent?.dead !== true && agent?.departed !== true;
}

function factionId(agent) {
  return agent?.faction === 'party'
    ? 'adventurer-expedition'
    : agent?.factionId ?? agent?.ecologyFaction ?? agent?.faction ?? 'unaffiliated';
}

function settlementName(settlement, props) {
  const anchor = settlement?.anchorPropId ? props[settlement.anchorPropId] : null;
  return anchor?.label ?? settlement?.name ?? settlement?.label ?? settlement?.type?.replaceAll('-', ' ') ?? settlement?.id ?? 'Settlement';
}

export function selectFactionList(state) {
  const agents = Object.values(table(state, 'agents'));
  const settlements = Object.values(table(state, 'settlements'));
  const rooms = Object.values(table(state, 'rooms'));
  const records = table(state, 'factions');
  const ids = new Set(Object.keys(records));
  for (const agent of agents) ids.add(factionId(agent));
  for (const settlement of settlements) if (settlement.factionId) ids.add(settlement.factionId);

  return [...ids].filter(Boolean).map(id => {
    const population = agents.filter(agent => alive(agent) && factionId(agent) === id).length;
    const ownedSettlements = settlements.filter(settlement => settlement.factionId === id && !['ruined', 'abandoned'].includes(settlement.state));
    const territories = rooms.filter(room => (room.factionId ?? room.ownerFactionId ?? room.ownership?.factionId) === id).length;
    const threatened = ownedSettlements.filter(settlement => ['threatened', 'damaged', 'collapsing'].includes(settlement.state)).length;
    return {
      id,
      name: records[id]?.name ?? id.replaceAll('-', ' '),
      population,
      settlements: ownedSettlements.length,
      territories,
      threatened
    };
  }).filter(faction => faction.population > 0 || faction.settlements > 0 || faction.territories > 0)
    .sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
}

export function selectPartyList(state) {
  const agents = table(state, 'agents');
  const parties = table(state, 'parties');
  const settlements = table(state, 'settlements');
  const ids = new Set(Object.keys(parties));
  for (const agent of Object.values(agents)) if (agent.partyId) ids.add(agent.partyId);

  return [...ids].map(id => {
    const record = parties[id] ?? {};
    const members = Object.values(agents).filter(agent => agent.partyId === id && alive(agent));
    const leaderId = record.leaderId ?? members.find(member => member.partyLeaderId === member.id)?.id ?? members[0]?.partyLeaderId ?? members[0]?.id ?? null;
    const leader = leaderId ? agents[leaderId] : null;
    const base = record.baseSettlementId ? settlements[record.baseSettlementId] : null;
    return {
      id,
      name: record.name ?? id.replaceAll('-', ' '),
      memberCount: members.length,
      leaderId,
      leaderName: leader?.name ?? leaderId,
      state: record.expeditionState ?? record.state ?? members[0]?.partyState ?? 'assembled',
      cohesion: typeof record.cohesion === 'number' ? record.cohesion : null,
      targetRoomId: record.targetRoomId ?? members.find(member => member.travel)?.travel?.toRoomId ?? members[0]?.roomId ?? null,
      baseSettlementId: record.baseSettlementId ?? null,
      baseName: base?.name ?? base?.type?.replaceAll('-', ' ') ?? null,
      provisions: record.provisions ?? null,
      water: record.water ?? null,
      endurance: record.endurance ?? null
    };
  }).sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
}

export function selectSettlementList(state) {
  const settlements = table(state, 'settlements');
  const props = table(state, 'props');
  return Object.values(settlements).map(settlement => ({
    id: settlement.id,
    name: settlementName(settlement, props),
    factionId: settlement.factionId ?? null,
    roomId: settlement.roomId ?? null,
    state: settlement.state ?? 'active',
    population: settlement.population ?? settlement.residentIds?.length ?? 0,
    capacity: settlement.capacity ?? 0,
    integrity: settlement.structuralIntegrity ?? settlement.integrity ?? null,
    supplyStatus: settlement.supplyStatus ?? 'open'
  })).sort((a, b) => {
    const threatA = ['threatened', 'damaged', 'collapsing'].includes(a.state) ? 1 : 0;
    const threatB = ['threatened', 'damaged', 'collapsing'].includes(b.state) ? 1 : 0;
    return threatB - threatA || b.population - a.population || a.name.localeCompare(b.name);
  });
}

export function selectRoomList(state) {
  const rooms = table(state, 'rooms');
  const agentsByRoom = state?.indexes?.agentsByRoom ?? {};
  return Object.values(rooms).map(room => ({
    id: room.id,
    name: room.name ?? room.id,
    kind: room.kind ?? 'room',
    visited: room.visited === true,
    secret: Array.isArray(room.tags) && room.tags.includes('secret_route'),
    factionId: room.factionId ?? room.ownerFactionId ?? room.ownership?.factionId ?? null,
    danger: room.danger ?? null,
    occupantCount: agentsByRoom[room.id]?.length ?? 0
  })).sort((a, b) => Number(b.visited) - Number(a.visited) || b.occupantCount - a.occupantCount || a.name.localeCompare(b.name));
}

export function selectFollowRoster(state) {
  return Object.values(table(state, 'agents'))
    .filter(agent => alive(agent) && agent.hidden !== true)
    .map(agent => ({
      id: agent.id,
      name: agent.name ?? agent.id,
      role: agent.role ?? agent.kind ?? 'agent',
      factionId: factionId(agent),
      roomId: agent.travel?.toRoomId ?? agent.roomId ?? null,
      partyId: agent.partyId ?? null
    }))
    .sort((a, b) => Number(b.factionId === 'adventurer-expedition') - Number(a.factionId === 'adventurer-expedition') || a.name.localeCompare(b.name));
}

export function selectObserverFactionSummary(state, observerFactionId = null) {
  const factions = selectFactionList(state);
  const selected = factions.find(faction => faction.id === observerFactionId)
    ?? factions.find(faction => faction.id === 'adventurer-expedition')
    ?? factions[0]
    ?? null;
  if (!selected) return null;

  const settlements = selectSettlementList(state).filter(settlement => settlement.factionId === selected.id);
  const cargo = Object.values(table(state, 'cargo')).filter(item => item.factionId === selected.id && item.state === 'carried');
  return {
    ...selected,
    capacity: settlements.reduce((sum, settlement) => sum + settlement.capacity, 0),
    carriedCargo: cargo.length,
    threatenedSettlements: settlements.filter(settlement => ['threatened', 'damaged', 'collapsing'].includes(settlement.state)).length
  };
}

// faction 인스펙터: 세력 클릭 시 소속 유닛 로스터를 보여준다.
// (기존엔 세력 클릭이 관찰 세력 전환만 하고 selection을 비워 아무 것도 안 나왔다.)
export function selectFactionInspector(state, id) {
  if (!id) return null;
  const agents = Object.values(table(state, 'agents'));
  const settlements = Object.values(table(state, 'settlements'));
  const rooms = Object.values(table(state, 'rooms'));
  const records = table(state, 'factions');
  const roster = agents.filter(agent => alive(agent) && factionId(agent) === id);
  // 세력 id가 스냅샷 어디에도 없으면 null (bogus id 방어).
  if (!roster.length && !records[id]) return null;

  const members = roster
    .filter(agent => agent.hidden !== true)
    .map(agent => ({
      id: agent.id,
      name: agent.name ?? agent.id,
      role: agent.role ?? agent.kind ?? 'agent',
      hp: Math.max(0, Math.round(agent.hp ?? agent.health ?? 0)),
      maxHp: Math.round(agent.maxHp ?? agent.maxHealth ?? agent.hp ?? 0),
      roomId: agent.travel?.toRoomId ?? agent.roomId ?? null,
      status: agent.mood ?? agent.combat?.state ?? (agent.orphaned ? 'orphaned' : null)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const owned = settlements.filter(settlement => settlement.factionId === id && !['ruined', 'abandoned'].includes(settlement.state));
  return {
    identity: { id, name: records[id]?.name ?? id.replaceAll('-', ' ') },
    stats: {
      population: roster.length,
      settlements: owned.length,
      territories: rooms.filter(room => (room.factionId ?? room.ownerFactionId ?? room.ownership?.factionId) === id).length
    },
    members
  };
}
