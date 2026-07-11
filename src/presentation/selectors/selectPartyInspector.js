// Party inspector selector for the production strategy observer shell.

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function alive(agent) {
  return agent?.alive !== false && agent?.dead !== true && agent?.departed !== true;
}

export function selectPartyInspector(state, partyId) {
  if (typeof partyId !== 'string' || !partyId) return null;
  const parties = table(state, 'parties');
  const agents = table(state, 'agents');
  const rooms = table(state, 'rooms');
  const settlements = table(state, 'settlements');
  const party = parties[partyId] ?? {};
  const members = Object.values(agents).filter(agent => agent.partyId === partyId);
  if (!parties[partyId] && members.length === 0) return null;

  const leaderId = party.leaderId
    ?? members.find(member => member.partyLeaderId === member.id)?.id
    ?? members[0]?.partyLeaderId
    ?? members[0]?.id
    ?? null;
  const leader = leaderId ? agents[leaderId] : null;
  const targetRoomId = party.targetRoomId
    ?? members.find(member => member.travel)?.travel?.toRoomId
    ?? leader?.roomId
    ?? null;
  const base = party.baseSettlementId ? settlements[party.baseSettlementId] : null;

  return {
    identity: {
      id: partyId,
      name: party.name ?? partyId.replaceAll('-', ' '),
      state: party.expeditionState ?? party.state ?? members[0]?.partyState ?? 'assembled',
      leaderId,
      leaderName: leader?.name ?? leaderId
    },
    roster: members.map(member => ({
      id: member.id,
      name: member.name ?? member.id,
      role: member.role ?? member.kind ?? 'agent',
      alive: alive(member),
      orphaned: member.orphaned === true,
      roomId: member.travel?.toRoomId ?? member.roomId ?? null,
      hp: member.hp ?? member.health ?? 0,
      maxHp: member.maxHp ?? member.maxHealth ?? member.hp ?? 0
    })),
    cohesion: typeof party.cohesion === 'number' ? party.cohesion : null,
    target: {
      roomId: targetRoomId,
      roomName: targetRoomId ? rooms[targetRoomId]?.name ?? targetRoomId : null
    },
    expedition: {
      provisions: party.provisions ?? 0,
      maxProvisions: party.maxProvisions ?? 0,
      water: party.water ?? 0,
      maxWater: party.maxWater ?? 0,
      medicine: party.medicine ?? 0,
      maxMedicine: party.maxMedicine ?? 0,
      endurance: party.endurance ?? 0,
      maxExpeditionTime: party.maxExpeditionTime ?? 0,
      expeditionTime: party.expeditionTime ?? 0
    },
    base: base ? {
      id: base.id,
      name: base.name ?? base.type?.replaceAll('-', ' ') ?? base.id,
      roomId: base.roomId ?? null,
      state: base.state ?? 'active'
    } : null
  };
}
