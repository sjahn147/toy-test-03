import { buildGraph } from './Pathfinding.js';
import { hydrateAgent, decideAction } from './AgentAI.js';

const PARTY_NAMES = ['Rana', 'Milo', 'Sister Pell', 'Orwin', 'Tamsin', 'Berric', 'Nell', 'Grubbs'];
const PARTY_ROLES = ['fighter', 'rogue', 'cleric', 'wizard'];
const MONSTER_ROLES = ['goblin', 'skeleton', 'slime'];

export class DungeonSim {
  constructor(scenario, { onEvent } = {}) {
    this.scenario = scenario;
    this.rooms = structuredClone(scenario.rooms);
    this.props = structuredClone(scenario.props);
    this.agents = scenario.agents.map(hydrateAgent);
    this.graph = buildGraph(scenario.links);
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
    this.monsterFood = 1;
    this.reputation = 1;
    this.generation = 1;
    this.returnClock = null;
    this.spawnClock = null;
    this.event(`${scenario.name} was placed under the glass.`);
  }

  update(dt) {
    this.time += dt;
    this.accumulator += dt;

    if (this.accumulator < this.turnInterval) return;
    this.accumulator = 0;
    this.turn += 1;
    this.lastNoiseRoom = this.turn % 5 === 0 ? null : this.lastNoiseRoom;

    const acting = this.agents.filter(a => this.isActive(a)).sort((a, b) => a.index - b.index);
    for (const agent of acting) {
      this.resolve(agent, decideAction(agent, this));
      this.checkRoomEffect(agent);
      this.checkTraps(agent);
    }

    this.ecosystemTick();
  }

  isActive(agent) {
    return agent.alive && !agent.departed;
  }

  resolve(agent, action) {
    if (!this.isActive(agent)) return;

    if (action.text) this.event(action.text);

    if (action.type === 'move') {
      const from = this.roomName(agent.roomId);
      agent.roomId = action.roomId;
      this.visited.add(action.roomId);
      this.event(`${agent.name} moved from ${from} to ${this.roomName(action.roomId)}.`);
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
      const target = this.agents.find(a => a.id === action.targetId);
      if (!target || !this.isActive(target)) return;
      const roll = 1 + Math.floor(Math.random() * 6);
      const damage = Math.max(1, Math.floor(action.text ? agent.attack + roll / 2 : agent.attack + roll - 3));
      target.hp -= damage;
      this.lastNoiseRoom = agent.roomId;
      this.event(`${agent.name} hit ${target.name} for ${damage}.`);
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
        this.onDeath(agent, target);
      }
      return;
    }

    if (action.type === 'heal') {
      const target = this.agents.find(a => a.id === action.targetId);
      if (!target || !this.isActive(target)) return;
      const amount = 4 + Math.floor(Math.random() * 4);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      this.event(`${agent.name} patched up ${target.name} for ${amount}.`);
      return;
    }

    if (action.type === 'openTreasure') {
      const prop = this.props.find(p => p.id === action.propId);
      if (!prop || prop.opened) return;
      prop.opened = true;
      const mimic = this.agents.find(a => this.isActive(a) && a.role === 'mimic' && a.roomId === agent.roomId && a.hidden);
      if (mimic && Math.random() < 0.72) {
        mimic.hidden = false;
        this.event(`${agent.name} opened ${prop.label}. ${mimic.name} opened back.`);
        this.resolve(mimic, { type: 'attack', targetId: agent.id });
      } else {
        const gold = 2 + Math.floor(Math.random() * 7);
        agent.gold += gold;
        this.reputation += gold * 0.05;
        this.event(`${agent.name} found ${gold} suspicious coins.`);
      }
    }
  }

  onDeath(killer, target) {
    this.event(`${target.name} stopped participating in the experiment.`);

    if (target.faction === 'party' && killer.faction === 'dungeon') {
      this.monsterFood += 2;
      killer.kills += 1;
      killer.hp = Math.min(killer.maxHp + 3, killer.hp + 5);
      this.event(`${killer.name} fed. The dungeon remembered the taste.`);
      this.scheduleMonsterBirth(true);
    }

    if (target.faction === 'dungeon' && killer.faction === 'party') {
      killer.kills += 1;
      killer.gold += 1;
      this.reputation += 0.22;
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
    if (!this.isActive(agent)) return;
    const room = this.rooms.find(r => r.id === agent.roomId);
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
      this.event(`${agent.name} rested at ${room.name} and mistook relief for destiny.`);
    }

    if (agent.faction === 'dungeon' && ['hatchery', 'pantry', 'lair'].includes(room.kind) && this.turn % 4 === 0) {
      this.monsterFood += 0.35;
    }
  }

  checkTraps(agent) {
    if (!this.isActive(agent) || agent.faction !== 'party') return;
    const trap = this.props.find(p => p.type === 'trap' && p.armed && p.roomId === agent.roomId);
    if (!trap || Math.random() > 0.22) return;
    trap.armed = false;
    const damage = 3 + Math.floor(Math.random() * 6);
    agent.hp -= damage;
    this.lastNoiseRoom = agent.roomId;
    this.event(`${agent.name} triggered ${trap.label} for ${damage}. Terrible little mechanism.`);
    if (agent.hp <= 0) {
      agent.hp = 0;
      agent.alive = false;
      this.event(`${agent.name} was converted into a cautionary tale.`);
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

    const activeParty = this.agents.filter(a => this.isActive(a) && a.faction === 'party');
    const activeMonsters = this.agents.filter(a => this.isActive(a) && a.faction === 'dungeon' && !a.hidden);
    const desiredMonsters = Math.min(18, Math.max(5, activeParty.length * 2 + Math.floor(this.reputation)));

    if (activeParty.length === 0) this.scheduleReturn();
    if (activeMonsters.length < desiredMonsters) this.scheduleMonsterBirth(activeMonsters.length < activeParty.length);

    const hatcheries = this.rooms.filter(r => ['hatchery', 'lair', 'nest'].includes(r.kind)).length;
    this.monsterFood += hatcheries * 0.06;

    if (this.turn > 0 && this.turn % 10 === 0) {
      this.rearmDungeon();
    }
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
    const entry = this.rooms.find(r => r.kind === 'start')?.id ?? this.rooms[0].id;
    const departed = this.agents.filter(a => a.alive && a.departed && a.faction === 'party');

    for (const agent of departed) {
      agent.departed = false;
      agent.roomId = entry;
      agent.hp = agent.maxHp;
      this.event(`${agent.name} returned at level ${agent.level}, which was not comforting.`);
    }

    const livingParty = this.agents.filter(a => this.isActive(a) && a.faction === 'party');
    const desiredSize = Math.min(7, 4 + Math.floor(this.reputation / 2));
    while (livingParty.length < desiredSize) {
      const role = PARTY_ROLES[(this.agentSeq + livingParty.length) % PARTY_ROLES.length];
      const name = PARTY_NAMES[this.agentSeq % PARTY_NAMES.length] + ` ${this.generation}`;
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
    const activeParty = this.agents.filter(a => this.isActive(a) && a.faction === 'party');
    const packSize = Math.min(4, Math.max(1, 1 + Math.floor(this.monsterFood / 1.6) + (activeParty.length > 4 ? 1 : 0)));
    this.monsterFood = Math.max(0, this.monsterFood - packSize * 1.2);

    for (let i = 0; i < packSize; i++) {
      this.spawnMonster();
    }
  }

  spawnMonster() {
    const lair = this.pickSpawnRoom();
    const role = MONSTER_ROLES[this.agentSeq % MONSTER_ROLES.length];
    const baby = hydrateAgent({
      id: `monster-${this.agentSeq++}`,
      name: `${role[0].toUpperCase()}${role.slice(1)}ling ${this.generation}.${this.agentSeq}`,
      role,
      faction: 'dungeon',
      roomId: lair.id,
      level: Math.max(1, Math.floor(this.generation / 3))
    }, this.agentSeq);
    this.agents.push(baby);
    this.event(`${baby.name} crawled out of ${lair.name} and immediately had opinions.`);
  }

  pickSpawnRoom() {
    const partyRooms = new Set(this.agents.filter(a => this.isActive(a) && a.faction === 'party').map(a => a.roomId));
    const candidates = this.rooms.filter(r => ['hatchery', 'lair', 'nest', 'crypt', 'gate'].includes(r.kind));
    const safe = candidates.filter(r => !partyRooms.has(r.id));
    const pool = safe.length ? safe : candidates;
    return pool[Math.floor(Math.random() * pool.length)] ?? this.rooms.at(-1);
  }

  rearmDungeon() {
    const trap = this.props.find(p => p.type === 'trap' && !p.armed);
    if (trap) {
      trap.armed = true;
      this.event(`${trap.label} reset itself with quiet malice.`);
    }

    const treasureRooms = this.rooms.filter(r => ['treasure', 'lair', 'crypt', 'gate'].includes(r.kind));
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
    const rogue = this.agents.find(a => this.isActive(a) && a.role === 'rogue');
    this.props.push({ id: `coin-${this.propSeq++}`, type: 'treasure', roomId, label: 'Dropped Coin', opened: false });
    if (rogue) this.event(`A coin fell in ${this.roomName(roomId)}. ${rogue.name} developed a theory.`);
  }

  roomName(roomId) {
    return this.rooms.find(r => r.id === roomId)?.name ?? roomId;
  }

  event(text) {
    this.onEvent({ text, time: this.time, turn: this.turn });
  }

  snapshot() {
    return {
      rooms: this.rooms,
      links: this.scenario.links,
      props: this.props,
      agents: this.agents,
      visited: [...this.visited],
      time: this.time,
      ended: this.ended
    };
  }

  metrics() {
    return {
      party: this.agents.filter(a => this.isActive(a) && a.faction === 'party').length,
      dungeon: this.agents.filter(a => this.isActive(a) && a.faction === 'dungeon' && !a.hidden).length,
      cycles: this.generation,
      fallen: this.agents.filter(a => !a.alive).length
    };
  }
}
