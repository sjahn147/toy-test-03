import { getHeroDefinition, isHeroRole } from '../../content/heroes/HeroDefinitions.js';
import { decideHeroAction } from './HeroAI.js';
import { ensureHeroRuntime, recomputeHeroStats } from './HeroSystem.js';

const TRAP_MODES = ['damage', 'slow', 'alarm', 'capture'];

export class HeroSkillSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.clock = 0;
    this.sequence = 0;
    this.routeLocks = [];
    this.zones = [];
    this.duels = [];
    this.events = [];
    this.castCount = 0;
    this.interruptCount = 0;
  }

  initialize(sim) {
    for (const agent of sim?.agents ?? []) this.initializeAgent(agent);
  }

  initializeAgent(agent) {
    const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
    if (!definition) return false;
    ensureHeroRuntime(agent, definition);
    agent.heroCooldowns ??= {};
    agent.heroStatuses ??= {};
    agent.heroCast ??= null;
    agent.heroCastLastHp ??= agent.hp;
    return true;
  }

  update(dt, sim) {
    this.clock += dt;
    this.updateRouteLocks(dt, sim);
    this.updateZones(dt, sim);
    this.updateDuels(dt, sim);
    this.updateExternalStatuses(dt, sim);

    for (const agent of sim?.agents ?? []) {
      const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
      if (!definition) continue;
      this.initializeAgent(agent);
      for (const [skillId, remaining] of Object.entries(agent.heroCooldowns)) {
        agent.heroCooldowns[skillId] = Math.max(0, remaining - dt);
      }
      this.updateHeroStatuses(agent, definition, dt, sim);
      if (agent.heroCast) this.updateCast(agent, definition, dt, sim);
      agent.heroCastLastHp = agent.hp;
      recomputeHeroStats(agent, definition);
    }
  }

  decide(agent, sim) {
    if (!isHeroRole(agent?.role)) return null;
    return decideHeroAction(agent, sim, this);
  }

  resolve(agent, action, sim) {
    if (action?.type !== 'hero-cast') return false;
    const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
    const skill = definition?.skills.find(candidate => candidate.id === action.skillId);
    if (!definition || !skill || !this.canCast(agent, skill)) return false;
    agent.heroCast = {
      id: `hero-cast-${this.sequence++}`,
      heroId: definition.id,
      skillId: skill.id,
      phase: 'windup',
      elapsed: 0,
      duration: skill.windup,
      targetId: action.targetId ?? null,
      targetRoomId: action.targetRoomId ?? agent.roomId,
      targetRouteId: action.targetRouteId ?? null,
      targetTrapId: action.targetTrapId ?? null,
      targetStructureId: action.targetStructureId ?? null,
      startHp: agent.hp,
      impactApplied: false
    };
    agent.heroCastLastHp = agent.hp;
    this.castCount += 1;
    sim?.emitEffect?.('hero-telegraph', {
      roomId: action.targetRoomId ?? agent.roomId,
      agentId: agent.id,
      duration: skill.windup,
      heroId: definition.id,
      skillId: skill.id,
      shape: skill.telegraph.shape,
      radius: skill.telegraph.radius,
      length: skill.telegraph.length,
      width: skill.telegraph.width,
      colorRole: skill.telegraph.colorRole,
      cue: skill.telegraph.cue
    });
    this.emit(`${definition.displayName} began ${skill.name}.`, {
      type: 'hero-skill-start', heroId: definition.id, agentId: agent.id, skillId: skill.id, roomId: agent.roomId
    });
    return true;
  }

  canCast(agent, skill) {
    return Boolean(agent?.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.travel && !agent.combat && !agent.heroCast && (agent.heroCooldowns?.[skill.id] ?? 0) <= 0);
  }

  updateCast(agent, definition, dt, sim) {
    const cast = agent.heroCast;
    const skill = definition.skills.find(candidate => candidate.id === cast.skillId);
    if (!skill) {
      agent.heroCast = null;
      return;
    }
    const recentLoss = Math.max(0, (agent.heroCastLastHp ?? agent.hp) - (agent.hp ?? 0));
    const threshold = agent.maxHp * Math.max(0.04, skill.interruptDamageRatio - (agent.heroInterruptResistance ?? 0));
    if (cast.phase === 'windup' && recentLoss >= threshold) {
      this.interrupt(agent, 'heavy-damage', sim);
      return;
    }
    if (agent.alive === false || agent.downed) {
      this.interrupt(agent, 'incapacitated', sim);
      return;
    }

    cast.elapsed += dt;
    if (cast.elapsed < cast.duration) return;

    if (cast.phase === 'windup') {
      cast.phase = 'impact';
      cast.elapsed = 0;
      cast.duration = skill.impactDuration;
      if (!cast.impactApplied) {
        cast.impactApplied = true;
        this.applySkill(agent, definition, skill, cast, sim);
      }
      return;
    }
    if (cast.phase === 'impact') {
      cast.phase = 'recovery';
      cast.elapsed = 0;
      cast.duration = skill.recovery;
      return;
    }

    agent.heroCooldowns[skill.id] = skill.cooldown;
    agent.heroCast = null;
    this.emit(`${definition.displayName} completed ${skill.name}.`, {
      type: 'hero-skill-complete', heroId: definition.id, agentId: agent.id, skillId: skill.id, roomId: agent.roomId
    });
  }

  interrupt(agent, reason, sim) {
    const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
    const skillId = agent?.heroCast?.skillId;
    if (!definition || !skillId) return false;
    agent.heroCooldowns[skillId] = Math.max(agent.heroCooldowns[skillId] ?? 0, 2.5);
    agent.heroCast = null;
    this.interruptCount += 1;
    sim?.emitEffect?.('hero-interrupt', { roomId: agent.roomId, agentId: agent.id, duration: 0.65, heroId: definition.id, skillId, cue: reason });
    this.emit(`${definition.displayName}'s ${skillId} was interrupted.`, {
      type: 'hero-skill-interrupted', heroId: definition.id, agentId: agent.id, skillId, reason, roomId: agent.roomId
    });
    return true;
  }

  applySkill(agent, definition, skill, cast, sim) {
    for (const effect of skill.effects) this.applyEffect(effect, agent, definition, cast, sim);
    sim?.emitEffect?.('hero-impact', {
      roomId: cast.targetRoomId ?? agent.roomId,
      agentId: agent.id,
      duration: 0.8,
      heroId: definition.id,
      skillId: skill.id,
      shape: skill.telegraph.shape,
      radius: skill.telegraph.radius,
      colorRole: skill.telegraph.colorRole
    });
  }

  applyEffect(effect, agent, definition, cast, sim) {
    switch (effect.type) {
      case 'temporary-route-lock': return this.lockRoutes(agent, definition, effect, sim);
      case 'unlock-nearest-route': return this.unlockRoute(agent, cast, sim);
      case 'hijack-nearest-trap': return this.hijackTrap(agent, cast, effect, sim);
      case 'order-faction-retreat': return this.orderRetreat(agent, definition, effect, sim);
      case 'self-retreat-last': return this.retreatHeroLast(agent, sim);
      case 'deploy-slow-zone': return this.deploySlowZone(agent, definition, effect, sim);
      case 'stagger-large-on-entry': return true;
      case 'cycle-trap-mode': return this.reconfigureTrap(agent, cast, effect, sim);
      case 'repair-nearest-structure': return this.repairStructure(agent, cast, effect, sim);
      case 'enter-bastion': return this.enterBastion(agent, definition, effect, sim);
      case 'repair-aura': return this.addRepairAura(agent, definition, effect, sim);
      case 'trap-overclock-aura': return true;
      case 'declare-duel': return this.declareDuel(agent, definition, cast, effect, sim);
      case 'morale-on-flee': return true;
      case 'room-area-damage': return this.roomAreaDamage(agent, effect, sim);
      case 'room-stagger': return this.roomStagger(agent, effect, sim);
      case 'armor-break': return this.roomArmorBreak(agent, effect, sim);
      case 'second-defeat-stance': return this.enterSecondDefeat(agent, definition, effect, sim);
      case 'drop-armor-prop': return this.dropArmor(agent, sim);
      case 'emit-command': return true;
      default: return false;
    }
  }

  lockRoutes(agent, definition, effect, sim) {
    const routes = this.connectedRoutes(agent.roomId, sim)
      .filter(route => route.active !== false)
      .filter(route => !this.routeLocks.some(lock => lock.routeId === route.id))
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0) || String(a.id).localeCompare(String(b.id)))
      .slice(0, effect.maximum ?? 2);
    for (const route of routes) {
      const lock = {
        id: `hero-route-lock-${this.sequence++}`,
        routeId: route.id,
        from: route.from ?? route.aId,
        to: route.to ?? route.bId,
        roomId: agent.roomId,
        heroId: definition.id,
        allowFaction: effect.allowFaction ?? definition.factionId,
        remaining: effect.duration ?? 8
      };
      this.routeLocks.push(lock);
      sim?.emitEffect?.('hero-route-lock', {
        roomId: agent.roomId,
        agentId: agent.id,
        duration: lock.remaining,
        heroId: definition.id,
        routeId: lock.routeId,
        colorRole: 'goblin-brass'
      });
    }
    return routes.length > 0;
  }

  unlockRoute(agent, cast, sim) {
    const target = cast.targetRouteId ? sim.routeGraph?.getRoute?.(cast.targetRouteId) : this.selectUnlockableTarget(agent, sim)?.route ?? null;
    if (!target || !sim.setRouteState) return false;
    const next = target.kind === 'secret' ? 'opened' : target.kind === 'conditional' ? 'opened' : 'open';
    const result = sim.setRouteState(target.id, next, { source: 'hero.nibble', actorId: agent.id });
    if (result?.ok) {
      this.emit(`${agent.displayName ?? agent.name} opened ${target.id} with the master key.`, {
        type: 'hero-route-unlocked', heroId: agent.heroId, routeId: target.id, roomId: agent.roomId
      });
      return true;
    }
    return false;
  }

  hijackTrap(agent, cast, effect, sim) {
    const trap = cast.targetTrapId
      ? this.allTraps(sim).find(candidate => candidate.id === cast.targetTrapId)
      : this.allTraps(sim).find(candidate => candidate.roomId === agent.roomId && candidate.ownerFaction !== agent.ecologyFaction);
    if (!trap) return false;
    trap.ownerFaction = agent.ecologyFaction;
    trap.charges = Math.max(effect.charges ?? 1, trap.charges ?? 0);
    trap.cooldown = 0;
    trap.mode ??= 'damage';
    this.emit(`${agent.displayName ?? agent.name} claimed trap ${trap.id}.`, {
      type: 'hero-trap-hijacked', heroId: agent.heroId, trapId: trap.id, roomId: agent.roomId
    });
    return true;
  }

  orderRetreat(agent, definition, effect, sim) {
    const allies = (sim.agents ?? []).filter(candidate => candidate.id !== agent.id && candidate.alive !== false && candidate.roomId === agent.roomId && factionOf(candidate) === effect.factionId);
    let ordered = 0;
    for (const ally of allies) {
      if (ally.heroStatuses?.secondDefeat?.noRetreat) continue;
      ally.combat = null;
      ally.mood = 'retreating';
      const destination = this.retreatDestination(ally, sim, agent.roomId);
      ally.retreatTargetRoomId = destination;
      if (destination && !ally.travel) sim.beginTravel?.(ally, destination);
      ordered += 1;
    }
    if (effect.preserveCargo) this.preserveFactionCargo(effect.factionId, agent.roomId, sim);
    return ordered > 0;
  }

  retreatHeroLast(agent, sim) {
    const destination = this.retreatDestination(agent, sim, agent.roomId);
    if (!destination) return false;
    agent.heroStatuses.retreatLast = { remaining: 0.9, destination };
    return true;
  }

  deploySlowZone(agent, definition, effect, sim) {
    const zone = {
      id: `hero-zone-${this.sequence++}`,
      kind: 'gear-lockfield',
      heroId: definition.id,
      factionId: definition.factionId,
      roomId: agent.roomId,
      remaining: effect.duration ?? 8,
      multiplier: effect.multiplier ?? 0.65,
      affected: new Set()
    };
    this.zones.push(zone);
    sim?.emitEffect?.('hero-zone', { roomId: agent.roomId, agentId: agent.id, duration: zone.remaining, heroId: definition.id, shape: 'three-gear-circle', radius: effect.radius ?? 3.4, colorRole: 'kobold-copper' });
    return true;
  }

  reconfigureTrap(agent, cast, effect, sim) {
    const trap = cast.targetTrapId ? this.allTraps(sim).find(candidate => candidate.id === cast.targetTrapId) : this.findFriendlyTrap(agent, sim);
    if (!trap) return false;
    const modes = effect.modes ?? TRAP_MODES;
    const index = Math.max(0, modes.indexOf(trap.mode ?? 'damage'));
    trap.mode = modes[(index + 1) % modes.length];
    trap.ownerFaction = agent.ecologyFaction;
    trap.charges = Math.max(1, (trap.charges ?? 0) + (effect.addCharges ?? 0));
    trap.cooldown = 0;
    trap.heroModifiedBy = agent.heroId;
    this.emit(`${agent.displayName ?? agent.name} reconfigured ${trap.id} to ${trap.mode}.`, { type: 'hero-trap-reconfigured', heroId: agent.heroId, trapId: trap.id, mode: trap.mode, roomId: agent.roomId });
    return true;
  }

  repairStructure(agent, cast, effect, sim) {
    const structure = cast.targetStructureId ? this.allStructures(sim).find(candidate => candidate.id === cast.targetStructureId) : this.findDamagedFriendlyStructure(agent, sim);
    if (!structure) return false;
    const maximum = structure.maxHp ?? structure.maxIntegrity ?? 100;
    if (Number.isFinite(structure.hp)) structure.hp = Math.min(maximum, structure.hp + (effect.amount ?? 10));
    else structure.integrity = Math.min(maximum, (structure.integrity ?? 0) + (effect.amount ?? 10));
    structure.repairedByHeroId = agent.heroId;
    return true;
  }

  enterBastion(agent, definition, effect, sim) {
    agent.heroStatuses.bastion = { remaining: effect.duration ?? 12, rooted: effect.rooted !== false, armorBonus: effect.armorBonus ?? 5 };
    agent.heroStatModifiers.skill = { attack: 0, armor: effect.armorBonus ?? 5, courage: 2, speedMultiplier: 1, interruptResistance: 0.25 };
    agent.heroVariant = 'triangle-bastion';
    recomputeHeroStats(agent, definition);
    return true;
  }

  addRepairAura(agent, definition, effect, sim) {
    const zone = {
      id: `hero-zone-${this.sequence++}`,
      kind: 'repair-aura',
      heroId: definition.id,
      factionId: definition.factionId,
      roomId: agent.roomId,
      remaining: effect.duration ?? 12,
      amountPerSecond: effect.amountPerSecond ?? 1,
      affected: new Set()
    };
    this.zones.push(zone);
    sim?.emitEffect?.('hero-zone', { roomId: agent.roomId, agentId: agent.id, duration: zone.remaining, heroId: definition.id, shape: 'triangle', radius: effect.radius ?? 5, colorRole: 'kobold-blue' });
    return true;
  }

  declareDuel(agent, definition, cast, effect, sim) {
    const target = (sim.agents ?? []).find(candidate => candidate.id === cast.targetId && candidate.alive !== false && candidate.roomId === agent.roomId);
    if (!target) return false;
    const duel = {
      id: `hero-duel-${this.sequence++}`,
      heroId: definition.id,
      heroAgentId: agent.id,
      targetId: target.id,
      roomId: agent.roomId,
      remaining: effect.duration ?? 11,
      damageBonus: effect.damageBonus ?? 0.25,
      offTargetPenalty: effect.offTargetPenalty ?? 0.35,
      targetFled: false
    };
    this.duels.push(duel);
    agent.heroStatuses.duel = { duelId: duel.id, targetId: target.id, remaining: duel.remaining };
    target.heroStatuses ??= {};
    target.heroStatuses.duel = { duelId: duel.id, targetId: agent.id, remaining: duel.remaining };
    sim?.emitEffect?.('hero-duel', { roomId: agent.roomId, agentId: agent.id, duration: duel.remaining, heroId: definition.id, targetId: target.id, radius: 2.8, colorRole: 'orc-red' });
    return true;
  }

  roomAreaDamage(agent, effect, sim) {
    const hostiles = this.hostilesInRoom(agent, sim);
    for (const target of hostiles) sim.applyCombatDamage?.(agent, target, effect.amount ?? 8, { melee: true, heroSkill: true });
    return hostiles.length > 0;
  }

  roomStagger(agent, effect, sim) {
    for (const target of this.hostilesInRoom(agent, sim)) {
      target.heroStatuses ??= {};
      target.heroStatuses.stagger = { remaining: effect.duration ?? 1 };
      target.combat = null;
    }
    return true;
  }

  roomArmorBreak(agent, effect, sim) {
    for (const target of this.hostilesInRoom(agent, sim)) {
      target.heroStatuses ??= {};
      if (!target.heroStatuses.armorBreak) target.heroStatuses.armorBreak = { remaining: 6, originalArmor: target.armor ?? 0 };
      target.armor = Math.max(0, (target.armor ?? 0) - (effect.amount ?? 1));
    }
    return true;
  }

  enterSecondDefeat(agent, definition, effect, sim) {
    agent.heroStatuses.secondDefeat = {
      remaining: effect.duration ?? 16,
      noRetreat: effect.noRetreat !== false,
      staggerImmune: effect.staggerImmune !== false
    };
    agent.heroStatModifiers.skill = {
      attack: effect.attackBonus ?? 4,
      armor: -(effect.armorPenalty ?? 4),
      courage: 4,
      speedMultiplier: effect.speedMultiplier ?? 1.24,
      interruptResistance: 0.5
    };
    agent.heroVariant = 'second-defeat';
    agent.heroFlags = [...new Set([...(agent.heroFlags ?? []), 'second-defeat-used'])];
    recomputeHeroStats(agent, definition);
    return true;
  }

  dropArmor(agent, sim) {
    sim?.emitEffect?.('hero-armor-drop', { roomId: agent.roomId, agentId: agent.id, duration: 12, heroId: agent.heroId, colorRole: 'orc-red' });
    return true;
  }

  updateRouteLocks(dt, sim) {
    for (const lock of this.routeLocks) lock.remaining -= dt;
    this.routeLocks = this.routeLocks.filter(lock => lock.remaining > 0);
  }

  updateZones(dt, sim) {
    for (const zone of this.zones) {
      zone.remaining -= dt;
      if (zone.kind === 'gear-lockfield') {
        for (const target of (sim.agents ?? []).filter(candidate => candidate.alive !== false && candidate.roomId === zone.roomId && factionOf(candidate) !== zone.factionId)) {
          applyExternalSlow(target, zone.multiplier, 0.35, zone.id);
          if (['large', 'huge'].includes(target.size) && !zone.affected.has(target.id)) {
            target.heroStatuses ??= {};
            target.heroStatuses.stagger = { remaining: 1.2 };
            target.combat = null;
          }
          zone.affected.add(target.id);
        }
      } else if (zone.kind === 'repair-aura') {
        for (const structure of this.allStructures(sim).filter(candidate => candidate.roomId === zone.roomId && (!candidate.factionId || candidate.factionId === zone.factionId))) {
          const maximum = structure.maxHp ?? structure.maxIntegrity ?? 100;
          if (Number.isFinite(structure.hp)) structure.hp = Math.min(maximum, structure.hp + zone.amountPerSecond * dt);
          else structure.integrity = Math.min(maximum, (structure.integrity ?? 0) + zone.amountPerSecond * dt);
        }
        for (const trap of this.allTraps(sim).filter(candidate => candidate.roomId === zone.roomId && candidate.ownerFaction === zone.factionId)) {
          trap.cooldown = Math.max(0, (trap.cooldown ?? 0) - dt * 1.5);
          trap.heroOverclocked = true;
        }
      }
    }
    this.zones = this.zones.filter(zone => zone.remaining > 0);
  }

  updateDuels(dt, sim) {
    for (const duel of this.duels) {
      duel.remaining -= dt;
      const hero = (sim.agents ?? []).find(agent => agent.id === duel.heroAgentId);
      const target = (sim.agents ?? []).find(agent => agent.id === duel.targetId);
      if (!hero?.alive || !target?.alive || hero.roomId !== target.roomId) {
        if (target?.alive && hero?.alive && hero.roomId !== target.roomId) duel.targetFled = true;
        duel.remaining = 0;
      }
      if (hero?.heroStatuses?.duel) hero.heroStatuses.duel.remaining = Math.max(0, duel.remaining);
      if (target?.heroStatuses?.duel) target.heroStatuses.duel.remaining = Math.max(0, duel.remaining);
    }
    const expired = this.duels.filter(duel => duel.remaining <= 0);
    for (const duel of expired) {
      const hero = (sim.agents ?? []).find(agent => agent.id === duel.heroAgentId);
      const target = (sim.agents ?? []).find(agent => agent.id === duel.targetId);
      if (hero?.heroStatuses) delete hero.heroStatuses.duel;
      if (target?.heroStatuses) delete target.heroStatuses.duel;
      if (duel.targetFled) {
        for (const ally of (sim.agents ?? []).filter(agent => agent.alive !== false && agent.roomId === hero?.roomId && factionOf(agent) === 'red-tusk-tribe')) ally.courage = (ally.courage ?? 0) + 2;
      }
    }
    this.duels = this.duels.filter(duel => duel.remaining > 0);
  }

  updateHeroStatuses(agent, definition, dt, sim) {
    const statuses = agent.heroStatuses ?? {};
    if (statuses.retreatLast) {
      statuses.retreatLast.remaining -= dt;
      if (statuses.retreatLast.remaining <= 0) {
        const destination = statuses.retreatLast.destination;
        delete statuses.retreatLast;
        agent.combat = null;
        agent.mood = 'retreating';
        if (destination && !agent.travel) sim.beginTravel?.(agent, destination);
      }
    }
    for (const key of ['bastion', 'secondDefeat']) {
      const status = statuses[key];
      if (!status) continue;
      status.remaining -= dt;
      if (status.remaining > 0) continue;
      delete statuses[key];
      if (key === 'bastion' || key === 'secondDefeat') delete agent.heroStatModifiers.skill;
      if (key === 'bastion') agent.heroVariant = null;
      if (key === 'secondDefeat') agent.heroVariant = 'unarmored';
      recomputeHeroStats(agent, definition);
    }
  }

  updateExternalStatuses(dt, sim) {
    for (const agent of sim?.agents ?? []) {
      const statuses = agent.heroStatuses;
      if (!statuses) continue;
      const slow = statuses.externalSlow;
      if (slow) {
        slow.remaining -= dt;
        if (slow.remaining <= 0) {
          agent.speedMultiplier = slow.originalSpeedMultiplier;
          delete statuses.externalSlow;
        }
      }
      const stagger = statuses.stagger;
      if (stagger) {
        stagger.remaining -= dt;
        if (stagger.remaining <= 0) delete statuses.stagger;
      }
      const armorBreak = statuses.armorBreak;
      if (armorBreak) {
        armorBreak.remaining -= dt;
        if (armorBreak.remaining <= 0) {
          agent.armor = armorBreak.originalArmor;
          delete statuses.armorBreak;
        }
      }
    }
  }

  isRouteBlocked(fromRoomId, toRoomId, agent) {
    const lock = this.routeLocks.find(candidate => pairMatches(candidate, fromRoomId, toRoomId));
    if (!lock) return false;
    return factionOf(agent) !== lock.allowFaction;
  }

  isMovementBlocked(agent) {
    return Boolean(agent?.heroStatuses?.bastion?.rooted);
  }

  modifyOutgoingDamage(attacker, target, amount) {
    let result = amount;
    const duel = this.duels.find(candidate => candidate.heroAgentId === attacker?.id || candidate.targetId === attacker?.id);
    if (duel) {
      const opponent = duel.heroAgentId === attacker.id ? duel.targetId : duel.heroAgentId;
      if (target?.id === opponent) result *= 1 + duel.damageBonus;
      else result *= Math.max(0.1, 1 - duel.offTargetPenalty);
    }
    return Math.max(1, Math.round(result));
  }

  hasRoomRouteLock(roomId) {
    return this.routeLocks.some(lock => lock.roomId === roomId);
  }

  hasSlowZone(roomId, factionId) {
    return this.zones.some(zone => zone.kind === 'gear-lockfield' && zone.roomId === roomId && zone.factionId === factionId && zone.remaining > 0);
  }

  duelForHero(heroId) {
    return this.duels.find(duel => duel.heroId === heroId && duel.remaining > 0) ?? null;
  }

  hasUnlockableTarget(agent, sim) {
    return Boolean(this.selectUnlockableTarget(agent, sim));
  }

  selectUnlockableTarget(agent, sim) {
    const route = this.connectedRoutes(agent.roomId, sim).find(candidate => {
      if (candidate.active) return false;
      if (candidate.kind === 'conditional') return candidate.state === 'locked' || candidate.state === 'opening';
      if (candidate.kind === 'secret') return ['suspected', 'discovered'].includes(candidate.state);
      return ['blocked', 'barricaded'].includes(candidate.state);
    });
    if (route) return { targetRouteId: route.id, targetRoomId: agent.roomId, route };
    const trap = this.allTraps(sim).find(candidate => candidate.roomId === agent.roomId && candidate.ownerFaction !== agent.ecologyFaction);
    return trap ? { targetTrapId: trap.id, targetRoomId: agent.roomId, trap } : null;
  }

  findFriendlyTrap(agent, sim) {
    return this.allTraps(sim).find(candidate => candidate.roomId === agent.roomId && candidate.ownerFaction === agent.ecologyFaction) ?? null;
  }

  findDamagedFriendlyStructure(agent, sim) {
    return this.allStructures(sim).find(candidate => {
      if (candidate.roomId !== agent.roomId) return false;
      if (candidate.factionId && candidate.factionId !== agent.ecologyFaction) return false;
      const current = Number.isFinite(candidate.hp) ? candidate.hp : candidate.integrity;
      const maximum = candidate.maxHp ?? candidate.maxIntegrity ?? 100;
      return Number.isFinite(current) && current < maximum - 0.1;
    }) ?? null;
  }

  connectedRoutes(roomId, sim) {
    if (sim?.routeGraph?.allRoutes) return sim.routeGraph.allRoutes().filter(route => route.from === roomId || route.to === roomId);
    return [...(sim?.graph?.get?.(roomId) ?? [])].map((neighbor, index) => ({ id: `graph-${roomId}-${neighbor}-${index}`, from: roomId, to: neighbor, kind: 'ordinary', state: 'open', active: true, width: 1.5 }));
  }

  allTraps(sim) {
    return sim?.advancedEcologySystem?.traps ?? sim?.eliteAbilitySystem?.traps ?? [];
  }

  allStructures(sim) {
    const source = sim?.constructionSystem?.structures ?? sim?.construction?.structures ?? [];
    return source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : Object.values(source ?? {});
  }

  hostilesInRoom(agent, sim) {
    return (sim.agents ?? []).filter(candidate => candidate.id !== agent.id && candidate.alive !== false && !candidate.departed && !candidate.hidden && candidate.roomId === agent.roomId && factionOf(candidate) !== factionOf(agent));
  }

  retreatDestination(agent, sim, originRoomId) {
    const site = sim?.spawnNetworkSystem?.sites?.get?.(agent.retreatSiteId ?? agent.homeSiteId);
    if (site?.state === 'active' && site.roomId !== originRoomId) return site.roomId;
    const neighbors = [...(sim?.graph?.get?.(originRoomId) ?? [])];
    return neighbors.find(roomId => !(sim.agents ?? []).some(candidate => candidate.alive !== false && candidate.roomId === roomId && factionOf(candidate) !== factionOf(agent))) ?? neighbors[0] ?? null;
  }

  preserveFactionCargo(factionId, roomId, sim) {
    const cargo = sim?.logisticsSystem?.cargo ?? [];
    for (const item of cargo) {
      if (item.roomId !== roomId && item.originRoomId !== roomId) continue;
      if (item.factionId && item.factionId !== factionId) continue;
      item.heroPreserved = true;
      item.lossRisk = Math.max(0, (item.lossRisk ?? 0) - 0.3);
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
      routeLocks: this.routeLocks.map(lock => ({ ...lock })),
      zones: this.zones.map(zone => ({ ...zone, affected: [...(zone.affected ?? [])] })),
      duels: this.duels.map(duel => ({ ...duel })),
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    return {
      heroCastsStarted: this.castCount,
      heroCastsInterrupted: this.interruptCount,
      heroRouteLocks: this.routeLocks.length,
      heroZonesActive: this.zones.length,
      heroDuelsActive: this.duels.length
    };
  }
}

function applyExternalSlow(agent, multiplier, duration, sourceId) {
  agent.heroStatuses ??= {};
  const current = agent.heroStatuses.externalSlow;
  if (current?.sourceId === sourceId) {
    current.remaining = Math.max(current.remaining, duration);
    return;
  }
  if (current) agent.speedMultiplier = current.originalSpeedMultiplier;
  const original = Number.isFinite(agent.speedMultiplier) ? agent.speedMultiplier : 1;
  agent.heroStatuses.externalSlow = { sourceId, remaining: duration, originalSpeedMultiplier: original };
  agent.speedMultiplier = original * multiplier;
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function pairMatches(lock, from, to) {
  return (lock.from === from && lock.to === to) || (lock.from === to && lock.to === from);
}
