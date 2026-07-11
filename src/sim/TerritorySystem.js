import { nearestRoom, nextStep } from './Pathfinding.js';

const WARRIOR_ROLES = new Set(['goblin', 'skeleton', 'spider', 'ogre', 'zombie', 'orc', 'carrion', 'kobold', 'wraith']);
const BUILD_COSTS = { territory_banner: 2, barricade: 4, watch_post: 6 };

export class TerritorySystem {
  constructor({ rooms, props, graph, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.onEvent = onEvent;
    this.roomStates = new Map();
    this.factionSupply = new Map();
    this.tickClock = 0;
    this.resourceClock = 0;
    this.sequence = 0;
    this.initialize();
  }

  initialize() {
    for (const room of this.rooms) {
      this.roomStates.set(room.id, {
        roomId: room.id,
        owner: null,
        control: 0,
        contested: false,
        challenger: null,
        lastChangedAt: 0
      });
    }
    for (const prop of this.props) {
      if (!prop.ecologyFaction || !prop.roomId || !prop.species) continue;
      const state = this.roomStates.get(prop.roomId);
      if (!state || state.owner) continue;
      state.owner = prop.ecologyFaction;
      state.control = 72;
    }
  }

  update(dt, sim) {
    this.tickClock -= dt;
    this.resourceClock -= dt;
    if (this.resourceClock <= 0) {
      this.resourceClock = 1;
      this.regenerateResources();
      this.harvestResources(sim);
    }
    if (this.tickClock <= 0) {
      this.tickClock = 0.8;
      this.updateControl(sim);
      this.buildFortifications(sim);
    }
  }

  updateControl(sim) {
    for (const room of this.rooms) {
      const state = this.roomStates.get(room.id);
      if (!state) continue;
      const factions = new Map();
      for (const agent of sim.agents) {
        if (!agent.alive || agent.departed || agent.hidden || agent.travel || agent.roomId !== room.id || !agent.ecologyFaction) continue;
        const weight = agent.role === 'ogre' ? 4 : agent.role === 'wraith' ? 2.4 : agent.role === 'rat' ? 0.25 : 1;
        factions.set(agent.ecologyFaction, (factions.get(agent.ecologyFaction) ?? 0) + weight);
      }
      for (const prop of sim.props) {
        if (prop.roomId !== room.id || !prop.ecologyFaction || !prop.species) continue;
        factions.set(prop.ecologyFaction, (factions.get(prop.ecologyFaction) ?? 0) + 1.6);
      }

      const ranked = [...factions.entries()].sort((a, b) => b[1] - a[1]);
      if (!ranked.length) {
        state.contested = false;
        state.challenger = null;
        state.control = Math.max(0, state.control - 0.35);
        if (state.control === 0) state.owner = null;
        continue;
      }

      const [leader, leaderPower] = ranked[0];
      const secondPower = ranked[1]?.[1] ?? 0;
      state.contested = ranked.length > 1 && secondPower > leaderPower * 0.34;
      state.challenger = leader !== state.owner ? leader : ranked[1]?.[0] ?? null;

      if (!state.owner) {
        state.owner = leader;
        state.control = Math.min(100, state.control + leaderPower * 2.4);
        continue;
      }

      if (leader === state.owner) {
        state.control = Math.min(100, state.control + Math.max(0.5, leaderPower - secondPower) * 1.7);
        continue;
      }

      state.control -= Math.max(0.6, leaderPower - secondPower * 0.4) * 2.1;
      if (state.control > 0) continue;
      const former = state.owner;
      state.owner = leader;
      state.control = 28;
      state.lastChangedAt = sim.time;
      this.onEvent(`${leader} seized ${sim.roomName(room.id)} from ${former}.`);
      this.removeEnemyFortifications(room.id, leader, sim);
    }
  }

  regenerateResources() {
    for (const prop of this.props) {
      if (prop.type !== 'territory_resource') continue;
      prop.stock = Math.min(prop.maxStock ?? 10, (prop.stock ?? 0) + (prop.regenRate ?? 0.02));
    }
  }

  harvestResources(sim) {
    for (const prop of this.props) {
      if (prop.type !== 'territory_resource' || (prop.stock ?? 0) < 1) continue;
      const state = this.roomStates.get(prop.roomId);
      if (!state?.owner || state.contested || state.control < 45) continue;
      const worker = sim.agents.find(agent =>
        agent.alive && !agent.departed && !agent.travel && !agent.hidden && agent.roomId === prop.roomId && agent.ecologyFaction === state.owner
      );
      if (!worker) continue;
      prop.stock -= 1;
      const gain = resourceValue(prop.resourceType);
      this.factionSupply.set(state.owner, (this.factionSupply.get(state.owner) ?? 0) + gain);
      worker.mood = `harvesting-${prop.resourceType}`;
    }
  }

  decide(agent, sim) {
    if (!agent?.alive || agent.faction !== 'dungeon' || !agent.ecologyFaction || agent.travel || agent.combat || agent.hidden) return null;
    if (!WARRIOR_ROLES.has(agent.role)) return null;

    const current = this.roomStates.get(agent.roomId);
    if (current?.contested && current.owner !== agent.ecologyFaction) return null;

    const hostileAdjacent = (this.graph.get(agent.roomId) ?? [])
      .map(roomId => this.roomStates.get(roomId))
      .find(state => state?.owner && state.owner !== agent.ecologyFaction && state.control < 72);
    if (hostileAdjacent) {
      return { type: 'territory-move', roomId: hostileAdjacent.roomId, text: `${agent.name} joined a raid into ${sim.roomName(hostileAdjacent.roomId)}.` };
    }

    const resourceRooms = this.props
      .filter(prop => prop.type === 'territory_resource' && (prop.stock ?? 0) >= 1)
      .map(prop => prop.roomId)
      .filter(roomId => {
        const state = this.roomStates.get(roomId);
        return !state?.owner || state.owner === agent.ecologyFaction || state.control < 45;
      });
    const target = nearestRoom(this.graph, agent.roomId, [...new Set(resourceRooms)]);
    if (target && target !== agent.roomId && Math.random() < 0.38) {
      const step = nextStep(this.graph, agent.roomId, target);
      if (step && step !== agent.roomId) return { type: 'territory-move', roomId: step, text: `${agent.name} moved toward an unsecured resource room.` };
    }
    return null;
  }

  resolve(agent, action, sim) {
    if (action?.type !== 'territory-move') return false;
    sim.beginTravel(agent, action.roomId);
    return true;
  }

  buildFortifications(sim) {
    for (const [faction, supply] of [...this.factionSupply.entries()]) {
      if (supply < 2) continue;
      const owned = [...this.roomStates.values()]
        .filter(state => state.owner === faction && state.control >= 72 && !state.contested)
        .sort((a, b) => b.control - a.control);
      if (!owned.length) continue;

      const desired = supply >= 6 ? 'watch_post' : supply >= 4 ? 'barricade' : 'territory_banner';
      const cost = BUILD_COSTS[desired];
      const target = owned.find(state => !this.props.some(prop => prop.roomId === state.roomId && prop.type === desired && prop.ecologyFaction === faction));
      if (!target || supply < cost) continue;
      this.factionSupply.set(faction, supply - cost);
      const room = this.rooms.find(candidate => candidate.id === target.roomId);
      const prop = {
        id: `territory-${desired}-${this.sequence++}`,
        type: desired,
        roomId: target.roomId,
        ecologyFaction: faction,
        label: `${faction} ${desired.replace('_', ' ')}`,
        placement: {
          ox: desired === 'barricade' ? 0 : room.w * 0.28,
          oz: desired === 'watch_post' ? room.d * 0.24 : -room.d * 0.26,
          rotation: (this.sequence % 4) * Math.PI / 2,
          scale: desired === 'watch_post' ? 0.82 : 0.74
        }
      };
      this.props.push(prop);
      sim.emitEffect('territory-build', { roomId: target.roomId, duration: 1.1 });
      this.onEvent(`${faction} built ${prop.label} in ${sim.roomName(target.roomId)}.`);
      break;
    }
  }

  removeEnemyFortifications(roomId, newOwner, sim) {
    const removed = this.props.filter(prop =>
      prop.roomId === roomId && ['territory_banner', 'barricade', 'watch_post'].includes(prop.type) && prop.ecologyFaction !== newOwner
    );
    if (!removed.length) return;
    const ids = new Set(removed.map(prop => prop.id));
    for (let i = this.props.length - 1; i >= 0; i -= 1) {
      if (ids.has(this.props[i].id)) this.props.splice(i, 1);
    }
    sim.emitEffect('territory-break', { roomId, duration: 1.0 });
  }

  snapshot() {
    return {
      rooms: [...this.roomStates.values()].map(state => ({ ...state })),
      supply: [...this.factionSupply.entries()].map(([faction, amount]) => ({ faction, amount }))
    };
  }

  metrics() {
    const states = [...this.roomStates.values()];
    return {
      territories: states.filter(state => state.owner).length,
      contested: states.filter(state => state.contested).length,
      fortifications: this.props.filter(prop => ['territory_banner', 'barricade', 'watch_post'].includes(prop.type)).length
    };
  }
}

function resourceValue(type) {
  if (['deathEnergy', 'biomass'].includes(type)) return 1.4;
  if (['scrap', 'bones'].includes(type)) return 1.2;
  return 1;
}
