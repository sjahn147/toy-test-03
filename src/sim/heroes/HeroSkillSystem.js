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
    this.consumeCompletedTethers(sim);
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
    if (!definition || !skill || !this.canCast(agent, skill, sim)) return false;
    const reservation = this.reserveSkillCosts(agent, skill, sim);
    if (reservation === false) return false;
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
      targetPropId: action.targetPropId ?? null,
      targetCargoId: action.targetCargoId ?? null,
      targetCorpseId: action.targetCorpseId ?? null,
      commandMode: action.commandMode ?? null,
      startHp: agent.hp,
      impactApplied: false,
      reservedCosts: reservation?.costs ?? {},
      costSource: reservation?.source ?? null,
      costsCommitted: false
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

  canCast(agent, skill, sim = null) {
    return Boolean(agent?.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.travel && !agent.combat && !agent.heroCast && (agent.heroCooldowns?.[skill.id] ?? 0) <= 0 && this.canAffordSkill(agent, skill, sim));
  }

  canAffordSkill(agent, skill, sim) {
    const costs = skill?.costs ?? {};
    if (!Object.keys(costs).length) return true;
    const stores = this.resourceStores(agent, sim);
    for (const [resource, amount] of Object.entries(costs)) {
      const available = stores.reduce((sum, store) => sum + resourceAmount(store.pool, resource), 0);
      if (available + 0.0001 < amount) return false;
    }
    return true;
  }

  reserveSkillCosts(agent, skill, sim) {
    const costs = skill?.costs ?? {};
    if (!Object.keys(costs).length) return { costs: {}, source: null };
    const stores = this.resourceStores(agent, sim);
    if (!this.canAffordSkill(agent, skill, sim)) return false;
    const withdrawals = [];
    for (const [resource, requested] of Object.entries(costs)) {
      let remaining = requested;
      for (const store of stores) {
        if (remaining <= 0) break;
        for (const [key, available] of resourceEntries(store.pool, resource)) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, available);
          if (take <= 0) continue;
          store.pool[key] -= take;
          withdrawals.push({ storeId: store.id, key, amount: take });
          remaining -= take;
        }
      }
    }
    return { costs: { ...costs }, source: withdrawals };
  }

  refundSkillCosts(cast, fraction, sim) {
    const withdrawals = Array.isArray(cast?.costSource) ? cast.costSource : [];
    if (!withdrawals.length || fraction <= 0) return;
    for (const withdrawal of withdrawals) {
      const store = this.resourceStoresById(sim).get(withdrawal.storeId);
      if (!store) continue;
      store.pool[withdrawal.key] = (Number(store.pool[withdrawal.key]) || 0) + withdrawal.amount * fraction;
    }
  }

  resourceStores(agent, sim) {
    const factionId = factionOf(agent);
    const stores = [];
    const sites = sim?.spawnNetworkSystem?.sites;
    if (sites instanceof Map) {
      for (const site of sites.values()) {
        if (site.factionId !== factionId || site.state !== 'active') continue;
        site.supply ??= {};
        stores.push({ id: `site:${site.id}`, pool: site.supply, priority: site.roomId === agent.roomId ? 0 : site.type === 'core' ? 1 : 2 });
      }
    }
    sim.heroResourceLedger ??= {};
    if (!sim.heroResourceLedger[factionId]) sim.heroResourceLedger[factionId] = defaultLedgerFor(factionId);
    stores.push({ id: `ledger:${factionId}`, pool: sim.heroResourceLedger[factionId], priority: 3 });
    return stores.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  resourceStoresById(sim) {
    const result = new Map();
    const sites = sim?.spawnNetworkSystem?.sites;
    if (sites instanceof Map) for (const site of sites.values()) result.set(`site:${site.id}`, { id: `site:${site.id}`, pool: site.supply ??= {} });
    for (const [factionId, pool] of Object.entries(sim?.heroResourceLedger ?? {})) result.set(`ledger:${factionId}`, { id: `ledger:${factionId}`, pool });
    return result;
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
    const cast = agent.heroCast;
    const skill = definition.skills.find(candidate => candidate.id === skillId);
    if (cast && !cast.costsCommitted) this.refundSkillCosts(cast, skill?.interruptRefund ?? 0.5, sim);
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
    cast.costsCommitted = true;
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
      case 'deploy-mourning-veil': return this.deployMourningVeil(agent, definition, effect, sim);
      case 'grant-veil-concealment': return true;
      case 'call-adjacent-wraiths': return this.callAdjacentWraiths(agent, definition, effect, sim);
      case 'raise-temporary-shades': return this.raiseTemporaryShades(agent, effect, sim);
      case 'deploy-ethereal-domain': return this.deployEtherealDomain(agent, definition, effect, sim);
      case 'line-damage-root': return this.lineDamageRoot(agent, cast, effect, sim);
      case 'grow-lance-variant': return this.growLanceVariant(agent, effect);
      case 'deploy-memory-bloom': return this.deployMemoryBloom(agent, definition, effect, sim);
      case 'cleanse-fungal-allies': return this.cleanseFungalAllies(agent, sim);
      case 'enter-solitary-bloom': return this.enterSolitaryBloom(agent, definition, effect, sim);
      case 'royal-command': return this.royalCommand(agent, cast, effect, sim);
      case 'digest-evidence': return this.digestEvidence(agent, cast, effect, sim);
      case 'split-hero-court': return this.splitHeroCourt(agent, effect, sim);
      case 'deploy-breach-charge': return this.deployBreachCharge(agent, cast, effect, sim);
      case 'directional-blast': return this.directionalBlast(agent, cast, effect, sim, false);
      case 'directional-water-jet': return this.directionalBlast(agent, cast, effect, sim, true);
      case 'clear-environment': return this.clearEnvironment(agent, effect, sim);
      case 'dilute-slime': return this.diluteSlimes(agent, effect, sim);
      case 'launch-barrage': return this.launchBarrage(agent, effect, sim);
      case 'deploy-pressure-seal': return this.deployPressureSeal(agent, cast, effect, sim);
      case 'reveal-submerged-socket': return this.revealSubmergedSockets(agent, sim);
      case 'emergency-drain-field': return this.emergencyDrain(agent, effect, sim);
      case 'deploy-healing-cauldron': return this.deployHealingCauldron(agent, effect, sim);
      case 'hook-corpse-or-downed': return this.hookCorpseOrDowned(agent, cast, effect, sim);
      case 'war-feast-field': return this.createWarFeast(agent, effect, sim);
      case 'create-royal-formation': return sim?.heroFormationSystem?.createRoyalLine?.(agent, effect, sim) ?? false;
      case 'royal-shield-bash': return sim?.heroFormationSystem?.shieldBash?.(agent, { ...effect, targetId: cast.targetId }, sim) ?? false;
      case 'reassemble-royal-skeletons': return sim?.heroNecromancySystem?.reassembleRoyalSkeletons?.(agent, effect, sim) ?? false;
      case 'ghast-fear-cone': return sim?.heroNecromancySystem?.fearCone?.(agent, effect, sim) ?? false;
      case 'consume-memory-corpse': return sim?.heroNecromancySystem?.consumeMemoryCorpse?.(agent, effect, sim) ?? false;
      case 'increase-appetite': return this.increaseAppetite(agent, effect);
      case 'raise-ghoul-pack': return sim?.heroNecromancySystem?.raiseGhoulPack?.(agent, effect, sim) ?? false;
      case 'ghoul-frenzy-aura': return sim?.heroNecromancySystem?.applyGhoulFrenzy?.(agent, effect, sim) ?? false;
      case 'create-spectral-gate': return this.createSpectralGate(agent, cast, effect, sim);
      case 'banishment-shield-charge': return this.banishmentCharge(agent, cast, effect, sim);
      case 'seal-all-room-routes': return this.sealAllRoomRoutes(agent, effect, sim);
      case 'raise-spectral-guards': return sim?.heroNecromancySystem?.raiseSpectralGuards?.(agent, effect, sim) ?? false;
      case 'root-self': return sim?.heroBarrierSystem?.rootHero?.(agent, effect.duration ?? 10) ?? false;
      case 'pev-purifying-bubble': return sim?.heroAdaptationSystem?.purifyingBubble?.(agent, effect, sim) ?? false;
      case 'pev-borrow-shape': return sim?.heroAdaptationSystem?.borrowShape?.(agent, cast.targetId, effect, sim) ?? false;
      case 'pev-selective-assimilation': return sim?.heroAdaptationSystem?.selectiveAssimilation?.(agent, effect, sim) ?? false;
      case 'cocoon-silk-lance': return sim?.heroBroodSystem?.silkLance?.(agent, cast.targetId, effect, sim) ?? false;
      case 'cocoon-thread-guard': return sim?.heroBroodSystem?.threadGuard?.(agent, effect, sim) ?? false;
      case 'cocoon-cast-off-shell': return sim?.heroBroodSystem?.castOffShell?.(agent, effect, sim) ?? false;
      case 'queen-lay-royal-clutch': return sim?.heroBroodSystem?.layRoyalClutch?.(agent, effect, sim) ?? false;
      case 'queen-reassign-brood': return sim?.heroBroodSystem?.reassignBrood?.(agent, effect, sim) ?? false;
      case 'queen-without-body': return sim?.heroBroodSystem?.queenWithoutBody?.(agent, effect, sim) ?? false;
      case 'successor-borrowed-gesture': return sim?.heroMimicrySystem?.borrowedGesture?.(agent, effect, sim) ?? false;
      case 'successor-false-investiture': return sim?.heroMimicrySystem?.falseInvestiture?.(agent, effect, sim) ?? false;
      case 'successor-shed-the-prince': return sim?.heroMimicrySystem?.shedPrince?.(agent, effect, sim) ?? false;
      case 'gardener-rooted-orchard': return sim?.heroGardenSystem?.rootedOrchard?.(agent, effect, sim) ?? false;
      case 'gardener-prune-the-blight': return sim?.heroGardenSystem?.pruneBlight?.(agent, effect, sim) ?? false;
      case 'gardener-turn-of-seasons': return sim?.heroGardenSystem?.turnSeasons?.(agent, effect, sim) ?? false;
      case 'goldcrown-bone-rake-charge': return sim?.heroHoardSystem?.boneRakeCharge?.(agent, cast.targetId, effect, sim) ?? false;
      case 'goldcrown-trophy-volley': return sim?.heroHoardSystem?.trophyVolley?.(agent, effect, sim) ?? false;
      case 'goldcrown-royal-molt': return sim?.heroHoardSystem?.royalMolt?.(agent, effect, sim) ?? false;
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
      if (ally.heroStatuses?.secondDefeat?.noRetreat || ally.heroStatuses?.warFeast?.noRetreat) continue;
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


  deployMourningVeil(agent, definition, effect, sim) {
    if (this.zones.some(zone => zone.kind === 'mourning-veil' && zone.heroId === definition.id && zone.remaining > 0)) return false;
    const zone = {
      id: `hero-zone-${this.sequence++}`,
      kind: 'mourning-veil',
      heroId: definition.id,
      factionId: definition.factionId,
      roomId: agent.roomId,
      remaining: effect.duration ?? 10,
      radius: effect.radius ?? 4.6,
      multiplier: effect.slowMultiplier ?? 0.78,
      attackPenalty: effect.attackPenalty ?? 2,
      affected: new Set()
    };
    this.zones.push(zone);
    agent.heroStatuses.mourningVeil = { zoneId: zone.id, remaining: zone.remaining };
    sim?.emitEffect?.('hero-zone', { roomId: agent.roomId, agentId: agent.id, duration: zone.remaining, heroId: definition.id, shape: 'mourning-veil', radius: zone.radius, colorRole: 'undead-veil' });
    return true;
  }

  callAdjacentWraiths(agent, definition, effect, sim) {
    const adjacent = new Set(sim?.graph?.get?.(agent.roomId) ?? []);
    const candidates = (sim?.agents ?? [])
      .filter(candidate => candidate.id !== agent.id && candidate.alive !== false && !candidate.departed && !candidate.hidden && !candidate.travel)
      .filter(candidate => factionOf(candidate) === definition.factionId)
      .filter(candidate => String(candidate.role ?? '').includes('wraith') || candidate.species === 'wraith')
      .filter(candidate => adjacent.has(candidate.roomId))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .slice(0, effect.maximum ?? 3);
    for (const wraith of candidates) {
      sim?.occupancy?.release?.(wraith.id);
      wraith.roomId = agent.roomId;
      wraith.travel = null;
      wraith.combat = null;
      wraith.mood = 'soul-procession';
      wraith.heroStatuses ??= {};
      wraith.heroStatuses.procession = { remaining: 5, sourceId: agent.id };
      sim?.occupancy?.placeAgent?.(wraith, agent.roomId);
      sim?.emitEffect?.('hero-form-reveal', { roomId: agent.roomId, agentId: wraith.id, duration: 0.9, formKind: 'wraith-arrival', heroId: definition.id, colorRole: 'undead-veil' });
    }
    return candidates.length > 0;
  }

  raiseTemporaryShades(agent, effect, sim) {
    return (sim?.heroFormSystem?.raiseShades?.(agent, { maximum: effect.maximum ?? 2, duration: effect.duration ?? 9 }, sim) ?? 0) > 0;
  }

  deployEtherealDomain(agent, definition, effect, sim) {
    if (this.zones.some(zone => zone.kind === 'ethereal-domain' && zone.heroId === definition.id && zone.remaining > 0)) return false;
    const zone = {
      id: `hero-zone-${this.sequence++}`,
      kind: 'ethereal-domain',
      heroId: definition.id,
      factionId: definition.factionId,
      roomId: agent.roomId,
      remaining: effect.duration ?? 12,
      radius: effect.radius ?? 6,
      projectileSlow: effect.projectileSlow ?? 0.62,
      affected: new Set()
    };
    this.zones.push(zone);
    agent.heroStatuses.etherealDomain = { zoneId: zone.id, remaining: zone.remaining };
    agent.heroVariant = 'unburied-queen';
    sim?.emitEffect?.('hero-zone', { roomId: agent.roomId, agentId: agent.id, duration: zone.remaining, heroId: definition.id, shape: 'ethereal-domain', radius: zone.radius, colorRole: 'undead-crown' });
    return true;
  }

  lineDamageRoot(agent, cast, effect, sim) {
    const hostiles = this.hostilesInRoom(agent, sim);
    if (!hostiles.length) return false;
    const primary = hostiles.find(target => target.id === cast.targetId) ?? strongest(hostiles);
    const ordered = [primary, ...hostiles.filter(target => target.id !== primary?.id).sort((a, b) => projectedDistance(agent, a) - projectedDistance(agent, b))]
      .filter(Boolean)
      .slice(0, effect.maximum ?? 3);
    for (let index = 0; index < ordered.length; index += 1) {
      const target = ordered[index];
      const amount = Math.max(1, Math.round((effect.amount ?? 14) * (1 - index * 0.18)));
      sim?.applyCombatDamage?.(agent, target, amount, { melee: false, projectileType: 'fungal', heroSkill: true });
      if (target.alive === false) continue;
      target.heroStatuses ??= {};
      target.heroStatuses.rooted = { remaining: effect.rootDuration ?? 3.2, sourceId: agent.id };
      target.combat = null;
    }
    return ordered.length > 0;
  }

  growLanceVariant(agent, effect) {
    agent.heroStatuses.lanceGrown = { remaining: effect.duration ?? 1.6 };
    agent.heroVariant = 'lance-grown';
    return true;
  }

  deployMemoryBloom(agent, definition, effect, sim) {
    if (this.zones.some(zone => zone.kind === 'memory-bloom' && zone.heroId === definition.id && zone.remaining > 0)) return false;
    const zone = {
      id: `hero-zone-${this.sequence++}`,
      kind: 'memory-bloom',
      heroId: definition.id,
      factionId: definition.factionId,
      roomId: agent.roomId,
      remaining: effect.duration ?? 9,
      radius: effect.radius ?? 4.4,
      attackPenalty: effect.attackPenalty ?? 2,
      affected: new Set()
    };
    this.zones.push(zone);
    sim?.emitEffect?.('hero-zone', { roomId: agent.roomId, agentId: agent.id, duration: zone.remaining, heroId: definition.id, shape: 'memory-flower', radius: zone.radius, colorRole: 'fungal-blue' });
    return true;
  }

  cleanseFungalAllies(agent, sim) {
    let changed = 0;
    for (const ally of (sim?.agents ?? []).filter(candidate => candidate.alive !== false && candidate.roomId === agent.roomId && factionOf(candidate) === factionOf(agent))) {
      ally.heroStatuses ??= {};
      for (const key of ['fear', 'confusion', 'memoryLost']) {
        if (!ally.heroStatuses[key]) continue;
        delete ally.heroStatuses[key];
        changed += 1;
      }
      if ((ally.sporeSleep ?? 0) > 0) {
        ally.sporeSleep = 0;
        changed += 1;
      }
    }
    return changed > 0;
  }

  enterSolitaryBloom(agent, definition, effect, sim) {
    if (agent.heroStatuses.solitaryBloom) return false;
    agent.heroStatuses.solitaryBloom = {
      remaining: effect.duration ?? 14,
      endingHealthCostRatio: effect.endingHealthCostRatio ?? 0.12
    };
    agent.heroStatModifiers.skill = {
      attack: effect.attackBonus ?? 4,
      armor: 0,
      courage: 4,
      speedMultiplier: effect.speedMultiplier ?? 1.22,
      interruptResistance: effect.interruptResistance ?? 0.35
    };
    agent.communionEnabled = false;
    agent.heroVariant = 'solitary-bloom';
    recomputeHeroStats(agent, definition);
    return true;
  }

  royalCommand(agent, cast, effect, sim) {
    const hostiles = this.hostilesInRoom(agent, sim);
    if (!hostiles.length) return false;
    const mode = cast.commandMode ?? (hostiles.length >= 2 ? 'kneel' : 'approach');
    if (mode === 'approach') {
      for (const target of hostiles.slice(0, 3)) {
        target.heroStatuses ??= {};
        target.heroStatuses.royalApproach = { remaining: 1.1, sourceId: agent.id };
        target.combat = null;
        pullToward(agent, target, 0.62);
      }
    } else {
      for (const target of hostiles) {
        applyExternalSlow(target, 0.58, effect.slowDuration ?? 3.5, `royal-command:${agent.id}`);
        target.heroStatuses ??= {};
        target.heroStatuses.stagger = { remaining: effect.staggerDuration ?? 0.8 };
        target.combat = null;
      }
    }
    agent.heroLastCommand = mode;
    return true;
  }

  digestEvidence(agent, cast, effect, sim) {
    const digestible = this.findDigestible(agent, sim, cast);
    if (!digestible) return false;
    const { kind, item } = digestible;
    let consumed = false;
    if (kind === 'corpse') {
      const source = sim?.ecosystem?.corpses ?? [];
      const index = source.findIndex(candidate => candidate.id === item.id);
      if (index >= 0) { source.splice(index, 1); consumed = true; }
    } else if (kind === 'cargo') {
      item.state = 'consumed';
      item.amount = 0;
      item.heroConsumedBy = agent.heroId;
      consumed = true;
    } else if (kind === 'structure') {
      item.heroConsumedBy = agent.heroId;
      item.hp = 0;
      item.integrity = 0;
      item.state = 'consumed';
      consumed = true;
    } else {
      item.heroConsumedBy = agent.heroId;
      item.consumed = true;
      item.hidden = true;
      consumed = true;
    }
    if (!consumed) return false;
    agent.hp = Math.min(agent.maxHp, agent.hp + (effect.heal ?? 24));
    const stanceKey = kind === 'prop' && String(item.type ?? '').includes('potion') ? 'potion' : kind;
    const stance = effect.stanceByType?.[stanceKey] ?? effect.stanceByType?.[kind] ?? 'crown';
    agent.heroStance = stance;
    agent.heroVariant = `regalia-${stance}`;
    agent.heroFlags = [...new Set([...(agent.heroFlags ?? []), `digested-${kind}`])];
    sim?.emitEffect?.('hero-impact', { roomId: agent.roomId, agentId: agent.id, duration: 1, heroId: agent.heroId, skillId: 'glop-digest-evidence', shape: 'digest-spiral', radius: 2.6, colorRole: 'slime-teal' });
    return true;
  }

  splitHeroCourt(agent, effect, sim) {
    return Boolean(sim?.heroFormSystem?.splitCourt?.(agent, { duration: effect.duration ?? 11, aspects: effect.aspects ?? ['king', 'guard', 'scribe'] }, sim));
  }

  deployBreachCharge(agent, cast, effect, sim) {
    if (!sim?.heroDeployableSystem) return false;
    const structure = cast.targetStructureId ? this.allStructures(sim).find(item => item.id === cast.targetStructureId) : this.findHostileOrDamagedStructure(agent, sim);
    const deployable = sim.heroDeployableSystem.createBreachCharge(agent, {
      ...effect,
      targetStructureId: structure?.id ?? null,
      ox: structure?.placement?.ox ?? 0.8,
      oz: structure?.placement?.oz ?? 0.2
    }, sim);
    return Boolean(deployable);
  }

  directionalBlast(agent, cast, effect, sim, water) {
    const target = (sim.agents ?? []).find(candidate => candidate.id === cast.targetId && candidate.alive !== false && candidate.roomId === agent.roomId) ?? this.hostilesInRoom(agent, sim)[0] ?? null;
    const sourcePosition = sim?.heroPhysicsSystem?.localPosition?.(agent, sim) ?? { x: 0, z: 0 };
    const targetPosition = target ? (sim?.heroPhysicsSystem?.localPosition?.(target, sim) ?? { x: 0, z: 1 }) : { x: 0, z: 1 };
    const direction = normalizeVector(targetPosition.x - sourcePosition.x, targetPosition.z - sourcePosition.z);
    const hostiles = this.hostilesInRoom(agent, sim);
    const affected = sim?.heroPhysicsSystem?.applyDirectionalImpulse?.(agent, hostiles, direction, effect.impulse ?? 5, sim, {
      length: effect.length ?? 5,
      width: effect.width ?? 3,
      kind: water ? 'water-jet' : 'air-cannon',
      collisionStagger: water ? 0.55 : 0.8
    }) ?? 0;
    for (const hostile of hostiles) {
      const position = sim?.heroPhysicsSystem?.localPosition?.(hostile, sim) ?? { x: 0, z: 0 };
      const dx = position.x - sourcePosition.x;
      const dz = position.z - sourcePosition.z;
      const longitudinal = dx * direction.x + dz * direction.z;
      const lateral = Math.abs(dx * -direction.z + dz * direction.x);
      if (longitudinal < -0.2 || longitudinal > (effect.length ?? 5) || lateral > (effect.width ?? 3) * 0.5) continue;
      if ((effect.damage ?? 0) > 0) sim.applyCombatDamage?.(agent, hostile, effect.damage, { heroSkill: true, pressure: true, water });
    }
    sim?.emitEffect?.(water ? 'hero-water-jet' : 'hero-air-blast', {
      roomId: agent.roomId, agentId: agent.id, duration: 0.85, heroId: agent.heroId,
      length: effect.length ?? 5, width: effect.width ?? 3, directionX: direction.x, directionZ: direction.z,
      colorRole: water ? 'kobold-water' : 'goblin-air'
    });
    return affected > 0 || hostiles.length > 0;
  }

  clearEnvironment(agent, effect, sim) {
    sim?.heroEnvironmentSystem?.clearKinds?.(agent.roomId, effect.kinds ?? [], agent.heroId, sim);
    const room = (sim.rooms ?? []).find(candidate => candidate.id === agent.roomId);
    if (room) {
      room.heroPressureClearedKinds = [...new Set([...(room.heroPressureClearedKinds ?? []), ...(effect.kinds ?? [])])];
      room.heroPressureClearedUntil = (sim.time ?? this.clock) + 5;
    }
    return true;
  }

  diluteSlimes(agent, effect, sim) {
    let count = 0;
    for (const target of this.hostilesInRoom(agent, sim).filter(candidate => String(candidate.role).includes('slime'))) {
      target.heroStatuses ??= {};
      target.heroStatuses.diluted = {
        remaining: effect.duration ?? 5,
        originalAttack: target.attack ?? 0,
        attackMultiplier: effect.attackMultiplier ?? 0.7,
        splitChance: effect.splitChance ?? 0
      };
      target.attack = Math.max(1, Math.round((target.attack ?? 1) * (effect.attackMultiplier ?? 0.7)));
      count += 1;
    }
    return count > 0;
  }

  launchBarrage(agent, effect, sim) {
    return Boolean(sim?.heroDeployableSystem?.launchBarrage?.(agent, effect, sim)?.length);
  }

  deployPressureSeal(agent, cast, effect, sim) {
    const route = cast.targetRouteId ? sim?.routeGraph?.getRoute?.(cast.targetRouteId) : this.selectWaterRoute(agent, sim)?.route ?? null;
    if (!route || !sim?.heroDeployableSystem || !sim?.heroEnvironmentSystem) return false;
    const deployable = sim.heroDeployableSystem.createPressureSeal(agent, route.id, effect, sim);
    sim.heroEnvironmentSystem.createPressureSeal(agent, deployable, effect, sim);
    return true;
  }

  revealSubmergedSockets(agent, sim) {
    const room = (sim.rooms ?? []).find(candidate => candidate.id === agent.roomId);
    if (!room) return false;
    room.heroSubmergedSocketsRevealed = true;
    room.heroSubmergedRevealTime = sim.time ?? this.clock;
    sim?.emitEffect?.('hero-submerged-reveal', { roomId: room.id, agentId: agent.id, heroId: agent.heroId, duration: 1.2, colorRole: 'kobold-water' });
    return true;
  }

  emergencyDrain(agent, effect, sim) {
    if (!sim?.heroEnvironmentSystem) return false;
    sim.heroEnvironmentSystem.createEmergencyDrain(agent, { ...effect, radius: effect.radius ?? 6 }, sim);
    return true;
  }

  deployHealingCauldron(agent, effect, sim) {
    if (!sim?.heroDeployableSystem || !sim?.heroEnvironmentSystem) return false;
    const existing = sim.heroDeployableSystem.deployablesInRoom?.(agent.roomId, 'healing-cauldron') ?? [];
    for (const item of existing) sim.heroDeployableSystem.damageDeployable(item.id, item.hp ?? 999, agent, sim);
    const deployable = sim.heroDeployableSystem.createCauldron(agent, { ...effect, kind: 'healing-cauldron' }, sim);
    sim.heroEnvironmentSystem.createHealingCauldron(agent, deployable, effect, sim);
    return true;
  }

  hookCorpseOrDowned(agent, cast, effect, sim) {
    const target = cast.targetId ? this.findCorpseOrDownedById(cast.targetId, agent, sim) : this.findCorpseOrDowned(agent, sim);
    if (!target || !sim?.heroPhysicsSystem) return false;
    const targetType = target.role ? 'agent' : 'corpse';
    const tether = sim.heroPhysicsSystem.createTether(agent, target, {
      targetType,
      duration: effect.pullDuration ?? 1.5,
      strength: 6,
      maximumDistance: effect.maximumDistance ?? 5.5,
      payload: { action: 'murga-butcher', butcherDuration: effect.butcherDuration ?? 2, meatYield: effect.meatYield ?? 2, heroId: agent.heroId }
    });
    if (!tether) return false;
    sim?.emitEffect?.('hero-hook-line', { roomId: agent.roomId, agentId: agent.id, duration: effect.pullDuration ?? 1.5, heroId: agent.heroId, targetId: target.id, colorRole: 'orc-ember' });
    return true;
  }

  createWarFeast(agent, effect, sim) {
    if (!sim?.heroEnvironmentSystem) return false;
    sim.heroEnvironmentSystem.createWarFeast(agent, effect, sim);
    sim?.emitEffect?.('hero-feast-burst', { roomId: agent.roomId, agentId: agent.id, duration: 1.1, heroId: agent.heroId, radius: effect.radius ?? 6, colorRole: 'orc-ember' });
    return true;
  }

  consumeCompletedTethers(sim) {
    const completed = sim?.heroPhysicsSystem?.takeCompletedTethers?.() ?? [];
    for (const tether of completed) {
      if (tether.payload?.action !== 'murga-butcher') continue;
      const hero = (sim.agents ?? []).find(agent => agent.id === tether.sourceAgentId && agent.alive !== false);
      if (!hero) continue;
      hero.heroStatuses ??= {};
      hero.heroStatuses.butchering = {
        remaining: tether.payload.butcherDuration ?? 2,
        targetId: tether.targetId,
        targetType: tether.targetType,
        meatYield: tether.payload.meatYield ?? 2
      };
      hero.combat = null;
      hero.mood = 'butchering';
    }
  }

  completeButchering(agent, status, sim) {
    let yieldAmount = status.meatYield ?? 2;
    if (status.targetType === 'corpse') {
      const corpses = sim?.ecosystem?.corpses ?? [];
      const corpse = corpses.find(item => item.id === status.targetId);
      if (!corpse) return false;
      yieldAmount += Math.max(0, Math.floor((corpse.food ?? 0) * 0.5));
      sim.ecosystem.corpses = corpses.filter(item => item.id !== corpse.id);
    } else {
      const target = (sim.agents ?? []).find(candidate => candidate.id === status.targetId && candidate.alive !== false);
      if (!target) return false;
      target.hp = 0;
      target.downed = false;
      target.combat = null;
      sim.finalizeDeath?.(agent, target);
      if (target.alive !== false) target.alive = false;
    }
    this.addFactionResource(agent, 'meat', yieldAmount, sim);
    sim?.emitEffect?.('hero-butcher-complete', { roomId: agent.roomId, agentId: agent.id, duration: 0.9, heroId: agent.heroId, colorRole: 'orc-ember' });
    this.emit(`${agent.displayName ?? agent.name} converted the hooked remains into ${yieldAmount} meat.`, { type: 'hero-butchering-complete', heroId: agent.heroId, agentId: agent.id, roomId: agent.roomId, amount: yieldAmount });
    return true;
  }

  addFactionResource(agent, resource, amount, sim) {
    const stores = this.resourceStores(agent, sim);
    const preferred = stores.find(store => store.id.startsWith('site:')) ?? stores[0];
    if (!preferred) return false;
    const key = resourceKey(preferred.pool, resource) ?? resource;
    preferred.pool[key] = (Number(preferred.pool[key]) || 0) + amount;
    return true;
  }

  findHostileOrDamagedStructure(agent, sim) {
    return this.allStructures(sim).find(item => item.roomId === agent.roomId && item.factionId && item.factionId !== factionOf(agent))
      ?? this.allStructures(sim).find(item => item.roomId === agent.roomId && ((Number.isFinite(item.hp) && item.hp < (item.maxHp ?? 100)) || (Number.isFinite(item.integrity) && item.integrity < (item.maxIntegrity ?? 100))))
      ?? null;
  }

  findCorpseOrDowned(agent, sim) {
    const downed = (sim.agents ?? []).find(candidate => candidate.id !== agent.id && candidate.alive !== false && candidate.downed && candidate.roomId === agent.roomId && factionOf(candidate) !== factionOf(agent));
    if (downed) return downed;
    return (sim?.ecosystem?.corpses ?? []).find(corpse => corpse.roomId === agent.roomId) ?? null;
  }

  findCorpseOrDownedById(id, agent, sim) {
    return (sim.agents ?? []).find(candidate => candidate.id === id && candidate.roomId === agent.roomId && candidate.downed)
      ?? (sim?.ecosystem?.corpses ?? []).find(corpse => corpse.id === id && corpse.roomId === agent.roomId)
      ?? null;
  }

  selectWaterRoute(agent, sim) {
    const route = this.connectedRoutes(agent.roomId, sim).find(candidate => {
      if (sim?.heroEnvironmentSystem?.isWaterRouteSuppressed?.(candidate.id)) return false;
      return candidate.water === true || candidate.hazard === 'flooded' || candidate.state === 'flooded' || String(candidate.type ?? '').includes('hydraulic') || String(candidate.id).includes('C1');
    }) ?? null;
    return route ? { targetRouteId: route.id, targetRoomId: agent.roomId, route } : null;
  }

  hasEnvironmentField(roomId, kind, sim) {
    return [...(sim?.heroEnvironmentSystem?.fields?.values?.() ?? [])].some(field => field.roomId === roomId && field.kind === kind && field.remaining > 0);
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
      } else if (zone.kind === 'mourning-veil') {
        for (const target of (sim.agents ?? []).filter(candidate => candidate.alive !== false && candidate.roomId === zone.roomId)) {
          target.heroStatuses ??= {};
          if (factionOf(target) === zone.factionId) {
            target.heroStatuses.veilConcealment = { remaining: 0.4, sourceId: zone.id };
            continue;
          }
          applyExternalSlow(target, zone.multiplier, 0.4, zone.id);
          applyAttackPenalty(target, zone.attackPenalty, 0.4, zone.id);
          if (!zone.affected.has(target.id)) target.combat = null;
          zone.affected.add(target.id);
        }
      } else if (zone.kind === 'ethereal-domain') {
        for (const ally of (sim.agents ?? []).filter(candidate => candidate.alive !== false && candidate.roomId === zone.roomId && factionOf(candidate) === zone.factionId)) {
          ally.heroStatuses ??= {};
          ally.heroStatuses.etherealPassage = { remaining: 0.4, sourceId: zone.id };
          applyExternalSlow(ally, 1.14, 0.4, zone.id);
        }
      } else if (zone.kind === 'memory-bloom') {
        for (const target of (sim.agents ?? []).filter(candidate => candidate.alive !== false && candidate.roomId === zone.roomId)) {
          target.heroStatuses ??= {};
          if (factionOf(target) === zone.factionId) {
            for (const key of ['fear', 'confusion', 'memoryLost']) delete target.heroStatuses[key];
            target.sporeSleep = Math.max(0, (target.sporeSleep ?? 0) - dt * 2.5);
            continue;
          }
          applyAttackPenalty(target, zone.attackPenalty, 0.4, zone.id);
          if (!zone.affected.has(target.id)) {
            target.combat = null;
            target.lastAttackerId = null;
            target.mood = 'memory-scattered';
          }
          zone.affected.add(target.id);
        }
      }
    }
    const expired = this.zones.filter(zone => zone.remaining <= 0);
    for (const zone of expired) {
      if (zone.kind === 'ethereal-domain') {
        const hero = (sim.agents ?? []).find(agent => agent.heroId === zone.heroId);
        if (hero?.heroStatuses) delete hero.heroStatuses.etherealDomain;
        if (hero?.heroVariant === 'unburied-queen') hero.heroVariant = null;
      }
      if (zone.kind === 'mourning-veil') {
        const hero = (sim.agents ?? []).find(agent => agent.heroId === zone.heroId);
        if (hero?.heroStatuses) delete hero.heroStatuses.mourningVeil;
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
      delete agent.heroStatModifiers.skill;
      if (key === 'bastion') agent.heroVariant = null;
      if (key === 'secondDefeat') agent.heroVariant = 'unarmored';
      recomputeHeroStats(agent, definition);
    }
    if (statuses.lanceGrown) {
      statuses.lanceGrown.remaining -= dt;
      if (statuses.lanceGrown.remaining <= 0) {
        delete statuses.lanceGrown;
        if (agent.heroVariant === 'lance-grown') agent.heroVariant = null;
      }
    }
    if (statuses.solitaryBloom) {
      statuses.solitaryBloom.remaining -= dt;
      if (statuses.solitaryBloom.remaining <= 0) {
        const cost = Math.max(1, Math.round(agent.maxHp * (statuses.solitaryBloom.endingHealthCostRatio ?? 0.12)));
        delete statuses.solitaryBloom;
        delete agent.heroStatModifiers.skill;
        agent.communionEnabled = true;
        if (agent.heroVariant === 'solitary-bloom') agent.heroVariant = null;
        agent.hp = Math.max(1, agent.hp - cost);
        recomputeHeroStats(agent, definition);
        this.emit(`${definition.displayName} paid the cost of blooming alone.`, { type: 'hero-solitary-bloom-ended', heroId: definition.id, agentId: agent.id, roomId: agent.roomId, healthCost: cost });
      }
    }
    if (statuses.etherealDomain) statuses.etherealDomain.remaining = Math.max(0, statuses.etherealDomain.remaining - dt);
    if (statuses.mourningVeil) statuses.mourningVeil.remaining = Math.max(0, statuses.mourningVeil.remaining - dt);
    if (statuses.butchering) {
      statuses.butchering.remaining -= dt;
      agent.combat = null;
      agent.mood = 'butchering';
      if (statuses.butchering.remaining <= 0) {
        const completed = this.completeButchering(agent, statuses.butchering, sim);
        delete statuses.butchering;
        agent.mood = completed ? 'fed-the-warband' : 'butchering-failed';
      }
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
      const attackPenalty = statuses.externalAttackPenalty;
      if (attackPenalty) {
        attackPenalty.remaining -= dt;
        if (attackPenalty.remaining <= 0) {
          agent.attack = attackPenalty.originalAttack;
          delete statuses.externalAttackPenalty;
        }
      }
      const stagger = statuses.stagger;
      if (stagger) {
        if (typeof stagger === 'number') {
          statuses.stagger = Math.max(0, stagger - dt);
          if (statuses.stagger <= 0) delete statuses.stagger;
        } else {
          stagger.remaining -= dt;
          if (stagger.remaining <= 0) delete statuses.stagger;
        }
      }
      const armorBreak = statuses.armorBreak;
      if (armorBreak) {
        armorBreak.remaining -= dt;
        if (armorBreak.remaining <= 0) {
          agent.armor = armorBreak.originalArmor;
          delete statuses.armorBreak;
        }
      }
      const rooted = statuses.rooted;
      if (rooted) {
        rooted.remaining -= dt;
        agent.travel = null;
        if (rooted.remaining <= 0) delete statuses.rooted;
      }
      const diluted = statuses.diluted;
      if (diluted) {
        diluted.remaining -= dt;
        if (diluted.remaining <= 0) {
          agent.attack = diluted.originalAttack;
          delete statuses.diluted;
        }
      }
      for (const key of ['brothWarmth', 'warFeast', 'hooked']) {
        const status = statuses[key];
        if (!status) continue;
        status.remaining -= dt;
        if (status.remaining <= 0) delete statuses[key];
      }
      for (const key of ['royalApproach', 'veilConcealment', 'etherealPassage', 'procession']) {
        const status = statuses[key];
        if (!status) continue;
        status.remaining -= dt;
        if (status.remaining <= 0) delete statuses[key];
      }
      const annotation = statuses.courtAnnotation;
      if (annotation) {
        annotation.remaining -= dt;
        if (annotation.remaining <= 0) {
          agent.attack = annotation.originalAttack;
          delete statuses.courtAnnotation;
        }
      }
    }
  }

  increaseAppetite(agent, effect) {
    agent.appetite = Math.max(0, (agent.appetite ?? 0) + (effect.amount ?? 1));
    return true;
  }

  createSpectralGate(agent, cast, effect, sim) {
    const route = cast.targetRouteId
      ? this.connectedRoutes(agent.roomId, sim).find(candidate => candidate.id === cast.targetRouteId)
      : this.selectDefensiveRoute(agent, sim)?.route ?? this.connectedRoutes(agent.roomId, sim)[0];
    if (!route) return false;
    return sim?.heroBarrierSystem?.createSpectralGate?.(agent, route, effect, sim) ?? false;
  }

  banishmentCharge(agent, cast, effect, sim) {
    const target = cast.targetId ? (sim?.agents ?? []).find(candidate => candidate.id === cast.targetId) : this.hostilesInRoom(agent, sim)[0];
    if (!target) return false;
    return sim?.heroBarrierSystem?.banishmentCharge?.(agent, target, effect, sim) ?? false;
  }

  sealAllRoomRoutes(agent, effect, sim) {
    const routes = this.connectedRoutes(agent.roomId, sim).filter(route => route.active !== false);
    return (sim?.heroBarrierSystem?.sealAllRoomRoutes?.(agent, routes, effect, sim) ?? []).length > 0;
  }

  selectDefensiveRoute(agent, sim) {
    const routes = this.connectedRoutes(agent.roomId, sim)
      .filter(route => route.active !== false)
      .filter(route => !sim?.heroBarrierSystem?.barrierForRoute?.(route.id))
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0) || String(a.id).localeCompare(String(b.id)));
    const route = routes[0] ?? null;
    return route ? { targetRouteId: route.id, targetRoomId: agent.roomId, route } : null;
  }

  isRouteBlocked(fromRoomId, toRoomId, agent) {
    const lock = this.routeLocks.find(candidate => pairMatches(candidate, fromRoomId, toRoomId));
    if (!lock) return false;
    if (agent?.incorporeal || agent?.heroStatuses?.etherealPassage || agent?.heroStatuses?.etherealDomain) return false;
    return factionOf(agent) !== lock.allowFaction;
  }

  isMovementBlocked(agent) {
    return Boolean(
      agent?.heroStatuses?.bastion?.rooted ||
      agent?.heroStatuses?.rooted ||
      agent?.heroStatuses?.butchering ||
      (agent?.heroStatuses?.displaced?.remaining ?? 0) > 0 ||
      (agent?.heroStatuses?.hooked?.remaining ?? 0) > 0 ||
      (agent?.heroStatuses?.heroParalysis?.remaining ?? 0) > 0 ||
      (agent?.heroStatuses?.gateLockdown?.remaining ?? 0) > 0
    );
  }

  modifyIncomingDamage(source, target, amount, metadata = {}) {
    let result = amount;
    if (target?.heroId === 'hero.isara' || target?.heroFormKind?.startsWith?.('shade')) {
      const holy = metadata.holy === true || metadata.projectileType === 'holy';
      const physical = metadata.melee === true || metadata.projectileType === 'arrow' || !metadata.projectileType;
      if (holy) result *= 1.45;
      else if (physical) result *= 0.7;
    }
    if (target?.heroStatuses?.veilConcealment && !metadata.holy) result *= 0.82;
    if (target?.heroFormKind === 'guard') result *= 0.8;
    return Math.max(1, Math.round(result));
  }

  modifyOutgoingDamage(attacker, target, amount) {
    let result = amount;
    const duel = this.duels.find(candidate => candidate.heroAgentId === attacker?.id || candidate.targetId === attacker?.id);
    if (duel) {
      const opponent = duel.heroAgentId === attacker.id ? duel.targetId : duel.heroAgentId;
      if (target?.id === opponent) result *= 1 + duel.damageBonus;
      else result *= Math.max(0.1, 1 - duel.offTargetPenalty);
    }
    if (attacker?.heroFormKind === 'king') result *= 1.08;
    if (attacker?.heroFormKind === 'scribe' && target?.heroStatuses?.courtAnnotation) result *= 1.12;
    if (attacker?.heroStatuses?.warFeast) result *= attacker.heroStatuses.warFeast.damageMultiplier ?? 1.18;
    return Math.max(1, Math.round(result));
  }

  projectileSpeedMultiplier(projectile) {
    const zone = this.zones.find(candidate => candidate.kind === 'ethereal-domain' && candidate.roomId === projectile?.roomId && candidate.remaining > 0);
    if (!zone) return 1;
    const sourceFaction = projectile?.sourceFactionId ?? null;
    return sourceFaction === zone.factionId ? 1 : zone.projectileSlow ?? 0.62;
  }

  hasRoomRouteLock(roomId) {
    return this.routeLocks.some(lock => lock.roomId === roomId);
  }

  hasSlowZone(roomId, factionId) {
    return this.zones.some(zone => zone.kind === 'gear-lockfield' && zone.roomId === roomId && zone.factionId === factionId && zone.remaining > 0);
  }

  hasZone(kind, roomId, heroId = null) {
    return this.zones.some(zone => zone.kind === kind && zone.roomId === roomId && zone.remaining > 0 && (!heroId || zone.heroId === heroId));
  }

  adjacentWraithCount(agent, sim) {
    const adjacent = new Set(sim?.graph?.get?.(agent.roomId) ?? []);
    return (sim?.agents ?? []).filter(candidate => candidate.alive !== false && !candidate.departed && !candidate.hidden && adjacent.has(candidate.roomId) && factionOf(candidate) === factionOf(agent) && String(candidate.role ?? '').includes('wraith')).length;
  }

  findDigestible(agent, sim, cast = {}) {
    const corpses = sim?.ecosystem?.corpses ?? [];
    const corpse = cast.targetCorpseId ? corpses.find(candidate => candidate.id === cast.targetCorpseId) : corpses.find(candidate => candidate.roomId === agent.roomId);
    if (corpse) return { kind: 'corpse', item: corpse };
    const cargoSource = sim?.logisticsSystem?.cargo ?? [];
    const cargo = cast.targetCargoId ? cargoSource.find(candidate => candidate.id === cast.targetCargoId) : cargoSource.find(candidate => (candidate.roomId ?? candidate.currentRoomId) === agent.roomId && candidate.state !== 'consumed');
    if (cargo) return { kind: 'cargo', item: cargo };
    const props = sim?.props ?? [];
    const prop = cast.targetPropId ? props.find(candidate => candidate.id === cast.targetPropId) : props.find(candidate => candidate.roomId === agent.roomId && !candidate.consumed && !candidate.unique && !candidate.heroProtected);
    if (prop) return { kind: 'prop', item: prop };
    const structure = this.allStructures(sim).find(candidate => candidate.roomId === agent.roomId && candidate.factionId !== factionOf(agent) && candidate.state !== 'consumed');
    return structure ? { kind: 'structure', item: structure } : null;
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

function applyAttackPenalty(agent, amount, duration, sourceId) {
  agent.heroStatuses ??= {};
  const current = agent.heroStatuses.externalAttackPenalty;
  if (current?.sourceId === sourceId) {
    current.remaining = Math.max(current.remaining, duration);
    return;
  }
  if (current) agent.attack = current.originalAttack;
  const original = Number.isFinite(agent.attack) ? agent.attack : 1;
  agent.heroStatuses.externalAttackPenalty = { sourceId, remaining: duration, originalAttack: original };
  agent.attack = Math.max(1, original - Math.max(0, amount ?? 0));
}

const RESOURCE_ALIASES = Object.freeze({
  powder: ['powder', 'explosives', 'siegePowder', 'powderStock'],
  scrap: ['scrap', 'scrapStock', 'mechanismParts', 'metal'],
  meat: ['meat', 'meatStock', 'foodStock', 'fieldRations']
});

function resourceEntries(pool, resource) {
  const aliases = RESOURCE_ALIASES[resource] ?? [resource];
  return aliases
    .filter(key => Object.prototype.hasOwnProperty.call(pool ?? {}, key))
    .map(key => [key, Math.max(0, Number(pool?.[key]) || 0)])
    .filter(([, amount]) => amount > 0);
}

function resourceKey(pool, resource) {
  const aliases = RESOURCE_ALIASES[resource] ?? [resource];
  return aliases.find(key => Object.prototype.hasOwnProperty.call(pool ?? {}, key)) ?? null;
}

function resourceAmount(pool, resource) {
  const aliases = RESOURCE_ALIASES[resource] ?? [resource];
  return aliases.reduce((sum, key) => sum + Math.max(0, Number(pool?.[key]) || 0), 0);
}

function defaultLedgerFor(factionId) {
  if (factionId === 'goblin-clan') return { powder: 8, scrap: 6 };
  if (factionId === 'copper-tail-clutch') return { scrap: 10 };
  if (factionId === 'red-tusk-tribe') return { meat: 14 };
  return {};
}

function normalizeVector(x, z) {
  const length = Math.hypot(x, z);
  if (length <= 0.0001) return { x: 0, z: 1 };
  return { x: x / length, z: z / length };
}

function strongest(list) {
  return [...list].sort((a, b) => ((b.hp ?? 0) + (b.attack ?? 0) * 4 + (b.armor ?? 0) * 2) - ((a.hp ?? 0) + (a.attack ?? 0) * 4 + (a.armor ?? 0) * 2) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function projectedDistance(source, target) {
  if (!source?.roomCell || !target?.roomCell) return Number.MAX_SAFE_INTEGER;
  return Math.hypot((target.roomCell.x ?? 0) - (source.roomCell.x ?? 0), (target.roomCell.z ?? 0) - (source.roomCell.z ?? 0));
}

function pullToward(source, target, strength) {
  if (!source?.roomCell || !target?.roomCell) return false;
  target.roomCell.x += ((source.roomCell.x ?? 0) - (target.roomCell.x ?? 0)) * strength;
  target.roomCell.z += ((source.roomCell.z ?? 0) - (target.roomCell.z ?? 0)) * strength;
  return true;
}

function pairMatches(lock, from, to) {
  return (lock.from === from && lock.to === to) || (lock.from === to && lock.to === from);
}
