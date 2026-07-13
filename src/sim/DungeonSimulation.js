import { DungeonSim as LegacyDungeonSimulation } from './DungeonSimPhase8.js';
import { OperationsActivitySystem } from './OperationsActivitySystem.js';
import { EnvironmentTaskSystem } from './EnvironmentTaskSystem.js';
import { SettlementOperationsSystem } from './SettlementOperationsSystem.js';

export class DungeonSimulation extends LegacyDungeonSimulation {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.operationsActivitySystem = new OperationsActivitySystem({
      rooms: this.rooms,
      props: this.props,
      logisticsSystem: this.logisticsSystem,
      constructionSystem: this.constructionSystem,
      settlementSystem: this.settlementSystem,
      onEvent: text => this.event(text)
    });
    this.environmentTaskSystem = new EnvironmentTaskSystem({
      rooms: this.rooms,
      props: this.props,
      onEvent: (text, meta = {}) => this.event(text, meta)
    });
    this.settlementOperationsSystem = new SettlementOperationsSystem({
      rooms: this.rooms,
      props: this.props,
      onEvent: (text, meta = {}) => this.event(text, meta)
    });
  }

  update(dt) {
    this.settlementOperationsSystem.update(dt, this);
    this.environmentTaskSystem.update(dt, this);
    this.operationsActivitySystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const settlementAction = this.settlementOperationsSystem.decide(agent, this);
      if (settlementAction && this.settlementOperationsSystem.resolve(agent, settlementAction, this)) return;

      const environmentAction = this.environmentTaskSystem.decide(agent, this);
      if (environmentAction && this.environmentTaskSystem.resolve(agent, environmentAction, this)) return;

      const hold = this.operationsActivitySystem.decide(agent, this);
      if (hold && this.operationsActivitySystem.resolve(agent, hold, this)) return;

      const logisticsAction = this.logisticsSystem.decide(agent, this);
      if (logisticsAction?.type === 'logistics-deliver') {
        const cargo = this.logisticsSystem.cargo.find(item => item.id === logisticsAction.cargoId && item.state === 'carried');
        const destination = cargo ? this.settlementSystem.settlements.get(cargo.destinationSettlementId) : null;
        if (cargo && destination && this.operationsActivitySystem.beginUnload(agent, cargo, destination, this)) return;
      }

      const constructionAction = this.constructionSystem.decide(agent, this);
      if (constructionAction?.type === 'construction-work') {
        const job = this.constructionSystem.jobs.find(candidate => candidate.id === constructionAction.jobId && candidate.state === 'building');
        if (job && this.operationsActivitySystem.beginConstruction(agent, job, this)) return;
      }
    }
    super.resolve(agent, action);
  }

  finalizeDeath(source, target) {
    this.settlementOperationsSystem.clearAgent(target, 'agent-lost');
    this.environmentTaskSystem.clearAgent(target, 'agent-lost');
    this.operationsActivitySystem.clear(target, 'carrier-lost');
    super.finalizeDeath(source, target);
  }

  consumeByPredator(predator, prey) {
    this.settlementOperationsSystem.clearAgent(prey, 'agent-lost');
    this.environmentTaskSystem.clearAgent(prey, 'agent-lost');
    this.operationsActivitySystem.clear(prey, 'carrier-lost');
    return super.consumeByPredator(predator, prey);
  }

  consumeHostedAdventurer(target, roomId) {
    this.settlementOperationsSystem.clearAgent(target, 'agent-lost');
    this.environmentTaskSystem.clearAgent(target, 'agent-lost');
    this.operationsActivitySystem.clear(target, 'carrier-lost');
    return super.consumeHostedAdventurer(target, roomId);
  }

  returnParty() {
    for (const agent of this.agents) {
      this.settlementOperationsSystem.clearAgent(agent, 'party-returned');
      this.environmentTaskSystem.clearAgent(agent, 'party-returned');
      this.operationsActivitySystem.clear(agent, 'party-returned');
    }
    super.returnParty();
  }

  snapshot() {
    return {
      ...super.snapshot(),
      operations: this.operationsActivitySystem.snapshot(this.agents),
      environmentTasks: this.environmentTaskSystem.snapshot(),
      settlementOperations: this.settlementOperationsSystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.operationsActivitySystem.metrics(this.agents),
      ...this.environmentTaskSystem.metrics(),
      ...this.settlementOperationsSystem.metrics()
    };
  }
}

// Stable application-facing alias. New code should depend on DungeonSimulation,
// not on historical implementation-stage class names.
export { DungeonSimulation as DungeonSim };
