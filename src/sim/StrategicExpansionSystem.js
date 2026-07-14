import { graphDistance, nextStep } from './Pathfinding.js';

const ADVENTURER_FACTION = 'adventurer-expedition';
const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);
const PIONEER_ROLES = new Set(['fighter', 'rogue', 'goblin', 'kobold', 'orc', 'ogre', 'skeleton', 'zombie']);
const OUTPOST_COST = { supply: 5, materials: 2 };
const PLAN_INTERVAL = 5;
const MAX_MONSTER_SETTLEMENTS = 3;

export class StrategicExpansionSystem {
  constructor({ rooms, props, graph, partySystem, settlementSystem, territorySystem, expeditionSystem, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.partySystem = partySystem;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.expeditionSystem = expeditionSystem;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.plans = new Map();
    this.sequence = 0;
    this.planClock = 0;
  }

  update(dt, sim) {
    this.planClock -= dt;
    if (this.planClock > 0) return;
    this.planClock = PLAN_INTERVAL;
    this.cleanupPlans(sim);
    for (const party of this.partySystem.parties.values()) this.planPartyExpansion(party, sim);
    const factions = new Set(sim.agents
      .filter(agent => agent.alive && !agent.departed && agent.faction === 'dungeon' && agent.ecologyFaction)
      .map(agent => agent.ecologyFaction));
    for (const factionId of factions) this.planMonsterExpansion(factionId, sim);
  }

  cleanupPlans(sim) {
    for (const [key, plan] of this.plans) {
      const pioneer = sim.agents.find(agent => agent.id === plan.pioneerId);
      const targetExists = this.rooms.some(room => room.id === plan.targetRoomId);
      const expired = (plan.expiresAt ?? Infinity) <= sim.time;
      const completed = plan.mode === 'garrisoning' && (plan.reevaluateAt ?? Infinity) <= sim.time;
      if (pioneer?.alive && !pioneer.departed && targetExists && !expired && !completed) continue;
      this.plans.delete(key);
      if (plan.kind === 'party') {
        const party = this.partySystem.parties.get(plan.partyId);
        if (party?.plan?.id === plan.id) party.plan = null;
      }
    }
  }

  planPartyExpansion(party, sim) {
    this.expeditionSystem.initializeParty(party);
    const key = this.partyKey(party.id);
    const members = this.expeditionSystem.activeMembers(party, sim);
    const leader = members.find(member => member.id === party.leaderId) ?? members[0];
    if (!leader) return null;

    if (this.expeditionSystem.shouldRetreat(party, members)) {
      const retreatPlan = {
        id: `expansion-plan-${this.sequence++}`,
        key,
        kind: 'party',
        mode: 'retreating',
        factionId: ADVENTURER_FACTION,
        partyId: party.id,
        pioneerId: leader.id,
        targetRoomId: this.expeditionSystem.partyBase(party)?.roomId ?? this.expeditionSystem.safeHub()?.roomId ?? leader.roomId,
        objective: 'recover',
        issuedAt: sim.time,
        reevaluateAt: sim.time + PLAN_INTERVAL
      };
      this.plans.set(key, retreatPlan);
      party.plan = clonePlan(retreatPlan);
      return retreatPlan;
    }

    const current = this.plans.get(key);
    if (current && current.mode !== 'retreating') {
      party.plan = clonePlan(current);
      return current;
    }

    if (party.campCooldown > 0 || party.provisions < 4 || party.water < 3 || party.materials < 2) return null;
    if (this.expeditionSystem.activePartyCamps(party).length >= 2) return null;
    const target = this.choosePartyCandidate(party, leader, sim);
    if (!target) return null;

    const plan = {
      id: `expansion-plan-${this.sequence++}`,
      key,
      kind: 'party',
      mode: 'securing',
      factionId: ADVENTURER_FACTION,
      partyId: party.id,
      pioneerId: leader.id,
      targetRoomId: target.room.id,
      objective: 'field-camp',
      score: round(target.score),
      issuedAt: sim.time,
      expiresAt: sim.time + 70,
      reevaluateAt: sim.time + PLAN_INTERVAL
    };
    this.plans.set(key, plan);
    party.plan = clonePlan(plan);
    this.onEvent(`${party.name} selected ${target.room.name ?? target.room.id} as its next field-camp objective.`);
    return plan;
  }

  choosePartyCandidate(party, leader, sim) {
    const safe = this.expeditionSystem.safeHub();
    if (!safe) return null;
    const camps = this.expeditionSystem.activePartyCamps(party);
    return this.rooms
      .filter(room => room.w * room.d >= 30 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
      .filter(room => !this.activeSettlementInRoom(room.id))
      .filter(room => !this.hostilePresence(room.id, ADVENTURER_FACTION, sim))
      .filter(room => {
        const state = this.territorySystem.roomStates.get(room.id);
        return !state?.contested && (!state?.owner || state.owner === ADVENTURER_FACTION);
      })
      .filter(room => graphDistance(this.graph, safe.roomId, room.id) >= 3)
      .filter(room => camps.every(camp => graphDistance(this.graph, camp.roomId, room.id) >= 3))
      .map(room => {
        const travelDistance = graphDistance(this.graph, projectedRoom(leader), room.id);
        const depth = graphDistance(this.graph, safe.roomId, room.id);
        if (!Number.isFinite(travelDistance) || travelDistance > 8) return null;
        const degree = this.graph.get(room.id)?.length ?? 0;
        const resourceValue = this.resourceValueNear(room.id);
        const frontier = this.frontierValue(room.id, ADVENTURER_FACTION);
        const base = this.expeditionSystem.partyBase(party) ?? safe;
        const profile = sim.logisticsSystem?.routeProfile?.(ADVENTURER_FACTION, base.roomId, room.id, sim) ?? { risk: 0, safety: 1, cut: false };
        if (profile.cut || profile.risk > 0.78) return null;
        const score = depth * 1.9 + resourceValue * 4.5 + frontier * 2.2 + (degree <= 2 ? 4 : 0) + profile.safety * 5 - profile.risk * 8 - travelDistance * 0.55;
        return { room, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0] ?? null;
  }

  planMonsterExpansion(factionId, sim) {
    const key = this.factionKey(factionId);
    const current = this.plans.get(key);
    if (current) return current;
    const settlements = this.activeFactionSettlements(factionId);
    if (!settlements.length || settlements.length >= MAX_MONSTER_SETTLEMENTS) return null;
    const supply = this.territorySystem.factionSupply.get(factionId) ?? 0;
    if (supply < OUTPOST_COST.supply) return null;

    const pioneers = sim.agents
      .filter(agent => agent.alive && !agent.departed && !agent.hidden && agent.faction === 'dungeon' && agent.ecologyFaction === factionId)
      .filter(agent => PIONEER_ROLES.has(agent.role) && !agent.hosted && !agent.attachedToId && !agent.cargoId);
    if (!pioneers.length) return null;
    const origins = settlements.filter(settlement => (settlement.materials ?? 0) >= OUTPOST_COST.materials);
    if (!origins.length) return null;

    const choices = [];
    for (const pioneer of pioneers) {
      for (const origin of origins) {
        const target = this.chooseMonsterCandidate(factionId, pioneer, origin, sim);
        if (target) choices.push({ pioneer, origin, ...target });
      }
    }
    const selected = choices.sort((a, b) => b.score - a.score)[0];
    if (!selected) return null;

    const plan = {
      id: `expansion-plan-${this.sequence++}`,
      key,
      kind: 'monster',
      mode: 'securing',
      factionId,
      partyId: null,
      pioneerId: selected.pioneer.id,
      originSettlementId: selected.origin.id,
      targetRoomId: selected.room.id,
      objective: 'forward-outpost',
      score: round(selected.score),
      issuedAt: sim.time,
      expiresAt: sim.time + 90,
      reevaluateAt: sim.time + PLAN_INTERVAL
    };
    this.plans.set(key, plan);
    this.onEvent(`${prettyFaction(factionId)} sent ${selected.pioneer.name} to establish a forward outpost in ${selected.room.name ?? selected.room.id}.`);
    return plan;
  }

  chooseMonsterCandidate(factionId, pioneer, origin, sim) {
    return this.rooms
      .filter(room => room.w * room.d >= 20 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
      .filter(room => !this.activeSettlementInRoom(room.id))
      .filter(room => !this.hostilePresence(room.id, factionId, sim))
      .filter(room => {
        const state = this.territorySystem.roomStates.get(room.id);
        if (state?.contested || (state?.owner && state.owner !== factionId)) return false;
        return (this.graph.get(room.id) ?? []).some(neighborId => this.territorySystem.roomStates.get(neighborId)?.owner === factionId);
      })
      .map(room => {
        const travelDistance = graphDistance(this.graph, projectedRoom(pioneer), room.id);
        const originDistance = graphDistance(this.graph, origin.roomId, room.id);
        if (!Number.isFinite(travelDistance) || travelDistance > 6 || originDistance > 4) return null;
        const degree = this.graph.get(room.id)?.length ?? 0;
        const resources = this.resourceValueNear(room.id);
        const frontier = this.frontierValue(room.id, factionId);
        const score = resources * 5.2 + frontier * 2.8 + (degree <= 2 ? 3.5 : 0) + room.w * room.d * 0.035 - travelDistance * 0.65 - originDistance * 0.35;
        return { room, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0] ?? null;
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.departed || agent.hidden || agent.travel || agent.combat || agent.hosted || agent.attachedToId || agent.cargoId) return null;
    const plan = agent.faction === 'party'
      ? this.plans.get(this.partyKey(agent.partyId))
      : this.plans.get(this.factionKey(agent.ecologyFaction));
    if (!plan || plan.pioneerId !== agent.id || plan.mode === 'retreating' || plan.mode === 'garrisoning') return null;
    const currentRoomId = projectedRoom(agent);
    if (currentRoomId !== plan.targetRoomId) {
      const step = nextStep(this.graph, currentRoomId, plan.targetRoomId);
      return step && step !== currentRoomId ? { type: 'expansion-move', roomId: step, planId: plan.id } : null;
    }

    if (plan.kind === 'party') {
      const party = this.partySystem.parties.get(plan.partyId);
      const members = party ? this.expeditionSystem.activeMembers(party, sim) : [];
      if (party && this.expeditionSystem.canEstablishCamp(party, members, plan.targetRoomId, sim, { allowRelay: true })) {
        return { type: 'expansion-establish-party', planId: plan.id };
      }
      return { type: 'expansion-hold', planId: plan.id, activityType: 'securing-camp-ground' };
    }

    if (this.canEstablishMonsterOutpost(plan, agent, sim)) return { type: 'expansion-establish-monster', planId: plan.id };
    return { type: 'expansion-hold', planId: plan.id, activityType: 'securing-outpost-ground' };
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('expansion-')) return false;
    const plan = [...this.plans.values()].find(candidate => candidate.id === action.planId);
    if (!plan || plan.pioneerId !== agent.id) return true;

    if (action.type === 'expansion-move') {
      this.setActivity(agent, 'scouting-frontier', 'approach', plan, sim);
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action.type === 'expansion-hold') {
      this.setActivity(agent, action.activityType ?? 'securing-ground', 'loop', plan, sim);
      return true;
    }
    if (action.type === 'expansion-establish-party') {
      this.setActivity(agent, 'establishing-camp', 'interact', plan, sim);
      const party = this.partySystem.parties.get(plan.partyId);
      const before = party ? this.expeditionSystem.activePartyCamps(party).length : 0;
      this.expeditionSystem.establishCamp(agent, plan.targetRoomId, sim, { allowRelay: true });
      const after = party ? this.expeditionSystem.activePartyCamps(party) : [];
      if (after.length > before) this.completePlan(plan, agent, after.find(camp => camp.roomId === plan.targetRoomId)?.id ?? null, sim);
      return true;
    }
    if (action.type === 'expansion-establish-monster') {
      this.setActivity(agent, 'founding-outpost', 'interact', plan, sim);
      this.establishMonsterOutpost(plan, agent, sim);
      return true;
    }
    return false;
  }

  canEstablishMonsterOutpost(plan, pioneer, sim) {
    if (!plan || plan.kind !== 'monster' || projectedRoom(pioneer) !== plan.targetRoomId) return false;
    if (this.activeSettlementInRoom(plan.targetRoomId)) return false;
    if (this.hostilePresence(plan.targetRoomId, plan.factionId, sim)) return false;
    const state = this.territorySystem.roomStates.get(plan.targetRoomId);
    if (!state || state.contested || state.owner !== plan.factionId || state.control < 45) return false;
    const origin = this.settlementSystem.settlements.get(plan.originSettlementId);
    const supply = this.territorySystem.factionSupply.get(plan.factionId) ?? 0;
    return Boolean(origin && ACTIVE_STATES.has(origin.state) && (origin.materials ?? 0) >= OUTPOST_COST.materials && supply >= OUTPOST_COST.supply);
  }

  establishMonsterOutpost(plan, pioneer, sim) {
    if (!this.canEstablishMonsterOutpost(plan, pioneer, sim)) return false;
    const room = this.rooms.find(candidate => candidate.id === plan.targetRoomId);
    const origin = this.settlementSystem.settlements.get(plan.originSettlementId);
    if (!room || !origin) return false;

    const factionAgents = sim.agents.filter(agent => agent.alive && !agent.departed && agent.faction === 'dungeon' && agent.ecologyFaction === plan.factionId);
    const allowedSpecies = [...new Set(factionAgents.map(agent => agent.role))];
    const primaryRole = mostCommon(factionAgents.map(agent => agent.role)) ?? pioneer.role;
    const placement = {
      ox: room.w * (this.sequence % 2 ? 0.24 : -0.24),
      oz: room.d * (this.sequence % 3 ? -0.22 : 0.22),
      rotation: (this.sequence % 4) * Math.PI / 2,
      scale: 0.76
    };
    const safeOutpostPlacement = this.occupancy?.findPlacement?.(room.id, {
      radius: 0.68 * placement.scale,
      preferred: placement,
      avoidOccupied: true
    });
    if (this.occupancy?.findPlacement && !safeOutpostPlacement) return false;
    if (safeOutpostPlacement) {
      placement.ox = safeOutpostPlacement.ox;
      placement.oz = safeOutpostPlacement.oz;
    }
    const prop = {
      id: `monster-forward-outpost-${this.sequence++}`,
      type: 'territory_banner',
      label: `${prettyFaction(plan.factionId)} Forward Outpost`,
      roomId: room.id,
      ecologyFaction: plan.factionId,
      structureFaction: plan.factionId,
      species: primaryRole,
      siegeStructure: true,
      underConstruction: false,
      buildProgress: 1,
      integrity: 72,
      maxIntegrity: 72,
      placement
    };
    const settlement = {
      id: `settlement-${prop.id}`,
      anchorPropId: prop.id,
      factionId: plan.factionId,
      species: null,
      allowedSpecies,
      type: 'forward-outpost',
      roomId: room.id,
      tier: 1,
      state: 'active',
      previousState: null,
      indestructible: false,
      baseCapacity: 3,
      capacity: 3,
      guestCapacity: 0,
      roamingRange: Math.max(3, origin.roamingRange ?? 3),
      homeAttachment: Math.max(0.62, (origin.homeAttachment ?? 0.7) - 0.08),
      minimumGarrison: 1,
      structuralIntegrity: 72,
      control: Math.max(58, this.territorySystem.roomStates.get(room.id)?.control ?? 0),
      controlRequired: 38,
      contested: false,
      population: 0,
      presentPopulation: 0,
      overcrowded: 0,
      residentIds: [],
      presentIds: [],
      displacedIds: [],
      food: 2,
      medicine: 0,
      materials: 1,
      wealth: 0,
      comfort: 5,
      security: 10,
      recoveryPower: 3,
      buildings: [],
      visualPlacement: { ...placement },
      foundedAt: sim.time,
      lastAttackedAt: null,
      abandonedAt: null
    };

    prop.settlementId = settlement.id;
    this.props.push(prop);
    this.settlementSystem.registerSettlement(settlement);
    origin.materials = Math.max(0, (origin.materials ?? 0) - OUTPOST_COST.materials);
    this.territorySystem.factionSupply.set(plan.factionId, Math.max(0, (this.territorySystem.factionSupply.get(plan.factionId) ?? 0) - OUTPOST_COST.supply));
    const territory = this.territorySystem.roomStates.get(room.id);
    if (territory) {
      territory.owner = plan.factionId;
      territory.control = Math.max(58, territory.control ?? 0);
      territory.contested = false;
      territory.challenger = null;
      territory.lastChangedAt = sim.time;
    }
    this.settlementSystem.rehome(pioneer, settlement, sim, 'frontier-outpost-founding');
    this.settlementSystem.sync(sim);
    this.occupancy.blockArea(room.id, room.x + placement.ox, room.z + placement.oz, 0.68 * placement.scale, prop.id);
    sim.emitEffect?.('expansion-outpost-build', { roomId: room.id, agentId: pioneer.id, duration: 1.4 });
    this.onEvent(`${prettyFaction(plan.factionId)} established a forward outpost in ${sim.roomName(room.id)}.`);
    this.completePlan(plan, pioneer, settlement.id, sim);
    return true;
  }

  completePlan(plan, pioneer, settlementId, sim) {
    plan.mode = 'garrisoning';
    plan.settlementId = settlementId;
    plan.completedAt = sim.time;
    plan.reevaluateAt = sim.time + 28;
    plan.expiresAt = null;
    this.setActivity(pioneer, plan.kind === 'party' ? 'guarding-camp' : 'guarding-outpost', 'loop', plan, sim);
    if (plan.kind === 'party') {
      const party = this.partySystem.parties.get(plan.partyId);
      if (party) party.plan = clonePlan(plan);
    }
  }

  setActivity(agent, type, phase, plan, sim) {
    agent.activity = {
      type,
      phase,
      source: 'strategic-expansion',
      targetRoomId: plan.targetRoomId,
      targetSettlementId: plan.settlementId ?? null,
      startedAt: sim.time,
      progress: phase === 'finish' ? 1 : 0,
      interruptible: true
    };
    agent.mood = type;
  }

  activeSettlementInRoom(roomId) {
    return [...this.settlementSystem.settlements.values()].find(settlement => settlement.roomId === roomId && ACTIVE_STATES.has(settlement.state)) ?? null;
  }

  activeFactionSettlements(factionId) {
    return [...this.settlementSystem.settlements.values()].filter(settlement => settlement.factionId === factionId && ACTIVE_STATES.has(settlement.state));
  }

  hostilePresence(roomId, factionId, sim) {
    return sim.agents.some(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === roomId && agent.ecologyFaction && agent.ecologyFaction !== factionId);
  }

  resourceValueNear(roomId) {
    const nearby = new Set([roomId, ...(this.graph.get(roomId) ?? [])]);
    return this.props.reduce((sum, prop) => sum + (prop.type === 'territory_resource' && nearby.has(prop.roomId) && (prop.stock ?? 0) >= 1 ? 1 : 0), 0);
  }

  frontierValue(roomId, factionId) {
    return (this.graph.get(roomId) ?? []).reduce((score, neighborId) => {
      const state = this.territorySystem.roomStates.get(neighborId);
      if (!state?.owner) return score + 1;
      if (state.owner !== factionId) return score + 1.5;
      return score;
    }, 0);
  }

  partyKey(partyId) {
    return `party:${partyId}`;
  }

  factionKey(factionId) {
    return `faction:${factionId}`;
  }

  snapshot() {
    return { plans: [...this.plans.values()].map(clonePlan) };
  }

  metrics() {
    const plans = [...this.plans.values()];
    return {
      activeExpansionPlans: plans.filter(plan => plan.mode !== 'garrisoning').length,
      partyExpansionPlans: plans.filter(plan => plan.kind === 'party').length,
      monsterExpansionPlans: plans.filter(plan => plan.kind === 'monster').length,
      monsterForwardOutposts: [...this.settlementSystem.settlements.values()].filter(settlement => settlement.type === 'forward-outpost' && settlement.state !== 'ruined').length
    };
  }
}

function projectedRoom(agent) {
  if (agent?.travel?.phase === 'entering') return agent.travel.toRoomId;
  return agent?.travel?.toRoomId ?? agent?.roomId ?? null;
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function prettyFaction(value) {
  return String(value ?? 'unknown faction').replaceAll('-', ' ');
}

function clonePlan(plan) {
  return plan ? { ...plan } : null;
}

function round(value) {
  return Math.round((value ?? 0) * 10) / 10;
}
