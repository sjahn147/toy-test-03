import { DungeonSim as Phase7DungeonSim } from './DungeonSimPhase7.js';
import { SettlementSystem } from './SettlementSystem.js';
import { factionFor } from '../data/applyPhase6Ecology.js';

export class DungeonSim extends Phase7DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.settlementSystem = new SettlementSystem({
      rooms: this.rooms,
      props: this.props,
      graph: this.graph,
      territorySystem: this.territorySystem,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.settlementSystem.initialize(this.agents, this);
    if (this.entranceQueue) {
      this.entranceQueue.capacityProvider = (count, sim) => this.settlementSystem.canAdmitParty(count, sim);
    }
  }

  update(dt) {
    this.settlementSystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat && !agent.carryingHostId) {
      const settlementAction = this.settlementSystem.decide(agent, this);
      if (settlementAction) {
        if (settlementAction.text) this.event(settlementAction.text);
        if (this.settlementSystem.resolve(agent, settlementAction, this)) return;
      }
    }
    super.resolve(agent, action);
  }

  spawnEcologyMonster(species, roomId) {
    const settlement = this.settlementSystem.findSettlementForSpawn(species, roomId);
    if (!this.settlementSystem.canSpawn(species, roomId, settlement?.factionId)) {
      this.reportCapacityBlock(settlement, species);
      return null;
    }
    const spawned = super.spawnEcologyMonster(species, roomId);
    if (!spawned) return null;
    spawned.ecologyFaction ??= settlement?.factionId ?? factionFor(species);
    this.settlementSystem.registerSpawn(spawned, this);
    return spawned;
  }

  spawnAdvancedMonster(species, roomId) {
    const faction = factionFor(species);
    const settlement = this.settlementSystem.findSettlementForSpawn(species, roomId, faction);
    if (!this.settlementSystem.canSpawn(species, roomId, faction)) {
      this.reportCapacityBlock(settlement, species);
      return null;
    }
    const spawned = super.spawnAdvancedMonster(species, roomId);
    if (!spawned) return null;
    this.settlementSystem.registerSpawn(spawned, this);
    return spawned;
  }

  spawnMonster(forcedRole = null) {
    if (forcedRole) {
      const settlement = this.settlementSystem.findSettlementForSpawn(forcedRole, null, factionFor(forcedRole));
      if (settlement && !this.settlementSystem.canSpawn(forcedRole, settlement.roomId, settlement.factionId)) {
        this.reportCapacityBlock(settlement, forcedRole);
        return null;
      }
    }
    const before = this.agents.length;
    super.spawnMonster(forcedRole);
    const spawned = this.agents[before];
    if (!spawned) return null;
    spawned.ecologyFaction ??= factionFor(spawned.role);
    const home = this.settlementSystem.registerSpawn(spawned, this);
    if (!home || home.population > home.capacity) {
      this.occupancy.release(spawned.id);
      this.agents.splice(before, 1);
      return null;
    }
    return spawned;
  }

  reportCapacityBlock(settlement, species) {
    if (!settlement) return;
    const now = this.time;
    if ((settlement.lastCapacityWarningAt ?? -999) + 8 > now) return;
    settlement.lastCapacityWarningAt = now;
    this.event(`${this.settlementSystem.label(settlement)} could not produce another ${species}; its ${settlement.capacity} habitat slots were occupied or unsafe.`);
  }

  finalizeDeath(source, target) {
    super.finalizeDeath(source, target);
    this.settlementSystem.sync(this);
  }

  consumeByPredator(predator, prey) {
    const consumed = super.consumeByPredator(predator, prey);
    if (consumed) this.settlementSystem.sync(this);
    return consumed;
  }

  consumeHostedAdventurer(target, roomId) {
    const consumed = super.consumeHostedAdventurer(target, roomId);
    if (consumed) this.settlementSystem.sync(this);
    return consumed;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      settlement: this.settlementSystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.settlementSystem.metrics(this.agents)
    };
  }
}
