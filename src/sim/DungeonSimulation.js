import { DungeonSim as LegacyDungeonSimulation } from './DungeonSimPhase8.js';
import { OperationsActivitySystem } from './OperationsActivitySystem.js';
import { EnvironmentTaskSystem } from './EnvironmentTaskSystem.js';
import { SettlementOperationsSystem } from './SettlementOperationsSystem.js';
import { ZoneInteractionSystem } from './ZoneInteractionSystem.js';
import { SpawnNetworkSystem } from './SpawnNetworkSystem.js';
import { EliteEcologySystem } from './EliteEcologySystem.js';
import { EliteAbilitySystem } from './EliteAbilitySystem.js';
import { EliteBehaviorSystem } from './EliteBehaviorSystem.js';
import { HeroSystem } from './heroes/HeroSystem.js';
import { HeroSkillSystem } from './heroes/HeroSkillSystem.js';
import { HeroLeadershipSystem } from './heroes/HeroLeadershipSystem.js';

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
    this.zoneInteractionSystem = new ZoneInteractionSystem({
      rooms: this.rooms,
      props: this.props,
      onEvent: (text, meta = {}) => this.event(text, meta)
    });
    this.spawnNetworkSystem = new SpawnNetworkSystem({
      scenario: this.scenario,
      onEvent: (text, meta = {}) => this.event(text, meta)
    });
    this.eliteEcologySystem = new EliteEcologySystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.eliteAbilitySystem = new EliteAbilitySystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.eliteBehaviorSystem = new EliteBehaviorSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.spawnNetworkSystem.initialize(this);
    this.eliteEcologySystem.initialize(this);
    this.eliteAbilitySystem.initialize(this);
    this.heroSystem = new HeroSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSkillSystem = new HeroSkillSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroLeadershipSystem = new HeroLeadershipSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSystem.initialize(this);
    this.heroSkillSystem.initialize(this);
  }

  update(dt) {
    this.heroSystem.update(dt, this);
    this.heroSkillSystem.update(dt, this);
    this.heroLeadershipSystem.update(dt, this);
    this.eliteEcologySystem.update(dt, this);
    this.eliteAbilitySystem.update(dt, this);
    this.eliteBehaviorSystem.update(dt, this);
    this.spawnNetworkSystem.update(dt, this);
    this.zoneInteractionSystem.update(dt, this);
    this.settlementOperationsSystem.update(dt, this);
    this.environmentTaskSystem.update(dt, this);
    this.operationsActivitySystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const heroAction = this.heroSkillSystem.decide(agent, this);
      if (heroAction && this.heroSkillSystem.resolve(agent, heroAction, this)) return;
      const eliteAbility = this.eliteAbilitySystem.decide(agent, this);
      if (eliteAbility && this.eliteAbilitySystem.resolve(agent, eliteAbility, this)) return;
      const eliteBehavior = this.eliteBehaviorSystem.decide(agent, this);
      if (eliteBehavior && this.eliteBehaviorSystem.resolve(agent, eliteBehavior, this)) return;

      const zoneAction = this.zoneInteractionSystem.decide(agent, this);
      if (zoneAction && this.zoneInteractionSystem.resolve(agent, zoneAction, this)) return;

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

  beginTravel(agent, toRoomId) {
    if (this.heroSkillSystem?.isMovementBlocked(agent)) {
      this.event(`${agent.name} cannot move while deployed as a hero bastion.`, { type: 'hero-movement-blocked', agentId: agent.id, roomId: agent.roomId });
      return false;
    }
    if (this.heroSkillSystem?.isRouteBlocked(agent.roomId, toRoomId, agent)) {
      this.event(`${agent.name} was stopped by a hero-controlled route.`, { type: 'hero-route-blocked', agentId: agent.id, fromRoomId: agent.roomId, toRoomId });
      return false;
    }
    return super.beginTravel(agent, toRoomId);
  }

  finalizeDeath(source, target) {
    if (target?.eliteStatuses?.deathless?.remaining > 0) {
      target.hp = 1;
      target.downed = false;
      target.bleedout = 0;
      delete target.eliteStatuses.deathless;
      this.event(`${target.name} remains standing under a deathless ward.`, { type: 'elite-death-prevented', agentId: target.id });
      return;
    }
    this.heroSystem.onAgentDeath(target, this);
    this.eliteEcologySystem.onAgentDeath(target, this);
    this.zoneInteractionSystem.clearAgent(target, 'agent-lost');
    this.settlementOperationsSystem.clearAgent(target, 'agent-lost');
    this.environmentTaskSystem.clearAgent(target, 'agent-lost');
    this.operationsActivitySystem.clear(target, 'carrier-lost');
    super.finalizeDeath(source, target);
  }

  consumeByPredator(predator, prey) {
    this.zoneInteractionSystem.clearAgent(prey, 'agent-lost');
    this.settlementOperationsSystem.clearAgent(prey, 'agent-lost');
    this.environmentTaskSystem.clearAgent(prey, 'agent-lost');
    this.operationsActivitySystem.clear(prey, 'carrier-lost');
    return super.consumeByPredator(predator, prey);
  }

  consumeHostedAdventurer(target, roomId) {
    this.zoneInteractionSystem.clearAgent(target, 'agent-lost');
    this.settlementOperationsSystem.clearAgent(target, 'agent-lost');
    this.environmentTaskSystem.clearAgent(target, 'agent-lost');
    this.operationsActivitySystem.clear(target, 'carrier-lost');
    return super.consumeHostedAdventurer(target, roomId);
  }

  returnParty() {
    for (const agent of this.agents) {
      this.zoneInteractionSystem.clearAgent(agent, 'party-returned');
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
      settlementOperations: this.settlementOperationsSystem.snapshot(),
      zoneInteractions: this.zoneInteractionSystem.snapshot(),
      spawnNetwork: this.spawnNetworkSystem.snapshot(),
      eliteEcology: this.eliteEcologySystem.snapshot(),
      eliteAbilities: this.eliteAbilitySystem.snapshot(),
      eliteBehavior: this.eliteBehaviorSystem.snapshot(),
      heroes: this.heroSystem.snapshot(),
      heroSkills: this.heroSkillSystem.snapshot(),
      heroLeadership: this.heroLeadershipSystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.operationsActivitySystem.metrics(this.agents),
      ...this.environmentTaskSystem.metrics(),
      ...this.settlementOperationsSystem.metrics(),
      ...this.zoneInteractionSystem.metrics(),
      ...this.spawnNetworkSystem.metrics(),
      ...this.eliteEcologySystem.metrics(),
      ...this.eliteAbilitySystem.metrics(),
      ...this.eliteBehaviorSystem.metrics(),
      ...this.heroSystem.metrics(),
      ...this.heroSkillSystem.metrics(),
      ...this.heroLeadershipSystem.metrics()
    };
  }
}

// Stable application-facing alias. New code should depend on DungeonSimulation,
// not on historical implementation-stage class names.
export { DungeonSimulation as DungeonSim };
