import { DungeonSim as BaseDungeonSim } from './DungeonSim.js';
import { hydrateAgent } from './AgentAI.js';
import { findConnection } from '../engine/DungeonTopology.js';
import { RoomOccupancySystem } from './RoomOccupancySystem.js';
import { PartySystem } from './PartySystem.js';

const PARTY_NAMES = ['Tamsin Reed', 'Berric Holt', 'Nella Ash', 'Lysa Merrow', 'Alda Rook', 'Iven Crow', 'Mara Dain', 'Edran Vale'];
const PARTY_ROLES = ['fighter', 'rogue', 'cleric', 'wizard', 'archer'];

export class DungeonSim extends BaseDungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.occupancy = new RoomOccupancySystem(this.rooms, this.topology);
    this.partySystem = new PartySystem(this.graph);
    this.partySystem.initialize(this.agents);
    this.occupancy.initializeAgents(this.agents);
  }

  update(dt) {
    this.partySystem.update(this.agents);
    super.update(dt);
    this.syncOccupancy();
    this.partySystem.update(this.agents);
  }

  resolve(agent, action) {
    const wasHidden = agent.hidden;
    if (action?.type === 'move') {
      if (action.text) this.event(action.text);
      this.beginTravel(agent, action.roomId, {
        interactionTargetId: action.interactionTargetId ?? null,
        interactionType: action.interactionType ?? null
      });
      return;
    }

    super.resolve(agent, action);

    if (action.type === 'exitDungeon' && agent.departed) {
      this.occupancy.release(agent.id);
      this.occupancy.cancelReservation(agent.id);
      agent.roomCell = null;
    }

    if (wasHidden && !agent.hidden && agent.alive && !agent.travel && !agent.roomCell) {
      this.occupancy.placeAgent(agent, agent.roomId);
    }
  }

  beginTravel(agent, toRoomId, options = {}) {
    if (!toRoomId || toRoomId === agent.roomId || agent.travel) return false;
    if (agent.blockedMoveRoomId === toRoomId && (agent.blockedMoveUntilTurn ?? -1) >= this.turn && !options.interactionTargetId) {
      agent.mood = 'avoiding-blocked-route';
      return false;
    }

    const connection = findConnection(this.topology, agent.roomId, toRoomId);
    if (!connection) {
      this.event(`${agent.name} could not find a legal corridor to ${this.roomName(toRoomId)}.`);
      this.markBlockedMove(agent, toRoomId);
      return false;
    }

    const interactionTarget = options.interactionTargetId
      ? this.agents.find(candidate => candidate.id === options.interactionTargetId && candidate.alive && !candidate.departed)
      : null;
    const validInteractionTarget = interactionTarget && projectedRoom(interactionTarget) === toRoomId;
    const entryPort = toRoomId === connection.aId ? connection.aPort : connection.bPort;
    const destinationCell = this.occupancy.reserveDestination(agent, toRoomId, entryPort, {
      allowInteractionOverflow: Boolean(validInteractionTarget),
      interactionTargetId: validInteractionTarget ? interactionTarget.id : null,
      interactionType: validInteractionTarget ? options.interactionType : null
    });

    if (!destinationCell) {
      this.markBlockedMove(agent, toRoomId);
      this.event(`${agent.name} waited at the door because ${this.roomName(toRoomId)} had no safe floor space.`);
      agent.mood = validInteractionTarget ? 'interaction-door-blocked' : 'waiting-at-door';
      return false;
    }

    const speed = agent.role === 'ogre' ? 2.45 : agent.faction === 'party' ? 4.25 : 3.35;
    const duration = clamp(connection.length / speed, 0.85, agent.role === 'ogre' ? 4.8 : 3.8);
    const fromRoomId = agent.roomId;
    this.occupancy.release(agent.id);
    agent.roomCell = null;
    agent.previousRoomId = fromRoomId;
    agent.blockedMoveRoomId = null;
    agent.blockedMoveUntilTurn = -1;
    agent.travel = {
      phase: 'corridor',
      connectionId: connection.id,
      fromRoomId,
      toRoomId,
      entryPort: { ...entryPort },
      destinationCell: { ...destinationCell, footprint: [...destinationCell.footprint] },
      interactionTargetId: validInteractionTarget ? interactionTarget.id : null,
      interactionType: validInteractionTarget ? options.interactionType : null,
      elapsed: 0,
      duration,
      progress: 0,
      entryProgress: 0
    };
    agent.mood = validInteractionTarget ? `moving-to-${options.interactionType ?? 'interact'}` : 'moving';
    this.event(`${agent.name} entered the corridor toward ${this.roomName(toRoomId)}.`, { type: 'move-start', sourceId: agent.id });
    return true;
  }

  markBlockedMove(agent, roomId) {
    agent.blockedMoveRoomId = roomId;
    agent.blockedMoveUntilTurn = this.turn + 2;
    agent.blockedMoveCount = (agent.blockedMoveCount ?? 0) + 1;
  }

  advanceTravel(dt) {
    for (const agent of this.agents) {
      const travel = agent.travel;
      if (!travel) continue;

      if (!this.isActive(agent)) {
        this.occupancy.cancelReservation(agent.id);
        agent.travel = null;
        continue;
      }

      travel.elapsed += dt;

      if (travel.phase === 'corridor') {
        travel.progress = clamp(travel.elapsed / travel.duration, 0, 1);
        if (travel.progress < 1) continue;

        agent.roomId = travel.toRoomId;
        travel.phase = 'entering';
        travel.elapsed = 0;
        const dx = travel.destinationCell.x - travel.entryPort.x;
        const dz = travel.destinationCell.z - travel.entryPort.z;
        const entryDistance = Math.hypot(dx, dz);
        const entrySpeed = agent.role === 'ogre' ? 1.9 : 2.8;
        travel.duration = clamp(entryDistance / entrySpeed, 0.35, agent.role === 'ogre' ? 2.2 : 1.45);
        travel.entryProgress = 0;
        this.visited.add(travel.toRoomId);
        continue;
      }

      if (travel.phase === 'entering') {
        travel.entryProgress = clamp(travel.elapsed / travel.duration, 0, 1);
        if (travel.entryProgress < 1) continue;

        const fromRoomId = travel.fromRoomId;
        const toRoomId = travel.toRoomId;
        this.occupancy.commitReservation(agent, travel.destinationCell);
        const overflow = Boolean(travel.destinationCell.overflow);
        agent.travel = null;
        agent.mood = overflow ? `arrived-to-${travel.interactionType ?? 'interact'}` : 'curious';
        this.event(
          overflow
            ? `${agent.name} squeezed into ${this.roomName(toRoomId)} to reach an interaction target.`
            : `${agent.name} entered ${this.roomName(toRoomId)} from ${this.roomName(fromRoomId)} without landing on anyone.`,
          { type: 'move-end', sourceId: agent.id, overflow }
        );
        this.checkRoomEffect(agent);
        this.checkTraps(agent);
      }
    }
  }

  onDeath(killer, target) {
    this.occupancy.release(target.id);
    this.occupancy.cancelReservation(target.id);
    target.roomCell = null;
    super.onDeath(killer, target);
  }

  returnParty() {
    this.returnClock = null;
    this.generation += 1;
    const entry = this.rooms.find(room => room.kind === 'start')?.id ?? this.rooms[0].id;
    const departed = this.agents.filter(agent => agent.alive && agent.departed && agent.faction === 'party');

    for (const agent of departed) {
      agent.departed = false;
      agent.roomId = entry;
      agent.travel = null;
      agent.hp = agent.maxHp;
      this.occupancy.placeAgent(agent, entry);
      this.event(`${agent.name} returned at level ${agent.level}, which was not comforting.`);
    }

    const livingParty = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party');
    const desiredSize = this.generation % 3 === 0 ? 5 : 4;
    const preferredPartyId = livingParty.find(agent => agent.partyId)?.partyId ?? null;

    while (livingParty.length < desiredSize) {
      const role = PARTY_ROLES[livingParty.length % PARTY_ROLES.length];
      const name = PARTY_NAMES[this.agentSeq % PARTY_NAMES.length];
      const recruit = hydrateAgent({
        id: `party-${this.agentSeq++}`,
        name,
        role,
        faction: 'party',
        roomId: entry,
        level: Math.max(1, Math.floor(this.reputation / 3))
      }, this.agentSeq);
      this.agents.push(recruit);
      livingParty.push(recruit);
      this.partySystem.addAgent(recruit, preferredPartyId);
      this.occupancy.placeAgent(recruit, entry);
      this.event(`${name} joined the expedition after hearing an inaccurate version of events.`);
    }

    this.partySystem.initialize(this.agents);
  }

  spawnMonster(forcedRole = null) {
    const before = this.agents.length;
    super.spawnMonster(forcedRole);
    const spawned = this.agents[before];
    if (!spawned) return;

    const placement = this.occupancy.placeAgent(spawned, spawned.roomId);
    if (!placement) {
      this.agents.splice(before, 1);
      this.event(`${spawned.name} could not emerge because ${this.roomName(spawned.roomId)} was already full.`);
    }
  }

  syncOccupancy() {
    for (const agent of this.agents) {
      if (!agent.alive || agent.departed || agent.hidden) {
        this.occupancy.release(agent.id);
        this.occupancy.cancelReservation(agent.id);
        if (!agent.travel) agent.roomCell = null;
        continue;
      }
      if (!agent.travel && !agent.roomCell) this.occupancy.placeAgent(agent, agent.roomId);
    }
  }

  snapshot() {
    return {
      ...super.snapshot(),
      occupancy: this.occupancy.snapshot(),
      parties: this.partySystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      orphaned: this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party' && agent.orphaned).length,
      interactionOverflowLandings: this.agents.filter(agent => agent.roomCell?.overflow).length,
      blockedMovementRetries: this.agents.reduce((sum, agent) => sum + (agent.blockedMoveCount ?? 0), 0)
    };
  }
}

function projectedRoom(agent) {
  return agent.travel?.toRoomId ?? agent.roomId;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
