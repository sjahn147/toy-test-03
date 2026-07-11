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
    const memberIds = uniqueStrings