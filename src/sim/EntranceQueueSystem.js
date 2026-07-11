export class EntranceQueueSystem {
  constructor({ entryRoomId, occupancy, onEvent = () => {}, capacityProvider = null }) {
    this.entryRoomId = entryRoomId;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.capacityProvider = capacityProvider;
    this.queue = [];
    this.sequence = 1;
  }

  enqueue(members, { delay = 2.2, label = null } = {}) {
    if (!members?.length) return null;
    const record = {
      id: `entrance-party-${this.sequence++}`,
      label: label ?? `Expedition ${this.sequence - 1}`,
      memberIds: members.map(member => member.id),
      members,
      countdown: delay,
      waitingReason: 'assembling'
    };

    for (const member of members) {
      member.queued = true;
      member.departed = true;
      member.travel = null;
      member.roomCell = null;
      member.mood = 'waiting-outside';
    }

    this.queue.push(record);
    this.onEvent(`${record.label} assembled outside the dungeon gate.`);
    return record;
  }

  update(dt, sim) {
    if (!this.queue.length) return;
    const record = this.queue[0];
    record.countdown = Math.max(0, record.countdown - dt);
    if (record.countdown > 0) return;

    if (!this.tryAdmit(record, sim)) {
      record.countdown = 1.25;
      return;
    }

    this.queue.shift();
    this.onEvent(`${record.label} entered together through the expedition gate.`);
  }

  tryAdmit(record, sim) {
    const members = record.members.filter(member => member.alive);
    if (!members.length) return true;

    if (this.capacityProvider && !this.capacityProvider(members.length, sim, record)) {
      record.waitingReason = 'settlement-capacity';
      return false;
    }

    const reservations = [];
    for (const member of members) {
      member.roomId = this.entryRoomId;
      const reservation = this.occupancy.reserveDestination(member, this.entryRoomId, null);
      if (!reservation) {
        for (const reserved of reservations) this.occupancy.cancelReservation(reserved.member.id);
        record.waitingReason = 'entry-full';
        return false;
      }
      reservations.push({ member, reservation });
    }

    for (const { member, reservation } of reservations) {
      member.departed = false;
      member.queued = false;
      member.hp = member.maxHp;
      member.fatigue = Math.min(member.fatigue ?? 0, 18);
      member.mood = 'entering-dungeon';
      this.occupancy.commitReservation(member, reservation);
    }

    record.waitingReason = 'admitted';
    sim.partySystem.update(sim.agents);
    return true;
  }

  snapshot() {
    return this.queue.map(record => ({
      id: record.id,
      label: record.label,
      memberIds: [...record.memberIds],
      countdown: record.countdown,
      waitingReason: record.waitingReason
    }));
  }
}
