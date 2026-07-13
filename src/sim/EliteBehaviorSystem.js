import { nearestRoom, nextStep } from './Pathfinding.js';
import { getEliteDefinition, isEliteRole } from '../content/elite/EliteBestiary.js';

export class EliteBehaviorSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.moves = 0;
  }

  update(dt, sim) {
    for (const agent of sim.agents ?? []) {
      if (!isEliteRole(agent.role)) continue;
      agent.eliteBehaviorCooldown = Math.max(0, (agent.eliteBehaviorCooldown ?? 0) - dt);
    }
  }

  decide(agent, sim) {
    if (!isEliteRole(agent?.role) || !agent.alive || agent.departed || agent.hidden || agent.downed || agent.travel || agent.combat || agent.eliteCast || (agent.eliteBehaviorCooldown ?? 0) > 0) return null;
    const definition = getEliteDefinition(agent.role);
    const tags = new Set(definition?.tags ?? []);
    const hostileHere = (sim.agents ?? []).some(target => target.alive && !target.hidden && !target.departed && target.roomId === agent.roomId && target.faction !== agent.faction);
    if (hostileHere) return null;

    if (agent.mood?.startsWith('retreat') || agent.hp < agent.maxHp * 0.28) {
      return this.moveToward(agent, agent.homeRoomId, sim, 'retreat');
    }

    if (tags.has('corpse-user') || tags.has('scavenger') || tags.has('predator')) {
      const corpseRooms = [...new Set((sim.ecosystem?.corpses ?? []).map(corpse => corpse.roomId))];
      const destination = nearestRoom(sim.graph, agent.roomId, corpseRooms);
      const action = this.moveToward(agent, destination, sim, 'scavenge');
      if (action) return action;
    }

    if (tags.has('carrier') && agent.homeSiteId) {
      const site = sim.spawnNetworkSystem?.sites?.get(agent.homeSiteId);
      if (site && agent.roomId !== site.roomId) return this.moveToward(agent, site.roomId, sim, 'haul-home');
    }

    if (tags.has('ambusher') || tags.has('vanguard') || tags.has('producer')) return { type: 'elite-hold-position', reason: 'role-posture' };

    const partyRooms = [...new Set((sim.agents ?? []).filter(target => target.faction === 'party' && target.alive && !target.departed).map(target => target.roomId))];
    const partyRoom = nearestRoom(sim.graph, agent.roomId, partyRooms);
    if ((tags.has('skirmisher') || tags.has('commander') || tags.has('artillery')) && partyRoom) {
      return this.moveToward(agent, partyRoom, sim, 'hunt-party');
    }

    const patrol = this.patrolRoom(agent, sim);
    return patrol ? { type: 'elite-move', roomId: patrol, reason: 'site-patrol' } : { type: 'elite-hold-position', reason: 'site-guard' };
  }

  resolve(agent, action, sim) {
    if (!action?.type?.startsWith('elite-')) return false;
    if (action.type === 'elite-hold-position') {
      agent.eliteBehaviorCooldown = 2.5;
      agent.mood = action.reason;
      return true;
    }
    if (action.type === 'elite-move' && action.roomId && action.roomId !== agent.roomId) {
      sim.beginTravel?.(agent, action.roomId);
      agent.eliteBehaviorCooldown = 3.5;
      agent.mood = action.reason;
      this.moves += 1;
      return true;
    }
    return true;
  }

  moveToward(agent, destination, sim, reason) {
    if (!destination || destination === agent.roomId) return null;
    const step = nextStep(sim.graph, agent.roomId, destination);
    return step && step !== agent.roomId ? { type: 'elite-move', roomId: step, destination, reason } : null;
  }

  patrolRoom(agent, sim) {
    const neighbors = [...(sim.graph?.get?.(agent.roomId) ?? [])].sort();
    if (!neighbors.length) return null;
    const safe = neighbors.filter(roomId => {
      const room = (sim.rooms ?? []).find(candidate => candidate.id === roomId);
      if (room?.tags?.includes('safe_zone') || room?.tags?.includes('safe-zone')) return false;
      const territory = sim.advancedEcologySystem?.territories?.get?.(roomId);
      return !territory?.ownerFaction || territory.ownerFaction === agent.ecologyFaction;
    });
    const choices = safe.length ? safe : neighbors;
    const seed = [...String(agent.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return choices[seed % choices.length] ?? null;
  }

  snapshot() {
    return { moves: this.moves };
  }

  metrics() {
    return { eliteBehaviorMoves: this.moves };
  }
}
