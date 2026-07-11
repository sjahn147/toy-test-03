import { DungeonSim as Phase7DungeonSim } from './DungeonSimPhase7.js';
import { SettlementSystem } from './SettlementSystem.js';
import { ExpeditionSystem } from './ExpeditionSystem.js';
import { LogisticsSystem } from './LogisticsSystem.js';
import { factionFor } from '../data/applyPhase6Ecology.js';

const ADVENTURER_FACTION = 'adventurer-expedition';

export class DungeonSim extends Phase7DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    for (const agent of this.agents) {
      if (agent.faction === 'party') agent.ecologyFaction = ADVENTURER_FACTION;
    }
    this.settlementSystem = new SettlementSystem({
      rooms: this.rooms,
      props: this.props,
      graph: this.graph,
      territorySystem: this.territorySystem,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.settlementSystem.initialize(this.agents, this);
    this.expeditionSystem = new ExpeditionSystem({
      rooms: this.rooms,
      props: this.props,
      graph: this.graph,
      partySystem: this.partySystem,
      settlementSystem: this.settlementSystem,
      territorySystem: this.territorySystem,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.logisticsSystem = new LogisticsSystem({
      rooms: this.rooms,
      props: this.props,
      graph: this.graph,
      settlementSystem: this.settlementSystem,
      territorySystem: this.territorySystem,
      partySystem: this.partySystem,
      onEvent: text => this.event(text)
    });
    this.territorySystem.harvestResources = sim => this.harvestPhysicalResources(sim);
    if (this.entranceQueue) this.entranceQueue.capacityProvider = (count, sim) => this.settlementSystem.canAdmitParty(count, sim);
  }

  update(dt) {
    this.settlementSystem.update(dt, this);
    this.expeditionSystem.update(dt, this);
    this.logisticsSystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const logisticsAction = this.logisticsSystem.decide(agent, this);
      if (logisticsAction) {
        if (logisticsAction.text) this.event(logisticsAction.text);
        if (this.logisticsSystem.resolve(agent, logisticsAction, this)) return;
      }
    }
    if (agent?.faction === 'party' && this.isActive(agent) && !agent.travel && !agent.combat) {
      const expeditionAction = this.expeditionSystem.decide(agent, this);
      if (expeditionAction) {
        if (expeditionAction.text) this.event(expeditionAction.text);
        if (this.expeditionSystem.resolve(agent, expeditionAction, this)) return;
      }
    }
    if (this.isActive(agent) && !agent.travel && !agent.combat && !agent.carryingHostId) {
      const settlementAction = this.settlementSystem.decide(agent, this);
      if (settlementAction) {
        if (settlementAction.text) this.event(settlementAction.text);
        if (this.settlementSystem.resolve(agent, settlementAction, this)) return;
      }
    }
    super.resolve(agent, action);
  }

  harvestPhysicalResources(sim) {
    for (const prop of this.props) {
      if (prop.type !== 'territory_resource' || (prop.stock ?? 0) < 1) continue;
      const state = this.territorySystem.roomStates.get(prop.roomId);
      if (!state?.owner || state.contested || state.control < 45) continue;
      const worker = this.agents.find(agent => agent.alive && !agent.departed && !agent.travel && !agent.hidden && !agent.cargoId && agent.roomId === prop.roomId && agent.ecologyFaction === state.owner);
      if (!worker) continue;
      const amount = ['deathEnergy', 'biomass'].includes(prop.resourceType) ? 1.4 : ['scrap', 'bones'].includes(prop.resourceType) ? 1.2 : 1;
      if (this.logisticsSystem.enqueueHarvest({ worker, resourceType: prop.resourceType, amount, roomId: prop.roomId, factionId: state.owner }, sim)) prop.stock -= 1;
    }
  }

  spawnEcologyMonster(species, roomId) {
    const settlement = this.settlementSystem.findSettlementForSpawn(species, roomId);
    if (!this.settlementSystem.canSpawn(species, roomId, settlement?.factionId)) { this.reportCapacityBlock(settlement, species); return null; }
    const spawned = super.spawnEcologyMonster(species, roomId);
    if (!spawned) return null;
    spawned.ecologyFaction ??= settlement?.factionId ?? factionFor(species);
    this.settlementSystem.registerSpawn(spawned, this);
    return spawned;
  }

  spawnAdvancedMonster(species, roomId) {
    const faction = factionFor(species);
    const settlement = this.settlementSystem.findSettlementForSpawn(species, roomId, faction);
    if (!this.settlementSystem.canSpawn(species, roomId, faction)) { this.reportCapacityBlock(settlement, species); return null; }
    const spawned = super.spawnAdvancedMonster(species, roomId);
    if (!spawned) return null;
    this.settlementSystem.registerSpawn(spawned, this);
    return spawned;
  }

  spawnMonster(forcedRole = null) {
    if (forcedRole) {
      const settlement = this.settlementSystem.findSettlementForSpawn(forcedRole, null, factionFor(forcedRole));
      if (settlement && !this.settlementSystem.canSpawn(forcedRole, settlement.roomId, settlement.factionId)) { this.reportCapacityBlock(settlement, forcedRole); return null; }
    }
    const before = this.agents.length;
    super.spawnMonster(forcedRole);
    const spawned = this.agents[before];
    if (!spawned) return null;
    spawned.ecologyFaction ??= factionFor(spawned.role);
    const home = this.settlementSystem.registerSpawn(spawned, this);
    if (!home || home.population > home.capacity) { this.occupancy.release(spawned.id); this.agents.splice(before, 1); return null; }
    return spawned;
  }

  reportCapacityBlock(settlement, species) {
    if (!settlement || (settlement.lastCapacityWarningAt ?? -999) + 8 > this.time) return;
    settlement.lastCapacityWarningAt = this.time;
    this.event(`${this.settlementSystem.label(settlement)} could not produce another ${species}; its ${settlement.capacity} habitat slots were occupied or unsafe.`);
  }

  finalizeDeath(source, target) {
    this.logisticsSystem.dropForAgent(target, this);
    super.finalizeDeath(source, target);
    this.settlementSystem.sync(this);
  }

  consumeByPredator(predator, prey) {
    this.logisticsSystem.dropForAgent(prey, this);
    const consumed = super.consumeByPredator(predator, prey);
    if (consumed) this.settlementSystem.sync(this);
    return consumed;
  }

  consumeHostedAdventurer(target, roomId) {
    this.logisticsSystem.dropForAgent(target, this);
    const consumed = super.consumeHostedAdventurer(target, roomId);
    if (consumed) this.settlementSystem.sync(this);
    return consumed;
  }

  returnParty() {
    super.returnParty();
    for (const agent of this.agents) if (agent.faction === 'party') agent.ecologyFaction = ADVENTURER_FACTION;
    this.expeditionSystem.initializeParties();
    this.settlementSystem.sync(this);
  }

  snapshot() {
    return { ...super.snapshot(), settlement: this.settlementSystem.snapshot(), expedition: this.expeditionSystem.snapshot(), logistics: this.logisticsSystem.snapshot() };
  }

  metrics() {
    return { ...super.metrics(), ...this.settlementSystem.metrics(this.agents), ...this.expeditionSystem.metrics(), ...this.logisticsSystem.metrics() };
  }
}