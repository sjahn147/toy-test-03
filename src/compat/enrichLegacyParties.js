// Derive normalized party structure without changing expedition gameplay snapshots.
// The legacy expedition snapshot owns supply/endurance values, while agent records
// already carry party membership, leader and movement state.

export function enrichLegacyParties(parties, agents) {
  const result = { ...parties };
  const membersByParty = new Map();

  for (const agent of Object.values(agents)) {
    if (typeof agent.partyId !== 'string' || !agent.partyId) continue;
    const members = membersByParty.get(agent.partyId) ?? [];
    members.push(agent);
    membersByParty.set(agent.partyId, members);
    result[agent.partyId] ??= { id: agent.partyId, name: agent.partyId };
  }

  for (const [partyId, party] of Object.entries(result)) {
    const members = membersByParty.get(partyId) ?? [];
    const memberIds = uniqueStrings([
      ...(Array.isArray(party.memberIds) ? party.memberIds : []),
      ...members.map(member => member.id)
    ]);
    const leaderId = party.leaderId
      ?? members.find(member => member.partyLeaderId === member.id)?.id
      ?? members.find(member => member.partyLeaderId)?.partyLeaderId
      ?? memberIds[0]
      ?? null;
    const leader = leaderId ? agents[leaderId] : null;

    result[partyId] = {
      ...party,
      id: partyId,
      memberIds,
      leaderId,
      state: party.state ?? party.expeditionState ?? members[0]?.partyState ?? 'assembled',
      cohesion: typeof party.cohesion === 'number' ? party.cohesion : null,
      targetRoomId: party.targetRoomId
        ?? leader?.travel?.toRoomId
        ?? leader?.roomId
        ?? members.find(member => member.travel?.toRoomId)?.travel?.toRoomId
        ?? members[0]?.roomId
        ?? null
    };
  }

  return result;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value))];
}
