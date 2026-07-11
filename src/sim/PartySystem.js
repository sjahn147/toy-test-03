import { graphDistance } from './Pathfinding.js';

const PARTY_SIZE = 5;

export class PartySystem {
  constructor(graph) {
    this.graph = graph;
    this.parties = new Map();
    this.partySeq = 1;
  }

  initialize(agents) {
    const existing = agents.filter(agent => agent.faction === 'party' && agent.partyId);
    for (const agent of existing) this.ensurePartyRecord(agent.partyId);

    const unassigned = agents.filter(agent => agent.faction === 'party' && !agent.partyId);
    for (let index = 0; index < unassigned.length; index += PARTY_SIZE) {
      const members = unassigned.slice(index, index + PARTY_SIZE);
      this.createParty(members);
    }

    this.update(agents);
  }

  createParty(members) {
    if (!members.length) return null;
    const id = `party-${this.partySeq++}`;
    const leader = members.find(agent => ['fighter', 'paladin', 'barbarian'].includes(agent.role)) ?? members[0];
    const record = {
      id,
      name: `Expedition ${alphabeticLabel(this.partySeq - 2)}`,
      leaderId: leader.id,
      memberIds: members.map(agent => agent.id),
      state: 'assembled',
      cohesion: 1,
      targetRoomId: null
    };
    this.parties.set(id, record);
    for (const agent of members) {
      agent.partyId = id;
      agent.partyLeaderId = leader.id;
      agent.partyState = 'assembled';
      agent.orphaned = false;
    }
    return record;
  }

  addAgent(agent, preferredPartyId = null) {
    if (agent.faction !== 'party') return null;
    let party = preferredPartyId ? this.parties.get(preferredPartyId) : null;
    if (!party || party.memberIds.length >= PARTY_SIZE) {
      party = [...this.parties.values()].find(candidate => candidate.memberIds.length < PARTY_SIZE) ?? this.createParty([agent]);
      if (party?.memberIds.includes(agent.id)) return party;
    }
    party.memberIds.push(agent.id);
    agent.partyId = party.id;
    agent.partyLeaderId = party.leaderId;
    return party;
  }

  update(agents) {
    for (const party of this.parties.values()) {
      const members = party.memberIds
        .map(id => agents.find(agent => agent.id === id))
        .filter(agent => agent && agent.alive && !agent.departed);
      if (!members.length) continue;

      let leader = members.find(agent => agent.id === party.leaderId);
      if (!leader) {
        leader = members.find(agent => ['fighter', 'paladin', 'barbarian'].includes(agent.role)) ?? members[0];
        party.leaderId = leader.id;
      }

      const leaderRoom = projectedRoom(leader);
      const distances = members.map(member => ({ member, distance: this.distanceBetween(member, leader) }));
      const maxDistance = Math.max(...distances.map(item => item.distance));
      const orphanCount = distances.filter(item => item.distance >= 2).length;
      const splitCount = distances.filter(item => item.distance >= 1).length;

      party.state = orphanCount > 0 ? 'orphaned' : splitCount > 1 ? 'split' : maxDistance > 0 ? 'stretched' : 'assembled';
      party.cohesion = clamp(1 - distances.reduce((sum, item) => sum + item.distance, 0) / Math.max(1, members.length * 3), 0, 1);
      party.targetRoomId = leader.travel?.toRoomId ?? leaderRoom;

      for (const { member, distance } of distances) {
        member.partyLeaderId = leader.id;
        member.orphaned = distance >= 2;
        member.partyState = member.orphaned ? 'orphaned' : party.state;
        member.partyDistance = distance;
      }
    }
  }

  getParty(agent) {
    return agent.partyId ? this.parties.get(agent.partyId) ?? null : null;
  }

  getLeader(agent, agents) {
    const party = this.getParty(agent);
    return party ? agents.find(candidate => candidate.id === party.leaderId) ?? null : null;
  }

  getFollowRoom(agent, agents) {
    const leader = this.getLeader(agent, agents);
    if (!leader || leader.id === agent.id) return null;
    if (leader.travel) return leader.travel.toRoomId;
    return leader.roomId;
  }

  leaderShouldWait(agent, agents) {
    const party = this.getParty(agent);
    if (!party || party.leaderId !== agent.id) return false;
    const members = party.memberIds
      .map(id => agents.find(candidate => candidate.id === id))
      .filter(member => member && member.alive && !member.departed && member.id !== agent.id);
    return members.some(member => this.distanceBetween(member, agent) >= 2);
  }

  distanceBetween(a, b) {
    if (!a || !b) return Infinity;
    if (a.travel && b.travel && a.travel.connectionId === b.travel.connectionId) return 0;
    const aRoom = projectedRoom(a);
    const bRoom = projectedRoom(b);
    if (aRoom === bRoom) return 0;
    return graphDistance(this.graph, aRoom, bRoom);
  }

  ensurePartyRecord(id) {
    if (!this.parties.has(id)) {
      this.parties.set(id, {
        id,
        name: id,
        leaderId: null,
        memberIds: [],
        state: 'assembled',
        cohesion: 1,
        targetRoomId: null
      });
    }
    return this.parties.get(id);
  }

  snapshot() {
    return [...this.parties.values()].map(party => ({ ...party, memberIds: [...party.memberIds] }));
  }
}

function projectedRoom(agent) {
  if (!agent) return null;
  if (agent.travel?.phase === 'entering') return agent.travel.toRoomId;
  return agent.travel?.toRoomId ?? agent.roomId;
}

function alphabeticLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
