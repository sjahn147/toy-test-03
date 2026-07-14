import { graphDistance, nextStep } from './Pathfinding.js';
import {
  SAFE_HUB_PROFILE,
  SETTLEMENT_BUILDING_BONUSES,
  isSettlementAnchor,
  settlementProfileFor
} from '../data/settlementConfig.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);

export class SettlementSystem {
  constructor({ rooms, props, graph, territorySystem, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.territorySystem = territorySystem;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.settlements = new Map();
    this.bySpecies = new Map();
    this.byRoom = new Map();
    this.safeSettlementId = null;
    this.tickClock = 0;
    this.recoveryClock = 0;
    this.sequence = 0;
    this.discoverSettlements();
  }

  discoverSettlements() {
    for (const prop of this.props) {
      if (!isSettlementAnchor(prop)) continue;
      const profile = settlementProfileFor(prop.species);
      const room = this.rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const settlement = {
        id: `settlement-${prop.id}`,
        anchorPropId: prop.id,
        factionId: prop.ecologyFaction ?? `wild-${prop.species}`,
        species: prop.species,
        allowedSpecies: [prop.species],
        type: profile.type,
        roomId: prop.roomId,
        tier: 1,
        state: 'active',
        previousState: null,
        indestructible: false,
        baseCapacity: prop.capacity ?? profile.capacity,
        capacity: prop.capacity ?? profile.capacity,
        guestCapacity: profile.guestCapacity ?? 0,
        roamingRange: profile.roamingRange,
        homeAttachment: profile.homeAttachment,
        minimumGarrison: profile.minimumGarrison,
        structuralIntegrity: 100,
        control: 72,
        controlRequired: 22,
        contested: false,
        population: 0,
        presentPopulation: 0,
        overcrowded: 0,
        residentIds: [],
        presentIds: [],
        displacedIds: [],
        food: settlementFood(prop),
        medicine: 0,
        materials: settlementMaterials(prop),
        wealth: 0,
        comfort: 8,
        security: 12,
        recoveryPower: 4,
        buildings: [],
        visualPlacement: settlementPlacement(room, prop),
        foundedAt: 0,
        lastAttackedAt: null,
        abandonedAt: null
      };
      prop.settlementId = settlement.id;
      this.registerSettlement(settlement);
    }

    const safeRoom = this.rooms.find(room => room.tags?.includes('safe_zone'))
      ?? this.rooms.find(room => room.kind === 'start');
    if (safeRoom) {
      const settlement = {
        id: 'settlement-licensed-waystation',
        anchorPropId: this.props.find(prop => prop.type === 'dungeon_entrance' && prop.roomId === safeRoom.id)?.id ?? null,
        factionId: 'adventurer-expedition',
        species: null,
        allowedSpecies: ['fighter', 'rogue', 'cleric', 'wizard', 'archer'],
        type: SAFE_HUB_PROFILE.type,
        roomId: safeRoom.id,
        tier: 2,
        state: 'active',
        previousState: null,
        indestructible: true,
        baseCapacity: SAFE_HUB_PROFILE.capacity,
        capacity: SAFE_HUB_PROFILE.capacity,
        guestCapacity: SAFE_HUB_PROFILE.guestCapacity,
        roamingRange: SAFE_HUB_PROFILE.roamingRange,
        homeAttachment: SAFE_HUB_PROFILE.homeAttachment,
        minimumGarrison: SAFE_HUB_PROFILE.minimumGarrison,
        structuralIntegrity: 100,
        control: 100,
        controlRequired: 0,
        contested: false,
        population: 0,
        presentPopulation: 0,
        overcrowded: 0,
        residentIds: [],
        presentIds: [],
        displacedIds: [],
        food: 12,
        medicine: 8,
        materials: 6,
        wealth: 10,
        comfort: 20,
        security: 24,
        recoveryPower: 18,
        buildings: [],
        visualPlacement: { ox: -safeRoom.w * 0.31, oz: safeRoom.d * 0.3, rotation: 0.12, scale: 0.78 },
        foundedAt: 0,
        lastAttackedAt: null,
        abandonedAt: null
      };
      this.safeSettlementId = settlement.id;
      this.registerSettlement(settlement);
    }
  }

  registerSettlement(settlement) {
    this.settlements.set(settlement.id, settlement);
    if (!this.byRoom.has(settlement.roomId)) this.byRoom.set(settlement.roomId, []);
    this.byRoom.get(settlement.roomId).push(settlement.id);
    if (settlement.species) this.bySpecies.set(settlement.species, settlement.id);
  }

  initialize(agents, sim) {
    for (const agent of agents) this.assignHome(agent, sim);
    this.sync(sim);
  }

  update(dt, sim) {
    this.tickClock -= dt;
    this.recoveryClock -= dt;
    if (this.recoveryClock <= 0) {
      this.recoveryClock = 0.7;
      this.recoverResidents(sim);
    }
    if (this.tickClock > 0) return;
    this.tickClock = 0.75;
    this.sync(sim);
    this.updateSettlementStates(0.75, sim);
    this.sync(sim);
    this.resolveOvercrowding(sim);
    this.sync(sim);
  }

  sync(sim) {
    for (const settlement of this.settlements.values()) {
      settlement.residentIds = [];
      settlement.presentIds = [];
      settlement.displacedIds = [];
      this.syncBuildings(settlement);
    }

    for (const agent of sim.agents) {
      if (!agent.alive || agent.ecologyConsumed) continue;
      if (!agent.homeSettlementId && !agent.displaced) this.assignHome(agent, sim);
      const settlement = this.settlements.get(agent.homeSettlementId);
      if (!settlement) {
        if (agent.displaced) {
          const former = this.settlements.get(agent.formerSettlementId);
          if (former) former.displacedIds.push(agent.id);
        }
        continue;
      }
      settlement.residentIds.push(agent.id);
      const roomId = projectedRoom(agent);
      if (!agent.departed && !agent.queued && roomId === settlement.roomId) settlement.presentIds.push(agent.id);
    }

    for (const settlement of this.settlements.values()) {
      settlement.population = settlement.residentIds.length;
      settlement.presentPopulation = settlement.presentIds.length;
      settlement.capacity = this.computeCapacity(settlement);
      settlement.overcrowded = Math.max(0, settlement.population - settlement.capacity);
    }
  }

  syncBuildings(settlement) {
    const props = this.props.filter(prop => prop.roomId === settlement.roomId);
    settlement.buildings = props
      .filter(prop => prop.id === settlement.anchorPropId || SETTLEMENT_BUILDING_BONUSES[prop.type])
      .map(prop => ({
        id: prop.id,
        type: prop.type,
        integrity: prop.integrity ?? 100,
        maxIntegrity: prop.maxIntegrity ?? 100,
        critical: prop.id === settlement.anchorPropId
      }));
    settlement.anchorPresent = !settlement.anchorPropId || props.some(prop => prop.id === settlement.anchorPropId);

    settlement.comfort = settlement.indestructible ? 20 : 8;
    settlement.security = settlement.indestructible ? 24 : 12;
    settlement.recoveryPower = settlement.indestructible ? 18 : 4;
    for (const building of settlement.buildings) {
      const bonus = SETTLEMENT_BUILDING_BONUSES[building.type];
      if (!bonus) continue;
      settlement.comfort += bonus.comfort ?? 0;
      settlement.security += bonus.security ?? 0;
      settlement.recoveryPower += bonus.recovery ?? 0;
    }
  }

  computeCapacity(settlement) {
    let logicalCapacity;
    if (settlement.indestructible) {
      const bonus = settlement.buildings.reduce((sum, building) => sum + (SETTLEMENT_BUILDING_BONUSES[building.type]?.capacity ?? 0), 0);
      logicalCapacity = Math.max(1, settlement.baseCapacity + bonus);
    } else if (!settlement.anchorPresent || settlement.state === 'ruined') {
      logicalCapacity = 0;
    } else {
      const bonus = settlement.buildings.reduce((sum, building) => sum + (SETTLEMENT_BUILDING_BONUSES[building.type]?.capacity ?? 0), 0);
      const integrityFactor = 0.25 + clamp(settlement.structuralIntegrity, 0, 100) / 100 * 0.75;
      const collapseFactor = settlement.state === 'collapsing' ? 0.45 : 1;
      logicalCapacity = Math.max(1, Math.floor((settlement.baseCapacity + bonus) * integrityFactor * collapseFactor));
    }
    const spatialCapacity = this.occupancy?.roomSpatialState?.(settlement.roomId)?.actorCapacity ?? logicalCapacity;
    const effectiveCapacity = logicalCapacity > 0 && spatialCapacity > 0
      ? Math.min(logicalCapacity, spatialCapacity)
      : logicalCapacity;
    settlement.logicalCapacity = logicalCapacity;
    settlement.spatialCapacity = spatialCapacity;
    settlement.effectiveCapacity = effectiveCapacity;
    return effectiveCapacity;
  }

  updateSettlementStates(dt, sim) {
    for (const settlement of this.settlements.values()) {
      if (settlement.indestructible) {
        settlement.structuralIntegrity = 100;
        settlement.control = 100;
        settlement.contested = false;
        this.setState(settlement, 'active', sim);
        continue;
      }

      const territory = this.territorySystem?.roomStates?.get(settlement.roomId) ?? null;
      const ownerMatches = !territory?.owner || territory.owner === settlement.factionId;
      settlement.control = ownerMatches ? territory?.control ?? settlement.control : 0;
      settlement.contested = Boolean(territory?.contested);
      const hostilePresence = sim.agents.filter(agent =>
        agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === settlement.roomId &&
        agent.ecologyFaction && agent.ecologyFaction !== settlement.factionId
      ).length;

      let damageRate = 0;
      if (!settlement.anchorPresent) damageRate += 18;
      if (territory?.owner && !ownerMatches) damageRate += 6;
      if (settlement.contested) damageRate += 2.4;
      if (settlement.control < settlement.controlRequired) damageRate += 1.2;
      damageRate += hostilePresence * 0.8;

      if (damageRate > 0) {
        settlement.structuralIntegrity = Math.max(0, settlement.structuralIntegrity - damageRate * dt);
        settlement.lastAttackedAt = sim.time;
      } else if (settlement.population > 0) {
        settlement.structuralIntegrity = Math.min(100, settlement.structuralIntegrity + dt * 0.42);
      }

      const nextState = settlementState(settlement);
      this.setState(settlement, nextState, sim);
      if (nextState === 'ruined') this.displaceSettlement(settlement, sim);
    }
  }

  setState(settlement, state, sim) {
    if (settlement.state === state) return;
    const previous = settlement.state;
    settlement.previousState = previous;
    settlement.state = state;
    if (state === 'abandoned') settlement.abandonedAt = sim.time;
    if (state === 'threatened') {
      this.onEvent(`${this.label(settlement)} became threatened in ${sim.roomName(settlement.roomId)}.`);
      sim.emitEffect?.('settlement-threat', { roomId: settlement.roomId, duration: 1.05 });
    }
    if (state === 'collapsing') {
      this.onEvent(`${this.label(settlement)} began collapsing as its home structures failed.`);
      sim.emitEffect?.('settlement-collapse', { roomId: settlement.roomId, duration: 1.35 });
    }
    if (state === 'ruined') {
      this.onEvent(`${this.label(settlement)} was reduced to a ruined habitat.`);
      sim.emitEffect?.('settlement-ruin', { roomId: settlement.roomId, duration: 1.5 });
    }
  }

  recoverResidents(sim) {
    for (const settlement of this.settlements.values()) {
      if (!ACTIVE_STATES.has(settlement.state) || settlement.recoveryPower <= 0) continue;
      for (const id of settlement.presentIds) {
        const agent = sim.agents.find(candidate => candidate.id === id);
        if (!agent?.alive || agent.downed || agent.combat || agent.hosted) continue;
        const recovery = Math.max(0.05, settlement.recoveryPower * 0.012);
        agent.hp = Math.min(agent.maxHp, agent.hp + recovery);
        if (agent.faction === 'party') agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - settlement.recoveryPower * 0.018);
      }
    }
  }

  assignHome(agent, sim = null) {
    if (!agent || !agent.alive) return null;
    if (agent.faction === 'party') {
      const safe = this.settlements.get(this.safeSettlementId);
      if (!safe) return null;
      agent.homeSettlementId = safe.id;
      agent.homeRoomId ??= safe.roomId;
      agent.homeAttachment ??= safe.homeAttachment;
      agent.roamingRange ??= safe.roamingRange;
      agent.displaced = false;
      return safe;
    }

    const existing = this.settlements.get(agent.homeSettlementId);
    if (existing && existing.state !== 'ruined') return existing;
    if (agent.displaced) return null;

    const speciesId = this.bySpecies.get(agent.role);
    const speciesSettlement = this.settlements.get(speciesId);
    const candidates = [...this.settlements.values()]
      .filter(settlement => !settlement.indestructible && settlement.factionId === agent.ecologyFaction && settlement.state !== 'ruined')
      .sort((a, b) => {
        const aExact = a.roomId === agent.homeRoomId ? -10 : a.species === agent.role ? -5 : 0;
        const bExact = b.roomId === agent.homeRoomId ? -10 : b.species === agent.role ? -5 : 0;
        return aExact - bExact;
      });
    const settlement = speciesSettlement?.state !== 'ruined' ? speciesSettlement : candidates[0];
    if (!settlement) {
      agent.displaced = true;
      agent.formerSettlementId ??= agent.homeSettlementId ?? null;
      agent.homeSettlementId = null;
      return null;
    }

    agent.homeSettlementId = settlement.id;
    agent.homeRoomId = settlement.roomId;
    agent.homeAttachment ??= settlement.homeAttachment;
    agent.roamingRange ??= settlement.roamingRange;
    agent.displaced = false;
    return settlement;
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.faction !== 'dungeon' || agent.departed || agent.hidden || agent.travel || agent.combat || agent.hosted || agent.attachedToId) return null;
    let home = this.settlements.get(agent.homeSettlementId);
    if (!home || home.state === 'ruined') {
      const alternative = this.findAlternative(agent, home);
      if (alternative) {
        this.rehome(agent, alternative, sim, 'lost-home');
        home = alternative;
      } else {
        this.markDisplaced(agent, home, sim);
        const refuge = this.chooseRefugeRoom(agent, sim);
        if (refuge && refuge !== agent.roomId) return stepToward(agent, refuge, sim, `${agent.name} searched for a defensible place after losing its habitat.`);
        if (Math.random() < 0.5) return { type: 'settlement-idle', mood: 'displaced-hiding' };
        return null;
      }
    }

    const distance = graphDistance(sim.graph, projectedRoom(agent), home.roomId);
    const hpRatio = agent.maxHp > 0 ? agent.hp / agent.maxHp : 1;
    const hunger = agent.hunger ?? 0;
    const fatigue = agent.fatigue ?? 0;
    const beyondRange = distance > (agent.roamingRange ?? home.roamingRange);
    const threatened = ['threatened', 'damaged', 'collapsing'].includes(home.state);
    const garrisonShort = home.presentPopulation < home.minimumGarrison;

    let utility = distance * 12 + (agent.homeAttachment ?? home.homeAttachment) * 18;
    if (beyondRange) utility += 46;
    if (hpRatio < 0.58) utility += (0.58 - hpRatio) * 85;
    if (hunger >= 62) utility += (hunger - 62) * 1.4;
    if (fatigue >= 66) utility += (fatigue - 66) * 1.1;
    if (threatened) utility += 32;
    if (garrisonShort) utility += 22;
    if (agent.carryingHostId) utility += 55;

    if (distance > 0 && utility >= 48) {
      return stepToward(agent, home.roomId, sim, `${agent.name} turned back toward ${this.label(home)} instead of camping near the entrance.`);
    }

    if (distance === 0) {
      if (threatened || garrisonShort) return { type: 'settlement-idle', mood: 'guarding-home' };
      const holdChance = 0.12 + (agent.homeAttachment ?? home.homeAttachment) * 0.28;
      if (Math.random() < holdChance) return { type: 'settlement-idle', mood: 'at-home' };
    }
    return null;
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('settlement-')) return false;
    if (action.type === 'settlement-return') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action.type === 'settlement-idle') {
      agent.mood = action.mood ?? 'at-home';
      return true;
    }
    return false;
  }

  canSpawn(species, roomId, factionId = null) {
    const settlement = this.findSettlementForSpawn(species, roomId, factionId);
    if (!settlement || !ACTIVE_STATES.has(settlement.state)) return false;
    if (settlement.control < settlement.controlRequired || settlement.contested) return false;
    return settlement.population < settlement.capacity;
  }

  findSettlementForSpawn(species, roomId, factionId = null) {
    const direct = [...this.settlements.values()].find(settlement =>
      settlement.roomId === roomId && settlement.species === species && (!factionId || settlement.factionId === factionId)
    );
    if (direct) return direct;
    const speciesSettlement = this.settlements.get(this.bySpecies.get(species));
    if (speciesSettlement && (!factionId || speciesSettlement.factionId === factionId)) return speciesSettlement;
    return [...this.settlements.values()].find(settlement =>
      settlement.roomId === roomId && (!factionId || settlement.factionId === factionId) && settlement.allowedSpecies.includes(species)
    ) ?? null;
  }

  registerSpawn(agent, sim) {
    const home = this.findSettlementForSpawn(agent.role, agent.roomId, agent.ecologyFaction);
    if (!home) {
      this.markDisplaced(agent, null, sim);
      return null;
    }
    agent.homeSettlementId = home.id;
    agent.homeRoomId = home.roomId;
    agent.homeAttachment = home.homeAttachment;
    agent.roamingRange = home.roamingRange;
    agent.displaced = false;
    this.sync(sim);
    return home;
  }

  canAdmitParty(count, sim) {
    const safe = this.settlements.get(this.safeSettlementId);
    if (!safe) return true;
    const present = sim.agents.filter(agent =>
      agent.faction === 'party' && agent.alive && !agent.departed && !agent.queued && projectedRoom(agent) === safe.roomId
    ).length;
    return present + count <= safe.capacity + safe.guestCapacity;
  }

  resolveOvercrowding(sim) {
    for (const settlement of this.settlements.values()) {
      if (settlement.overcrowded <= 0 || settlement.indestructible) continue;
      const residents = settlement.residentIds
        .map(id => sim.agents.find(agent => agent.id === id))
        .filter(agent => agent?.alive && !agent.carryingHostId)
        .sort((a, b) => (b.index ?? 0) - (a.index ?? 0));

      for (let i = 0; i < settlement.overcrowded && i < residents.length; i += 1) {
        const agent = residents[i];
        const alternative = this.findAlternative(agent, settlement);
        if (alternative) this.rehome(agent, alternative, sim, 'overcrowding');
        else this.markDisplaced(agent, settlement, sim);
      }
    }
  }

  findAlternative(agent, current = null) {
    return [...this.settlements.values()]
      .filter(settlement => settlement.id !== current?.id && settlement.factionId === agent.ecologyFaction && ACTIVE_STATES.has(settlement.state))
      .filter(settlement => settlement.population < settlement.capacity)
      .sort((a, b) => graphDistance(this.graph, projectedRoom(agent), a.roomId) - graphDistance(this.graph, projectedRoom(agent), b.roomId))[0] ?? null;
  }

  rehome(agent, settlement, sim, reason) {
    const previous = this.settlements.get(agent.homeSettlementId);
    agent.formerSettlementId = previous?.id ?? agent.formerSettlementId ?? null;
    agent.homeSettlementId = settlement.id;
    agent.homeRoomId = settlement.roomId;
    agent.homeAttachment = settlement.homeAttachment;
    agent.roamingRange = settlement.roamingRange;
    agent.displaced = false;
    agent.refugeRoomId = null;
    agent.mood = `rehomed-${reason}`;
    this.onEvent(`${agent.name} adopted ${this.label(settlement)} after ${reason}.`);
    sim.emitEffect?.('settlement-rehome', { roomId: agent.roomId, agentId: agent.id, duration: 1.1 });
  }

  markDisplaced(agent, settlement, sim) {
    if (agent.displaced && !agent.homeSettlementId) return;
    agent.formerSettlementId = settlement?.id ?? agent.homeSettlementId ?? agent.formerSettlementId ?? null;
    agent.homeSettlementId = null;
    agent.displaced = true;
    agent.refugeRoomId = this.chooseRefugeRoom(agent, sim);
    agent.mood = 'displaced';
    if (settlement) this.onEvent(`${agent.name} was displaced from ${this.label(settlement)}.`);
  }

  displaceSettlement(settlement, sim) {
    for (const id of [...settlement.residentIds]) {
      const agent = sim.agents.find(candidate => candidate.id === id);
      if (!agent?.alive) continue;
      const alternative = this.findAlternative(agent, settlement);
      if (alternative) this.rehome(agent, alternative, sim, 'habitat-collapse');
      else this.markDisplaced(agent, settlement, sim);
    }
  }

  chooseRefugeRoom(agent, sim) {
    const origin = projectedRoom(agent);
    const candidates = this.rooms.filter(room =>
      room.kind !== 'start' && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold')
    ).filter(room => {
      const state = this.territorySystem?.roomStates?.get(room.id);
      return !state?.owner || state.owner === agent.ecologyFaction;
    });
    return candidates.sort((a, b) => graphDistance(sim.graph, origin, a.id) - graphDistance(sim.graph, origin, b.id))[0]?.id ?? origin;
  }

  label(settlement) {
    const anchor = this.props.find(prop => prop.id === settlement.anchorPropId);
    return anchor?.label ?? settlement.type.replaceAll('-', ' ');
  }

  snapshot() {
    return {
      settlements: [...this.settlements.values()].map(settlement => ({
        ...settlement,
        // 방어: registerSettlement가 외부(OldLanternInnSystem 등)에서 만든
        // settlement를 받으므로 배열 필드가 없을 수 있다.
        residentIds: [...(settlement.residentIds ?? [])],
        presentIds: [...(settlement.presentIds ?? [])],
        displacedIds: [...(settlement.displacedIds ?? [])],
        buildings: (settlement.buildings ?? []).map(building => ({ ...building })),
        visualPlacement: { ...(settlement.visualPlacement ?? {}) }
      }))
    };
  }

  metrics(agents) {
    const settlements = [...this.settlements.values()];
    return {
      settlements: settlements.filter(settlement => settlement.state !== 'ruined').length,
      threatenedSettlements: settlements.filter(settlement => ['threatened', 'damaged', 'collapsing'].includes(settlement.state)).length,
      overcrowdedSettlements: settlements.filter(settlement => settlement.overcrowded > 0).length,
      displaced: agents.filter(agent => agent.alive && agent.faction === 'dungeon' && agent.displaced).length,
      habitatPopulation: settlements.filter(settlement => !settlement.indestructible).reduce((sum, settlement) => sum + settlement.population, 0),
      habitatCapacity: settlements.filter(settlement => !settlement.indestructible).reduce((sum, settlement) => sum + settlement.capacity, 0)
    };
  }
}

function settlementState(settlement) {
  if (!settlement.anchorPresent || settlement.structuralIntegrity <= 0) return 'ruined';
  if (settlement.population === 0 && settlement.structuralIntegrity < 38) return 'abandoned';
  if (settlement.structuralIntegrity < 24 || settlement.control < 10) return 'collapsing';
  if (settlement.structuralIntegrity < 58) return 'damaged';
  if (settlement.contested || settlement.control < 45) return 'threatened';
  return 'active';
}

function settlementPlacement(room, prop) {
  const placement = prop.placement ?? {};
  let ox = -(placement.ox ?? 0) * 0.62;
  let oz = -(placement.oz ?? 0) * 0.62;
  if (Math.abs(ox) < 0.35 && Math.abs(oz) < 0.35) {
    ox = -room.w * 0.28;
    oz = room.d * 0.28;
  }
  return {
    ox: clamp(ox, -room.w * 0.32, room.w * 0.32),
    oz: clamp(oz, -room.d * 0.32, room.d * 0.32),
    rotation: ((prop.id?.length ?? 0) % 4) * Math.PI / 2,
    scale: 0.68
  };
}

function settlementFood(prop) {
  return (prop.foodStock ?? 0) + (prop.grainStock ?? 0) + (prop.meatStock ?? 0) + (prop.bloodStock ?? 0) + (prop.carrionStock ?? 0);
}

function settlementMaterials(prop) {
  return (prop.scrapStock ?? 0) + (prop.boneStock ?? 0) + (prop.biomass ?? 0) + (prop.sporeStock ?? 0) + (prop.deathEnergy ?? 0);
}

function projectedRoom(agent) {
  if (!agent) return null;
  if (agent.travel?.phase === 'entering') return agent.travel.toRoomId;
  return agent.travel?.toRoomId ?? agent.roomId;
}

function stepToward(agent, targetRoomId, sim, text) {
  const step = nextStep(sim.graph, projectedRoom(agent), targetRoomId);
  if (!step || step === projectedRoom(agent)) return { type: 'settlement-idle', mood: 'at-home' };
  return { type: 'settlement-return', roomId: step, text };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
