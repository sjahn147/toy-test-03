import { nearestRoom, nextStep } from './Pathfinding.js';

const SPECIES = {
  rat: { hungerRate: 2.4, hungryAt: 42, starvingAt: 82, capacity: 8, spawnDuration: 7 },
  goblin: { hungerRate: 1.15, hungryAt: 48, starvingAt: 88, capacity: 5, spawnDuration: 10 },
  spider: { hungerRate: 1.0, hungryAt: 44, starvingAt: 86, capacity: 5, spawnDuration: 12 },
  slime: { hungerRate: 0.72, hungryAt: 38, starvingAt: 92, capacity: 5, spawnDuration: 8 },
  ogre: { hungerRate: 1.5, hungryAt: 36, starvingAt: 78, capacity: 2, spawnDuration: 18 },
  skeleton: { hungerRate: 0, hungryAt: 101, starvingAt: 101, capacity: 6, spawnDuration: 11 }
};

const PREY = {
  goblin: ['rat'],
  spider: ['rat'],
  ogre: ['rat', 'goblin', 'spider'],
  rat: [],
  slime: [],
  skeleton: []
};

export class EcosystemSystem {
  constructor({ rooms, props, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.lairs = new Map(props.filter(prop => prop.species && prop.type?.includes('lair') || ['slime_pool', 'rat_warren'].includes(prop.type)).map(prop => [prop.species, prop]));
    this.corpses = [];
    this.hosts = [];
    this.pendingSpawns = [];
    this.corpseSequence = 0;
    this.hostSequence = 0;
    this.spawnSequence = 0;
    this.reproductionClock = 0;
  }

  initializeAgents(agents) {
    for (const agent of agents) this.initializeAgent(agent);
  }

  initializeAgent(agent) {
    if (agent.faction !== 'dungeon') return;
    const profile = SPECIES[agent.role];
    if (!profile) return;
    agent.hunger ??= agent.role === 'ogre' ? 52 : 18 + (agent.index % 5) * 6;
    agent.maturity ??= 1;
    agent.homeRoomId ??= this.lairs.get(agent.role)?.roomId ?? agent.roomId;
    agent.carryingHostId ??= null;
    agent.starvationClock ??= 0;
  }

  update(dt, sim) {
    this.initializeAgents(sim.agents);
    this.updateHunger(dt, sim);
    this.updateCarriedHosts(sim);
    this.updatePendingSpawns(dt, sim);
    this.updateCorpses(dt);
    this.updateLairResources(dt);

    this.reproductionClock -= dt;
    if (this.reproductionClock <= 0) {
      this.reproductionClock = 1;
      this.tryReproduction(sim);
    }
  }

  updateHunger(dt, sim) {
    for (const agent of sim.agents) {
      const profile = SPECIES[agent.role];
      if (!profile || agent.faction !== 'dungeon' || !agent.alive || agent.departed || agent.hidden) continue;
      agent.hunger = clamp((agent.hunger ?? 0) + profile.hungerRate * dt, 0, 100);
      if (agent.hunger < profile.starvingAt) {
        agent.starvationClock = 0;
        continue;
      }
      agent.starvationClock += dt;
      if (agent.starvationClock < 2.2) continue;
      agent.starvationClock = 0;
      agent.hp -= agent.role === 'ogre' ? 2 : 1;
      agent.mood = 'starving';
      if (agent.hp <= 0) sim.finalizeDeath(null, agent);
    }
  }

  updateCarriedHosts(sim) {
    for (const host of [...this.hosts]) {
      if (!host.carrierId) continue;
      const carrier = sim.agents.find(agent => agent.id === host.carrierId);
      if (!carrier?.alive) {
        this.releaseHost(host, sim, carrier?.roomId ?? host.roomId);
        continue;
      }
      host.roomId = carrier.roomId;
      host.x = carrier.roomCell?.x ?? host.x;
      host.z = carrier.roomCell?.z ?? host.z;
      if (carrier.travel) continue;
      if (carrier.roomId !== carrier.homeRoomId) continue;

      host.carrierId = null;
      host.deposited = true;
      host.roomId = carrier.homeRoomId;
      carrier.carryingHostId = null;
      const lair = this.lairs.get('spider');
      if (lair) lair.bloodStock = (lair.bloodStock ?? 0) + 2;
      this.startSpawn('spider', carrier.homeRoomId, SPECIES.spider.spawnDuration, host.id);
      this.onEvent(`${carrier.name} suspended ${host.targetName} in the brood chamber.`);
    }
  }

  updatePendingSpawns(dt, sim) {
    for (const pending of [...this.pendingSpawns]) {
      pending.progress += dt;
      if (pending.progress < pending.duration) continue;
      const spawned = sim.spawnEcologyMonster(pending.species, pending.roomId);
      if (!spawned) {
        pending.progress = pending.duration * 0.72;
        continue;
      }
      this.pendingSpawns = this.pendingSpawns.filter(candidate => candidate.id !== pending.id);
      if (pending.sourceHostId) this.consumeHost(pending.sourceHostId, sim);
      this.onEvent(`${spawned.name} completed its unpleasant development in ${sim.roomName(pending.roomId)}.`);
    }
  }

  updateCorpses(dt) {
    for (const corpse of this.corpses) corpse.age += dt;
    this.corpses = this.corpses.filter(corpse => corpse.age < 150);
  }

  updateLairResources(dt) {
    const ratLair = this.lairs.get('rat');
    if (ratLair) ratLair.grainStock = Math.min(10, (ratLair.grainStock ?? 0) + dt * 0.045);
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.faction !== 'dungeon' || agent.travel || agent.combat || agent.downed || agent.hidden) return null;
    const profile = SPECIES[agent.role];
    if (!profile) return null;

    if (agent.role === 'spider' && agent.carryingHostId) {
      return moveToRoom(agent, agent.homeRoomId, sim, `${agent.name} dragged a living cocoon toward the brood chamber.`);
    }

    if (agent.role === 'skeleton') return this.decideSkeleton(agent, sim);
    if (agent.role === 'slime') return this.decideCorpseConsumer(agent, sim, 'eco-consume-corpse');

    if (agent.role === 'spider') {
      const downed = this.findHostCandidate(agent, sim);
      if (downed) {
        if (downed.roomId === agent.roomId) return { type: 'eco-cocoon', targetId: downed.id };
        return moveToRoom(agent, downed.roomId, sim, `${agent.name} followed the movement of an isolated body.`);
      }
    }

    if ((agent.hunger ?? 0) < profile.hungryAt) return null;

    const prey = this.findPrey(agent, sim);
    if (prey) {
      if (prey.roomId === agent.roomId) return { type: 'eco-devour', targetId: prey.id };
      return moveToRoom(agent, prey.roomId, sim, `${agent.name} followed a food trail instead of the tactical plan.`);
    }

    const corpseAction = this.decideCorpseConsumer(agent, sim, 'eco-consume-corpse');
    if (corpseAction) return corpseAction;

    const lair = this.lairs.get(agent.role);
    if (lair && this.stockFor(agent.role, lair) >= 1) {
      if (agent.roomId === lair.roomId) return { type: 'eco-eat-stock', lairId: lair.id };
      return moveToRoom(agent, lair.roomId, sim, `${agent.name} retreated to stored food.`);
    }
    return null;
  }

  decideSkeleton(agent, sim) {
    const corpse = nearestCorpse(agent, this.corpses, sim);
    if (!corpse) return null;
    if (corpse.roomId === agent.roomId) return { type: 'eco-harvest-bones', corpseId: corpse.id };
    return moveToRoom(agent, corpse.roomId, sim, `${agent.name} went to collect structurally useful remains.`);
  }

  decideCorpseConsumer(agent, sim, type) {
    const corpse = nearestCorpse(agent, this.corpses, sim);
    if (!corpse) return null;
    if (corpse.roomId === agent.roomId) return { type, corpseId: corpse.id };
    return moveToRoom(agent, corpse.roomId, sim, `${agent.name} followed the smell of an unfinished death.`);
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('eco-')) return false;
    if (action.type === 'eco-eat-stock') return this.eatStock(agent, action, sim);
    if (action.type === 'eco-devour') return this.devour(agent, action, sim);
    if (action.type === 'eco-consume-corpse') return this.consumeCorpse(agent, action, sim, false);
    if (action.type === 'eco-harvest-bones') return this.consumeCorpse(agent, action, sim, true);
    if (action.type === 'eco-cocoon') return this.cocoon(agent, action, sim);
    return false;
  }

  eatStock(agent, action, sim) {
    const lair = this.props.find(prop => prop.id === action.lairId) ?? this.lairs.get(agent.role);
    if (!lair || lair.roomId !== agent.roomId) return true;
    const key = stockKey(agent.role);
    if ((lair[key] ?? 0) < 1) return true;
    lair[key] -= 1;
    agent.hunger = Math.max(0, agent.hunger - 58);
    agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(1, Math.round(agent.maxHp * 0.08)));
    agent.mood = 'fed';
    sim.emitEffect('feeding', { roomId: agent.roomId, agentId: agent.id, duration: 0.9 });
    this.onEvent(`${agent.name} consumed stored food at ${lair.label}.`);
    return true;
  }

  devour(predator, action, sim) {
    const prey = sim.agents.find(agent => agent.id === action.targetId);
    if (!prey?.alive || prey.roomId !== predator.roomId || prey.travel || prey.hidden) return true;
    if (!PREY[predator.role]?.includes(prey.role) && !(prey.faction === 'party' && prey.downed)) return true;

    sim.consumeByPredator(predator, prey);
    predator.hunger = Math.max(0, predator.hunger - (prey.role === 'rat' ? 48 : 72));
    predator.hp = Math.min(predator.maxHp, predator.hp + Math.max(2, Math.round(prey.maxHp * 0.24)));
    const lair = this.lairs.get(predator.role);
    if (lair) {
      const key = stockKey(predator.role);
      lair[key] = Math.min(12, (lair[key] ?? 0) + (prey.role === 'rat' ? 0.6 : 1.2));
    }
    sim.emitEffect('feeding', { roomId: predator.roomId, agentId: predator.id, duration: 1.05 });
    this.onEvent(`${predator.name} ate ${prey.name}; the population graph became personal.`);
    return true;
  }

  consumeCorpse(agent, action, sim, harvestBones) {
    const corpse = this.corpses.find(candidate => candidate.id === action.corpseId);
    if (!corpse || corpse.roomId !== agent.roomId) return true;
    const lair = this.lairs.get(agent.role);

    if (harvestBones) {
      if (lair) lair.boneStock = Math.min(14, (lair.boneStock ?? 0) + corpse.bones);
      this.onEvent(`${agent.name} sorted ${corpse.label} into reusable anatomy.`);
    } else if (agent.role === 'slime') {
      if (lair) lair.biomass = Math.min(14, (lair.biomass ?? 0) + corpse.biomass);
      agent.hunger = Math.max(0, agent.hunger - 62);
      agent.hp = Math.min(agent.maxHp, agent.hp + Math.round(corpse.biomass * 2));
      this.onEvent(`${agent.name} dissolved ${corpse.label} into additional slime.`);
    } else {
      if (lair) {
        const key = stockKey(agent.role);
        lair[key] = Math.min(14, (lair[key] ?? 0) + corpse.food);
      }
      agent.hunger = Math.max(0, agent.hunger - 56);
      agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(1, Math.round(corpse.food * 2)));
      this.onEvent(`${agent.name} consumed ${corpse.label}.`);
    }

    this.corpses = this.corpses.filter(candidate => candidate.id !== corpse.id);
    sim.emitEffect('feeding', { roomId: agent.roomId, agentId: agent.id, duration: 0.9 });
    return true;
  }

  cocoon(spider, action, sim) {
    const target = sim.agents.find(agent => agent.id === action.targetId);
    if (!target?.alive || !target.downed || target.roomId !== spider.roomId || target.hosted) return true;
    const host = {
      id: `host-${this.hostSequence++}`,
      targetId: target.id,
      targetName: target.name,
      carrierId: spider.id,
      roomId: spider.roomId,
      x: target.roomCell?.x ?? null,
      z: target.roomCell?.z ?? null,
      deposited: false
    };
    this.hosts.push(host);
    spider.carryingHostId = host.id;
    target.hosted = true;
    target.hidden = true;
    target.downed = false;
    target.bleedout = 0;
    target.combat = null;
    target.travel = null;
    sim.occupancy.release(target.id);
    sim.occupancy.cancelReservation(target.id);
    target.roomCell = null;
    this.onEvent(`${spider.name} wrapped ${target.name} as a living host and began the return journey.`);
    sim.emitEffect('cocoon', { roomId: spider.roomId, agentId: spider.id, duration: 1.2 });
    return true;
  }

  createCorpse(agent, roomId, position = null) {
    if (!agent || agent.corpseCreated || agent.ecologyConsumed) return null;
    const scale = agent.role === 'ogre' ? 3 : agent.role === 'rat' ? 0.45 : agent.faction === 'party' ? 1.4 : 1;
    const corpse = {
      id: `corpse-${this.corpseSequence++}`,
      sourceId: agent.id,
      sourceRole: agent.role,
      label: `${agent.name}'s remains`,
      roomId,
      x: position?.x ?? null,
      z: position?.z ?? null,
      biomass: 1.4 * scale,
      bones: ['skeleton', 'slime'].includes(agent.role) ? 0.5 * scale : 1.2 * scale,
      food: agent.role === 'slime' ? 0.5 : 1.1 * scale,
      age: 0
    };
    agent.corpseCreated = true;
    this.corpses.push(corpse);
    return corpse;
  }

  onAgentDeath(agent, sim) {
    if (!agent?.carryingHostId) return;
    const host = this.hosts.find(candidate => candidate.id === agent.carryingHostId);
    if (host) this.releaseHost(host, sim, agent.roomId);
    agent.carryingHostId = null;
  }

  releaseHost(host, sim, roomId) {
    const target = sim.agents.find(agent => agent.id === host.targetId);
    if (target?.alive) {
      target.hosted = false;
      target.hidden = false;
      target.downed = true;
      target.bleedout = 8;
      target.roomId = roomId;
      target.mood = 'rescued-from-cocoon';
      sim.occupancy.placeAgent(target, roomId);
      this.onEvent(`${target.name} fell out of an abandoned cocoon with eight seconds of optimism.`);
    }
    this.hosts = this.hosts.filter(candidate => candidate.id !== host.id);
  }

  consumeHost(hostId, sim) {
    const host = this.hosts.find(candidate => candidate.id === hostId);
    if (!host) return;
    const target = sim.agents.find(agent => agent.id === host.targetId);
    if (target?.alive) sim.consumeHostedAdventurer(target, host.roomId);
    this.hosts = this.hosts.filter(candidate => candidate.id !== hostId);
  }

  tryReproduction(sim) {
    for (const [species, lair] of this.lairs) {
      const profile = SPECIES[species];
      if (!profile || this.pendingSpawns.some(spawn => spawn.species === species)) continue;
      const population = sim.agents.filter(agent => agent.alive && !agent.departed && agent.role === species).length;
      if (population >= (lair.capacity ?? profile.capacity)) continue;
      const adults = sim.agents.filter(agent => agent.alive && agent.role === species && (agent.maturity ?? 1) >= 1).length;
      if (!this.canReproduce(species, lair, adults)) continue;
      this.spendReproductionResource(species, lair);
      this.startSpawn(species, lair.roomId, profile.spawnDuration);
      this.onEvent(`${lair.label} began preparing another ${species}.`);
    }
  }

  canReproduce(species, lair, adults) {
    if (species === 'rat') return adults >= 2 && (lair.grainStock ?? 0) >= 2;
    if (species === 'goblin') return adults >= 2 && (lair.foodStock ?? 0) >= 3;
    if (species === 'spider') return adults >= 1 && (lair.bloodStock ?? 0) >= 2;
    if (species === 'slime') return adults >= 1 && (lair.biomass ?? 0) >= 3;
    if (species === 'skeleton') return (lair.boneStock ?? 0) >= 3;
    if (species === 'ogre') return adults >= 1 && (lair.foodStock ?? 0) >= 8;
    return false;
  }

  spendReproductionResource(species, lair) {
    if (species === 'rat') lair.grainStock -= 2;
    if (species === 'goblin') lair.foodStock -= 3;
    if (species === 'spider') lair.bloodStock -= 2;
    if (species === 'slime') lair.biomass -= 3;
    if (species === 'skeleton') lair.boneStock -= 3;
    if (species === 'ogre') lair.foodStock -= 8;
  }

  startSpawn(species, roomId, duration, sourceHostId = null) {
    if (this.pendingSpawns.some(spawn => spawn.species === species || sourceHostId && spawn.sourceHostId === sourceHostId)) return null;
    const pending = {
      id: `spawn-${this.spawnSequence++}`,
      species,
      roomId,
      duration,
      progress: 0,
      sourceHostId
    };
    this.pendingSpawns.push(pending);
    return pending;
  }

  findPrey(agent, sim) {
    const allowed = PREY[agent.role] ?? [];
    if (!allowed.length) return null;
    const candidates = sim.agents.filter(candidate =>
      candidate.alive && !candidate.departed && !candidate.hidden && !candidate.travel && candidate.id !== agent.id && allowed.includes(candidate.role)
    );
    if (!candidates.length) return null;
    const roomId = nearestRoom(sim.graph, agent.roomId, [...new Set(candidates.map(candidate => candidate.roomId))]);
    return candidates.find(candidate => candidate.roomId === roomId) ?? candidates[0];
  }

  findHostCandidate(spider, sim) {
    const candidates = sim.agents.filter(candidate =>
      candidate.faction === 'party' && candidate.alive && candidate.downed && !candidate.hosted && !candidate.travel
    );
    if (!candidates.length) return null;
    const roomId = nearestRoom(sim.graph, spider.roomId, [...new Set(candidates.map(candidate => candidate.roomId))]);
    return candidates.find(candidate => candidate.roomId === roomId) ?? candidates[0];
  }

  stockFor(species, lair) {
    return lair?.[stockKey(species)] ?? 0;
  }

  snapshot() {
    return {
      corpses: this.corpses.map(corpse => ({ ...corpse })),
      hosts: this.hosts.map(host => ({ ...host })),
      pendingSpawns: this.pendingSpawns.map(spawn => ({ ...spawn })),
      lairs: [...this.lairs.values()].map(lair => ({
        id: lair.id,
        species: lair.species,
        roomId: lair.roomId,
        foodStock: lair.foodStock ?? 0,
        grainStock: lair.grainStock ?? 0,
        biomass: lair.biomass ?? 0,
        boneStock: lair.boneStock ?? 0,
        bloodStock: lair.bloodStock ?? 0,
        capacity: lair.capacity
      }))
    };
  }

  metrics(agents) {
    return {
      corpses: this.corpses.length,
      hosts: this.hosts.length,
      births: this.pendingSpawns.length,
      hungry: agents.filter(agent => agent.faction === 'dungeon' && agent.alive && SPECIES[agent.role] && agent.hunger >= SPECIES[agent.role].hungryAt).length
    };
  }
}

function nearestCorpse(agent, corpses, sim) {
  if (!corpses.length) return null;
  const roomId = nearestRoom(sim.graph, agent.roomId, [...new Set(corpses.map(corpse => corpse.roomId))]);
  return corpses.find(corpse => corpse.roomId === roomId) ?? corpses[0];
}

function moveToRoom(agent, targetRoomId, sim, text = null) {
  if (!targetRoomId || targetRoomId === agent.roomId) return { type: 'idle' };
  const step = nextStep(sim.graph, agent.roomId, targetRoomId);
  if (!step || step === agent.roomId) return { type: 'idle' };
  return { type: 'move', roomId: step, text };
}

function stockKey(species) {
  if (species === 'rat') return 'grainStock';
  if (species === 'slime') return 'biomass';
  if (species === 'skeleton') return 'boneStock';
  if (species === 'spider') return 'bloodStock';
  return 'foodStock';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
