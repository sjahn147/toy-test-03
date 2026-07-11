import { nextStep } from './Pathfinding.js';

export class RecoverySystem {
  constructor({ rooms, props, occupancy, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.occupancy = occupancy;
    this.partySystem = partySystem;
    this.onEvent = onEvent;
    this.safeRoomIds = new Set(rooms.filter(room => room.tags?.includes('safe_zone')).map(room => room.id));
    this.facilities = new Map(props
      .filter(prop => ['water_fountain', 'rest_site', 'camp_site', 'merchant_stall', 'goddess_statue'].includes(prop.type))
      .map(prop => [prop.type, prop]));
    this.resurrectionClock = 0;
  }

  initializeAgents(agents) {
    for (const agent of agents) this.initializeAgent(agent);
    for (const party of this.partySystem.parties.values()) this.initializeParty(party);
  }

  initializeAgent(agent) {
    if (agent.faction !== 'party') return;
    agent.fatigue ??= 8 + (agent.index % 4) * 3;
    agent.recoveryCooldown ??= 0;
    agent.resurrectionSickness ??= 0;
    agent.resurrectable ??= false;
    agent.corpseRoomId ??= null;
  }

  initializeParty(party) {
    party.campSupplies ??= 3;
    party.maxCampSupplies ??= 6;
    party.resurrectionTokens ??= 0;
  }

  update(dt, sim) {
    this.updateFacilities(dt);
    this.updateAdventurerCondition(dt, sim.agents);
    this.markDeadAdventurers(sim.agents);
    this.resurrectionClock -= dt;
    if (this.resurrectionClock <= 0) {
      this.resurrectionClock = 1.1;
      this.tryResurrection(sim);
    }
  }

  updateFacilities(dt) {
    const fountain = this.facilities.get('water_fountain');
    if (fountain) {
      fountain.charges ??= fountain.maxCharges ?? 12;
      fountain.maxCharges ??= 12;
      fountain.refillRate ??= 0.18;
      fountain.charges = Math.min(fountain.maxCharges, fountain.charges + fountain.refillRate * dt);
    }

    const statue = this.facilities.get('goddess_statue');
    if (statue) {
      statue.resurrectionCharges ??= statue.maxResurrectionCharges ?? 1;
      statue.maxResurrectionCharges ??= 1;
      statue.rechargeTime ??= 95;
      statue.rechargeProgress ??= 0;
      if (statue.resurrectionCharges < statue.maxResurrectionCharges) {
        statue.rechargeProgress += dt;
        if (statue.rechargeProgress >= statue.rechargeTime) {
          statue.rechargeProgress = 0;
          statue.resurrectionCharges += 1;
          this.onEvent(`${statue.label} gathered enough light for another return.`);
        }
      }
    }
  }

  updateAdventurerCondition(dt, agents) {
    for (const agent of agents) {
      if (agent.faction !== 'party') continue;
      this.initializeAgent(agent);
      agent.recoveryCooldown = Math.max(0, agent.recoveryCooldown - dt);
      agent.resurrectionSickness = Math.max(0, agent.resurrectionSickness - dt);
      if (!agent.alive || agent.departed || agent.queued) continue;

      const travelStress = agent.travel ? 1.9 : 0.26;
      const woundStress = agent.hp < agent.maxHp * 0.5 ? 0.22 : 0;
      const orphanStress = agent.orphaned ? 0.42 : 0;
      agent.fatigue = clamp((agent.fatigue ?? 0) + dt * (travelStress + woundStress + orphanStress), 0, 100);
    }
  }

  markDeadAdventurers(agents) {
    for (const agent of agents) {
      if (agent.faction !== 'party' || agent.alive || agent.resurrectable) continue;
      agent.resurrectable = true;
      agent.corpseRoomId = agent.roomId;
      agent.deathGeneration ??= 0;
    }
  }

  decide(agent, sim) {
    if (agent.faction !== 'party' || !agent.alive || agent.departed || agent.travel || agent.queued) return null;
    if (agent.recoveryCooldown > 0) return null;
    const safeRoomId = this.preferredSafeRoom(agent.roomId);
    if (!safeRoomId) return null;

    const party = this.partySystem.getParty(agent);
    if (party) this.initializeParty(party);
    const urgent = agent.hp <= agent.maxHp * 0.42 || agent.fatigue >= 82;
    const needsRecovery = urgent || agent.hp <= agent.maxHp * 0.72 || agent.fatigue >= 58;
    const needsSupplies = party && party.campSupplies <= 1 && agent.gold >= 1;

    if ((needsRecovery || needsSupplies) && agent.roomId !== safeRoomId) {
      const step = nextStep(sim.graph, agent.roomId, safeRoomId);
      if (step && step !== agent.roomId) {
        return {
          type: 'move',
          roomId: step,
          text: urgent
            ? `${agent.name} called for a retreat to the waystation.`
            : `${agent.name} steered the party toward food, water, and fewer teeth.`
        };
      }
    }

    if (agent.roomId !== safeRoomId) return null;
    if (urgent && party?.campSupplies > 0 && this.partyReadyToCamp(agent, sim)) return { type: 'camp' };
    if (agent.hp < agent.maxHp * 0.82 || agent.fatigue > 55) return { type: 'rest' };
    if (agent.fatigue > 25 && (this.facilities.get('water_fountain')?.charges ?? 0) >= 1) return { type: 'drink' };
    if (needsSupplies) return { type: 'trade' };
    return null;
  }

  resolve(agent, action, sim) {
    if (action.type === 'drink') return this.drink(agent, sim);
    if (action.type === 'rest') return this.rest(agent, sim);
    if (action.type === 'camp') return this.camp(agent, sim);
    if (action.type === 'trade') return this.trade(agent, sim);
    return false;
  }

  drink(agent, sim) {
    const fountain = this.facilities.get('water_fountain');
    if (!fountain || fountain.roomId !== agent.roomId || fountain.charges < 1) return true;
    fountain.charges -= 1;
    agent.hp = Math.min(agent.maxHp, agent.hp + 2);
    agent.fatigue = Math.max(0, agent.fatigue - 18);
    agent.recoveryCooldown = 5;
    sim.emitEffect('heal', { roomId: agent.roomId, agentId: agent.id, duration: 0.72, amount: 2 });
    this.onEvent(`${agent.name} drank from ${fountain.label} and looked briefly employable.`);
    return true;
  }

  rest(agent, sim) {
    const rest = this.facilities.get('rest_site');
    if (!rest || rest.roomId !== agent.roomId) return true;
    const amount = Math.max(3, Math.round(agent.maxHp * 0.18));
    agent.hp = Math.min(agent.maxHp, agent.hp + amount);
    agent.fatigue = Math.max(0, agent.fatigue - 30);
    agent.recoveryCooldown = 8;
    sim.emitEffect('heal', { roomId: agent.roomId, agentId: agent.id, duration: 0.95, amount });
    this.onEvent(`${agent.name} occupied a pilgrim bench and recovered ${amount} health.`);
    return true;
  }

  camp(agent, sim) {
    const camp = this.facilities.get('camp_site');
    const party = this.partySystem.getParty(agent);
    if (!camp || !party || camp.roomId !== agent.roomId || party.campSupplies <= 0) return true;
    if (!this.partyReadyToCamp(agent, sim)) return true;

    party.campSupplies -= 1;
    const members = party.memberIds
      .map(id => sim.agents.find(candidate => candidate.id === id))
      .filter(member => member?.alive && !member.departed && member.roomId === agent.roomId && !member.travel);

    for (const member of members) {
      const amount = Math.max(5, Math.round(member.maxHp * 0.36));
      member.hp = Math.min(member.maxHp, member.hp + amount);
      member.fatigue = Math.max(0, member.fatigue - 58);
      member.recoveryCooldown = 12;
      sim.emitEffect('heal', { roomId: member.roomId, agentId: member.id, duration: 1.15, amount });
    }
    this.onEvent(`${party.name} consumed one camp supply and slept beside the licensed fire.`);
    return true;
  }

  trade(agent, sim) {
    const merchant = this.facilities.get('merchant_stall');
    const party = this.partySystem.getParty(agent);
    if (!merchant || !party || merchant.roomId !== agent.roomId || agent.gold < 1 || (merchant.stock ?? 0) <= 0) return true;
    agent.gold -= 1;
    merchant.stock -= 1;
    party.campSupplies = Math.min(party.maxCampSupplies, party.campSupplies + 1);
    agent.recoveryCooldown = 7;
    this.onEvent(`${agent.name} bought one camp supply from ${merchant.label}.`);
    return true;
  }

  tryResurrection(sim) {
    const statue = this.facilities.get('goddess_statue');
    if (!statue || statue.resurrectionCharges <= 0) return false;
    const livingAtStatue = sim.agents.find(agent =>
      agent.faction === 'party' && agent.alive && !agent.departed && !agent.travel && agent.roomId === statue.roomId
    );
    if (!livingAtStatue) return false;

    const dead = sim.agents.find(agent =>
      agent.faction === 'party' && !agent.alive && agent.resurrectable &&
      (!agent.partyId || agent.partyId === livingAtStatue.partyId)
    );
    if (!dead) return false;

    dead.roomId = statue.roomId;
    dead.alive = true;
    dead.departed = false;
    dead.hidden = false;
    dead.queued = false;
    dead.travel = null;
    dead.hp = Math.max(1, Math.round(dead.maxHp * 0.52));
    dead.fatigue = 72;
    dead.resurrectionSickness = 48;
    dead.resurrectable = false;
    dead.corpseRoomId = null;
    dead.mood = 'returned';

    const placement = this.occupancy.placeAgent(dead, statue.roomId);
    if (!placement) {
      dead.alive = false;
      dead.resurrectable = true;
      return false;
    }

    statue.resurrectionCharges -= 1;
    statue.rechargeProgress = 0;
    this.partySystem.addAgent(dead, livingAtStatue.partyId);
    sim.emitEffect('heal', { roomId: statue.roomId, agentId: dead.id, duration: 1.45, amount: dead.hp });
    this.onEvent(`${dead.name} returned beneath ${statue.label}, alive and deeply unconvinced.`);
    return true;
  }

  partyReadyToCamp(agent, sim) {
    const party = this.partySystem.getParty(agent);
    if (!party || party.state === 'orphaned' || party.state === 'split') return false;
    const members = party.memberIds
      .map(id => sim.agents.find(candidate => candidate.id === id))
      .filter(member => member?.alive && !member.departed);
    if (!members.length || members.some(member => member.roomId !== agent.roomId || member.travel)) return false;
    const enemies = sim.agents.some(candidate =>
      candidate.alive && !candidate.departed && candidate.faction === 'dungeon' && !candidate.hidden && candidate.roomId === agent.roomId
    );
    return !enemies;
  }

  preferredSafeRoom(fromRoomId) {
    if (this.safeRoomIds.has(fromRoomId)) return fromRoomId;
    return this.safeRoomIds.values().next().value ?? null;
  }

  isSafeRoom(roomId) {
    return this.safeRoomIds.has(roomId);
  }

  snapshot() {
    return {
      safeRoomIds: [...this.safeRoomIds],
      facilities: [...this.facilities.values()].map(prop => ({ ...prop }))
    };
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
