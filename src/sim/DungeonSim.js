import { buildGraph } from './Pathfinding.js';
import { hydrateAgent, decideAction } from './AgentAI.js';

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
    this.lastNoiseRoom = null;
    this.ended = false;
    this.event(`${scenario.name} was placed under the glass.`);
  }

  update(dt) {
    if (this.ended) return;
    this.time += dt;
    this.accumulator += dt;

    if (this.accumulator < 0.75) return;
    this.accumulator = 0;
    this.turn += 1;
    this.lastNoiseRoom = this.turn % 5 === 0 ? null : this.lastNoiseRoom;

    const acting = this.agents.filter(a => a.alive).sort((a, b) => a.index - b.index);
    for (const agent of acting) {
      this.resolve(agent, decideAction(agent, this));
      this.checkTraps(agent);
    }

    this.checkEnd();
  }

  resolve(agent, action) {
    if (!agent.alive) return;

    if (action.text) this.event(action.text);

    if (action.type === 'move') {
      const from = this.roomName(agent.roomId);
      agent.roomId = action.roomId;
      this.visited.add(action.roomId);
      this.event(`${agent.name} moved from ${from} to ${this.roomName(action.roomId)}.`);
      return;
    }

    if (action.type === 'attack') {
      const target = this.agents.find(a => a.id === action.targetId);
      if (!target || !target.alive) return;
      const roll = 1 + Math.floor(Math.random() * 6);
      const damage = Math.max(1, Math.floor(action.text ? agent.attack + roll / 2 : agent.attack + roll - 3));
      target.hp -= damage;
      this.lastNoiseRoom = agent.roomId;
      this.event(`${agent.name} hit ${target.name} for ${damage}.`);
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
        this.event(`${target.name} stopped participating in the experiment.`);
      }
      return;
    }

    if (action.type === 'heal') {
      const target = this.agents.find(a => a.id === action.targetId);
      if (!target || !target.alive) return;
      const amount = 4 + Math.floor(Math.random() * 4);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      this.event(`${agent.name} patched up ${target.name} for ${amount}.`);
      return;
    }

    if (action.type === 'openTreasure') {
      const prop = this.props.find(p => p.id === action.propId);
      if (!prop || prop.opened) return;
      prop.opened = true;
      const mimic = this.agents.find(a => a.alive && a.role === 'mimic' && a.roomId === agent.roomId && a.hidden);
      if (mimic && Math.random() < 0.72) {
        mimic.hidden = false;
        this.event(`${agent.name} opened ${prop.label}. ${mimic.name} opened back.`);
        this.resolve(mimic, { type: 'attack', targetId: agent.id });
      } else {
        const gold = 2 + Math.floor(Math.random() * 7);
        agent.gold += gold;
        this.event(`${agent.name} found ${gold} suspicious coins.`);
      }
    }
  }

  checkTraps(agent) {
    if (!agent.alive || agent.faction !== 'party') return;
    const trap = this.props.find(p => p.type === 'trap' && p.armed && p.roomId === agent.roomId);
    if (!trap || Math.random() > 0.28) return;
    trap.armed = false;
    const damage = 3 + Math.floor(Math.random() * 6);
    agent.hp -= damage;
    this.lastNoiseRoom = agent.roomId;
    this.event(`${agent.name} triggered ${trap.label} for ${damage}. Terrible little mechanism.`);
    if (agent.hp <= 0) {
      agent.hp = 0;
      agent.alive = false;
      this.event(`${agent.name} was converted into a cautionary tale.`);
    }
  }

  makeNoise(roomId = 'hall') {
    this.lastNoiseRoom = roomId;
    this.event(`A tiny god tapped the glass near ${this.roomName(roomId)}.`);
  }

  dropCoin(roomId = 'treasure') {
    const rogue = this.agents.find(a => a.alive && a.role === 'rogue');
    this.props.push({ id: `coin-${this.turn}`, type: 'treasure', roomId, label: 'Dropped Coin', opened: false });
    if (rogue) this.event(`A coin fell in ${this.roomName(roomId)}. ${rogue.name} developed a theory.`);
  }

  checkEnd() {
    const partyAlive = this.agents.some(a => a.alive && a.faction === 'party');
    const dungeonAlive = this.agents.some(a => a.alive && a.faction === 'dungeon' && !a.hidden);
    if (!partyAlive) {
      this.ended = true;
      this.event('Observation ended: the dungeon won by being itself.');
    } else if (!dungeonAlive && this.props.every(p => p.type !== 'treasure' || p.opened)) {
      this.ended = true;
      this.event('Observation ended: the party survived, which frankly seems suspicious.');
    }
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
      party: this.agents.filter(a => a.faction === 'party' && a.alive).length,
      dungeon: this.agents.filter(a => a.faction === 'dungeon' && a.alive && !a.hidden).length,
      treasure: this.props.filter(p => p.type === 'treasure' && p.opened).length,
      fallen: this.agents.filter(a => !a.alive).length
    };
  }
}
