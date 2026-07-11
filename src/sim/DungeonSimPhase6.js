import { DungeonSim as Phase5DungeonSim } from './DungeonSimPhase5.js';
import { hydrateAgent } from './AgentAI.js';
import { AdvancedEcologySystem } from './AdvancedEcologySystem.js';
import { ADVANCED_LAIR_RADII, ADVANCED_PROFILES } from './advancedEcologyConfig.js';
import { factionFor } from '../data/applyPhase6Ecology.js';

const FACTION_WARRIORS = new Set([
  'goblin', 'skeleton', 'spider', 'ogre',
  'zombie', 'orc', 'carrion', 'kobold', 'wraith'
]);

export class DungeonSim extends Phase5DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.blockAdvancedEcologyFootprints();
    this.advancedEcology = new AdvancedEcologySystem({
      rooms: this.rooms,
      props: this.props,
      occupancy: this.occupancy,
      onEvent: text => this.event(text)
    });
    this.advancedEcology.initializeAgents(this.agents, this);
    for (const agent of this.agents) {
      if (!ADVANCED_PROFILES[agent.role] || !agent.alive) continue;
      agent.hp = agent.maxHp;
    }
    this.spawnClock = null;
  }

  blockAdvancedEcologyFootprints() {
    for (const prop of this.props) {
      const radius = ADVANCED_LAIR_RADII[prop.type];
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
    this.advanceAdvancedMaturity(dt);
    this.resetAdvancedReturnState();
    for (const agent of this.agents) {
      if ((agent.sporeSleep ?? 0) > 0) agent.combat = null;
    }
    this.advancedEcology.update(dt, this);
    super.update(dt);
  }

  advanceAdvancedMaturity(dt) {
    for (const agent of this.agents) {
      const profile = ADVANCED_PROFILES[agent.role];
      if (!profile || !agent.alive || agent.faction !== 'dungeon' || (agent.maturity ?? 1) >= 1) continue;
      const before = agent.maturity ?? 0;
      agent.maturity = Math.min(1, before + dt / Math.max(1, profile.maturity));
      if (before < 1 && agent.maturity >= 1) {
        agent.mood = 'advanced-mature';
        this.event(`${agent.name} reached ecological adulthood.`);
      }
    }
  }

  resetAdvancedReturnState() {
    for (const agent of this.agents) {
      if (agent.faction !== 'party' || !agent.alive || agent.mood !== 'resurrection-recovery') continue;
      agent.infected = false;
      agent.infectionType = null;
      agent.sporeSleep = 0;
      agent.stirgeCount = 0;
    }
  }

  isActive(agent) {
    return super.isActive(agent) && !agent.attachedToId && (agent.sporeSleep ?? 0) <= 0;
  }

  resolve(agent, action) {
    if (!this.isActive(agent) || agent.travel || agent.combat) return;
    const advancedAction = this.advancedEcology.decide(agent, this);
    if (advancedAction && this.advancedEcology.resolve(agent, advancedAction, this)) return;

    if (agent.faction === 'dungeon' && FACTION_WARRIORS.has(agent.role) && agent.ecologyFaction) {
      const rival = this.agents.find(candidate =>
        candidate.id !== agent.id && this.isActive(candidate) && !candidate.travel && candidate.faction === 'dungeon' &&
        candidate.roomId === agent.roomId && candidate.ecologyFaction && candidate.ecologyFaction !== agent.ecologyFaction
      );
      if (rival && this.combatSystem.startAttack(agent, rival, this)) {
        this.event(`${agent.name} challenged ${rival.name} over ${this.roomName(agent.roomId)}.`);
        return;
      }
    }

    super.resolve(agent, action);
  }

  beginTravel(agent, toRoomId) {
    if (agent.attachedToId || (agent.sporeSleep ?? 0) > 0) return;
    super.beginTravel(agent, toRoomId);
  }

  finalizeDeath(source, target) {
    if (!target || target.ecologyConsumed) return;
    this.advancedEcology.onAgentDeath(target, source, this);
    super.finalizeDeath(source, target);
  }

  spawnAdvancedMonster(species, roomId) {
    const profile = ADVANCED_PROFILES[species];
    if (!profile) return null;
    const index = this.agentSeq++;
    const baby = hydrateAgent({
      id: `advanced-${species}-${index}`,
      name: this.nextMonsterName(species),
      role: species,
      faction: 'dungeon',
      ecologyFaction: factionFor(species),
      roomId,
      homeRoomId: roomId,
      level: Math.max(1, Math.floor(this.generation / 3)),
      size: ['stirge', 'parasite'].includes(species) ? 'tiny' : 'small'
    }, index);

    baby.maturity = profile.maturity <= 1 ? 1 : 0.68;
    this.agents.push(baby);
    this.combatSystem.initializeAgent(baby);
    this.equipmentSystem.initializeAgent(baby);
    this.advancedEcology.initializeAgent(baby, this);
    baby.hp = baby.maxHp;
    const placement = this.occupancy.placeAgent(baby, roomId);
    if (!placement) {
      this.agents.pop();
      return null;
    }
    this.emitEffect('advanced-birth', { roomId, agentId: baby.id, duration: 1.2 });
    return baby;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      advancedEcology: this.advancedEcology.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.advancedEcology.metrics()
    };
  }
}
