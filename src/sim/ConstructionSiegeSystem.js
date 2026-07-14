import { graphDistance, nextStep } from './Pathfinding.js';

export const CONSTRUCTION_TYPES = new Set([
  'supply_depot', 'gatehouse', 'siege_workshop', 'ambush_post'
]);

const DEFENSE_TYPES = new Set(['barricade', 'watch_post', 'gatehouse', 'ambush_post']);
const BUILDERS = new Set(['goblin', 'kobold', 'orc', 'fighter', 'rogue']);
const WARRIORS = new Set(['fighter', 'rogue', 'archer', 'goblin', 'skeleton', 'spider', 'ogre', 'zombie', 'orc', 'carrion', 'kobold', 'wraith']);
const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);

const BUILD_CATALOG = {
  supply_depot: { supply: 7, materials: 3, duration: 28, integrity: 110, radius: 1.2, security: 4 },
  gatehouse: { supply: 10, materials: 4, duration: 38, integrity: 165, radius: 1.45, security: 18 },
  siege_workshop: { supply: 9, materials: 4, duration: 34, integrity: 120, radius: 1.3, security: 3 },
  ambush_post: { supply: 5, materials: 2, duration: 22, integrity: 82, radius: 0.95, security: 9 }
};

export class ConstructionSiegeSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.jobs = [];
    this.sieges = new Map();
    this.sequence = 0;
    this.tickClock = 0;
    this.planClock = 2;
    this.normalizeStructures();
  }

  normalizeStructures() {
    for (const prop of this.props) {
      if (!this.isStructure(prop)) continue;
      const profile = this.profileFor(prop.type);
      prop.structureFaction ??= prop.ecologyFaction ?? null;
      prop.ecologyFaction ??= prop.structureFaction;
      prop.maxIntegrity ??= profile.integrity;
      prop.integrity ??= prop.maxIntegrity;
      prop.siegeStructure = true;
      prop.underConstruction ??= false;
      prop.buildProgress ??= prop.underConstruction ? 0 : 1;
    }
  }

  update(dt, sim) {
    for (const agent of sim.agents) agent.siegeCooldown = Math.max(0, (agent.siegeCooldown ?? 0) - dt);
    this.tickClock -= dt;
    this.planClock -= dt;
    if (this.tickClock <= 0) {
      this.tickClock = 0.6;
      this.normalizeStructures();
      this.updateSieges(sim);
      this.updateSupplyStatus(sim);
      this.advanceJobs(0.6, sim);
    }
    if (this.planClock <= 0) {
      this.planClock = 6;
      this.planConstruction(sim);
    }
  }

  isStructure(prop) {
    return Boolean(prop && (
      CONSTRUCTION_TYPES.has(prop.type) ||
      ['territory_banner', 'barricade', 'watch_post'].includes(prop.type) ||
      prop.siegeStructure
    ));
  }

  profileFor(type) {
    if (BUILD_CATALOG[type]) return BUILD_CATALOG[type];
    if (type === 'barricade') return { supply: 4, materials: 1, duration: 18, integrity: 78, radius: 0.92, security: 8 };
    if (type === 'watch_post') return { supply: 6, materials: 2, duration: 24, integrity: 92, radius: 0.95, security: 10 };
    return { supply: 2, materials: 0, duration: 12, integrity: 50, radius: 0.55, security: 2 };
  }

  planConstruction(sim) {
    for (const settlement of this.settlementSystem.settlements.values()) {
      if (settlement.indestructible || !ACTIVE_STATES.has(settlement.state) || settlement.contested) continue;
      if (this.jobs.some(job => job.settlementId === settlement.id && job.state === 'building')) continue;
      const territory = this.territorySystem.roomStates.get(settlement.roomId);
      if (territory?.owner && territory.owner !== settlement.factionId) continue;
      const desired = this.chooseConstruction(settlement, sim);
      if (!desired) continue;
      this.startConstruction(settlement, desired, sim);
    }
  }

  chooseConstruction(settlement, sim) {
    const roomProps = this.props.filter(prop => prop.roomId === settlement.roomId && this.isStructure(prop) && prop.structureFaction === settlement.factionId);
    const has = type => roomProps.some(prop => prop.type === type && (prop.integrity ?? 1) > 0);
    const degree = this.graph.get(settlement.roomId)?.length ?? 0;
    const adjacentEnemy = (this.graph.get(settlement.roomId) ?? []).some(roomId => {
      const state = this.territorySystem.roomStates.get(roomId);
      return state?.owner && state.owner !== settlement.factionId;
    });
    const cargoTraffic = sim.logisticsSystem?.cargo?.some(cargo => cargo.destinationSettlementId === settlement.id || cargo.sourceRoomId === settlement.roomId);

    if (!has('supply_depot') && (cargoTraffic || settlement.materials >= 4)) return 'supply_depot';
    if (!has('gatehouse') && degree <= 2 && settlement.security < 35) return 'gatehouse';
    if (!has('ambush_post') && (adjacentEnemy || settlement.state === 'threatened')) return 'ambush_post';
    if (!has('siege_workshop') && adjacentEnemy && settlement.materials >= 5) return 'siege_workshop';
    return null;
  }

  startConstruction(settlement, type, sim, { force = false } = {}) {
    const profile = this.profileFor(type);
    const availableSupply = this.territorySystem.factionSupply.get(settlement.factionId) ?? 0;
    if (!force && (availableSupply < profile.supply || (settlement.materials ?? 0) < profile.materials)) return null;
    if (!force) {
      this.territorySystem.factionSupply.set(settlement.factionId, availableSupply - profile.supply);
      settlement.materials = Math.max(0, (settlement.materials ?? 0) - profile.materials);
    }

    const room = this.rooms.find(candidate => candidate.id === settlement.roomId);
    if (!room) return null;
    const placement = this.structurePlacement(room, type, settlement.factionId);
    if (!placement) {
      if (!force) {
        this.territorySystem.factionSupply.set(settlement.factionId, (this.territorySystem.factionSupply.get(settlement.factionId) ?? 0) + profile.supply);
        settlement.materials = (settlement.materials ?? 0) + profile.materials;
      }
      settlement.lastBuildBlockedReason = 'WP11 placement unavailable';
      return null;
    }
    const prop = {
      id: `construction-${type}-${this.sequence++}`,
      type,
      label: `${settlement.factionId} ${type.replaceAll('_', ' ')}`,
      roomId: settlement.roomId,
      ecologyFaction: settlement.factionId,
      structureFaction: settlement.factionId,
      settlementId: settlement.id,
      siegeStructure: true,
      underConstruction: true,
      buildProgress: 0,
      integrity: 1,
      maxIntegrity: profile.integrity,
      placement
    };
    const job = {
      id: `build-job-${this.sequence++}`,
      propId: prop.id,
      type,
      factionId: settlement.factionId,
      settlementId: settlement.id,
      roomId: settlement.roomId,
      progress: 0,
      duration: profile.duration,
      state: 'building',
      startedAt: sim.time,
      builderIds: []
    };
    this.props.push(prop);
    this.jobs.push(job);
    this.blockStructure(prop);
    sim.emitEffect?.('construction-start', { roomId: prop.roomId, duration: 1 });
    this.onEvent(`${settlement.factionId} began building ${prop.label} in ${sim.roomName(prop.roomId)}.`);
    return job;
  }

  advanceJobs(dt, sim) {
    for (const job of this.jobs.filter(candidate => candidate.state === 'building')) {
      const prop = this.props.find(candidate => candidate.id === job.propId);
      if (!prop) {
        job.state = 'destroyed';
        continue;
      }
      const builders = sim.agents.filter(agent =>
        agent.alive && !agent.departed && !agent.hidden && !agent.travel && !agent.combat &&
        agent.roomId === job.roomId && this.agentFaction(agent) === job.factionId && BUILDERS.has(agent.role)
      );
      job.builderIds = builders.map(agent => agent.id);
      const residentLabor = builders.length ? builders.length : 0.22;
      const workshopBonus = this.props.some(candidate => candidate.roomId === job.roomId && candidate.type === 'siege_workshop' && !candidate.underConstruction && candidate.structureFaction === job.factionId) ? 1.35 : 1;
      job.progress = Math.min(job.duration, job.progress + dt * residentLabor * workshopBonus);
      prop.buildProgress = job.progress / job.duration;
      prop.integrity = Math.max(1, Math.round(prop.maxIntegrity * prop.buildProgress));
      if (job.progress >= job.duration) this.completeJob(job, prop, sim);
    }
    this.jobs = this.jobs.filter(job => job.state === 'building' || sim.time - (job.finishedAt ?? sim.time) < 20);
  }

  completeJob(job, prop, sim) {
    job.state = 'complete';
    job.finishedAt = sim.time;
    prop.underConstruction = false;
    prop.buildProgress = 1;
    prop.integrity = prop.maxIntegrity;
    sim.emitEffect?.('construction-complete', { roomId: prop.roomId, duration: 1.35 });
    this.onEvent(`${prop.label} was completed in ${sim.roomName(prop.roomId)}.`);
    this.settlementSystem.sync(sim);
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.departed || agent.hidden || agent.travel || agent.combat || agent.hosted || agent.attachedToId) return null;
    const faction = this.agentFaction(agent);
    if (!faction) return null;

    const job = this.jobs.find(candidate => candidate.state === 'building' && candidate.factionId === faction);
    if (job && BUILDERS.has(agent.role) && !agent.cargoId) {
      if (agent.roomId === job.roomId) return { type: 'construction-work', jobId: job.id };
      if (graphDistance(this.graph, agent.roomId, job.roomId) <= 3) {
        const step = nextStep(this.graph, agent.roomId, job.roomId);
        if (step && step !== agent.roomId) return { type: 'construction-move', roomId: step, text: `${agent.name} moved to help build ${job.type.replaceAll('_', ' ')}.` };
      }
    }

    if (!WARRIORS.has(agent.role) || agent.cargoId || agent.siegeCooldown > 0) return null;
    const localTarget = this.chooseSiegeTarget(faction, agent.roomId);
    if (localTarget) return { type: 'siege-attack', propId: localTarget.id };

    const adjacentTarget = (this.graph.get(agent.roomId) ?? [])
      .map(roomId => this.enemySettlementInRoom(faction, roomId))
      .find(Boolean);
    if (adjacentTarget && Math.random() < 0.46) {
      return { type: 'siege-move', roomId: adjacentTarget.roomId, text: `${agent.name} advanced on ${this.settlementSystem.label(adjacentTarget)} to cut its supplies and breach its defenses.`, interactionType: 'siege' };
    }

    const ambush = this.props.find(prop => prop.type === 'ambush_post' && prop.roomId === agent.roomId && prop.structureFaction === faction && !prop.underConstruction);
    if (ambush && sim.logisticsSystem?.routeUsesRoomByEnemy?.(faction, agent.roomId)) return { type: 'ambush-hold' };
    return null;
  }

  resolve(agent, action, sim) {
    if (action?.type === 'construction-move' || action?.type === 'siege-move') {
      sim.beginTravel(agent, action.roomId, { interactionType: action.interactionType ?? null });
      return true;
    }
    if (action?.type === 'construction-work') {
      const job = this.jobs.find(candidate => candidate.id === action.jobId && candidate.state === 'building');
      if (job) {
        job.progress = Math.min(job.duration, job.progress + 1.5 + this.siegePower(agent) * 0.35);
        agent.mood = `building-${job.type}`;
      }
      return true;
    }
    if (action?.type === 'siege-attack') {
      const prop = this.props.find(candidate => candidate.id === action.propId);
      if (prop) this.attackStructure(agent, prop, sim);
      return true;
    }
    if (action?.type === 'ambush-hold') {
      agent.mood = 'waiting-in-ambush';
      return true;
    }
    return false;
  }

  chooseSiegeTarget(attackerFaction, roomId) {
    const hostile = this.props.filter(prop =>
      prop.roomId === roomId && this.isAttackableStructure(prop) && this.structureFaction(prop) && this.structureFaction(prop) !== attackerFaction
    );
    return hostile.sort((a, b) => this.targetPriority(a) - this.targetPriority(b) || (a.integrity ?? 0) - (b.integrity ?? 0))[0] ?? null;
  }

  isAttackableStructure(prop) {
    if (this.isStructure(prop)) return (prop.integrity ?? 1) > 0;
    return Boolean(prop.settlementId);
  }

  targetPriority(prop) {
    if (DEFENSE_TYPES.has(prop.type)) return 0;
    if (prop.type === 'supply_depot') return 1;
    if (prop.type === 'siege_workshop') return 2;
    if (prop.settlementId || prop.species) return 3;
    return 4;
  }

  attackStructure(agent, prop, sim) {
    if (agent.siegeCooldown > 0 || prop.roomId !== agent.roomId) return false;
    const faction = this.agentFaction(agent);
    if (!faction || faction === this.structureFaction(prop)) return false;
    const workshop = this.props.some(candidate => candidate.type === 'siege_workshop' && candidate.structureFaction === faction && !candidate.underConstruction && ACTIVE_STATES.has(this.settlementForProp(candidate)?.state));
    const damage = Math.max(2, Math.round(this.siegePower(agent) * (workshop ? 1.35 : 1) + Math.random() * 3));
    prop.maxIntegrity ??= this.profileFor(prop.type).integrity;
    prop.integrity = Math.max(0, (prop.integrity ?? prop.maxIntegrity) - damage);
    agent.siegeCooldown = Math.max(0.9, 2.3 - this.siegePower(agent) * 0.08);
    agent.mood = `besieging-${prop.type}`;

    const settlement = this.settlementForProp(prop);
    if (settlement) {
      settlement.lastAttackedAt = sim.time;
      if (prop.id === settlement.anchorPropId) settlement.structuralIntegrity = Math.max(0, settlement.structuralIntegrity - damage * 0.72);
    }
    sim.emitEffect?.('siege-hit', { roomId: prop.roomId, agentId: agent.id, duration: 0.75, amount: damage });
    this.onEvent(`${agent.name} dealt ${damage} siege damage to ${prop.label ?? prop.type}.`);
    if (prop.integrity <= 0) this.destroyStructure(prop, faction, sim);
    return true;
  }

  attackAdjacentRoomFromDoor(agent, roomId, sim) {
    if (!this.graph.get(agent.roomId)?.includes(roomId)) return false;
    const target = this.chooseSiegeTarget(this.agentFaction(agent), roomId);
    if (!target) return false;
    const faction = this.agentFaction(agent);
    if (!faction) return false;
    const workshop = this.props.some(candidate => candidate.type === 'siege_workshop' && candidate.structureFaction === faction && !candidate.underConstruction && ACTIVE_STATES.has(this.settlementForProp(candidate)?.state));
    const damage = Math.max(1, Math.round(this.siegePower(agent) * 0.72 * (workshop ? 1.2 : 1) + Math.random() * 2));
    target.maxIntegrity ??= this.profileFor(target.type).integrity;
    target.integrity = Math.max(0, (target.integrity ?? target.maxIntegrity) - damage);
    agent.siegeCooldown = Math.max(1.2, 2.6 - this.siegePower(agent) * 0.06);
    agent.mood = `doorway-siege-${target.type}`;
    const settlement = this.settlementForProp(target);
    if (settlement) {
      settlement.lastAttackedAt = sim.time;
      if (target.id === settlement.anchorPropId) settlement.structuralIntegrity = Math.max(0, settlement.structuralIntegrity - damage * 0.82);
    }
    sim.emitEffect?.('siege-hit', { roomId, agentId: agent.id, duration: 0.72, amount: damage });
    this.onEvent(`${agent.name} hammered ${target.label ?? target.type} from the doorway for ${damage} siege damage.`);
    if (target.integrity <= 0) this.destroyStructure(target, faction, sim);
    return true;
  }

  destroyStructure(prop, attackerFaction, sim) {
    const settlement = this.settlementForProp(prop);
    const index = this.props.findIndex(candidate => candidate.id === prop.id);
    if (index >= 0) this.props.splice(index, 1);
    this.occupancy.unblockByBlocker?.(prop.id);
    const job = this.jobs.find(candidate => candidate.propId === prop.id);
    if (job) {
      job.state = 'destroyed';
      job.finishedAt = sim.time;
    }
    if (settlement && prop.id === settlement.anchorPropId) {
      settlement.structuralIntegrity = 0;
      settlement.anchorPresent = false;
    }
    sim.emitEffect?.('structure-break', { roomId: prop.roomId, duration: 1.25 });
    this.onEvent(`${attackerFaction} destroyed ${prop.label ?? prop.type} in ${sim.roomName(prop.roomId)}.`);
    this.settlementSystem.sync(sim);
  }

  updateSieges(sim) {
    const live = new Set();
    for (const settlement of this.settlementSystem.settlements.values()) {
      if (settlement.indestructible || settlement.state === 'ruined') continue;
      const hostileHere = this.hostileAgents(settlement.factionId, settlement.roomId, sim);
      const adjacentHostiles = (this.graph.get(settlement.roomId) ?? []).flatMap(roomId => this.hostileAgents(settlement.factionId, roomId, sim));
      if (!hostileHere.length && !adjacentHostiles.length) continue;
      const defenses = this.props.filter(prop => prop.roomId === settlement.roomId && DEFENSE_TYPES.has(prop.type) && this.structureFaction(prop) === settlement.factionId && (prop.integrity ?? 0) > 0);
      const attackerFaction = this.dominantFaction(hostileHere.length ? hostileHere : adjacentHostiles);
      const phase = hostileHere.length
        ? defenses.length ? 'breach' : settlement.anchorPresent ? 'core-assault' : 'occupation'
        : 'approach';
      const record = this.sieges.get(settlement.id) ?? {
        settlementId: settlement.id,
        roomId: settlement.roomId,
        attackerFaction,
        defenderFaction: settlement.factionId,
        phase,
        startedAt: sim.time,
        lastChangedAt: sim.time
      };
      if (record.phase !== phase) record.lastChangedAt = sim.time;
      record.phase = phase;
      record.attackerFaction = attackerFaction;
      record.attackers = hostileHere.length;
      record.adjacentAttackers = adjacentHostiles.length;
      record.defensesRemaining = defenses.length;
      record.active = true;
      this.sieges.set(settlement.id, record);
      live.add(settlement.id);
    }
    for (const [id, siege] of this.sieges) {
      if (live.has(id)) continue;
      siege.active = false;
      if (sim.time - (siege.lastChangedAt ?? 0) > 10) this.sieges.delete(id);
    }
  }

  updateSupplyStatus(sim) {
    for (const settlement of this.settlementSystem.settlements.values()) {
      if (settlement.indestructible) {
        settlement.supplyStatus = 'open';
        settlement.supplyEfficiency = 1;
        continue;
      }
      const siege = this.sieges.get(settlement.id);
      const adjacent = this.graph.get(settlement.roomId) ?? [];
      const hostileOwned = adjacent.filter(roomId => {
        const state = this.territorySystem.roomStates.get(roomId);
        return state?.owner && state.owner !== settlement.factionId && state.control >= 45;
      }).length;
      const enemyAmbush = adjacent.some(roomId => this.props.some(prop => prop.type === 'ambush_post' && prop.roomId === roomId && prop.structureFaction !== settlement.factionId && !prop.underConstruction));
      if (siege?.active && ['breach', 'core-assault', 'occupation'].includes(siege.phase)) {
        settlement.supplyStatus = 'blockaded';
        settlement.supplyEfficiency = 0;
      } else if (hostileOwned >= Math.max(1, Math.ceil(adjacent.length * 0.6))) {
        settlement.supplyStatus = 'blockaded';
        settlement.supplyEfficiency = 0;
      } else if (siege?.active || hostileOwned > 0 || enemyAmbush) {
        settlement.supplyStatus = 'threatened';
        settlement.supplyEfficiency = 0.65;
      } else {
        settlement.supplyStatus = 'open';
        settlement.supplyEfficiency = 1;
      }
    }
  }

  routeProfile(factionId, fromRoomId, toRoomId, sim) {
    const path = shortestPath(this.graph, fromRoomId, toRoomId);
    if (!path.length) return { path: [], risk: 1, safety: 0, cut: true };
    const risks = path.map(roomId => this.roomRisk(factionId, roomId, sim));
    const averageRisk = risks.reduce((sum, value) => sum + value, 0) / risks.length;
    const maxRisk = Math.max(...risks);
    const destination = [...this.settlementSystem.settlements.values()].find(settlement => settlement.roomId === toRoomId && settlement.factionId === factionId);
    const cut = destination?.supplyStatus === 'blockaded' || maxRisk >= 0.92;
    const risk = clamp(averageRisk * 0.62 + maxRisk * 0.38, 0, 1);
    return { path, risk, safety: clamp(1 - risk, 0, 1), cut };
  }

  roomRisk(factionId, roomId, sim) {
    let risk = 0;
    const territory = this.territorySystem.roomStates.get(roomId);
    if (territory?.contested) risk += 0.2;
    if (territory?.owner && territory.owner !== factionId) risk += territory.control >= 70 ? 0.42 : 0.28;
    const hostileCount = this.hostileAgents(factionId, roomId, sim).length;
    risk += Math.min(0.36, hostileCount * 0.12);
    if (this.props.some(prop => prop.type === 'ambush_post' && prop.roomId === roomId && prop.structureFaction !== factionId && !prop.underConstruction)) risk += 0.28;
    if ([...this.sieges.values()].some(siege => siege.active && siege.roomId === roomId)) risk += 0.22;
    const room = this.rooms.find(candidate => candidate.id === roomId);
    risk -= clamp(room?.zoneInteractionSafetyBonus ?? 0, 0, 0.45);
    return clamp(risk, 0, 1);
  }

  enemySettlementInRoom(factionId, roomId) {
    return [...this.settlementSystem.settlements.values()].find(settlement => settlement.roomId === roomId && settlement.factionId !== factionId && !settlement.indestructible && settlement.state !== 'ruined') ?? null;
  }

  hostileAgents(factionId, roomId, sim) {
    return sim.agents.filter(agent =>
      agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === roomId &&
      this.agentFaction(agent) && this.agentFaction(agent) !== factionId
    );
  }

  dominantFaction(agents) {
    const counts = new Map();
    for (const agent of agents) {
      const faction = this.agentFaction(agent);
      if (faction) counts.set(faction, (counts.get(faction) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  structureFaction(prop) {
    return prop.structureFaction ?? prop.ecologyFaction ?? this.settlementForProp(prop)?.factionId ?? null;
  }

  settlementForProp(prop) {
    if (prop.settlementId) return this.settlementSystem.settlements.get(prop.settlementId) ?? null;
    return [...this.settlementSystem.settlements.values()].find(settlement => settlement.anchorPropId === prop.id) ?? null;
  }

  agentFaction(agent) {
    return agent.faction === 'party' ? 'adventurer-expedition' : agent.ecologyFaction;
  }

  siegePower(agent) {
    const rolePower = {
      ogre: 9, orc: 6.5, fighter: 6, barbarian: 7, paladin: 6.5, wizard: 5.5,
      kobold: 4.5, goblin: 4, skeleton: 4, zombie: 4.5, wraith: 5, carrion: 5,
      rogue: 3.5, archer: 3.5, spider: 3
    };
    return (rolePower[agent.role] ?? 3) + (agent.level ?? 1) * 0.35;
  }

  targetSupplyStructure(factionId, roomId) {
    return this.props.find(prop => prop.roomId === roomId && prop.type === 'supply_depot' && prop.structureFaction !== factionId && (prop.integrity ?? 0) > 0) ?? null;
  }

  structurePlacement(room, type, factionId) {
    const hash = hashString(`${room.id}:${type}:${factionId}:${this.sequence}`);
    const angle = (hash % 628) / 100;
    const desired = {
      ox: round(Math.cos(angle) * room.w * (type === 'gatehouse' ? 0.37 : 0.3)),
      oz: round(Math.sin(angle) * room.d * (type === 'gatehouse' ? 0.35 : 0.28)),
      rotation: round(angle + Math.PI),
      scale: type === 'gatehouse' ? 0.9 : type === 'supply_depot' ? 0.82 : 0.78
    };
    const radius = this.profileFor(type).radius * desired.scale;
    const safePlacement = this.occupancy?.findPlacement?.(room.id, { radius, preferred: desired, avoidOccupied: true });
    if (this.occupancy?.findPlacement && !safePlacement) return null;
    return safePlacement ? { ...desired, ox: safePlacement.ox, oz: safePlacement.oz } : desired;
  }

  blockStructure(prop) {
    if (prop.structureBlocked) return;
    const room = this.rooms.find(candidate => candidate.id === prop.roomId);
    if (!room) return;
    const profile = this.profileFor(prop.type);
    const placement = prop.placement ?? {};
    this.occupancy.blockArea(
      prop.roomId,
      room.x + (placement.ox ?? 0),
      room.z + (placement.oz ?? 0),
      profile.radius * (placement.scale ?? 1),
      prop.id
    );
    prop.structureBlocked = true;
  }

  snapshot() {
    return {
      jobs: this.jobs.map(job => ({ ...job, builderIds: [...job.builderIds] })),
      sieges: [...this.sieges.values()].map(siege => ({ ...siege })),
      structures: this.props.filter(prop => this.isStructure(prop)).map(prop => ({
        id: prop.id,
        type: prop.type,
        roomId: prop.roomId,
        factionId: this.structureFaction(prop),
        integrity: prop.integrity,
        maxIntegrity: prop.maxIntegrity,
        underConstruction: prop.underConstruction,
        buildProgress: prop.buildProgress
      }))
    };
  }

  metrics() {
    const settlements = [...this.settlementSystem.settlements.values()];
    return {
      constructionJobs: this.jobs.filter(job => job.state === 'building').length,
      completedStructures: this.props.filter(prop => this.isStructure(prop) && !prop.underConstruction).length,
      activeSieges: [...this.sieges.values()].filter(siege => siege.active).length,
      blockadedSettlements: settlements.filter(settlement => settlement.supplyStatus === 'blockaded').length,
      threatenedSupply: settlements.filter(settlement => settlement.supplyStatus === 'threatened').length
    };
  }
}

function shortestPath(graph, start, goal) {
  if (!start || !goal) return [];
  if (start === goal) return [start];
  const queue = [start];
  const previous = new Map([[start, null]]);
  while (queue.length) {
    const current = queue.shift();
    for (const next of graph.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === goal) {
        const path = [goal];
        let cursor = current;
        while (cursor) {
          path.push(cursor);
          cursor = previous.get(cursor);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
