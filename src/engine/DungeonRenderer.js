import { THREE } from './ThreeScene.js';
import { AssetRegistry } from './AssetRegistry.js';
import { animateEliteMiniature } from '../miniatures/MiniatureAnimator.js';
import { animateHeroMiniature } from './heroes/HeroAnimator.js';
import { animateModernAdventurer } from './adventurers/AdventurerAnimator.js';
import { disposeModernAdventurer } from './adventurers/AdventurerSkinnedFactory.js';
import { adventurerVisualSignature } from '../adventurers/AdventurerProfile.js';
import { animateHeroEffect } from './heroes/HeroTelegraphRenderer.js';
import { HeroWorldActorRenderer } from './heroes/HeroWorldActorRenderer.js';
import { buildDungeonTopology, sampleConnection, roomSurfaceY, connectionSurfaceY, DEFAULT_FLOOR_HEIGHT } from './DungeonTopology.js';
import { AuthoredRouteRenderer } from './AuthoredRouteRenderer.js';

const AGENT_HEIGHT = 0.43;

export class DungeonRenderer {
  constructor(three, scenario, assets = new AssetRegistry()) {
    this.three = three;
    this.scenario = scenario;
    this.assets = assets;
    this.floorHeight = Number.isFinite(scenario.floorHeight) ? scenario.floorHeight : DEFAULT_FLOOR_HEIGHT;
    this.topology = buildDungeonTopology(scenario.rooms, scenario.routes ?? scenario.links, { includeInactive: true });
    this.connectionById = new Map(this.topology.connections.map(connection => [connection.id, connection]));
    this.roomMeshes = new Map();
    this.agentMeshes = new Map();
    this.propMeshes = new Map();
    this.effectMeshes = new Map();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.group = new THREE.Group();
    three.scene.add(this.group);
    this.heroWorldActorRenderer = new HeroWorldActorRenderer(this.group, this.agentMeshes, room => this.roomY(room));
    this.routeRenderer = null;
    this.buildRooms();
    if (this.topology.authored) {
      this.routeRenderer = new AuthoredRouteRenderer({
        three: this.three,
        assets: this.assets,
        parent: this.group,
        topology: this.topology,
        roomY: room => this.roomY(room),
        floorHeight: this.floorHeight
      });
      this.routeRenderer.build();
    } else {
      this.buildConnections();
    }
  }

  roomY(room) {
    return roomSurfaceY(room, this.floorHeight);
  }

  buildRooms() {
    for (const room of this.scenario.rooms) {
      const y = this.roomY(room);
      const floor = this.assets.makeRoomFloor(room);
      floor.position.set(room.x, y, room.z);
      floor.userData.roomId = room.id;
      this.group.add(floor);
      this.roomMeshes.set(room.id, floor);

      const ports = this.topology.roomPorts.get(room.id) ?? [];
      this.buildWallSide(room, 'N', ports.filter(port => port.side === 'N'));
      this.buildWallSide(room, 'S', ports.filter(port => port.side === 'S'));
      this.buildWallSide(room, 'W', ports.filter(port => port.side === 'W'));
      this.buildWallSide(room, 'E', ports.filter(port => port.side === 'E'));

      if (!this.topology.authored) {
        for (const port of ports) {
          const axis = port.side === 'N' || port.side === 'S' ? 'x' : 'z';
          const door = this.assets.makeDoorFrame(port.width, axis);
          door.position.set(port.x, y, port.z);
          door.userData.roomId = room.id;
          door.userData.portId = port.id;
          this.group.add(door);
        }
      }

      if (room.kind === 'hatchery') this.addRoomMarker(room, 0xff9b72);
      if (room.kind === 'shrine') this.addRoomMarker(room, 0xb6a5ff);
      if (room.kind === 'gate') this.addRoomMarker(room, 0xd58cff);
    }
  }

  buildWallSide(room, side, ports) {
    const horizontal = side === 'N' || side === 'S';
    const length = horizontal ? room.w : room.d;
    const coordinate = port => horizontal ? port.x - room.x : port.z - room.z;
    const openings = ports
      .map(port => ({ center: coordinate(port), width: port.width }))
      .sort((a, b) => a.center - b.center);

    let cursor = -length / 2;
    for (const opening of openings) {
      const start = Math.max(-length / 2, opening.center - opening.width / 2);
      const end = Math.min(length / 2, opening.center + opening.width / 2);
      if (start > cursor + 0.05) this.addWallSegment(room, side, cursor, start);
      cursor = Math.max(cursor, end);
    }
    if (cursor < length / 2 - 0.05) this.addWallSegment(room, side, cursor, length / 2);
  }

  addWallSegment(room, side, start, end) {
    const length = end - start;
    if (length <= 0.05) return;
    const y = this.roomY(room);
    const center = (start + end) / 2;
    const horizontal = side === 'N' || side === 'S';
    const wall = this.assets.makeWallSegment(length, horizontal ? 'x' : 'z');

    if (side === 'N') wall.position.set(room.x + center, y, room.z - room.d / 2);
    if (side === 'S') wall.position.set(room.x + center, y, room.z + room.d / 2);
    if (side === 'W') wall.position.set(room.x - room.w / 2, y, room.z + center);
    if (side === 'E') wall.position.set(room.x + room.w / 2, y, room.z + center);
    wall.userData ??= {};
    wall.userData.roomId = room.id;
    this.group.add(wall);
  }

  addRoomMarker(room, color) {
    const marker = this.assets.makeRoomMarker(room, color);
    marker.position.set(room.x, this.roomY(room) + 0.04, room.z);
    marker.userData ??= {};
    marker.userData.roomId = room.id;
    this.group.add(marker);
  }

  buildConnections() {
    for (const connection of this.topology.connections) {
      const aRoom = this.topology.roomById.get(connection.aId);
      const bRoom = this.topology.roomById.get(connection.bId);
      const ay = this.roomY(aRoom);
      const by = this.roomY(bRoom);
      const points = connection.points;

      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        if (length <= 0.02) continue;

        const segment = this.assets.makeCorridorSegment(length, connection.width);
        const progress = (i + 0.5) / Math.max(1, points.length - 1);
        segment.position.set((a.x + b.x) / 2, ay + (by - ay) * progress, (a.z + b.z) / 2);
        segment.rotation.y = -Math.atan2(dz, dx);
        segment.userData.connectionId = connection.id;
        this.group.add(segment);
      }
    }
  }

  renderState(snapshot) {
    this.routeRenderer?.sync(snapshot.routes ?? []);
    this.renderProps(snapshot.props, snapshot.rooms);
    this.renderAgents(snapshot.agents, snapshot.rooms, snapshot.time);
    this.heroWorldActorRenderer.render({
      deployables: [...(snapshot.heroDeployables?.deployables ?? []), ...(snapshot.heroBrood?.clutches ?? []), ...(snapshot.heroBrood?.husks ?? []), ...(snapshot.heroMimicry?.husks ?? []), ...(snapshot.heroHoard?.shells ?? [])],
      projectiles: [...(snapshot.heroDeployables?.projectiles ?? []), ...(snapshot.heroHoard?.projectiles ?? [])],
      fields: [...(snapshot.heroEnvironment?.fields ?? []), ...(snapshot.heroAdaptation?.bubbles ?? []), ...(snapshot.heroBrood?.domains ?? []), ...(snapshot.heroGarden?.patches ?? [])],
      tethers: snapshot.heroPhysics?.tethers ?? [],
      formations: snapshot.heroFormations?.formations ?? [],
      barriers: [...(snapshot.heroBarriers?.barriers ?? []), ...(snapshot.heroBrood?.guards ?? [])]
    }, snapshot.rooms, snapshot.time);
    this.renderEffects(snapshot.effects ?? [], snapshot.rooms, snapshot.time);
  }

  renderProps(props, rooms) {
    const live = new Set(props.map(prop => prop.id));
    for (const [id, mesh] of this.propMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.propMeshes.delete(id);
      }
    }

    for (const prop of props) {
      let mesh = this.propMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.assets.makeProp(prop);
        this.propMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const y = this.roomY(room);
      const offset = prop.type === 'trap' ? [-room.w * 0.22, -room.d * 0.18] : [room.w * 0.22, room.d * 0.18];
      mesh.position.set(room.x + offset[0], y + (prop.type === 'trap' ? 0.18 : 0.58), room.z + offset[1]);
      mesh.visible = prop.type !== 'treasure' || !prop.opened;
    }
  }

  renderAgents(agents, rooms, time) {
    const live = new Set(agents.map(agent => agent.id));
    for (const [id, mesh] of this.agentMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        disposeModernAdventurer(mesh);
        this.agentMeshes.delete(id);
      }
    }

    const roomMembers = new Map();
    for (const agent of agents) {
      if (!agent.alive || agent.hidden || agent.departed || agent.travel) continue;
      if (!roomMembers.has(agent.roomId)) roomMembers.set(agent.roomId, []);
      roomMembers.get(agent.roomId).push(agent.id);
    }

    for (const agent of agents) {
      if (!agent.alive || agent.hidden || agent.departed) continue;

      const visualSignature = adventurerVisualSignature(agent);
      let mesh = this.agentMeshes.get(agent.id);
      if (mesh && visualSignature && mesh.userData.adventurerVisualSignature !== visualSignature) {
        this.group.remove(mesh);
        this.agentMeshes.delete(agent.id);
        disposeModernAdventurer(mesh);
        mesh = null;
      }
      let created = false;
      if (!mesh) {
        mesh = this.assets.makeAgent(agent);
        mesh.userData.agentId = agent.id;
        if (visualSignature) mesh.userData.adventurerVisualSignature = visualSignature;
        mesh.traverse(child => { child.userData.agentId = agent.id; });
        this.agentMeshes.set(agent.id, mesh);
        this.group.add(mesh);
        created = true;
      }

      const target = agent.travel
        ? this.travelPosition(agent, mesh)
        : this.roomPosition(agent, rooms, roomMembers, mesh);
      if (!target) continue;

      const physicsOffset = agent.heroPhysicsOffset ?? { x: 0, z: 0 };
      const targetPosition = new THREE.Vector3(
        target.x + (Number.isFinite(physicsOffset.x) ? physicsOffset.x : 0),
        target.y,
        target.z + (Number.isFinite(physicsOffset.z) ? physicsOffset.z : 0)
      );
      const previousTime = Number(mesh.userData.lastRenderTime);
      const renderDt = Number.isFinite(previousTime) ? Math.max(0, Math.min(0.1, time - previousTime)) : 0;
      const horizontalAlpha = 1 - Math.exp(-18 * Math.max(renderDt, 1 / 120));
      const verticalAlpha = agent.travel ? 1 - Math.exp(-24 * Math.max(renderDt, 1 / 120)) : 1;
      if (created || !finiteVector(mesh.position)) mesh.position.copy(targetPosition);
      else {
        mesh.position.x += (targetPosition.x - mesh.position.x) * horizontalAlpha;
        mesh.position.z += (targetPosition.z - mesh.position.z) * horizontalAlpha;
        mesh.position.y += (targetPosition.y - mesh.position.y) * verticalAlpha;
        if (!agent.travel && Math.abs(mesh.position.y - targetPosition.y) < 0.001) mesh.position.y = targetPosition.y;
      }
      mesh.userData.lastRenderTime = time;
      if (target.rotation !== undefined) mesh.rotation.y = target.rotation;
      if (!animateModernAdventurer(mesh, agent, time) && !animateHeroMiniature(mesh, agent, time)) animateEliteMiniature(mesh, agent, time);
      mesh.visible = true;

      const hp = mesh.getObjectByName('hp');
      if (hp) hp.scale.x = Math.max(0.08, agent.hp / agent.maxHp);
    }

    for (const agent of agents) {
      if (agent.alive && !agent.hidden && !agent.departed) continue;
      const mesh = this.agentMeshes.get(agent.id);
      if (mesh) mesh.visible = false;
    }
  }

  roomPosition(agent, rooms, roomMembers, mesh = null) {
    const room = rooms.find(candidate => candidate.id === agent.roomId);
    if (!room) return null;
    const height = this.agentGroundOffset(agent, mesh);

    if (agent.roomCell) {
      return {
        x: agent.roomCell.x,
        y: this.roomY(room) + height,
        z: agent.roomCell.z
      };
    }

    const members = roomMembers.get(room.id) ?? [agent.id];
    const count = members.length;
    const index = Math.max(0, members.indexOf(agent.id));
    const slot = index % 9;
    const spacing = count > 6 ? 0.68 : 0.82;
    const ox = ((slot % 3) - 1) * spacing;
    const oz = (Math.floor(slot / 3) - 1) * spacing;
    return { x: room.x + ox, y: this.roomY(room) + height, z: room.z + oz };
  }

  travelPosition(agent, mesh = null) {
    const travel = agent.travel;
    const destinationRoom = this.topology.roomById.get(travel.toRoomId);
    const height = this.agentGroundOffset(agent, mesh);

    if (travel.phase === 'entering') {
      const start = travel.entryPort;
      const end = travel.destinationCell;
      const t = smoothstep(travel.entryProgress ?? 0);
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      return {
        x: start.x + dx * t,
        y: this.roomY(destinationRoom) + height,
        z: start.z + dz * t,
        rotation: Math.atan2(dx, dz)
      };
    }

    const connection = this.connectionById.get(travel.connectionId);
    if (!connection) return null;
    const forward = travel.fromRoomId === connection.aId;
    const progress = forward ? travel.progress : 1 - travel.progress;
    const sample = sampleConnection(connection, progress);
    const y = connectionSurfaceY(connection, this.topology, progress, this.floorHeight);
    const laneOffset = travel.laneOffset ?? 0;
    const normalX = -sample.tz;
    const normalZ = sample.tx;
    return {
      x: sample.x + normalX * laneOffset,
      y: y + height,
      z: sample.z + normalZ * laneOffset,
      rotation: Math.atan2(sample.tx * (forward ? 1 : -1), sample.tz * (forward ? 1 : -1))
    };
  }

  agentGroundOffset(agent, mesh = null) {
    if (Number.isFinite(mesh?.userData?.groundOffset)) return mesh.userData.groundOffset;
    let offset = agentRenderHeight(agent);
    const model = mesh?.getObjectByName?.('hero-model') ?? mesh?.getObjectByName?.('miniature-model') ?? null;
    if (model && typeof THREE.Box3 === 'function') {
      try {
        mesh.updateMatrixWorld?.(true);
        const bounds = new THREE.Box3().setFromObject(model);
        if (Number.isFinite(bounds.min?.y) && Number.isFinite(bounds.max?.y)) {
          offset = Math.max(-0.15, Math.min(1.4, -bounds.min.y + 0.025));
        }
      } catch {
        // Procedural test stubs may not expose full bounds support.
      }
    }
    if (['stirge', 'wraith'].includes(agent?.role)) offset += agent.role === 'stirge' ? 0.55 : 0.18;
    if (mesh) mesh.userData.groundOffset = offset;
    return offset;
  }

  agentGroundY(agent, mesh, room) {
    return this.roomY(room) + this.agentGroundOffset(agent, mesh);
  }

  getAgentWorldPosition(agentId) {
    const mesh = this.agentMeshes.get(agentId);
    if (!mesh || !mesh.visible) return null;
    return mesh.position.clone();
  }

  renderEffects(effects, rooms, time) {
    const live = new Set(effects.map(effect => effect.id));
    for (const [id, mesh] of this.effectMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.effectMeshes.delete(id);
      }
    }

    for (const effect of effects) {
      let mesh = this.effectMeshes.get(effect.id);
      if (!mesh) {
        mesh = this.assets.makeEffect(effect);
        this.effectMeshes.set(effect.id, mesh);
        this.group.add(mesh);
      }

      const agentMesh = effect.agentId ? this.agentMeshes.get(effect.agentId) : null;
      const room = rooms.find(candidate => candidate.id === effect.roomId);
      if (agentMesh) mesh.position.copy(agentMesh.position);
      else if (room) mesh.position.set(room.x, this.roomY(room) + 0.75, room.z);

      const age = Math.max(0, time - effect.createdAt);
      const progress = Math.min(1, age / effect.duration);
      if (animateHeroEffect(mesh, effect, age, progress)) continue;
      const rise = effect.type === 'gold' ? progress * 1.1 : progress * 0.35;
      mesh.position.y += rise;
      mesh.rotation.y += effect.type === 'gold' ? 0.18 : 0.08;
      const pulse = effect.type === 'death' ? 0.65 + progress * 1.6 : 0.75 + Math.sin(progress * Math.PI) * 0.7;
      mesh.scale.setScalar(pulse);
      mesh.traverse(child => {
        if (child.material?.transparent) child.material.opacity = Math.max(0, 1 - progress);
      });
    }
  }

  pickAgent(clientX, clientY) {
    const rect = this.three.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.three.camera);
    const hits = this.raycaster.intersectObjects([...this.agentMeshes.values()], true);
    for (const hit of hits) {
      let object = hit.object;
      while (object) {
        if (object.userData?.agentId) return object.userData.agentId;
        object = object.parent;
      }
    }
    return null;
  }

  destroy() {
    this.heroWorldActorRenderer?.destroy?.();
    this.routeRenderer?.destroy();
    this.routeRenderer = null;
    this.three.scene.remove(this.group);
  }
}

function agentRenderHeight(agent) {
  if (agent?.size === 'huge') return 0.88;
  if (agent?.size === 'large' || agent?.role === 'ogre') return 0.62;
  if (agent?.size === 'tiny') return 0.3;
  return AGENT_HEIGHT;
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}


function finiteVector(vector) {
  return Number.isFinite(vector?.x) && Number.isFinite(vector?.y) && Number.isFinite(vector?.z);
}
