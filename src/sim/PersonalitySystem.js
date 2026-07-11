import { graphDistance, nextStep } from './Pathfinding.js';

const TRAIT_NAMES = ['bravery', 'aggression', 'loyalty', 'greed', 'curiosity', 'patience'];
const ACTIVE_SETTLEMENT_STATES = new Set(['active', 'threatened', 'damaged']);

export class PersonalitySystem {
  constructor({ graph, rooms, partySystem, settlementSystem, logisticsSystem, onEvent = () => {} }) {
    this.graph = graph;
    this.rooms = rooms;
    this.partySystem = partySystem;
    this.settlementSystem = settlementSystem;
    this.logisticsSystem = logisticsSystem;
    this.onEvent = onEvent;
    this.memoryClock = 0;
    this.sequence = 0;
  }

  initialize(agents) {
    for (const agent of agents) this.initializeAgent(agent);
  }

  initializeAgent(agent) {
    if (!agent) return;
    const seed = hashString(`${agent.id}:${agent.role}:${agent.name}`);
    agent.personality ??= {};
    for (let index = 0; index < TRAIT_NAMES.length; index += 1) {
      const trait = TRAIT_NAMES[index];
      agent.personality[trait] ??= traitValue(seed, index, roleBias(agent.role, trait));
    }
    agent.memories ??= [];
    agent.relationships ??= {};
    agent.personalityState ??= 'steady';
    agent.lastObservedAttackerId ??= null;
    agent.lastObservedHomeState ??= null;
    agent.lastPersonalityActionAt ??= -999;
  }

  update(dt, sim) {
    this.initialize(sim.agents);
    this.memoryClock -= dt;
    if (this.memoryClock > 0) return;
    this.memoryClock = 1.1;

    for (const agent of sim.agents) {
      if (!agent.alive || agent.departed) continue;
      this.observeAgent(agent, sim);
      this.updateBonds(agent, sim);
      this.decayMemories(agent, sim.time);
    }
  }

  observeAgent(agent, sim) {
    if (agent.lastAttackerId && agent.lastAttackerId !== agent.lastObservedAttackerId) {
      const attacker = sim.agents.find(candidate => candidate.id === agent.lastAttackerId);
      this.remember(agent, 'attacked-by', {
        subjectId: attacker?.id ?? agent.lastAttackerId,
        roomId: agent.roomId,
        intensity: 0.72
      }, sim.time);
      if (attacker) this.adjustRelationship(agent, attacker.id, -0.32);
      agent.lastObservedAttackerId = agent.lastAttackerId;
    }

    const home = agent.homeSettlementId ? this.settlementSystem.settlements.get(agent.homeSettlementId) : null;
    if (home && home.state !== agent.lastObservedHomeState) {
      if (['threatened', 'damaged', 'collapsing', 'ruined'].includes(home.state)) {
        this.remember(agent, 'home-threatened', {
          subjectId: home.id,
          roomId: home.roomId,
          intensity: home.state === 'ruined' ? 1 : 0.68
        }, sim.time);
      }
      agent.lastObservedHomeState = home.state;
    }

    if (agent.cargoId) {
      const cargo = this.logisticsSystem?.cargo?.find(item => item.id === agent.cargoId);
      if (cargo?.routeRisk >= 0.55) agent.personalityState = 'guarded-carrier';
    } else if (agent.downed) agent.personalityState = 'helpless';
    else if ((agent.hp ?? 1) / Math.max(1, agent.maxHp ?? 1) < 0.4) agent.personalityState = 'afraid';
    else agent.personalityState = dominantState(agent.personality);
  }

  updateBonds(agent, sim) {
    if (agent.travel || agent.hidden) return;
    const companions = sim.agents.filter(candidate =>
      candidate.id !== agent.id && candidate.alive && !candidate.departed && !candidate.hidden && !candidate.travel &&
      candidate.roomId === agent.roomId && candidate.faction === agent.faction
    );
    for (const companion of companions) {
      const partyBonus = agent.partyId && agent.partyId === companion.partyId ? 0.018 : 0.006;
      this.adjustRelationship(agent, companion.id, partyBonus * (0.5 + agent.personality.loyalty));
    }
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.departed || agent.hidden || agent.travel || agent.combat || agent.downed || agent.hosted || agent.attachedToId) return null;
    this.initializeAgent(agent);
    const traits = agent.personality;
    const roomId = projectedRoom(agent);
    const hpRatio = (agent.hp ?? 1) / Math.max(1, agent.maxHp ?? 1);

    const immediateEnemy = this.enemyInRoom(agent, sim);
    if (immediateEnemy) return null;

    const threatenedAlly = this.threatenedAlly(agent, sim);
    if (threatenedAlly && traits.loyalty >= 0.58) {
      const distance = graphDistance(this.graph, roomId, projectedRoom(threatenedAlly));
      if (distance === 1 && this.actionReady(agent, sim, 3)) {
        return stepToward(agent, projectedRoom(threatenedAlly), this.graph, {
          interactionTargetId: threatenedAlly.id,
          interactionType: threatenedAlly.downed ? 'rescue' : 'join-ally',
          text: `${agent.name} abandoned a safer plan to reach ${threatenedAlly.name}.`
        });
      }
    }

    const home = agent.homeSettlementId ? this.settlementSystem.settlements.get(agent.homeSettlementId) : null;
    if (home && ACTIVE_SETTLEMENT_STATES.has(home.state) && ['threatened', 'damaged'].includes(home.state) && traits.loyalty >= 0.55) {
      const distance = graphDistance(this.graph, roomId, home.roomId);
      if (distance > 0 && this.actionReady(agent, sim, 3)) {
        return stepToward(agent, home.roomId, this.graph, {
          interactionType: 'defend-home',
          text: `${agent.name} turned toward home after remembering its damaged walls.`
        });
      }
    }

    const nearbyEnemy = this.nearestEnemy(agent, sim, 1);
    if (nearbyEnemy && traits.aggression >= 0.62 && hpRatio >= 0.48 && this.actionReady(agent, sim, 2)) {
      return stepToward(agent, projectedRoom(nearbyEnemy), this.graph, {
        interactionTargetId: nearbyEnemy.id,
        interactionType: 'attack',
        text: `${agent.name} pressed toward ${nearbyEnemy.name} instead of wandering.`
      });
    }

    const grudge = this.grudgeTarget(agent, sim);
    if (grudge && traits.aggression + traits.bravery >= 1.2 && hpRatio >= 0.55 && this.actionReady(agent, sim, 4)) {
      const distance = graphDistance(this.graph, roomId, projectedRoom(grudge));
      if (distance <= 3) {
        return stepToward(agent, projectedRoom(grudge), this.graph, {
          interactionTargetId: grudge.id,
          interactionType: 'revenge',
          text: `${agent.name} remembered who hurt them and chose a deliberate route.`
        });
      }
    }

    if (hpRatio < 0.38 && traits.bravery < 0.52 && home && roomId !== home.roomId && this.actionReady(agent, sim, 2)) {
      return stepToward(agent, home.roomId, this.graph, {
        interactionType: 'retreat',
        text: `${agent.name} chose survival over another empty circuit of the dungeon.`
      });
    }

    if (agent.faction === 'party' && traits.curiosity >= 0.68 && this.actionReady(agent, sim, 5)) {
      const unvisited = this.rooms
        .filter(room => !sim.visited.has(room.id))
        .map(room => ({ room, distance: graphDistance(this.graph, roomId, room.id) }))
        .filter(item => Number.isFinite(item.distance))
        .sort((a, b) => a.distance - b.distance || b.room.w * b.room.d - a.room.w * a.room.d)[0];
      if (unvisited && unvisited.distance > 0) {
        return stepToward(agent, unvisited.room.id, this.graph, {
          interactionType: 'explore',
          text: `${agent.name} selected an unseen room rather than pacing between familiar doors.`
        });
      }
    }

    if (traits.patience >= 0.7 && agent.blockedMoveRoomId && (agent.blockedMoveUntilTurn ?? -1) >= sim.turn) {
      agent.personalityState = 'waiting-deliberately';
      return { type: 'personality-idle', mood: 'waiting-deliberately' };
    }

    return null;
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('personality-')) return false;
    agent.lastPersonalityActionAt = sim.time;
    if (action.type === 'personality-move') {
      sim.beginTravel(agent, action.roomId, {
        interactionTargetId: action.interactionTargetId ?? null,
        interactionType: action.interactionType ?? null
      });
      return true;
    }
    if (action.type === 'personality-idle') {
      agent.mood = action.mood ?? 'thinking';
      return true;
    }
    return false;
  }

  actionReady(agent, sim, cooldown) {
    return sim.time - (agent.lastPersonalityActionAt ?? -999) >= cooldown;
  }

  enemyInRoom(agent, sim) {
    return sim.agents.find(candidate =>
      candidate.alive && !candidate.departed && !candidate.hidden && !candidate.travel && !candidate.downed &&
      candidate.roomId === agent.roomId && candidate.faction !== agent.faction
    ) ?? null;
  }

  nearestEnemy(agent, sim, maxDistance = Infinity) {
    return sim.agents
      .filter(candidate => candidate.alive && !candidate.departed && !candidate.hidden && candidate.faction !== agent.faction)
      .map(candidate => ({ candidate, distance: graphDistance(this.graph, projectedRoom(agent), projectedRoom(candidate)) }))
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance || a.candidate.index - b.candidate.index)[0]?.candidate ?? null;
  }

  threatenedAlly(agent, sim) {
    return sim.agents
      .filter(candidate => candidate.id !== agent.id && candidate.alive && !candidate.departed && candidate.faction === agent.faction)
      .filter(candidate => candidate.downed || candidate.hosted || (candidate.hp ?? 1) / Math.max(1, candidate.maxHp ?? 1) < 0.32)
      .map(candidate => ({ candidate, distance: graphDistance(this.graph, projectedRoom(agent), projectedRoom(candidate)) }))
      .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? null;
  }

  grudgeTarget(agent, sim) {
    return Object.entries(agent.relationships ?? {})
      .filter(([, value]) => value <= -0.25)
      .map(([id, value]) => ({ agent: sim.agents.find(candidate => candidate.id === id), value }))
      .filter(item => item.agent?.alive && !item.agent.departed)
      .sort((a, b) => a.value - b.value)[0]?.agent ?? null;
  }

  remember(agent, type, data, time) {
    const existing = agent.memories.find(memory => memory.type === type && memory.subjectId === data.subjectId);
    if (existing) {
      existing.time = time;
      existing.intensity = Math.min(1, Math.max(existing.intensity, data.intensity ?? 0.5) + 0.08);
      existing.roomId = data.roomId ?? existing.roomId;
      return existing;
    }
    const memory = {
      id: `memory-${this.sequence++}`,
      type,
      time,
      intensity: data.intensity ?? 0.5,
      subjectId: data.subjectId ?? null,
      roomId: data.roomId ?? null
    };
    agent.memories.unshift(memory);
    agent.memories = agent.memories.slice(0, 8);
    return memory;
  }

  adjustRelationship(agent, otherId, delta) {
    agent.relationships ??= {};
    agent.relationships[otherId] = clamp((agent.relationships[otherId] ?? 0) + delta, -1, 1);
  }

  decayMemories(agent, time) {
    for (const memory of agent.memories) {
      const age = Math.max(0, time - memory.time);
      memory.currentIntensity = clamp(memory.intensity * Math.exp(-age / 220), 0, 1);
    }
    agent.memories = agent.memories.filter(memory => memory.currentIntensity > 0.08).slice(0, 8);
  }

  snapshot(agents) {
    return {
      agents: agents.filter(agent => agent.alive).map(agent => ({
        id: agent.id,
        personality: { ...agent.personality },
        personalityState: agent.personalityState,
        memories: (agent.memories ?? []).map(memory => ({ ...memory })),
        relationships: { ...(agent.relationships ?? {}) }
      }))
    };
  }

  metrics(agents) {
    const living = agents.filter(agent => agent.alive && !agent.departed);
    const memoryCount = living.reduce((sum, agent) => sum + (agent.memories?.length ?? 0), 0);
    const strongBonds = living.reduce((sum, agent) => sum + Object.values(agent.relationships ?? {}).filter(value => value >= 0.45).length, 0);
    const grudges = living.reduce((sum, agent) => sum + Object.values(agent.relationships ?? {}).filter(value => value <= -0.35).length, 0);
    return {
      personalityAgents: living.length,
      activeMemories: memoryCount,
      strongBonds,
      activeGrudges: grudges,
      deliberateWaiting: living.filter(agent => agent.personalityState === 'waiting-deliberately').length
    };
  }
}

function stepToward(agent, targetRoomId, graph, metadata = {}) {
  const step = nextStep(graph, projectedRoom(agent), targetRoomId);
  if (!step || step === projectedRoom(agent)) return null;
  return {
    type: 'personality-move',
    roomId: step,
    interactionTargetId: metadata.interactionTargetId ?? null,
    interactionType: metadata.interactionType ?? null,
    text: metadata.text ?? null
  };
}

function projectedRoom(agent) {
  return agent.travel?.toRoomId ?? agent.roomId;
}

function roleBias(role, trait) {
  const table = {
    fighter: { bravery: 0.16, loyalty: 0.1 },
    rogue: { greed: 0.15, curiosity: 0.1, patience: -0.06 },
    cleric: { loyalty: 0.2, aggression: -0.12 },
    wizard: { curiosity: 0.2, bravery: -0.1 },
    archer: { patience: 0.14 },
    goblin: { greed: 0.15, bravery: -0.12 },
    skeleton: { patience: 0.18, greed: -0.18 },
    spider: { patience: 0.2, loyalty: -0.08 },
    slime: { aggression: -0.12, patience: 0.1 },
    ogre: { aggression: 0.22, patience: -0.18 },
    orc: { aggression: 0.16, loyalty: 0.1 },
    kobold: { patience: 0.14, curiosity: 0.12 },
    wraith: { aggression: 0.1, loyalty: -0.12 }
  };
  return table[role]?.[trait] ?? 0;
}

function traitValue(seed, index, bias) {
  const mixed = hashString(`${seed}:${index}`);
  return clamp(0.24 + (mixed % 580) / 1000 + bias, 0.05, 0.95);
}

function dominantState(traits) {
  const entries = Object.entries(traits).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'steady';
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
