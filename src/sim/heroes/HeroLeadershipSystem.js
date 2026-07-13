import { getHeroDefinition, isHeroRole } from '../../content/heroes/HeroDefinitions.js';

export class HeroLeadershipSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.activeEffects = [];
    this.clock = 0;
  }

  update(dt, sim) {
    this.clock += dt;
    this.resetAgentModifiers(sim);
    this.activeEffects = [];
    for (const hero of (sim?.agents ?? []).filter(agent => agent.alive !== false && isHeroRole(agent.role))) {
      const definition = getHeroDefinition(hero.heroId ?? hero.role);
      if (!definition || hero.heroState === 'dead') continue;
      if (definition.id === 'hero.nibble') this.applyNibble(hero, definition, sim);
      if (definition.id === 'hero.kirik') this.applyKirik(hero, definition, dt, sim);
      if (definition.id === 'hero.karg') this.applyKarg(hero, definition, sim);
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
      delete agent.heroLeadershipApplied;
    }
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
    speedMultiplier: Number.isFinite(agent.speedMultiplier) ? agent.speedMultiplier : 1
  };
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function structures(sim) {
  const source = sim?.constructionSystem?.structures ?? sim?.construction?.structures ?? [];
  return source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : Object.values(source ?? {});
}

function round(value) {
  return Math.round(value * 100) / 100;
}
