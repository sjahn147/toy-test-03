import { SettlementSystem } from './SettlementSystem.js';

const PATCH_FLAG = Symbol.for('toy-test-03.settlement-terminal-collapse');

export function installSettlementCollapseGuard() {
  const prototype = SettlementSystem.prototype;
  if (prototype[PATCH_FLAG]) return;

  const updateSettlementStates = prototype.updateSettlementStates;
  prototype.updateSettlementStates = function guardedSettlementStateUpdate(dt, sim) {
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
    return updateSettlementStates.call(this, dt, sim);
  };
  prototype[PATCH_FLAG] = true;
}

installSettlementCollapseGuard();
