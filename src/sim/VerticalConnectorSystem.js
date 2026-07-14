import { VerticalConnectorTopology } from '../domain/VerticalConnectorTopology.js';

export class VerticalConnectorSystem {
  constructor(connectors = [], rooms = [], { onEvent = () => {} } = {}) {
    this.topology = new VerticalConnectorTopology(connectors, rooms);
    this.onEvent = onEvent;
    this.occupants = new Map();
    this.queues = new Map();
  }

  activeLinks() { return this.topology.activeLinks(); }
  findBetween(a, b, options) { return this.topology.findBetween(a, b, options); }
  get(idOrAlias) { return this.topology.get(idOrAlias); }

  setState(idOrAlias, state, metadata = {}) {
    const result = this.topology.setState(idOrAlias, state, metadata);
    if (result.ok && result.changed) this.onEvent({
      type: 'vertical-connector-state',
      connectorId: result.connector.id,
      previousState: result.previousState,
      state: result.state,
      ...metadata
    });
    return result;
  }

  begin(agent, connection) {
    const connector = this.topology.get(connection.connectorId ?? connection.id);
    if (!connector?.active) return { ok: false, error: 'connector is not traversable' };
    const largeActor = agent.size === 'large' || agent.actorSize === 'large' || agent.footprint === 'large';
    const carryingCargo = Boolean(agent.cargoId ?? agent.carryingCargoId ?? agent.carriedCargoId ?? agent.cargo?.id);
    if (largeActor && !connector.allowsLargeActors) return { ok: false, error: 'connector does not support large actors' };
    if (carryingCargo && !connector.allowsCargo) return { ok: false, error: 'connector does not support cargo' };
    if (carryingCargo && connector.allowsCargo === 'light' && (agent.cargoWeightClass === 'heavy' || agent.cargo?.weightClass === 'heavy')) return { ok: false, error: 'connector supports light cargo only' };
    const occupants = this.occupants.get(connector.id) ?? new Set();
    const queue = this.queues.get(connector.id) ?? [];
    this.occupants.set(connector.id, occupants);
    this.queues.set(connector.id, queue);
    const travel = createTravel(agent, connector, connection);
    if (occupants.size < connector.capacity) {
      occupants.add(agent.id);
      travel.phase = 'enter';
      travel.queued = false;
    } else {
      if (queue.length >= connector.queueCapacity) return { ok: false, error: 'connector queue is full' };
      queue.push(agent.id);
      travel.queueIndex = queue.length - 1;
      travel.phase = 'queue';
      travel.queued = true;
    }
    return { ok: true, travel };
  }

  advance(agent, dt) {
    const travel = agent.travel;
    if (!travel || travel.kind !== 'vertical-connector') return { handled: false };
    const connector = this.topology.get(travel.connectorId);
    if (!connector?.active) {
      this.release(agent.id, travel.connectorId);
      return { handled: true, cancelled: true, reason: 'connector-blocked' };
    }
    const occupants = this.occupants.get(connector.id) ?? new Set();
    const queue = this.queues.get(connector.id) ?? [];
    this.occupants.set(connector.id, occupants);
    this.queues.set(connector.id, queue);
    if (travel.phase === 'queue') {
      if (occupants.size < connector.capacity && queue[0] === agent.id) {
        queue.shift();
        occupants.add(agent.id);
        travel.phase = 'enter';
        travel.elapsed = 0;
        travel.queued = false;
        travel.queueIndex = null;
      }
      return { handled: true, arrived: false };
    }
    travel.elapsed += dt;
    travel.progress = Math.max(0, Math.min(1, travel.elapsed / travel.duration));
    if (travel.progress < 0.15) travel.phase = 'enter';
    else if (travel.progress < 0.85) travel.phase = 'transit';
    else if (travel.progress < 1) travel.phase = 'exit';
    else {
      this.release(agent.id, connector.id);
      return { handled: true, arrived: true, toRoomId: travel.toRoomId, fromRoomId: travel.fromRoomId };
    }
    return { handled: true, arrived: false };
  }

  release(agentId, connectorId) {
    this.occupants.get(connectorId)?.delete(agentId);
    const queue = this.queues.get(connectorId);
    if (queue) this.queues.set(connectorId, queue.filter(id => id !== agentId));
  }

  snapshot() {
    return this.topology.snapshot().map(connector => ({
      ...connector,
      occupants: [...(this.occupants.get(connector.id) ?? [])],
      queue: [...(this.queues.get(connector.id) ?? [])]
    }));
  }
}

function createTravel(agent, connector, connection) {
  return {
    kind: 'vertical-connector',
    connectionId: connector.id,
    connectorId: connector.id,
    fromRoomId: connection.aId,
    toRoomId: connection.bId,
    fromLandingId: connection.from.id,
    toLandingId: connection.to.id,
    fromFloorId: connection.from.floorId,
    toFloorId: connection.to.floorId,
    elapsed: 0,
    duration: connector.transitTime,
    progress: 0,
    phase: 'approach',
    queued: false,
    queueIndex: null,
    actorId: agent.id
  };
}
