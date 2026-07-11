import { DungeonSim as Phase4DungeonSim } from './DungeonSimPhase4.js';
import { hydrateAgent } from './AgentAI.js';
import { EcosystemSystem } from './EcosystemSystem.js';

const ECOLOGY_RADII = {
  goblin_lair: 1.15,
  ossuary_lair: 1.05,
  spider_lair: 1.15,
  slime_pool: 1.05,
  rat_warren: 1.0,
  ogre_lair: 1.25
};

const MATURITY_SECONDS = {
  rat: 24,
  slime: 30,
  goblin: 40,
  spider: 46,
  ogre: 90,
  skeleton: 1
};

export class DungeonSim extends Phase4DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.blockEcologyFootprints();
    this.ecosystem = new EcosystemSystem({
      rooms: this.rooms,
      props: this.props,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.ecosystem.initializeAgents(this.agents);
    for (const agent of this.agents) this.normalizeEcologyStats(agent);
    this.spawnClock = null;
  }

  normalizeEcologyStats(agent) {
    if (agent.role !== 'rat' || agent.ecologyStatsApplied) return;
    agent.baseAttack = 2;
    agent.attack = 2;
    agent.baseMaxHp = 5;
    agent.maxHp = 5;
    agent.hp = Math.min(agent.hp, 5);
    agent.courage = 2;
    agent.ecologyStatsApplied = true;
  }

  blockEcologyFootprints() {
    for (const prop of this.props) {
      const radius = ECOLOGY_RADII[prop.type];
      if (!radius) continue;
      const room = this.rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      this.occupancy.blockArea(
        room.id,
        room.x + (placement.ox ?? 0),
        room.z + (placement.oz ?? 0),
        radius * (placement.scale ?? 1),
        prop.id
      );
    }

    for (const agent of this.agents) {
      if (!agent.alive || agent.departed || agent.hidden || agent.travel || !agent.roomCell) continue;
      const blocked = agent.roomCell.footprint?.some(cellId => this.occupancy.blockedCells.has(cellId));
      if (!blocked) continue;
      this.occupancy.release(agent.id);
      this.occupancy.placeAgent(agent, agent.roomId);
    }
  }

  update(dt) {
    this.resetReturnedEcologyState();
    this.advanceMaturity(dt);
    this.ecosystem.update(dt, this);
    super.update(dt);
  }

  resetReturnedEcologyState() {
    for (const agent of this.agents) {
      if (agent.faction !== 'party' || !agent.alive || agent.mood !== 'returned') continue;
      agent.ecologyConsumed = false;
      agent.corpseCreated = false;
      agent.hosted = false;
      agent.carryingHostId = null;
      agent.mood = 'resurrection-recovery';
    }
  }

  advanceMaturity(dt) {
    for (const agent of this.agents) {
      const duration = MATURITY_SECONDS[agent.role];
      if (!duration || !agent.alive || agent.faction !== 'dungeon' || (agent.maturity ?? 1) >= 1) continue;
      const before = agent.maturity ?? 0;
      agent.maturity = Math.min(1, before + dt / duration);
      if (before < 1 && agent.maturity >= 1) {
        agent.mood = 'mature';
        this.event(`${agent.name} reached ecological adulthood.`);
      }
    }
  }

  isActive(agent) {
    return super.isActive(agent) && !agent.hosted;
  }

  resolve(agent, action) {
    if (!this.isActive(agent) || agent.travel || agent.combat) return;
    const ecologyAction = this.ecosystem.decide(agent, this);
    if (ecologyAction) {
      if (ecologyAction.text) this.event(ecologyAction.text);
      if (this.ecosystem.resolve(agent, ecologyAction, this)) return;
      super.resolve(agent, ecologyAction);
      return;
    }
    super.resolve(agent, action);
  }

  ecosystemTick() {
    if (this.returnClock !== null) {
      this.returnClock -= 1;
      if (this.returnClock <= 0) this.returnParty();
    }

    const activeParty = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party');
    if (activeParty.length === 0) this.scheduleReturn();
    if (this.turn > 0 && this.turn % 10 === 0) this.rearmDungeon();
  }

  finalizeDeath(source, target) {
    if (!target || target.ecologyConsumed) return;
    const roomId = target.roomId;
    const position = target.roomCell ? { x: target.roomCell.x, z: target.roomCell.z } : null;
    this.ecosystem.onAgentDeath(target, this);
    super.finalizeDeath(source, target);
    this.ecosystem.createCorpse(target, roomId, position);
  }

  consumeByPredator(predator, prey) {
    if (!prey?.alive) return false;
    this.ecosystem.onAgentDeath(prey, this);
    prey.ecologyConsumed = true;
    prey.corpseCreated = true;
    prey.alive = false;
    prey.downed = false;
    prey.hosted = false;
    prey.hidden = false;
    prey.hp = 0;
    prey.combat = null;
    prey.travel = null;
    this.occupancy.release(prey.id);
    this.occupancy.cancelReservation(prey.id);
    prey.roomCell = null;

    if (prey.faction === 'party') {
      prey.resurrectable = true;
      prey.corpseRoomId = predator.roomId;
      prey.mood = 'consumed';
    }

    predator.kills = (predator.kills ?? 0) + 1;
    this.emitEffect('death', { roomId: predator.roomId, agentId: prey.id, duration: 0.9 });
    this.event(`${prey.name} was consumed by ${predator.name} and left no usable remains.`, {
      type: 'consumed', sourceId: predator.id, targetId: prey.id
    });
    return true;
  }

  consumeHostedAdventurer(target, roomId) {
    if (!target?.alive) return false;
    target.ecologyConsumed = true;
    target.corpseCreated = true;
    target.alive = false;
    target.downed = false;
    target.hosted = false;
    target.hidden = false;
    target.hp = 0;
    target.combat = null;
    target.travel = null;
    target.roomId = roomId;
    target.roomCell = null;
    target.resurrectable = true;
    target.corpseRoomId = roomId;
    target.mood = 'host-consumed';
    this.emitEffect('death', { roomId, agentId: target.id, duration: 1.1 });
    this.event(`${target.name} was consumed inside a brood cocoon; the goddess may still reconstruct the administrative details.`, {
      type: 'host-consumed', targetId: target.id
    });
    return true;
  }

  spawnEcologyMonster(species, roomId) {
    const index = this.agentSeq++;
    const baby = hydrateAgent({
      id: `ecology-${species}-${index}`,
      name: this.nextMonsterName(species),
      role: species,
      faction: 'dungeon',
      roomId,
      homeRoomId: roomId,
      level: Math.max(1, Math.floor(this.generation / 3)),
      size: species === 'rat' ? 'tiny' : species === 'ogre' ? 'large' : 'small'
    }, index);

    this.normalizeEcologyStats(baby);
    this.agents.push(baby);
    this.combatSystem.initializeAgent(baby);
    this.equipmentSystem.initializeAgent(baby);
    this.ecosystem.initializeAgent(baby);
    const placement = this.occupancy.placeAgent(baby, roomId);
    if (!placement) {
      this.agents.pop();
      return null;
    }
    baby.maturity = species === 'skeleton' ? 1 : 0.72;
    baby.hunger = species === 'ogre' ? 42 : 12;
    this.emitEffect('birth', { roomId, agentId: baby.id, duration: 1.25 });
    return baby;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      ecology: this.ecosystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.ecosystem.metrics(this.agents)
    };
  }
}
