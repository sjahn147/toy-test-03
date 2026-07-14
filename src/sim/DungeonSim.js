import { buildGraph } from './Pathfinding.js';
import { hydrateAgent, decideAction } from './AgentAI.js';
import { buildDungeonTopology, findConnection } from '../engine/DungeonTopology.js';
import { ActiveCampaignGraph } from '../domain/ActiveCampaignGraph.js';
import { VerticalConnectorSystem } from './VerticalConnectorSystem.js';

const PARTY_NAMES = ['Rana', 'Milo', 'Sister Pell', 'Orwin', 'Tamsin', 'Berric', 'Nell', 'Grubbs'];
const PARTY_ROLES = ['fighter', 'rogue', 'cleric', 'wizard', 'archer'];
const MONSTER_ROLES = ['goblin', 'skeleton', 'slime'];

export class DungeonSim {
  constructor(scenario, { onEvent } = {}) {
    this.scenario = scenario;
    this.rooms = cloneData(scenario.rooms);
    this.props = cloneData(scenario.props);
    this.agents = scenario.agents.map(hydrateAgent);
    this.routeGraph = Array.isArray(scenario.routes) ? new ActiveCampaignGraph(scenario.routes) : null;
    this.verticalConnectorSystem = new VerticalConnectorSystem(scenario.verticalConnectors ?? [], this.rooms);
    this.graph = buildGraph(this.navigationLinks());
    this.topology = buildDungeonTopology(this.rooms, this.routeGraph ? this.routeGraph.activeRoutes() : scenario.links, {
      authoredPhysicalLayout: scenario.meta?.authoredPhysicalLayout === true
    });
    this.routeGraphUnsubscribe = this.routeGraph?.subscribe(event => this.rebuildActiveRouteGraph(event)) ?? null;
    this.visited = new Set(['entry']);
    this.onEvent = onEvent ?? (() => {});
    this.time = 0;
    this.turn = 0;
    this.accumulator = 0;
    this.turnInterval = 2.75;
    this.lastNoiseRoom = null;
    this.ended = false;
    this.agentSeq = this.agents.length;
    this.propSeq = this.props.length;
    this.effectSeq = 0;
    this.effects = [];
    this.monsterFood = 1;
    this.reputation = 1;
    this.generation = 1;
    this.returnClock = null;
    this.spawnClock = null;
    this.monsterCounters = this.buildMonsterCounters();
    this.event(`${scenario.name} was placed under the glass.`);
  }

  update(dt) {
    this.time += dt;
    this.advanceTravel(dt);
    this.pruneEffects();
    this.accumulator += dt;

    if (this.accumulator < this.turnInterval) return;
    this.accumulator = 0;
    this.turn += 1;
    this.lastNoiseRoom = this.turn % 5 === 0 ? null : this.lastNoiseRoom;

    const acting = this.agents
      .filter(agent => this.isActive(agent) && !agent.travel)
      .sort((a, b) => a.index - b.index);

    for (const agent of acting) {
      this.resolve(agent, decideAction(agent, this));
      if (!agent.travel && this.isActive(agent)) {
        this.checkRoomEffect(agent);
        this.checkTraps(agent);
      }
    }

    this.ecosystemTick();
  }

  isActive(agent) {
    return agent.alive && !agent.departed;
  }

  navigationLinks() {
    const horizontal = this.routeGraph ? this.routeGraph.activeLinks() : (this.scenario.links ?? []);
    return [...horizontal, ...this.verticalConnectorSystem.activeLinks()];
  }

  rebuildActiveRouteGraph(event = null) {
    if (!this.routeGraph) return;
    const activeRoutes = this.routeGraph.activeRoutes();
    this.graph = buildGraph(this.navigationLinks());
    this.topology = buildDungeonTopology(this.rooms, activeRoutes, {
      authoredPhysicalLayout: this.scenario?.meta?.authoredPhysicalLayout === true
    });
    const activeRouteIds = new Set(activeRoutes.map(route => route.id));
    for (const agent of this.agents) {
      if (!agent.travel || agent.travel.kind === 'vertical-connector' || activeRouteIds.has(agent.travel.connectionId)) continue;
      const origin = agent.travel.fromRoomId;
      agent.travel = null;
      if (origin) agent.roomId = origin;
      agent.mood = 'route-blocked';
    }
    if (event?.routeId) this.event(`Route ${event.routeId} changed from ${event.previousState} to ${event.state}.`, {
      type: 'route-state', routeId: event.routeId, previousState: event.previousState, state: event.state
    });
  }

  setRouteState(routeId, state, metadata = {}) {
    if (this.verticalConnectorSystem.get(routeId)) return this.setConnectorState(routeId, state, metadata);
    if (!this.routeGraph) return { ok: false, error: 'scenario has no active campaign route graph' };
    return this.routeGraph.setRouteState(routeId, state, metadata);
  }

  routeState(routeId) {
    return this.verticalConnectorSystem.get(routeId) ?? this.routeGraph?.getRoute(routeId) ?? null;
  }

  setConnectorState(connectorId, state, metadata = {}) {
    const result = this.verticalConnectorSystem.setState(connectorId, state, metadata);
    if (!result.ok || !result.changed) return result;
    this.graph = buildGraph(this.navigationLinks());
    if (!result.connector.active) {
      for (const agent of this.agents) {
        if (agent.travel?.kind !== 'vertical-connector' || agent.travel.connectorId !== result.connector.id) continue;
        const origin = agent.travel.fromRoomId;
        this.verticalConnectorSystem.release(agent.id, result.connector.id);
        agent.travel = null;
        if (origin) agent.roomId = origin;
        agent.mood = 'route-blocked';
      }
    }
    this.event(`Connector ${result.connector.id} changed from ${result.previousState} to ${result.state}.`, { type:'vertical-connector-state', connectorId:result.connector.id, previousState:result.previousState, state:result.state });
    return result;
  }

  resolve(agent, action) {
    if (!this.isActive(agent) || agent.travel) return;
    if (action.text) this.event(action.text);

    if (action.type === 'move') {
      this.beginTravel(agent, action.roomId);
      return;
    }

    if (action.type === 'exitDungeon') {
      agent.departed = true;
      agent.level += 1;
      agent.maxHp += 2;
      agent.attack += agent.level % 2 === 0 ? 1 : 0;
      agent.hp = agent.maxHp;
      this.reputation += 0.35 + agent.gold * 0.04;
      this.event(`${agent.name} escaped with ${agent.gold} coins and promised to come back with worse friends.`);
      this.scheduleReturn();
      return;
    }

    if (action.type === 'attack') {
      const target = this.agents.find(candidate => candidate.id === action.targetId);
      if (!target || !this.isActive(target) || target.travel) return;
      const roll = 1 + Math.floor(Math.random() * 6);
      const damage = Math.max(1, Math.floor(action.text ? agent.attack + roll / 2 : agent.attack + roll - 3));
      target.hp -= damage;
      this.lastNoiseRoom = agent.roomId;
      this.emitEffect('attack', { roomId: agent.roomId, agentId: target.id, duration: 0.58, amount: damage });
      this.event(`${agent.name} hit ${target.name} for ${damage}.`, { type: 'attack', sourceId: agent.id, targetId: target.id, amount: damage });
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
        target.travel = null;
        this.onDeath(agent, target);
      }
      return;
    }

    if (action.type === 'heal') {
      const target = this.agents.find(candidate => candidate.id === action.targetId);
      if (!target || !this.isActive(target) || target.travel) return;
      const amount = 4 + Math.floor(Math.random() * 4);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      this.emitEffect('heal', { roomId: target.roomId, agentId: target.id, duration: 0.85, amount });
      this.event(`${agent.name} patched up ${target.name} for ${amount}.`, { type: 'heal', sourceId: agent.id, targetId: target.id, amount });
      return;
    }

    if (action.type === 'openTreasure') {
      const prop = this.props.find(candidate => candidate.id === action.propId);
      if (!prop || prop.opened) return;
      prop.opened = true;
      const mimic = this.agents.find(candidate => this.isActive(candidate) && candidate.role === 'mimic' && candidate.roomId === agent.roomId && candidate.hidden);
      if (mimic && Math.random() < 0.72) {
        mimic.hidden = false;
        this.event(`${agent.name} opened ${prop.label}. ${mimic.name} opened back.`);
        this.resolve(mimic, { type: 'attack', targetId: agent.id });
      } else {
        const gold = 2 + Math.floor(Math.random() * 7);
        agent.gold += gold;
        this.reputation += gold * 0.05;
        this.emitEffect('gold', { roomId: agent.roomId, agentId: agent.id, duration: 1.05, amount: gold });
        this.event(`${agent.name} found ${gold} suspicious coins.`, { type: 'gold', targetId: agent.id, amount: gold });
      }
    }
  }

  beginTravel(agent, toRoomId) {
    if (!toRoomId || toRoomId === agent.roomId) return;
    let connection = findConnection(this.topology, agent.roomId, toRoomId);
    if (!connection) connection = this.verticalConnectorSystem.findBetween(agent.roomId, toRoomId);
    if (!connection) {
      this.event(`${agent.name} could not find a legal route to ${this.roomName(toRoomId)}.`);
      return;
    }
    if (connection?.kind === 'vertical-connector') {
      const result = this.verticalConnectorSystem.begin(agent, connection);
      if (!result.ok) { this.event(`${agent.name} could not use ${connection.connectorId}: ${result.error}.`); return; }
      agent.travel = result.travel;
      agent.mood = result.travel.phase === 'queue' ? 'waiting' : 'moving';
      this.event(`${agent.name} entered ${connection.connectorId} toward ${this.roomName(toRoomId)}.`, { type:'move-start', sourceId:agent.id, connectorId:connection.connectorId });
      return;
    }

    const speed = agent.role === 'ogre' ? 2.45 : agent.faction === 'party' ? 4.25 : 3.35;
    const duration = clamp(connection.length / speed, 0.85, agent.role === 'ogre' ? 4.8 : 3.8);
    agent.travel = {
      connectionId: connection.id,
      fromRoomId: agent.roomId,
      toRoomId,
      elapsed: 0,
      duration,
      progress: 0
    };
    agent.mood = 'moving';
    this.event(`${agent.name} entered the corridor toward ${this.roomName(toRoomId)}.`, { type: 'move-start', sourceId: agent.id });
  }

  advanceTravel(dt) {
    for (const agent of this.agents) {
      if (!agent.travel) continue;
      if (!this.isActive(agent)) {
        if (agent.travel.kind === 'vertical-connector') this.verticalConnectorSystem.release(agent.id, agent.travel.connectorId);
        agent.travel = null;
        continue;
      }

      const vertical = this.verticalConnectorSystem.advance(agent, dt);
      if (vertical.handled) {
        if (vertical.cancelled) { agent.travel = null; agent.mood = 'route-blocked'; continue; }
        if (vertical.arrived) {
          const fromRoomId = vertical.fromRoomId;
          agent.roomId = vertical.toRoomId;
          agent.travel = null;
          agent.mood = 'curious';
          this.visited.add(agent.roomId);
          this.event(`${agent.name} arrived from ${this.roomName(fromRoomId)} at ${this.roomName(agent.roomId)}.`, { type:'move-end', sourceId:agent.id });
          this.checkRoomEffect(agent);
          this.checkTraps(agent);
        }
        continue;
      }

      agent.travel.elapsed += dt;
      agent.travel.progress = clamp(agent.travel.elapsed / agent.travel.duration, 0, 1);
      if (agent.travel.progress < 1) continue;

      const fromRoomId = agent.travel.fromRoomId;
      const toRoomId = agent.travel.toRoomId;
      agent.roomId = toRoomId;
      agent.travel = null;
      agent.mood = 'curious';
      this.visited.add(toRoomId);
      this.event(`${agent.name} arrived from ${this.roomName(fromRoomId)} at ${this.roomName(toRoomId)}.`, { type: 'move-end', sourceId: agent.id });
      this.checkRoomEffect(agent);
      this.checkTraps(agent);
    }
  }

  onDeath(killer, target) {
    this.emitEffect('death', { roomId: target.roomId, agentId: target.id, duration: 1.1 });
    this.event(`${target.name} stopped participating in the experiment.`, { type: 'death', sourceId: killer.id, targetId: target.id });

    if (target.faction === 'party' && killer.faction === 'dungeon') {
      this.monsterFood += 2;
      killer.kills += 1;
      killer.hp = Math.min(killer.maxHp + 3, killer.hp + 5);
      this.event(`${killer.name} fed. The dungeon remembered the taste.`);
      this.scheduleMonsterBirth(true);
    }

    if (target.faction === 'dungeon' && killer.faction === 'party') {
      killer.kills += 1;
      killer.gold += target.role === 'ogre' ? 4 : 1;
      this.reputation += target.role === 'ogre' ? 0.65 : 0.22;
      this.emitEffect('gold', {
        roomId: killer.roomId,
        agentId: killer.id,
        duration: 1.05,
        amount: target.role === 'ogre' ? 4 : 1
      });
      if (killer.kills % 3 === 0) {
        killer.level += 1;
        killer.maxHp += 2;
        killer.attack += 1;
        killer.hp = Math.min(killer.maxHp, killer.hp + 3);
        this.event(`${killer.name} learned a terrible little lesson and reached level ${killer.level}.`);
      }
    }
  }

  checkRoomEffect(agent) {
    if (!this.isActive(agent) || agent.travel) return;
    const room = this.rooms.find(candidate => candidate.id === agent.roomId);
    if (!room) return;
    agent.roomMemory ??= new Set();
    const key = `${agent.id}:${room.id}`;

    if (agent.faction === 'party' && room.kind === 'armory' && !agent.roomMemory.has(key)) {
      agent.roomMemory.add(key);
      agent.attack += 1;
      this.event(`${agent.name} found a weapon that looked barely legal.`);
    }

    if (agent.faction === 'party' && room.kind === 'shrine' && !agent.roomMemory.has(key)) {
      agent.roomMemory.add(key);
      agent.hp = Math.min(agent.maxHp, agent.hp + 5);
      this.emitEffect('heal', { roomId: room.id, agentId: agent.id, duration: 0.9, amount: 5 });
      this.event(`${agent.name} rested at ${room.name} and mistook relief for destiny.`);
    }

    if (agent.faction === 'dungeon' && ['hatchery', 'pantry', 'lair'].includes(room.kind) && this.turn % 4 === 0) {
      this.monsterFood += 0.35;
    }
  }

  checkTraps(agent) {
    if (!this.isActive(agent) || agent.travel || agent.faction !== 'party') return;
    const trap = this.props.find(prop => prop.type === 'trap' && prop.armed && prop.roomId === agent.roomId);
    if (!trap || Math.random() > 0.22) return;
    trap.armed = false;
    const damage = 3 + Math.floor(Math.random() * 6);
    agent.hp -= damage;
    this.lastNoiseRoom = agent.roomId;
    this.emitEffect('attack', { roomId: agent.roomId, agentId: agent.id, duration: 0.58, amount: damage });
    this.event(`${agent.name} triggered ${trap.label} for ${damage}. Terrible little mechanism.`);
    if (agent.hp <= 0) {
      agent.hp = 0;
      agent.alive = false;
      this.emitEffect('death', { roomId: agent.roomId, agentId: agent.id, duration: 1.1 });
      this.event(`${agent.name} was converted into a cautionary tale.`, { type: 'death', targetId: agent.id });
      this.scheduleReturn();
    }
  }

  ecosystemTick() {
    if (this.spawnClock !== null) {
      this.spawnClock -= 1;
      if (this.spawnClock <= 0) this.spawnMonsterPack();
    }

    if (this.returnClock !== null) {
      this.returnClock -= 1;
      if (this.returnClock <= 0) this.returnParty();
    }

    const activeParty = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party');
    const activeMonsters = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'dungeon' && !agent.hidden);
    const desiredMonsters = Math.min(18, Math.max(5, activeParty.length * 2 + Math.floor(this.reputation)));

    if (activeParty.length === 0) this.scheduleReturn();
    if (activeMonsters.length < desiredMonsters) this.scheduleMonsterBirth(activeMonsters.length < activeParty.length);

    const hatcheries = this.rooms.filter(room => ['hatchery', 'lair', 'nest'].includes(room.kind)).length;
    this.monsterFood += hatcheries * 0.06;

    if (this.turn > 0 && this.turn % 10 === 0) this.rearmDungeon();
  }

  scheduleReturn() {
    if (this.returnClock === null) {
      this.returnClock = 5 + Math.floor(Math.random() * 5);
      this.event('Above ground, the tavern began simplifying the story.');
    }
  }

  scheduleMonsterBirth(urgent = false) {
    if (this.spawnClock === null) {
      this.spawnClock = urgent ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
      this.event('Something under the flagstones began dividing its inheritance.');
    }
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
      this.event(`${agent.name} returned at level ${agent.level}, which was not comforting.`);
    }

    const livingParty = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party');
    const desiredSize = Math.min(7, 4 + Math.floor(this.reputation / 2));
    while (livingParty.length < desiredSize) {
      const role = PARTY_ROLES[(this.agentSeq + livingParty.length) % PARTY_ROLES.length];
      const name = `${PARTY_NAMES[this.agentSeq % PARTY_NAMES.length]} ${this.generation}`;
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
      this.event(`${name} joined the party after hearing an inaccurate version of events.`);
    }
  }

  spawnMonsterPack() {
    this.spawnClock = null;
    const activeParty = this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party');
    const activeOgre = this.agents.some(agent => this.isActive(agent) && agent.role === 'ogre');
    const canSpawnOgre = !activeOgre && this.generation >= 2 && this.monsterFood >= 4.5;

    if (canSpawnOgre) {
      this.monsterFood = Math.max(0, this.monsterFood - 3.4);
      this.spawnMonster('ogre');
    }

    const packSize = Math.min(4, Math.max(1, 1 + Math.floor(this.monsterFood / 1.6) + (activeParty.length > 4 ? 1 : 0) - (canSpawnOgre ? 1 : 0)));
    this.monsterFood = Math.max(0, this.monsterFood - packSize * 1.2);
    for (let i = 0; i < packSize; i += 1) this.spawnMonster();
  }

  spawnMonster(forcedRole = null) {
    const lair = this.pickSpawnRoom();
    const role = forcedRole ?? MONSTER_ROLES[this.agentSeq % MONSTER_ROLES.length];
    const name = this.nextMonsterName(role);
    const baby = hydrateAgent({
      id: `monster-${this.agentSeq++}`,
      name,
      role,
      faction: 'dungeon',
      roomId: lair.id,
      level: Math.max(1, Math.floor(this.generation / 3)),
      size: role === 'ogre' ? 'large' : 'small'
    }, this.agentSeq);
    this.agents.push(baby);
    this.event(`${baby.name} crawled out of ${lair.name} and immediately had opinions.`);
  }

  pickSpawnRoom() {
    const partyRooms = new Set(this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party' && !agent.travel).map(agent => agent.roomId));
    const candidates = this.rooms.filter(room => ['hatchery', 'lair', 'nest', 'crypt', 'gate'].includes(room.kind));
    const safe = candidates.filter(room => !partyRooms.has(room.id));
    const pool = safe.length ? safe : candidates;
    return pool[Math.floor(Math.random() * pool.length)] ?? this.rooms[this.rooms.length - 1];
  }

  rearmDungeon() {
    const trap = this.props.find(prop => prop.type === 'trap' && !prop.armed);
    if (trap) {
      trap.armed = true;
      this.event(`${trap.label} reset itself with quiet malice.`);
    }

    const treasureRooms = this.rooms.filter(room => ['treasure', 'lair', 'crypt', 'gate'].includes(room.kind));
    if (treasureRooms.length && Math.random() < 0.72) {
      const room = treasureRooms[Math.floor(Math.random() * treasureRooms.length)];
      this.props.push({
        id: `treasure-${this.propSeq++}`,
        type: 'treasure',
        roomId: room.id,
        label: 'Freshly Rumored Chest',
        opened: false
      });
      this.event(`A new rumor condensed into a chest in ${room.name}.`);
    }
  }

  makeNoise(roomId = 'hall') {
    this.lastNoiseRoom = roomId;
    this.event(`A tiny god tapped the glass near ${this.roomName(roomId)}.`);
  }

  dropCoin(roomId = 'treasure') {
    const rogue = this.agents.find(agent => this.isActive(agent) && agent.role === 'rogue');
    this.props.push({ id: `coin-${this.propSeq++}`, type: 'treasure', roomId, label: 'Dropped Coin', opened: false });
    if (rogue) this.event(`A coin fell in ${this.roomName(roomId)}. ${rogue.name} developed a theory.`);
  }

  emitEffect(type, { roomId = null, agentId = null, duration = 0.8, amount = null } = {}) {
    this.effects.push({
      id: `effect-${this.effectSeq++}`,
      type,
      roomId,
      agentId,
      duration,
      amount,
      createdAt: this.time
    });
  }

  pruneEffects() {
    this.effects = this.effects.filter(effect => this.time - effect.createdAt < effect.duration);
  }

  buildMonsterCounters() {
    const counters = new Map();
    for (const agent of this.agents) {
      if (agent.faction !== 'dungeon') continue;
      counters.set(agent.role, (counters.get(agent.role) ?? 0) + 1);
    }
    return counters;
  }

  nextMonsterName(role) {
    const index = this.monsterCounters.get(role) ?? 0;
    this.monsterCounters.set(role, index + 1);
    return `${capitalize(role)} ${alphabeticLabel(index)}`;
  }

  roomName(roomId) {
    return this.rooms.find(room => room.id === roomId)?.name ?? roomId;
  }

  event(text, meta = {}) {
    this.onEvent({ text, time: this.time, turn: this.turn, ...meta });
  }

  destroy() {
    this.routeGraphUnsubscribe?.();
    this.routeGraphUnsubscribe = null;
  }

  snapshot() {
    return {
      rooms: this.rooms,
      links: this.routeGraph ? this.routeGraph.activeLinks() : this.scenario.links,
      routes: this.routeGraph ? this.routeGraph.snapshot() : [],
      verticalConnectors: this.verticalConnectorSystem.snapshot(),
      floors: this.scenario.floors ?? [],
      routeGraphVersion: this.routeGraph?.version ?? 0,
      props: this.props,
      agents: this.agents,
      effects: this.effects,
      visited: [...this.visited],
      time: this.time,
      ended: this.ended
    };
  }

  metrics() {
    return {
      party: this.agents.filter(agent => this.isActive(agent) && agent.faction === 'party').length,
      dungeon: this.agents.filter(agent => this.isActive(agent) && agent.faction === 'dungeon' && !agent.hidden).length,
      cycles: this.generation,
      fallen: this.agents.filter(agent => !agent.alive).length
    };
  }
}

function cloneData(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function alphabeticLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function capitalize(value) {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
