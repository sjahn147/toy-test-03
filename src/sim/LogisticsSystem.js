import { graphDistance, nextStep } from './Pathfinding.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);

export class LogisticsSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.partySystem = partySystem;
    this.onEvent = onEvent;
    this.cargo = [];
    this.sequence = 0;
    this.tickClock = 0;
  }

  update(dt, sim) {
    this.tickClock -= dt;
    if (this.tickClock > 0) return;
    this.tickClock = 0.55;
    this.syncCarriers(sim);
    this.resolveRaids(sim);
    this.collectDroppedCargo(sim);
  }

  enqueueHarvest({ worker, resourceType, amount, roomId, factionId }, sim) {
    if (!worker?.alive || worker.cargoId || amount <= 0) return false;
    const destination = this.findDestination(factionId, roomId);
    if (!destination) return false;
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
      raidedBy: null
    };
    this.cargo.push(cargo);
    worker.cargoId = cargo.id;
    worker.cargoDestinationRoomId = destination.roomId;
    worker.mood = `carrying-${resourceType}`;
    sim.emitEffect?.('cargo-pickup', { roomId, agentId: worker.id, duration: 0.9 });
    return true;
  }

  decide(agent, sim) {
    const cargo = this.cargo.find(item => item.carrierId === agent.id && item.state === 'carried');
    if (!cargo || !agent.alive || agent.travel || agent.combat || agent.hidden) return null;
    const destination = this.settlementSystem.settlements.get(cargo.destinationSettlementId);
    if (!destination || !ACTIVE_STATES.has(destination.state)) {
      this.dropCargo(cargo, agent.roomId, sim, 'destination lost');
      return null;
    }
    if (agent.roomId === destination.roomId) return { type: 'logistics-deliver', cargoId: cargo.id };
    const step = nextStep(this.graph, agent.roomId, destination.roomId);
    return step && step !== agent.roomId
      ? { type: 'logistics-move', roomId: step, cargoId: cargo.id, text: `${agent.name} carried ${cargo.resourceType} toward ${this.settlementSystem.label(destination)}.` }
      : null;
  }

  resolve(agent, action, sim) {
    if (action?.type === 'logistics-move') {
      sim.beginTravel(agent, action.roomId);
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
    if (!destination || carrier.roomId !== destination.roomId) return false;
    this.applyResource(destination, cargo.resourceType, cargo.amount);
    this.territorySystem.factionSupply.set(cargo.factionId, (this.territorySystem.factionSupply.get(cargo.factionId) ?? 0) + cargo.amount);
    cargo.state = 'delivered';
    carrier.cargoId = null;
    carrier.cargoDestinationRoomId = null;
    carrier.mood = 'cargo-delivered';
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
    }
    cargo.carrierId = null;
    cargo.roomId = roomId;
    cargo.state = 'dropped';
    cargo.droppedAt = sim.time;
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

  resolveRaids(sim) {
    for (const cargo of this.cargo.filter(item => item.state === 'carried')) {
      const carrier = sim.agents.find(agent => agent.id === cargo.carrierId);
      if (!carrier?.alive || carrier.travel) continue;
      const raider = sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === carrier.roomId && this.agentFaction(agent) && this.agentFaction(agent) !== cargo.factionId);
      if (!raider || Math.random() > 0.22) continue;
      this.dropCargo(cargo, carrier.roomId, sim, `${raider.name}'s raid`);
      cargo.raidedBy = this.agentFaction(raider);
      raider.mood = 'raiding-cargo';
      sim.emitEffect?.('cargo-raid', { roomId: carrier.roomId, agentId: raider.id, duration: 1.15 });
    }
  }

  collectDroppedCargo(sim) {
    for (const cargo of [...this.cargo].filter(item => item.state === 'dropped')) {
      const collector = sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && !agent.combat && !agent.cargoId && agent.roomId === cargo.roomId && this.agentFaction(agent));
      if (!collector) continue;
      const faction = this.agentFaction(collector);
      const destination = this.findDestination(faction, cargo.roomId);
      if (!destination) continue;
      cargo.factionId = faction;
      cargo.destinationSettlementId = destination.id;
      cargo.carrierId = collector.id;
      cargo.state = 'carried';
      cargo.raidedBy = faction !== cargo.originalFactionId ? faction : cargo.raidedBy;
      collector.cargoId = cargo.id;
      collector.cargoDestinationRoomId = destination.roomId;
      collector.mood = faction === cargo.originalFactionId ? 'recovering-cargo' : 'stealing-cargo';
      sim.emitEffect?.('cargo-pickup', { roomId: cargo.roomId, agentId: collector.id, duration: 0.9 });
    }
  }

  findDestination(factionId, fromRoomId) {
    return [...this.settlementSystem.settlements.values()]
      .filter(settlement => settlement.factionId === factionId && ACTIVE_STATES.has(settlement.state))
      .sort((a, b) => graphDistance(this.graph, fromRoomId, a.roomId) - graphDistance(this.graph, fromRoomId, b.roomId))[0] ?? null;
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
    return { cargo: this.cargo.map(item => ({ ...item })) };
  }

  metrics() {
    return {
      cargoInTransit: this.cargo.filter(item => item.state === 'carried').length,
      cargoDropped: this.cargo.filter(item => item.state === 'dropped').length,
      cargoRaided: this.cargo.filter(item => item.raidedBy && item.raidedBy !== item.originalFactionId).length
    };
  }
}