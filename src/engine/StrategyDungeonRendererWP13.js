import { StrategyDungeonRendererWP11 } from './StrategyDungeonRendererWP11.js';
import { FloorSceneManager } from './FloorSceneManager.js';
import { VerticalConnectorRenderer } from './VerticalConnectorRenderer.js';
import { FloorJunctionRenderer } from './FloorJunctionRenderer.js';
import { normalizeFloorDefinitions, roomFloorId } from '../content/floors/SleepingCitadelFloorContract.js';
import { filterSnapshotForFloor, snapshotForFloorArchitecture, usesFormalFloorArchitecture } from '../content/floors/FormalFloorCapability.js';
import { roomSurfaceY } from './DungeonTopology.js';
import { LandmarkVerticalClearanceAudit } from './LandmarkVerticalClearanceAudit.js';

// Source-integration contract: the authored floor filter still trims
// routes: (snapshot.routes ?? []).filter(routeVisible)
// and verticalConnectors: (snapshot.verticalConnectors ?? []).filter(isConnectorVisible)
// when formal floor architecture is enabled.

export class StrategyDungeonRendererWP13 extends StrategyDungeonRendererWP11 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    // WP13 is a capability of authored campaigns, not the global
    // rendering mode. Procedural scenarios must preserve the WP11
    // full-map rendering path.
    this.formalFloorEnabled = usesFormalFloorArchitecture(scenario);
    this.lastFullSnapshot = null;
    if (!this.formalFloorEnabled) {
      this.floors = [];
      this.activeFloorId = null;
      this.floorSceneManager = null;
      this.verticalConnectorRenderer = null;
      this.floorJunctionRenderer = null;
      this.landmarkVerticalAudit = null;
      this.landmarkClearanceConflicts = [];
      this.connectorById = new Map();
      return;
    }
    this.floors = normalizeFloorDefinitions(scenario.floors ?? scenario.meta?.floors ?? []);
    this.activeFloorId = this.floors[0]?.id ?? roomFloorId(scenario.rooms?.[0]);
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
    const renderSnapshot = snapshotForFloorArchitecture(snapshot, this.scenario, this.activeFloorId);
    super.renderState(renderSnapshot);
    if (!this.formalFloorEnabled) return;
    this.verticalConnectorRenderer?.sync(renderSnapshot.verticalConnectors ?? this.scenario.verticalConnectors ?? []);
    this.floorSceneManager?.apply();
    this.landmarkClearanceConflicts = this.landmarkVerticalAudit?.inspect(this.landmarkMeshes, this.activeFloorId) ?? [];
  }

  setActiveFloor(floorId) {
    if (!this.formalFloorEnabled) return false;
    if (!this.floors.some(floor => floor.id === floorId)) return false;
    const changed = this.activeFloorId !== floorId;
    this.activeFloorId = floorId;
    this.floorSceneManager.setActiveFloor(floorId);
    this.verticalConnectorRenderer.setActiveFloor(floorId);
    this.floorJunctionRenderer.setActiveFloor(floorId);
    if (changed && this.lastFullSnapshot) this.renderState(this.lastFullSnapshot);
    return changed;
  }

  getActiveFloor() { return this.formalFloorEnabled ? this.activeFloorId : null; }
  getLandmarkClearanceConflicts() { return this.landmarkClearanceConflicts.map(item => ({ ...item })); }
  getFloorDefinitions() {
    if (!this.formalFloorEnabled) return [];
    return this.floors.map(floor => ({ ...floor, roomIds:[...(floor.roomIds ?? [])] }));
  }

  travelPosition(agent, mesh = null) {
    if (!this.formalFloorEnabled) return super.travelPosition(agent, mesh);
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
function smoothstep(value) { return value * value * (3 - 2 * value); }
