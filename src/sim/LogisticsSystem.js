import { graphDistance, nextStep } from './Pathfinding.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);
const ESCORT_ROLES = new Set(['fighter', 'rogue', 'archer', 'goblin', 'skeleton', 'orc', 'kobold', 'wraith']);
const ESCORT_RISK_THRESHOLD = 0.42;
const MAX_ROUTE_RISK = 0.9;

export class LogisticsSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.partySystem = partySystem;
    this.onEvent = onEvent;
    this.constructionSystem = null;
    this.cargo = [];
    this.sequence = 0;
    this.tickClock = 0;
  }

  update(dt, sim) {
    this.tickClock -= dt;
    if (this.tickClock > 0) return;
    this.tickClock = 0.55;
    this.syncCarriers(sim);
    this.refreshRoutes(sim);
    this.resolveAmbushes(sim);
    this.resolveRaids(sim);
    this.collectDroppedCargo(sim);
    this.syncEscorts(sim);
  }

  enqueueHarvest({ worker, resourceType, amount, roomId, factionId }, sim) {
    if (!worker?.alive || worker.cargoId || amount <= 0) return false;
    const destination = this.findDestination(factionId, roomId, sim);
    if (!destination) return false;
    const profile = this.routeProfile(factionId, roomId, destination.roomId, sim);
    if (profile.cut || profile.risk > MAX_ROUTE_RISK) return false;

    const cargo = {
      id: `cargo-${this.sequence++}`,
      resourceType,
      amount,
      factionId,
      originalFactionId: factionId,
      sourceRoomId: roomId,
      destinationSettlementId: destination.id,
      carrierId: worker.id,
      roomId,
      state: 'carried',
      droppedAt: null,
      raidedBy: null,
      route: profile.path,
      routeRisk: profile.risk,
      routeSafety: profile.safety,
      routeCut: profile.cut,
      escortId: null
    };
    this.cargo.push(cargo);
    worker.cargoId = cargo.id;
    worker.cargoDestinationRoomId = destination.roomId;
    worker.mood = `carrying-${resourceType}`;
    this.assignEscort(cargo, worker, sim);
    sim.emitEffect?.('cargo-pickup', { roomId, agentId: worker.id, duration: 0.9 });
    return true;
  }

  decide(agent, sim) {
    const escorted = agent.escortingCargoId
      ? this.cargo.find(item => item.id === agent.escortingCargoId && item.state === 'carried')
      : null;
    if (escorted && agent.alive && !agent.travel && !agent.combat && !agent.hidden) {
      const carrier = sim.agents.find(candidate => candidate.id === escorted.carrierId && candidate.alive && !candidate.departed && !candidate.hidden);
      if (!carrier) {
        this.releaseEscort(escorted, sim);
        return null;
      }
      if (carrier.roomId === agent.roomId) return { type: 'logistics-escort-hold', cargoId: escorted.id };
      const step = nextStep(this.graph, agent.roomId, carrier.travel?.toRoomId ?? carrier.roomId);
      return step && step !== agent.roomId
        ? { type: 'logistics-escort-move', roomId: step, cargoId: escorted.id, text: `${agent.name} moved to escort ${carrier.name}'s cargo.` }
        : null;
    }

    const cargo = this.cargo.find(item => item.carrierId === agent.id && item.state === 'carried');
    if (!cargo || !agent.alive || agent.travel || agent.combat || agent.hidden) return null;
    let destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
    if (!destination || !this.isOpenDestination(destination)) {
      if (!this.rerouteCargo(cargo, agent.roomId, sim)) {
        this.dropCargo(cargo, agent.roomId, sim, 'its supply route was cut');
        return null;
      }
      destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
    }
    if (agent.roomId === destination.roomId) return { type: 'logistics-deliver', cargoId: cargo.id };

    if (!Array.isArray(cargo.route) || !cargo.route.includes(agent.roomId) || cargo.route.at(-1) !== destination.roomId) {
      this.refreshCargoRoute(cargo, agent.roomId, sim);
    }
    if (cargo.routeCut && !this.rerouteCargo(cargo, agent.roomId, sim)) {
      this.dropCargo(cargo, agent.roomId, sim, 'its supply route was cut');
      return null;
    }
    const step = nextRouteStep(cargo.route, agent.roomId) ?? nextStep(this.graph, agent.roomId, destination.roomId);
    return step && step !== agent.roomId
      ? { type: 'logistics-move', roomId: step, cargoId: cargo.id, text: `${agent.name} carried ${cargo.resourceType} toward ${this.settlementSystem.label(destination)}.` }
      : null;
  }

  resolve(agent, action, sim) {
    if (action?.type === 'logistics-move' || action?.type === 'logistics-escort-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action?.type === 'logistics-escort-hold') {
      agent.mood = 'guarding-cargo';
      return true;
    }
    if (action?.type === 'logistics-deliver') {
      const cargo = this.cargo.find(item => item.id === action.cargoId);
      if (cargo) this.deliver(cargo, agent, sim);
      return true;
    }
    return false;
  }

  deliver(cargo, carrier, sim) {
    const destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
    if (!destination || carrier.roomId !== destination.roomId || !this.isOpenDestination(destination)) return false;
    this.applyResource(destination, cargo.resourceType, cargo.amount);
    this.territorySystem.factionSupply.set(cargo.factionId, (this.territorySystem.factionSupply.get(cargo.factionId) ?? 0) + cargo.amount);
    cargo.state = 'delivered';
    carrier.cargoId = null;
    carrier.cargoDestinationRoomId = null;
    carrier.escortId = null;
    carrier.mood = 'cargo-delivered';
    this.releaseEscort(cargo, sim);
    sim.emitEffect?.('cargo-delivery', { roomId: carrier.roomId, agentId: carrier.id, duration: 1.1 });
    this.onEvent(`${carrier.name} delivered ${cargo.amount.toFixed(1)} ${cargo.resourceType} to ${this.settlementSystem.label(destination)}.`);
    this.cargo = this.cargo.filter(item => item.id !== cargo.id);
    return true;
  }

  dropForAgent(agent, sim) {
    const cargo = this.cargo.find(item => item.carrierId === agent.id && item.state === 'carried');
    if (cargo) this.dropCargo(cargo, agent.roomId, sim, 'carrier lost');
  }

  dropCargo(cargo, roomId, sim, reason) {
    const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
    if (carrier) {
      carrier.cargoId = null;
      carrier.cargoDestinationRoomId = null;
      carrier.escortId = null;
    }
    this.releaseEscort(cargo, sim);
    cargo.carrierId = null;
    cargo.roomId = roomId;
    cargo.state = 'dropped';
    cargo.droppedAt = sim.time;
    cargo.route = [];
    cargo.routeCut = true;
    sim.emitEffect?.('cargo-drop', { roomId, duration: 1 });
    this.onEvent(`${cargo.resourceType} cargo was dropped in ${sim.roomName(roomId)} after ${reason}.`);
  }

  syncCarriers(sim) {
    for (const cargo of this.cargo) {
      if (cargo.state !== 'carried') continue;
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      if (!carrier?.alive || carrier.departed || carrier.hidden) {
        this.dropCargo(cargo, carrier?.roomId ?? cargo.roomId, sim, 'carrier loss');
        continue;
      }
      cargo.roomId = carrier.travel?.toRoomId ?? carrier.roomId;
    }
  }

  refreshRoutes(sim) {
    for (const cargo of this.cargo.filter(item => item.state === 'carried')) {
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      if (!carrier?.alive) continue;
      const destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
      if (!destination || !this.isOpenDestination(destination)) {
        this.rerouteCargo(cargo, carrier.roomId, sim);
        continue;
      }
      this.refreshCargoRoute(cargo, carrier.roomId, sim);
      if ((cargo.routeCut || cargo.routeRisk > MAX_ROUTE_RISK) && !this.rerouteCargo(cargo, carrier.roomId, sim)) {
        cargo.routeCut = true;
      }
      if (cargo.routeRisk >= ESCORT_RISK_THRESHOLD && !cargo.escortId) this.assignEscort(cargo, carrier, sim);
      if (cargo.routeRisk < ESCORT_RISK_THRESHOLD * 0.75 && cargo.escortId) this.releaseEscort(cargo, sim);
    }
  }

  refreshCargoRoute(cargo, fromRoomId, sim) {
    const destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
    if (!destination) {
      cargo.route = [];
      cargo.routeRisk = 1;
      cargo.routeSafety = 0;
      cargo.routeCut = true;
      return false;
    }
    const profile = this.routeProfile(cargo.factionId, fromRoomId, destination.roomId, sim);
    cargo.route = profile.path;
    cargo.routeRisk = profile.risk;
    cargo.routeSafety = profile.safety;
    cargo.routeCut = profile.cut;
    return !profile.cut;
  }

  rerouteCargo(cargo, fromRoomId, sim) {
    const destination = this.findDestination(cargo.factionId, fromRoomId, sim, cargo.destinationSettlementId);
    if (!destination) return false;
    cargo.destinationSettlementId = destination.id;
    const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
    if (carrier) carrier.cargoDestinationRoomId = destination.roomId;
    return this.refreshCargoRoute(cargo, fromRoomId, sim);
  }

  resolveAmbushes(sim) {
    for (const cargo of this.cargo.filter(item => item.state === 'carried')) {
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      if (!carrier?.alive || carrier.travel) continue;
      const ambush = this.props.find(prop =>
        prop.type === 'ambush_post' && prop.roomId === carrier.roomId && !prop.underConstruction &&
        prop.structureFaction && prop.structureFaction !== cargo.factionId
      );
      if (!ambush) continue;
      const hostile = sim.agents.find(agent =>
        agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === carrier.roomId &&
        this.agentFaction(agent) === ambush.structureFaction
      );
      if (!hostile) continue;
      const guarded = this.isEscortPresent(cargo, carrier.roomId, sim);
      const chance = guarded ? 0.08 : 0.46;
      if (Math.random() > chance) continue;
      cargo.raidedBy = ambush.structureFaction;
      this.dropCargo(cargo, carrier.roomId, sim, `${ambush.structureFaction}'s ambush`);
      hostile.mood = 'ambushing-cargo';
      sim.emitEffect?.('cargo-ambush', { roomId: carrier.roomId, agentId: hostile.id, duration: 1.2 });
    }
  }

  resolveRaids(sim) {
    for (const cargo of this.cargo.filter(item => item.state === 'carried')) {
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      if (!carrier?.alive || carrier.travel) continue;
      const raider = sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === carrier.roomId && this.agentFaction(agent) && this.agentFaction(agent) !== cargo.factionId);
      if (!raider) continue;
      const guarded = this.isEscortPresent(cargo, carrier.roomId, sim);
      const chance = guarded ? 0.05 : 0.22;
      if (Math.random() > chance) continue;
      const raiderFaction = this.agentFaction(raider);
      cargo.raidedBy = raiderFaction;
      this.dropCargo(cargo, carrier.roomId, sim, `${raider.name}'s raid`);
      raider.mood = 'raiding-cargo';
      sim.emitEffect?.('cargo-raid', { roomId: carrier.roomId, agentId: raider.id, duration: 1.15 });
    }
  }

  collectDroppedCargo(sim) {
    for (const cargo of [...this.cargo].filter(item => item.state === 'dropped')) {
      const collector = sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && !agent.combat && !agent.cargoId && agent.roomId === cargo.roomId && this.agentFaction(agent));
      if (!collector) continue;
      const faction = this.agentFaction(collector);
      const destination = this.findDestination(faction, cargo.roomId, sim);
      if (!destination) continue;
      const profile = this.routeProfile(faction, cargo.roomId, destination.roomId, sim);
      if (profile.cut || profile.risk > MAX_ROUTE_RISK) continue;
      cargo.factionId = faction;
      cargo.destinationSettlementId = destination.id;
      cargo.carrierId = collector.id;
      cargo.state = 'carried';
      cargo.raidedBy = faction !== cargo.originalFactionId ? faction : cargo.raidedBy;
      cargo.route = profile.path;
      cargo.routeRisk = profile.risk;
      cargo.routeSafety = profile.safety;
      cargo.routeCut = profile.cut;
      collector.cargoId = cargo.id;
      collector.cargoDestinationRoomId = destination.roomId;
      collector.mood = faction === cargo.originalFactionId ? 'recovering-cargo' : 'stealing-cargo';
      this.assignEscort(cargo, collector, sim);
      sim.emitEffect?.('cargo-pickup', { roomId: cargo.roomId, agentId: collector.id, duration: 0.9 });
    }
  }

  findDestination(factionId, fromRoomId, sim = null, excludedSettlementId = null) {
    const candidates = [...this.settlementSystem.settlements.values()]
      .filter(settlement => settlement.id !== excludedSettlementId && settlement.factionId === factionId && this.isOpenDestination(settlement));
    if (!sim) {
      return candidates.sort((a, b) => graphDistance(this.graph, fromRoomId, a.roomId) - graphDistance(this.graph, fromRoomId, b.roomId))[0] ?? null;
    }
    return candidates
      .map(settlement => ({ settlement, profile: this.routeProfile(factionId, fromRoomId, settlement.roomId, sim) }))
      .filter(candidate => !candidate.profile.cut && candidate.profile.risk <= MAX_ROUTE_RISK)
      .sort((a, b) => a.profile.risk - b.profile.risk || a.profile.path.length - b.profile.path.length)[0]?.settlement ?? null;
  }

  isOpenDestination(settlement) {
    return Boolean(settlement && ACTIVE_STATES.has(settlement.state) && settlement.supplyStatus !== 'blockaded');
  }

  routeProfile(factionId, fromRoomId, toRoomId, sim) {
    if (this.constructionSystem?.routeProfile) return this.constructionSystem.routeProfile(factionId, fromRoomId, toRoomId, sim);
    const path = shortestPath(this.graph, fromRoomId, toRoomId);
    const cut = path.length === 0;
    return { path, risk: cut ? 1 : 0, safety: cut ? 0 : 1, cut };
  }

  routeUsesRoomByEnemy(factionId, roomId) {
    return this.cargo.some(cargo =>
      cargo.state === 'carried' && cargo.factionId !== factionId && Array.isArray(cargo.route) && cargo.route.includes(roomId)
    );
  }

  assignEscort(cargo, carrier, sim) {
    if (!carrier || cargo.routeRisk < ESCORT_RISK_THRESHOLD || cargo.escortId) return null;
    const escort = sim.agents
      .filter(agent =>
        agent.id !== carrier.id && agent.alive && !agent.departed && !agent.hidden && !agent.cargoId && !agent.escortingCargoId &&
        !agent.hosted && !agent.attachedToId && ESCORT_ROLES.has(agent.role) && this.agentFaction(agent) === cargo.factionId
      )
      .sort((a, b) => graphDistance(this.graph, carrier.roomId, a.roomId) - graphDistance(this.graph, carrier.roomId, b.roomId))[0] ?? null;
    if (!escort) return null;
    cargo.escortId = escort.id;
    carrier.escortId = escort.id;
    escort.escortingCargoId = cargo.id;
    escort.mood = 'assigned-cargo-escort';
    return escort;
  }

  syncEscorts(sim) {
    for (const cargo of this.cargo.filter(item => item.state === 'carried' && item.escortId)) {
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      const escort = sim.agents.find(agent => agent.id === cargo.escortId);
      if (!carrier?.alive || !escort?.alive || escort.departed || escort.hidden || this.agentFaction(escort) !== cargo.factionId) {
        this.releaseEscort(cargo, sim);
        continue;
      }
      carrier.escortId = escort.id;
      escort.escortingCargoId = cargo.id;
    }
  }

  releaseEscort(cargo, sim) {
    const escort = cargo.escortId ? sim.agents.find(agent => agent.id === cargo.escortId) : null;
    if (escort?.escortingCargoId === cargo.id) {
      escort.escortingCargoId = null;
      if (escort.mood === 'assigned-cargo-escort' || escort.mood === 'guarding-cargo') escort.mood = 'idle';
    }
    const carrier = cargo.carrierId ? sim.agents.find(agent => agent.id === cargo.carrierId) : null;
    if (carrier?.escortId === cargo.escortId) carrier.escortId = null;
    cargo.escortId = null;
  }

  isEscortPresent(cargo, roomId, sim) {
    if (!cargo.escortId) return false;
    const escort = sim.agents.find(agent => agent.id === cargo.escortId);
    return Boolean(escort?.alive && !escort.departed && !escort.hidden && !escort.travel && escort.roomId === roomId);
  }

  agentFaction(agent) {
    return agent.faction === 'party' ? 'adventurer-expedition' : agent.ecologyFaction;
  }

  applyResource(settlement, type, amount) {
    if (['food', 'meat'].includes(type)) settlement.food += amount;
    else if (type === 'water') settlement.water = (settlement.water ?? 0) + amount;
    else if (['scrap', 'bones', 'biomass'].includes(type)) settlement.materials += amount;
    else if (type === 'deathEnergy') settlement.wealth += amount;
    else settlement.materials += amount;
  }

  snapshot() {
    return {
      cargo: this.cargo.map(item => ({ ...item, route: [...(item.route ?? [])] }))
    };
  }

  metrics() {
    return {
      cargoInTransit: this.cargo.filter(item => item.state === 'carried').length,
      cargoDropped: this.cargo.filter(item => item.state === 'dropped').length,
      cargoRaided: this.cargo.filter(item => item.raidedBy && item.raidedBy !== item.originalFactionId).length,
      guardedCargo: this.cargo.filter(item => item.state === 'carried' && item.escortId).length,
      highRiskRoutes: this.cargo.filter(item => item.state === 'carried' && (item.routeRisk ?? 0) >= ESCORT_RISK_THRESHOLD).length,
      cutSupplyRoutes: this.cargo.filter(item => item.state === 'carried' && item.routeCut).length
    };
  }
}

function nextRouteStep(route, roomId) {
  if (!Array.isArray(route)) return null;
  const index = route.indexOf(roomId);
  return index >= 0 ? route[index + 1] ?? null : null;
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
