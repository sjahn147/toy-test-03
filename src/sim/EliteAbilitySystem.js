import { getEliteDefinition, isEliteRole } from '../content/elite/EliteBestiary.js';

export class EliteAbilitySystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.events = [];
    this.castsCompleted = 0;
    this.castsInterrupted = 0;
    this.sequence = 0;
  }

  initialize(sim) {
    for (const agent of sim.agents ?? []) this.initializeAgent(agent);
  }

  initializeAgent(agent) {
    if (!agent) return;
    agent.eliteStatuses ??= {};
    if (!isEliteRole(agent.role)) return;
    const definition = getEliteDefinition(agent.role);
    agent.eliteCooldowns ??= Object.fromEntries((definition?.abilities ?? []).map(action => [action.id, 0]));
    agent.eliteCast ??= null;
    agent.baseArmor ??= agent.armor ?? definition?.stats?.armor ?? 0;
    agent.baseSpeed ??= definition?.stats?.speed ?? 1;
    agent.baseAttack ??= definition?.stats?.attack ?? agent.attack ?? 1;
  }

  update(dt, sim) {
    for (const agent of sim.agents ?? []) {
      this.initializeAgent(agent);
      this.updateStatuses(agent, dt);
      if (!isEliteRole(agent.role) || !agent.alive || agent.departed) continue;
      for (const key of Object.keys(agent.eliteCooldowns ?? {})) agent.eliteCooldowns[key] = Math.max(0, agent.eliteCooldowns[key] - dt);
      if (agent.eliteCast) this.updateCast(agent, dt, sim);
    }
  }

  decide(agent, sim) {
    if (!isEliteRole(agent?.role) || !agent.alive || agent.departed || agent.hidden || agent.downed || agent.travel || agent.combat) return null;
    if (agent.eliteCast) return { type: 'elite-hold' };
    const definition = getEliteDefinition(agent.role);
    const candidates = (definition?.abilities ?? [])
      .filter(action => (agent.eliteCooldowns?.[action.id] ?? 0) <= 0)
      .map(action => ({ action, target: this.selectTarget(agent, action, sim), score: this.scoreAbility(agent, action, sim) }))
      .filter(entry => entry.target || ['room', 'allies', 'corpse'].some(policy => entry.action.targetPolicy?.includes(policy)) || ['guard', 'buff', 'formation', 'barricade', 'spawn-site', 'summon', 'hazard'].includes(entry.action.type))
      .sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
    const chosen = candidates[0];
    if (!chosen || chosen.score <= 0) {
      const target = this.hostilesInRoom(agent, sim)[0] ?? null;
      return target ? { type: 'elite-basic-attack', targetId: target.id } : null;
    }
    return { type: 'elite-cast', abilityId: chosen.action.id, targetId: chosen.target?.id ?? null, targetRoomId: chosen.target?.roomId ?? agent.roomId };
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('elite-')) return false;
    if (action.type === 'elite-hold') return true;
    if (action.type === 'elite-basic-attack') {
      const target = (sim.agents ?? []).find(candidate => candidate.id === action.targetId);
      if (target?.alive && target.roomId === agent.roomId) sim.combatSystem?.startAttack?.(agent, target, sim);
      return true;
    }
    if (action.type !== 'elite-cast' || agent.eliteCast) return true;
    const definition = getEliteDefinition(agent.role);
    const ability = definition?.abilities?.find(candidate => candidate.id === action.abilityId);
    if (!ability || (agent.eliteCooldowns?.[ability.id] ?? 0) > 0) return true;
    agent.eliteCast = {
      abilityId: ability.id,
      phase: 'windup',
      elapsed: 0,
      duration: ability.windup,
      targetId: action.targetId,
      targetRoomId: action.targetRoomId ?? agent.roomId,
      interrupted: false
    };
    agent.mood = `casting:${ability.id}`;
    this.emit(`${agent.name} begins ${ability.id}.`, {
      type: 'elite-telegraph', agentId: agent.id, roomId: agent.roomId, abilityId: ability.id,
      telegraph: { ...ability.telegraph }, duration: ability.windup
    });
    sim.emitEffect?.('elite-telegraph', { roomId: agent.roomId, agentId: agent.id, duration: ability.windup, abilityId: ability.id, telegraph: ability.telegraph });
    return true;
  }

  updateCast(agent, dt, sim) {
    const definition = getEliteDefinition(agent.role);
    const ability = definition?.abilities?.find(candidate => candidate.id === agent.eliteCast.abilityId);
    if (!ability) {
      agent.eliteCast = null;
      return;
    }
    if (agent.downed || agent.travel || !agent.alive || agent.eliteStatuses?.stunned > 0) {
      this.interrupt(agent, ability, 'disabled');
      return;
    }
    const cast = agent.eliteCast;
    cast.elapsed += dt;
    if (cast.elapsed < cast.duration) return;
    if (cast.phase === 'windup') {
      cast.phase = 'impact';
      cast.elapsed = 0;
      cast.duration = 0.08;
      return;
    }
    if (cast.phase === 'impact') {
      this.executeAbility(agent, ability, cast, sim);
      cast.phase = 'recovery';
      cast.elapsed = 0;
      cast.duration = ability.recovery;
      return;
    }
    agent.eliteCooldowns[ability.id] = ability.cooldown;
    agent.eliteCast = null;
    agent.mood = 'alert';
    this.castsCompleted += 1;
  }

  interrupt(agent, ability, reason) {
    agent.eliteCooldowns[ability.id] = Math.max(1, ability.cooldown * 0.35);
    agent.eliteCast = null;
    agent.mood = `interrupted:${reason}`;
    this.castsInterrupted += 1;
    this.emit(`${agent.name}'s ${ability.id} was interrupted.`, { type: 'elite-cast-interrupted', agentId: agent.id, abilityId: ability.id, reason });
  }

  executeAbility(source, ability, cast, sim) {
    const primary = (sim.agents ?? []).find(agent => agent.id === cast.targetId) ?? null;
    const hostileTargets = this.hostilesInRoom(source, sim);
    const alliedTargets = this.alliesInRoom(source, sim);
    for (const effect of ability.effects ?? []) this.applyEffect(effect, { source, primary, hostileTargets, alliedTargets, ability, cast, sim });
    this.emit(`${source.name} resolves ${ability.id}.`, { type: 'elite-ability-impact', agentId: source.id, roomId: source.roomId, abilityId: ability.id, targetId: primary?.id ?? null });
    sim.emitEffect?.('elite-impact', { roomId: source.roomId, agentId: source.id, duration: 0.9, abilityId: ability.id });
  }

  applyEffect(effect, context) {
    const { source, primary, hostileTargets, alliedTargets, sim } = context;
    const targets = effect.radius || effect.type.endsWith('-area') || effect.type.includes('allies') ? hostileTargets : primary ? [primary] : hostileTargets.slice(0, 1);
    if (effect.type === 'damage') return this.damage(primary, source, effect.amount ?? 5, sim, effect.hits ?? 1);
    if (effect.type === 'damage-area') return targets.forEach(target => this.damage(target, source, effect.amount ?? 5, sim, effect.hits ?? 1));
    if (effect.type === 'drain-all') return hostileTargets.forEach(target => { this.damage(target, source, effect.amount ?? 3, sim); source.hp = Math.min(source.maxHp, source.hp + Math.ceil((effect.amount ?? 3) / 2)); });
    if (effect.type === 'heal-self') { source.hp = Math.min(source.maxHp, source.hp + (effect.amount ?? 5)); return; }
    if (effect.type === 'heal-allies') { alliedTargets.forEach(target => { target.hp = Math.min(target.maxHp, target.hp + (effect.amount ?? 5)); }); return; }
    if (effect.type === 'buff-self') { this.addStatus(source, effect.stat ?? 'attack', effect.duration ?? 5, effect.amount ?? 2); return; }
    if (effect.type === 'buff-allies') { alliedTargets.forEach(target => this.addStatus(target, effect.stat ?? 'attack', effect.duration ?? 5, effect.amount ?? 2)); return; }
    if (effect.type === 'self-armor') { this.addStatus(source, 'armor', effect.duration ?? 5, effect.amount ?? 3); return; }
    if (effect.type === 'formation-armor' || effect.type === 'guard-allies') { alliedTargets.forEach(target => this.addStatus(target, 'armor', effect.duration ?? 5, effect.amount ?? 2)); return; }
    if (effect.type === 'slow' || effect.type === 'slow-hostiles' || effect.type === 'slow-zone') { hostileTargets.forEach(target => this.addStatus(target, 'slow', effect.duration ?? 3, effect.amount ?? 0.3)); return; }
    if (effect.type === 'root' || effect.type === 'web') { targets.forEach(target => { target.webbed = Math.max(target.webbed ?? 0, effect.duration ?? 2); this.addStatus(target, 'rooted', effect.duration ?? 2, 1); }); return; }
    if (effect.type === 'fear') { (effect.radius ? hostileTargets : targets).forEach(target => { this.addStatus(target, 'fear', effect.duration ?? 2, 1); target.mood = 'afraid'; }); return; }
    if (effect.type === 'blind' || effect.type === 'weaken' || effect.type === 'corrode' || effect.type === 'bleed') { targets.forEach(target => this.addStatus(target, effect.type, effect.duration ?? 4, effect.amount ?? 1)); return; }
    if (effect.type === 'knockdown' || effect.type === 'interrupt') { targets.forEach(target => { if (target.eliteCast) this.interrupt(target, getEliteDefinition(target.role)?.abilities?.find(a => a.id === target.eliteCast.abilityId) ?? { id: target.eliteCast.abilityId, cooldown: 4 }, 'impact'); target.combat = null; this.addStatus(target, 'stunned', effect.duration ?? 1.2, 1); }); return; }
    if (effect.type === 'push' || effect.type === 'pull') { targets.forEach(target => { target.mood = effect.type === 'push' ? 'shoved' : 'dragged'; }); return; }
    if (effect.type === 'summon' || effect.type === 'call-reinforcement') { for (let i = 0; i < (effect.count ?? 1); i += 1) this.summon(effect.role, source, sim); return; }
    if (effect.type === 'summon-from-corpses') { const count = Math.min(effect.count ?? 1, sim.ecosystem?.corpses?.filter(c => c.roomId === source.roomId).length ?? 0); for (let i = 0; i < count; i += 1) { sim.ecosystem.corpses.splice(sim.ecosystem.corpses.findIndex(c => c.roomId === source.roomId), 1); this.summon(effect.role, source, sim); } return; }
    if (effect.type === 'build-trap') { for (let i = 0; i < (effect.count ?? 1); i += 1) sim.advancedEcologySystem?.traps?.push({ id: `elite-trap-${source.id}-${this.sequence++}-${i}`, roomId: source.roomId, ownerFaction: source.ecologyFaction, charges: effect.charges ?? 1, cooldown: 0 }); return; }
    if (effect.type === 'establish-field-camp') { sim.spawnNetworkSystem?.establishFieldCamp?.({ factionId: source.ecologyFaction, roomId: source.roomId, species: effect.species ?? getEliteDefinition(source.role)?.parentSpecies }, sim); return; }
    if (effect.type === 'hazard' || effect.type === 'death-hazard' || effect.type === 'web-zone' || effect.type === 'spawn-cover' || effect.type === 'smoke') { sim.emitEffect?.(effect.hazard ?? effect.type, { roomId: source.roomId, agentId: source.id, duration: effect.duration ?? 5 }); return; }
    if (effect.type === 'infect') { targets.forEach(target => { target.infected = true; target.infectionType = 'elite-parasite'; this.addStatus(target, 'infected', effect.duration ?? 10, 1); }); return; }
    if (effect.type === 'consume-corpse-heal' || effect.type === 'consume-bones-heal' || effect.type === 'consume-corpse-resource') { const corpse = sim.ecosystem?.corpses?.find(candidate => candidate.roomId === source.roomId); if (corpse) { sim.ecosystem.corpses = sim.ecosystem.corpses.filter(candidate => candidate.id !== corpse.id); if (effect.type.includes('heal')) source.hp = Math.min(source.maxHp, source.hp + (effect.amount ?? 10)); else this.addSiteResource(source, sim, effect.resource ?? 'corpses', effect.amount ?? 1); } return; }
    if (effect.type === 'add-site-resource') { this.addSiteResource(source, sim, effect.resource, effect.amount ?? 1); return; }
    if (effect.type === 'steal-resource') { this.addSiteResource(source, sim, 'stolenGoods', effect.amount ?? 1); source.mood = 'retreating-with-loot'; return; }
    if (effect.type === 'reduce-site-cooldown') { const site = sim.spawnNetworkSystem?.sites?.get(source.homeSiteId); if (site) site.cooldownRemaining = Math.max(0, site.cooldownRemaining - (effect.amount ?? 3)); return; }
    if (effect.type === 'reflect-next-projectile') { this.addStatus(source, 'reflect', effect.duration ?? 5, 1); return; }
    if (effect.type === 'prevent-death') { this.addStatus(source, 'deathless', effect.duration ?? 4, 1); return; }
    if (effect.type === 'counter-charge') { this.addStatus(source, 'counterCharge', effect.duration ?? 5, effect.amount ?? 6); return; }
    if (effect.type === 'counter-damage') { this.addStatus(source, 'counterDamage', effect.duration ?? 5, effect.amount ?? 4); return; }
    if (effect.type === 'mark-target') { if (primary) { this.addStatus(primary, 'marked', effect.duration ?? 6, 1); for (const ally of alliedTargets) ally.preferredTargetId = primary.id; } return; }
    if (effect.type === 'retarget-allies') { const chosen = primary ?? hostileTargets[0] ?? null; if (chosen) for (const ally of alliedTargets) ally.preferredTargetId = chosen.id; return; }
    if (effect.type === 'sleep-area') { hostileTargets.forEach(target => { target.sporeSleep = Math.max(target.sporeSleep ?? 0, effect.duration ?? 3); this.addStatus(target, 'stunned', effect.duration ?? 3, 1); target.mood = 'spore-sleep'; }); return; }
    if (effect.type === 'taunt') { targets.forEach(target => { target.forcedTargetId = source.id; this.addStatus(target, 'taunted', effect.duration ?? 4, 1); }); return; }
    if (effect.type === 'trigger-friendly-traps') { for (const trap of sim.advancedEcologySystem?.traps ?? []) if (trap.ownerFaction === source.ecologyFaction && trap.roomId === source.roomId) trap.cooldown = 0; return; }
    if (effect.type === 'retreat-to-site') { source.mood = 'retreating'; return; }
    if (effect.type === 'teleport-behind-target') { source.mood = 'phase-stepping'; return; }
    if (effect.type === 'capture-downed' && primary?.downed) { primary.hosted = true; primary.hidden = true; primary.downed = false; sim.occupancy?.release?.(primary.id); return; }
    if (effect.type === 'break-structure') { const structure = sim.constructionSystem?.structures?.find?.(item => item.roomId === source.roomId && item.hp > 0); if (structure) structure.hp = Math.max(0, structure.hp - 12); return; }
  }

  damage(target, source, amount, sim, hits = 1) {
    if (!target?.alive) return;
    for (let i = 0; i < hits; i += 1) sim.applyCombatDamage?.(source, target, Math.max(1, amount - (target.armor ?? 0)), { projectileType: 'elite' });
  }

  summon(role, source, sim) {
    if (sim.eliteEcologySystem?.hasRole?.(role)) {
      const site = sim.spawnNetworkSystem?.sites?.get(source.homeSiteId);
      const network = sim.spawnNetworkSystem?.networks?.get(source.ecologyFaction);
      return site && network ? sim.eliteEcologySystem.spawn(role, site, network, sim) : null;
    }
    if (['rat', 'goblin', 'spider', 'slime', 'ogre', 'skeleton'].includes(role)) return sim.spawnEcologyMonster?.(role, source.roomId);
    return sim.spawnAdvancedMonster?.(role, source.roomId);
  }

  addSiteResource(source, sim, resource, amount) {
    const site = sim.spawnNetworkSystem?.sites?.get(source.homeSiteId);
    if (!site || !resource) return;
    site.supply[resource] = (Number(site.supply[resource]) || 0) + amount;
  }

  selectTarget(agent, action, sim) {
    if (action.targetPolicy === 'corpse') return sim.ecosystem?.corpses?.find(corpse => corpse.roomId === agent.roomId) ?? null;
    const hostiles = this.hostilesInRoom(agent, sim);
    if (!hostiles.length) return null;
    if (action.targetPolicy === 'injured-hostile') return [...hostiles].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (action.targetPolicy === 'ranged-hostile') return hostiles.find(target => ['wizard', 'archer', 'cleric'].includes(target.role)) ?? hostiles[0];
    if (action.targetPolicy === 'strongest-hostile') return [...hostiles].sort((a, b) => b.maxHp - a.maxHp)[0];
    if (action.targetPolicy === 'isolated-hostile') return hostiles.find(target => hostiles.filter(other => other.id !== target.id).length <= 1) ?? hostiles[0];
    if (action.targetPolicy === 'downed-hostile') return hostiles.find(target => target.downed) ?? null;
    return hostiles[0];
  }

  scoreAbility(agent, action, sim) {
    let score = (action.priority ?? 1) * 10;
    const hostiles = this.hostilesInRoom(agent, sim);
    const allies = this.alliesInRoom(agent, sim);
    if (action.targetPolicy?.includes('allies')) score += allies.filter(target => target.hp < target.maxHp * 0.7).length * 8;
    if (action.type.includes('area') || action.type === 'aura') score += hostiles.length * 4;
    if (action.type === 'corpse-consume') score += (sim.ecosystem?.corpses?.some(corpse => corpse.roomId === agent.roomId) ? 18 : -50);
    if (action.type === 'summon') score += allies.length < 4 ? 12 : -8;
    if (action.type === 'guard' || action.type === 'formation') score += hostiles.length ? 8 : -20;
    if (!hostiles.length && !['spawn-site', 'corpse-consume', 'buff', 'guard', 'formation'].includes(action.type)) score -= 30;
    return score;
  }

  hostilesInRoom(agent, sim) {
    return (sim.agents ?? []).filter(target => target.alive && !target.departed && !target.hidden && target.roomId === agent.roomId && target.faction !== agent.faction);
  }

  alliesInRoom(agent, sim) {
    return (sim.agents ?? []).filter(target => target.alive && !target.departed && !target.hidden && target.roomId === agent.roomId && target.faction === agent.faction && (target.ecologyFaction ?? null) === (agent.ecologyFaction ?? null));
  }

  addStatus(agent, key, duration, amount) {
    agent.eliteStatuses ??= {};
    const current = agent.eliteStatuses[key] ?? { remaining: 0, amount: 0 };
    agent.eliteStatuses[key] = { remaining: Math.max(current.remaining, duration), amount: Math.max(current.amount, amount) };
  }

  updateStatuses(agent, dt) {
    for (const [key, status] of Object.entries(agent.eliteStatuses ?? {})) {
      status.remaining = Math.max(0, status.remaining - dt);
      if (status.remaining <= 0) delete agent.eliteStatuses[key];
    }
    const value = key => agent.eliteStatuses?.[key]?.amount ?? 0;
    if (agent.baseAttack != null) agent.attack = Math.max(1, agent.baseAttack + value('attack') - value('weaken'));
    if (agent.baseArmor != null) agent.armor = Math.max(0, agent.baseArmor + value('armor') - value('corrode'));
    if (agent.baseSpeed != null) agent.speedMultiplier = Math.max(0.2, agent.baseSpeed + value('speed') - value('slow'));
    if (value('bleed') > 0 && agent.alive) agent.hp = Math.max(1, agent.hp - dt * value('bleed') * 0.15);
  }

  emit(text, meta = {}) {
    this.events.unshift({ text, ...meta });
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    return { castsCompleted: this.castsCompleted, castsInterrupted: this.castsInterrupted, recentEvents: this.events.map(event => ({ ...event })) };
  }

  metrics() {
    return { eliteCastsCompleted: this.castsCompleted, eliteCastsInterrupted: this.castsInterrupted };
  }
}
