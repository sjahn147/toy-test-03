import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';

export function decideHeroAction(agent, sim, skillSystem) {
  const definition = getHeroDefinition(agent?.heroId ?? agent?.role);
  if (!definition || !isAvailable(agent)) return null;
  const hostiles = roomHostiles(agent, sim);
  const allies = roomAllies(agent, sim);
  const healthRatio = (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? 1);

  if (definition.id === 'hero.nibble') {
    if (healthRatio <= 0.38 && allies.length > 0 && strengthRatio(agent, allies, hostiles) < 0.62) {
      return cast(agent, 'nibble-everyone-out', { targetRoomId: agent.roomId });
    }
    if (skillSystem.hasUnlockableTarget(agent, sim)) {
      return cast(agent, 'nibble-master-key', skillSystem.selectUnlockableTarget(agent, sim));
    }
    if (hostiles.length >= 2 && !skillSystem.hasRoomRouteLock(agent.roomId)) {
      return cast(agent, 'nibble-lock-the-ways', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.kirik') {
    const damagedStructure = skillSystem.findDamagedFriendlyStructure(agent, sim);
    const trap = skillSystem.findFriendlyTrap(agent, sim);
    if ((healthRatio <= 0.58 || hostiles.length >= 3) && !agent.heroStatuses?.bastion) {
      return cast(agent, 'kirik-triangle-bastion', { targetRoomId: agent.roomId });
    }
    if (damagedStructure || trap) {
      return cast(agent, 'kirik-reconfigure-trap', {
        targetStructureId: damagedStructure?.id ?? null,
        targetTrapId: trap?.id ?? null,
        targetRoomId: agent.roomId
      });
    }
    if (hostiles.length >= 2 && !skillSystem.hasSlowZone(agent.roomId, definition.factionId)) {
      return cast(agent, 'kirik-gear-lockfield', { targetRoomId: agent.roomId });
    }
  }

  if (definition.id === 'hero.karg') {
    if (healthRatio <= 0.36 && !agent.heroStatuses?.secondDefeat) {
      return cast(agent, 'karg-remember-second-defeat', { targetId: agent.id, targetRoomId: agent.roomId });
    }
    if (hostiles.length >= 2) {
      return cast(agent, 'karg-broken-blade-circle', { targetRoomId: agent.roomId });
    }
    if (hostiles.length === 1 && !skillSystem.duelForHero(definition.id)) {
      return cast(agent, 'karg-declare-duel', { targetId: strongest(hostiles)?.id, targetRoomId: agent.roomId });
    }
  }

  return null;
}

function cast(agent, skillId, payload = {}) {
  const cooldown = agent.heroCooldowns?.[skillId] ?? 0;
  if (cooldown > 0) return null;
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

function isAvailable(agent) {
  return agent && agent.alive !== false && !agent.departed && !agent.hidden && !agent.downed && !agent.travel && !agent.combat && !agent.heroCast;
}
