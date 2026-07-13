export class HeroNecromancySystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.summons = new Map();
    this.rites = [];
    this.sequence = 0;
    this.consumedCorpses = new Set();
    this.events = [];
  }

  update(dt, sim) {
    this.applyMalcorStench(dt, sim);
    const expired = [];
    for (const [id, summon] of this.summons) {
      const agent = findAgent(sim, id);
      if (!agent || agent.alive === false || agent.departed) {
        expired.push(id);
        continue;
      }
      summon.remaining -= dt;
      agent.heroSummonRemaining = summon.remaining;
      if (summon.remaining <= 0) {
        agent.alive = false;
        agent.hp = 0;
        agent.departed = true;
        expired.push(id);
      }
    }
    for (const id of expired) this.summons.delete(id);

    const liveRites = [];
    for (const rite of this.rites) {
      rite.remaining -= dt;
      if (rite.remaining > 0) liveRites.push(rite);
    }
    this.rites = liveRites;
    this.updateExternalStatuses(dt, sim);
  }

  reassembleRoyalSkeletons(owner, options = {}, sim) {
    const maximum = Math.max(1, options.maximum ?? 3);
    const duration = options.duration ?? 24;
    const corpses = this.corpsesInRoom(owner.roomId, sim).slice(0, maximum);
    const count = Math.max(1, Math.min(maximum, corpses.length || maximum));
    for (const corpse of corpses) this.consumeCorpse(corpse, sim, 'royal-reassembly');
    const summons = [];
    for (let index = 0; index < count; index += 1) {
      summons.push(this.spawnSummon(owner, {
        kind: 'royal-skeleton', role: options.role ?? 'skeleton', duration,
        hp: 30, attack: 7, armor: 3, courage: 18, size: 'medium', index
      }, sim));
    }
    this.rites.push({ id: `hero-rite-${this.sequence++}`, kind: 'royal-reassembly', ownerId: owner.id, heroId: owner.heroId, roomId: owner.roomId, remaining: duration, summonIds: summons.map(agent => agent.id) });
    this.emit(`${owner.name} ordered the dead back to their posts.`, { type: 'hero-necromancy-rite', heroId: owner.heroId, roomId: owner.roomId, summonIds: summons.map(agent => agent.id) });
    return summons;
  }

  consumeMemoryCorpse(owner, options = {}, sim) {
    const corpse = this.corpsesInRoom(owner.roomId, sim)[0];
    if (!corpse) return null;
    const role = String(corpse.role ?? corpse.sourceRole ?? corpse.species ?? 'unknown');
    this.consumeCorpse(corpse, sim, 'memory-flesh');
    owner.hp = Math.min(owner.maxHp ?? owner.hp, (owner.hp ?? 0) + (options.heal ?? 24));
    const buff = memoryBuffFor(role);
    owner.heroStatuses ??= {};
    owner.heroStatuses.memoryFlesh = { remaining: options.buffDuration ?? 14, role, modifier: buff };
    owner.heroStatModifiers ??= {};
    owner.heroStatModifiers.memoryFlesh = { ...buff };
    owner.memoryBuff = role;
    this.emit(`${owner.name} consumed a corpse and remembered ${role}.`, { type: 'hero-memory-flesh', heroId: owner.heroId, corpseId: corpse.id, role, roomId: owner.roomId });
    return { corpse, role, buff };
  }

  raiseGhoulPack(owner, options = {}, sim) {
    const maximum = Math.max(1, options.maximum ?? 3);
    const corpses = this.corpsesInRoom(owner.roomId, sim).slice(0, maximum);
    if (!corpses.length) return [];
    const summons = [];
    for (let index = 0; index < corpses.length; index += 1) {
      this.consumeCorpse(corpses[index], sim, 'ghoul-feast');
      summons.push(this.spawnSummon(owner, {
        kind: 'ghoul', role: 'ghoul', duration: options.duration ?? 28,
        hp: 38, attack: 9, armor: 1, courage: 15, size: 'medium', index
      }, sim));
    }
    this.rites.push({ id: `hero-rite-${this.sequence++}`, kind: 'ghoul-feast', ownerId: owner.id, heroId: owner.heroId, roomId: owner.roomId, remaining: options.duration ?? 28, summonIds: summons.map(agent => agent.id) });
    this.emit(`${owner.name} raised a ghoul pack from the feast.`, { type: 'hero-ghoul-pack', heroId: owner.heroId, roomId: owner.roomId, summonIds: summons.map(agent => agent.id) });
    return summons;
  }

  raiseSpectralGuards(owner, options = {}, sim) {
    const count = Math.max(1, options.count ?? 2);
    const summons = [];
    for (let index = 0; index < count; index += 1) {
      summons.push(this.spawnSummon(owner, {
        kind: 'spectral-guard', role: 'spectral-guard', duration: options.duration ?? 20,
        hp: 42, attack: 9, armor: 4, courage: 24, size: 'medium', index, incorporeal: true
      }, sim));
    }
    return summons;
  }

  spawnSummon(owner, spec, sim) {
    const id = `hero-summon-${spec.kind}-${this.sequence++}`;
    const offset = summonOffset(spec.index ?? 0);
    const agent = {
      id,
      name: summonName(spec.kind, this.sequence),
      role: spec.role,
      species: spec.role,
      faction: 'dungeon',
      ecologyFaction: factionOf(owner),
      factionId: factionOf(owner),
      roomId: owner.roomId,
      homeRoomId: owner.roomId,
      roomCell: { x: (owner.roomCell?.x ?? 0) + offset.x, z: (owner.roomCell?.z ?? 0) + offset.z },
      alive: true,
      departed: false,
      hidden: false,
      hp: spec.hp,
      maxHp: spec.hp,
      attack: spec.attack,
      baseAttack: spec.attack,
      armor: spec.armor,
      courage: spec.courage,
      speedMultiplier: spec.kind === 'ghoul' ? 1.12 : 0.92,
      size: spec.size,
      level: 1,
      index: (sim?.agents?.length ?? 0),
      heroSummonKind: spec.kind,
      heroSummonerId: owner.id,
      heroOwnerId: owner.heroId,
      heroSummonRemaining: spec.duration,
      incorporeal: spec.incorporeal === true,
      unique: false
    };
    sim?.agents?.push(agent);
    sim?.combatSystem?.initializeAgent?.(agent);
    this.summons.set(id, { id, ownerId: owner.id, heroId: owner.heroId, roomId: owner.roomId, kind: spec.kind, remaining: spec.duration, duration: spec.duration });
    sim?.emitEffect?.('hero-summon-emerge', { roomId: owner.roomId, agentId: id, duration: 1.1, heroId: owner.heroId, summonKind: spec.kind });
    return agent;
  }

  corpsesInRoom(roomId, sim) {
    const sources = [sim?.ecosystem?.corpses, sim?.ecosystemSystem?.corpses, sim?.corpseSystem?.corpses, sim?.corpses];
    const result = [];
    for (const source of sources) {
      if (!source) continue;
      const list = source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : Object.values(source);
      for (const corpse of list) {
        if (!corpse || corpse.roomId !== roomId || corpse.consumed || this.consumedCorpses.has(corpse.id)) continue;
        if (!result.some(existing => existing.id === corpse.id)) result.push(corpse);
      }
    }
    return result.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  corpseCount(roomId, sim) { return this.corpsesInRoom(roomId, sim).length; }

  consumeCorpse(corpse, sim, reason) {
    if (!corpse) return false;
    corpse.consumed = true;
    corpse.consumedByHero = reason;
    this.consumedCorpses.add(corpse.id);
    for (const source of [sim?.ecosystem?.corpses, sim?.ecosystemSystem?.corpses, sim?.corpseSystem?.corpses, sim?.corpses]) {
      if (source instanceof Map) source.delete(corpse.id);
      else if (Array.isArray(source)) {
        const index = source.findIndex(item => item.id === corpse.id);
        if (index >= 0) source.splice(index, 1);
      }
    }
    return true;
  }

  applyMalcorStench(dt, sim) {
    const malcor = (sim?.agents ?? []).find(agent => agent.heroId === 'hero.malcor' && agent.alive !== false && !agent.departed);
    for (const agent of sim?.agents ?? []) {
      if (agent.id === malcor?.id) continue;
      const status = agent.heroStatuses?.ghastStench;
      const affected = malcor && agent.roomId === malcor.roomId && factionOf(agent) !== factionOf(malcor) && !isUndead(agent);
      if (affected) {
        agent.heroStatuses ??= {};
        if (!status) {
          agent.heroStatuses.ghastStench = { remaining: 0.4, exposure: 0, originalAttack: agent.attack, originalHealingMultiplier: agent.healingReceivedMultiplier ?? 1 };
        }
        const next = agent.heroStatuses.ghastStench;
        next.remaining = 0.4;
        next.exposure += dt;
        agent.attack = Math.max(1, (next.originalAttack ?? agent.attack) * 0.88);
        agent.healingReceivedMultiplier = (next.originalHealingMultiplier ?? 1) * 0.7;
        if (next.exposure >= 4 && !next.retreated) {
          next.retreated = true;
          agent.combat = null;
          agent.heroStatuses.stagger = Math.max(agent.heroStatuses.stagger ?? 0, 0.8);
          sim?.emitEffect?.('hero-ghast-retch', { roomId: agent.roomId, agentId: agent.id, duration: 0.8, heroId: malcor.heroId });
        }
      }
    }
  }

  updateExternalStatuses(dt, sim) {
    for (const agent of sim?.agents ?? []) {
      const statuses = agent.heroStatuses;
      if (!statuses) continue;
      const stench = statuses.ghastStench;
      if (stench) {
        stench.remaining -= dt;
        if (stench.remaining <= 0) {
          agent.attack = stench.originalAttack;
          agent.healingReceivedMultiplier = stench.originalHealingMultiplier;
          delete statuses.ghastStench;
        }
      }
      const memory = statuses.memoryFlesh;
      if (memory) {
        memory.remaining -= dt;
        if (memory.remaining <= 0) {
          delete statuses.memoryFlesh;
          delete agent.heroStatModifiers?.memoryFlesh;
          agent.memoryBuff = null;
        }
      }
      const fear = statuses.heroFear;
      if (fear) {
        fear.remaining -= dt;
        if (fear.remaining <= 0) delete statuses.heroFear;
      }
      const paralysis = statuses.heroParalysis;
      if (paralysis) {
        paralysis.remaining -= dt;
        if (paralysis.remaining <= 0) delete statuses.heroParalysis;
      }
      const frenzy = statuses.ghoulFrenzy;
      if (frenzy) {
        frenzy.remaining -= dt;
        if (frenzy.remaining <= 0) {
          delete statuses.ghoulFrenzy;
          delete agent.heroStatModifiers?.ghoulFrenzy;
        }
      }
    }
  }

  applyGhoulFrenzy(owner, options = {}, sim) {
    let count = 0;
    for (const agent of sim?.agents ?? []) {
      if (agent.alive === false || agent.roomId !== owner.roomId || factionOf(agent) !== factionOf(owner) || !isGhoul(agent)) continue;
      agent.heroStatuses ??= {};
      agent.heroStatModifiers ??= {};
      agent.heroStatuses.ghoulFrenzy = { remaining: options.duration ?? 12 };
      agent.heroStatModifiers.ghoulFrenzy = { attack: Math.max(1, Math.round((agent.baseAttack ?? agent.attack ?? 1) * ((options.attackMultiplier ?? 1.18) - 1))), speedMultiplier: options.speedMultiplier ?? 1.12, courage: 3 };
      count += 1;
    }
    return count;
  }

  fearCone(owner, options = {}, sim) {
    const targets = roomHostiles(owner, sim).filter(target => inDirectionalArea(owner, target, options.length ?? 5.2, options.width ?? 3.5));
    for (const target of targets) {
      target.heroStatuses ??= {};
      target.heroStatuses.heroFear = { remaining: options.fearDuration ?? 4, sourceId: owner.id };
      target.heroStatuses.heroParalysis = { remaining: options.paralyzeDuration ?? 1.35, sourceId: owner.id };
      target.combat = null;
    }
    return targets.length;
  }

  isMovementBlocked(agent) { return Boolean(agent?.heroStatuses?.heroParalysis); }

  onAgentDeath(agent, sim) {
    if (!agent) return;
    if (agent.heroSummonKind) this.summons.delete(agent.id);
    if (agent.heroId === 'hero.aldren') {
      for (const summon of this.summons.values()) {
        if (summon.ownerId !== agent.id || summon.kind !== 'royal-skeleton') continue;
        const minion = findAgent(sim, summon.id);
        if (minion) { minion.alive = false; minion.hp = 0; minion.departed = true; }
      }
    }
    if (agent.heroId === 'hero.malcor') {
      for (const summon of this.summons.values()) {
        if (summon.ownerId !== agent.id || summon.kind !== 'ghoul') continue;
        const ghoul = findAgent(sim, summon.id);
        if (!ghoul) continue;
        ghoul.heroStatuses ??= {};
        ghoul.heroStatModifiers ??= {};
        ghoul.heroStatuses.ghoulFrenzy = { remaining: 9999, ownerDead: true };
        ghoul.heroStatModifiers.ghoulFrenzy = { attack: 3, speedMultiplier: 1.2, courage: 5 };
      }
    }
    if (agent.heroId === 'hero.arvek') {
      for (const summon of this.summons.values()) {
        if (summon.ownerId !== agent.id || summon.kind !== 'spectral-guard') continue;
        const guard = findAgent(sim, summon.id);
        if (guard) { guard.alive = false; guard.hp = 0; guard.departed = true; }
      }
    }
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 100);
    this.onEvent(text, meta);
  }

  snapshot() {
    return {
      summons: [...this.summons.values()].map(item => ({ ...item })),
      rites: this.rites.map(rite => ({ ...rite, summonIds: [...rite.summonIds] })),
      consumedCorpseIds: [...this.consumedCorpses],
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    return { heroNecromancySummons: this.summons.size, heroNecromancyRites: this.rites.length, heroCorpsesConsumed: this.consumedCorpses.size };
  }
}

function findAgent(sim, id) { return (sim?.agents ?? []).find(agent => agent.id === id) ?? null; }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function isUndead(agent) { const value = `${agent?.species ?? ''} ${agent?.role ?? ''}`.toLowerCase(); return ['skeleton', 'zombie', 'wraith', 'ghoul', 'ghast', 'undead', 'death-knight', 'spectral'].some(token => value.includes(token)); }
function isGhoul(agent) { return String(agent?.role ?? '').includes('ghoul') || agent?.heroSummonKind === 'ghoul'; }
function roomHostiles(owner, sim) { return (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === owner.roomId && factionOf(agent) !== factionOf(owner)); }
function worldPoint(agent) { return { x: (agent?.roomCell?.x ?? 0) + (agent?.heroPhysicsOffset?.x ?? 0), z: (agent?.roomCell?.z ?? 0) + (agent?.heroPhysicsOffset?.z ?? 0) }; }
function inDirectionalArea(owner, target, length, width) { const po = worldPoint(owner); const pt = worldPoint(target); const dx = pt.x - po.x; const dz = pt.z - po.z; const distance = Math.hypot(dx, dz); if (distance > length) return false; const facing = owner.heroFacing ?? (distance > 0 ? { x: dx / distance, z: dz / distance } : { x: 0, z: 1 }); const forward = dx * facing.x + dz * facing.z; const side = Math.abs(dx * -facing.z + dz * facing.x); return forward >= -0.1 && side <= width * 0.5; }
function summonOffset(index) { const angle = index * Math.PI * 2 / 3; return { x: Math.cos(angle) * 0.9, z: Math.sin(angle) * 0.9 }; }
function summonName(kind, sequence) { if (kind === 'royal-skeleton') return `Royal Skeleton ${sequence}`; if (kind === 'spectral-guard') return `Spectral Gate Guard ${sequence}`; return `Ghoul of the Feast ${sequence}`; }
function memoryBuffFor(role) { const lower = role.toLowerCase(); if (lower.includes('fighter') || lower.includes('orc') || lower.includes('guard')) return { armor: 2, courage: 2, speedMultiplier: 1 }; if (lower.includes('rogue') || lower.includes('rat')) return { armor: 0, courage: 1, speedMultiplier: 1.18 }; if (lower.includes('cleric') || lower.includes('priest')) return { armor: 1, courage: 3, speedMultiplier: 1, healingReceivedMultiplier: 1.25 }; if (lower.includes('wizard') || lower.includes('wraith')) return { armor: 1, courage: 2, speedMultiplier: 1, interruptResistance: 0.18 }; return { attack: 2, courage: 1, speedMultiplier: 1.05 }; }
