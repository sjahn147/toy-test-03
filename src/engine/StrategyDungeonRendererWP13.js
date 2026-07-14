import { StrategyDungeonRendererWP11 } from './StrategyDungeonRendererWP11.js';
import { FloorSceneManager } from './FloorSceneManager.js';
import { VerticalConnectorRenderer } from './VerticalConnectorRenderer.js';
import { FloorJunctionRenderer } from './FloorJunctionRenderer.js';
import { normalizeFloorDefinitions, roomFloorId } from '../content/floors/SleepingCitadelFloorContract.js';
import { roomSurfaceY } from './DungeonTopology.js';
import { LandmarkVerticalClearanceAudit } from './LandmarkVerticalClearanceAudit.js';

export class StrategyDungeonRendererWP13 extends StrategyDungeonRendererWP11 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.floors = normalizeFloorDefinitions(scenario.floors ?? scenario.meta?.floors ?? []);
    this.activeFloorId = this.floors[0]?.id ?? roomFloorId(scenario.rooms?.[0]);
    this.lastFullSnapshot = null;
    this.floorSceneManager = new FloorSceneManager({ root:this.group, scenario, activeFloorId:this.activeFloorId });
    this.verticalConnectorRenderer = new VerticalConnectorRenderer({
      parent:this.group,
      connectors:scenario.verticalConnectors ?? scenario.meta?.verticalConnectors ?? [],
      rooms:scenario.rooms ?? [],
      floorHeight:this.floorHeight
    });
    this.verticalConnectorRenderer.setActiveFloor(this.activeFloorId);
    this.floorJunctionRenderer = new FloorJunctionRenderer({ parent:this.group, junctions:scenario.meta?.junctions ?? scenario.junctions ?? [], floorHeight:this.floorHeight });
    this.floorJunctionRenderer.setActiveFloor(this.activeFloorId);
    this.landmarkVerticalAudit = new LandmarkVerticalClearanceAudit({ scenario, floorHeight:this.floorHeight });
    this.landmarkClearanceConflicts = [];
    this.connectorById = new Map((scenario.verticalConnectors ?? scenario.meta?.verticalConnectors ?? []).map(connector => [connector.id, connector]));
  }

  renderState(snapshot) {
    this.lastFullSnapshot = snapshot;
    const filtered = filterSnapshotForFloor(snapshot, this.activeFloorId);
    super.renderState(filtered);
    this.verticalConnectorRenderer.sync(filtered.verticalConnectors ?? this.scenario.verticalConnectors ?? []);
    this.floorSceneManager.apply();
    this.landmarkClearanceConflicts = this.landmarkVerticalAudit.inspect(this.landmarkMeshes, this.activeFloorId);
  }

  setActiveFloor(floorId) {
    if (!this.floors.some(floor => floor.id === floorId)) return false;
    const changed = this.activeFloorId !== floorId;
    this.activeFloorId = floorId;
    this.floorSceneManager.setActiveFloor(floorId);
    this.verticalConnectorRenderer.setActiveFloor(floorId);
    this.floorJunctionRenderer.setActiveFloor(floorId);
    if (changed && this.lastFullSnapshot) this.renderState(this.lastFullSnapshot);
    return changed;
  }

  getActiveFloor() { return this.activeFloorId; }
  getLandmarkClearanceConflicts() { return this.landmarkClearanceConflicts.map(item => ({ ...item })); }
  getFloorDefinitions() { return this.floors.map(floor => ({ ...floor, roomIds:[...(floor.roomIds ?? [])] })); }

  travelPosition(agent, mesh = null) {
    const travel = agent?.travel;
    if (!travel || travel.kind !== 'vertical-connector') return super.travelPosition(agent, mesh);
    const connector = this.connectorById.get(travel.connectorId ?? travel.connectionId);
    if (!connector) return super.travelPosition(agent, mesh);
    const forward = connector.from.roomId === travel.fromRoomId;
    const from = forward ? connector.from : connector.to;
    const to = forward ? connector.to : connector.from;
    const fromRoom = this.topology.roomById.get(from.roomId);
    const toRoom = this.topology.roomById.get(to.roomId);
    const height = this.agentGroundOffset(agent, mesh);
    const raw = Math.max(0, Math.min(1, travel.progress ?? 0));
    const t = smoothstep(raw);
    const fromY = roomSurfaceY(fromRoom, this.floorHeight) + height;
    const toY = roomSurfaceY(toRoom, this.floorHeight) + height;
    const queueIndex = Number.isFinite(travel.queueIndex) ? travel.queueIndex : 0;
    if (travel.phase === 'queue') {
      const socket = from.queueSockets?.[queueIndex % Math.max(1, from.queueSockets.length)] ?? from.position;
      return { x:socket.x, y:fromY, z:socket.z, rotation:from.facing ?? 0 };
    }
    const spiral = connector.type?.includes('stair') ? Math.sin(t * Math.PI * 2) * 0.42 : 0;
    return {
      x: from.position.x + (to.position.x - from.position.x) * t + spiral,
      y: fromY + (toY - fromY) * t,
      z: from.position.z + (to.position.z - from.position.z) * t + (connector.type?.includes('stair') ? Math.cos(t * Math.PI * 2) * 0.42 : 0),
      rotation: (from.facing ?? 0) + ((to.facing ?? 0) - (from.facing ?? 0)) * t
    };
  }

  destroy() {
    this.verticalConnectorRenderer?.destroy();
    this.floorJunctionRenderer?.destroy();
    this.landmarkVerticalAudit?.destroy();
    this.floorSceneManager?.destroy();
    this.verticalConnectorRenderer = null;
    this.floorJunctionRenderer = null;
    this.landmarkVerticalAudit = null;
    this.floorSceneManager = null;
    super.destroy();
  }
}

export function filterSnapshotForFloor(snapshot, floorId) {
  const rooms = snapshot?.rooms ?? [];
  const roomFloor = new Map(rooms.map(room => [room.id, roomFloorId(room)]));
  const isRoomVisible = roomId => !roomId || roomFloor.get(roomId) === floorId;
  const isConnectorVisible = connector => {
    const fromFloorId = connector?.from?.floorId ?? roomFloor.get(connector?.from?.roomId);
    const toFloorId = connector?.to?.floorId ?? roomFloor.get(connector?.to?.roomId);
    return fromFloorId === floorId || toFloorId === floorId;
  };
  const agentVisible = agent => {
    if (isRoomVisible(agent.roomId)) return true;
    const travel = agent.travel;
    return travel?.kind === 'vertical-connector' && (travel.fromFloorId === floorId || travel.toFloorId === floorId);
  };
  const routeVisible = route => {
    const explicitFloorId = route?.floorId ?? null;
    if (explicitFloorId) return explicitFloorId === floorId;
    return isRoomVisible(route?.from ?? route?.aId) || isRoomVisible(route?.to ?? route?.bId);
  };
  const visibleAgentIds = new Set((snapshot.agents ?? []).filter(agentVisible).map(agent => agent.id));
  const result = {
    ...snapshot,
    rooms: rooms.filter(room => roomFloorId(room) === floorId),
    agents: (snapshot.agents ?? []).filter(agentVisible),
    routes: (snapshot.routes ?? []).filter(routeVisible),
    verticalConnectors: (snapshot.verticalConnectors ?? []).filter(isConnectorVisible),
    props: (snapshot.props ?? []).filter(prop => isRoomVisible(prop.roomId)),
    effects: (snapshot.effects ?? []).filter(effect => isRoomVisible(effect.roomId) || visibleAgentIds.has(effect.agentId))
  };
  result.settlement = filterNested(snapshot.settlement, isRoomVisible, visibleAgentIds);
  result.logistics = filterNested(snapshot.logistics, isRoomVisible, visibleAgentIds);
  result.construction = filterNested(snapshot.construction, isRoomVisible, visibleAgentIds);
  result.siege = filterNested(snapshot.siege, isRoomVisible, visibleAgentIds);
  for (const [key, value] of Object.entries(snapshot ?? {})) {
    if (key in result || !value || typeof value !== 'object') continue;
    if (key.startsWith('hero') || key.includes('outpost') || key.includes('worksite') || key.includes('activity')) result[key] = filterNested(value, isRoomVisible, visibleAgentIds);
  }
  return result;
}

function filterNested(value, isRoomVisible, visibleAgentIds) {
  if (Array.isArray(value)) return value.filter(item => itemVisible(item, isRoomVisible, visibleAgentIds)).map(item => filterNested(item, isRoomVisible, visibleAgentIds));
  if (!value || typeof value !== 'object' || value instanceof Map || value instanceof Set) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, filterNested(child, isRoomVisible, visibleAgentIds)]));
}
function itemVisible(item, isRoomVisible, visibleAgentIds) {
  if (!item || typeof item !== 'object') return true;
  const roomId = item.roomId ?? item.targetRoomId ?? item.sourceRoomId ?? item.homeRoomId ?? item.settlementRoomId;
  if (roomId && !isRoomVisible(roomId)) return false;
  if (item.agentId && !visibleAgentIds.has(item.agentId) && !roomId) return false;
  return true;
}
function smoothstep(value) { return value * value * (3 - 2 * value); }
