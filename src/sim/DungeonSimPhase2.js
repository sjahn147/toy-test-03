import { DungeonSim as Phase1DungeonSim } from './DungeonSimPhase1.js';
import { EntranceQueueSystem } from './EntranceQueueSystem.js';
import { RecoverySystem } from './RecoverySystem.js';

export class DungeonSim extends Phase1DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    const entryRoom = this.rooms.find(room => room.kind === 'start') ?? this.rooms[0];
    this.entranceQueue = new EntranceQueueSystem({
      entryRoomId: entryRoom.id,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.recoverySystem = new RecoverySystem({
      rooms: this.rooms,
      props: this.props,
      occupancy: this.occupancy,
      partySystem: this.partySystem,
      onEvent: text => this.event(text)
    });
    this.recoverySystem.initializeAgents(this.agents);
    this.queueInitialParties();
  }

  queueInitialParties() {
    for (const party of this.partySystem.parties.values()) {
      const members = party.memberIds
        .map(id => this.agents.find(agent => agent.id === id))
        .filter(agent => agent?.alive && agent.faction === 'party');
      if (!members.length) continue;
      for (const member of members) this.occupancy.release(member.id);
      this.entranceQueue.enqueue(members, { delay: 2.6, label: party.name });
    }
  }

  update(dt) {
    this.entranceQueue.update(dt, this);
    this.recoverySystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (agent.faction === 'party' && agent.alive && !agent.departed && !agent.travel && !agent.queued) {
      const recoveryAction = this.recoverySystem.decide(agent, this);
      if (recoveryAction) action = recoveryAction;
    }

    if (['drink', 'rest', 'camp', 'trade'].includes(action?.type)) {
      this.recoverySystem.resolve(agent, action, this);
      return;
    }

    super.resolve(agent, action);
  }

  beginTravel(agent, toRoomId) {
    if (agent.faction === 'dungeon' && this.recoverySystem.isSafeRoom(toRoomId)) {
      agent.mood = 'repelled-by-sanctuary';
      return;
    }
    super.beginTravel(agent, toRoomId);
  }

  onDeath(killer, target) {
    super.onDeath(killer, target);
    if (target.faction === 'party') {
      target.resurrectable = true;
      target.corpseRoomId = target.roomId;
      target.mood = 'awaiting-return';
    }
  }

  scheduleReturn() {
    if (this.entranceQueue?.queue.length) return;
    super.scheduleReturn();
  }

  returnParty() {
    super.returnParty();
    const entryRoom = this.rooms.find(room => room.kind === 'start') ?? this.rooms[0];
    const candidates = this.agents.filter(agent =>
      agent.faction === 'party' && agent.alive && !agent.departed && !agent.queued && agent.roomId === entryRoom.id
    );
    if (!candidates.length) return;

    const byParty = new Map();
    for (const agent of candidates) {
      if (!byParty.has(agent.partyId)) byParty.set(agent.partyId, []);
      byParty.get(agent.partyId).push(agent);
    }
    for (const members of byParty.values()) {
      for (const member of members) {
        this.occupancy.release(member.id);
        this.recoverySystem.initializeAgent(member);
      }
      const party = this.partySystem.getParty(members[0]);
      this.entranceQueue.enqueue(members, { delay: 3.2, label: party?.name });
    }
  }

  snapshot() {
    return {
      ...super.snapshot(),
      entranceQueue: this.entranceQueue.snapshot(),
      recovery: this.recoverySystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      waiting: this.entranceQueue.queue.reduce((sum, record) => sum + record.memberIds.length, 0),
      resurrectable: this.agents.filter(agent => agent.faction === 'party' && agent.resurrectable).length
    };
  }
}
