import { graphDistance, nextStep } from './Pathfinding.js';

const ADVENTURER_FACTION = 'adventurer-expedition';
const ACTIVE_SETTLEMENT_STATES = new Set(['active', 'threatened', 'damaged']);
const CAMP_COST = { provisions: 2, water: 1, materials: 2 };

export class ExpeditionSystem {
  constructor({ rooms, props, graph, partySystem, settlementSystem, territorySystem, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.partySystem = partySystem;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.sequence = 0;
    this.conditionClock = 0;
    this.initializeParties();
  }

  initializeParties() {
    for (const party of this.partySystem.parties.values()) this.initializeParty(party);
  }

  initializeParty(party) {
    party.provisions ??= 14;
    party.maxProvisions ??= 18;
    party.water ??= 12;
    party.maxWater ??= 16;
    party.medicine ??= 4;
    party.maxMedicine ??= 6;
    party.materials ??= 4;
    party.maxMaterials ??= 10;
    party.expeditionTime ??= 0;
    party.maxExpeditionTime ??= 180;
    party.endurance ??= party.maxExpeditionTime;
    party.expeditionState ??= 'exploring';
    party.baseSettlementId ??= this.settlementSystem.safeSettlementId;
    party.lastSupplyWarningAt ??= -999;
    party.campCooldown ??= 0;
  }

  update(dt, sim) {
    this.initializeParties();
    for (const party of this.partySystem.parties.values()) {
      this.initializeParty(party);
      party.campCooldown = Math.max(0, party.campCooldown - dt);
    }

    this.conditionClock -= dt;
    if (this.conditionClock > 0) return;
    this.conditionClock = 1;

    for (const party of this.partySystem.parties.values()) this.updatePartyCondition(party, sim);
  }

  updatePartyCondition(party, sim) {
    const members = this.activeMembers(party, sim);
    if (!members.length) return;
    const fieldMembers = members.filter(member => !member.queued && !member.departed);
    if (!fieldMembers.length) return;

    const roomIds = [...new Set(fieldMembers.map(member => projectedRoom(member)))];
    const atSafeHub = roomIds.length === 1 && roomIds[0] === this.safeHub()?.roomId;
    const atBase = roomIds.length === 1 && roomIds[0] === this.partyBase(party)?.roomId;
    const moving = fieldMembers.some(member => member.travel);
    const injured = fieldMembers.filter(member => member.hp < member.maxHp * 0.65).length;
    const consumption = Math.max(1, fieldMembers.length) / 5;

    if (!atSafeHub) {
      party.expeditionTime += 1;
      party.endurance = Math.max(0, party.endurance - (moving ? 1.25 : atBase ? 0.34 : 0.72) - injured * 0.08);
      party.provisions = Math.max(0, party.provisions - consumption * (atBase ? 0.035 : 0.065));
      party.water = Math.max(0, party.water - consumption * (moving ? 0.09 : atBase ? 0.04 : 0.065));
    } else {
      party.expeditionState = 'resupplying';
      party.provisions = Math.min(party.maxProvisions, party.provisions + 1.4);
      party.water = Math.min(party.maxWater, party.water + 1.7);
      party.medicine = Math.min(party.maxMedicine, party.medicine + 0.18);
      party.materials = Math.min(party.maxMaterials, party.materials + 0.12);
      party.endurance = Math.min(party.maxExpeditionTime, party.endurance + 5.5);
      if (party.endurance >= party.maxExpeditionTime * 0.88) party.expeditionState = 'ready';
    }

    if (party.provisions <= 0 || party.water <= 0) {
      party.endurance = Math.max(0, party.endurance - 4);
      for (const member of fieldMembers) {
        member.fatigue = Math.min(100, (member.fatigue ?? 0) + 2.5);
        member.mood = party.water <= 0 ? 'dehydrated' : 'hungry-expedition';
      }
    }

    const ratio = this.supplyRatio(party);
    if (ratio < 0.22 && party.lastSupplyWarningAt + 20 <= sim.time) {
      party.lastSupplyWarningAt = sim.time;
      this.onEvent(`${party.name} was running short of ${party.water < party.provisions ? 'water' : 'provisions'}.`);
    }
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.faction !== 'party' || agent.departed || agent.queued || agent.travel || agent.combat || agent.downed) return null;
    const party = this.partySystem.getParty(agent);
    if (!party || party.leaderId !== agent.id) return null;
    this.initializeParty(party);

    const members = this.activeMembers(party, sim);
    if (!members.length) return null;
    const roomId = projectedRoom(agent);
    const urgent = this.shouldRetreat(party, members);
    const base = this.partyBase(party) ?? this.safeHub();
    const safe = this.safeHub();

    if (urgent) {
      party.expeditionState = 'retreating';
      const target = base && ACTIVE_SETTLEMENT_STATES.has(base.state) ? base : safe;
      if (target && roomId !== target.roomId) {
        return stepToward(agent, target.roomId, sim, `${agent.name} ordered ${party.name} back toward ${this.settlementSystem.label(target)} before the expedition ran dry.`);
      }
      if (target && roomId === target.roomId) return { type: 'expedition-rest', settlementId: target.id };
    }

    const localSettlement = this.activeAdventurerSettlement(roomId);
    if (localSettlement && this.partyNeedsRest(party, members)) {
      return { type: 'expedition-rest', settlementId: localSettlement.id };
    }

    if (this.canEstablishCamp(party, members, roomId, sim)) {
      return { type: 'expedition-build-camp', roomId };
    }

    return null;
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('expedition-')) return false;
    if (action.type === 'expedition-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action.type === 'expedition-build-camp') return this.establishCamp(agent, action.roomId, sim);
    if (action.type === 'expedition-rest') return this.restAtSettlement(agent, action.settlementId, sim);
    return false;
  }

  shouldRetreat(party, members) {
    const averageHp = average(members.map(member => member.maxHp ? member.hp / member.maxHp : 1));
    const averageFatigue = average(members.map(member => member.fatigue ?? 0));
    const downed = members.some(member => member.downed || member.hosted || member.infected);
    return party.endurance <= 24 || party.provisions <= 1.1 || party.water <= 0.9 || averageHp < 0.48 || averageFatigue >= 84 || downed;
  }

  partyNeedsRest(party, members) {
    return party.endurance < party.maxExpeditionTime * 0.58
      || average(members.map(member => member.fatigue ?? 0)) > 62
      || average(members.map(member => member.hp / Math.max(1, member.maxHp))) < 0.72;
  }

  canEstablishCamp(party, members, roomId, sim) {
    if (party.campCooldown > 0 || party.baseSettlementId !== this.settlementSystem.safeSettlementId) return false;
    if (party.provisions < CAMP_COST.provisions || party.water < CAMP_COST.water || party.materials < CAMP_COST.materials) return false;
    const gathered = members.filter(member => !member.travel && projectedRoom(member) === roomId && !member.downed);
    if (gathered.length < Math.min(3, members.length)) return false;
    const room = this.rooms.find(candidate => candidate.id === roomId);
    if (!room || room.tags?.includes('safe_zone') || room.tags?.includes('entrance_threshold') || room.w * room.d < 30) return false;
    if (this.activeAdventurerSettlement(roomId)) return false;
    const hostile = sim.agents.some(candidate => candidate.alive && !candidate.hidden && !candidate.departed && !candidate.travel && candidate.faction === 'dungeon' && candidate.roomId === roomId);
    if (hostile) return false;
    const territory = this.territorySystem.roomStates.get(roomId);
    if (territory?.contested) return false;
    const control = territory?.owner === ADVENTURER_FACTION ? territory.control : territory?.owner ? 0 : territory?.control ?? 0;
    const exploredDeepEnough = graphDistance(this.graph, this.safeHub()?.roomId, roomId) >= 3;
    const exhaustedEnough = party.endurance < party.maxExpeditionTime * 0.68 || party.expeditionTime >= 55;
    return exploredDeepEnough && exhaustedEnough && (!territory?.owner || territory.owner === ADVENTURER_FACTION || control >= 55);
  }

  establishCamp(agent, roomId, sim) {
    const party = this.partySystem.getParty(agent);
    if (!party) return true;
    const members = this.activeMembers(party, sim);
    if (!this.canEstablishCamp(party, members, roomId, sim)) return true;

    party.provisions -= CAMP_COST.provisions;
    party.water -= CAMP_COST.water;
    party.materials -= CAMP_COST.materials;
    party.campCooldown = 45;

    const room = this.rooms.find(candidate => candidate.id === roomId);
    const prop = {
      id: `adventurer-field-camp-${this.sequence++}`,
      type: 'adventurer_field_camp',
      label: `${party.name} Field Camp`,
      roomId,
      ecologyFaction: ADVENTURER_FACTION,
      integrity: 100,
      maxIntegrity: 100,
      placement: { ox: -room.w * 0.22, oz: room.d * 0.22, rotation: this.sequence % 4 * Math.PI / 2, scale: 0.82 }
    };
    this.props.push(prop);

    const territory = this.territorySystem.roomStates.get(roomId);
    if (territory) {
      territory.owner = ADVENTURER_FACTION;
      territory.control = Math.max(62, territory.control ?? 0);
      territory.contested = false;
      territory.challenger = null;
      territory.lastChangedAt = sim.time;
    }

    const settlement = {
      id: `settlement-${prop.id}`,
      anchorPropId: prop.id,
      factionId: ADVENTURER_FACTION,
      species: null,
      allowedSpecies: ['fighter', 'rogue', 'cleric', 'wizard', 'archer'],
      type: 'field-camp',
      roomId,
      tier: 1,
      state: 'active',
      previousState: null,
      indestructible: false,
      baseCapacity: 4,
      capacity: 4,
      guestCapacity: 1,
      roamingRange: 7,
      homeAttachment: 0.72,
      minimumGarrison: 1,
      structuralIntegrity: 100,
      control: territory?.control ?? 62,
      controlRequired: 45,
      contested: false,
      population: 0,
      presentPopulation: 0,
      overcrowded: 0,
      residentIds: [],
      presentIds: [],
      displacedIds: [],
      food: 5,
      medicine: 1,
      materials: 1,
      wealth: 0,
      comfort: 12,
      security: 10,
      recoveryPower: 9,
      buildings: [],
      visualPlacement: { ...prop.placement },
      foundedAt: sim.time,
      lastAttackedAt: null,
      abandonedAt: null
    };
    prop.settlementId = settlement.id;
    this.settlementSystem.registerSettlement(settlement);
    party.baseSettlementId = settlement.id;
    party.expeditionState = 'encamped';

    for (const member of members) {
      if (projectedRoom(member) !== roomId) continue;
      this.settlementSystem.rehome(member, settlement, sim, 'field-camp-founding');
    }
    this.settlementSystem.sync(sim);
    this.occupancy.blockArea(roomId, room.x + prop.placement.ox, room.z + prop.placement.oz, 1.05 * prop.placement.scale, prop.id);
    sim.emitEffect('expedition-camp-build', { roomId, agentId: agent.id, duration: 1.4 });
    this.onEvent(`${party.name} established a field camp in ${sim.roomName(roomId)} with four resident slots.`);
    return true;
  }

  restAtSettlement(agent, settlementId, sim) {
    const party = this.partySystem.getParty(agent);
    const settlement = this.settlementSystem.settlements.get(settlementId);
    if (!party || !settlement || projectedRoom(agent) !== settlement.roomId || !ACTIVE_SETTLEMENT_STATES.has(settlement.state)) return true;
    const members = this.activeMembers(party, sim).filter(member => !member.travel && projectedRoom(member) === settlement.roomId);
    if (!members.length) return true;

    const isSafe = settlement.indestructible;
    const provisionCost = isSafe ? 0 : Math.min(1, party.provisions);
    const waterCost = isSafe ? 0 : Math.min(0.8, party.water);
    if (!isSafe && (provisionCost < 0.5 || waterCost < 0.4)) return true;
    party.provisions -= provisionCost;
    party.water -= waterCost;

    const medicalNeed = members.some(member => member.hp < member.maxHp * 0.45);
    const medicineUsed = medicalNeed && party.medicine >= 1 ? 1 : 0;
    party.medicine -= medicineUsed;
    const healRatio = isSafe ? 0.42 : 0.2 + medicineUsed * 0.16;
    const fatigueRecovery = isSafe ? 62 : 38;

    for (const member of members) {
      const amount = Math.max(3, Math.round(member.maxHp * healRatio));
      member.hp = Math.min(member.maxHp, member.hp + amount);
      member.fatigue = Math.max(0, (member.fatigue ?? 0) - fatigueRecovery);
      member.recoveryCooldown = Math.max(member.recoveryCooldown ?? 0, 10);
      sim.emitEffect('heal', { roomId: member.roomId, agentId: member.id, duration: 1.05, amount });
    }

    party.endurance = Math.min(party.maxExpeditionTime, party.endurance + (isSafe ? 90 : 42));
    party.expeditionState = isSafe ? 'resupplying' : 'encamped';
    party.campCooldown = 12;
    this.onEvent(`${party.name} rested at ${this.settlementSystem.label(settlement)} and recovered expedition endurance.`);
    return true;
  }

  activeMembers(party, sim) {
    return party.memberIds
      .map(id => sim.agents.find(agent => agent.id === id))
      .filter(member => member?.alive && !member.departed);
  }

  partyBase(party) {
    const base = this.settlementSystem.settlements.get(party.baseSettlementId);
    return base && ACTIVE_SETTLEMENT_STATES.has(base.state) ? base : null;
  }

  safeHub() {
    return this.settlementSystem.settlements.get(this.settlementSystem.safeSettlementId) ?? null;
  }

  activeAdventurerSettlement(roomId) {
    return [...this.settlementSystem.settlements.values()].find(settlement =>
      settlement.roomId === roomId && settlement.factionId === ADVENTURER_FACTION && ACTIVE_SETTLEMENT_STATES.has(settlement.state)
    ) ?? null;
  }

  supplyRatio(party) {
    return Math.min(
      party.provisions / Math.max(1, party.maxProvisions),
      party.water / Math.max(1, party.maxWater),
      party.endurance / Math.max(1, party.maxExpeditionTime)
    );
  }

  snapshot() {
    return {
      parties: [...this.partySystem.parties.values()].map(party => ({
        id: party.id,
        name: party.name,
        leaderId: party.leaderId ?? null,
        memberIds: [...(party.memberIds ?? [])],
        state: party.state ?? 'assembled',
        cohesion: round(party.cohesion ?? 0),
        targetRoomId: party.targetRoomId ?? null,
        provisions: round(party.provisions),
        maxProvisions: party.maxProvisions,
        water: round(party.water),
        maxWater: party.maxWater,
        medicine: round(party.medicine),
        maxMedicine: party.maxMedicine,
        materials: round(party.materials),
        maxMaterials: party.maxMaterials,
        expeditionTime: round(party.expeditionTime),
        endurance: round(party.endurance),
        maxExpeditionTime: party.maxExpeditionTime,
        expeditionState: party.expeditionState,
        baseSettlementId: party.baseSettlementId
      }))
    };
  }

  metrics() {
    const parties = [...this.partySystem.parties.values()];
    return {
      fieldCamps: [...this.settlementSystem.settlements.values()].filter(settlement => settlement.type === 'field-camp' && settlement.state !== 'ruined').length,
      retreatingParties: parties.filter(party => party.expeditionState === 'retreating').length,
      lowSupplyParties: parties.filter(party => this.supplyRatio(party) < 0.25).length,
      expeditionEndurance: Math.round(average(parties.map(party => party.endurance ?? 0)))
    };
  }
}

function projectedRoom(agent) {
  if (agent.travel?.phase === 'entering') return agent.travel.toRoomId;
  return agent.travel?.toRoomId ?? agent.roomId;
}

function stepToward(agent, targetRoomId, sim, text) {
  const step = nextStep(sim.graph, projectedRoom(agent), targetRoomId);
  if (!step || step === projectedRoom(agent)) return null;
  return { type: 'expedition-move', roomId: step, text };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
  return Math.round((value ?? 0) * 10) / 10;
}
