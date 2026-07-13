import { getHeroDefinition, isHeroRole } from '../../content/heroes/HeroDefinitions.js';

export class HeroLeadershipSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.activeEffects = [];
    this.appliedRoomIds = new Set();
    this.appliedJobIds = new Set();
    this.clock = 0;
  }

  update(dt, sim) {
    this.clock += dt;
    this.resetAgentModifiers(sim);
    this.resetRoomModifiers(sim);
    this.resetJobModifiers(sim);
    this.activeEffects = [];
    for (const hero of (sim?.agents ?? []).filter(agent => agent.alive !== false && isHeroRole(agent.role))) {
      const definition = getHeroDefinition(hero.heroId ?? hero.role);
      if (!definition || hero.heroState === 'dead') continue;
      if (definition.id === 'hero.nibble') this.applyNibble(hero, definition, sim);
      if (definition.id === 'hero.kirik') this.applyKirik(hero, definition, dt, sim);
      if (definition.id === 'hero.karg') this.applyKarg(hero, definition, sim);
      if (definition.id === 'hero.isara') this.applyIsara(hero, definition, sim);
      if (definition.id === 'hero.orum-bell') this.applyOrumBell(hero, definition, dt, sim);
      if (definition.id === 'hero.glop') this.applyGlop(hero, definition, dt, sim);
      if (definition.id === 'hero.jijik') this.applyJijik(hero, definition, sim);
      if (definition.id === 'hero.tissa') this.applyTissa(hero, definition, sim);
      if (definition.id === 'hero.murga') this.applyMurga(hero, definition, dt, sim);
      if (definition.id === 'hero.aldren') this.applyAldren(hero, definition, sim);
      if (definition.id === 'hero.malcor') this.applyMalcor(hero, definition, sim);
      if (definition.id === 'hero.arvek') this.applyArvek(hero, definition, sim);
    }
  }

  resetAgentModifiers(sim) {
    for (const agent of sim?.agents ?? []) {
      const applied = agent.heroLeadershipApplied;
      if (!applied) continue;
      if (Number.isFinite(applied.attack)) agent.attack = applied.attack;
      if (Number.isFinite(applied.courage)) agent.courage = applied.courage;
      if (Number.isFinite(applied.armor)) agent.armor = applied.armor;
      if (Number.isFinite(applied.speedMultiplier)) agent.speedMultiplier = applied.speedMultiplier;
      restoreOptional(agent, applied, 'heroBlastDamageMultiplier');
      restoreOptional(agent, applied, 'heroBlastImpulseMultiplier');
      restoreOptional(agent, applied, 'heroFireDamageMultiplier');
      restoreOptional(agent, applied, 'heroHungerRateMultiplier');
      restoreOptional(agent, applied, 'heroKnockbackResistance');
      delete agent.heroLeadershipApplied;
      delete agent.heroLeadershipSourceId;
    }
  }

  resetRoomModifiers(sim) {
    for (const roomId of this.appliedRoomIds) {
      const room = (sim?.rooms ?? []).find(candidate => candidate.id === roomId);
      if (!room) continue;
      delete room.heroRouteInspectionMultiplier;
      delete room.heroWaterHazardSuppression;
      delete room.heroLeadershipSourceId;
    }
    this.appliedRoomIds.clear();
    for (const hero of (sim?.agents ?? []).filter(agent => agent.role === 'hero-tissa')) hero.heroAquaticMode = false;
  }

  resetJobModifiers(sim) {
    for (const job of sim?.constructionSystem?.jobs ?? []) {
      if (!job?.heroLeadershipApplied || !this.appliedJobIds.has(job.id)) continue;
      restoreOptional(job, job.heroLeadershipApplied, 'heroSpeedMultiplier');
      restoreOptional(job, job.heroLeadershipApplied, 'heroStructureDamageBonus');
      delete job.heroLeadershipApplied;
      delete job.heroLeadershipSourceId;
    }
    this.appliedJobIds.clear();
  }

  applyNibble(hero, definition, sim) {
    const eligibleRooms = new Set([hero.roomId, ...(sim?.graph?.get?.(hero.roomId) ?? [])]);
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || factionOf(ally) !== definition.factionId || !eligibleRooms.has(ally.roomId)) continue;
      const baseline = capture(ally);
      ally.courage = baseline.courage + (definition.leadership.courageBonus ?? 0);
      if (ally.mood === 'retreating' || ally.retreatTargetRoomId) ally.speedMultiplier = baseline.speedMultiplier * (definition.leadership.retreatSpeedMultiplier ?? 1);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'market-network', affected });
  }

  applyKirik(hero, definition, dt, sim) {
    let repaired = 0;
    for (const structure of structures(sim)) {
      if (structure.roomId !== hero.roomId) continue;
      if (structure.factionId && structure.factionId !== definition.factionId) continue;
      const maximum = structure.maxHp ?? structure.maxIntegrity ?? 100;
      const amount = (definition.leadership.repairPerSecond ?? 0) * dt;
      if (Number.isFinite(structure.hp) && structure.hp < maximum) {
        structure.hp = Math.min(maximum, structure.hp + amount);
        repaired += amount;
      } else if (Number.isFinite(structure.integrity) && structure.integrity < maximum) {
        structure.integrity = Math.min(maximum, structure.integrity + amount);
        repaired += amount;
      }
    }
    for (const trap of sim?.advancedEcologySystem?.traps ?? []) {
      if (trap.roomId !== hero.roomId || trap.ownerFaction !== definition.factionId) continue;
      trap.cooldown = Math.max(0, (trap.cooldown ?? 0) - dt * 0.45);
    }
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      if (!String(ally.role).includes('gear') && !String(ally.role).includes('engine') && !ally.tags?.includes?.('construct')) continue;
      const baseline = capture(ally);
      ally.armor = baseline.armor + (definition.leadership.constructArmorBonus ?? 0);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
    }
    if (repaired > 0.001) this.activeEffects.push({ heroId: definition.id, type: 'field-maintenance', repaired: round(repaired) });
  }

  applyKarg(hero, definition, sim) {
    let affected = 0;
    const duelActive = Boolean(sim?.heroSkillSystem?.duelForHero?.(definition.id));
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      ally.attack = baseline.attack + (definition.leadership.orcAttackBonus ?? 0);
      ally.courage = baseline.courage + (definition.leadership.orcCourageBonus ?? 0) + (duelActive ? definition.leadership.duelMoraleBonus ?? 0 : 0);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'red-tusk-veteran', affected, duelActive });
  }

  applyIsara(hero, definition, sim) {
    const eligibleRooms = new Set([hero.roomId, ...(sim?.graph?.get?.(hero.roomId) ?? [])]);
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || factionOf(ally) !== definition.factionId || !eligibleRooms.has(ally.roomId)) continue;
      if (!String(ally.role ?? '').includes('wraith') && !ally.heroFormKind?.startsWith?.('shade')) continue;
      const baseline = capture(ally);
      ally.courage = baseline.courage + (definition.leadership.wraithCourageBonus ?? 0);
      ally.speedMultiplier = baseline.speedMultiplier * (definition.leadership.wraithSpeedMultiplier ?? 1);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      ally.heroStatuses ??= {};
      ally.heroStatuses.isaraProcession = { remaining: 0.35 };
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'black-veil-procession', affected });
  }

  applyOrumBell(hero, definition, dt, sim) {
    if (hero.communionEnabled === false || hero.heroStatuses?.solitaryBloom) return;
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      ally.courage = baseline.courage + (definition.leadership.myconidCourageBonus ?? 0);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      const maximum = ally.maxHp ?? ally.hp ?? 1;
      ally.hp = Math.min(maximum, (ally.hp ?? maximum) + (definition.leadership.regenerationPerSecond ?? 0) * dt);
      ally.heroStatuses ??= {};
      for (const key of ['fear', 'confusion']) {
        if (ally.heroStatuses[key]?.remaining) ally.heroStatuses[key].remaining *= Math.pow(definition.leadership.statusDurationMultiplier ?? 1, dt);
      }
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'spore-communion', affected });
  }

  applyGlop(hero, definition, dt, sim) {
    let affected = 0;
    const stance = hero.heroStance ?? 'crown';
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      if (stance === 'crown') ally.attack = baseline.attack + (definition.leadership.crownAttackBonus ?? 0);
      if (stance === 'key') ally.speedMultiplier = baseline.speedMultiplier * (definition.leadership.keySpeedMultiplier ?? 1);
      if (stance === 'throne') ally.armor = baseline.armor + (definition.leadership.throneArmorBonus ?? 0);
      if (stance === 'chalice') ally.hp = Math.min(ally.maxHp ?? ally.hp ?? 1, (ally.hp ?? 1) + (definition.leadership.chaliceRegenerationPerSecond ?? 0) * dt);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      ally.heroStatuses ??= {};
      ally.heroStatuses.royalRegalia = { remaining: 0.35, stance };
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'royal-regalia', affected, stance });
  }

  applyJijik(hero, definition, sim) {
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      ally.heroBlastDamageMultiplier = definition.leadership.friendlyBlastDamageMultiplier ?? 0;
      ally.heroBlastImpulseMultiplier = definition.leadership.friendlyBlastImpulseMultiplier ?? 0.72;
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    for (const job of sim?.constructionSystem?.jobs ?? []) {
      if (job.roomId !== hero.roomId || job.factionId && job.factionId !== definition.factionId) continue;
      if (!['demolish', 'breach', 'siege'].some(token => String(job.type ?? job.kind ?? '').includes(token))) continue;
      job.heroLeadershipApplied = {
        heroSpeedMultiplier: job.heroSpeedMultiplier,
        heroStructureDamageBonus: job.heroStructureDamageBonus
      };
      job.heroSpeedMultiplier = Math.max(job.heroSpeedMultiplier ?? 1, definition.leadership.demolitionSpeedMultiplier ?? 1.25);
      job.heroStructureDamageBonus = definition.leadership.structureDamageBonus ?? 0.2;
      job.heroLeadershipSourceId = definition.id;
      this.appliedJobIds.add(job.id);
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'calculated-blast', affected });
  }

  applyTissa(hero, definition, sim) {
    const room = (sim.rooms ?? []).find(candidate => candidate.id === hero.roomId);
    const flooded = isFlooded(room);
    hero.heroAquaticMode = flooded;
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      if (flooded) ally.speedMultiplier = baseline.speedMultiplier * (definition.leadership.floodedMoveMultiplier ?? 1.25);
      ally.heroFireDamageMultiplier = definition.leadership.fireDamageMultiplier ?? 0.7;
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    if (room) {
      room.heroRouteInspectionMultiplier = definition.leadership.routeInspectionMultiplier ?? 1.8;
      room.heroWaterHazardSuppression = definition.leadership.waterHazardSuppression ?? 0.35;
      room.heroLeadershipSourceId = definition.id;
      this.appliedRoomIds.add(room.id);
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'flood-adaptation', affected, flooded });
  }

  applyMurga(hero, definition, dt, sim) {
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      const baseline = capture(ally);
      ally.courage = baseline.courage + (definition.leadership.orcCourageBonus ?? 2);
      ally.heroHungerRateMultiplier = definition.leadership.hungerRateMultiplier ?? 0.55;
      ally.fear = Math.max(0, (ally.fear ?? 0) - (definition.leadership.fearRecoveryPerSecond ?? 0.4) * dt);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'army-eats-first', affected });
  }

  applyAldren(hero, definition, sim) {
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      if (!isSkeletonLike(ally)) continue;
      const baseline = capture(ally);
      ally.armor = baseline.armor + (definition.leadership.skeletonArmorBonus ?? 2);
      ally.courage = baseline.courage + (definition.leadership.skeletonCourageBonus ?? 3);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      ally.heroKnockbackResistance = Math.min(0.9, (ally.heroKnockbackResistance ?? 0) + (definition.leadership.knockbackResistanceBonus ?? 0.25));
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'unfinished-watch', affected });
  }

  applyMalcor(hero, definition, sim) {
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      if (!isGhoulLike(ally)) continue;
      const baseline = capture(ally);
      ally.attack = baseline.attack + (definition.leadership.ghoulAttackBonus ?? 2);
      ally.speedMultiplier = baseline.speedMultiplier * (definition.leadership.ghoulSpeedMultiplier ?? 1.12);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      ally.fear = 0;
      affected += 1;
    }
    if (affected) this.activeEffects.push({ heroId: definition.id, type: 'ghast-lord', affected });
  }

  applyArvek(hero, definition, sim) {
    const barrierActive = Boolean(sim?.heroBarrierSystem?.nearestBarrier?.(hero.roomId, definition.factionId));
    let affected = 0;
    for (const ally of sim?.agents ?? []) {
      if (ally.id === hero.id || ally.alive === false || ally.roomId !== hero.roomId || factionOf(ally) !== definition.factionId) continue;
      if (!isUndeadLike(ally)) continue;
      const baseline = capture(ally);
      ally.armor = baseline.armor + (definition.leadership.undeadArmorBonus ?? 2) + (barrierActive ? 1 : 0);
      ally.courage = baseline.courage + (barrierActive ? 2 : 1);
      ally.heroLeadershipApplied = baseline;
      ally.heroLeadershipSourceId = definition.id;
      affected += 1;
    }
    if (affected || barrierActive) this.activeEffects.push({ heroId: definition.id, type: 'gatekeeper-command', affected, barrierActive });
  }

  snapshot() {
    return { activeEffects: this.activeEffects.map(effect => ({ ...effect })) };
  }

  metrics() {
    return { heroLeadershipEffectsActive: this.activeEffects.length };
  }
}

function capture(agent) {
  return {
    attack: Number.isFinite(agent.attack) ? agent.attack : 0,
    courage: Number.isFinite(agent.courage) ? agent.courage : 0,
    armor: Number.isFinite(agent.armor) ? agent.armor : 0,
    speedMultiplier: Number.isFinite(agent.speedMultiplier) ? agent.speedMultiplier : 1,
    heroBlastDamageMultiplier: agent.heroBlastDamageMultiplier,
    heroBlastImpulseMultiplier: agent.heroBlastImpulseMultiplier,
    heroFireDamageMultiplier: agent.heroFireDamageMultiplier,
    heroHungerRateMultiplier: agent.heroHungerRateMultiplier,
    heroKnockbackResistance: agent.heroKnockbackResistance
  };
}

function restoreOptional(target, baseline, key) {
  if (Object.prototype.hasOwnProperty.call(baseline, key) && baseline[key] !== undefined) target[key] = baseline[key];
  else delete target[key];
}

function isFlooded(room) {
  if (!room) return false;
  const tags = new Set(room.tags ?? []);
  return room.waterLevel > 0 || room.heroEnvironmentState === 'flooded' || ['flooded', 'water', 'reservoir', 'flood-hazard'].some(tag => tags.has(tag));
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function isSkeletonLike(agent) { const value = `${agent?.role ?? ''} ${agent?.species ?? ''}`.toLowerCase(); return value.includes('skeleton') || agent?.heroSummonKind === 'royal-skeleton'; }

function isGhoulLike(agent) { const value = `${agent?.role ?? ''} ${agent?.species ?? ''}`.toLowerCase(); return value.includes('ghoul') || value.includes('ghast'); }

function isUndeadLike(agent) { const value = `${agent?.role ?? ''} ${agent?.species ?? ''}`.toLowerCase(); return ['skeleton','zombie','wraith','ghoul','ghast','undead','spectral','death-knight'].some(token => value.includes(token)); }

function structures(sim) {
  const source = sim?.constructionSystem?.structures ?? sim?.construction?.structures ?? [];
  return source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : Object.values(source ?? {});
}

function round(value) {
  return Math.round(value * 100) / 100;
}
