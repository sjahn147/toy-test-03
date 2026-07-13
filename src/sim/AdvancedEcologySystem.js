import { nearestRoom, nextStep } from './Pathfinding.js';
import { ADVANCED_FACTION_COLORS, ADVANCED_PROFILES } from './advancedEcologyConfig.js';

export class AdvancedEcologySystem {
  constructor({ rooms, props, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.occupancy = occupancy;
    this.onEvent = onEvent;
    this.lairs = new Map(
      props.filter(prop => prop.ecologyFaction && prop.species).map(prop => [prop.species, prop])
    );
    this.infections = [];
    this.attachments = [];
    this.traps = [];
    this.pendingSpawns = [];
    this.territories = new Map();
    this.captureProgress = new Map();
    this.sequence = 0;
    this.reproductionClock = 0;
    this.territoryClock = 0;
    this.initializeTerritories();
  }

  initializeTerritories() {
    for (const lair of this.lairs.values()) {
      const current = this.territories.get(lair.roomId);
      if (current) {
        current.contenders = [...new Set([...current.contenders, lair.ecologyFaction])];
        current.contested = current.contenders.length > 1;
        continue;
      }
      this.territories.set(lair.roomId, {
        roomId: lair.roomId,
        ownerFaction: lair.ecologyFaction,
        contenders: [lair.ecologyFaction],
        contested: false,
        strength: 1
      });
    }
  }

  initializeAgents(agents, sim = null) {
    for (const agent of agents) this.initializeAgent(agent, sim);
  }

  initializeAgent(agent, sim = null) {
    const profile = ADVANCED_PROFILES[agent.role];
    if (!profile || agent.faction !== 'dungeon') return;
    agent.ecologyFaction ??= this.lairs.get(agent.role)?.ecologyFaction ?? `wild-${agent.role}`;
    agent.homeRoomId ??= this.lairs.get(agent.role)?.roomId ?? agent.roomId;
    agent.advancedCooldown ??= 0;
    agent.attachedToId ??= null;
    agent.sporeSleep ??= 0;
    agent.hunger ??= profile.hungerRate ? 18 + (agent.index % 4) * 8 : 0;
    if (!agent.advancedStatsApplied) {
      agent.baseAttack = profile.attack;
      agent.attack = profile.attack;
      agent.baseMaxHp = profile.hp;
      agent.maxHp = profile.hp;
      agent.hp = agent.alive ? Math.max(1, Math.min(agent.hp ?? profile.hp, profile.hp)) : 0;
      agent.courage = profile.courage;
      agent.advancedStatsApplied = true;
      sim?.equipmentSystem?.applyStats(agent);
    }
  }

  update(dt, sim) {
    this.initializeAgents(sim.agents, sim);
    for (const agent of sim.agents) {
      agent.advancedCooldown = Math.max(0, (agent.advancedCooldown ?? 0) - dt);
      agent.sporeSleep = Math.max(0, (agent.sporeSleep ?? 0) - dt);
      const profile = ADVANCED_PROFILES[agent.role];
      if (profile?.hungerRate && agent.alive && !agent.departed && !agent.hidden) {
        agent.hunger = Math.min(100, (agent.hunger ?? 0) + profile.hungerRate * dt);
      }
    }

    this.updateAttachments(dt, sim);
    this.updateInfections(dt, sim);
    this.updateTraps(dt, sim);
    this.updatePendingSpawns(dt, sim);
    this.passiveResources(dt);

    if (!sim.spawnNetworkSystem?.enabled) {
      this.reproductionClock -= dt;
      if (this.reproductionClock <= 0) {
        this.reproductionClock = 1.2;
        this.tryReproduction(sim);
      }
    }

    this.territoryClock -= dt;
    if (this.territoryClock <= 0) {
      this.territoryClock = 1;
      this.updateTerritories(sim);
    }
  }

  decide(agent, sim) {
    if (!ADVANCED_PROFILES[agent.role] || !agent.alive || agent.departed || agent.hidden || agent.attachedToId || agent.sporeSleep > 0) return null;

    const rival = sim.agents.find(candidate =>
      candidate.id !== agent.id && candidate.alive && !candidate.departed && !candidate.hidden && !candidate.travel &&
      candidate.faction === 'dungeon' && candidate.roomId === agent.roomId && candidate.ecologyFaction &&
      candidate.ecologyFaction !== agent.ecologyFaction
    );
    if (rival && !['myconid', 'stirge', 'parasite'].includes(agent.role)) {
      return { type: 'advanced-faction-attack', targetId: rival.id };
    }

    if (agent.role === 'zombie') return this.zombieDecision(agent, sim);
    if (agent.role === 'orc') return this.orcDecision(agent, sim);
    if (agent.role === 'myconid') return this.myconidDecision(agent, sim);
    if (agent.role === 'stirge') return this.stirgeDecision(agent, sim);
    if (agent.role === 'carrion') return this.carrionDecision(agent, sim);
    if (agent.role === 'kobold') return this.koboldDecision(agent, sim);
    if (agent.role === 'wraith') return this.wraithDecision(agent, sim);
    if (agent.role === 'parasite') return this.parasiteDecision(agent, sim);
    return null;
  }

  resolve(agent, action, sim) {
    if (!action) return false;
    if (action.type === 'advanced-move') {
      sim.beginTravel(agent, action.roomId);
      return true;
    }
    if (action.type === 'advanced-faction-attack') {
      const target = sim.agents.find(candidate => candidate.id === action.targetId);
      if (target?.alive && target.roomId === agent.roomId) sim.combatSystem.startAttack(agent, target, sim);
      return true;
    }
    if (action.type === 'zombie-claim-corpse') return this.claimCorpse(agent, action.corpseId, sim);
    if (action.type === 'myconid-decompose') return this.decomposeCorpse(agent, action.corpseId, sim);
    if (action.type === 'carrion-feed') return this.carrionFeed(agent, action.corpseId, sim);
    if (action.type === 'stirge-attach') return this.attachStirge(agent, action.targetId, sim);
    if (action.type === 'spore-burst') return this.sporeBurst(agent, sim);
    if (action.type === 'kobold-build-trap') return this.buildTrap(agent, action.roomId, sim);
    if (action.type === 'wraith-drain') return this.wraithDrain(agent, action.targetId, sim);
    if (action.type === 'parasite-infect') return this.infectHost(agent, action.targetId, sim);
    if (action.type === 'orc-devour') return this.orcDevour(agent, action.targetId, sim);
    return false;
  }

  zombieDecision(agent, sim) {
    const corpse = this.nearestCorpse(agent, sim, candidate => !candidate.plagueClaimed);
    if (corpse) return corpse.roomId === agent.roomId
      ? { type: 'zombie-claim-corpse', corpseId: corpse.id }
      : moveToward(agent, sim, corpse.roomId);
    return this.moveTowardParty(agent, sim);
  }

  orcDecision(agent, sim) {
    const prey = this.nearestAgent(agent, sim, candidate =>
      candidate.alive && !candidate.departed && !candidate.travel && ['goblin', 'kobold', 'rat'].includes(candidate.role)
    );
    if ((agent.hunger ?? 0) >= ADVANCED_PROFILES.orc.hungryAt && prey) {
      return prey.roomId === agent.roomId
        ? { type: 'orc-devour', targetId: prey.id }
        : moveToward(agent, sim, prey.roomId);
    }
    const expansion = this.findExpansionRoom(agent, sim);
    if (expansion && expansion !== agent.roomId) return moveToward(agent, sim, expansion);
    return this.moveTowardParty(agent, sim);
  }

  myconidDecision(agent, sim) {
    const corpse = this.nearestCorpse(agent, sim);
    if (corpse) return corpse.roomId === agent.roomId
      ? { type: 'myconid-decompose', corpseId: corpse.id }
      : moveToward(agent, sim, corpse.roomId);
    const partyHere = sim.agents.some(candidate =>
      candidate.faction === 'party' && candidate.alive && !candidate.downed && candidate.roomId === agent.roomId
    );
    return partyHere && agent.advancedCooldown <= 0 ? { type: 'spore-burst' } : null;
  }

  stirgeDecision(agent, sim) {
    const target = this.nearestAgent(agent, sim, candidate =>
      candidate.faction === 'party' && candidate.alive && !candidate.downed && !candidate.travel && (candidate.stirgeCount ?? 0) < 2
    );
    if (!target) return null;
    return target.roomId === agent.roomId
      ? { type: 'stirge-attach', targetId: target.id }
      : moveToward(agent, sim, target.roomId);
  }

  carrionDecision(agent, sim) {
    const corpse = this.nearestCorpse(agent, sim);
    if (!corpse) return null;
    return corpse.roomId === agent.roomId
      ? { type: 'carrion-feed', corpseId: corpse.id }
      : moveToward(agent, sim, corpse.roomId);
  }

  koboldDecision(agent, sim) {
    const lair = this.lairs.get('kobold');
    if (!lair) return null;
    const trapRoom = this.findTrapRoom(agent, sim);
    if (agent.roomId === lair.roomId && (lair.scrapStock ?? 0) >= 2 && trapRoom && agent.advancedCooldown <= 0) {
      return { type: 'kobold-build-trap', roomId: trapRoom };
    }
    return agent.roomId !== lair.roomId && agent.advancedCooldown <= 0
      ? moveToward(agent, sim, lair.roomId)
      : null;
  }

  wraithDecision(agent, sim) {
    const target = this.nearestAgent(agent, sim, candidate =>
      candidate.faction === 'party' && candidate.alive && !candidate.departed && !candidate.travel
    );
    if (!target) return null;
    return target.roomId === agent.roomId
      ? { type: 'wraith-drain', targetId: target.id }
      : moveToward(agent, sim, target.roomId);
  }

  parasiteDecision(agent, sim) {
    const target = this.nearestAgent(agent, sim, candidate =>
      candidate.faction === 'party' && candidate.alive && !candidate.travel && !candidate.infected &&
      (candidate.downed || candidate.hp <= candidate.maxHp * 0.55)
    );
    if (!target) return null;
    return target.roomId === agent.roomId
      ? { type: 'parasite-infect', targetId: target.id }
      : moveToward(agent, sim, target.roomId);
  }

  claimCorpse(agent, corpseId, sim) {
    const corpse = sim.ecosystem.corpses.find(candidate => candidate.id === corpseId);
    if (!corpse) return true;
    sim.ecosystem.corpses = sim.ecosystem.corpses.filter(candidate => candidate.id !== corpseId);
    const lair = this.lairs.get('zombie');
    if (lair) lair.corpseStock = (lair.corpseStock ?? 0) + 1;
    agent.advancedCooldown = 4;
    sim.emitEffect('plague', { roomId: agent.roomId, agentId: agent.id, duration: 1.1 });
    this.onEvent(`${agent.name} catalogued ${corpse.sourceName}'s remains for later animation.`);
    return true;
  }

  decomposeCorpse(agent, corpseId, sim) {
    const corpse = sim.ecosystem.corpses.find(candidate => candidate.id === corpseId);
    if (!corpse) return true;
    sim.ecosystem.corpses = sim.ecosystem.corpses.filter(candidate => candidate.id !== corpseId);
    const lair = this.lairs.get('myconid');
    if (lair) lair.sporeStock = (lair.sporeStock ?? 0) + Math.max(1, Math.ceil((corpse.biomass ?? 1) / 2));
    agent.hp = Math.min(agent.maxHp, agent.hp + 3);
    agent.advancedCooldown = 3;
    sim.emitEffect('spore', { roomId: agent.roomId, agentId: agent.id, duration: 1.2 });
    this.onEvent(`${agent.name} converted ${corpse.sourceName}'s remains into a blue spore bed.`);
    return true;
  }

  carrionFeed(agent, corpseId, sim) {
    const corpse = sim.ecosystem.corpses.find(candidate => candidate.id === corpseId);
    if (!corpse) return true;
    sim.ecosystem.corpses = sim.ecosystem.corpses.filter(candidate => candidate.id !== corpseId);
    const lair = this.lairs.get('carrion');
    if (lair) lair.carrionStock = (lair.carrionStock ?? 0) + Math.max(1, corpse.food ?? 1);
    agent.hunger = Math.max(0, (agent.hunger ?? 0) - 52);
    agent.hp = Math.min(agent.maxHp, agent.hp + 5);
    sim.emitEffect('feeding', { roomId: agent.roomId, agentId: agent.id, duration: 0.9 });
    return true;
  }

  attachStirge(agent, targetId, sim) {
    const target = sim.agents.find(candidate => candidate.id === targetId);
    if (!target?.alive || target.roomId !== agent.roomId) return true;
    this.occupancy.release(agent.id);
    agent.roomCell = null;
    agent.attachedToId = target.id;
    agent.hidden = true;
    target.stirgeCount = (target.stirgeCount ?? 0) + 1;
    this.attachments.push({
      id: `attachment-${this.sequence++}`,
      sourceId: agent.id,
      targetId: target.id,
      roomId: target.roomId,
      duration: 6.5,
      elapsed: 0,
      pulses: 0
    });
    sim.emitEffect('blood-attach', { roomId: target.roomId, agentId: target.id, duration: 1 });
    this.onEvent(`${agent.name} latched onto ${target.name}.`);
    return true;
  }

  sporeBurst(agent, sim) {
    const targets = sim.agents.filter(candidate =>
      candidate.faction === 'party' && candidate.alive && !candidate.downed && candidate.roomId === agent.roomId
    );
    for (const target of targets) {
      target.sporeSleep = Math.max(target.sporeSleep ?? 0, 4.8);
      target.mood = 'spore-sleep';
    }
    const lair = this.lairs.get('myconid');
    if (lair) lair.sporeStock = Math.max(0, (lair.sporeStock ?? 0) - 1);
    agent.advancedCooldown = 9;
    sim.emitEffect('spore', { roomId: agent.roomId, agentId: agent.id, duration: 1.5 });
    this.onEvent(`${agent.name} filled ${sim.roomName(agent.roomId)} with sleep spores.`);
    return true;
  }

  buildTrap(agent, roomId, sim) {
    const lair = this.lairs.get('kobold');
    if (!lair || (lair.scrapStock ?? 0) < 2 || this.traps.some(trap => trap.roomId === roomId)) return true;
    lair.scrapStock -= 2;
    this.traps.push({ id: `advanced-trap-${this.sequence++}`, roomId, ownerFaction: agent.ecologyFaction, charges: 2, cooldown: 0 });
    agent.advancedCooldown = 10;
    this.onEvent(`${agent.name} assembled a spring-jaw trap in ${sim.roomName(roomId)}.`);
    return true;
  }

  wraithDrain(agent, targetId, sim) {
    const target = sim.agents.find(candidate => candidate.id === targetId);
    if (!target?.alive || target.roomId !== agent.roomId) return true;
    const amount = 3 + Math.floor(Math.random() * 3);
    sim.applyCombatDamage(agent, target, amount, { projectileType: 'wraith' });
    const lair = this.lairs.get('wraith');
    if (lair) lair.deathEnergy = (lair.deathEnergy ?? 0) + 0.45;
    agent.hp = Math.min(agent.maxHp, agent.hp + 2);
    agent.advancedCooldown = 3;
    sim.emitEffect('soul-drain', { roomId: agent.roomId, agentId: target.id, duration: 1 });
    return true;
  }

  infectHost(agent, targetId, sim) {
    const target = sim.agents.find(candidate => candidate.id === targetId);
    if (!target?.alive || target.infected) return true;
    this.infections.push({
      id: `infection-${this.sequence++}`,
      type: 'parasite',
      sourceId: agent.id,
      targetId: target.id,
      roomId: target.roomId,
      duration: target.downed ? 9 : 15,
      elapsed: 0
    });
    target.infected = true;
    target.infectionType = 'parasite';
    target.mood = 'infected';
    agent.ecologyConsumed = true;
    agent.alive = false;
    agent.hp = 0;
    agent.hidden = true;
    this.occupancy.release(agent.id);
    sim.emitEffect('infection', { roomId: target.roomId, agentId: target.id, duration: 1.2 });
    this.onEvent(`${agent.name} entered ${target.name} as an internal problem.`);
    return true;
  }

  orcDevour(agent, targetId, sim) {
    const target = sim.agents.find(candidate => candidate.id === targetId);
    if (!target?.alive || target.roomId !== agent.roomId) return true;
    if (sim.consumeByPredator(agent, target)) {
      const lair = this.lairs.get('orc');
      if (lair) {
        lair.meatStock = (lair.meatStock ?? 0) + 2;
        lair.trophyStock = (lair.trophyStock ?? 0) + 1;
      }
      agent.hunger = Math.max(0, (agent.hunger ?? 0) - 62);
      agent.hp = Math.min(agent.maxHp, agent.hp + 6);
    }
    return true;
  }

  updateAttachments(dt, sim) {
    for (const attachment of [...this.attachments]) {
      const source = sim.agents.find(agent => agent.id === attachment.sourceId);
      const target = sim.agents.find(agent => agent.id === attachment.targetId);
      if (!source?.alive || !target?.alive || target.departed) {
        this.detach(attachment, source, target, sim);
        continue;
      }
      source.roomId = target.roomId;
      attachment.roomId = target.roomId;
      attachment.elapsed += dt;
      const pulse = Math.floor(attachment.elapsed / 1.5);
      if (pulse > attachment.pulses) {
        attachment.pulses = pulse;
        sim.applyCombatDamage(source, target, 1, { projectileType: 'blood' });
        const lair = this.lairs.get('stirge');
        if (lair) lair.bloodStock = (lair.bloodStock ?? 0) + 0.6;
        source.hunger = Math.max(0, (source.hunger ?? 0) - 18);
      }
      if (attachment.elapsed >= attachment.duration || !target.alive) this.detach(attachment, source, target, sim);
    }
  }

  detach(attachment, source, target, sim) {
    if (source?.alive) {
      source.attachedToId = null;
      source.hidden = false;
      source.roomId = target?.roomId ?? attachment.roomId;
      source.mood = 'blood-fed';
      this.occupancy.placeAgent(source, source.roomId);
    }
    if (target) target.stirgeCount = Math.max(0, (target.stirgeCount ?? 1) - 1);
    this.attachments = this.attachments.filter(candidate => candidate.id !== attachment.id);
  }

  updateInfections(dt, sim) {
    for (const infection of [...this.infections]) {
      const target = sim.agents.find(agent => agent.id === infection.targetId);
      if (!target?.alive) {
        this.clearInfection(infection, target);
        continue;
      }
      const room = sim.rooms.find(candidate => candidate.id === target.roomId);
      if (room?.tags?.includes('safe_zone') || room?.tags?.includes('sanctuary')) {
        this.clearInfection(infection, target);
        sim.emitEffect('heal', { roomId: target.roomId, agentId: target.id, duration: 0.9 });
        this.onEvent(`${target.name}'s infection was removed under sanctuary rules.`);
        continue;
      }
      infection.elapsed += dt;
      infection.roomId = target.roomId;
      if (infection.elapsed < infection.duration) continue;
      target.infected = false;
      target.infectionType = null;
      if (!target.downed) sim.enterDowned(target, null);
      this.startSpawn('parasite', target.roomId, 2.5, { sourceHostId: target.id });
      this.startSpawn('parasite', target.roomId, 3.3, { sourceHostId: `${target.id}:second` });
      sim.emitEffect('infection-burst', { roomId: target.roomId, agentId: target.id, duration: 1.4 });
      this.infections = this.infections.filter(candidate => candidate.id !== infection.id);
      this.onEvent(`${target.name}'s untreated infection produced pale larvae.`);
    }
  }

  clearInfection(infection, target) {
    if (target) {
      target.infected = false;
      target.infectionType = null;
    }
    this.infections = this.infections.filter(candidate => candidate.id !== infection.id);
  }

  updateTraps(dt, sim) {
    for (const trap of this.traps) {
      trap.cooldown = Math.max(0, trap.cooldown - dt);
      if (trap.cooldown > 0 || trap.charges <= 0) continue;
      const target = sim.agents.find(agent =>
        agent.faction === 'party' && agent.alive && !agent.downed && !agent.travel && agent.roomId === trap.roomId
      );
      if (!target) continue;
      const source = sim.agents.find(agent => agent.alive && agent.ecologyFaction === trap.ownerFaction) ?? null;
      sim.applyCombatDamage(source, target, 4, { projectileType: 'trap' });
      target.webbed = Math.max(target.webbed ?? 0, 2.5);
      trap.charges -= 1;
      trap.cooldown = 3;
      sim.emitEffect('trap-spring', { roomId: trap.roomId, agentId: target.id, duration: 0.9 });
      this.onEvent(`${target.name} triggered a Copper-Tail spring-jaw.`);
    }
    this.traps = this.traps.filter(trap => trap.charges > 0);
  }

  updatePendingSpawns(dt, sim) {
    for (const pending of [...this.pendingSpawns]) {
      pending.progress += dt;
      if (pending.progress < pending.duration) continue;
      const spawned = sim.spawnAdvancedMonster(pending.species, pending.roomId);
      if (!spawned) {
        pending.progress = pending.duration * 0.7;
        continue;
      }
      this.pendingSpawns = this.pendingSpawns.filter(candidate => candidate.id !== pending.id);
      this.onEvent(`${spawned.name} emerged from ${sim.roomName(pending.roomId)}.`);
    }
  }

  passiveResources(dt) {
    const kobold = this.lairs.get('kobold');
    if (kobold) kobold.scrapStock = Math.min(10, (kobold.scrapStock ?? 0) + dt * 0.025);
    const orc = this.lairs.get('orc');
    if (orc) orc.meatStock = Math.min(12, (orc.meatStock ?? 0) + dt * 0.008);
  }

  tryReproduction(sim) {
    for (const [species, lair] of this.lairs) {
      if (this.pendingSpawns.some(spawn => spawn.species === species && !spawn.sourceHostId)) continue;
      const profile = ADVANCED_PROFILES[species];
      if (!profile) continue;
      const population = sim.agents.filter(agent => agent.alive && !agent.departed && agent.role === species).length;
      if (population >= (lair.capacity ?? profile.capacity) || !this.canReproduce(species, lair, sim)) continue;
      this.spendReproductionResource(species, lair);
      this.startSpawn(species, lair.roomId, profile.spawnDuration);
      this.onEvent(`${lair.label} began developing another ${species}.`);
    }
  }

  canReproduce(species, lair, sim) {
    const adults = sim.agents.filter(agent => agent.alive && agent.role === species && (agent.maturity ?? 1) >= 1).length;
    if (species === 'zombie') return (lair.corpseStock ?? 0) >= 1;
    if (species === 'orc') return adults >= 1 && (lair.meatStock ?? 0) >= 5 && (lair.trophyStock ?? 0) >= 1;
    if (species === 'myconid') return adults >= 1 && (lair.sporeStock ?? 0) >= 4;
    if (species === 'stirge') return adults >= 1 && (lair.bloodStock ?? 0) >= 3;
    if (species === 'carrion') return adults >= 1 && (lair.carrionStock ?? 0) >= 3;
    if (species === 'kobold') return adults >= 2 && (lair.scrapStock ?? 0) >= 5;
    if (species === 'wraith') return (lair.deathEnergy ?? 0) >= 4;
    if (species === 'parasite') return (lair.hostStock ?? 0) >= 2;
    return false;
  }

  spendReproductionResource(species, lair) {
    if (species === 'zombie') lair.corpseStock -= 1;
    if (species === 'orc') { lair.meatStock -= 5; lair.trophyStock -= 1; }
    if (species === 'myconid') lair.sporeStock -= 4;
    if (species === 'stirge') lair.bloodStock -= 3;
    if (species === 'carrion') lair.carrionStock -= 3;
    if (species === 'kobold') lair.scrapStock -= 5;
    if (species === 'wraith') lair.deathEnergy -= 4;
    if (species === 'parasite') lair.hostStock -= 2;
  }

  startSpawn(species, roomId, duration, metadata = {}) {
    if (!metadata.sourceHostId && this.pendingSpawns.some(spawn => spawn.species === species && !spawn.sourceHostId)) return null;
    if (metadata.sourceHostId && this.pendingSpawns.some(spawn => spawn.sourceHostId === metadata.sourceHostId)) return null;
    const pending = { id: `advanced-spawn-${this.sequence++}`, species, roomId, duration, progress: 0, ...metadata };
    this.pendingSpawns.push(pending);
    return pending;
  }

  onAgentDeath(target, source, sim) {
    const wraithLair = this.lairs.get('wraith');
    if (wraithLair) wraithLair.deathEnergy = (wraithLair.deathEnergy ?? 0) + (target.faction === 'party' ? 1.4 : 0.5);
    if (source?.role === 'zombie' && target.role !== 'zombie') {
      const zombieLair = this.lairs.get('zombie');
      if (zombieLair) zombieLair.corpseStock = (zombieLair.corpseStock ?? 0) + 1;
    }
    for (const attachment of [...this.attachments]) {
      if (attachment.targetId !== target.id && attachment.sourceId !== target.id) continue;
      const attachedSource = sim.agents.find(agent => agent.id === attachment.sourceId);
      const attachedTarget = sim.agents.find(agent => agent.id === attachment.targetId);
      this.detach(attachment, attachedSource, attachedTarget, sim);
    }
  }

  updateTerritories(sim) {
    const safeRooms = new Set(this.rooms.filter(room => room.tags?.includes('safe_zone')).map(room => room.id));
    for (const room of this.rooms) {
      if (safeRooms.has(room.id)) continue;
      const factions = new Map();
      for (const agent of sim.agents) {
        if (!agent.alive || agent.departed || agent.hidden || agent.travel || agent.faction !== 'dungeon' || agent.roomId !== room.id || !agent.ecologyFaction) continue;
        factions.set(agent.ecologyFaction, (factions.get(agent.ecologyFaction) ?? 0) + 1);
      }
      const entries = [...factions.entries()].sort((a, b) => b[1] - a[1]);
      const territory = this.territories.get(room.id) ?? { roomId: room.id, ownerFaction: null, strength: 0, contenders: [] };
      if (entries.length > 1) {
        territory.contested = true;
        territory.contenders = entries.map(([faction]) => faction);
        territory.strength = entries[0][1] - entries[1][1];
      } else if (entries.length === 1) {
        const [faction, count] = entries[0];
        territory.contested = false;
        territory.contenders = [faction];
        if (territory.ownerFaction === faction) {
          territory.strength = Math.min(8, (territory.strength ?? 0) + count * 0.25);
        } else {
          const key = `${room.id}:${faction}`;
          const progress = (this.captureProgress.get(key) ?? 0) + count;
          this.captureProgress.set(key, progress);
          if (progress >= 4) {
            territory.ownerFaction = faction;
            territory.strength = count;
            this.captureProgress.delete(key);
            this.onEvent(`${faction} captured ${sim.roomName(room.id)}.`);
          }
        }
      }
      if (territory.ownerFaction || entries.length) this.territories.set(room.id, territory);
    }
  }

  findExpansionRoom(agent, sim) {
    const neighbors = sim.graph.get(agent.roomId) ?? [];
    return neighbors.find(roomId => {
      const territory = this.territories.get(roomId);
      const room = this.rooms.find(candidate => candidate.id === roomId);
      return !room?.tags?.includes('safe_zone') && territory?.ownerFaction && territory.ownerFaction !== agent.ecologyFaction;
    }) ?? neighbors.find(roomId => !this.territories.get(roomId)?.ownerFaction) ?? null;
  }

  findTrapRoom(agent, sim) {
    const neighbors = sim.graph.get(agent.homeRoomId) ?? [];
    return neighbors.find(roomId =>
      !this.traps.some(trap => trap.roomId === roomId) && !this.rooms.find(room => room.id === roomId)?.tags?.includes('safe_zone')
    ) ?? null;
  }

  moveTowardParty(agent, sim) {
    const target = this.nearestAgent(agent, sim, candidate => candidate.faction === 'party' && candidate.alive && !candidate.departed);
    return target ? moveToward(agent, sim, target.roomId) : null;
  }

  nearestCorpse(agent, sim, predicate = () => true) {
    const corpses = sim.ecosystem.corpses.filter(predicate);
    if (!corpses.length) return null;
    const roomId = nearestRoom(sim.graph, agent.roomId, [...new Set(corpses.map(corpse => corpse.roomId))]);
    return corpses.find(corpse => corpse.roomId === roomId) ?? corpses[0];
  }

  nearestAgent(agent, sim, predicate) {
    const candidates = sim.agents.filter(candidate => candidate.id !== agent.id && predicate(candidate));
    if (!candidates.length) return null;
    const roomId = nearestRoom(sim.graph, agent.roomId, [...new Set(candidates.map(candidate => candidate.roomId))]);
    return candidates.find(candidate => candidate.roomId === roomId) ?? candidates[0];
  }

  snapshot() {
    return {
      infections: this.infections.map(item => ({ ...item })),
      attachments: this.attachments.map(item => ({ ...item })),
      traps: this.traps.map(item => ({ ...item })),
      pendingSpawns: this.pendingSpawns.map(item => ({ ...item })),
      territories: [...this.territories.values()].map(item => ({
        ...item,
        color: ADVANCED_FACTION_COLORS[item.ownerFaction] ?? 0x888888
      })),
      lairs: [...this.lairs.values()].map(lair => ({ ...lair }))
    };
  }

  metrics() {
    return {
      infections: this.infections.length,
      attached: this.attachments.length,
      factionTraps: this.traps.length,
      contested: [...this.territories.values()].filter(room => room.contested).length,
      advancedBirths: this.pendingSpawns.length
    };
  }
}

function moveToward(agent, sim, targetRoomId) {
  const step = nextStep(sim.graph, agent.roomId, targetRoomId);
  if (!step || step === agent.roomId) return null;
  return { type: 'advanced-move', roomId: step };
}
