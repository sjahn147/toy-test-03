import { THREE } from './ThreeScene.js';
import { AssetRegistry } from './AssetRegistry.js';

const FLOOR_HEIGHT = 2.85;

export class DungeonRenderer {
  constructor(three, scenario, assets = new AssetRegistry()) {
    this.three = three;
    this.scenario = scenario;
    this.assets = assets;
    this.roomMeshes = new Map();
    this.agentMeshes = new Map();
    this.propMeshes = new Map();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.group = new THREE.Group();
    three.scene.add(this.group);
    this.buildRooms();
    this.buildLinks();
  }

  roomY(room) {
    return (room.floor ?? 0) * FLOOR_HEIGHT;
  }

  buildRooms() {
    for (const room of this.scenario.rooms) {
      const y = this.roomY(room);
      const floor = this.assets.makeRoomFloor(room);
      floor.position.set(room.x, y, room.z);
      floor.userData.roomId = room.id;
      this.group.add(floor);
      this.roomMeshes.set(room.id, floor);

      const north = this.assets.makeWall(room.w, 0.45); north.position.set(room.x, y + 0.5, room.z - room.d / 2);
      const south = this.assets.makeWall(room.w, 0.45); south.position.set(room.x, y + 0.5, room.z + room.d / 2);
      const west = this.assets.makeWall(0.45, room.d); west.position.set(room.x - room.w / 2, y + 0.5, room.z);
      const east = this.assets.makeWall(0.45, room.d); east.position.set(room.x + room.w / 2, y + 0.5, room.z);
      for (const m of [north, south, west, east]) this.group.add(m);

      if (room.kind === 'hatchery') this.addRoomMarker(room, 0xff9b72);
      if (room.kind === 'shrine') this.addRoomMarker(room, 0xb6a5ff);
      if (room.kind === 'gate') this.addRoomMarker(room, 0xd58cff);
    }
  }

  addRoomMarker(room, color) {
    const y = this.roomY(room);
    const marker = this.assets.makeRoomMarker(room, color);
    marker.position.set(room.x, y + 0.26, room.z);
    this.group.add(marker);
  }

  buildLinks() {
    for (const [aId, bId] of this.scenario.links) {
      const a = this.scenario.rooms.find(r => r.id === aId);
      const b = this.scenario.rooms.find(r => r.id === bId);
      if (!a || !b) continue;
      const ay = this.roomY(a);
      const by = this.roomY(b);
      const midX = (a.x + b.x) / 2;
      const midY = (ay + by) / 2 + 0.08;
      const midZ = (a.z + b.z) / 2;
      const dx = Math.abs(a.x - b.x);
      const dz = Math.abs(a.z - b.z);
      const dy = Math.abs(ay - by);

      if (dy > 0.1) {
        const stair = this.assets.makeCorridor(Math.max(1.1, dx), Math.max(1.1, dz), true);
        stair.position.set(midX, midY, midZ);
        stair.rotation.z = (by - ay) * 0.035;
        this.group.add(stair);
      } else {
        const corridor = this.assets.makeCorridor(Math.max(1.2, dx), Math.max(1.2, dz), false);
        corridor.position.set(midX, ay + 0.04, midZ);
        this.group.add(corridor);
      }
    }
  }

  renderState(snapshot) {
    this.renderProps(snapshot.props, snapshot.rooms);
    this.renderAgents(snapshot.agents, snapshot.rooms);
  }

  renderProps(props, rooms) {
    const live = new Set(props.map(p => p.id));
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
      const room = rooms.find(r => r.id === prop.roomId);
      if (!room) continue;
      const y = this.roomY(room);
      const offset = prop.type === 'trap' ? [-room.w * 0.22, -room.d * 0.18] : [room.w * 0.22, room.d * 0.18];
      mesh.position.set(room.x + offset[0], y + (prop.type === 'trap' ? 0.25 : 0.8), room.z + offset[1]);
      mesh.visible = prop.type !== 'treasure' || !prop.opened;
    }
  }

  renderAgents(agents, rooms) {
    const live = new Set(agents.map(a => a.id));
    for (const [id, mesh] of this.agentMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.agentMeshes.delete(id);
      }
    }

    const roomCounts = new Map();
    for (const agent of agents) {
      if (!agent.alive || agent.hidden || agent.departed) continue;
      const idx = roomCounts.get(agent.roomId) ?? 0;
      roomCounts.set(agent.roomId, idx + 1);

      let mesh = this.agentMeshes.get(agent.id);
      if (!mesh) {
        mesh = this.assets.makeAgent(agent);
        mesh.userData.agentId = agent.id;
        mesh.traverse(child => { child.userData.agentId = agent.id; });
        this.agentMeshes.set(agent.id, mesh);
        this.group.add(mesh);
      }

      const room = rooms.find(r => r.id === agent.roomId);
      if (!room) continue;
      const y = this.roomY(room);
      const slot = idx % 9;
      const ox = ((slot % 3) - 1) * 0.85;
      const oz = (Math.floor(slot / 3) - 1) * 0.85;
      mesh.position.lerp(new THREE.Vector3(room.x + ox, y + 0.9, room.z + oz), 0.18);
      mesh.rotation.y += 0.04;
      mesh.visible = true;
      const hp = mesh.children.find(c => c.name === 'hp');
      if (hp) hp.scale.x = Math.max(0.15, agent.hp / agent.maxHp);
    }

    for (const agent of agents) {
      if (agent.alive && !agent.hidden && !agent.departed) continue;
      const mesh = this.agentMeshes.get(agent.id);
      if (mesh) mesh.visible = false;
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
    this.three.scene.remove(this.group);
  }
}
