import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';

export function decideHeroAction(agent, sim, skillSystem) {
  const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
  if (!definition || !isAvailable(agent)) return null;
  const hostiles = roomHostiles(agent, sim);
  const allies = roomAllies(agent, sim);
  const healthRatio = (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? 1);

  if (definition.id === 'hero.nibble') {
    if (healthRatio <= 0.38 && allies.length > 0 && strengthRatio(agent, allies, hostiles) < 0.62) {
      return castAvailable(agent, definition, skillSystem, sim, 'nibble-everyone-out', { targetRoomId: agent.roomId });
    }
    if (skillSystem.hasUnlockableTarget(agent, sim)) {
      return castAvailable(agent, definition, skillSystem, sim, 'nibble-master-key', skillSystem.selectUnlockableTarget(agent, sim));
    }
    if (hostiles.length >= 2 && !skillSystem.hasRoomRouteLock(agent.roomId)) {
      return castAvailable(agent, definition, skillSystem, sim, 'nibble-lock-the-ways', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.kirik') {
    const damagedStructure = skillSystem.findDamagedFriendlyStructure(agent, sim);
    const trap = skillSystem.findFriendlyTrap(agent, sim);
    if ((healthRatio <= 0.58 || hostiles.length >= 3) && !agent.heroStatuses?.bastion) {
      return castAvailable(agent, definition, skillSystem, sim, 'kirik-triangle-bastion', { targetRoomId: agent.roomId });
    }
    if (damagedStructure || trap) {
      return castAvailable(agent, definition, skillSystem, sim, 'kirik-reconfigure-trap', {
        targetStructureId: damagedStructure?.id ?? null,
        targetTrapId: trap?.id ?? null,
        targetRoomId: agent.roomId
      });
    }
    if (hostiles.length >= 2 && !skillSystem.hasSlowZone(agent.roomId, definition.factionId)) {
      return castAvailable(agent, definition, skillSystem, sim, 'kirik-gear-lockfield', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.karg') {
    if (healthRatio <= 0.36 && !agent.heroStatuses?.secondDefeat) {
      return castAvailable(agent, definition, skillSystem, sim, 'karg-remember-second-defeat', { targetId: agent.id, targetRoomId: agent.roomId });
    }
    if (hostiles.length >= 2) {
      return castAvailable(agent, definition, skillSystem, sim, 'karg-broken-blade-circle', { targetRoomId: agent.roomId });
    }
    if (hostiles.length === 1 && !skillSystem.duelForHero(definition.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'karg-declare-duel', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.jijik') {
    if (hostiles.length >= 3) {
      const barrage = castAvailable(agent, definition, skillSystem, sim, 'jijik-three-point-barrage', { targetRoomId: agent.roomId });
      if (barrage) return barrage;
    }
    const structure = skillSystem.findHostileOrDamagedStructure(agent, sim);
    const chargePresent = (sim?.heroDeployableSystem?.deployablesInRoom?.(agent.roomId, 'breach-charge') ?? []).length > 0;
    if (!chargePresent && (structure || hostiles.length >= 2)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'jijik-breach-charge', { targetStructureId: structure?.id ?? null, targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 1) {
      return castAvailable(agent, definition, skillSystem, sim, 'jijik-air-cannon', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.tissa') {
    const room = (sim.rooms ?? []).find(candidate => candidate.id === agent.roomId);
    if (isFlooded(room) && allies.length >= 1 && !skillSystem.hasEnvironmentField(agent.roomId, 'emergency-drain', sim)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'tissa-emergency-drain', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    const waterRoute = skillSystem.selectWaterRoute(agent, sim);
    if (waterRoute && !sim?.heroEnvironmentSystem?.isWaterRouteSuppressed?.(waterRoute.targetRouteId)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'tissa-pressure-seal', waterRoute);
      if (action) return action;
    }
    if (hostiles.length >= 1) {
      return castAvailable(agent, definition, skillSystem, sim, 'tissa-pressure-jet', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.murga') {
    const wounded = allies.filter(candidate => candidate.hp < (candidate.maxHp ?? candidate.hp) * 0.72);
    if (allies.length >= 3 && hostiles.length >= 2 && !skillSystem.hasEnvironmentField(agent.roomId, 'war-feast', sim)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'murga-war-feast', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    const cauldronPresent = (sim?.heroDeployableSystem?.deployablesInRoom?.(agent.roomId, 'healing-cauldron') ?? []).length > 0;
    if (wounded.length >= 2 && !cauldronPresent) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'murga-blood-root-broth', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    const target = skillSystem.findCorpseOrDowned(agent, sim);
    if (target) {
      return castAvailable(agent, definition, skillSystem, sim, 'murga-butchers-hook', { targetId: target.id, targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.isara') {
    if (healthRatio <= 0.55 && hostiles.length >= 3 && !skillSystem.hasZone('ethereal-domain', agent.roomId, definition.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'isara-unburied-queen', { targetRoomId: agent.roomId });
    }
    if (hostiles.length >= 1 && skillSystem.adjacentWraithCount(agent, sim) > 0) {
      return castAvailable(agent, definition, skillSystem, sim, 'isara-soul-procession', { targetRoomId: agent.roomId });
    }
    if (hostiles.length >= 2 && !skillSystem.hasZone('mourning-veil', agent.roomId, definition.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'isara-mourning-veil', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.orum-bell') {
    if (healthRatio <= 0.46 && !agent.heroStatuses?.solitaryBloom) {
      return castAvailable(agent, definition, skillSystem, sim, 'orum-solitary-bloom', { targetId: agent.id, targetRoomId: agent.roomId });
    }
    const allyNeedsMemory = allies.some(ally => ally.heroStatuses?.fear || ally.heroStatuses?.confusion || (ally.sporeSleep ?? 0) > 0);
    if ((hostiles.length >= 2 || allyNeedsMemory) && !skillSystem.hasZone('memory-bloom', agent.roomId, definition.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'orum-memory-bloom', { targetRoomId: agent.roomId });
    }
    if (hostiles.length) {
      return castAvailable(agent, definition, skillSystem, sim, 'orum-mycelial-lance', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.glop') {
    if (healthRatio <= 0.48 && hostiles.length >= 2 && !sim?.heroFormSystem?.groupForOwner?.(agent.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'glop-one-court', { targetId: agent.id, targetRoomId: agent.roomId });
    }
    const digestible = skillSystem.findDigestible(agent, sim);
    if (digestible && healthRatio <= 0.78) {
      return castAvailable(agent, definition, skillSystem, sim, 'glop-digest-evidence', {
        targetRoomId: agent.roomId,
        targetPropId: digestible.kind === 'prop' ? digestible.item.id : null,
        targetCargoId: digestible.kind === 'cargo' ? digestible.item.id : null,
        targetCorpseId: digestible.kind === 'corpse' ? digestible.item.id : null,
        targetStructureId: digestible.kind === 'structure' ? digestible.item.id : null
      });
    }
    if (hostiles.length) {
      return castAvailable(agent, definition, skillSystem, sim, 'glop-royal-command', { targetRoomId: agent.roomId, commandMode: hostiles.length >= 2 ? 'kneel' : 'approach' });
    }
  }


  if (definition.id === 'hero.aldren') {
    const skeletonAllies = allies.filter(candidate => String(candidate.role ?? '').includes('skeleton') || candidate.heroSummonKind === 'royal-skeleton');
    if (hostiles.length >= 2 && sim?.heroNecromancySystem?.corpseCount?.(agent.roomId, sim) >= 1) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'aldren-unrevoked-order', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (skeletonAllies.length >= 2 && hostiles.length >= 1 && !(sim?.heroFormationSystem?.formations ?? []).some(item => item.ownerId === agent.id)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'aldren-royal-line', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 1) return castAvailable(agent, definition, skillSystem, sim, 'aldren-shield-judgment', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }

  if (definition.id === 'hero.malcor') {
    const corpseCount = sim?.heroNecromancySystem?.corpseCount?.(agent.roomId, sim) ?? 0;
    if (corpseCount >= 2 && hostiles.length >= 2) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'malcor-hungry-feast', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (corpseCount >= 1 && healthRatio <= 0.78) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'malcor-memory-flesh', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 1) return castAvailable(agent, definition, skillSystem, sim, 'malcor-predators-cry', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }

  if (definition.id === 'hero.arvek') {
    const barriers = sim?.heroBarrierSystem?.barriers?.filter?.(item => item.ownerId === agent.id && item.hp > 0) ?? [];
    if ((healthRatio <= 0.68 || hostiles.length >= 3) && barriers.length < 2) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'arvek-close-the-city', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 1 && barriers.length === 0) {
      const route = skillSystem.selectDefensiveRoute?.(agent, sim);
      const action = castAvailable(agent, definition, skillSystem, sim, 'arvek-black-gate', route ?? { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 1) return castAvailable(agent, definition, skillSystem, sim, 'arvek-banishment-sentence', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }


  if (definition.id === 'hero.pev') {
    if (healthRatio <= 0.52 && !agent.heroStatuses?.selectiveAssimilation) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'pev-selective-assimilation', { targetId: agent.id, targetRoomId: agent.roomId });
      if (action) return action;
    }
    const ally = allies.sort((a, b) => ((b.armor ?? 0) + (b.attack ?? 0)) - ((a.armor ?? 0) + (a.attack ?? 0)))[0];
    if (ally && !agent.heroStatuses?.borrowedShape) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'pev-borrowed-shape', { targetId: ally.id, targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length || (sim?.heroEnvironmentSystem?.fields ?? []).some(field => field.roomId === agent.roomId)) {
      return castAvailable(agent, definition, skillSystem, sim, 'pev-purifying-bubble', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.eighth-cocoon') {
    if (healthRatio <= 0.45 && !agent.heroStatuses?.feralShell) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'cocoon-cast-off-shell', { targetId: agent.id, targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 2 && !(sim?.heroBroodSystem?.guards ?? []).some(item => item.ownerId === agent.id)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'cocoon-thread-guard', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length) return castAvailable(agent, definition, skillSystem, sim, 'cocoon-silk-lance', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }

  if (definition.id === 'hero.empty-queen-hand') {
    const clutches = (sim?.heroBroodSystem?.clutches ?? []).filter(item => item.ownerId === agent.id);
    if ((healthRatio <= 0.7 || hostiles.length >= 3) && !(sim?.heroBroodSystem?.domains ?? []).some(item => item.ownerId === agent.id)) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'queen-without-body', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (clutches.length < 2 && hostiles.length >= 1) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'queen-lay-royal-clutch', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    return castAvailable(agent, definition, skillSystem, sim, 'queen-reassign-brood', { targetRoomId: agent.roomId });
  }

  if (definition.id === 'hero.failed-successor') {
    if (healthRatio <= 0.5 && !agent.heroStatuses?.shedPrince) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'successor-shed-the-prince', { targetId: agent.id, targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (!agent.heroStatuses?.falseInvestiture && (/^[EKL]/.test(agent.roomId ?? '') || (sim?.heroBarrierSystem?.barriers ?? []).some(item => item.roomId === agent.roomId))) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'successor-false-investiture', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length) return castAvailable(agent, definition, skillSystem, sim, 'successor-borrowed-gesture', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }

  if (definition.id === 'hero.sleeping-gardener') {
    const hostileFields = [...(sim?.heroEnvironmentSystem?.fields ?? []), ...(sim?.heroSkillSystem?.zones ?? [])].filter(item => item.roomId === agent.roomId && item.ownerId !== agent.id);
    if (hostileFields.length) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'gardener-prune-the-blight', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 2 && !agent.heroStatuses?.seasonalTurn) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'gardener-turn-of-seasons', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if ((hostiles.length || allies.some(item => item.hp < (item.maxHp ?? item.hp) * 0.8)) && !(sim?.heroGardenSystem?.patches ?? []).some(item => item.ownerId === agent.id)) {
      return castAvailable(agent, definition, skillSystem, sim, 'gardener-rooted-orchard', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.goldcrown-back') {
    if (healthRatio <= 0.48 && !agent.heroStatuses?.royalMolt) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'goldcrown-royal-molt', { targetId: agent.id, targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length >= 2 && (agent.hoardArmor ?? 0) > 0) {
      const action = castAvailable(agent, definition, skillSystem, sim, 'goldcrown-trophy-volley', { targetRoomId: agent.roomId });
      if (action) return action;
    }
    if (hostiles.length) return castAvailable(agent, definition, skillSystem, sim, 'goldcrown-bone-rake-charge', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
  }

  return null;
}

function castAvailable(agent, definition, skillSystem, sim, skillId, payload = {}) {
  const skill = definition.skills.find(candidate => candidate.id === skillId);
  if (!skill || !skillSystem.canCast(agent, skill, sim)) return null;
  return { type: 'hero-cast', skillId, ...payload };
}

function roomHostiles(agent, sim) {
  return (sim.agents ?? []).filter(candidate =>
    candidate.id !== agent.id && candidate.alive !== false && !candidate.departed && !candidate.hidden && !candidate.travel &&
    candidate.roomId === agent.roomId && !sameFaction(agent, candidate)
  );
}

function roomAllies(agent, sim) {
  return (sim.agents ?? []).filter(candidate =>
    candidate.id !== agent.id && candidate.alive !== false && !candidate.departed && !candidate.hidden && candidate.roomId === agent.roomId && sameFaction(agent, candidate)
  );
}

function sameFaction(a, b) {
  const af = a.ecologyFaction ?? a.factionId ?? a.faction;
  const bf = b.ecologyFaction ?? b.factionId ?? b.faction;
  return af && bf && af === bf;
}

function strengthRatio(agent, allies, hostiles) {
  const allyPower = [agent, ...allies].reduce((sum, candidate) => sum + (candidate.hp ?? 1) + (candidate.attack ?? 1) * 3, 0);
  const hostilePower = hostiles.reduce((sum, candidate) => sum + (candidate.hp ?? 1) + (candidate.attack ?? 1) * 3, 0);
  return allyPower / Math.max(1, hostilePower);
}

function strongest(list) {
  return [...list].sort((a, b) => ((b.hp ?? 0) + (b.attack ?? 0) * 4) - ((a.hp ?? 0) + (a.attack ?? 0) * 4) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function isFlooded(room) {
  if (!room) return false;
  const tags = new Set(room.tags ?? []);
  return room.heroEnvironmentState === 'flooded' || room.waterLevel > 0 || ['flooded', 'water', 'reservoir', 'sluice-control', 'flood-hazard'].some(tag => tags.has(tag));
}

function isAvailable(agent) {
  return agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.travel && !agent.combat && !agent.heroCast && !agent.heroStatuses?.butchering;
}
