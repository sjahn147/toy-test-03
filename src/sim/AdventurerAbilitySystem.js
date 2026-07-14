import { ensureAdventurerProfile, isStandardAdventurer, refreshAdventurerProgression } from '../adventurers/AdventurerProfile.js';

const ABILITIES = Object.freeze({
  'fighter.guard': { cooldown: 7, duration: 3.5 },
  'fighter.shield-bash': { cooldown: 9, duration: 0.7 },
  'rogue.backstab': { cooldown: 8, duration: 0.55 },
  'cleric.mend': { cooldown: 8, duration: 0.9 },
  'cleric.bless': { cooldown: 13, duration: 1.1 },
  'wizard.arcane-bolt': { cooldown: 7, duration: 0.8 },
  'wizard.ward': { cooldown: 14, duration: 1.0 },
  'archer.aimed-shot': { cooldown: 8, duration: 0.75 },
  'archer.overwatch': { cooldown: 12, duration: 1.0 }
});

export class AdventurerAbilitySystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
  }

  initialize(sim) {
    for (const agent of sim?.agents ?? []) ensureAdventurerState(agent);
  }

  update(dt, sim) {
    for (const agent of sim?.agents ?? []) {
      if (!isStandardAdventurer(agent)) continue;
      ensureAdventurerState(agent);
      for (const [abilityId, remaining] of Object.entries(agent.adventurerCooldowns)) {
        agent.adventurerCooldowns[abilityId] = Math.max(0, remaining - dt);
      }
      if (agent.adventurerGuard) {
        agent.adventurerGuard.remaining = Math.max(0, agent.adventurerGuard.remaining - dt);
        if (agent.adventurerGuard.remaining <= 0) agent.adventurerGuard = null;
      }
      if (agent.adventurerWard) {
        agent.adventurerWard.remaining = Math.max(0, agent.adventurerWard.remaining - dt);
        if (agent.adventurerWard.remaining <= 0 || agent.adventurerWard.charges <= 0) agent.adventurerWard = null;
      }
      if (agent.adventurerAbilityCast) {
        agent.adventurerAbilityCast.elapsed += dt;
        if (agent.adventurerAbilityCast.elapsed >= agent.adventurerAbilityCast.duration) agent.adventurerAbilityCast = null;
      }
      refreshAdventurerProgression(agent);
    }
  }

  decide(agent, sim) {
    if (!isStandardAdventurer(agent) || !active(agent)) return null;
    ensureAdventurerState(agent);
    const enemies = enemiesHere(agent, sim);
    const allies = alliesHere(agent, sim);

    if (agent.abilityIds.includes('cleric.mend')) {
      const wounded = allies.filter(candidate => candidate.hp < candidate.maxHp * 0.58).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (wounded && ready(agent, 'cleric.mend')) return { type: 'adventurer-ability', abilityId: 'cleric.mend', targetId: wounded.id };
    }
    if (!enemies.length) return null;

    if (agent.abilityIds.includes('fighter.guard') && ready(agent, 'fighter.guard')) {
      const threatened = allies.some(candidate => candidate.id !== agent.id && candidate.hp < candidate.maxHp * 0.5);
      if (threatened || agent.hp < agent.maxHp * 0.65) return { type: 'adventurer-ability', abilityId: 'fighter.guard', targetId: agent.id };
    }
    if (agent.abilityIds.includes('fighter.shield-bash') && ready(agent, 'fighter.shield-bash')) {
      return { type: 'adventurer-ability', abilityId: 'fighter.shield-bash', targetId: weakest(enemies).id };
    }
    if (agent.abilityIds.includes('rogue.backstab') && ready(agent, 'rogue.backstab')) {
      return { type: 'adventurer-ability', abilityId: 'rogue.backstab', targetId: weakest(enemies).id };
    }
    if (agent.abilityIds.includes('wizard.ward') && ready(agent, 'wizard.ward') && agent.hp < agent.maxHp * 0.55) {
      return { type: 'adventurer-ability', abilityId: 'wizard.ward', targetId: agent.id };
    }
    if (agent.abilityIds.includes('wizard.arcane-bolt') && ready(agent, 'wizard.arcane-bolt')) {
      return { type: 'adventurer-ability', abilityId: 'wizard.arcane-bolt', targetId: weakest(enemies).id };
    }
    if (agent.abilityIds.includes('archer.aimed-shot') && ready(agent, 'archer.aimed-shot')) {
      return { type: 'adventurer-ability', abilityId: 'archer.aimed-shot', targetId: strongest(enemies).id };
    }
    return null;
  }

  resolve(agent, action, sim) {
    if (action?.type !== 'adventurer-ability' || !isStandardAdventurer(agent)) return false;
    ensureAdventurerState(agent);
    const definition = ABILITIES[action.abilityId];
    if (!definition || !ready(agent, action.abilityId)) return false;
    const target = sim.agents?.find(candidate => candidate.id === action.targetId) ?? agent;
    if (!target || target.alive === false) return false;

    agent.adventurerCooldowns[action.abilityId] = definition.cooldown;
    agent.adventurerAbilityCast = { abilityId: action.abilityId, elapsed: 0, duration: definition.duration };

    if (action.abilityId === 'fighter.guard') {
      agent.adventurerGuard = { remaining: definition.duration, reduction: 0.38 };
      this.emit(sim, `${agent.name} locked shield and stance together.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id });
      return true;
    }
    if (action.abilityId === 'fighter.shield-bash') {
      deal(sim, agent, target, Math.max(2, Math.round((agent.attack ?? 4) * 0.72)), { blunt: true, abilityId: action.abilityId });
      target.mood = 'staggered';
      this.emit(sim, `${agent.name} drove a shield rim into ${target.name}.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id, targetId: target.id });
      return true;
    }
    if (action.abilityId === 'rogue.backstab') {
      deal(sim, agent, target, Math.max(3, Math.round((agent.attack ?? 4) * 1.45)), { piercing: true, abilityId: action.abilityId });
      this.emit(sim, `${agent.name} found the part of ${target.name} that was not looking.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id, targetId: target.id });
      return true;
    }
    if (action.abilityId === 'cleric.mend') {
      const amount = Math.max(4, 3 + Math.floor((agent.level ?? 1) * 0.8));
      target.hp = Math.min(target.maxHp, target.hp + amount);
      sim.emitEffect?.('heal', { roomId: target.roomId, agentId: target.id, duration: definition.duration, amount });
      this.emit(sim, `${agent.name} steadied ${target.name} with a practiced blessing.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id, targetId: target.id, amount });
      return true;
    }
    if (action.abilityId === 'wizard.ward') {
      agent.adventurerWard = { remaining: 5, charges: 2, reduction: 0.5 };
      this.emit(sim, `${agent.name} folded a ward around the party line.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id });
      return true;
    }
    if (action.abilityId === 'wizard.arcane-bolt') {
      deal(sim, agent, target, Math.max(4, Math.round((agent.attack ?? 5) * 1.18)), { arcane: true, abilityId: action.abilityId });
      sim.emitEffect?.('attack', { roomId: target.roomId, agentId: target.id, duration: definition.duration });
      this.emit(sim, `${agent.name} sent a compact arcane bolt into ${target.name}.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id, targetId: target.id });
      return true;
    }
    if (action.abilityId === 'archer.aimed-shot') {
      deal(sim, agent, target, Math.max(4, Math.round((agent.attack ?? 5) * 1.34)), { piercing: true, ranged: true, abilityId: action.abilityId });
      this.emit(sim, `${agent.name} took one breath and spent it on ${target.name}.`, { type: 'adventurer-ability', abilityId: action.abilityId, agentId: agent.id, targetId: target.id });
      return true;
    }
    return false;
  }

  modifyIncomingDamage(source, target, amount) {
    let adjusted = amount;
    if (target?.adventurerGuard?.remaining > 0) adjusted *= 1 - target.adventurerGuard.reduction;
    if (target?.adventurerWard?.remaining > 0 && target.adventurerWard.charges > 0) {
      adjusted *= 1 - target.adventurerWard.reduction;
      target.adventurerWard.charges -= 1;
    }
    return Math.max(0, adjusted);
  }

  snapshot(sim) {
    return {
      roster: (sim?.agents ?? []).filter(isStandardAdventurer).map(agent => ({
        id: agent.id,
        role: agent.adventurerRole,
        level: agent.level,
        experience: agent.experience,
        specialization: agent.specialization,
        background: agent.background,
        traits: [...(agent.traits ?? [])],
        abilityIds: [...(agent.abilityIds ?? [])],
        cooldowns: { ...(agent.adventurerCooldowns ?? {}) },
        appearanceSeed: agent.appearanceSeed,
        visualArchetype: agent.visualArchetype,
        equipmentTier: agent.equipmentTier
      }))
    };
  }

  emit(sim, text, meta) {
    if (typeof sim?.event === 'function') sim.event(text, meta);
    else this.onEvent(text, meta);
  }
}

function ensureAdventurerState(agent) {
  ensureAdventurerProfile(agent);
  if (!isStandardAdventurer(agent)) return agent;
  agent.adventurerCooldowns ??= {};
  return agent;
}

function ready(agent, abilityId) {
  return (agent.adventurerCooldowns?.[abilityId] ?? 0) <= 0;
}

function active(agent) {
  return agent.alive !== false && !agent.departed && !agent.hidden && !agent.travel && !agent.combat && !agent.downed && !agent.queued;
}

function enemiesHere(agent, sim) {
  return (sim?.agents ?? []).filter(candidate => candidate.alive !== false && !candidate.hidden && !candidate.departed && !candidate.travel && candidate.roomId === agent.roomId && candidate.faction !== agent.faction);
}

function alliesHere(agent, sim) {
  return (sim?.agents ?? []).filter(candidate => candidate.alive !== false && !candidate.hidden && !candidate.departed && !candidate.travel && candidate.roomId === agent.roomId && candidate.faction === agent.faction);
}

function weakest(agents) {
  return [...agents].sort((a, b) => (a.hp ?? 0) - (b.hp ?? 0))[0];
}

function strongest(agents) {
  return [...agents].sort((a, b) => (b.maxHp ?? b.hp ?? 0) - (a.maxHp ?? a.hp ?? 0))[0];
}

function deal(sim, source, target, amount, metadata) {
  if (typeof sim?.applyCombatDamage === 'function') return sim.applyCombatDamage(source, target, amount, metadata);
  target.hp = Math.max(0, (target.hp ?? 0) - amount);
  if (target.hp <= 0) target.alive = false;
  return amount;
}
