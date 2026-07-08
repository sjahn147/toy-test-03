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
    this.turnInterval = 2.25;
    this.lastNoiseRoom = null;
    this.ended = false;
    this.agentSeq = this.agents.length;
    this.propSeq = this.props.length;
    this.monsterFood = 0;
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
      this.monsterFood += 1;
      killer.kills += 1;
      killer.hp = Math.min(killer.maxHp + 2, killer.hp + 4);
      this.event(`${killer.name} fed. The dungeon remembered the taste.`);
      if (this.monsterFood >= 2) this.scheduleMonsterBirth();
    }

    if (target.faction === 'dungeon' && killer.faction === 'party') {
      killer.kills += 1;
      killer.gold += 1;
      this.reputation += 0.28;
      if (killer.kills % 2 === 0) {
        killer.level += 1;
        killer.maxHp += 2;
        killer.attack += 1;
        killer.hp = Math.min(killer.maxHp, killer.hp + 3);
        this.event(`${killer.name} learned a terrible little lesson and reached level ${killer.level}.`);
      }
    }
  }

  checkTraps(agent) {
    if (!this.isActive(agent) || agent.faction !== 'party') return;
    const trap = this.props.find(p => p.type === 'trap' && p.armed && p.roomId === agent.roomId);
    if (!trap || Math.random() > 0.18) return;
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
      if (this.spawnClock <= 0) this.spawnMonster();
    }

    if (this.returnClock !== null) {
      this.returnClock -= 1;
      if (this.returnClock <= 0) this.returnParty();
    }

    const activeParty = this.agents.filter(a => this.isActive(a) && a.faction === 'party');
    const activeMonsters = this.agents.filter(a => this.isActive(a) && a.faction === 'dungeon' && !a.hidden);

    if (activeParty.length === 0) this.scheduleReturn();
    if (activeMonsters.length < 2) this.scheduleMonsterBirth();

    if (this.turn > 0 && this.turn % 18 === 0) {
      this.rearmDungeon();
    }
  }

  scheduleReturn() {
    if (this.returnClock === null) {
      this.returnClock = 4 + Math.floor(Math.random() * 4);
      this.event('Above ground, the tavern began simplifying the story.');
    }
  }

  scheduleMonsterBirth() {
    if (this.spawnClock === null) {
      this.spawnClock = 3 + Math.floor(Math.random() * 4);
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
    const desiredSize = Math.min(6, 4 + Math.floor(this.reputation / 2));
    while (livingParty.length < desiredSize) {
      const role = PARTY_ROLES[(this.agentSeq + livingParty.length) % PARTY_ROLES.length];
      const name = PARTY_NAMES[this.agentSeq % PARTY_NAMES.length] + ` ${this.generation}`;
      const recruit = hydrateAgent({
        id: `party-${this.agentSeq++}`,
        name,
        role,
        faction: 'party',
        roomId: entry,
        level: Math.max(1, Math.floor(this.reputation / 2))
      }, this.agentSeq);
      this.agents.push(recruit);
      livingParty.push(recruit);
      this.event(`${name} joined the party after hearing an inaccurate version of events.`);
    }
  }

  spawnMonster() {
    this.spawnClock = null;
    this.monsterFood = Math.max(0, this.monsterFood - 2);
    const lair = this.rooms.find(r => ['lair', 'crypt', 'treasure', 'trap'].includes(r.kind))?.id ?? this.rooms.at(-1).id;
    const role = MONSTER_ROLES[this.agentSeq % MONSTER_ROLES.length];
    const baby = hydrateAgent({
      id: `monster-${this.agentSeq++}`,
      name: `${role[0].toUpperCase()}${role.slice(1)}ling ${this.generation}`,
      role,
      faction: 'dungeon',
      roomId: lair,
      level: Math.max(1, Math.floor(this.monsterFood / 2) + this.generation % 3)
    }, this.agentSeq);
    this.agents.push(baby);
    this.event(`${baby.name} was born in ${this.roomName(lair)} and immediately had opinions.`);
  }

  rearmDungeon() {
    const trap = this.props.find(p => p.type === 'trap' && !p.armed);
    if (trap) {
      trap.armed = true;
      this.event(`${trap.label} reset itself with quiet malice.`);
    }

    const treasureRooms = this.rooms.filter(r => ['treasure', 'lair', 'crypt'].includes(r.kind));
    if (treasureRooms.length && Math.random() < 0.55) {
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
