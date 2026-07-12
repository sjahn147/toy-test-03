import { SettlementSystem } from './SettlementSystem.js';

export class SettlementSystemPhase8 extends SettlementSystem {
  updateSettlementStates(dt, sim) {
    for (const settlement of this.settlements.values()) {
      if (settlement.indestructible || settlement.structuralIntegrity > 0) continue;
      settlement.structuralIntegrity = 0;
      this.setState(settlement, 'ruined', sim);
      this.displaceSettlement(settlement, sim);
      settlement.residentIds = [];
      settlement.presentIds = [];
      settlement.population = 0;
      settlement.presentPopulation = 0;
      settlement.overcrowded = 0;
    }
    super.updateSettlementStates(dt, sim);
  }
}
